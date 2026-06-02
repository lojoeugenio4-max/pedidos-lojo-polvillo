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

function partirEnColumnas<T>(items: T[], columnas: number) {
  const porColumna = Math.ceil(items.length / columnas);

  return Array.from({ length: columnas }, (_, index) =>
    items.slice(index * porColumna, index * porColumna + porColumna)
  );
}

function tituloFiltro(tipo: Filtro) {
  if (tipo === "activos") return "Activos";
  if (tipo === "ocultos") return "Ocultos";
  return "Activos y ocultos";
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

  function CabeceraHoja({
    departamento,
    total,
  }: {
    departamento: string;
    total: number;
  }) {
    return (
      <div className="cabecera-hoja">
        <div className="campo-cabecera">
          <span>DESPACHO</span>
        </div>

        <div className="titulo-hoja">
          <h1>{departamento}</h1>
          <p>
            {tituloFiltro(filtroImpresion)} · {total} artículos
          </p>
        </div>

        <div className="campo-cabecera">
          <span>FECHA</span>
        </div>
      </div>
    );
  }

  function TablaBebidas({ items }: { items: Producto[] }) {
    const columnas = partirEnColumnas(items, 2);
    const maxFilas = Math.max(...columnas.map((col) => col.length), 0);

    return (
      <table className="tabla-excel tabla-bebidas">
        <thead>
          <tr className="fila-cabecera-principal">
            <th colSpan={3}>BEBIDAS</th>
            <th colSpan={3}>BEBIDAS</th>
          </tr>

          <tr>
            {[0, 1].map((col) => (
              <React.Fragment key={col}>
                <th className="cod">Cod.</th>
                <th className="articulo">Artículo</th>
                <th className="cantidad">Cajas</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: maxFilas }).map((_, fila) => (
            <tr key={fila}>
              {[0, 1].map((col) => {
                const producto = columnas[col]?.[fila];

                return (
                  <React.Fragment key={col}>
                    <td className="cod dato">{producto?.codigo || ""}</td>
                    <td className="articulo dato">{producto?.nombre || ""}</td>
                    <td className="cantidad"></td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function TablaCharcuteria({ items }: { items: Producto[] }) {
    const columnas = partirEnColumnas(items, 2);
    const maxFilas = Math.max(...columnas.map((col) => col.length), 0);

    return (
      <table className="tabla-excel tabla-charcuteria">
        <thead>
          <tr className="fila-cabecera-principal">
            <th colSpan={5}>CHARCUTERÍA</th>
            <th colSpan={5}>CHARCUTERÍA</th>
          </tr>

          <tr>
            {[0, 1].map((col) => (
              <React.Fragment key={col}>
                <th className="cod">Cod.</th>
                <th className="articulo">Artículo</th>
                <th className="cantidad">Cajas</th>
                <th className="cantidad">Unid.</th>
                <th className="cantidad">Kilos</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: maxFilas }).map((_, fila) => (
            <tr key={fila}>
              {[0, 1].map((col) => {
                const producto = columnas[col]?.[fila];

                return (
                  <React.Fragment key={col}>
                    <td className="cod dato">{producto?.codigo || ""}</td>
                    <td className="articulo dato">{producto?.nombre || ""}</td>
                    <td className="cantidad"></td>
                    <td className="cantidad"></td>
                    <td className="cantidad"></td>
                  </React.Fragment>
                );
              })}
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

          .bloque-print {
            margin-top: 1.5rem;
          }

          .cabecera-hoja {
            display: grid;
            grid-template-columns: 1fr 1.4fr 1fr;
            gap: 0.75rem;
            align-items: stretch;
            margin-bottom: 0.75rem;
          }

          .campo-cabecera,
          .titulo-hoja {
            border: 2px solid #000;
            min-height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
          }

          .campo-cabecera span {
            font-weight: 900;
            font-size: 1rem;
          }

          .titulo-hoja {
            flex-direction: column;
            background: #111827;
            color: white;
          }

          .titulo-hoja h1 {
            font-size: 1.45rem;
            line-height: 1;
            font-weight: 900;
            margin: 0;
          }

          .titulo-hoja p {
            font-size: 0.75rem;
            margin-top: 0.25rem;
          }

          .tabla-excel {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
          }

          .tabla-excel th,
          .tabla-excel td {
            border: 1px solid #000;
            color: #000;
            vertical-align: middle;
            padding: 4px;
            height: 24px;
          }

          .tabla-excel th {
            font-weight: 900;
            text-align: center;
            background: #e5e7eb;
          }

          .fila-cabecera-principal th {
            background: #111827;
            color: white;
            font-size: 13px;
            letter-spacing: 0.04em;
          }

          .tabla-excel .cod {
            width: 42px;
            text-align: center;
            font-weight: 900;
          }

          .tabla-excel .articulo {
            width: auto;
            font-weight: 900;
          }

          .tabla-excel .cantidad {
            width: 46px;
            text-align: center;
            font-weight: 900;
          }

          .tabla-excel .dato {
            font-weight: 800;
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

          .bloque-print {
            margin-top: 0;
            break-after: page;
            page-break-after: always;
          }

          .bloque-print:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .cabecera-hoja {
            display: grid;
            grid-template-columns: 1fr 1.3fr 1fr;
            gap: 4mm;
            align-items: stretch;
            margin-bottom: 4px;
          }

          .campo-cabecera,
          .titulo-hoja {
            border: 1.5px solid #000;
            min-height: 10mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .campo-cabecera {
            background: #fff;
          }

          .campo-cabecera span {
            font-weight: 900;
            font-size: 10px;
          }

          .titulo-hoja {
            flex-direction: column;
            background: #000;
            color: #fff;
          }

          .titulo-hoja h1 {
            font-size: 13px;
            line-height: 1;
            font-weight: 900;
            margin: 0;
          }

          .titulo-hoja p {
            font-size: 7px;
            margin: 1px 0 0 0;
            font-weight: 700;
          }

          .tabla-excel {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 7.5px;
          }

          .tabla-excel th,
          .tabla-excel td {
            border: 1px solid #000;
            color: #000;
            vertical-align: middle;
            padding: 1.5px 2px;
            height: 16px;
            line-height: 1.05;
          }

          .tabla-excel th {
            font-weight: 900;
            text-align: center;
            background: #e5e7eb;
          }

          .fila-cabecera-principal th {
            background: #000;
            color: white;
            font-size: 8.5px;
            letter-spacing: 0.03em;
          }

          .tabla-excel .cod {
            width: 9mm;
            text-align: center;
            font-weight: 900;
          }

          .tabla-excel .articulo {
            width: auto;
            font-weight: 900;
          }

          .tabla-excel .cantidad {
            width: 10mm;
            text-align: center;
            font-weight: 900;
          }

          .tabla-excel .dato {
            font-weight: 800;
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
                  <CabeceraHoja departamento="BEBIDAS" total={bebidas.length} />
                  <TablaBebidas items={bebidas} />
                </section>
              )}

              {charcuteria.length > 0 && (
                <section className="bloque-print">
                  <CabeceraHoja
                    departamento="CHARCUTERÍA"
                    total={charcuteria.length}
                  />
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
