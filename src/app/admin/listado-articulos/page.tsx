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

  const tituloFiltro =
    filtroImpresion === "activos"
      ? "ARTÍCULOS ACTIVOS"
      : filtroImpresion === "ocultos"
        ? "ARTÍCULOS OCULTOS"
        : "ARTÍCULOS ACTIVOS Y OCULTOS";

  function imprimir(tipo: Filtro) {
    setFiltroImpresion(tipo);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }

  function TablaBebidas({ items }: { items: Producto[] }) {
    const columnas = partirEnColumnas(items, 2);
    const maxFilas = Math.max(...columnas.map((col) => col.length), 0);

    return (
      <table className="tabla-excel tabla-bebidas">
        <thead>
          <tr>
            {[0, 1].map((col) => (
              <React.Fragment key={col}>
                <th className="cod">Cod.</th>
                <th className="articulo">Artículos</th>
                <th className="cantidad">CAJAS</th>
              </React.Fragment>
            ))}
          </tr>

          <tr>
            {[0, 1].map((col) => (
              <React.Fragment key={col}>
                <th className="seccion" colSpan={3}>
                  BEBIDAS
                </th>
              </React.Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: maxFilas }).map((_, fila) => (
            <tr key={fila}>
              {[0, 1, 2].map((col) => {
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
          <tr>
            {[0, 1].map((col) => (
              <React.Fragment key={col}>
                <th className="cod">Cod.</th>
                <th className="articulo">Artículos</th>
                <th className="cantidad">CAJAS</th>
                <th className="cantidad">UNID.</th>
                <th className="cantidad">KILOS</th>
              </React.Fragment>
            ))}
          </tr>

          <tr>
            {[0, 1].map((col) => (
              <React.Fragment key={col}>
                <th className="seccion" colSpan={5}>
                  CHARCUTERÍA
                </th>
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
        .tabla-excel {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-family: Arial, Helvetica, sans-serif;
        }

        .tabla-excel th,
        .tabla-excel td {
          border: 1px solid #000;
          color: #000;
          vertical-align: middle;
        }

        .tabla-excel th {
          font-weight: 900;
          text-align: center;
          background: #ffffff;
        }

        .tabla-excel .seccion {
          background: #d9d9d9;
          font-weight: 900;
          text-align: center;
        }

        .tabla-excel .cod {
          width: 38px;
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
          font-weight: 900;
        }

        @media screen {
          .hoja-listado {
            background: white;
            border-radius: 1rem;
            box-shadow:
              0 10px 15px -3px rgb(0 0 0 / 0.1),
              0 4px 6px -4px rgb(0 0 0 / 0.1);
            padding: 1.5rem;
          }

          .cabecera-excel {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
            font-weight: 900;
          }

          .cabecera-excel div {
            border-bottom: 2px solid #000;
            padding-bottom: 0.25rem;
          }

          .titulo-print {
            font-size: 1.5rem;
            font-weight: 900;
            margin-bottom: 1rem;
          }

          .bloque-print {
            margin-top: 1.5rem;
          }

          .tabla-excel {
            font-size: 12px;
          }

          .tabla-excel th,
          .tabla-excel td {
            padding: 4px;
            height: 24px;
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

          .cabecera-excel {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10mm;
            margin-bottom: 4px;
            font-size: 12px;
            font-weight: 900;
          }

          .cabecera-excel div {
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }

          .titulo-print {
            font-size: 14px;
            font-weight: 900;
            margin: 0 0 4px 0;
          }

          .bloque-print {
            margin-top: 5px;
          }

          .bloque-print + .bloque-print {
            page-break-before: always;
          }

          .tabla-excel {
            font-size: 7.8px;
          }

          .tabla-excel th,
          .tabla-excel td {
            padding: 2px 3px;
            height: 17px;
            line-height: 1.05;
          }

          .tabla-excel .cod {
            width: 10mm;
          }

          .tabla-excel .cantidad {
            width: 11mm;
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
                  <div className="cabecera-excel">
                    <div>DESPACHO:</div>
                    <div>FECHA:</div>
                    <div></div>
                  </div>

                  <div className="titulo-print">BEBIDAS</div>
                  <TablaBebidas items={bebidas} />
                </section>
              )}

              {charcuteria.length > 0 && (
                <section className="bloque-print">
                  <div className="cabecera-excel">
                    <div>DESPACHO:</div>
                    <div>FECHA:</div>
                    <div></div>
                  </div>

                  <div className="titulo-print">CHARCUTERÍA</div>
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
