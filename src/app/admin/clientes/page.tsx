"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Plus,
  Copy,
  Check,
  Pencil,
  Save,
  X,
  Search,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: number;
  codigo: string | null;
  nombre: string;
  telefono: string | null;
  dia_pedido: string | null;
  ruta: string | null;
  activo: boolean | null;
  token_pedido: string | null;
};

const dias = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

function generarToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  }

  return Math.random().toString(36).slice(2, 12);
}

function obtenerBaseUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [copiado, setCopiado] = useState<number | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nuevo, setNuevo] = useState({
    codigo: "",
    nombre: "",
    telefono: "",
    dia_pedido: "lunes",
    ruta: "",
  });

  const [edicion, setEdicion] = useState({
    codigo: "",
    nombre: "",
    telefono: "",
    dia_pedido: "lunes",
    ruta: "",
    activo: true,
  });

  async function cargarClientes() {
    setCargando(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("Clientes")
      .select("id, codigo, nombre, telefono, dia_pedido, ruta, activo, token_pedido")
      .order("ruta", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje(JSON.stringify(error));
      setCargando(false);
      return;
    }

    setClientes((data || []) as Cliente[]);
    setCargando(false);
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return clientes;

    return clientes.filter((cliente) => {
      return (
        cliente.nombre.toLowerCase().includes(q) ||
        (cliente.codigo || "").toLowerCase().includes(q) ||
        (cliente.telefono || "").toLowerCase().includes(q) ||
        (cliente.ruta || "").toLowerCase().includes(q) ||
        (cliente.dia_pedido || "").toLowerCase().includes(q)
      );
    });
  }, [clientes, busqueda]);

  function enlaceCliente(cliente: Cliente) {
    if (!cliente.token_pedido) return "";
    return `${obtenerBaseUrl()}/pedido/${cliente.token_pedido}`;
  }

  async function copiarEnlace(cliente: Cliente) {
    const enlace = enlaceCliente(cliente);

    if (!enlace) {
      setMensaje("Este cliente no tiene token de pedido.");
      return;
    }

    await navigator.clipboard.writeText(enlace);
    setCopiado(cliente.id);

    setTimeout(() => {
      setCopiado(null);
    }, 1500);
  }

  async function crearCliente() {
    setMensaje("");

    if (!nuevo.nombre.trim()) {
      setMensaje("Introduce el nombre del cliente.");
      return;
    }

    const { error } = await supabase.from("Clientes").insert({
      codigo: nuevo.codigo.trim() || null,
      nombre: nuevo.nombre.trim(),
      telefono: nuevo.telefono.trim() || null,
      dia_pedido: nuevo.dia_pedido,
      ruta: nuevo.ruta.trim() || null,
      activo: true,
      token_pedido: generarToken(),
    });

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    setNuevo({
      codigo: "",
      nombre: "",
      telefono: "",
      dia_pedido: "lunes",
      ruta: "",
    });

    await cargarClientes();
    setMensaje("Cliente creado correctamente.");
  }

  function empezarEdicion(cliente: Cliente) {
    setEditandoId(cliente.id);
    setEdicion({
      codigo: cliente.codigo || "",
      nombre: cliente.nombre || "",
      telefono: cliente.telefono || "",
      dia_pedido: cliente.dia_pedido || "lunes",
      ruta: cliente.ruta || "",
      activo: cliente.activo ?? true,
    });
  }

  function cancelarEdicion() {
    setEditandoId(null);
  }

  async function guardarEdicion(cliente: Cliente) {
    setMensaje("");

    if (!edicion.nombre.trim()) {
      setMensaje("El nombre del cliente no puede estar vacío.");
      return;
    }

    const { error } = await supabase
      .from("Clientes")
      .update({
        codigo: edicion.codigo.trim() || null,
        nombre: edicion.nombre.trim(),
        telefono: edicion.telefono.trim() || null,
        dia_pedido: edicion.dia_pedido,
        ruta: edicion.ruta.trim() || null,
        activo: edicion.activo,
      })
      .eq("id", cliente.id);

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    setEditandoId(null);
    await cargarClientes();
    setMensaje("Cliente actualizado correctamente.");
  }

  async function generarTokenFaltante(cliente: Cliente) {
    const { error } = await supabase
      .from("Clientes")
      .update({ token_pedido: generarToken() })
      .eq("id", cliente.id);

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    await cargarClientes();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Clientes
            </h1>

            <p className="text-slate-600 mt-2">
              Alta de tiendas, días de pedido y enlaces directos para clientes
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin"
              className="rounded-xl border bg-white px-4 py-3"
            >
              Volver al panel
            </Link>

            <button
              onClick={cargarClientes}
              className="bg-black text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </header>

        {mensaje && (
          <div className="bg-white border rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="text-xl font-bold">Nuevo cliente</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
              placeholder="Nombre tienda"
              className="border rounded-xl px-3 py-2"
            />

            <input
              value={nuevo.telefono}
              onChange={(e) =>
                setNuevo({ ...nuevo, telefono: e.target.value })
              }
              placeholder="Teléfono"
              className="border rounded-xl px-3 py-2"
            />

            <select
              value={nuevo.dia_pedido}
              onChange={(e) =>
                setNuevo({ ...nuevo, dia_pedido: e.target.value })
              }
              className="border rounded-xl px-3 py-2 bg-white"
            >
              {dias.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>

            <input
              value={nuevo.ruta}
              onChange={(e) =>
                setNuevo({ ...nuevo, ruta: e.target.value })
              }
              placeholder="Ruta"
              className="border rounded-xl px-3 py-2"
            />
          </div>

          <button
            onClick={crearCliente}
            className="bg-black text-white rounded-xl px-4 py-3 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear cliente
          </button>
        </section>

        <section className="bg-white rounded-2xl shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente, código, ruta, teléfono..."
              className="w-full border rounded-xl py-3 pl-10 pr-4"
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Listado de clientes
            </h2>

            {cargando && (
              <p className="text-sm text-slate-500">Cargando...</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Tienda</th>
                  <th className="text-left p-3">Teléfono</th>
                  <th className="text-left p-3">Día</th>
                  <th className="text-left p-3">Ruta</th>
                  <th className="text-left p-3">Activo</th>
                  <th className="text-left p-3">Enlace</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && clientesFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-slate-500"
                    >
                      No hay clientes.
                    </td>
                  </tr>
                )}

                {clientesFiltrados.map((cliente) => {
                  const editando = editandoId === cliente.id;

                  return (
                    <tr key={cliente.id} className="border-t">
                      <td className="p-3">
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
                          cliente.codigo || "-"
                        )}
                      </td>

                      <td className="p-3 font-semibold">
                        {editando ? (
                          <input
                            value={edicion.nombre}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                nombre: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 min-w-48"
                          />
                        ) : (
                          cliente.nombre
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <input
                            value={edicion.telefono}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                telefono: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-32"
                          />
                        ) : (
                          cliente.telefono || "-"
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <select
                            value={edicion.dia_pedido}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                dia_pedido: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 bg-white"
                          >
                            {dias.map((dia) => (
                              <option key={dia} value={dia}>
                                {dia}
                              </option>
                            ))}
                          </select>
                        ) : (
                          cliente.dia_pedido || "-"
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <input
                            value={edicion.ruta}
                            onChange={(e) =>
                              setEdicion({
                                ...edicion,
                                ruta: e.target.value,
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-28"
                          />
                        ) : (
                          cliente.ruta || "-"
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
                        ) : cliente.activo ? (
                          "Sí"
                        ) : (
                          "No"
                        )}
                      </td>

                      <td className="p-3">
                        {cliente.token_pedido ? (
                          <button
                            onClick={() => copiarEnlace(cliente)}
                            className="rounded-lg border px-3 py-2 flex items-center gap-1"
                          >
                            {copiado === cliente.id ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copiar enlace
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => generarTokenFaltante(cliente)}
                            className="rounded-lg bg-black text-white px-3 py-2"
                          >
                            Crear enlace
                          </button>
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => guardarEdicion(cliente)}
                              className="rounded-lg bg-black text-white px-3 py-2 flex items-center gap-1"
                            >
                              <Save className="w-4 h-4" />
                              Guardar
                            </button>

                            <button
                              onClick={cancelarEdicion}
                              className="rounded-lg border px-3 py-2 flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => empezarEdicion(cliente)}
                            className="rounded-lg border px-3 py-2 flex items-center gap-1"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
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
