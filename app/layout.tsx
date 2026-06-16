import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Findperfume — Temukan parfum terbaik untukmu",
  description:
    "Findperfume memakai AI untuk merekomendasikan parfum terbaik sesuai kepribadian & kebutuhanmu dari 199.000+ parfum. Hasil di-ranking, diberi skor, dan dijelaskan kenapa cocok.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
