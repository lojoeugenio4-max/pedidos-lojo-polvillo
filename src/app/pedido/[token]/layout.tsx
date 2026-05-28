import type { Metadata } from "next";

const SITE_URL = "https://app-pedidos-clientes-2.vercel.app";

type ClienteMetadata = {
  nombre: string;
};

async function obtenerClientePorToken(token: string): Promise<ClienteMetadata | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return null;
  }

  const url = `${supabaseUrl}/rest/v1/Clientes?token_pedido=eq.${encodeURIComponent(
    token
  )}&select=nombre&limit=1`;

  try {
    const respuesta = await fetch(url, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      next: {
        revalidate: 60,
      },
    });

    if (!respuesta.ok) {
      return null;
    }

    const data = (await respuesta.json()) as ClienteMetadata[];

    return data[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}): Promise<Metadata> {
  const resolvedParams = await params;
  const cliente = await obtenerClientePorToken(resolvedParams.token);

  const title = cliente?.nombre
    ? `Pedido de ${cliente.nombre}`
    : "Lojo · Pedido Online";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: "Realiza tu pedido de forma rápida y sencilla",
    openGraph: {
      title,
      description: "Realiza tu pedido de forma rápida y sencilla",
      siteName: "Lojo · Pedido Online",
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Realiza tu pedido de forma rápida y sencilla",
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

export default function PedidoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
