import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app-pedidos-clientes-2.vercel.app"),
  title: "Lojo · Pedido Online",
  description: "Realiza tu pedido de forma rápida y sencilla",
  manifest: "/manifest.json",
  openGraph: {
    title: "Lojo · Pedido Online",
    description: "Realiza tu pedido de forma rápida y sencilla",
    siteName: "Lojo · Pedido Online",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lojo · Pedido Online",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lojo · Pedido Online",
    description: "Realiza tu pedido de forma rápida y sencilla",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Pedidos Lojo",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1f78",
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
