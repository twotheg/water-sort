import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Water Sort - Color Puzzle",
  description: "Healing color sort puzzle game",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png", // 폴더 경로에 맞춰 수정
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Water Sort",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b0f17",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <head>
        {/* PWA 서비스 워커 등록 */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) { console.log('SW registration successful'); },
                  function(err) { console.log('SW registration failed: ', err); }
                );
              });
            }
          `}
        </Script>
        
        {/* 구글 애드센스 기본 스크립트 */}
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
