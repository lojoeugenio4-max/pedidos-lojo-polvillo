import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://app-pedidos-clientes-2.vercel.app"),
  title: "Lojo · Pedido Online",
  description: "Realiza tu pedido de forma rápida y sencilla",
  openGraph: {
    title: "Lojo · Pedido Online",
    description: "Realiza tu pedido de forma rápida y sencilla",
    siteName: "Lojo · Pedido Online",
    images: [
      {
        url: "https://app-pedidos-clientes-2.vercel.app/og-image.png",
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
    images: ["https://app-pedidos-clientes-2.vercel.app/og-image.png"],
  },
};

export default function PedidoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
