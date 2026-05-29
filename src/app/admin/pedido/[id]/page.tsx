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
  departamento: string | null;
  cajas: number;
  unidades: number;
};

export default function PedidoDetallePage() {
  const params = useParams();
  const id = String(params.id);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  async function cargarPedido() {
    setCargando(true);
    setMensaje("");

    const { data: pedidoData, error: pedidoError } = await supabase
      .from("pedidos")
      .select("id, cliente_id, fecha, impreso")
      .eq("id", id)
      .single();

    if (pedidoError) {
      setMensaje(JSON.stringify(pedidoError));
      setCargando(false);
      return;
    }

    setPedido(pedidoData as Pedido);

    const { data: clienteData, error: clienteError } = await supabase
      .from("Clientes")
      .select("id, nombre, telefono, dia_pedido, ruta")
      .eq("id", pedidoData.cliente_id)
      .single();

    if (clienteError) {
      setMensaje(JSON.stringify(clienteError));
      setCargando(false);
      return;
    }

    setCliente(clienteData as Cliente);

    const { data: lineasData, error: lineasError } = await supabase
      .from("lineas_pedido")
      .select(
        "id, pedido_id, codigo_articulo, nombre_articulo, departamento, cajas, unidades"
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

    setLineas((lineasData || []) as LineaPedido[]);
    setCargando(false);
  }

  async function imprimirPedido() {
    await supabase
      .from("pedidos")
      .update({
        impreso: true,
      })
      .eq("id", id);

    document.title = cliente?.nombre
      ? `Pedido ${cliente.nombre}`
      : "Pedido";

    window.print();
  }

  useEffect(() => {
    cargarPedido();
  }, []);

  useEffect(() => {
    if (!cliente || !pedido) return;

    const fecha = pedido.fecha
      ? new Date(pedido.fecha).toLocaleDateString("es-ES")
      : "";

    document.title = `Pedido ${cliente.nombre}${fecha ? ` · ${fecha}` : ""}`;

    return () => {
      document.title = "Lojo · Pedido Online";
    };
  }, [cliente, pedido]);

  const bebidas = lineas.filter((l) => l.departamento === "Bebidas");

  const charcuteria = lineas.filter(
    (l) => l.departamento === "Charcutería"
  );

  const fechaEspana = pedido?.fecha
    ? new Date(pedido.fecha).toLocaleDateString("es-ES")
    : "";

  function CabeceraSeccion({ titulo }: { titulo: string }) {
    return (
      <div className="cabecera-impresion">
        <div className="titulo-linea">
          <h1>
            {titulo} <span>{cliente?.nombre || "Sin tienda"}</span>
          </h1>

          <p>Fecha: {fechaEspana}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
          }

          .no-print {
            display: none !important;
          }

          .hoja-impresion {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            background: white !important;
          }

          .seccion-impresion {
            page-break-inside: avoid;
          }

          .salto-pagina {
            break-before: page;
            page-break-before: always;
            padding-top: 0;
          }

          .cabecera-impresion {
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 10px;
          }

          .titulo-linea {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 16px;
          }

          .titulo-linea h1 {
            font-size: 28px;
            line-height: 1;
            font-weight: 800;
            margin: 0;
            padding: 0;
            color: #000;
          }

          .titulo-linea h1 span {
            font-size: 28px;
            font-weight: 800;
            color: #000;
          }

          .titulo-linea p {
            font-size: 13px;
            font-weight: 700;
            margin: 0;
            white-space: nowrap;
            color: #000;
          }

          table {
            border-collapse: collapse;
          }

          th {
            font-size: 13px;
            font-weight: 800;
            color: #000;
            border-bottom: 2px solid #000;
            padding: 5px 6px;
          }

          td {
            font-size: 13px;
            color: #000;
            border-bottom: 1px solid #bbb;
            padding: 5px 6px;
            vertical-align: top;
          }

          .tabla-bebidas {
            width: auto !important;
            table-layout: fixed;
          }

          .tabla-bebidas .col-codigo {
            width: 75px;
          }

          .tabla-bebidas .col-nombre {
            width: 330px;
          }

          .tabla-bebidas .col-cajas {
            width: 55px;
            text-align: center;
          }

          .tabla-charcuteria {
            width: 100% !important;
            table-layout: fixed;
          }

          .tabla-charcuteria .col-codigo {
            width: 75px;
          }

          .tabla-charcuteria .col-nombre {
            width: auto;
          }

          .tabla-charcuteria .col-cajas {
            width: 55px;
            text-align: center;
          }

          .tabla-charcuteria .col-unidades {
            width: 70px;
            text-align: center;
          }

          .tabla-charcuteria .col-kilos {
            width: 100px;
          }

          .numero {
            font-weight: 800;
            text-align: center;
          }

          .codigo {
            font-weight: 800;
          }
        }

        @media screen {
          .hoja-impresion {
            background: white;
            border-radius: 1rem;
            padding: 1.5rem;
            box-shadow:
              0 10px 15px -3px rgb(0 0 0 / 0.1),
              0 4px 6px -4px rgb(0 0 0 / 0.1);
          }

          .cabecera-impresion {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 1rem;
            margin-bottom: 1.5rem;
          }

          .titulo-linea {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .titulo-linea h1 {
            font-size: 1.875rem;
            line-height: 2.25rem;
            font-weight: 800;
            margin: 0;
          }

          .titulo-linea h1 span {
            font-size: 1.875rem;
            font-weight: 800;
          }

          .titulo-linea p {
            font-size: 0.875rem;
            font-weight: 700;
            margin: 0;
          }

          .tabla-bebidas,
          .tabla-charcuteria {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
          }

          th,
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 0.5rem;
          }

          .numero {
            font-weight: 800;
            text-align: center;
          }

          .codigo {
            font-weight: 800;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:space-y-0">
        <div className="no-print flex justify-between items-center">
          <Link
            href="/admin/pedidos"
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
          <div className="no-print bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="bg-white rounded-2xl p-6 shadow print:shadow-none">
            Cargando pedido...
          </div>
        ) : (
          <section className="hoja-impresion">
            <section className="seccion-impresion">
              <CabeceraSeccion titulo="BEBIDAS" />

              <table className="tabla-bebidas">
                <thead>
                  <tr>
                    <th className="col-codigo text-left">Código</th>
                    <th className="col-nombre text-left">Nombre</th>
                    <th className="col-cajas">Cajas</th>
                  </tr>
                </thead>

                <tbody>
                  {bebidas.map((linea) => (
                    <tr key={linea.id}>
                      <td className="col-codigo codigo">
                        {linea.codigo_articulo}
                      </td>

                      <td className="col-nombre">{linea.nombre_articulo}</td>

                      <td className="col-cajas numero">
                        {linea.cajas > 0 ? linea.cajas : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {bebidas.length === 0 && (
                <p className="text-sm text-slate-500 mt-4">
                  No hay bebidas en este pedido.
                </p>
              )}
            </section>

            <section className="seccion-impresion salto-pagina mt-16 print:mt-0 print:pt-0">
              <CabeceraSeccion titulo="CHARCUTERÍA" />

              <table className="tabla-charcuteria">
                <thead>
                  <tr>
                    <th className="col-codigo text-left">Código</th>
                    <th className="col-nombre text-left">Nombre</th>
                    <th className="col-cajas">Cajas</th>
                    <th className="col-unidades">Unidades</th>
                    <th className="col-kilos text-left">Kilos</th>
                  </tr>
                </thead>

                <tbody>
                  {charcuteria.map((linea) => (
                    <tr key={linea.id}>
                      <td className="col-codigo codigo">
                        {linea.codigo_articulo}
                      </td>

                      <td className="col-nombre">{linea.nombre_articulo}</td>

                      <td className="col-cajas numero">
                        {linea.cajas > 0 ? linea.cajas : ""}
                      </td>

                      <td className="col-unidades numero">
                        {linea.unidades > 0 ? linea.unidades : ""}
                      </td>

                      <td className="col-kilos"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {charcuteria.length === 0 && (
                <p className="text-sm text-slate-500 mt-4">
                  No hay charcutería en este pedido.
                </p>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
