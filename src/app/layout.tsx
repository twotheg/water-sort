import type { Metadata, Viewport } from "next";
import "./globals.css";

// Next.js 14 버전에 맞춘 뷰포트 분리 설정
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Water Sort Game",
  description: "Water Sort Puzzle Game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <head>
        {/* 1. PWA 빌더가 절대 놓칠 수 없도록 명세서 강제 연결 */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0f17" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* 2. 구글 애드센스 기본 스크립트 강제 연결 */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4424569297437395" 
          crossOrigin="anonymous"
        ></script>

        {/* 3. PWA 빌더 에러 해결을 위한 서비스 워커(sw.js) 강제 등록 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className="h-full overflow-hidden bg-[#0b0f17] select-none touch-none m-0 p-0">
        {children}
      </body>
    </html>
  );
}
