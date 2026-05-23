import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Profile",
  robots: { index: false, follow: false },
};

export default function SetupProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
