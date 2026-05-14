"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Printer, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
  dia_pedido: string | null;
  ruta: string | null;
};

type Pedido = {
  id: string;
  cliente_id: number;
  fecha: string;
  estado: string;
  impreso: boolean;
  creado_en: string;
  Clientes?: Cliente | null;
};

export default function AdminPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  async function cargarPedidos() {
    setCargando(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        cliente_id,
        fecha,
        estado,
        impreso,
        creado_en,
        Clientes (
          id,
          nombre,
          telefono,
          dia_pedido,
          ruta
        )
      `)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error(error);
      setMensaje(JSON.stringify(error));
      setCargando(false);
      return;
    }

    setPedidos((data || []) as Pedido[]);
    setCargando(false);
  }

  async function marcarImpreso(id: string) {
    const { error } = await supabase
      .from("pedidos")
      .update({ impreso: true, estado: "impreso" })
      .eq("id", id);

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    await cargarPedidos();
  }

  function imprimirPedido(pedido: Pedido) {
    window.print();
    marcarImpreso(pedido.id);
  }

  useEffect(() => {
    cargarPedidos();
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);

  const pedidosHoy = pedidos.filter((p) => p.fecha === hoy);
  const recibidos = pedidosHoy.filter((p) => !p.impreso);
  const impresos = pedidosHoy.filter((p) => p.impreso);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Panel interno · Pedidos
            </h1>
            <p className="text-slate-600 mt-2">
              Control de pedidos recibidos e impresos
            </p>
          </div>

          <button
            onClick={cargarPedidos}
            className="bg-black text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Pedidos hoy</p>
            <p className="text-3xl font-bold">{pedidosHoy.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Pendientes de imprimir</p>
            <p className="text-3xl font-bold">{recibidos.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Impresos</p>
            <p className="text-3xl font-bold">{impresos.length}</p>
          </div>
        </section>

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">Pedidos recibidos</h2>
            {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Tienda</th>
                  <th className="text-left p-3">Teléfono</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Impreso</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && pedidos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      Todavía no hay pedidos
                    </td>
                  </tr>
                )}

                {pedidos.map((pedido) => (
                  <tr key={pedido.id} className="border-t">
                    <td className="p-3">{pedido.fecha}</td>
                    <td className="p-3 font-semibold">
                      {pedido.Clientes?.nombre || "Sin tienda"}
                    </td>
                    <td className="p-3">
                      {pedido.Clientes?.telefono || "-"}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {pedido.impreso ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="p-3">
                      {pedido.impreso ? "Sí" : "No"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => imprimirPedido(pedido)}
                          className="rounded-lg border px-3 py-2 flex items-center gap-1"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimir
                        </button>

                        {!pedido.impreso && (
                          <button
                            onClick={() => marcarImpreso(pedido.id)}
                            className="rounded-lg bg-black text-white px-3 py-2"
                          >
                            Marcar impreso
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
