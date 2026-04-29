import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap', weight: ['400','500','600','700'] });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['400','500'] });

export const metadata: Metadata = {
  title: "Gold She Industrial ERP",
  description: "Beyond AI Operations Control",
};

import { Providers } from "@/components/Providers";
import { TitleBar } from "@/components/shell/TitleBar";
import { WhatsAppStatusWidget } from "@/components/whatsapp/WhatsAppStatusWidget";
import { UpdateBanner } from "@/components/shell/UpdateBanner";
import { MeshStatus } from "@/components/shell/MeshStatus";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#121417] text-[#F1F5F9] selection:bg-[#60A5FA33] overflow-hidden">
        <Providers>
          <UpdateBanner />
          <TitleBar />
          <main className="flex-1 overflow-auto relative">
            {children}
          </main>
          <div className="fixed bottom-6 left-6 flex items-center gap-6 z-[100]">
            <WhatsAppStatusWidget />
          </div>
          <MeshStatus />
        </Providers>
      </body>
    </html>
  );
}
