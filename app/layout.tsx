import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AppProvider } from "@/components/providers";
import AmbientBg from "@/components/ambient-bg";
import CommandPalette from "@/components/command-palette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DisplaceOS — Unified Disaster Relief Coordination",
  description: "Real-time crisis command: eliminate duplicate deliveries, medicine blindspots and spreadsheet delays in the first 72 hours.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#030712] text-slate-200">
        <AppProvider>
          <AmbientBg />
          {children}
          <CommandPalette />
          <Toaster richColors position="top-right" theme="dark" />
        </AppProvider>
      </body>
    </html>
  );
}
