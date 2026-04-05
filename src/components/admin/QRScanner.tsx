'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Result, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, RefreshCw, Volume2, VolumeX, CheckCircle2, XCircle, AlertTriangle, Flashlight, FlashlightOff } from 'lucide-react';

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const readerRef = useRef<BrowserQRCodeReader | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const lastScannedRef = useRef<string>('');
    const lastScanTimeRef = useRef<number>(0);
    const videoTrackRef = useRef<MediaStreamTrack | null>(null);
    
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

    // Initialize ZXing reader and camera list
    useEffect(() => {
        const initializeReader = async () => {
            try {
                // Configure reader with QR-optimized hints
                const hints = new Map();
                hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
                hints.set(DecodeHintType.TRY_HARDER, true);
                
                readerRef.current = new BrowserQRCodeReader(hints);

                // Get available cameras using static method
                const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();
                setCameras(videoInputDevices);

                if (videoInputDevices.length > 0) {
                    // Prefer back camera on mobile
                    const backCamera = videoInputDevices.find(device => 
                        device.label.toLowerCase().includes('back') || 
                        device.label.toLowerCase().includes('rear') ||
                        device.label.toLowerCase().includes('environment')
                    );
                    setSelectedCamera(backCamera?.deviceId || videoInputDevices[0].deviceId);
                }
            } catch (err) {
                console.error('Error initializing camera:', err);
                setError('Unable to access cameras. Please check permissions.');
                onError?.('Unable to access cameras. Please check permissions.');
            }
        };

        initializeReader();

        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [onError]);

    const stopScanner = useCallback(async () => {
        if (controlsRef.current) {
            try {
                controlsRef.current.stop();
                controlsRef.current = null;
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        setIsScanning(false);
    }, []);

    const startScanner = useCallback(async () => {
        if (!videoRef.current || !selectedCamera || !readerRef.current) return;

        try {
            setError(null);
            
            // Stop any existing scanner
            if (controlsRef.current) {
                await stopScanner();
            }

            // Decode continuously with better focus handling
            const controls = await readerRef.current.decodeFromVideoDevice(
                selectedCamera,
                videoRef.current,
                (result: Result | null, error?: Error) => {
                    if (result) {
                        const decodedText = result.getText();
                        
                        // Debounce: Don't process same QR within 3 seconds
                        const now = Date.now();
                        if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 3000) {
                            return;
                        }
                        
                        lastScannedRef.current = decodedText;
                        lastScanTimeRef.current = now;
                        onScan(decodedText);
                    }
                    
                    // Ignore "not found" errors as they're normal during scanning
                    if (error && error.message && !error.message.includes('No MultiFormat Readers')) {
                        console.debug('Scan error:', error.message);
                    }
                }
            );
            
            controlsRef.current = controls;
            setIsScanning(true);

            // Apply optimal video constraints for better scanning
            const stream = videoRef.current.srcObject as MediaStream;
            if (stream) {
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrackRef.current = videoTrack;
                    const capabilities = videoTrack.getCapabilities();
                    const constraints: MediaTrackConstraints = {};

                    // Enable continuous autofocus if supported
                    if ('focusMode' in capabilities) {
                        constraints.focusMode = 'continuous';
                    }

                    // Check torch support and apply torch state
                    if ('torch' in capabilities) {
                        setTorchSupported(true);
                        try {
                            await videoTrack.applyConstraints({ 
                                // @ts-ignore - torch is not in TypeScript types yet
                                advanced: [{ torch: torchEnabled }] 
                            });
                            console.log(`Torch ${torchEnabled ? 'enabled' : 'disabled'}`);
                        } catch (torchErr) {
                            console.debug('Torch not available or failed:', torchErr);
                        }
                    } else {
                        setTorchSupported(false);
                    }

                    // Auto exposure and brightness for challenging lighting
                    // @ts-ignore - exposure/brightness types not standardized yet
                    if ('exposureMode' in capabilities) {
                        // @ts-ignore
                        constraints.exposureMode = 'continuous';
                    }
                    
                    // @ts-ignore
                    if ('exposureCompensation' in capabilities) {
                        // @ts-ignore
                        const expCap = capabilities.exposureCompensation;
                        // @ts-ignore
                        if (expCap && expCap.max !== undefined) {
                            // @ts-ignore
                            constraints.exposureCompensation = expCap.max / 2; // Boost exposure
                        }
                    }

                    // @ts-ignore
                    if ('brightness' in capabilities) {
                        // @ts-ignore
                        const brightCap = capabilities.brightness;
                        // @ts-ignore
                        if (brightCap && brightCap.max !== undefined) {
                            // @ts-ignore
                            constraints.brightness = brightCap.max * 0.7; // Increase brightness
                        }
                    }

                    // @ts-ignore
                    if ('contrast' in capabilities) {
                        // @ts-ignore
                        const contrastCap = capabilities.contrast;
                        // @ts-ignore
                        if (contrastCap && contrastCap.max !== undefined) {
                            // @ts-ignore
                            constraints.contrast = contrastCap.max * 0.6; // Enhance contrast
                        }
                    }

                    // Request higher resolution for better QR detection
                    if ('width' in capabilities && 'height' in capabilities) {
                        constraints.width = { ideal: 1920 };
                        constraints.height = { ideal: 1080 };
                    }

                    // Advanced focusing options
                    // @ts-ignore
                    if ('focusDistance' in capabilities) {
                        // @ts-ignore
                        constraints.focusDistance = 0; // Focus at infinity for QR codes at various distances
                    }

                    try {
                        await videoTrack.applyConstraints(constraints);
                        console.log('Applied enhanced camera constraints');
                    } catch (constraintErr) {
                        console.warn('Could not apply all constraints:', constraintErr);
                        // Fallback: try basic constraints
                        try {
                            await videoTrack.applyConstraints({
                                focusMode: 'continuous',
                                width: { ideal: 1920 },
                                height: { ideal: 1080 }
                            });
                        } catch (fallbackErr) {
                            console.warn('Fallback constraints also failed:', fallbackErr);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error starting scanner:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
            setError(errorMessage);
            onError?.(errorMessage);
            setIsScanning(false);
        }
    }, [onError, onScan, selectedCamera, stopScanner]);

    // Start/stop scanner based on isActive
    useEffect(() => {
        if (!isActive || !selectedCamera) {
            stopScanner();
            return;
        }

        startScanner();

        return () => {
            stopScanner();
        };
    }, [isActive, selectedCamera, startScanner, stopScanner]);

    // Play sound when lastScanResult changes
    useEffect(() => {
        if (lastScanResult) {
            playBeep(lastScanResult.success);
        }
    }, [lastScanResult, playBeep]);

    const switchCamera = () => {
        const currentIndex = cameras.findIndex(c => c.deviceId === selectedCamera);
        const nextIndex = (currentIndex + 1) % cameras.length;
        setSelectedCamera(cameras[nextIndex].deviceId);
    };

    const toggleTorch = async () => {
        if (!videoTrackRef.current || !torchSupported) return;
        
        const newTorchState = !torchEnabled;
        try {
            await videoTrackRef.current.applyConstraints({
                // @ts-ignore - torch is not in TypeScript types yet
                advanced: [{ torch: newTorchState }]
            });
            setTorchEnabled(newTorchState);
        } catch (err) {
            console.error('Failed to toggle torch:', err);
        }
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
                {/* Video element for camera preview */}
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ minHeight: '300px' }}
                    autoPlay
                    playsInline
                    muted
                />

                {/* Scanning overlay with corners */}
                {isScanning && (
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
                    <div className="flex items-center gap-2">
                        {/* Sound toggle */}
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                        >
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>

                        {/* Flashlight toggle (only if supported) */}
                        {torchSupported && isScanning && (
                            <button
                                onClick={toggleTorch}
                                className={`p-2 rounded-full transition-colors ${
                                    torchEnabled 
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                        : 'bg-black/50 text-white hover:bg-black/70'
                                }`}
                                title={torchEnabled ? 'Turn off flashlight' : 'Turn on flashlight'}
                            >
                                {torchEnabled ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
                            </button>
                        )}
                    </div>

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
