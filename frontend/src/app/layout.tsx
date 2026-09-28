import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pxy888 Studio",
  description: "Upload a design to instantly simulate thread paths, calculate costs, and preview production.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
