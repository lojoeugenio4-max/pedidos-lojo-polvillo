"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
};

type Linea = {
  nombre_articulo: string;
  codigo_articulo: string;
  cajas: number;
  unidades: number;
};

type Pedido = {
  id: string;
  fecha: string;
  estado: string | null;
  cliente_id: number;
  Clientes?: {
    nombre: string;
  }[] | null;
  lineas_pedido: Linea[];
};

export default function HistoricoPedidosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cargarClientes() {
    const { data, error } = await supabase
      .from("Clientes")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje(error.message);
      return;
    }

    setClientes((data || []) as Cliente[]);
  }

  async function buscarHistorico() {
    setMensaje("");
    setPedidos([]);
    setCargando(true);

    let consulta = supabase
      .from("pedidos")
      .select(`
        id,
        fecha,
        estado,
        cliente_id,
        Clientes (
          nombre
        ),
        lineas_pedido (
          nombre_articulo,
          codigo_articulo,
          cajas,
          unidades
        )
      `)
      .neq("estado", "sustituido")
      .order("fecha", { ascending: false });

    if (clienteId) {
      consulta = consulta.eq("cliente_id", Number(clienteId));
    }

    if (fechaDesde) {
      consulta = consulta.gte("fecha", fechaDesde);
    }

    if (fechaHasta) {
      consulta = consulta.lte("fecha", fechaHasta);
    }

    const { data, error } = await consulta;

    setCargando(false);

    if (error) {
      setMensaje(error.message);
      return;
    }

    if (!data?.length) {
      setMensaje("No hay pedidos con esos filtros.");
      return;
    }

    setPedidos((data || []) as unknown as Pedido[]);
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">
              Histórico de pedidos
            </h1>

            <p className="text-slate-600 mt-1">
              Consulta pedidos por cliente y rango de fechas
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold shadow hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
        </header>

        <section className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">
                Cliente
              </label>

              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                <option value="">Todos los clientes</option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Desde
              </label>

              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Hasta
              </label>

              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={buscarHistorico}
                disabled={cargando}
                className="w-full bg-black text-white rounded-xl px-5 py-3 font-bold flex items-center justify-center gap-2 disabled:bg-slate-400"
              >
                <Search className="w-4 h-4" />
                {cargando ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setClienteId("");
              setFechaDesde("");
              setFechaHasta("");
              setPedidos([]);
              setMensaje("");
            }}
            className="text-sm font-bold underline text-slate-600"
          >
            Limpiar filtros
          </button>
        </section>

        {mensaje && (
          <p className="bg-white rounded-xl shadow p-4 text-slate-700">
            {mensaje}
          </p>
        )}

        <section className="space-y-4">
          {pedidos.map((pedido) => (
            <article
              key={pedido.id}
              className="bg-white border rounded-2xl shadow p-4 md:p-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div>
                  <h2 className="font-bold text-xl text-black">
                    {pedido.Clientes?.[0]?.nombre || "Cliente sin nombre"}
                  </h2>

                  <p className="text-sm text-slate-500">
                    Pedido #{pedido.id} · {pedido.fecha} ·{" "}
                    {pedido.estado || "recibido"}
                  </p>
                </div>
              </div>

              {pedido.lineas_pedido.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Este pedido no tiene líneas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {pedido.lineas_pedido.map((linea, index) => (
                    <li
                      key={`${pedido.id}-${linea.codigo_articulo}-${index}`}
                      className="flex justify-between gap-3 border-b last:border-b-0 pb-2"
                    >
                      <div>
                        <p className="font-semibold text-black">
                          {linea.nombre_articulo}
                        </p>

                        <p className="text-xs text-slate-500">
                          Código {linea.codigo_articulo}
                        </p>
                      </div>

                      <p className="font-bold whitespace-nowrap text-black">
                        {linea.cajas > 0
                          ? `${linea.cajas} caja${linea.cajas === 1 ? "" : "s"}`
                          : `${linea.unidades} unidad${
                              linea.unidades === 1 ? "" : "es"
                            }`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
