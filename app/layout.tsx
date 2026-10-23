import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { AppProvider } from "@/components/providers";
import AmbientBg from "@/components/ambient-bg";
import CommandPalette from "@/components/command-palette";
import SmoothScroll from "@/components/smooth-scroll";
import OperatorModal from "@/components/auth/operator-modal";

export const metadata: Metadata = {
  title: "DisplaceOS — Unified Disaster Relief Coordination",
  description: "A disaster-response coordination prototype for camp resources, requests, dispatches, and survivor records.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-[#020408] text-slate-200">
        <AppProvider>
          <SmoothScroll>
            <AmbientBg />
            {children}
          </SmoothScroll>
          <CommandPalette />
          <OperatorModal />
          <Toaster richColors position="top-right" theme="dark" />
        </AppProvider>
      </body>
    </html>
  );
}
