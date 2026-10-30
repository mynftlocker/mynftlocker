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
  description: "Your Sorare gallery and locker room: NBA and football cards, filters, stats and sharing.",
  metadataBase: new URL("https://mynftlocker.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "myNFTlocker",
    description: "Your Sorare gallery and locker room: NBA and football cards, filters, stats and sharing.",
    url: "https://mynftlocker.com",
    siteName: "myNFTlocker",
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "myNFTlocker", description: "Your Sorare gallery and locker room: NBA and football cards, filters, stats and sharing.", images: ["/api/og"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* H1 invisible : titre de la page pour les moteurs de recherche et les lecteurs d'ecran */}
        <h1 style={{position:"absolute",width:1,height:1,margin:-1,padding:0,overflow:"hidden",clip:"rect(0 0 0 0)",whiteSpace:"nowrap",border:0}}>myNFTlocker — Sorare gallery and locker room</h1>
        {children}
      </body>
    </html>
  );
}
