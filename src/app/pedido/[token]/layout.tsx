import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = "https://app-pedidos-clientes-2.vercel.app";

type ClienteMetadata = {
  nombre: string;
};

async function obtenerClientePorToken(
  token: string
): Promise<ClienteMetadata | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return null;
  }

  const url =
    `${supabaseUrl}/rest/v1/Clientes` +
    `?token_pedido=eq.${encodeURIComponent(token)}` +
    `&select=nombre` +
    `&limit=1`;

  try {
    const respuesta = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!respuesta.ok) {
      return null;
    }

    const data = (await respuesta.json()) as ClienteMetadata[];

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const cliente = await obtenerClientePorToken(token);

  const title = cliente?.nombre || "Lojo · Pedido Online";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: "Lojo · Pedido Online",
    openGraph: {
      title,
      description: "Lojo · Pedido Online",
      url: `${SITE_URL}/pedido/${token}`,
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
      description: "Lojo · Pedido Online",
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
