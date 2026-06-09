"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Linea = {
  nombre_articulo: string;
  codigo_articulo: string;
  cajas: number;
  unidades: number;
};

type Pedido = {
  id: number;
  fecha: string;
  estado: string;
  lineas_pedido: Linea[];
};

export default function HistoricoPedidosPage() {
  const [tienda, setTienda] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mensaje, setMensaje] = useState("");

  async function buscarHistorico() {
    setMensaje("");
    setPedidos([]);

    const { data: clientes, error: errorCliente } = await supabase
      .from("Clientes")
      .select("id, nombre")
      .ilike("nombre", tienda.trim())
      .limit(1);

    if (errorCliente || !clientes?.length) {
      setMensaje("No se encontró la tienda.");
      return;
    }

    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        estado,
        lineas_pedido (
          nombre_articulo,
          codigo_articulo,
          cajas,
          unidades
        )
      `)
      .eq("cliente_id", clientes[0].id)
      .order("fecha", { ascending: false })
      .limit(2);

    if (error) {
      setMensaje(error.message);
      return;
    }

    setPedidos(data as Pedido[]);
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Histórico de pedidos</h1>

      <div className="flex gap-2 mb-6">
        <input
          value={tienda}
          onChange={(e) => setTienda(e.target.value)}
          placeholder="Nombre de la tienda"
          className="border rounded-xl px-4 py-3 flex-1"
        />
        <button
          onClick={buscarHistorico}
          className="bg-black text-white rounded-xl px-5 py-3"
        >
          Buscar
        </button>
      </div>

      {mensaje && <p className="mb-4">{mensaje}</p>}

      {pedidos.map((pedido) => (
        <section key={pedido.id} className="border rounded-xl p-4 mb-4">
          <h2 className="font-bold">
            Pedido #{pedido.id} · {pedido.fecha} · {pedido.estado}
          </h2>

          <ul className="mt-3 space-y-2">
            {pedido.lineas_pedido.map((linea, index) => (
              <li key={index}>
                {linea.nombre_articulo} ({linea.codigo_articulo}) —{" "}
                {linea.cajas > 0
                  ? `${linea.cajas} cajas`
                  : `${linea.unidades} unidades`}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
