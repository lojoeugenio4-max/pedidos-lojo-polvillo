"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  impreso: boolean;
};

type LineaPedido = {
  id: string;
  pedido_id: string;
  codigo_articulo: string;
  nombre_articulo: string;
  cajas: number;
  unidades: number;
};

export default function PedidoDetallePage() {
  const params = useParams();
  const id = String(params.id);

  const [pedido, setPedido] =
    useState<Pedido | null>(null);

  const [cliente, setCliente] =
    useState<Cliente | null>(null);

  const [lineas, setLineas] = useState<
    LineaPedido[]
  >([]);

  const [cargando, setCargando] =
    useState(true);

  const [mensaje, setMensaje] = useState("");

  async function cargarPedido() {
    setCargando(true);
    setMensaje("");

    const {
      data: pedidoData,
      error: pedidoError,
    } = await supabase
      .from("pedidos")
      .select(
        "id, cliente_id, fecha, impreso"
      )
      .eq("id", id)
      .single();

    if (pedidoError) {
      setMensaje(JSON.stringify(pedidoError));
      setCargando(false);
      return;
    }

    setPedido(pedidoData as Pedido);

    const {
      data: clienteData,
      error: clienteError,
    } = await supabase
      .from("Clientes")
      .select(
        "id, nombre, telefono, dia_pedido, ruta"
      )
      .eq("id", pedidoData.cliente_id)
      .single();

    if (clienteError) {
      setMensaje(JSON.stringify(clienteError));
      setCargando(false);
      return;
    }

    setCliente(clienteData as Cliente);

    const {
      data: lineasData,
      error: lineasError,
    } = await supabase
      .from("lineas_pedido")
      .select(
        "id, pedido_id, codigo_articulo, nombre_articulo, cajas, unidades"
      )
      .eq("pedido_id", id)
      .order("codigo_articulo", {
        ascending: true,
      });

    if (lineasError) {
      setMensaje(JSON.stringify(lineasError));
      setCargando(false);
      return;
    }

    setLineas(
      (lineasData || []) as LineaPedido[]
    );

    setCargando(false);
  }

  async function imprimirPedido() {
    await supabase
      .from("pedidos")
      .update({
        impreso: true,
      })
      .eq("id", id);

    window.print();
  }

  useEffect(() => {
    cargarPedido();
  }, []);

  const bebidas = lineas.filter(
    (l) => l.unidades === 0
  );

  const charcuteria = lineas.filter(
    (l) => l.unidades > 0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>

          <button
            onClick={imprimirPedido}
            className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-4 py-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir pedido
          </button>
        </div>

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm print:hidden">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="bg-white rounded-2xl p-6 shadow print:shadow-none">
            Cargando pedido...
          </div>
        ) : (
          <section className="bg-white rounded-2xl p-6 shadow print:shadow-none print:rounded-none print:p-0">
            {/* BEBIDAS */}

            <section>
              <div className="mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold">
                  BEBIDAS
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm">
                  <p>
                    <strong>
                      Tienda:
                    </strong>{" "}
                    {cliente?.nombre ||
                      "Sin tienda"}
                  </p>

                  <p>
                    <strong>
                      Fecha:
                    </strong>{" "}
                    {pedido?.fecha}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 pr-2 w-24">
                      Código
                    </th>

                    <th className="text-left py-2 pr-2">
                      Nombre
                    </th>

                    <th className="text-center py-2 px-2 w-20">
                      Cajas
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {bebidas.map((linea) => (
                    <tr
                      key={linea.id}
                      className="border-b"
                    >
                      <td className="py-2 pr-2 font-semibold">
                        {
                          linea.codigo_articulo
                        }
                      </td>

                      <td className="py-2 pr-2">
                        {
                          linea.nombre_articulo
                        }
                      </td>

                      <td className="py-2 px-2 text-center">
                        {linea.cajas > 0
                          ? linea.cajas
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* CHARCUTERÍA */}

            <section className="mt-16 print:break-before-page">
              <div className="mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold">
                  CHARCUTERÍA
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm">
                  <p>
                    <strong>
                      Tienda:
                    </strong>{" "}
                    {cliente?.nombre ||
                      "Sin tienda"}
                  </p>

                  <p>
                    <strong>
                      Fecha:
                    </strong>{" "}
                    {pedido?.fecha}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 pr-2 w-24">
                      Código
                    </th>

                    <th className="text-left py-2 pr-2">
                      Nombre
                    </th>

                    <th className="text-center py-2 px-2 w-20">
                      Cajas
                    </th>

                    <th className="text-center py-2 px-2 w-24">
                      Unidades
                    </th>

                    <th className="text-left py-2 pl-2 w-40">
                      Kilos__________
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {charcuteria.map(
                    (linea) => (
                      <tr
                        key={linea.id}
                        className="border-b"
                      >
                        <td className="py-2 pr-2 font-semibold">
                          {
                            linea.codigo_articulo
                          }
                        </td>

                        <td className="py-2 pr-2">
                          {
                            linea.nombre_articulo
                          }
                        </td>

                        <td className="py-2 px-2 text-center">
                          {linea.cajas >
                          0
                            ? linea.cajas
                            : ""}
                        </td>

                        <td className="py-2 px-2 text-center">
                          {linea.unidades >
                          0
                            ? linea.unidades
                            : ""}
                        </td>

                        <td className="py-2 pl-2">
                          __________________
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
