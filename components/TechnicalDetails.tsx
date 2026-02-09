import React from 'react';
import { motion } from 'framer-motion';

export const TechnicalDetails: React.FC = () => {
    return (
        <>
            {/* Top Left */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="absolute top-6 left-6 z-10 hidden md:block"
            >
                <div className="flex items-center gap-3 mb-2">
                    <img
                        src="/Ieee.png"
                        alt="IEEE SB Logo"
                        className="h-24 w-auto opacity-80"
                    />
                </div>
                <div className="font-mono text-[10px] text-gray-400 leading-tight">
                    <p>LOC: 10.2315° N, 76.2698° E</p>
                    <p>SYS_INIT: OK</p>
                </div>
            </motion.div>

            {/* Top Right */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="absolute top-6 right-6 z-10 hidden md:block text-right"
            >
                <div className="flex flex-col items-end gap-2 mb-2">
                    <img
                        src="/emblem.png"
                        alt="Sahrdaya Logo"
                        className="h-24 w-auto opacity-80"
                    />
                </div>
                <div className="font-mono text-[10px] text-gray-400 leading-tight">
                    <p>BUILD_VER: 2.1.0.RC</p>
                    <p>PLATFORM: WEB_OS</p>
                </div>
            </motion.div>

            {/* Bottom Left */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="absolute bottom-6 left-6 z-10 hidden md:block"
            >
                <p className="font-mono text-[10px] text-gray-400">© 2024 IEEE SAHRDAYA SB</p>
            </motion.div>

            {/* Bottom Right */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="absolute bottom-6 right-20 z-10 hidden md:block text-right"
            >
                <div className="font-mono text-[10px] text-gray-400 leading-tight">
                    <p>TERMINAL: READY</p>
                    <p>LINK: ESTABLISHED</p>
                </div>
            </motion.div>
        </>
    );
};