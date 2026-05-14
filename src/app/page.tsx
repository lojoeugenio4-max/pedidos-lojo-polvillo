"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  ShoppingCart,
  Package,
  Wine,
  Beef,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";

import { productos, type Producto } from "@/data/productos";

const departamentos = ["Todos", "Bebidas", "Charcutería"];

type Carrito = {
  [key: string]: Producto & {
    cantidad: number;
  };
};

export default function Home() {
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("Todos");
  const [carrito, setCarrito] = useState<Carrito>({});

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();

    return productos.filter((p) => {
      const coincideDepartamento =
        departamento === "Todos" || p.departamento === departamento;

      const coincideBusqueda =
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.includes(q) ||
        p.categoria.toLowerCase().includes(q);

      return coincideDepartamento && coincideBusqueda;
    });
  }, [busqueda, departamento]);

  const totalCarrito = Object.values(carrito).reduce(
    (acc, item) => acc + item.cantidad,
    0
  );

  function sumar(producto: Producto) {
    setCarrito((prev) => ({
      ...prev,
      [producto.codigo]: {
        ...producto,
        cantidad: (prev[producto.codigo]?.cantidad || 0) + 1,
      },
    }));
  }

  function restar(codigo: string) {
    setCarrito((prev) => {
      const actual = prev[codigo];

      if (!actual) return prev;

      if (actual.cantidad <= 1) {
        const copia = { ...prev };
        delete copia[codigo];
        return copia;
      }

      return {
        ...prev,
        [codigo]: {
          ...actual,
          cantidad: actual.cantidad - 1,
        },
      };
    });
  }

  function limpiarCarrito() {
    setCarrito({});
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Polvillo · Pedidos</h1>
            <p className="text-slate-600 mt-2">
              Catálogo de bebidas y charcutería
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
            <ShoppingCart className="w-6 h-6" />
            <div>
              <p className="text-sm text-slate-500">Pedido actual</p>
              <p className="text-2xl font-bold">{totalCarrito} uds</p>
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
              <p className="text-2xl font-bold">
                {productos.filter((p) => p.departamento === "Bebidas").length}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
            <Beef className="w-6 h-6" />
            <div>
              <p className="text-sm text-slate-500">Charcutería</p>
              <p className="text-2xl font-bold">
                {productos.filter((p) => p.departamento === "Charcutería").length}
              </p>
            </div>
          </div>
        </section>

        <div className="bg-white rounded-2xl p-4 shadow">
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
                  className={`px-4 py-2 rounded-xl border ${
                    departamento === d ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {productosFiltrados.map((p) => (
              <div key={`${p.codigo}-${p.nombre}`} className="bg-white rounded-2xl p-4 shadow">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Código {p.codigo}</p>
                    <h2 className="font-bold mt-1">{p.nombre}</h2>
                  </div>

                  <span className="bg-slate-100 px-3 py-1 rounded-full text-xs">
                    {p.unidad}
                  </span>
                </div>

                <div className="mt-4 flex justify-between items-center gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{p.departamento}</p>
                    <p className="font-medium">{p.categoria}</p>
                  </div>

                  <button
                    onClick={() => sumar(p)}
                    className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir
                  </button>
                </div>
              </div>
            ))}
          </section>

          <aside>
            <div className="bg-white rounded-2xl p-4 shadow">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Pedido</h2>

                <button
                  onClick={limpiarCarrito}
                  className="text-red-500 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {Object.values(carrito).length === 0 && (
                  <p className="text-slate-500 text-sm">
                    No hay artículos añadidos
                  </p>
                )}

                {Object.values(carrito).map((item) => (
                  <div key={item.codigo} className="border rounded-xl p-3">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{item.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {item.codigo} · {item.unidad}
                        </p>
                      </div>

                      <p className="font-bold">x{item.cantidad}</p>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => restar(item.codigo)}
                        className="border rounded-lg p-2"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => sumar(item)}
                        className="border rounded-lg p-2"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
