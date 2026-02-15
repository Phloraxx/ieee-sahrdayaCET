'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Cpu, Zap, Radio, Atom, GraduationCap, Activity, Bolt, Heart, Cog, Wrench, Sparkles, Camera, FileText, MessageSquare, Palette } from 'lucide-react';
import Link from 'next/link';

// ===== IMAGE MAP - Exact paths from filesystem =====
const IMAGE_MAP: { [key: string]: string } = {
    'SNEHA PRASANTH': '/Execom/Sneha Prasanth/Sneha Prasanth.JPG',
    'ANIL ANTONY': '/Execom/anilantony.jpg',
    'AHAMED RIZWAN K M': '/Execom/Ahamed Rizwan K M.png',
    'ANN JOSHNA': '/Execom/Ann Joshna Joby.jpeg',
    'ATHUL KRISHNA': '/Execom/Athul krishna ks.jpg',
    'CHRISTINA JOSEPH': '/Execom/Christina Joseph.jpg',
    'JENNIFER ANTONY': '/Execom/Jennifer Antony_.jpg',
    'SHEETAL SURESH UNNY': '/Execom/SHEETAL SURESH UNNY_.jpg',
    'TANIYA THOMSON': '/Execom/Taniya Thomson.jpg',
    'AAN LILY OLIVIA': '/Execom/Aan Lily Olivia_/20260126_153002.jpg',
    'AARON STANPHEN': '/Execom/Aaron Stanphen_/Aaron_stanphen.jpg',
    'ABHISHEK JIJO': '/Execom/Abhishek Jijo/Abhishek jijo_24-12-05_17-19-43-952.jpg',
    'ABHIJITH AJITH': '/Execom/Abijith Ajith_/f9f1fc51-4db0-4600-b8e0-fa342394af13.jpg',
    'ADITHYAN M S': '/Execom/Adithyan M S/IMG_20240524_092651861.jpg',
    'AKASH S NAIR': '/Execom/Akash S Nair/IMG_2771_Original.JPG',
    'AKHILA THOMAS': '/Execom/Akhila Thomas/Screenshot_20240811_185346_Gallery.jpg',
    'AKSA LIZ ABRAHAM': '/Execom/Aksa Liz Abraham/IMG-20251031-WA0029.jpg',
    'ALDRIN TARSON ALOOR': '/Execom/Aldrin Tarson Aloor_/IMG_20260126_181545.jpg',
    'ALEETA VIJU': '/Execom/Aleetta Viju/IMG-20251219-WA0117.jpg',
    'ALEN C FRANCIS': '/Execom/Alen C Francis/Alen C Francis.jpeg',
    'ALEN DOLBY': '/Execom/Alen Dolby/IMG_20240423_054524_157.JPG',
    'ALEXO MATHEW': '/Execom/Alexo Mathew_/20250628_134744.jpg',
    'ALFIN BIJOY': '/Execom/Alfin Bijoy_/IMG_20260126_134003.jpg',
    'ALFIN JOSHI P': '/Execom/alfin_joshi.jpeg',
    'ALJO JOHN ALOOR': '/Execom/Aljo Johns Aloor_/20250905_165224.jpg',
    'AMEENUL IRFAN': '/Execom/Ameenul Irfan_/Ameenul_irfan.jpg',
    'ANAGHA MARY MANJILA': '/Execom/Anagha Mary_/IMG_20260128_193954.jpg',
    'ANCELIN BABETTE JAIMON': '/Execom/Ancelin Babette Jaimon_/IMG-20250421-WA0107(1).jpg',
    'ANGELINA VICTOR': '/Execom/Angelina Victor Varghese/eb65501f-0ea7-4a50-be56-0fd854318583.jpg',
    'ANNLIYA ANTO': '/Execom/Annliya anto/IMG-20260127-WA0001.jpg',
    'ANTONY DANTY': '/Execom/Antony Danty_/IMG_20260126_150856.jpg',
    'ANTONY JOFFY': '/Execom/Antony Joffy/IMG_20260125_221642_547.webp',
    'ANUSHKA K JOTHISH': '/Execom/Anushka K Jothish/IMG_5098.PNG',
    'ARADHANA ROSE': '/Execom/Aradhana Rose/Aradhana Rose.jpg',
    'ARAVIND KRISHNA C A': '/Execom/Aravind Krishna C A/Aravind Krishna C A.jpeg',
    'ARHIN V BIJU': '/Execom/Arhin V Biju/9a480e04-106d-419e-95f0-681116e0266a.jpg',
    'ARJUN KRISHNA': '/Execom/Arjun Krishna K S_/IMG_20260127_221225.jpg',
    'ARNOLD KAVUNGAL': '/Execom/Arnold Kavungal/IMG_20251117_204600_053.webp',
    'ASWATH KRISHNA': '/Execom/ASWATH KRISHNA M B_/IMG_20260126_160503.jpg',
    'BINU ASHIK K': '/Execom/Binu Ashik K/Binu_ashik.jpg',
    'BRISTO BIJU': '/Execom/Bristo Biju/me.jpg',
    'DARSANA DILEEP': '/Execom/DARSANA DILEEP_/darsana.jpg',
    'DENNY MATHEW': '/Execom/Denny Mathew_/Picsart_25-07-12_18-06-20-071.jpg',
    'DEVIKA K V': '/Execom/Devika K V/IMG-20250129-WA0005(1).jpg',
    'DHINA FATHIMA': '/Execom/Dhina Fathima_/IMG-20251221-WA0077.jpg',
    'DIYA JOY': '/Execom/Diya Joy/IMG_20260126_211834.jpg',
    'EALWIN ANTONY MANOJ': '/Execom/Ealwin Antony Manoj_/EALWIN ANTONY MANOJ .jpg',
    'EDWIN BIJU KANNAMPUZHA': '/Execom/Edwin Biju/EDWIN BIJU.jpg',
    'ELSA MARIA': '/Execom/Elsa Maria/87407.jpg.jpeg',
    'HAWIN JOE': '/Execom/Hawin Joe/Hawin Joe.jpg',
    'IRENE KALLOOKARAN ANTO': '/Execom/Irene Anto/Irene_anto.jpg',
    'IRENE JOHN P': '/Execom/Irene John P_/Irene John P.jpg',
    'ISHAN SUDARSAN': '/Execom/Ishan Sudarsan_/Ishan Sudarsan.jpg',
    'JEEVAN JOSE': '/Execom/Jeevan Jose/IMG-20260126-WA0018.jpg',
    'JEREMIAH SHIBOO JOHN': '/Execom/Jeremiah Shiboo John_/Jeremiah.jpg',
    'JESWIN JAISON': '/Execom/Jeswin Jaison_/IMG_20240916_125048_952.jpg',
    'JISMON K J': '/Execom/Jismon KJ/IMG_20251028_100915_133.webp',
    'JOSEPH T JENNY': '/Execom/Joseph T Jenny/IMG-20260123-WA0085.jpg',
    'MEVIN BENTY': '/Execom/MEVIN BENTY/IMG_20260126_185253.jpg',
    'MIDHUN PM': '/Execom/Midhun P M/IMG_20240701_173337.jpg',
    'PRARDHANA B GOPAL': '/Execom/Prardhana B Gopal_/IMG_20260128_213048.jpg',
    'RICHARD MARTIN': '/Execom/Richard Martin_/IMG-20251220-WA0067.jpg',
    'SANJU GREHI': '/Execom/Sanju Grehi/IMG_9561.JPG',
    'SNEHA JIJO': '/Execom/Sneha Jijo_/IMG_20260126_150042.jpg',
    'SOURAV P BIJOY': '/Execom/Sourav P Bijoy/SouravPBijoy.jpg',
    'SOURAV SEBY P': '/Execom/Sourav Seby p_/Sourav seby.jpg',
    'SREELAKSHMI SREERAJU': '/Execom/Sreelakshmi Sreeraju/PHOTO1.jpeg',
    'SURYANARAYANAN KB': '/Execom/Suryanarayanan_/IMG-20250622-WA0090 (1).jpg',
    'TISA BINO': '/Execom/TISA BIN0_/IMG-20260110-WA0069.jpg',
    'VISHNUPRIYA MV': '/Execom/Vishnupriya M V/vishnupriya.jpeg',
    'ZIA ANN PIOUS': '/Execom/Zia Ann Pious/20250507_174409.jpg',
    'RIXEN SONY': '/Execom/𝑹𝒊𝒙𝒆𝒏 𝑺𝒐𝒏𝒚/IMG_20250906_120542964_HDR_PORTRAIT.jpg',
};

