'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, RefreshCw, Volume2, VolumeX, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface QRScannerProps {
    onScan: (data: string) => void;
    onError?: (error: string) => void;
    isActive: boolean;
    lastScanResult?: {
        success: boolean;
        message: string;
        type: 'success' | 'error' | 'warning';
    } | null;
}

export function QRScanner({ onScan, onError, isActive, lastScanResult }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const lastScannedRef = useRef<string>('');
    const lastScanTimeRef = useRef<number>(0);
    const transitionPromiseRef = useRef<Promise<void>>(Promise.resolve());
    
    // Audio context for beeps
    const audioContextRef = useRef<AudioContext | null>(null);

    const playBeep = useCallback((success: boolean) => {
        if (!soundEnabled) return;
        
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }
            
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            if (success) {
                // Success: Two short high beeps
                oscillator.frequency.setValueAtTime(880, ctx.currentTime);
                oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.2);
            } else {
                // Error: Low buzz
                oscillator.frequency.setValueAtTime(200, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
            }

            // Haptic feedback on mobile
            if ('vibrate' in navigator) {
                navigator.vibrate(success ? [50, 50, 50] : [200]);
            }
        } catch (e) {
            console.warn('Audio playback failed:', e);
        }
    }, [soundEnabled]);

    // Initialize camera list
    useEffect(() => {
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                setCameras(devices.map(d => ({ id: d.id, label: d.label })));
                // Prefer back camera on mobile
                const backCamera = devices.find(d => 
                    d.label.toLowerCase().includes('back') || 
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                );
                setSelectedCamera(backCamera?.id || devices[0].id);
            }
        }).catch(err => {
            console.error('Error getting cameras:', err);
            setError('Unable to access cameras. Please check permissions.');
        });

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING) {
                    await scannerRef.current.stop();
                }
                if (state !== Html5QrcodeScannerState.UNKNOWN) {
                    scannerRef.current.clear();
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (!message.toLowerCase().includes('already under transition')) {
                    console.error('Error stopping scanner:', err);
                }
            }
        }
        setIsScanning(false);
    }, []);

    const runTransition = useCallback((op: () => Promise<void>) => {
        const next = transitionPromiseRef.current
            .catch(() => undefined)
            .then(async () => {
                setIsTransitioning(true);
                try {
                    await op();
                } finally {
                    setIsTransitioning(false);
                }
            });
        transitionPromiseRef.current = next;
        return next;
    }, []);

    const startScanner = useCallback(async () => {
        if (!containerRef.current || !selectedCamera) return;

        try {
            setError(null);
            
            // Clean up existing scanner
            if (scannerRef.current) {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            }

            const scannerId = 'qr-scanner-region';
            let scannerElement = document.getElementById(scannerId);
            
            if (!scannerElement) {
                scannerElement = document.createElement('div');
                scannerElement.id = scannerId;
                containerRef.current.appendChild(scannerElement);
            }

            scannerRef.current = new Html5Qrcode(scannerId);
            
            await scannerRef.current.start(
                selectedCamera,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // Debounce: Don't process same QR within 3 seconds
                    const now = Date.now();
                    if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 3000) {
                        return;
                    }
                    
                    lastScannedRef.current = decodedText;
                    lastScanTimeRef.current = now;
                    onScan(decodedText);
                },
                () => {
                    // QR code not found - this is normal during scanning
                }
            );
            
            setIsScanning(true);
        } catch (err) {
            console.error('Error starting scanner:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
            setError(errorMessage);
            onError?.(errorMessage);
            setIsScanning(false);
        }
    }, [onError, onScan, selectedCamera]);

    // Start/stop scanner based on isActive
    useEffect(() => {
        if (!isActive || !selectedCamera) {
            runTransition(stopScanner);
            return;
        }

        runTransition(startScanner);

        return () => {
            runTransition(stopScanner);
        };
    }, [isActive, selectedCamera, runTransition, startScanner, stopScanner]);

    // Play sound when lastScanResult changes
    useEffect(() => {
        if (lastScanResult) {
            playBeep(lastScanResult.success);
        }
    }, [lastScanResult, playBeep]);

    const switchCamera = () => {
        const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
        const nextIndex = (currentIndex + 1) % cameras.length;
        setSelectedCamera(cameras[nextIndex].id);
    };

    const getResultIcon = () => {
        if (!lastScanResult) return null;
        switch (lastScanResult.type) {
            case 'success':
                return <CheckCircle2 className="w-6 h-6 text-green-600" />;
            case 'error':
                return <XCircle className="w-6 h-6 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
        }
    };

    const getResultClass = () => {
        if (!lastScanResult) return '';
        switch (lastScanResult.type) {
            case 'success':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        }
    };

    return (
        <div className="relative">
            {/* Scanner container */}
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-square max-w-md mx-auto">
                {/* Camera preview */}
                <div 
                    ref={containerRef}
                    className="w-full h-full"
                    style={{ minHeight: '300px' }}
                />

                {/* Scanning overlay with corners */}
                {isScanning && !isTransitioning && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Darkened corners */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-[250px] h-[250px]">
                                {/* Corner markers */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-ieee-blue rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-ieee-blue rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-ieee-blue rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-ieee-blue rounded-br-lg" />
                                
                                {/* Scanning line animation */}
                                <motion.div
                                    className="absolute left-0 right-0 h-0.5 bg-ieee-blue shadow-lg shadow-ieee-blue/50"
                                    animate={{ top: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isTransitioning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center text-white"
                        >
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-200">Preparing scanner...</p>
                        </motion.div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
                        <div className="text-center p-6">
                            <CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-white font-medium mb-2">Camera Error</p>
                            <p className="text-gray-400 text-sm mb-4">{error}</p>
                            <button
                                onClick={startScanner}
                                className="px-4 py-2 bg-ieee-blue text-white rounded-lg hover:bg-ieee-blue/90 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Inactive state */}
                {!isActive && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center p-6">
                            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-white font-medium">Scanner Inactive</p>
                            <p className="text-gray-400 text-sm">Start session to begin scanning</p>
                        </div>
                    </div>
                )}

                {/* Controls overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    {/* Sound toggle */}
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                    >
                        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    {/* Camera switch (only if multiple cameras) */}
                    {cameras.length > 1 && (
                        <button
                            onClick={switchCamera}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                            title="Switch camera"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Last scan result */}
            <AnimatePresence>
                {lastScanResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${getResultClass()}`}
                    >
                        {getResultIcon()}
                        <span className="font-medium">{lastScanResult.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Instructions */}
            <p className="text-center text-gray-500 text-sm mt-4">
                Position the QR code within the scanning area
            </p>
        </div>
    );
}
