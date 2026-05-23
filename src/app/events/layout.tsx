import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Explore technical events, workshops, and conferences organized by IEEE Sahrdaya Student Branch at Sahrdaya College of Engineering, Thrissur, Kerala.",
  openGraph: {
    title: "Events | IEEE Sahrdaya",
    description:
      "Explore technical events, workshops, and conferences organized by IEEE Sahrdaya Student Branch.",
    url: "https://ieeesahrdaya.com/events",
  },
  twitter: {
    title: "Events | IEEE Sahrdaya",
    description:
      "Explore technical events, workshops, and conferences organized by IEEE Sahrdaya Student Branch.",
  },
  alternates: {
    canonical: "https://ieeesahrdaya.com/events",
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
