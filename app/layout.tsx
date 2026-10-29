import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};
export const metadata: Metadata = {
  title: "myNFTlocker",
  description: "Ta galerie et ton vestiaire Sorare : NBA, foot, filtres, stats et partage.",
  metadataBase: new URL("https://mynftlocker.com"),
  openGraph: {
    title: "myNFTlocker",
    description: "Ta galerie et ton vestiaire Sorare : NBA, foot, filtres, stats et partage.",
    url: "https://mynftlocker.com",
    siteName: "myNFTlocker",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "myNFTlocker", description: "Ta galerie et ton vestiaire Sorare : NBA, foot, filtres, stats et partage.", images: ["/api/og"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
