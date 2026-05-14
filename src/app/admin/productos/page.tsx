"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  Pencil,
  Save,
  X,
  Plus,
  PackageX,
  PackageCheck,
} from "lucide-react";
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

const departamentos = ["Bebidas", "Charcutería"];

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nuevo, setNuevo] = useState({
    codigo: "",
    nombre: "",
    departamento: "Bebidas",
    categoria: "",
    unidad: "ud",
    orden_preparacion: "",
  });

  const [edicion, setEdicion] = useState({
    codigo: "",
    nombre: "",
    departamento: "Bebidas",
    categoria: "",
    unidad: "ud",
    orden_preparacion: "",
    activo: true,
  });

  async function cargarProductos() {
    setCargando(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("productos")
      .select(
        "id, codigo, nombre, departamento, categoria, unidad, orden_preparacion, activo"
      )
      .order("departamento", { ascending: true })
      .order("orden_preparacion", { ascending: true })
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
    const q = busqueda.toLowerCase().trim();

    if (!q) return productos;

    return productos.filter((producto) => {
      return (
        producto.codigo.toLowerCase().includes(q) ||
        producto.nombre.toLowerCase().includes(q) ||
        producto.departamento.toLowerCase().includes(q) ||
        (producto.categoria || "").toLowerCase().includes(q) ||
        (producto.unidad || "").toLowerCase().includes(q)
      );
    });
  }, [productos, busqueda]);

  async function crearProducto() {
    setMensaje("");

    if (!nuevo.codigo.trim()) {
      setMensaje("Introduce el código del producto.");
      return;
    }

    if (!nuevo.nombre.trim()) {
      setMensaje("Introduce el nombre del producto.");
      return;
    }

    const { error } = await supabase.from("productos").insert({
      codigo: nuevo.codigo.trim(),
      nombre: nuevo.nombre.trim(),
      departamento: nuevo.departamento,
      categoria: nuevo.categoria.trim() || null,
      unidad: nuevo.unidad.trim() || null,
      orden_preparacion: nuevo.orden_preparacion
        ? Number(nuevo.orden_preparacion)
        : 9999,
      activo: true,
    });

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    setNuevo({
      codigo: "",
      nombre: "",
      departamento: "Bebidas",
      categoria: "",
      unidad: "ud",
      orden_preparacion: "",
    });

    await cargarProductos();
    setMensaje("Producto creado correctamente.");
  }

  function empezarEdicion(producto: Producto) {
    setEditandoId(producto.id);
    setEdicion({
      codigo: producto.codigo || "",
      nombre: producto.nombre || "",
      departamento: producto.departamento || "Bebidas",
      categoria: producto.categoria || "",
      unidad: producto.unidad || "ud",
      orden_preparacion:
        producto.orden_preparacion !== null &&
        producto.orden_preparacion !== undefined
          ? String(producto.orden_preparacion)
          : "",
      activo: producto.activo ?? true,
    });
  }

  function cancelarEdicion() {
    setEditandoId(null);
  }

  async function guardarEdicion(producto: Producto) {
    setMensaje("");

    if (!edicion.codigo.trim()) {
      setMensaje("El código no puede estar vacío.");
      return;
    }

    if (!edicion.nombre.trim()) {
      setMensaje("El nombre no puede estar vacío.");
      return;
    }

    const { error } = await supabase
      .from("productos")
      .update({
        codigo: edicion.codigo.trim(),
        nombre: edicion.nombre.trim(),
        departamento: edicion.departamento,
        categoria: edicion.categoria.trim() || null,
        unidad: edicion.unidad.trim() || null,
        orden_preparacion: edicion.orden_preparacion
          ? Number(edicion.orden_preparacion)
          : 9999,
        activo: edicion.activo,
      })
      .eq("id", producto.id);

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    setEditandoId(null);
    await cargarProductos();
    setMensaje("Producto actualizado correctamente.");
  }

  async function cambiarActivo(producto: Producto) {
    const activoActual = producto.activo ?? true;
    const nuevoEstado = !activoActual;

    const confirmar = window.confirm(
      nuevoEstado
        ? `¿Quieres reactivar ${producto.nombre}?`
        : `¿Quieres desactivar ${producto.nombre}? No aparecerá para pedir, pero se conservará el histórico.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("productos")
      .update({ activo: nuevoEstado })
      .eq("id", producto.id);

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    await cargarProductos();
    setMensaje(
      nuevoEstado
        ? "Producto reactivado correctamente."
        : "Producto desactivado correctamente."
    );
  }

  const activos = productos.filter((p) => p.activo ?? true).length;
  const inactivos = productos.filter((p) => !(p.activo ?? true)).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Productos
            </h1>

            <p className="text-slate-600 mt-2">
              Gestión de artículos y orden de picking
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              href="/admin"
              className="rounded-xl border bg-white px-4 py-3"
            >
              Volver al panel
            </Link>

            <button
              onClick={cargarProductos}
              className="bg-black text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Total productos</p>
            <p className="text-3xl font-bold">{productos.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Activos</p>
            <p className="text-3xl font-bold">{activos}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Inactivos</p>
            <p className="text-3xl font-bold">{inactivos}</p>
          </div>
        </section>

        {mensaje && (
          <div className="bg-white border rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="text-xl font-bold">Nuevo producto</h2>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              value={nuevo.codigo}
              onChange={(e) =>
                setNuevo({ ...nuevo, codigo: e.target.value })
              }
              placeholder="Código"
              className="border rounded-xl px-3 py-2"
            />

            <input
              value={nuevo.nombre}
              onChange={(e) =>
                setNuevo({ ...nuevo, nombre: e.target.value })
              }
              placeholder="Nombre"
              className="border rounded-xl px-3 py-2 md:col-span-2"
            />

            <select
              value={nuevo.departamento}
              onChange={(e) =>
                setNuevo({ ...nuevo, departamento: e.target.value })
              }
              className="border rounded-xl px-3 py-2 bg-white"
            >
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <input
              value={nuevo.categoria}
              onChange={(e) =>
                setNuevo({ ...nuevo, categoria: e.target.value })
              }
              placeholder="Categoría"
              className="border rounded-xl px-3 py-2"
            />

            <input
              value={nuevo.unidad}
              onChange={(e) =>
                setNuevo({ ...nuevo, unidad: e.target.value })
              }
              placeholder="Unidad"
              className="border rounded-xl px-3 py-2"
            />

            <input
              type="number"
              value={nuevo.orden_preparacion}
              onChange={(e) =>
                setNuevo({ ...nuevo, orden_preparacion: e.target.value })
              }
              placeholder="Orden picking"
              className="border rounded-xl px-3 py-2"
            />
          </div>

          <button
            onClick={crearProducto}
            className="bg-black text-white rounded-xl px-4 py-3 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear producto
          </button>
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar código, producto, categoría..."
              className="w-full border rounded-xl py-3 pl-10 pr-4"
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Listado de productos
            </h2>

            {cargando && (
              <p className="text-sm text-slate-500">Cargando...</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Orden</th>
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Departamento</th>
                  <th className="text-left p-3">Categoría</th>
                  <th className="text-left p-3">Unidad</th>
                  <th className="text-left p-3">Activo</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && productosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-slate-500"
                    >
                      No hay productos.
                    </td>
                  </tr>
                )}

                {productosFiltrados.map((producto) => {
                  const editando = editandoId === producto.id;
                  const activo = producto.activo ?? true;

                  return (
                    <tr
                      key={producto.id}
                      className={`border-t ${
                        !activo ? "bg-slate-100 text-slate-500" : ""
                      }`}
                    >
                      <td className="p-3">
                        {editando ? (
                          <input
                            type="number"
                            value={edicion.orden_preparacion}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                orden_preparacion: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-24"
                          />
                        ) : (
                          producto.orden_preparacion ?? 9999
                        )}
                      </td>

                      <td className="p-3 font-semibold">
                        {editando ? (
                          <input
                            value={edicion.codigo}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                codigo: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-24"
                          />
                        ) : (
                          producto.codigo
                        )}
                      </td>

                      <td className="p-3 font-semibold min-w-64">
                        {editando ? (
                          <input
                            value={edicion.nombre}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                nombre: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 min-w-64"
                          />
                        ) : (
                          producto.nombre
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <select
                            value={edicion.departamento}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                departamento: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 bg-white"
                          >
                            {departamentos.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        ) : (
                          producto.departamento
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <input
                            value={edicion.categoria}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                categoria: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-36"
                          />
                        ) : (
                          producto.categoria || "-"
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <input
                            value={edicion.unidad}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                unidad: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-20"
                          />
                        ) : (
                          producto.unidad || "-"
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={edicion.activo}
                              onChange={(e) =>
                                setEdicion({
                                  ...edicion,
                                  activo: e.target.checked,
                                })
                              }
                            />
                            Activo
                          </label>
                        ) : activo ? (
                          <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                            Sí
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">
                            No
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => guardarEdicion(producto)}
                              className="rounded-lg bg-black text-white px-3 py-2 flex items-center gap-1"
                            >
                              <Save className="w-4 h-4" />
                              Guardar
                            </button>

                            <button
                              onClick={cancelarEdicion}
                              className="rounded-lg border px-3 py-2 flex items-center gap-1 bg-white"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => empezarEdicion(producto)}
                              className="rounded-lg border px-3 py-2 flex items-center gap-1 bg-white"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </button>

                            <button
                              onClick={() => cambiarActivo(producto)}
                              className={`rounded-lg px-3 py-2 flex items-center gap-1 ${
                                activo
                                  ? "border border-red-200 text-red-700 bg-red-50"
                                  : "border border-green-200 text-green-700 bg-green-50"
                              }`}
                            >
                              {activo ? (
                                <>
                                  <PackageX className="w-4 h-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <PackageCheck className="w-4 h-4" />
                                  Reactivar
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
