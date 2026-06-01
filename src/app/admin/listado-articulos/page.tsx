"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  departamento: string;
  categoria: string | null;
  unidad: string | null;
  orden_preparacion: number | null;
  activo: boolean | null;
};

type Filtro = "activos" | "ocultos" | "ambos";

function dividirEnDosColumnas<T>(items: T[]) {
  const mitad = Math.ceil(items.length / 2);

  return {
    izquierda: items.slice(0, mitad),
    derecha: items.slice(mitad),
  };
}

export default function ListadoArticulosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("activos");

  async function cargarProductos() {
    setCargando(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("productos")
      .select(
        "id, codigo, nombre, departamento, categoria, unidad, orden_preparacion, activo"
      )
      .order("departamento", { ascending: true })
      .order("categoria", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje(JSON.stringify(error));
      setCargando(false);
      return;
    }

    setProductos((data || []) as Producto[]);
    setCargando(false);
  }

  useEffect(() => {
    cargarProductos();
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos
      .filter((producto) => {
        const activo = producto.activo ?? true;

        if (filtro === "activos") return activo;
        if (filtro === "ocultos") return !activo;

        return true;
      })
      .sort((a, b) => {
        const depA = a.departamento || "";
        const depB = b.departamento || "";

        if (depA !== depB) return depA.localeCompare(depB, "es");

        const catA = a.categoria || "";
        const catB = b.categoria || "";

        if (catA !== catB) return catA.localeCompare(catB, "es");

        return a.nombre.localeCompare(b.nombre, "es", {
          sensitivity: "base",
          numeric: true,
        });
      });
  }, [productos, filtro]);

  const { izquierda, derecha } = dividirEnDosColumnas(productosFiltrados);

  const tituloFiltro =
    filtro === "activos"
      ? "Artículos activos"
      : filtro === "ocultos"
        ? "Artículos ocultos"
        : "Artículos activos y ocultos";

  function imprimir() {
    window.print();
  }

  function TablaListado({ items }: { items: Producto[] }) {
    return (
      <table className="tabla-listado">
        <thead>
          <tr>
            <th className="col-articulo">Artículo</th>
            <th className="col-numero">Cajas</th>
            <th className="col-numero">Unid.</th>
            <th className="col-numero">Kilos</th>
          </tr>
        </thead>

        <tbody>
          {items.map((producto) => (
            <tr key={producto.id}>
              <td className="col-articulo">
                <div className="articulo-linea">
                  <strong>{producto.codigo}</strong>
                  <span>{producto.nombre}</span>
                </div>

                <div className="articulo-meta">
                  {producto.departamento}
                  {producto.categoria ? ` · ${producto.categoria}` : ""}
                  {producto.activo === false ? " · OCULTO" : ""}
                </div>
              </td>

              <td className="col-numero"></td>
              <td className="col-numero"></td>
              <td className="col-numero"></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white print:p-0">
      <style jsx global>{`
        @media screen {
          .hoja-listado {
            background: white;
            border-radius: 1rem;
            box-shadow:
              0 10px 15px -3px rgb(0 0 0 / 0.1),
              0 4px 6px -4px rgb(0 0 0 / 0.1);
            padding: 1.5rem;
          }

          .tabla-listado {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8rem;
          }

          .tabla-listado th,
          .tabla-listado td {
            border: 1px solid #111827;
            padding: 0.35rem;
            vertical-align: top;
          }

          .tabla-listado th {
            background: #f1f5f9;
            font-weight: 800;
          }

          .col-articulo {
            width: auto;
          }

          .col-numero {
            width: 52px;
            text-align: center;
          }

          .articulo-linea {
            display: flex;
            gap: 0.35rem;
            line-height: 1.1;
          }

          .articulo-meta {
            font-size: 0.68rem;
            color: #64748b;
            margin-top: 0.15rem;
          }

          .columnas-listado {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .contenedor-print {
            max-width: none !important;
            margin: 0 !important;
          }

          .hoja-listado {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .cabecera-print {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }

          .cabecera-print h1 {
            font-size: 18px;
            line-height: 1;
            margin: 0;
            font-weight: 900;
          }

          .cabecera-print p {
            font-size: 10px;
            margin: 0;
            font-weight: 700;
          }

          .columnas-listado {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5mm;
            align-items: start;
          }

          .tabla-listado {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 8.5px;
          }

          .tabla-listado th,
          .tabla-listado td {
            border: 1px solid #000;
            padding: 2.5px 3px;
            vertical-align: top;
          }

          .tabla-listado th {
            background: #e5e7eb;
            color: #000;
            font-weight: 900;
            text-align: center;
          }

          .col-articulo {
            width: auto;
          }

          .col-numero {
            width: 13mm;
            height: 7mm;
            text-align: center;
          }

          .articulo-linea {
            display: flex;
            gap: 3px;
            line-height: 1.05;
            color: #000;
          }

          .articulo-linea strong {
            font-weight: 900;
            white-space: nowrap;
          }

          .articulo-meta {
            font-size: 7px;
            line-height: 1.05;
            color: #000;
            margin-top: 1px;
          }
        }
      `}</style>

      <div className="contenedor-print max-w-7xl mx-auto space-y-6">
        <header className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Listado de artículos
            </h1>

            <p className="text-slate-600 mt-2">
              Plantilla imprimible para pedidos telefónicos.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              href="/admin"
              className="rounded-xl border bg-white px-4 py-3 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>

            <button
              onClick={cargarProductos}
              className="rounded-xl border bg-white px-4 py-3 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>

            <button
              onClick={imprimir}
              className="rounded-xl bg-black text-white px-4 py-3 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir plantilla
            </button>
          </div>
        </header>

        <section className="no-print grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setFiltro("activos")}
            className={`rounded-2xl p-4 shadow text-left border ${
              filtro === "activos"
                ? "bg-black text-white"
                : "bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <p className="font-bold">Activos</p>
            </div>

            <p className="text-3xl font-black mt-2">
              {productos.filter((p) => p.activo ?? true).length}
            </p>
          </button>

          <button
            onClick={() => setFiltro("ocultos")}
            className={`rounded-2xl p-4 shadow text-left border ${
              filtro === "ocultos"
                ? "bg-black text-white"
                : "bg-white text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5" />
              <p className="font-bold">Ocultos</p>
            </div>

            <p className="text-3xl font-black mt-2">
              {productos.filter((p) => !(p.activo ?? true)).length}
            </p>
          </button>

          <button
            onClick={() => setFiltro("ambos")}
            className={`rounded-2xl p-4 shadow text-left border ${
              filtro === "ambos"
                ? "bg-black text-white"
                : "bg-white text-slate-700"
            }`}
          >
            <p className="font-bold">Ambos</p>

            <p className="text-3xl font-black mt-2">{productos.length}</p>
          </button>
        </section>

        {mensaje && (
          <div className="no-print bg-white border rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        <section className="hoja-listado">
          <div className="cabecera-print">
            <h1>{tituloFiltro}</h1>

            <p>
              Total: {productosFiltrados.length} · Cajas / Unidades / Kilos
            </p>
          </div>

          {cargando ? (
            <div className="p-6 text-center text-slate-500">
              Cargando artículos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No hay artículos para este filtro.
            </div>
          ) : (
            <div className="columnas-listado">
              <TablaListado items={izquierda} />
              <TablaListado items={derecha} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
