import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StreamHub",
  description: "A video streaming platform",
  icons: {
    icon: "/streamHub2.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    title: "StreamHub - Live Streaming Platform",
    description: "Stream, watch, and connect with creators in real-time",
    url: "https://streamhub.com",
    siteName: "StreamHub",
    images: [
      {
        url: "/streamHubLogo.svg",
        width: 1200,
        height: 630,
        alt: "StreamHub - Live Streaming Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamHub - Live Streaming Platform",
    description: "Stream, watch, and connect with creators in real-time",
    images: ["/streamHubLogo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
