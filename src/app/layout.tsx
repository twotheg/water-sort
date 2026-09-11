import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Water Sort Game",
  description: "Water Sort Puzzle Game",
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
      <body className="h-full overflow-hidden bg-[#0b0f17] select-none touch-none m-0 p-0">
        {children}
      </body>
    </html>
  );
}
