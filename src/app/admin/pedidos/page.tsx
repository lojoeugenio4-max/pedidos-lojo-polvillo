"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  Clock,
  Eraser,
  Eye,
  Phone,
  Printer,
  RefreshCw,
  Trash2,
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
  estado: string | null;
  impreso: boolean | null;
  creado_en: string;
  fuera_de_dia: boolean | null;
};

type FilaControl = {
  tipo: "pedido" | "falta";
  cliente: Cliente | null;
  pedido: Pedido | null;
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

function fechaHoyISO() {
  return fechaISODesdeDate(fechaMadrid());
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

function horaEspana(fecha: string) {
  return new Date(fecha).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearTelefono(telefono: string | null) {
  const limpio = (telefono || "").replace(/\D/g, "");
  if (!limpio) return "-";
  return limpio.replace(/(.{3})/g, "$1.").replace(/\.$/, "");
}

function claseFila(fila: FilaControl) {
  if (fila.tipo === "falta") return "bg-red-50 border-l-4 border-red-500";
  if (fila.pendienteAntiguo) return "bg-yellow-50 border-l-4 border-yellow-500";
  if (fila.pedido?.impreso) return "bg-green-50 border-l-4 border-green-500";
  if (fila.pedido?.fuera_de_dia) return "bg-orange-50 border-l-4 border-orange-500";
  return "bg-white";
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

    const hoyISO = fechaHoyISO();

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
      .neq("estado", "sustituido")
      .order("fecha", { ascending: false })
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
        .neq("estado", "sustituido")
        .order("fecha", { ascending: true })
        .order("creado_en", { ascending: false });

    if (pendientesAntiguosError) {
      setMensaje(JSON.stringify(pendientesAntiguosError));
      setCargando(false);
      return;
    }

    const clientes = (clientesData || []) as Cliente[];
    const pedidosSemana = (pedidosSemanaData || []) as Pedido[];
    const pendientesAntiguos = (pendientesAntiguosData || []) as Pedido[];

    const filasPedidosSemana: FilaControl[] = pedidosSemana.map((pedido) => {
      const cliente =
        clientes.find((c) => Number(c.id) === Number(pedido.cliente_id)) || null;

      return {
        tipo: "pedido",
        cliente,
        pedido,
        pendienteAntiguo: false,
      };
    });

    const filasPendientesAntiguos: FilaControl[] = pendientesAntiguos.map(
      (pedido) => {
        const cliente =
          clientes.find((c) => Number(c.id) === Number(pedido.cliente_id)) || null;

        return {
          tipo: "pedido",
          cliente,
          pedido,
          pendienteAntiguo: true,
        };
      }
    );

    const clientesPrevistosHoy = clientes.filter(
      (cliente) => normalizarDia(cliente.dia_pedido) === hoyDia
    );

    const clientesConPedidoHoy = new Set(
      pedidosSemana
        .filter((pedido) => pedido.fecha === hoyISO)
        .map((pedido) => Number(pedido.cliente_id))
    );

    const filasFaltanHoy: FilaControl[] = clientesPrevistosHoy
      .filter((cliente) => !clientesConPedidoHoy.has(Number(cliente.id)))
      .map((cliente) => ({
        tipo: "falta",
        cliente,
        pedido: null,
        pendienteAntiguo: false,
      }));

    const filasOrdenadas = [
      ...filasFaltanHoy,
      ...filasPendientesAntiguos,
      ...filasPedidosSemana,
    ].sort((a, b) => {
      const prioridadA =
        a.tipo === "falta"
          ? 1
          : a.pendienteAntiguo
            ? 2
            : !a.pedido?.impreso
              ? 3
              : 4;

      const prioridadB =
        b.tipo === "falta"
          ? 1
          : b.pendienteAntiguo
            ? 2
            : !b.pedido?.impreso
              ? 3
              : 4;

      if (prioridadA !== prioridadB) return prioridadA - prioridadB;

      const rutaA = a.cliente?.ruta || "";
      const rutaB = b.cliente?.ruta || "";
      if (rutaA !== rutaB) return rutaA.localeCompare(rutaB);

      const nombreA = a.cliente?.nombre || "";
      const nombreB = b.cliente?.nombre || "";
      if (nombreA !== nombreB) return nombreA.localeCompare(nombreB, "es");

      const fechaA = a.pedido?.fecha || "";
      const fechaB = b.pedido?.fecha || "";
      if (fechaA !== fechaB) return fechaB.localeCompare(fechaA);

      const creadoA = a.pedido?.creado_en || "";
      const creadoB = b.pedido?.creado_en || "";
      return creadoB.localeCompare(creadoA);
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

  const faltan = filas.filter((fila) => fila.tipo === "falta").length;
  const recibidasSinImprimir = filas.filter(
    (fila) => fila.pedido && !fila.pedido.impreso
  ).length;
  const impresas = filas.filter((fila) => fila.pedido?.impreso).length;
  const fueraDeDia = filas.filter((fila) => fila.pedido?.fuera_de_dia).length;
  const pendientesAntiguos = filas.filter((fila) => fila.pendienteAntiguo).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Control de pedidos</h1>

            <p className="text-slate-600 mt-2">
              Hoy deben pedir las tiendas de{" "}
              <strong className="capitalize">{hoyDia}</strong>
            </p>

            <p className="text-slate-500 text-sm mt-1">
              Semana operativa: <strong>{fechaEspana(semana.inicioISO)}</strong>{" "}
              a <strong>{fechaEspana(semana.finISO)}</strong>
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

        <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-red-700">Faltan por pedir</p>
            <p className="text-4xl font-bold text-red-700">{faltan}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <p className="text-sm text-slate-500">Recibidos sin imprimir</p>
            <p className="text-4xl font-bold">{recibidasSinImprimir}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-green-700">Impresos</p>
            <p className="text-4xl font-bold text-green-700">{impresas}</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-orange-700">Fuera de día</p>
            <p className="text-4xl font-bold text-orange-700">{fueraDeDia}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow">
            <p className="text-sm text-yellow-700">Pendientes antiguos</p>
            <p className="text-4xl font-bold text-yellow-800">{pendientesAntiguos}</p>
          </div>
        </section>

        {mensaje && (
          <div className="bg-white border rounded-xl p-4 text-sm">{mensaje}</div>
        )}

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Pedidos y tiendas pendientes</h2>
              <p className="text-sm text-slate-500">
                Cada pedido aparece como una fila independiente. Si una tienda manda varios pedidos, se verán todos.
              </p>
            </div>

            {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Tienda</th>
                  <th className="text-left p-3">Pedido</th>
                  <th className="text-left p-3">Teléfono</th>
                  <th className="text-left p-3">Ruta</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && filas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No hay tiendas ni pedidos pendientes.
                    </td>
                  </tr>
                )}

                {filas.map(({ tipo, cliente, pedido, pendienteAntiguo }, index) => {
                  const telefonoFormateado = formatearTelefono(cliente?.telefono || null);
                  const telefonoLimpio = (cliente?.telefono || "").replace(/\D/g, "");

                  return (
                    <tr
                      key={pedido?.id || `cliente-${cliente?.id || index}`}
                      className={`border-t ${claseFila({
                        tipo,
                        cliente,
                        pedido,
                        pendienteAntiguo,
                      })}`}
                    >
                      <td className="p-3">
                        <p className="font-bold text-base">
                          {cliente?.nombre || `Cliente ID ${pedido?.cliente_id || "-"}`}
                        </p>

                        <p className="text-xs text-slate-500">
                          Código {cliente?.codigo || "-"}
                        </p>
                      </td>

                      <td className="p-3">
                        {pedido ? (
                          <div>
                            <p className="font-bold">{fechaEspana(pedido.fecha)}</p>

                            <p className="text-xs text-slate-500">
                              {horaEspana(pedido.creado_en)} · Ref. {pedido.id.slice(0, 8)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin pedido</span>
                        )}
                      </td>

                      <td className="p-3">
                        {telefonoLimpio ? (
                          <a
                            href={`tel:${telefonoLimpio}`}
                            className="inline-flex items-center gap-2 font-bold text-base"
                          >
                            <Phone className="w-4 h-4" />
                            {telefonoFormateado}
                          </a>
                        ) : (
                          <span className="text-slate-400">Sin teléfono</span>
                        )}
                      </td>

                      <td className="p-3">{cliente?.ruta || "-"}</td>

                      <td className="p-3">
                        {tipo === "falta" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">
                            <Clock className="w-3 h-3" />
                            Falta llamar
                          </span>
                        ) : pendienteAntiguo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 px-3 py-1 text-xs font-semibold">
                            <CalendarDays className="w-3 h-3" />
                            Pendiente antiguo
                          </span>
                        ) : pedido?.impreso ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Impreso
                          </span>
                        ) : pedido?.fuera_de_dia ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            Fuera de día
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Recibido sin imprimir
                          </span>
                        )}
                      </td>

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
                        ) : telefonoLimpio ? (
                          <a
                            href={`tel:${telefonoLimpio}`}
                            className="rounded-lg bg-red-600 text-white px-3 py-2 inline-flex items-center gap-1"
                          >
                            <Phone className="w-4 h-4" />
                            Llamar
                          </a>
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
      </div>
    </main>
  );
}
