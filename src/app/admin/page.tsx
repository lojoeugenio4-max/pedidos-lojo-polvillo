"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  Clock,
  Printer,
  Eye,
  AlertCircle,
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
};

type Pedido = {
  id: string;
  cliente_id: number;
  fecha: string;
  estado: string;
  impreso: boolean;
  creado_en: string;
  fuera_de_dia: boolean | null;
};

type FilaControl = {
  cliente: Cliente;
  pedido: Pedido | null;
};

function normalizarDia(valor: string | null) {
  return (valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function diaHoyEspana() {
  return normalizarDia(
    new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      timeZone: "Europe/Madrid",
    })
  );
}

function fechaHoyISO() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = partes.find((p) => p.type === "year")?.value;
  const month = partes.find((p) => p.type === "month")?.value;
  const day = partes.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function fechaEspana(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-ES");
}

export default function AdminPage() {
  const [filas, setFilas] = useState<FilaControl[]>([]);
  const [pedidosHoySinClientePrevisto, setPedidosHoySinClientePrevisto] =
    useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const hoyDia = diaHoyEspana();
  const hoyFecha = fechaHoyISO();

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    const { data: clientesData, error: clientesError } = await supabase
      .from("Clientes")
      .select("id, codigo, nombre, telefono, dia_pedido, ruta, activo")
      .eq("activo", true)
      .order("ruta", { ascending: true })
      .order("nombre", { ascending: true });

    if (clientesError) {
      setMensaje(JSON.stringify(clientesError));
      setCargando(false);
      return;
    }

    const { data: pedidosData, error: pedidosError } = await supabase
      .from("pedidos")
      .select("id, cliente_id, fecha, estado, impreso, creado_en, fuera_de_dia")
      .eq("fecha", hoyFecha)
      .order("creado_en", { ascending: false });

    if (pedidosError) {
      setMensaje(JSON.stringify(pedidosError));
      setCargando(false);
      return;
    }

    const clientes = (clientesData || []) as Cliente[];
    const pedidos = (pedidosData || []) as Pedido[];

    const clientesPrevistosHoy = clientes.filter(
      (cliente) => normalizarDia(cliente.dia_pedido) === hoyDia
    );

    const filasControl: FilaControl[] = clientesPrevistosHoy.map((cliente) => {
      const pedido =
        pedidos.find((p) => Number(p.cliente_id) === Number(cliente.id)) || null;

      return {
        cliente,
        pedido,
      };
    });

    const idsPrevistos = new Set(clientesPrevistosHoy.map((c) => Number(c.id)));

    const pedidosNoPrevistos = pedidos.filter(
      (pedido) => !idsPrevistos.has(Number(pedido.cliente_id))
    );

    setFilas(filasControl);
    setPedidosHoySinClientePrevisto(pedidosNoPrevistos);
    setCargando(false);
  }

  async function marcarImpreso(id: string) {
    const { error } = await supabase
      .from("pedidos")
      .update({ impreso: true, estado: "impreso" })
      .eq("id", id);

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    await cargarDatos();
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const previstas = filas.length;
  const recibidas = filas.filter((fila) => fila.pedido).length;
  const faltan = filas.filter((fila) => !fila.pedido).length;
  const impresas = filas.filter((fila) => fila.pedido?.impreso).length;
  const fueraDeDiaPrevistas = filas.filter(
    (fila) => fila.pedido?.fuera_de_dia
  ).length;
  const fueraDeDiaNoPrevistas = pedidosHoySinClientePrevisto.filter(
    (pedido) => pedido.fuera_de_dia
  ).length;
  const totalFueraDeDia = fueraDeDiaPrevistas + fueraDeDiaNoPrevistas;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Panel interno · Pedidos
            </h1>

            <p className="text-slate-600 mt-2">
              Tiendas previstas para hoy:{" "}
              <strong className="capitalize">{hoyDia}</strong> ·{" "}
              {fechaEspana(hoyFecha)}
            </p>
          </div>

          <button
            onClick={cargarDatos}
            className="bg-black text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Previstas hoy</p>
            <p className="text-3xl font-bold">{previstas}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Recibidas</p>
            <p className="text-3xl font-bold">{recibidas}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Faltan</p>
            <p className="text-3xl font-bold">{faltan}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Impresas</p>
            <p className="text-3xl font-bold">{impresas}</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-red-600">Fuera de día</p>
            <p className="text-3xl font-bold text-red-700">{totalFueraDeDia}</p>
          </div>
        </section>

        {totalFueraDeDia > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Hay pedidos recibidos fuera de su día habitual.
          </div>
        )}

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {mensaje}
          </div>
        )}

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">Control de tiendas de hoy</h2>
            {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Tienda</th>
                  <th className="text-left p-3">Ruta</th>
                  <th className="text-left p-3">Teléfono</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Impreso</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && filas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No hay tiendas previstas para hoy.
                    </td>
                  </tr>
                )}

                {filas.map(({ cliente, pedido }) => {
                  const recibido = Boolean(pedido);
                  const impreso = Boolean(pedido?.impreso);
                  const fueraDeDia = Boolean(pedido?.fuera_de_dia);

                  return (
                    <tr
                      key={cliente.id}
                      className={`border-t ${
                        fueraDeDia ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="p-3">{cliente.codigo || "-"}</td>
                      <td className="p-3 font-semibold">{cliente.nombre}</td>
                      <td className="p-3">{cliente.ruta || "-"}</td>
                      <td className="p-3">{cliente.telefono || "-"}</td>

                      <td className="p-3">
                        {fueraDeDia ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            Fuera de día
                          </span>
                        ) : recibido ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Recibido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-semibold">
                            <Clock className="w-3 h-3" />
                            Falta
                          </span>
                        )}
                      </td>

                      <td className="p-3">{impreso ? "Sí" : "No"}</td>

                      <td className="p-3">
                        {pedido ? (
                          <div className="flex gap-2 flex-wrap">
                            <Link
                              href={`/admin/pedido/${pedido.id}`}
                              className="rounded-lg border px-3 py-2 flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </Link>

                            <Link
                              href={`/admin/pedido/${pedido.id}`}
                              className="rounded-lg bg-black text-white px-3 py-2 flex items-center gap-1"
                            >
                              <Printer className="w-4 h-4" />
                              Preparar
                            </Link>

                            {!pedido.impreso && (
                              <button
                                onClick={() => marcarImpreso(pedido.id)}
                                className="rounded-lg border px-3 py-2"
                              >
                                Marcar impreso
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin pedido</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {pedidosHoySinClientePrevisto.length > 0 && (
          <section className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Pedidos recibidos de tiendas no previstas hoy
              </h2>
            </div>

            <div className="p-4 space-y-3">
              {pedidosHoySinClientePrevisto.map((pedido) => {
                const fueraDeDia = Boolean(pedido.fuera_de_dia);

                return (
                  <div
                    key={pedido.id}
                    className={`border rounded-xl p-3 flex justify-between items-center gap-3 ${
                      fueraDeDia ? "bg-red-50 border-red-200" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold">
                        Cliente ID {pedido.cliente_id}
                      </p>

                      <div className="flex gap-2 flex-wrap mt-1">
                        {fueraDeDia && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            Fuera de día
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold">
                          {pedido.impreso ? "Impreso" : "No impreso"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/admin/pedido/${pedido.id}`}
                      className="rounded-lg bg-black text-white px-3 py-2"
                    >
                      Ver pedido
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
