import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import JsonLd from "@/components/JsonLd";

const pressStart2P = Press_Start_2P({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const BASE_URL = "https://ieeesahrdaya.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "IEEE Sahrdaya Student Branch",
    template: "%s | IEEE Sahrdaya",
  },
  description:
    "Official IEEE Sahrdaya Student Branch — technical events, workshops, societies & execom directory. Sahrdaya College of Engineering, Thrissur, Kerala.",
  keywords: [
    "IEEE Sahrdaya",
    "IEEE student branch Kerala",
    "Sahrdaya College IEEE",
    "IEEE Kerala Section",
    "technical events Thrissur",
    "engineering workshops Kerala",
    "IEEE student events",
    "Sahrdaya College of Engineering",
  ],
  authors: [{ name: "IEEE Sahrdaya Student Branch", url: BASE_URL }],
  creator: "IEEE Sahrdaya Student Branch",
  publisher: "IEEE Sahrdaya Student Branch",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    siteName: "IEEE Sahrdaya Student Branch",
    title: "IEEE Sahrdaya Student Branch",
    description:
      "Official website of IEEE Sahrdaya Student Branch — technical events, workshops, societies and execom directory.",
    url: BASE_URL,
    images: [
      {
        url: "/emblem.png",
        width: 800,
        height: 800,
        alt: "IEEE Sahrdaya Student Branch Emblem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IEEE Sahrdaya Student Branch",
    description:
      "Official website of IEEE Sahrdaya Student Branch — technical events, workshops, societies and execom directory.",
    images: ["/emblem.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#00629B",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "IEEE Sahrdaya Student Branch",
  url: BASE_URL,
  logo: `${BASE_URL}/emblem.png`,
  description:
    "Official IEEE Student Branch at Sahrdaya College of Engineering & Technology, Thrissur, Kerala, India.",
  sameAs: ["https://www.ieee.org", "https://ieeekerala.org"],
  parentOrganization: {
    "@type": "Organization",
    name: "IEEE Kerala Section",
    url: "https://ieeekerala.org",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Thrissur",
    addressRegion: "Kerala",
    addressCountry: "IN",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "IEEE Sahrdaya Student Branch",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/events?society={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
      </head>
      <body className={`${pressStart2P.variable} ${inter.variable} antialiased`}>
        <JsonLd schema={organizationSchema} />
        <JsonLd schema={websiteSchema} />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
