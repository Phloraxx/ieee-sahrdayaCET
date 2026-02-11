import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowUpRight, Linkedin, Mail } from 'lucide-react';

interface Member {
    name: string;
    role: string;
    tagline: string;
    image: string;
}

const execomMembers: Member[] = [
    {
        name: 'Sneha Prasanth',
        role: 'Chairperson',
        tagline: 'LEADING THE CHARGE',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=750&fit=crop&crop=faces',
    },
    {
        name: 'Irene Anto',
        role: 'Vice Chairperson',
        tagline: 'VISION & STRATEGY',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=750&fit=crop&crop=faces',
    },
    {
        name: 'Irfan',
        role: 'Secretary',
        tagline: 'KEEPING IT TOGETHER',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=750&fit=crop&crop=faces',
    },
    {
        name: 'Binu Ashik',
        role: 'Joint Secretary',
        tagline: 'BRIDGING THE GAP',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=750&fit=crop&crop=faces',
    },
    {
        name: 'Aaron Stephan',
        role: 'Treasurer',
        tagline: 'NUMBERS & BEYOND',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=750&fit=crop&crop=faces',
    },
];

const MarqueeText: React.FC<{ text: string }> = ({ text }) => {
    const repeated = `${text} ~ `.repeat(12);
    return (
        <div className="overflow-hidden whitespace-nowrap">
            <motion.div
                className="inline-block"
                animate={{ x: ['0%', '-50%'] }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: 'loop',
                        duration: 8,
                        ease: 'linear',
                    },
                }}
            >
                <span className="text-[10px] md:text-xs font-mono tracking-[0.3em] text-ieee-blue/60 uppercase">
                    {repeated}
                </span>
            </motion.div>
        </div>
    );
};

const MemberCard: React.FC<{ member: Member; index: number }> = ({ member, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className="flex flex-col group cursor-pointer"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, delay: index * 0.12, ease: [0.2, 0.65, 0.3, 0.9] }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image Container */}
            <div className="relative overflow-hidden rounded-xl aspect-[3/4] mb-4 bg-gray-100">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Image */}
                <motion.img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    animate={{ scale: isHovered ? 1.05 : 1 }}
                    transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 0.9] }}
                />

                {/* Role badge - top left */}
                <div className="absolute top-3 left-3 z-20">
                    <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[9px] md:text-[10px] font-mono tracking-[0.15em] text-gray-700 rounded-sm uppercase">
                        {member.role}
                    </span>
                </div>

                {/* Hover overlay content */}
                <motion.div
                    className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex gap-2">
                        <a
                            href="#"
                            className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
                        >
                            <Linkedin className="w-3.5 h-3.5 text-white" />
                        </a>
                        <a
                            href="#"
                            className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
                        >
                            <Mail className="w-3.5 h-3.5 text-white" />
                        </a>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-white" />
                </motion.div>

                {/* Index number - bottom right corner */}
                <div className="absolute bottom-3 right-3 z-20 opacity-20 group-hover:opacity-0 transition-opacity">
                    <span className="font-pixel text-4xl md:text-5xl text-white font-bold">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                </div>
            </div>

            {/* Name */}
            <h4 className="font-sans font-bold text-lg md:text-xl text-gray-900 tracking-tight mb-0.5 group-hover:text-ieee-blue transition-colors duration-300">
                {member.name}
            </h4>

            {/* Marquee tagline */}
            <div className="mt-1 overflow-hidden rounded-sm">
                <MarqueeText text={member.tagline} />
            </div>
        </motion.div>
    );
};

export const Execom: React.FC = () => {
    return (
        <section className="bg-white py-20 md:py-32 relative overflow-hidden" id="execom">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gray-200" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-ieee-blue/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-ieee-blue/5 rounded-full blur-3xl" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Section header */}
                <div className="mb-16 md:mb-20">
                    <div className="flex items-center space-x-2 mb-6">
                        <Users className="w-5 h-5 text-ieee-blue" />
                        <h3 className="font-pixel text-lg md:text-xl text-gray-800">THE EXECOM</h3>
                        <div className="h-px flex-grow bg-gray-300 ml-4" />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
                                Meet the people
                                <br />
                                <span className="text-ieee-blue">behind the vision.</span>
                            </h2>
                        </motion.div>

                        <motion.p
                            className="text-sm md:text-base text-gray-500 max-w-sm font-mono"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                        >
                            The executive committee driving innovation, collaboration, and excellence at IEEE Sahrdaya SB.
                        </motion.p>
                    </div>
                </div>

                {/* Stats row - Rob Hemus inspired */}
                <motion.div
                    className="grid grid-cols-3 gap-4 mb-16 md:mb-20 border-y border-gray-200 py-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="text-center md:text-left">
                        <div className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-1">Roster</div>
                        <div className="font-bold text-2xl md:text-4xl text-gray-900">05</div>
                    </div>
                    <div className="text-center">
                        <div className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-1">Events Led</div>
                        <div className="font-bold text-2xl md:text-4xl text-gray-900">20+</div>
                    </div>
                    <div className="text-center md:text-right">
                        <div className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-1">Societies</div>
                        <div className="font-bold text-2xl md:text-4xl text-gray-900">04</div>
                    </div>
                </motion.div>

                {/* Members grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
                    {execomMembers.map((member, index) => (
                        <MemberCard key={member.name} member={member} index={index} />
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    className="mt-16 md:mt-24 flex flex-col md:flex-row items-center justify-center gap-4 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="h-px w-16 bg-gray-300 hidden md:block" />
                    <p className="font-mono text-xs text-gray-400 tracking-[0.2em] uppercase">
                        Want to be part of the team?
                    </p>
                    <a
                        href="#"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-xs font-mono tracking-wider rounded-full hover:bg-ieee-blue transition-colors duration-300 uppercase"
                    >
                        Join IEEE <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                    <div className="h-px w-16 bg-gray-300 hidden md:block" />
                </motion.div>
            </div>
        </section>
    );
};
