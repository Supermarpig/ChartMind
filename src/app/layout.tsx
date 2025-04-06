import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from 'next/script';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "圖表數據提取工具",
  description: "上傳圖表圖片，自動識別並提取數據，轉換為 Excel 格式",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <Script 
          src="https://docs.opencv.org/4.10.0/opencv.js"
          strategy="beforeInteractive"
          id="opencv-script"
        />
        {children}
      </body>
    </html>
  );
}
