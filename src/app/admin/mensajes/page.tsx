"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  RefreshCw,
  Search,
  Send,
  Users,
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

type MensajeCliente = {
  id: string;
  mensaje: string;
  cliente_id: number | null;
  dia_pedido: string | null;
  para_todos: boolean | null;
  activo: boolean | null;
  creado_en: string;
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

function normalizarDia(valor: string | null) {
  return (valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function AdminMensajesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mensajes, setMensajes] = useState<MensajeCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeOk, setMensajeOk] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modo, setModo] = useState<"tienda" | "todas" | "dia">("tienda");
  const [clienteId, setClienteId] = useState("");
  const [diaSeleccionado, setDiaSeleccionado] = useState("lunes");
  const [mensaje, setMensaje] = useState(
    "Buenos días. Tenemos un aviso importante antes de realizar el pedido."
  );

  async function cargarDatos() {
    setCargando(true);
    setMensajeError("");
    setMensajeOk("");

    const { data: clientesData, error: clientesError } = await supabase
      .from("Clientes")
      .select("id, codigo, nombre, telefono, dia_pedido, ruta, activo, token_pedido")
      .eq("activo", true)
      .order("ruta", { ascending: true })
      .order("nombre", { ascending: true });

    if (clientesError) {
      setMensajeError(JSON.stringify(clientesError));
      setCargando(false);
      return;
    }

    const { data: mensajesData, error: mensajesError } = await supabase
      .from("mensajes_clientes")
      .select("id, mensaje, cliente_id, dia_pedido, para_todos, activo, creado_en")
      .order("creado_en", { ascending: false });

    if (mensajesError) {
      setMensajeError(JSON.stringify(mensajesError));
      setCargando(false);
      return;
    }

    setClientes((clientesData || []) as Cliente[]);
    setMensajes((mensajesData || []) as MensajeCliente[]);
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return clientes;

    return clientes.filter((cliente) => {
      return (
        cliente.nombre.toLowerCase().includes(q) ||
        (cliente.codigo || "").toLowerCase().includes(q) ||
        (cliente.ruta || "").toLowerCase().includes(q) ||
        (cliente.dia_pedido || "").toLowerCase().includes(q)
      );
    });
  }, [clientes, busqueda]);

  const destinatarios = useMemo(() => {
    if (modo === "todas") return clientesFiltrados;

    if (modo === "dia") {
      return clientesFiltrados.filter(
        (cliente) =>
          normalizarDia(cliente.dia_pedido) === normalizarDia(diaSeleccionado)
      );
    }

    const cliente = clientes.find((c) => String(c.id) === clienteId);
    return cliente ? [cliente] : [];
  }, [modo, clientes, clientesFiltrados, clienteId, diaSeleccionado]);

  async function guardarMensaje() {
    setMensajeError("");
    setMensajeOk("");

    if (!mensaje.trim()) {
      setMensajeError("Escribe un mensaje.");
      return;
    }

    if (modo === "tienda" && !clienteId) {
      setMensajeError("Selecciona una tienda.");
      return;
    }

    const nuevoMensaje = {
      mensaje: mensaje.trim(),
      cliente_id: modo === "tienda" ? Number(clienteId) : null,
      dia_pedido: modo === "dia" ? diaSeleccionado : null,
      para_todos: modo === "todas",
      activo: true,
    };

    const { error } = await supabase
      .from("mensajes_clientes")
      .insert(nuevoMensaje);

    if (error) {
      setMensajeError(JSON.stringify(error));
      return;
    }

    await cargarDatos();

    setMensajeOk(
      modo === "todas"
        ? "Aviso guardado para todos los clientes."
        : modo === "dia"
          ? `Aviso guardado para clientes de ${diaSeleccionado}.`
          : "Aviso guardado para la tienda seleccionada."
    );
  }

  async function desactivarMensaje(id: string) {
    const confirmar = window.confirm("¿Quieres desactivar este aviso?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("mensajes_clientes")
      .update({ activo: false })
      .eq("id", id);

    if (error) {
      setMensajeError(JSON.stringify(error));
      return;
    }

    await cargarDatos();
    setMensajeOk("Aviso desactivado.");
  }

  function destinoMensaje(m: MensajeCliente) {
    if (m.para_todos) return "Todos los clientes";
    if (m.dia_pedido) return `Día: ${m.dia_pedido}`;

    const cliente = clientes.find((c) => Number(c.id) === Number(m.cliente_id));
    return cliente ? cliente.nombre : `Cliente ID ${m.cliente_id || "-"}`;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Avisos a clientes
            </h1>

            <p className="text-slate-600 mt-2">
              Crea avisos que aparecerán al cliente antes de hacer el pedido.
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
              onClick={cargarDatos}
              className="bg-black text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Clientes activos</p>
            <p className="text-4xl font-bold">{clientes.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Destinatarios</p>
            <p className="text-4xl font-bold">{destinatarios.length}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-blue-700">Avisos activos</p>
            <p className="text-4xl font-bold text-blue-700">
              {mensajes.filter((m) => m.activo).length}
            </p>
          </div>
        </section>

        {mensajeError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {mensajeError}
          </div>
        )}

        {mensajeOk && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {mensajeOk}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Destinatarios
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setModo("tienda")}
              className={`rounded-xl border px-4 py-3 font-bold ${
                modo === "tienda" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Una tienda
            </button>

            <button
              onClick={() => setModo("todas")}
              className={`rounded-xl border px-4 py-3 font-bold ${
                modo === "todas" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Todas
            </button>

            <button
              onClick={() => setModo("dia")}
              className={`rounded-xl border px-4 py-3 font-bold ${
                modo === "dia" ? "bg-black text-white" : "bg-white"
              }`}
            >
              Por día
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modo === "tienda" && (
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">Selecciona una tienda</option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} · {cliente.codigo || "sin código"}
                  </option>
                ))}
              </select>
            )}

            {modo === "dia" && (
              <select
                value={diaSeleccionado}
                onChange={(e) => setDiaSeleccionado(e.target.value)}
                className="border rounded-xl px-4 py-3 bg-white"
              >
                {dias.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia.charAt(0).toUpperCase() + dia.slice(1)}
                  </option>
                ))}
              </select>
            )}

            {(modo === "todas" || modo === "dia") && (
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />

                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Filtrar por tienda, ruta o día..."
                  className="w-full border rounded-xl py-3 pl-10 pr-4"
                />
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Aviso
          </h2>

          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={5}
            className="w-full border rounded-xl p-4"
            placeholder="Escribe el aviso..."
          />

          <button
            onClick={guardarMensaje}
            className="bg-black text-white rounded-xl px-5 py-3 font-bold inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Guardar aviso
          </button>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Avisos creados</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Destino</th>
                  <th className="text-left p-3">Mensaje</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && mensajes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      No hay avisos creados.
                    </td>
                  </tr>
                )}

                {mensajes.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3 font-semibold">{destinoMensaje(m)}</td>

                    <td className="p-3 max-w-xl">
                      <p className="line-clamp-3">{m.mensaje}</p>
                    </td>

                    <td className="p-3">
                      {m.activo ? (
                        <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 text-slate-500 px-3 py-1 text-xs font-semibold">
                          Desactivado
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {m.activo ? (
                        <button
                          onClick={() => desactivarMensaje(m.id)}
                          className="rounded-lg border px-3 py-2 bg-white"
                        >
                          Desactivar
                        </button>
                      ) : (
                        <span className="text-slate-400">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
