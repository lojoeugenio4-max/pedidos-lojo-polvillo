"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Users,
  ArrowLeft,
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

function normalizarDia(valor: string | null) {
  return (valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function limpiarTelefono(telefono: string | null) {
  const limpio = (telefono || "").replace(/\D/g, "");

  if (!limpio) return "";

  if (limpio.startsWith("34")) return limpio;

  return `34${limpio}`;
}

function formatearTelefono(telefono: string | null) {
  const limpio = (telefono || "").replace(/\D/g, "");

  if (!limpio) return "-";

  return limpio.replace(/(.{3})/g, "$1.").replace(/\.$/, "");
}

function crearEnlaceWhatsapp(telefono: string, mensaje: string) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

export default function AdminMensajesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modo, setModo] = useState<"tienda" | "todas" | "dia">("tienda");
  const [clienteId, setClienteId] = useState("");
  const [diaSeleccionado, setDiaSeleccionado] = useState("lunes");
  const [mensaje, setMensaje] = useState(
    "Buenos días. Te recordamos que puedes enviar tu pedido desde el enlace habitual. Gracias."
  );

  async function cargarClientes() {
    setCargando(true);
    setMensajeError("");

    const { data, error } = await supabase
      .from("Clientes")
      .select("id, codigo, nombre, telefono, dia_pedido, ruta, activo, token_pedido")
      .eq("activo", true)
      .order("ruta", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      setMensajeError(JSON.stringify(error));
      setCargando(false);
      return;
    }

    setClientes((data || []) as Cliente[]);
    setCargando(false);
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  const clientesFiltradosBusqueda = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    if (!q) return clientes;

    return clientes.filter((cliente) => {
      return (
        cliente.nombre.toLowerCase().includes(q) ||
        (cliente.codigo || "").toLowerCase().includes(q) ||
        (cliente.ruta || "").toLowerCase().includes(q) ||
        (cliente.telefono || "").toLowerCase().includes(q) ||
        (cliente.dia_pedido || "").toLowerCase().includes(q)
      );
    });
  }, [clientes, busqueda]);

  const destinatarios = useMemo(() => {
    if (modo === "todas") {
      return clientesFiltradosBusqueda;
    }

    if (modo === "dia") {
      return clientesFiltradosBusqueda.filter(
        (cliente) =>
          normalizarDia(cliente.dia_pedido) === normalizarDia(diaSeleccionado)
      );
    }

    const cliente = clientes.find((c) => String(c.id) === clienteId);

    return cliente ? [cliente] : [];
  }, [
    modo,
    clientes,
    clientesFiltradosBusqueda,
    clienteId,
    diaSeleccionado,
  ]);

  const destinatariosConTelefono = destinatarios.filter((cliente) =>
    Boolean(limpiarTelefono(cliente.telefono))
  );

  function mensajeParaCliente(cliente: Cliente) {
    const enlacePedido =
      cliente.token_pedido && typeof window !== "undefined"
        ? `${window.location.origin}/pedido/${cliente.token_pedido}`
        : "";

    return mensaje
      .replaceAll("{tienda}", cliente.nombre)
      .replaceAll("{codigo}", cliente.codigo || "")
      .replaceAll("{dia}", cliente.dia_pedido || "")
      .replaceAll("{enlace}", enlacePedido);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Mensajes a clientes
            </h1>

            <p className="text-slate-600 mt-2">
              Genera mensajes de WhatsApp para una tienda, todas o por día de pedido.
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
              onClick={cargarClientes}
              className="bg-black text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </header>

        {mensajeError && (
          <div className="bg-white border rounded-xl p-4 text-sm">
            {mensajeError}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Clientes activos</p>
            <p className="text-4xl font-bold">{clientes.length}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Destinatarios</p>
            <p className="text-4xl font-bold">{destinatarios.length}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-green-700">Con teléfono</p>
            <p className="text-4xl font-bold text-green-700">
              {destinatariosConTelefono.length}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Selección de destinatarios
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
                  placeholder="Filtrar por tienda, ruta, teléfono..."
                  className="w-full border rounded-xl py-3 pl-10 pr-4"
                />
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Mensaje
          </h2>

          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={5}
            className="w-full border rounded-xl p-4"
            placeholder="Escribe el mensaje..."
          />

          <div className="text-sm text-slate-500 space-y-1">
            <p>Puedes usar estas variables:</p>
            <p>
              <strong>{"{tienda}"}</strong> nombre de tienda ·{" "}
              <strong>{"{codigo}"}</strong> código ·{" "}
              <strong>{"{dia}"}</strong> día de pedido ·{" "}
              <strong>{"{enlace}"}</strong> enlace de pedido
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Destinatarios</h2>
              <p className="text-sm text-slate-500">
                WhatsApp se abre con el mensaje preparado. Hay que enviarlo manualmente.
              </p>
            </div>

            {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Tienda</th>
                  <th className="text-left p-3">Teléfono</th>
                  <th className="text-left p-3">Día</th>
                  <th className="text-left p-3">Ruta</th>
                  <th className="text-left p-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && destinatarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No hay destinatarios seleccionados.
                    </td>
                  </tr>
                )}

                {destinatarios.map((cliente) => {
                  const telefono = limpiarTelefono(cliente.telefono);
                  const textoFinal = mensajeParaCliente(cliente);

                  return (
                    <tr key={cliente.id} className="border-t">
                      <td className="p-3">
                        <p className="font-bold">{cliente.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Código {cliente.codigo || "-"}
                        </p>
                      </td>

                      <td className="p-3 font-semibold">
                        {formatearTelefono(cliente.telefono)}
                      </td>

                      <td className="p-3">{cliente.dia_pedido || "-"}</td>

                      <td className="p-3">{cliente.ruta || "-"}</td>

                      <td className="p-3">
                        {telefono ? (
                          <a
                            href={crearEnlaceWhatsapp(telefono, textoFinal)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-green-600 text-white px-3 py-2 inline-flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Abrir WhatsApp
                          </a>
                        ) : (
                          <span className="text-red-500 font-semibold">
                            Sin teléfono
                          </span>
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
