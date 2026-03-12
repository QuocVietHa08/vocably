import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IELTS Flashcards — Master Vocabulary for Band 7+",
  description: "Interactive IELTS flashcard app with spaced repetition.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
