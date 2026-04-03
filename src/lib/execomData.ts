// Execom Members Data & Image Mapping

export interface ExecomMember {
    slNo: number;
    name: string;
    department: string;
    semester: string;
    position: string;
    photoUrl?: string;
    linkedin?: string;
    instagram?: string;
    email?: string;
    phone?: string;
}

// Image Map - Exact paths from filesystem
const IMAGE_MAP: { [key: string]: string } = {
    'SNEHA PRASANTH': '/Execom/Sneha Prasanth/Sneha Prasanth.JPG',
    'ANIL ANTONY': '/Execom/anilantony.jpg',
    'AHAMED RIZWAN K M': '/Execom/Ahamed Rizwan K M.png',
    'ANN JOSHNA': '/Execom/Ann Joshna Joby.jpeg',
    'ATHUL KRISHNA': '/Execom/Athul krishna ks.jpg',
    'CHRISTINA JOSEPH': '/Execom/Christina Joseph.jpg',
    'JENNIFER ANTONY': '/Execom/Jennifer Antony_.jpg',
    'SHEETAL SURESH UNNY': '/Execom/SHEETAL SURESH UNNY_.jpg',
    'ALBERT SIBICHAN JACOB':'/Execom/Albert Sibichan Jacob/IMG_5412.JPG',
    'TANIYA THOMSON': '/Execom/Taniya Thomson.jpg',
    'AAN LILY OLIVIA': '/Execom/Aan Lily Olivia_/20260126_153002.jpg',
    'AARON STANPHEN': '/Execom/Aaron Stanphen_/Aaron_stanphen.jpg',
    'ABHISHEK JIJO': '/Execom/Abhishek Jijo/Abhishek jijo_24-12-05_17-19-43-952.jpg',
    'ABHIJITH AJITH': '/Execom/Abijith Ajith_/f9f1fc51-4db0-4600-b8e0-fa342394af13.jpg',
    'ADITHYAN M S': '/Execom/Adithyan M S/IMG_20240524_092651861.jpg',
    'AKASH S NAIR': '/Execom/Akash S Nair/IMG_1405_Original.jpg',
    'AKHILA THOMAS': '/Execom/Akhila Thomas/Screenshot_20240811_185346_Gallery.jpg',
    'AKSA LIZ ABRAHAM': '/Execom/Aksa Liz Abraham/IMG-20251031-WA0029.jpg',
    'ALDRIN TARSON ALOOR': '/Execom/Aldrin Tarson Aloor_/IMG_20260126_181545.jpg',
    'ALEETA VIJU': '/Execom/Aleetta Viju/IMG-20251219-WA0117.jpg',
    'ALEN C FRANCIS': '/Execom/Alen C Francis/Alen C Francis.jpeg',
    'ALEN DOLBY': '/Execom/Alen Dolby/IMG_20240423_054524_157.JPG',
    'ALEXO MATHEW': '/Execom/Alexo Mathew_/20250628_134744.jpg',
    'ALFIN BIJOY': '/Execom/Alfin Bijoy_/IMG_20260126_134003.jpg',
    'ALFIN JOSHI P': '/Execom/alfin_joshi.jpeg',
    'ALAN SAJ': '/Execom/Alan Saj/Alan Saj.jpg',
    'ALJO JOHN ALOOR': '/Execom/Aljo Johns Aloor_/20250905_165224.jpg',
    'AMEENUL IRFAN': '/Execom/Ameenul Irfan_/Ameenul_irfan.jpg',
    'ANAGHA MARY MANJILA': '/Execom/Anagha Mary_/IMG_20260128_193954.jpg',
    'ANCELIN BABETTE JAIMON': '/Execom/Ancelin Babette Jaimon_/IMG-20250421-WA0107(1).jpg',
    'ANGELINA VICTOR': '/Execom/Angelina Victor Varghese/eb65501f-0ea7-4a50-be56-0fd854318583.jpg',
    'ANGEL SHAJU': '/Execom/Angel Shaju/angel.jpeg',
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
    'JISMON K J': '/Execom/Jismon KJ/IMG_20251028_100915_133.jpg',
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
    'MERIN ELIZABETH EDGAR':'/Execom/Merin Elizabeth Edgar_/20250910_203854.jpg',
    'ZIA ANN PIOUS': '/Execom/Zia Ann Pious/20250507_174409.jpg',
    'RIXEN SONY': '/Execom/𝑹𝒊𝒙𝒆𝒏 𝑺𝒐𝒏𝒚/IMG_20250906_120542964_HDR_PORTRAIT.jpg',
    'SREEHARI K R': '/Execom/Sreehari K R.jpg',
    'KRISHNA KANNAN': '/Execom/Krishna Kannan/IMG_3816.jpg',
    'ANNROSE JOSHY': '/Execom/ANNROSE JOSHY_/ANNROSE JOSHY.jpg',
};

export const getImage = (name: string): string => {
    return IMAGE_MAP[name.toUpperCase().trim()] || '';
};
