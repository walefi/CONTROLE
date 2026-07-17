import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LED Manager · Estoque & Contratos",
  description: "Sistema de gestão de estoque e contratos de painéis de LED",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppSidebar />
        <MobileHeader />
        <main className="min-h-screen bg-muted/40 pt-14 lg:pl-64 lg:pt-0 print:min-h-0 print:bg-white print:pt-0 lg:print:pl-0">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
