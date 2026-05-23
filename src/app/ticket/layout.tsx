import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ticket",
  description:
    "View your event ticket and QR code for IEEE Sahrdaya events.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "https://ieeesahrdaya.com/ticket",
  },
};

export default function TicketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
