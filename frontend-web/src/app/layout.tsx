import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sileo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Zentra — School Management System for K-12",
  description:
    "A DepEd-aligned student information and ADM management system for Junior and Senior High School — one record per learner, scoped to every role that needs it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
