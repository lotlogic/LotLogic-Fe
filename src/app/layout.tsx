import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IBM_Plex_Serif } from 'next/font/google';
import { DM_Sans } from 'next/font/google';
import { app, brand } from "@/constants/content";
import { QueryProvider } from "@/providers/QueryProvider";


const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'], // Example: Regular and Bold weights
  variable: '--font-ibm-plex-serif', // Define a CSS variable
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: app.name,
  description: app.description,
  icons: {
    icon: brand.favicon,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${geistSans.variable} ${geistMono.variable} ${ibmPlexSerif.variable}`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
