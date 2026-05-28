import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lojo · Pedido Online",
  description: "Realiza tu pedido de forma rápida y sencilla",
  openGraph: {
    title: "Lojo · Pedido Online",
    description: "Realiza tu pedido de forma rápida y sencilla",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
