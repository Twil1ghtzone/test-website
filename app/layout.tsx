import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { brand } from "@/lib/data";
import Nav from "@/components/Nav";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollBackdrop from "@/components/ScrollBackdrop";
import Footer from "@/components/Footer";
import SupportButton from "@/components/SupportButton";
import SiteChrome from "@/components/SiteChrome";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: `${brand.name} — Energie sparen. Unabhängig werden.`,
  description:
    "Elektrohandwerk und moderne IT aus einer Hand: cloud-freie Sicherheit & Smart Home, ein eigener sparsamer Server und maßgeschneiderter 3D-Druck. Energie sparen, unabhängig werden, ganz ohne monatliche Gebühren.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f2ea",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <SiteChrome>
          <ScrollBackdrop />
          <ScrollProgress />
          <Nav />
        </SiteChrome>
        {children}
        <SiteChrome>
          <Footer />
          <SupportButton />
        </SiteChrome>
      </body>
    </html>
  );
}
