import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface Society {
    name: string;
    logo: string;
}

const societies: Society[] = [
    { name: 'Computer Society', logo: '/Societies/cs.png' },
    { name: 'Robotics & Automation Society', logo: '/Societies/ras.png' },
    { name: 'Women in Engineering', logo: '/Societies/wie.png' },
    { name: 'Industry Applications Society', logo: '/Societies/ias.png' },
    { name: 'Power & Energy Society', logo: '/Societies/pes.png' },
    { name: 'SIGHT', logo: '/Societies/sight.png' },
    { name: 'Engineering in Medicine & Biology', logo: '/Societies/embs.png' },
    { name: 'Signal Processing Society', logo: '/Societies/sps.png' },
    { name: 'Circuits and Systems Society', logo: '/Societies/cas.png' },
    { name: 'Communication Society', logo: '/Societies/css.png' },
    { name: 'Education Society', logo: '/Societies/edsoc.png' },
    { name: 'Industrial Electronics Society', logo: '/Societies/ies.png' },
    { name: 'Nuclear & Plasma Sciences Society', logo: '/Societies/npss.png' },
    { name: 'Photonics Society', logo: '/Societies/ps.png' },
];

const LogoItem: React.FC<{ society: Society }> = ({ society }) => (
    <div className="flex-shrink-0 flex items-center justify-center group mx-6 md:mx-10">
        <div className="relative flex items-center justify-center h-10 md:h-12 w-auto transition-all duration-300 group-hover:scale-110">
            <Image
                src={society.logo}
                alt={society.name}
                width={60}
                height={48}
                className="opacity-40 group-hover:opacity-90 transition-opacity duration-500 grayscale group-hover:grayscale-0"
                draggable={false}
            />
        </div>
    </div>
);

export const SocietyStrip: React.FC = () => {
    // Duplicate the list for seamless loop (4x for safety on wide screens)
    const repeated = [...societies, ...societies, ...societies, ...societies];

    return (
        <div className="relative mt-12 md:mt-16">
            {/* Label */}
            <div className="flex items-center gap-3 mb-5 px-4 md:px-0">
                <div className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase whitespace-nowrap">
                    OUR SOCIETIES
                </div>
                <div className="h-px flex-grow bg-gray-200" />
                <div className="font-mono text-[10px] tracking-[0.2em] text-gray-300">
                    {societies.length}
                </div>
            </div>

            {/* Marquee container */}
            <div className="relative overflow-hidden py-4">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                {/* Scrolling track */}
                <motion.div
                    className="flex items-center w-max"
                    animate={{ x: ['0%', '-25%'] }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: 'loop',
                            duration: 40,
                            ease: 'linear',
                        },
                    }}
                >
                    {repeated.map((society, i) => (
                        <LogoItem key={`${society.name}-${i}`} society={society} />
                    ))}
                </motion.div>
            </div>

            {/* Subtle bottom border */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
    );
};
