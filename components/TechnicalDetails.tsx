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
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhmIaB1H3bhy1E4Ye-SeElm1uZye-J5NMD-c912YLXRSTR6qcUrdvfZgcH24Vq4qRqRZTqpe9J9iiiuV_ESWxzocagy4CzOGlrg8gUMX5NxrX3km22pvPNqMtsyP1ieuofof4nemBv813XrssC55nqAAleC0P2ZhZ_QWcOimogt8m2f5Rt0QqngVn83W2CjltmycH6iXhEU9e64ZRp_Y-jj263kesLRBt7AFDjSXeTQZzF65jgXxFL4fMWotTCQ4fBHGhRn0NK_tU" 
                        alt="IEEE SB Logo" 
                        className="h-10 w-auto opacity-80"
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
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgISPezTsOMOF5WVN0X1vG2clYj3iCMenwQMlO3QVR2hXs-9WgwEJgwVryDgiQ5BELGuN5swkmHPEVW7YmykEIDYCnJueIZmqPQsind1JB_XWhGuPokYL8V_FA4_yNJUGz_Bwz6Yt12eiv_SSaWnYSImqJI_2o8innXYrYymE2ermzDMUESRej1KMfgcDF8MPPq2_j6jDbqKXxCDXNE5Ow4uQC70JI4ESVwBGTWGpYp2PYsogRqZKtIOgU2aVfoJjmIOKb-QEwP-0" 
                        alt="Sahrdaya Logo" 
                        className="h-10 w-auto opacity-80"
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