const getImage = (name: string): string => {
    return IMAGE_MAP[name.toUpperCase().trim()] || '';
};

// ===== TYPES =====
interface Member {
    slNo: number;
    name: string;
    department: string;
    semester: string;
    position: string;
}

interface Section {
    id: string;
    title: string;
    shortTitle: string;
    icon: React.ReactNode;
    members: Member[];
}

// ===== DATA =====
const sections: Section[] = [
    {
        id: 'core',
        title: 'Core Committee',
        shortTitle: 'Core',
        icon: <Users className="w-4 h-4" />,
        members: [
            { slNo: 1, name: 'Sneha Prasanth', department: 'CSC', semester: 'S6', position: 'Chairperson' },
            { slNo: 2, name: 'Irene Kallookaran Anto', department: 'CSB', semester: 'S6', position: 'Vice Chair' },
            { slNo: 3, name: 'Ameenul Irfan', department: 'CSA', semester: 'S4', position: 'Secretary' },
            { slNo: 4, name: 'Binu Ashik K', department: 'EEE', semester: 'S4', position: 'Joint Secretary' },
            { slNo: 5, name: 'Angelina Victor', department: 'CSA', semester: 'S6', position: 'Link Rep' },
            { slNo: 6, name: 'Aaron Stanphen', department: 'EEE', semester: 'S6', position: 'Treasurer' },
            { slNo: 7, name: 'Sourav P Bijoy', department: 'CSC', semester: 'S6', position: 'Web Master' },
            { slNo: 8, name: 'Akhila Thomas', department: 'CSA', semester: 'S6', position: 'MDC' },
            { slNo: 9, name: 'Midhun PM', department: 'CSD', semester: 'S4', position: 'Technical Coordinator' },
            { slNo: 10, name: 'Alfin Joshi P', department: 'CSA', semester: 'S4', position: 'ECC' },
        ]
    },
    {
        id: 'cs',
        title: 'Computer Society',
        shortTitle: 'CS',
        icon: <Cpu className="w-4 h-4" />,
        members: [
            { slNo: 11, name: 'Anagha Mary Manjila', department: 'CSA', semester: 'S6', position: 'Chair' },
            { slNo: 12, name: 'Edwin Biju Kannampuzha', department: 'CSB', semester: 'S4', position: 'Vice Chair' },
            { slNo: 13, name: 'Ancelin Babette Jaimon', department: 'CSB', semester: 'S4', position: 'Secretary' },
            { slNo: 14, name: 'Aradhana Rose', department: 'CSA', semester: 'S2', position: 'WIC' },
        ]
    },
    {
        id: 'ias',
        title: 'Industrial Applications Society',
        shortTitle: 'IAS',
        icon: <Cog className="w-4 h-4" />,
        members: [
            { slNo: 15, name: 'Richard Martin', department: 'CSC', semester: 'S6', position: 'Chair' },
            { slNo: 16, name: 'Joseph T Jenny', department: 'CSC', semester: 'S4', position: 'Vice Chair' },
            { slNo: 17, name: 'Jennifer Antony', department: 'CSC', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'ies',
        title: 'Industrial Electronics Society',
        shortTitle: 'IES',
        icon: <Zap className="w-4 h-4" />,
        members: [
            { slNo: 18, name: 'Abhijith Ajith', department: 'CSA', semester: 'S6', position: 'Chair' },
            { slNo: 19, name: 'Antony Danty', department: 'CSA', semester: 'S6', position: 'Vice Chair' },
            { slNo: 20, name: 'Sourav Seby P', department: 'CSD', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'sight',
        title: 'SIGHT',
        shortTitle: 'SIGHT',
        icon: <Sparkles className="w-4 h-4" />,
        members: [
            { slNo: 21, name: 'Aswath Krishna', department: 'CSB', semester: 'S4', position: 'Chair' },
            { slNo: 22, name: 'Arjun Krishna', department: 'CSB', semester: 'S4', position: 'Vice Chair' },
            { slNo: 23, name: 'Elsa Maria', department: 'ECE', semester: 'S4', position: 'Secretary' },
            { slNo: 24, name: 'Arnold Kavungal', department: 'CSA', semester: 'S6', position: 'Project Coord.' },
        ]
    },
    {
        id: 'sps',
        title: 'Signal Processing Society',
        shortTitle: 'SPS',
        icon: <Radio className="w-4 h-4" />,
        members: [
            { slNo: 25, name: 'Sanju Grehi', department: 'EEE', semester: 'S4', position: 'Chair' },
            { slNo: 26, name: 'Alfin Bijoy', department: 'CSA', semester: 'S4', position: 'Vice Chair' },
            { slNo: 27, name: 'Aleeta Viju', department: 'CSA', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'npss',
        title: 'Nuclear & Plasma Sciences',
        shortTitle: 'NPSS',
        icon: <Atom className="w-4 h-4" />,
        members: [
            { slNo: 28, name: 'Ann Mariya K Saju', department: 'CSA', semester: 'S6', position: 'Chair' },
            { slNo: 29, name: 'Aksa Liz Abraham', department: 'BME', semester: 'S4', position: 'Vice Chair' },
            { slNo: 30, name: 'Christina Joseph', department: 'CSB', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'edsoc',
        title: 'Educational Society',
        shortTitle: 'EdSoc',
        icon: <GraduationCap className="w-4 h-4" />,
        members: [
            { slNo: 31, name: 'Jeremiah Shiboo John', department: 'CSC', semester: 'S4', position: 'Chair' },
            { slNo: 32, name: 'Diya Joy', department: 'CSB', semester: 'S4', position: 'Vice Chair' },
            { slNo: 33, name: 'Devika K V', department: 'CSB', semester: 'S4', position: 'Secretary' },
        ]
    },
    {
        id: 'css',
        title: 'Control System Society',
        shortTitle: 'CSS',
        icon: <Cog className="w-4 h-4" />,
        members: [
            { slNo: 34, name: 'Ealwin Antony Manoj', department: 'EEE', semester: 'S4', position: 'Chair' },
            { slNo: 35, name: 'Jismon K J', department: 'EEE', semester: 'S4', position: 'Vice Chair' },
            { slNo: 36, name: 'Hawin Joe', department: 'CSC', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'embs',
        title: 'Engineering in Medical and Biological Society',
        shortTitle: 'EMBS',
        icon: <Activity className="w-4 h-4" />,
        members: [
            { slNo: 37, name: 'Darsana Dileep', department: 'BM', semester: 'S6', position: 'Chair' },
            { slNo: 38, name: 'Sheetal Suresh Unny', department: 'BME', semester: 'S2', position: 'Vice Chair' },
            { slNo: 39, name: 'Albert Sibichan Jacob', department: 'BM', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'pes',
        title: 'Power & Energy Society',
        shortTitle: 'PES',
        icon: <Bolt className="w-4 h-4" />,
        members: [
            { slNo: 40, name: 'Abhishek Jijo', department: 'EEE', semester: 'S6', position: 'Chair' },
            { slNo: 41, name: 'Ahamed Rizwan K M', department: 'EEE', semester: 'S6', position: 'Vice Chair' },
            { slNo: 42, name: 'Annliya Anto', department: 'ECE', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'wie',
        title: 'Women in Engineering',
        shortTitle: 'WIE',
        icon: <Heart className="w-4 h-4" />,
        members: [
            { slNo: 43, name: 'Tisa Bino', department: 'EEE', semester: 'S4', position: 'Chair' },
            { slNo: 44, name: 'Prardhana B Gopal', department: 'BME', semester: 'S2', position: 'Vice Chair' },
            { slNo: 45, name: 'Irene John P', department: 'CSC', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'cass',
        title: 'Circuit & System Society',
        shortTitle: 'CASS',
        icon: <Cpu className="w-4 h-4" />,
        members: [
            { slNo: 47, name: 'Aravind Krishna C A', department: 'ECE', semester: 'S6', position: 'Chair' },
            { slNo: 48, name: 'Aldrin Tarson Aloor', department: 'ECE', semester: 'S4', position: 'Vice Chair' },
            { slNo: 49, name: 'Jeevan Jose', department: 'BME', semester: 'S4', position: 'Secretary' },
        ]
    },
    {
        id: 'ras',
        title: 'Robotics & Automation',
        shortTitle: 'RAS',
        icon: <Wrench className="w-4 h-4" />,
        members: [
            { slNo: 50, name: 'Alexo Mathew', department: 'ECE', semester: 'S6', position: 'Chair' },
            { slNo: 51, name: 'Alen C Francis', department: 'CSA', semester: 'S4', position: 'Vice Chair' },
            { slNo: 52, name: 'Jeswin Jaison', department: 'CSC', semester: 'S2', position: 'Secretary' },
        ]
    },
    {
        id: 'tech',
        title: 'Technical Team',
        shortTitle: 'Tech',
        icon: <Cpu className="w-4 h-4" />,
        members: [
            { slNo: 53, name: 'Mevin Benty', department: 'CSD', semester: 'S4', position: 'Member' },
            { slNo: 54, name: 'Adithyan M S', department: 'CSA', semester: 'S4', position: 'Member' },
            { slNo: 55, name: 'Bristo Biju', department: 'CSB', semester: 'S4', position: 'Member' },
        ]
    },
    {
        id: 'epd',
        title: 'Event Proposal & Drafting',
        shortTitle: 'EPD',
        icon: <FileText className="w-4 h-4" />,
        members: [
            { slNo: 56, name: 'Anushka K Jothish', department: 'CSA', semester: 'S6', position: 'Member' },
            { slNo: 57, name: 'Sreelakshmi Sreeraju', department: 'CSA', semester: 'S6', position: 'Member' },
            { slNo: 58, name: 'Ann Joshna', department: 'BTE', semester: 'S2', position: 'Member' },
            { slNo: 59, name: 'Taniya Thomson', department: 'CSD', semester: 'S2', position: 'Member' },
        ]
    },
    {
        id: 'media',
        title: 'Media Team',
        shortTitle: 'Media',
        icon: <Camera className="w-4 h-4" />,
        members: [
            { slNo: 60, name: 'Akash S Nair', department: 'CSA', semester: 'S6', position: 'Member' },
            { slNo: 61, name: 'Antony Joffy', department: 'CSA', semester: 'S6', position: 'Member' },
            { slNo: 62, name: 'Alan Saj', department: 'CSA', semester: 'S6', position: 'Member' },
            { slNo: 63, name: 'Suryanarayanan KB', department: 'EEE', semester: 'S6', position: 'Member' },
            { slNo: 64, name: 'Rixen Sony', department: 'CSD', semester: 'S2', position: 'Member' },
            { slNo: 65, name: 'Dhina Fathima', department: 'BTE', semester: 'S2', position: 'Member' },
        ]
    },
    {
        id: 'ec',
        title: 'Event Coordination',
        shortTitle: 'Events',
        icon: <Users className="w-4 h-4" />,
        members: [
            { slNo: 66, name: 'Alen Dolby', department: 'CSA', semester: 'S4', position: 'Member' },
            { slNo: 67, name: 'Ishan Sudarsan', department: 'CSC', semester: 'S4', position: 'Member' },
            { slNo: 68, name: 'Diya Joy', department: 'CSB', semester: 'S4', position: 'Member' },
            { slNo: 69, name: 'Sneha Jijo', department: 'CSD', semester: 'S4', position: 'Member' },
        ]
    },
    {
        id: 'design',
        title: 'Design Team',
        shortTitle: 'Design',
        icon: <Palette className="w-4 h-4" />,
        members: [
            { slNo: 70, name: 'Zia Ann Pious', department: 'CSD', semester: 'S2', position: 'Member' },
            { slNo: 71, name: 'Muhammed Afsal TK', department: 'BME', semester: 'S2', position: 'Member' },
            { slNo: 72, name: 'Shefin Hashir', department: 'CSD', semester: 'S2', position: 'Member' },
            { slNo: 73, name: 'Krishna Kannan', department: 'ECE', semester: 'S4', position: 'Member' },
        ]
    },
    {
        id: 'content',
        title: 'Content & Documentation',
        shortTitle: 'Content',
        icon: <FileText className="w-4 h-4" />,
        members: [
            { slNo: 74, name: 'Vishnupriya MV', department: 'CSD', semester: 'S4', position: 'Member' },
            { slNo: 75, name: 'Merin Elizabeth Edgar', department: 'CSD', semester: 'S4', position: 'Member' },
            { slNo: 76, name: 'Thanushree Suresh', department: 'CSD', semester: 'S4', position: 'Member' },
            { slNo: 77, name: 'Aan Lily Olivia', department: 'BTE', semester: 'S2', position: 'Member' },
        ]
    },
    {
        id: 'qrt',
        title: 'Quick Response Team',
        shortTitle: 'QRT',
        icon: <MessageSquare className="w-4 h-4" />,
        members: [
            { slNo: 78, name: 'Athul Krishna', department: 'EEE', semester: 'S6', position: 'Member' },
            { slNo: 79, name: 'Arhin V Biju', department: 'EEE', semester: 'S6', position: 'Member' },
            { slNo: 80, name: 'Aljo John Aloor', department: 'CSB', semester: 'S4', position: 'Member' },
            { slNo: 81, name: 'Denny Mathew', department: 'CSB', semester: 'S4', position: 'Member' },
        ]
    },
];

// ===== COMPONENTS =====

const MemberCard: React.FC<{ member: Member; index: number }> = ({ member, index }) => {
    const [imgError, setImgError] = useState(false);
    const imageSrc = getImage(member.name);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.03 }}
            className="group"
        >
            <div className="relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-xl transition-all duration-500">
                {/* Image */}
                <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
                    {imageSrc && !imgError ? (
                        <img
                            src={imageSrc}
                            alt={member.name}
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <span className="text-4xl font-light text-gray-300">
                                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                        </div>
                    )}
                    
                    {/* Number */}
                    <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-mono text-white/80 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                            {String(member.slNo).padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Info */}
                <div className="p-4">
                    <div className="text-[10px] font-medium text-[#00629B] uppercase tracking-wider mb-1">
                        {member.position}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2">
                        {member.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-medium">{member.department}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="text-[10px] text-gray-400 font-medium">{member.semester}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const FullExecom: React.FC = () => {
    const [activeSection, setActiveSection] = useState('core');
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const currentSection = sections.find(s => s.id === activeSection) || sections[0];

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        setIsMobileNavOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-900">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <span className="font-semibold text-gray-900">EXECOM '26</span>
                    <button 
                        onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                        className="p-2 -mr-2 text-gray-500"
                    >
                        <Users className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Mobile Nav Dropdown */}
            <AnimatePresence>
                {isMobileNavOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="lg:hidden fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-100 max-h-[60vh] overflow-y-auto"
                    >
                        <div className="p-4 grid grid-cols-3 gap-2">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`p-3 rounded-xl text-center transition-all ${
                                        activeSection === section.id
                                            ? 'bg-[#00629B] text-white'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex justify-center mb-1">{section.icon}</div>
                                    <span className="text-[10px] font-medium">{section.shortTitle}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-gray-100 flex-col z-50">
                {/* Back Button */}
                <Link 
                    href="/" 
                    className="flex items-center justify-center h-16 border-b border-gray-100 text-gray-400 hover:text-[#00629B] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                    <div className="space-y-1 px-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`group relative w-full flex flex-col items-center py-3 px-1 rounded-xl transition-all duration-300 ${
                                    activeSection === section.id
                                        ? 'bg-[#00629B] text-white'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {section.icon}
                                <span className="text-[8px] font-medium mt-1 text-center leading-tight">
                                    {section.shortTitle}
                                </span>
                                
                                {/* Tooltip */}
                                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                    {section.title}
                                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                                </div>
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Logo */}
                <div className="h-16 flex items-center justify-center border-t border-gray-100">
                    <span className="text-[10px] font-bold text-[#00629B]">IEEE</span>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-20 pt-16 lg:pt-0">
                {/* Header */}
                <header className="sticky top-0 lg:top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                    <div className="max-w-6xl mx-auto px-6 py-6 lg:py-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <motion.div
                                    key={activeSection}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-3 mb-2"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[#00629B] text-white flex items-center justify-center">
                                        {currentSection.icon}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                                            {currentSection.title}
                                        </h1>
                                        <p className="text-sm text-gray-400 mt-0.5">
                                            {currentSection.members.length} members
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                            
                            <div className="hidden lg:block text-right">
                                <p className="text-xs text-gray-400 uppercase tracking-wider">IEEE SB Sahrdaya</p>
                                <p className="text-lg font-semibold text-gray-900">EXECOM 2026-2027</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                                {currentSection.members.map((member, idx) => (
                                    <MemberCard key={member.slNo} member={member} index={idx} />
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Quick Navigation */}
                    <div className="mt-16 pt-8 border-t border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">Quick Navigation</p>
                        <div className="flex flex-wrap gap-2">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        activeSection === section.id
                                            ? 'bg-[#00629B] text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    {section.shortTitle}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default FullExecom;
