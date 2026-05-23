"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  Clock,
  Printer,
  Eye,
  AlertCircle,
  Trash2,
  CalendarDays,
  Eraser,
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
  cliente: Cliente | null;
  pedido: Pedido | null;
  fueraDeDia: boolean;
  pendienteAntiguo: boolean;
};

function normalizarDia(valor: string | null) {
  return (valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function fechaISODesdeDate(fecha: Date) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fechaMadrid() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(partes.find((p) => p.type === "year")?.value);
  const month = Number(partes.find((p) => p.type === "month")?.value);
  const day = Number(partes.find((p) => p.type === "day")?.value);

  return new Date(year, month - 1, day);
}

function obtenerSemanaOperativa() {
  const hoy = fechaMadrid();
  const diaSemana = hoy.getDay();
  const diasDesdeSabado = diaSemana === 6 ? 0 : diaSemana + 1;

  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - diasDesdeSabado);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);

  return {
    inicioISO: fechaISODesdeDate(inicio),
    finISO: fechaISODesdeDate(fin),
  };
}

function diaHoyEspana() {
  return normalizarDia(
    new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      timeZone: "Europe/Madrid",
    })
  );
}

function fechaEspana(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-ES");
}

export default function AdminPedidosPage() {
  const [filas, setFilas] = useState<FilaControl[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const hoyDia = diaHoyEspana();
  const semana = obtenerSemanaOperativa();

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

    const { data: pedidosSemanaData, error: pedidosSemanaError } = await supabase
      .from("pedidos")
      .select("id, cliente_id, fecha, estado, impreso, creado_en, fuera_de_dia")
      .gte("fecha", semana.inicioISO)
      .lte("fecha", semana.finISO)
      .order("creado_en", { ascending: false });

    if (pedidosSemanaError) {
      setMensaje(JSON.stringify(pedidosSemanaError));
      setCargando(false);
      return;
    }

    const { data: pendientesAntiguosData, error: pendientesAntiguosError } =
      await supabase
        .from("pedidos")
        .select("id, cliente_id, fecha, estado, impreso, creado_en, fuera_de_dia")
        .lt("fecha", semana.inicioISO)
        .eq("impreso", false)
        .order("fecha", { ascending: true });

    if (pendientesAntiguosError) {
      setMensaje(JSON.stringify(pendientesAntiguosError));
      setCargando(false);
      return;
    }

    const clientes = (clientesData || []) as Cliente[];
    const pedidosSemana = (pedidosSemanaData || []) as Pedido[];
    const pendientesAntiguos = (pendientesAntiguosData || []) as Pedido[];

    const clientesPrevistosHoy = clientes.filter(
      (cliente) => normalizarDia(cliente.dia_pedido) === hoyDia
    );

    const idsPrevistosHoy = new Set(
      clientesPrevistosHoy.map((cliente) => Number(cliente.id))
    );

    const filasPrevistasHoy: FilaControl[] = clientesPrevistosHoy.map(
      (cliente) => {
        const pedido =
          pedidosSemana.find((p) => Number(p.cliente_id) === Number(cliente.id)) ||
          null;

        return {
          cliente,
          pedido,
          fueraDeDia: Boolean(pedido?.fuera_de_dia),
          pendienteAntiguo: false,
        };
      }
    );

    const pedidosExtraSemana = pedidosSemana.filter(
      (pedido) =>
        Boolean(pedido.fuera_de_dia) ||
        !idsPrevistosHoy.has(Number(pedido.cliente_id))
    );

    const filasExtraSemana: FilaControl[] = pedidosExtraSemana
      .filter(
        (pedido) =>
          !filasPrevistasHoy.some(
            (fila) => fila.pedido && fila.pedido.id === pedido.id
          )
      )
      .map((pedido) => {
        const cliente =
          clientes.find((c) => Number(c.id) === Number(pedido.cliente_id)) || null;

        return {
          cliente,
          pedido,
          fueraDeDia: Boolean(pedido.fuera_de_dia),
          pendienteAntiguo: false,
        };
      });

    const filasPendientesAntiguos: FilaControl[] = pendientesAntiguos.map(
      (pedido) => {
        const cliente =
          clientes.find((c) => Number(c.id) === Number(pedido.cliente_id)) || null;

        return {
          cliente,
          pedido,
          fueraDeDia: Boolean(pedido.fuera_de_dia),
          pendienteAntiguo: true,
        };
      }
    );

    const filasOrdenadas = [
      ...filasPendientesAntiguos,
      ...filasExtraSemana,
      ...filasPrevistasHoy,
    ].sort((a, b) => {
      if (a.pendienteAntiguo && !b.pendienteAntiguo) return -1;
      if (!a.pendienteAntiguo && b.pendienteAntiguo) return 1;
      if (a.fueraDeDia && !b.fueraDeDia) return -1;
      if (!a.fueraDeDia && b.fueraDeDia) return 1;

      const fechaA = a.pedido?.fecha || "";
      const fechaB = b.pedido?.fecha || "";
      if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);

      const rutaA = a.cliente?.ruta || "";
      const rutaB = b.cliente?.ruta || "";
      if (rutaA !== rutaB) return rutaA.localeCompare(rutaB);

      const nombreA = a.cliente?.nombre || "";
      const nombreB = b.cliente?.nombre || "";
      return nombreA.localeCompare(nombreB, "es");
    });

    setFilas(filasOrdenadas);
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

  async function borrarPedido(id: string) {
    const confirmar = window.confirm(
      "¿Seguro que quieres borrar este pedido? Solo debe hacerse si fue un error de envío."
    );

    if (!confirmar) return;

    const { error } = await supabase.rpc("borrar_pedido_manual", {
      pedido_uuid: id,
    });

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    await cargarDatos();
    setMensaje("Pedido borrado correctamente.");
  }

  async function limpiarImpresosAnteriores() {
    const confirmar = window.confirm(
      `Se borrarán pedidos impresos anteriores al ${fechaEspana(
        semana.inicioISO
      )}. Los no impresos se conservarán. ¿Continuar?`
    );

    if (!confirmar) return;

    const { error } = await supabase.rpc(
      "limpiar_pedidos_impresos_anteriores",
      {
        fecha_limite: semana.inicioISO,
      }
    );

    if (error) {
      setMensaje(JSON.stringify(error));
      return;
    }

    await cargarDatos();
    setMensaje("Limpieza realizada. Los pedidos no impresos se han conservado.");
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const previstasHoy = filas.filter(
    (fila) =>
      fila.cliente &&
      !fila.fueraDeDia &&
      !fila.pendienteAntiguo &&
      normalizarDia(fila.cliente.dia_pedido) === hoyDia
  ).length;

  const recibidas = filas.filter(
    (fila) => fila.pedido && !fila.fueraDeDia && !fila.pendienteAntiguo
  ).length;

  const faltan = filas.filter(
    (fila) => !fila.pedido && !fila.fueraDeDia && !fila.pendienteAntiguo
  ).length;

  const impresas = filas.filter((fila) => fila.pedido?.impreso).length;
  const fueraDeDia = filas.filter((fila) => fila.fueraDeDia).length;
  const pendientesAntiguos = filas.filter((fila) => fila.pendienteAntiguo).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Pedidos</h1>

            <p className="text-slate-600 mt-2">
              Semana operativa: <strong>{fechaEspana(semana.inicioISO)}</strong>{" "}
              a <strong>{fechaEspana(semana.finISO)}</strong>
            </p>

            <p className="text-slate-500 text-sm mt-1">
              Hoy: <strong className="capitalize">{hoyDia}</strong>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link href="/admin" className="rounded-xl border bg-white px-4 py-3">
              Volver
            </Link>

            <button
              onClick={limpiarImpresosAnteriores}
              className="bg-white border rounded-xl px-4 py-3 flex items-center justify-center gap-2"
            >
              <Eraser className="w-4 h-4" />
              Limpiar impresos antiguos
            </button>

            <button
              onClick={cargarDatos}
              className="bg-black text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Previstas hoy</p>
            <p className="text-3xl font-bold">{previstasHoy}</p>
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
            <p className="text-3xl font-bold text-red-700">{fueraDeDia}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-yellow-700">Pendientes antiguos</p>
            <p className="text-3xl font-bold text-yellow-800">{pendientesAntiguos}</p>
          </div>
        </section>

        {pendientesAntiguos > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Hay pedidos antiguos no impresos. No se borran automáticamente.
          </div>
        )}

        {fueraDeDia > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Hay pedidos fuera de su día habitual. Aparecen en rojo.
          </div>
        )}

        {mensaje && (
          <div className="bg-white border rounded-xl p-4 text-sm">{mensaje}</div>
        )}

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold">Control de pedidos</h2>
            {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Fecha</th>
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
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No hay pedidos ni tiendas pendientes.
                    </td>
                  </tr>
                )}

                {filas.map(
                  ({ cliente, pedido, fueraDeDia, pendienteAntiguo }, index) => {
                    const recibido = Boolean(pedido);
                    const impreso = Boolean(pedido?.impreso);

                    return (
                      <tr
                        key={pedido?.id || cliente?.id || index}
                        className={`border-t ${
                          pendienteAntiguo
                            ? "bg-yellow-50"
                            : fueraDeDia
                              ? "bg-red-50"
                              : ""
                        }`}
                      >
                        <td className="p-3">
                          {pedido?.fecha ? fechaEspana(pedido.fecha) : "-"}
                        </td>

                        <td className="p-3">{cliente?.codigo || "-"}</td>

                        <td className="p-3 font-semibold">
                          {cliente?.nombre || `Cliente ID ${pedido?.cliente_id || "-"}`}
                        </td>

                        <td className="p-3">{cliente?.ruta || "-"}</td>

                        <td className="p-3">{cliente?.telefono || "-"}</td>

                        <td className="p-3">
                          {pendienteAntiguo ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 px-3 py-1 text-xs font-semibold">
                              <CalendarDays className="w-3 h-3" />
                              Pendiente antiguo
                            </span>
                          ) : fueraDeDia ? (
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
                                className="rounded-lg border px-3 py-2 flex items-center gap-1 bg-white"
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
                                  className="rounded-lg border px-3 py-2 bg-white"
                                >
                                  Marcar impreso
                                </button>
                              )}

                              <button
                                onClick={() => borrarPedido(pedido.id)}
                                className="rounded-lg border border-red-200 text-red-700 bg-red-50 px-3 py-2 flex items-center gap-1"
                              >
                                <Trash2 className="w-4 h-4" />
                                Borrar
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">Sin pedido</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
