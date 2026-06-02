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

function dividirEnColumnas<T>(items: T[], columnas: number) {
  const porColumna = Math.ceil(items.length / columnas);

  return Array.from({ length: columnas }, (_, index) =>
    items.slice(index * porColumna, index * porColumna + porColumna)
  );
}

export default function ListadoArticulosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtroImpresion, setFiltroImpresion] = useState<Filtro>("activos");

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

        if (filtroImpresion === "activos") return activo;
        if (filtroImpresion === "ocultos") return !activo;

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
  }, [productos, filtroImpresion]);

  const bebidas = productosFiltrados.filter(
    (producto) => producto.departamento === "Bebidas"
  );

  const charcuteria = productosFiltrados.filter(
    (producto) => producto.departamento === "Charcutería"
  );

  function imprimir(tipo: Filtro) {
    setFiltroImpresion(tipo);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }

  function CabeceraHoja({ titulo }: { titulo: string }) {
    return (
      <>
        <div className="cabecera-escritura">
          <div className="campo-escritura">DESPACHO:</div>
          <div className="campo-escritura">FECHA:</div>
        </div>

        <div className="titulo-departamento">{titulo}</div>
      </>
    );
  }

  function TablaBebidas({ items }: { items: Producto[] }) {
    const columnas = dividirEnColumnas(items, 2);
    const maxFilas = Math.max(columnas[0]?.length || 0, columnas[1]?.length || 0);

    return (
      <table className="tabla-excel">
        <colgroup>
          <col className="col-codigo" />
          <col className="col-articulo" />
          <col className="col-cantidad" />
          <col className="col-separador" />
          <col className="col-codigo" />
          <col className="col-articulo" />
          <col className="col-cantidad" />
        </colgroup>

        <thead>
          <tr>
            <th>Cod.</th>
            <th>Artículo</th>
            <th>Cajas</th>
            <th className="separador"></th>
            <th>Cod.</th>
            <th>Artículo</th>
            <th>Cajas</th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: maxFilas }).map((_, index) => {
            const izquierda = columnas[0]?.[index];
            const derecha = columnas[1]?.[index];

            return (
              <tr key={index}>
                <td className="codigo">{izquierda?.codigo || ""}</td>
                <td className="articulo">{izquierda?.nombre || ""}</td>
                <td className="cantidad"></td>

                <td className="separador"></td>

                <td className="codigo">{derecha?.codigo || ""}</td>
                <td className="articulo">{derecha?.nombre || ""}</td>
                <td className="cantidad"></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  function TablaCharcuteria({ items }: { items: Producto[] }) {
    const columnas = dividirEnColumnas(items, 2);
    const maxFilas = Math.max(columnas[0]?.length || 0, columnas[1]?.length || 0);

    return (
      <table className="tabla-excel">
        <colgroup>
          <col className="col-codigo-char" />
          <col className="col-articulo-char" />
          <col className="col-cantidad-char" />
          <col className="col-cantidad-char" />
          <col className="col-cantidad-char" />

          <col className="col-separador" />

          <col className="col-codigo-char" />
          <col className="col-articulo-char" />
          <col className="col-cantidad-char" />
          <col className="col-cantidad-char" />
          <col className="col-cantidad-char" />
        </colgroup>

        <thead>
          <tr>
            <th>Cod.</th>
            <th>Artículo</th>
            <th>Cajas</th>
            <th>Unid.</th>
            <th>Kilos</th>

            <th className="separador"></th>

            <th>Cod.</th>
            <th>Artículo</th>
            <th>Cajas</th>
            <th>Unid.</th>
            <th>Kilos</th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: maxFilas }).map((_, index) => {
            const izquierda = columnas[0]?.[index];
            const derecha = columnas[1]?.[index];

            return (
              <tr key={index}>
                <td className="codigo">{izquierda?.codigo || ""}</td>
                <td className="articulo">{izquierda?.nombre || ""}</td>
                <td className="cantidad"></td>
                <td className="cantidad"></td>
                <td className="cantidad"></td>

                <td className="separador"></td>

                <td className="codigo">{derecha?.codigo || ""}</td>
                <td className="articulo">{derecha?.nombre || ""}</td>
                <td className="cantidad"></td>
                <td className="cantidad"></td>
                <td className="cantidad"></td>
              </tr>
            );
          })}
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
            border-radius: 16px;
            box-shadow:
              0 10px 15px -3px rgb(0 0 0 / 0.1),
              0 4px 6px -4px rgb(0 0 0 / 0.1);
            padding: 24px;
          }

          .bloque-print {
            margin-top: 24px;
          }

          .cabecera-escritura {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 8px;
          }

          .campo-escritura {
            border: 2px solid #000;
            height: 54px;
            padding: 8px 10px;
            font-size: 16px;
            font-weight: 900;
            background: white;
          }

          .titulo-departamento {
            border: 2px solid #000;
            background: #d9d9d9;
            color: #000;
            font-size: 22px;
            font-weight: 900;
            text-align: center;
            padding: 8px;
            margin-bottom: 8px;
            letter-spacing: 0.04em;
          }

          .tabla-excel {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-family: Arial, Helvetica, sans-serif;
          }

          .tabla-excel th,
          .tabla-excel td {
            border: 1px solid #000;
            height: 28px;
            padding: 3px 4px;
            vertical-align: middle;
            color: #000;
          }

          .tabla-excel th {
            background: #e5e7eb;
            font-size: 13px;
            font-weight: 900;
            text-align: center;
          }

          .codigo {
            font-size: 14px;
            font-weight: 900;
            text-align: center;
          }

          .articulo {
            font-size: 15px;
            font-weight: 900;
            text-align: left;
            white-space: normal;
            overflow-wrap: anywhere;
          }

          .cantidad {
            background: #fff;
          }

          .separador {
            border: none !important;
            background: white !important;
            width: 8px;
          }

          .col-codigo {
            width: 7%;
          }

          .col-articulo {
            width: 34%;
          }

          .col-cantidad {
            width: 7%;
          }

          .col-codigo-char {
            width: 5%;
          }

          .col-articulo-char {
            width: 27%;
          }

          .col-cantidad-char {
            width: 5%;
          }

          .col-separador {
            width: 2%;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 7mm;
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

          .bloque-print {
            margin: 0;
            break-after: page;
            page-break-after: always;
          }

          .bloque-print:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .cabecera-escritura {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5mm;
            margin-bottom: 3mm;
          }

          .campo-escritura {
            border: 1.5px solid #000;
            height: 13mm;
            padding: 2mm;
            font-size: 11px;
            font-weight: 900;
            background: white;
            box-sizing: border-box;
          }

          .titulo-departamento {
            border: 1.5px solid #000;
            background: #d9d9d9;
            color: #000;
            font-size: 14px;
            font-weight: 900;
            text-align: center;
            padding: 2mm;
            margin-bottom: 2mm;
            letter-spacing: 0.04em;
          }

          .tabla-excel {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-family: Arial, Helvetica, sans-serif;
          }

          .tabla-excel th,
          .tabla-excel td {
            border: 1px solid #000;
            height: 5.2mm;
            padding: 0.8mm 1mm;
            vertical-align: middle;
            color: #000;
            line-height: 1.05;
          }

          .tabla-excel th {
            background: #e5e7eb;
            font-size: 8.5px;
            font-weight: 900;
            text-align: center;
          }

          .codigo {
            font-size: 9.5px;
            font-weight: 900;
            text-align: center;
          }

          .articulo {
            font-size: 10.5px;
            font-weight: 900;
            text-align: left;
            white-space: normal;
            overflow-wrap: anywhere;
          }

          .cantidad {
            background: #fff;
          }

          .separador {
            border: none !important;
            background: white !important;
          }

          .col-codigo {
            width: 7%;
          }

          .col-articulo {
            width: 34%;
          }

          .col-cantidad {
            width: 7%;
          }

          .col-codigo-char {
            width: 5%;
          }

          .col-articulo-char {
            width: 27%;
          }

          .col-cantidad-char {
            width: 5%;
          }

          .col-separador {
            width: 2%;
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
              Plantilla tipo Excel para tomar pedidos telefónicos.
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
          </div>
        </header>

        <section className="no-print grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => imprimir("activos")}
            className="rounded-2xl p-5 shadow text-left border bg-black text-white hover:scale-[1.01] transition"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <p className="font-bold">Imprimir activos</p>
            </div>

            <p className="text-4xl font-black mt-3">
              {productos.filter((p) => p.activo ?? true).length}
            </p>
          </button>

          <button
            onClick={() => imprimir("ocultos")}
            className="rounded-2xl p-5 shadow text-left border bg-white text-slate-700 hover:scale-[1.01] transition"
          >
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5" />
              <p className="font-bold">Imprimir ocultos</p>
            </div>

            <p className="text-4xl font-black mt-3">
              {productos.filter((p) => !(p.activo ?? true)).length}
            </p>
          </button>

          <button
            onClick={() => imprimir("ambos")}
            className="rounded-2xl p-5 shadow text-left border bg-white text-slate-700 hover:scale-[1.01] transition"
          >
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              <p className="font-bold">Imprimir ambos</p>
            </div>

            <p className="text-4xl font-black mt-3">{productos.length}</p>
          </button>
        </section>

        {mensaje && (
          <div className="no-print bg-white border rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        <section className="hoja-listado">
          {cargando ? (
            <div className="p-6 text-center text-slate-500">
              Cargando artículos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No hay artículos para este filtro.
            </div>
          ) : (
            <>
              {bebidas.length > 0 && (
                <section className="bloque-print">
                  <CabeceraHoja titulo="BEBIDAS" />
                  <TablaBebidas items={bebidas} />
                </section>
              )}

              {charcuteria.length > 0 && (
                <section className="bloque-print">
                  <CabeceraHoja titulo="CHARCUTERÍA" />
                  <TablaCharcuteria items={charcuteria} />
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
