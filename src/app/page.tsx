"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  ShoppingCart,
  Package,
  Wine,
  Beef,
  Trash2,
  Send,
} from "lucide-react";

import { productos, type Producto } from "@/data/productos";
import { supabase } from "@/lib/supabase";

const departamentos = ["Todos", "Bebidas", "Charcutería"];

type LineaPedido = Producto & {
  cajas: number;
  unidades: number;
};

type Pedido = {
  [key: string]: LineaPedido;
};

export default function Home() {
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("Todos");
  const [pedido, setPedido] = useState<Pedido>({});
  const [nombreTienda, setNombreTienda] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return productos.filter((p) => {
      const coincideDepartamento =
        departamento === "Todos" || p.departamento === departamento;

      const coincideBusqueda =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.includes(q) ||
        p.categoria.toLowerCase().includes(q);

      return coincideDepartamento && coincideBusqueda;
    });
  }, [busqueda, departamento]);

  const lineasPedido = Object.values(pedido).filter(
    (item) => item.cajas > 0 || item.unidades > 0
  );

  const totalLineas = lineasPedido.length;

  function actualizarCantidad(
    producto: Producto,
    tipo: "cajas" | "unidades",
    valor: string
  ) {
    const cantidad = Math.max(0, Number(valor) || 0);

    setPedido((prev) => {
      const actual = prev[producto.codigo] || {
        ...producto,
        cajas: 0,
        unidades: 0,
      };

      const actualizado: LineaPedido =
        producto.departamento === "Bebidas"
          ? { ...actual, cajas: cantidad, unidades: 0 }
          : {
              ...actual,
              cajas: tipo === "cajas" ? cantidad : 0,
              unidades: tipo === "unidades" ? cantidad : 0,
            };

      const copia = { ...prev };

      if (actualizado.cajas === 0 && actualizado.unidades === 0) {
        delete copia[producto.codigo];
      } else {
        copia[producto.codigo] = actualizado;
      }

      return copia;
    });
  }

  function limpiarPedido() {
    setPedido({});
    setMensaje("");
  }

  function cantidadActual(producto: Producto, tipo: "cajas" | "unidades") {
    return pedido[producto.codigo]?.[tipo] || 0;
  }

  async function enviarPedido() {
    setMensaje("");

    if (!nombreTienda.trim()) {
      setMensaje("Introduce el nombre de la tienda.");
      return;
    }

    if (lineasPedido.length === 0) {
      setMensaje("Añade al menos un artículo al pedido.");
      return;
    }

    try {
      setEnviando(true);

      const { data: cliente, error: clienteError } = await supabase
        .from("Clientes")
        .insert({
          nombre: nombreTienda.trim(),
          telefono: telefono.trim() || null,
          dia_pedido: new Date().toLocaleDateString("es-ES", {
            weekday: "long",
          }),
          ruta: null,
          activo: true,
        })
        .select("id")
        .single();

      if (clienteError) throw clienteError;

      const { data: pedidoCreado, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: cliente.id,
          fecha: new Date().toISOString().slice(0, 10),
          estado: "recibido",
          impreso: false,
        })
        .select("id")
        .single();

      if (pedidoError) throw pedidoError;

      const lineas = lineasPedido.map((item) => ({
        pedido_id: pedidoCreado.id,
        codigo_articulo: item.codigo,
        nombre_articulo: item.nombre,
        cajas: item.cajas,
        unidades: item.unidades,
      }));

      const { error: lineasError } = await supabase
        .from("lineas_pedido")
        .insert(lineas);

      if (lineasError) throw lineasError;

      setMensaje("Pedido enviado correctamente.");
      setPedido({});
      setNombreTienda("");
      setTelefono("");
    } catch (error) {
      console.error(error);
      setMensaje(String(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Polvillo · Pedidos</h1>
            <p className="text-slate-600 mt-2">Catálogo de bebidas y charcutería para preparar pedidos</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
            <ShoppingCart className="w-6 h-6" />
            <div>
              <p className="text-sm text-slate-500">Pedido actual</p>
              <p className="text-2xl font-bold">{totalLineas} líneas</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
            <Package className="w-6 h-6" />
            <div>
              <p className="text-sm text-slate-500">Productos</p>
              <p className="text-2xl font-bold">{productos.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
            <Wine className="w-6 h-6" />
            <div>
              <p className="text-sm text-slate-500">Bebidas</p>
              <p className="text-2xl font-bold">{productos.filter((p) => p.departamento === "Bebidas").length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
            <Beef className="w-6 h-6" />
            <div>
              <p className="text-sm text-slate-500">Charcutería</p>
              <p className="text-2xl font-bold">{productos.filter((p) => p.departamento === "Charcutería").length}</p>
            </div>
          </div>
        </section>

        <div className="bg-white rounded-2xl p-4 shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input
              value={nombreTienda}
              onChange={(e) => setNombreTienda(e.target.value)}
              placeholder="Nombre de la tienda"
              className="w-full border rounded-xl py-3 px-4"
            />

            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Teléfono opcional"
              className="w-full border rounded-xl py-3 px-4"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código, artículo o categoría..."
                className="w-full border rounded-xl py-3 pl-10 pr-4"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {departamentos.map((d) => (
                <button
                  key={d}
                  onClick={() => setDepartamento(d)}
                  className={`px-4 py-2 rounded-xl border ${departamento === d ? "bg-black text-white" : "bg-white"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-3">
            {productosFiltrados.map((p) => {
              const cajas = cantidadActual(p, "cajas");
              const unidades = cantidadActual(p, "unidades");

              return (
                <div key={`${p.codigo}-${p.nombre}`} className="bg-white rounded-2xl p-4 shadow">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:items-center">
                    <div>
                      <p className="text-xs text-slate-500">Código {p.codigo}</p>
                      <h2 className="font-bold mt-1">{p.nombre}</h2>
                      <p className="text-sm text-slate-500 mt-1">{p.departamento} · {p.categoria}</p>
                    </div>

                    {p.departamento === "Bebidas" ? (
                      <div className="w-full md:w-36">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">CAJAS</label>
                        <input
                          type="number"
                          min="0"
                          value={cajas || ""}
                          onChange={(e) => actualizarCantidad(p, "cajas", e.target.value)}
                          className="w-full border rounded-xl px-3 py-2 text-center"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 w-full md:w-72">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">CAJAS</label>
                          <input
                            type="number"
                            min="0"
                            value={cajas || ""}
                            onChange={(e) => actualizarCantidad(p, "cajas", e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-center"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">UNIDADES</label>
                          <input
                            type="number"
                            min="0"
                            value={unidades || ""}
                            onChange={(e) => actualizarCantidad(p, "unidades", e.target.value)}
                            className="w-full border rounded-xl px-3 py-2 text-center"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <aside>
            <div className="bg-white rounded-2xl p-4 shadow sticky top-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Pedido</h2>
                <button onClick={limpiarPedido} className="text-red-500 flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />
                  Limpiar
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {lineasPedido.length === 0 && (
                  <p className="text-slate-500 text-sm">No hay artículos añadidos</p>
                )}

                {lineasPedido.map((item) => (
                  <div key={item.codigo} className="border rounded-xl p-3">
                    <p className="font-semibold text-sm">{item.nombre}</p>
                    <p className="text-xs text-slate-500">{item.codigo} · {item.departamento}</p>
                    <p className="font-bold mt-2">
                      {item.cajas > 0
                        ? `${item.cajas} caja${item.cajas === 1 ? "" : "s"}`
                        : `${item.unidades} unidad${item.unidades === 1 ? "" : "es"}`}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={enviarPedido}
                disabled={enviando}
                className="mt-4 w-full bg-black text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:bg-slate-400"
              >
                <Send className="w-4 h-4" />
                {enviando ? "Enviando..." : "Enviar pedido"}
              </button>

              {mensaje && <p className="mt-3 text-sm font-medium text-center">{mensaje}</p>}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
