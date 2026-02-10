import "./globals.css";
import LayoutClient from "@/components/LayoutClient";

export const metadata = {
  title: "FanLink",
  description: "아티스트와 팬을 잇는 공간",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className="font-sans">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0b0814] text-white antialiased">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
