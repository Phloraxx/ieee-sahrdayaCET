/**
 * Fake event data for testing the /events-1 page
 * This data simulates realistic IEEE chapter events
 */

export interface Event {
  $id: string;
  title: string;
  description?: string;
  date: string;
  venue?: string;
  price: number;
  banner_url?: string;
  registration_url?: string;
  society_id: string;
  status: 'draft' | 'published' | 'archived' | 'completed';
  max_capacity?: number;
}

// Helper to generate future dates relative to current date
const getFutureDate = (daysFromNow: number, hours: number = 10, minutes: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

// Helper to generate past dates for completed events
const getPastDate = (daysAgo: number, hours: number = 10, minutes: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export const FAKE_EVENTS: Event[] = [
  {
    $id: 'evt_001',
    title: 'AI & Machine Learning Workshop',
    description:
      'Dive deep into the world of artificial intelligence and machine learning. This hands-on workshop covers neural networks, deep learning frameworks like TensorFlow and PyTorch, and practical applications in computer vision and NLP. Perfect for beginners and intermediate learners.',
    date: getFutureDate(7, 10, 0), // 1 week from now
    venue: 'Computer Science Lab, Block A',
    price: 0,
    banner_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/ai-ml-workshop',
    society_id: 'ieee_cs',
    status: 'published',
    max_capacity: 60,
  },
  {
    $id: 'evt_002',
    title: 'RoboWars 2025 - Annual Robotics Competition',
    description:
      'The flagship robotics competition returns! Build your battle robot and compete against the best teams. Categories include sumo bots, line followers, and freestyle combat. Exciting prizes worth ₹50,000 to be won!',
    date: getFutureDate(30, 9, 0), // 1 month from now
    venue: 'Main Auditorium & Robotics Arena',
    price: 500,
    banner_url: 'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/robowars-2025',
    society_id: 'ieee_ras',
    status: 'published',
    max_capacity: 200,
  },
  {
    $id: 'evt_003',
    title: 'Smart Grid Technologies Seminar',
    description:
      'Industry experts from leading power companies discuss the future of smart grids, renewable energy integration, and sustainable power distribution. Learn about IoT in power systems and career opportunities in the energy sector.',
    date: getFutureDate(14, 14, 0), // 2 weeks from now
    venue: 'Electrical Engineering Seminar Hall',
    price: 0,
    banner_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/smart-grid-seminar',
    society_id: 'ieee_pes',
    status: 'published',
    max_capacity: 150,
  },
  {
    $id: 'evt_004',
    title: 'Web Development Bootcamp',
    description:
      'A 3-day intensive bootcamp covering modern web development. Learn React, Next.js, Tailwind CSS, and backend development with Node.js. Build and deploy a full-stack project by the end of the workshop.',
    date: getFutureDate(45, 9, 30), // 45 days from now
    venue: 'IT Department Lab 2',
    price: 299,
    banner_url: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/webdev-bootcamp',
    society_id: 'ieee_cs',
    status: 'published',
    max_capacity: 40,
  },
  {
    $id: 'evt_005',
    title: 'IEEE Leadership Summit',
    description:
      'Annual networking event bringing together IEEE student branch leaders, industry professionals, and academic mentors. Panel discussions, keynote speeches, and collaborative sessions on innovation and leadership.',
    date: getFutureDate(60, 10, 0), // 2 months from now
    venue: 'University Convention Center',
    price: 150,
    banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/leadership-summit',
    society_id: 'ieee_main',
    status: 'draft',
    max_capacity: 500,
  },
  {
    $id: 'evt_006',
    title: 'Embedded Systems & IoT Hackathon',
    description:
      'A 24-hour hackathon focused on embedded systems and IoT solutions. Work with Arduino, ESP32, Raspberry Pi, and various sensors to solve real-world problems. Mentorship from industry professionals included.',
    date: getFutureDate(21, 8, 0), // 3 weeks from now
    venue: 'Innovation Hub, Engineering Block',
    price: 100,
    banner_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/iot-hackathon',
    society_id: 'ieee_ras',
    status: 'published',
    max_capacity: 80,
  },
  {
    $id: 'evt_007',
    title: 'Women in Engineering: Career Panel',
    description:
      'Celebrating women in STEM! Join us for an inspiring panel discussion featuring successful women engineers from top tech companies. Topics include career growth, overcoming challenges, and building supportive networks.',
    date: getFutureDate(10, 15, 0), // 10 days from now
    venue: 'Conference Room 101',
    price: 0,
    banner_url: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/wie-panel',
    society_id: 'ieee_wie',
    status: 'published',
    max_capacity: 100,
  },
  {
    $id: 'evt_008',
    title: 'Cybersecurity Essentials Workshop',
    description:
      'Learn the fundamentals of cybersecurity including ethical hacking, penetration testing, and security best practices. Hands-on labs with Kali Linux and real-world vulnerability assessment scenarios.',
    date: getFutureDate(50, 10, 0), // 50 days from now
    venue: 'Computer Science Lab, Block B',
    price: 199,
    banner_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/cybersec-workshop',
    society_id: 'ieee_cs',
    status: 'draft',
    max_capacity: 35,
  },
  {
    $id: 'evt_009',
    title: 'Electric Vehicle Technology Expo',
    description:
      'Explore the future of transportation! Exhibition featuring EV manufacturers, battery technology demos, and technical talks on electric motor design, charging infrastructure, and sustainable mobility solutions.',
    date: getPastDate(30, 9, 0), // 30 days ago (completed event)
    venue: 'Open Ground & Mechanical Workshop',
    price: 50,
    banner_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/ev-expo',
    society_id: 'ieee_pes',
    status: 'completed',
    max_capacity: 300,
  },
  {
    $id: 'evt_010',
    title: 'Competitive Programming Contest',
    description:
      'Test your coding skills in this algorithmic programming contest! Multiple rounds with increasing difficulty. Problems covering data structures, algorithms, dynamic programming, and graph theory. Great preparation for ICPC!',
    date: getFutureDate(5, 9, 0), // 5 days from now
    venue: 'Online (HackerRank Platform)',
    price: 0,
    banner_url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/cp-contest',
    society_id: 'ieee_cs',
    status: 'published',
    max_capacity: 500,
  },
  {
    $id: 'evt_011',
    title: 'Drone Building & Flying Workshop',
    description:
      'Learn to build your own quadcopter from scratch! This comprehensive workshop covers aerodynamics, flight controllers, ESCs, and programming autonomous flight paths. Includes a flying session at the end.',
    date: getFutureDate(90, 10, 0), // 3 months from now
    venue: 'Aerospace Lab & Open Field',
    price: 750,
    banner_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1200&h=600&fit=crop',
    registration_url: 'https://forms.google.com/drone-workshop',
    society_id: 'ieee_ras',
    status: 'draft',
    max_capacity: 20,
  },
  {
    $id: 'evt_012',
    title: 'Tech Talk: Quantum Computing Basics',
    description:
      'An introductory session on quantum computing by Dr. Ananya Sharma from IIT. Understand qubits, quantum gates, superposition, and entanglement. Explore the potential applications and current state of quantum technology.',
    date: getFutureDate(25, 16, 0), // 25 days from now
    venue: 'Physics Auditorium',
    price: 0,
    banner_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=600&fit=crop',
    society_id: 'ieee_main',
    status: 'published',
    max_capacity: 200,
  },
];

// Helper function to get events by status
export const getEventsByStatus = (status: Event['status']): Event[] => {
  return FAKE_EVENTS.filter((event) => event.status === status);
};

// Helper function to get events by society
export const getEventsBySociety = (societyId: string): Event[] => {
  return FAKE_EVENTS.filter((event) => event.society_id === societyId);
};

// Helper function to get upcoming events (published and date in future)
export const getUpcomingEvents = (): Event[] => {
  const now = new Date();
  return FAKE_EVENTS.filter(
    (event) => event.status === 'published' && new Date(event.date) > now
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Helper function to get free events
export const getFreeEvents = (): Event[] => {
  return FAKE_EVENTS.filter((event) => event.price === 0);
};

// Society metadata for reference
export const SOCIETIES = {
  ieee_cs: { name: 'IEEE Computer Society', shortName: 'CS' },
  ieee_pes: { name: 'IEEE Power & Energy Society', shortName: 'PES' },
  ieee_ras: { name: 'IEEE Robotics & Automation Society', shortName: 'RAS' },
  ieee_wie: { name: 'IEEE Women in Engineering', shortName: 'WIE' },
  ieee_main: { name: 'IEEE Student Branch', shortName: 'IEEE' },
} as const;

export type SocietyId = keyof typeof SOCIETIES;
