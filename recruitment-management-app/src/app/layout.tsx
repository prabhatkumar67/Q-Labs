import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Sandbox Store",
    description: "Target app template for sandbox platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <script src="http://localhost:8000/static/bridge.js" async />
            </head>
            <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
        </html>
    );
}