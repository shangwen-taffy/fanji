import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "番迹 · 把热爱留在时间里",
  description: "记录想看、在看和看完的每一部动画。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
