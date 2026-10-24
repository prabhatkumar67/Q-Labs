import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ConfirmProvider } from "@/components/ui/confirm-modal";
import { Sidebar } from "@/components/ui/sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Q Labs",
  description: "Say what your app should do. Q Labs writes the browser test, runs it and shows what broke.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ConfirmProvider>
          <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
            <Sidebar />
            <main id="main-content" className="min-w-0 flex-1 overflow-y-auto">
              <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {children}
              </div>
            </main>
          </div>
        </ConfirmProvider>
      </body>
    </html>
  );
}
