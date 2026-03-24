import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GymOS",
  description: "MVP de plataforma para gimnasio con Next.js y Supabase.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
