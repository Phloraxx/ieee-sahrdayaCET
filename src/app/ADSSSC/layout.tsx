import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ADSSSC Proceedings",
  description:
    "Flip through the proceedings of ADSSSC — a technical event by IEEE Sahrdaya Student Branch at Sahrdaya College of Engineering, Thrissur.",
  openGraph: {
    title: "ADSSSC Proceedings | IEEE Sahrdaya",
    description:
      "Flip through the proceedings of ADSSSC — a technical event by IEEE Sahrdaya Student Branch.",
    url: "https://ieeesahrdaya.com/ADSSSC",
  },
  twitter: {
    title: "ADSSSC Proceedings | IEEE Sahrdaya",
    description:
      "Flip through the proceedings of ADSSSC — a technical event by IEEE Sahrdaya Student Branch.",
  },
  alternates: {
    canonical: "https://ieeesahrdaya.com/ADSSSC",
  },
};

export default function ADSSSCLayout({ children }: { children: React.ReactNode }) {
  return children;
}
