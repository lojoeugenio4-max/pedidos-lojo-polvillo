export const metadata = {
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
