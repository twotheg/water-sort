import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css"; // ★ 이 줄이 빠지면 방금 전처럼 화면이 하얗게 깨집니다!

export const metadata: Metadata = {
  title: "Water Sort Game",
  description: "Water Sort Puzzle Game",
  manifest: "/manifest.json", 
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4424569297437395"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="h-full overflow-hidden bg-[#0b0f17] select-none touch-none m-0 p-0">
        {children}
      </body>
    </html>
  );
}
