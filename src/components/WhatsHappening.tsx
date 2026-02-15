'use client';

import React from 'react';
import {
    Grid,
    ArrowRight,
    Newspaper,
    Rocket,
    ChevronLeft,
    ChevronRight,
    Users,
    Code,
    Heart,
    Calendar,
    Clock,
    MapPin,
    ArrowUpRight
} from 'lucide-react';
import { SocietyStrip } from './SocietyStrip';

export const WhatsHappening: React.FC = () => {
    return (
        <section id="events" className="container mx-auto px-4 py-20 relative z-20">
            <div className="flex items-center space-x-2 mb-8">
                <Grid className="w-5 h-5 text-ieee-blue" />
                <h3 className="font-pixel text-lg md:text-xl text-gray-800">WHAT'S HAPPENING</h3>
                <div className="h-px flex-grow bg-gray-300 ml-4"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 auto-rows-min md:grid-rows-[300px_200px] gap-4">
                {/* TechnoSummit Card */}
                <div className="col-span-1 md:col-span-3 row-span-1 md:row-span-1 bento-card bg-white rounded-xl overflow-hidden border border-gray-200 relative group shadow-sm transition-all hover:shadow-md hover:border-ieee-blue/30 min-h-[400px] md:min-h-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-transparent z-10 opacity-90"></div>
                    <div className="absolute inset-0 bg-blue-900 bg-opacity-20 z-0">
                        <img
                            alt="Tech Event"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            src="AGM.webp"
                        />
                    </div>
                    <div className="relative z-20 p-6 md:p-8 h-full flex flex-col justify-center text-white">
                        <div className="inline-block px-3 py-1 bg-ieee-blue text-white text-[10px] font-mono tracking-wider rounded-sm mb-3 w-max">ANNUAL GENERAL MEETING</div>
                        <h2 className="font-bold text-3xl md:text-5xl font-sans mb-2 drop-shadow-lg">IEEE AGM '26</h2>
                        <p className="text-gray-200 text-sm md:text-base mb-6 max-w-md">
                            Join us as we reflect on a year of innovation, elect the new executive committee, and set the vision for the future of IEEE Sahrdaya SB.
                        </p>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                            <div className="flex space-x-4 font-mono text-sm shadow-inner bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                                <div className="text-center px-1">
                                    <span className="block text-2xl font-bold text-white">23</span>
                                    <span className="text-[10px] text-gray-300 tracking-wider">FEB</span>
                                </div>
                                <span className="text-2xl font-bold text-gray-400 pb-2">:</span>
                                <div className="text-center px-1">
                                    <span className="block text-2xl font-bold text-white">20</span>
                                    <span className="text-[10px] text-gray-300 tracking-wider">26</span>
                                </div>
                                <span className="text-2xl font-bold text-gray-400 pb-2">:</span>
                                <div className="text-center px-1">
                                    <span className="block text-2xl font-bold text-white">09</span>
                                    <span className="text-[10px] text-gray-300 tracking-wider">AM</span>
                                </div>
                            </div>

                            <button className="glass-btn bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-2 rounded-lg text-white font-medium text-sm hover:bg-white/20 hover:scale-105 transition-all flex items-center space-x-2 group">
                                <span>Register Now</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Latest News Card */}
                <div className="col-span-1 md:col-span-1 row-span-1 bento-card bg-white rounded-xl border border-gray-200 p-5 flex flex-col shadow-sm transition-all hover:shadow-md hover:border-ieee-blue/30 max-h-[300px] md:max-h-none min-h-[250px] md:min-h-0">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                        <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                            <Newspaper className="w-4 h-4 text-ieee-blue" />
                            LATEST NEWS
                        </h4>
                        <span className="text-[10px] font-mono text-gray-400">LIVE FEED</span>
                    </div>
                    <div className="flex-grow overflow-y-auto no-scrollbar space-y-4 pr-1">
                        <div className="group cursor-pointer">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-mono text-ieee-blue">OCT 14</span>
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            </div>
                            <h5 className="text-xs font-semibold text-gray-700 leading-snug group-hover:text-ieee-blue transition-colors mt-1">
                                Call for Papers: Int'l Conference on Robotics open now.
                            </h5>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-mono text-gray-400">OCT 10</span>
                            </div>
                            <h5 className="text-xs font-semibold text-gray-700 leading-snug group-hover:text-ieee-blue transition-colors mt-1">
                                Women in Engineering (WIE) orientation session highlights.
                            </h5>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-mono text-gray-400">OCT 08</span>
                            </div>
                            <h5 className="text-xs font-semibold text-gray-700 leading-snug group-hover:text-ieee-blue transition-colors mt-1">
                                Sahrdaya SB wins Outstanding Student Branch Award!
                            </h5>
                        </div>
                    </div>
                    <a href="#" className="text-[10px] text-gray-400 font-mono mt-3 text-right hover:text-ieee-blue flex items-center justify-end gap-1">
                        VIEW ARCHIVE <ArrowUpRight className="w-3 h-3" />
                    </a>
                </div>

                {/* Society Spotlight Card */}
                <div className="col-span-1 md:col-span-1 row-span-1 bento-card bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group transition-all hover:shadow-md hover:border-ieee-blue/30 min-h-[250px] md:min-h-0">
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-ieee-blue opacity-5 rounded-full z-0 group-hover:scale-150 transition-transform duration-500"></div>
                    <div>
                        <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wide">Society Spotlight</div>
                        <h4 className="font-bold text-xl text-gray-800 z-10 relative">Computer Society</h4>
                        <div className="w-8 h-1 bg-ieee-blue mt-2 rounded-full"></div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center transform rotate-3 group-hover:rotate-6 transition-transform">
                            <Code className="w-8 h-8 text-ieee-blue" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 line-clamp-2 relative z-10">
                        Advancing the theory, practice, and application of computer and info systems.
                    </div>
                </div>

                {/* Project Showcase Card */}
                <div className="col-span-1 md:col-span-2 row-span-1 bento-card bg-white rounded-xl border border-gray-200 p-5 flex flex-col shadow-sm transition-all hover:shadow-md hover:border-ieee-blue/30">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-ieee-blue" />
                            PROJECT SHOWCASE
                        </h4>
                        <div className="flex space-x-2">
                            <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2 items-center h-full">
                        {/* Project 1 */}
                        <div className="min-w-[180px] w-[220px] bg-gray-50 rounded-lg p-3 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                            <div className="h-2 bg-gray-200 rounded mb-3 overflow-hidden relative">
                                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSnfORudAamkOztDEo-kmBCKqt8VLqUHPT4v_lpv87A5M3BaB8lirkLFpjuZWnJ65KAGudHCImY75l9c8beBQXCl-DsqVerWqzeJMWWequNrkimaFEI1m42KMnbXFp_5yoolqje4ONR6GRfocxhLKpxaCtl8HbNa9_is5_yZO3H_eY1jlWsM17JCOXpfaOLbn9z01ZfYyv93ci_SPvwSGUnr2EGyUC4dgccN2d5pfs0H1q2oQqqaqBuA5a1QCfe0dMTCzzwMiPPBw" alt="IoT" />
                            </div>
                            <h5 className="font-bold text-xs text-gray-800 truncate">Auto-Irrigation IoT</h5>
                            <p className="text-[10px] text-gray-500 mt-1 flex-grow line-clamp-2">Smart farming solution using ESP32.</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center text-[10px] text-gray-500 hover:text-red-500 transition-colors">
                                    <Heart className="w-3 h-3 mr-1" /> 24
                                </div>
                                <div className="text-[10px] text-ieee-blue font-medium">VIEW</div>
                            </div>
                        </div>
                        {/* Project 2 */}
                        <div className="min-w-[180px] w-[220px] bg-gray-50 rounded-lg p-3 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                            <div className="h-2 bg-gray-200 rounded mb-3 overflow-hidden relative">
                                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDh1RImD9cfepQMmsOz0kOHBSFiiOJgrdBqG8w-HFG-L7oIRpm8Z-nZiPyYfpeKRSxryn10WOAIqj2k-Da-gEj4G95TVaCzOJaEe6VUhkynQrgL1VetKNTxeRz-E-S7ritD0Fdqz65iX83SDLSixni2fodf6djedUwZD0QMDLBCKEI5iHbqdvJA8oYVTIw39N8FXETITWoxM-mvzO5I-P9BWyL8zI5TPPRuTh-yQ0G0JkGKRkCZuqVHfalv00NfGcQbwDdn9MSWeK8" alt="Arm" />
                            </div>
                            <h5 className="font-bold text-xs text-gray-800 truncate">Gesture Control Arm</h5>
                            <p className="text-[10px] text-gray-500 mt-1 flex-grow line-clamp-2">Robotic arm controlled by hand signs.</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center text-[10px] text-gray-500 hover:text-red-500 transition-colors">
                                    <Heart className="w-3 h-3 mr-1" /> 42
                                </div>
                                <div className="text-[10px] text-ieee-blue font-medium">VIEW</div>
                            </div>
                        </div>
                        {/* Project 3 */}
                        <div className="min-w-[180px] w-[220px] bg-gray-50 rounded-lg p-3 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                            <div className="h-2 bg-gray-200 rounded mb-3 overflow-hidden relative">
                                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMhKO6TsEIim6xcMGG-FSs8dz0H2f99oTN5zYkjN6uQok0fB2-E8ZCrAWA3uxF1m3ktCs3jgQfgudthP5mPyHUbOo-T1VCPbDyq_uXs-1zW2ljTxzz87nbEY_I9bGiGbQfO8eLVHAyD0-D4cCyhfqrAu8dIv1Pq7EslhAuf5UxYNUA4o8rXw3ZuezFKzXLUoQC4xiaPD_J9LSJLkwwOmYKSvJ9-M84m1MKCJfiEUSfMeuilA4QBlAobPLTLVsNgxX2GCJXZVUCjUU" alt="Cyber" />
                            </div>
                            <h5 className="font-bold text-xs text-gray-800 truncate">CyberSec Tool</h5>
                            <p className="text-[10px] text-gray-500 mt-1 flex-grow line-clamp-2">Python network scanner script.</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center text-[10px] text-gray-500 hover:text-red-500 transition-colors">
                                    <Heart className="w-3 h-3 mr-1" /> 18
                                </div>
                                <div className="text-[10px] text-ieee-blue font-medium">VIEW</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Join Card */}
                <div className="col-span-1 md:col-span-1 row-span-1 bento-card bg-ieee-blue rounded-xl border border-blue-800 p-6 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group text-center min-h-[250px] md:min-h-0">
                    <div className="absolute w-40 h-40 bg-white opacity-10 rounded-full blur-2xl -top-10 -right-10 group-hover:scale-125 transition-transform duration-700"></div>
                    <Users className="w-10 h-10 text-white mb-3 animate-bounce" />
                    <h4 className="font-bold text-white text-lg leading-tight mb-2">Join The Community</h4>
                    <p className="text-blue-100 text-xs mb-4">Be part of the world's largest technical professional organization.</p>
                    <button className="bg-white text-ieee-blue text-xs font-bold py-2 px-6 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all uppercase tracking-wider">
                        Join IEEE
                    </button>
                </div>
            </div>

            {/* Society Logos Marquee */}
            <SocietyStrip />
        </section>
    );
};
