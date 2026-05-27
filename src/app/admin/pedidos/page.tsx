"use client";

import React, { useEffect, useMemo, useState } from "react";
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

type PedidoFila = {
  pedido: Pedido;
  cliente: Cliente | null;
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

function clasePedido(pedido: Pedido, pendienteAntiguo: boolean) {
  if (pendienteAntiguo) return "bg-yellow-50 border-l-4 border-yellow-500";
  if (pedido.impreso) return "bg-green-50 border-l-4 border-green-500";
  if (pedido.fuera_de_dia) return "bg-orange-50 border-l-4 border-orange-500";
  return "bg-white";
}

export default function AdminPedidosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<PedidoFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState<
    "todos" | "faltan" | "sin_imprimir" | "impresos" | "fuera_dia" | "antiguos"
  >("todos");

  const hoyDia = diaHoyEspana();
  const hoyISO = fechaHoyISO();
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

    const clientesLista = (clientesData || []) as Cliente[];
    setClientes(clientesLista);

    const { data: pedidosSemanaData, error: pedidosSemanaError } = await supabase
      .from("pedidos")
      .select("id, cliente_id, fecha, estado, impreso, creado_en, fuera_de_dia")
      .gte("fecha", semana.inicioISO)
      .lte("fecha", semana.finISO)
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
        .order("fecha", { ascending: true })
        .order("creado_en", { ascending: false });

    if (pendientesAntiguosError) {
      setMensaje(JSON.stringify(pendientesAntiguosError));
      setCargando(false);
      return;
    }

    const pedidosSemana = ((pedidosSemanaData || []) as Pedido[]).filter(
      (pedido) => pedido.estado !== "sustituido"
    );

    const pendientesAntiguos = ((pendientesAntiguosData || []) as Pedido[]).filter(
      (pedido) => pedido.estado !== "sustituido"
    );

    const filas: PedidoFila[] = [
      ...pedidosSemana.map((pedido) => ({
        pedido,
        cliente:
          clientesLista.find((c) => Number(c.id) === Number(pedido.cliente_id)) ||
          null,
        pendienteAntiguo: false,
      })),
      ...pendientesAntiguos.map((pedido) => ({
        pedido,
        cliente:
          clientesLista.find((c) => Number(c.id) === Number(pedido.cliente_id)) ||
          null,
        pendienteAntiguo: true,
      })),
    ];

    filas.sort((a, b) => {
      const nombreA = a.cliente?.nombre || "";
      const nombreB = b.cliente?.nombre || "";

      if (nombreA !== nombreB) return nombreA.localeCompare(nombreB, "es");

      const fechaA = a.pedido.fecha || "";
      const fechaB = b.pedido.fecha || "";

      if (fechaA !== fechaB) return fechaB.localeCompare(fechaA);

      return (b.pedido.creado_en || "").localeCompare(a.pedido.creado_en || "");
    });

    setPedidos(filas);
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

  const clientesConPedidoHoy = useMemo(() => {
    return new Set(
      pedidos
        .filter(({ pedido }) => pedido.fecha === hoyISO)
        .map(({ pedido }) => Number(pedido.cliente_id))
    );
  }, [pedidos, hoyISO]);

  const tiendasQueFaltan = clientes.filter(
    (cliente) =>
      normalizarDia(cliente.dia_pedido) === hoyDia &&
      !clientesConPedidoHoy.has(Number(cliente.id))
  );

  const recibidosSinImprimir = pedidos.filter(
    ({ pedido }) => !pedido.impreso
  ).length;

  const impresos = pedidos.filter(({ pedido }) => pedido.impreso).length;

  const fueraDeDia = pedidos.filter(
    ({ pedido }) => pedido.fuera_de_dia
  ).length;

  const pendientesAntiguos = pedidos.filter(
    ({ pendienteAntiguo }) => pendienteAntiguo
  ).length;

  const mostrarFaltan =
    filtro === "todos" || filtro === "faltan";

  const pedidosFiltrados = pedidos.filter(({ pedido, pendienteAntiguo }) => {
    if (filtro === "todos") return true;
    if (filtro === "sin_imprimir") return !pedido.impreso;
    if (filtro === "impresos") return Boolean(pedido.impreso);
    if (filtro === "fuera_dia") return Boolean(pedido.fuera_de_dia);
    if (filtro === "antiguos") return pendienteAntiguo;
    if (filtro === "faltan") return false;
    return true;
  });

  function claseTarjeta(activo: boolean, base: string) {
    return `${base} rounded-2xl p-4 shadow text-left transition ${
      activo ? "ring-4 ring-black/20 scale-[1.02]" : "hover:scale-[1.01]"
    }`;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Control de pedidos
            </h1>

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

        <section className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <button
            onClick={() => setFiltro("todos")}
            className={claseTarjeta(
              filtro === "todos",
              "bg-slate-900 text-white"
            )}
          >
            <p className="text-sm text-slate-200">Ver</p>
            <p className="text-3xl font-bold">Todos</p>
          </button>

          <button
            onClick={() => setFiltro("faltan")}
            className={claseTarjeta(
              filtro === "faltan",
              "bg-red-50 border border-red-200 text-red-700"
            )}
          >
            <p className="text-sm">Faltan por pedir</p>
            <p className="text-4xl font-bold">{tiendasQueFaltan.length}</p>
          </button>

          <button
            onClick={() => setFiltro("sin_imprimir")}
            className={claseTarjeta(
              filtro === "sin_imprimir",
              "bg-white"
            )}
          >
            <p className="text-sm text-slate-500">Recibidos sin imprimir</p>
            <p className="text-4xl font-bold">{recibidosSinImprimir}</p>
          </button>

          <button
            onClick={() => setFiltro("impresos")}
            className={claseTarjeta(
              filtro === "impresos",
              "bg-green-50 border border-green-200 text-green-700"
            )}
          >
            <p className="text-sm">Impresos</p>
            <p className="text-4xl font-bold">{impresos}</p>
          </button>

          <button
            onClick={() => setFiltro("fuera_dia")}
            className={claseTarjeta(
              filtro === "fuera_dia",
              "bg-orange-50 border border-orange-200 text-orange-700"
            )}
          >
            <p className="text-sm">Fuera de día</p>
            <p className="text-4xl font-bold">{fueraDeDia}</p>
          </button>

          <button
            onClick={() => setFiltro("antiguos")}
            className={claseTarjeta(
              filtro === "antiguos",
              "bg-yellow-50 border border-yellow-200 text-yellow-800"
            )}
          >
            <p className="text-sm">Pendientes antiguos</p>
            <p className="text-4xl font-bold">{pendientesAntiguos}</p>
          </button>
        </section>

        {mensaje && (
          <div className="bg-white border rounded-xl p-4 text-sm">{mensaje}</div>
        )}

<section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">
              Tiendas que faltan hoy
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Tienda</th>
                  <th className="text-left p-3">Teléfono</th>
                  <th className="text-left p-3">Ruta</th>
                  <th className="text-left p-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && tiendasQueFaltan.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      No faltan tiendas de hoy.
                    </td>
                  </tr>
                )}

                {tiendasQueFaltan.map((cliente) => {
                  const telefonoFormateado = formatearTelefono(cliente.telefono);
                  const telefonoLimpio = (cliente.telefono || "").replace(
                    /\D/g,
                    ""
                  );

                  return (
                    <tr key={cliente.id} className="border-t bg-red-50">
                      <td className="p-3">
                        <p className="font-bold text-base">{cliente.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Código {cliente.codigo || "-"}
                        </p>
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

                      <td className="p-3">{cliente.ruta || "-"}</td>

                      <td className="p-3">
                        {telefonoLimpio ? (
                          <a
                            href={`tel:${telefonoLimpio}`}
                            className="rounded-lg bg-red-600 text-white px-3 py-2 inline-flex items-center gap-1"
                          >
                            <Phone className="w-4 h-4" />
                            Llamar
                          </a>
                        ) : (
                          <span className="text-slate-400">Sin teléfono</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

<section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">
                Pedidos recibidos
              </h2>

              <p className="text-sm text-slate-500">
                Mostrando: <strong>{pedidosFiltrados.length}</strong> de{" "}
                <strong>{pedidos.length}</strong>. Cada fila es
                un pedido real de Supabase.
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
                {!cargando && pedidosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No hay pedidos recibidos.
                    </td>
                  </tr>
                )}

                {pedidosFiltrados.map(({ pedido, cliente, pendienteAntiguo }) => {
                  const telefonoFormateado = formatearTelefono(
                    cliente?.telefono || null
                  );
                  const telefonoLimpio = (cliente?.telefono || "").replace(
                    /\D/g,
                    ""
                  );

                  return (
                    <tr
                      key={pedido.id}
                      className={`border-t ${clasePedido(
                        pedido,
                        pendienteAntiguo
                      )}`}
                    >
                      <td className="p-3">
                        <p className="font-bold text-base">
                          {cliente?.nombre || `Cliente ID ${pedido.cliente_id}`}
                        </p>

                        <p className="text-xs text-slate-500">
                          Código {cliente?.codigo || "-"}
                        </p>
                      </td>

                      <td className="p-3">
                        <p className="font-bold">{fechaEspana(pedido.fecha)}</p>

                        <p className="text-xs text-slate-500">
                          {horaEspana(pedido.creado_en)} · Ref.{" "}
                          {pedido.id.slice(0, 8)}
                        </p>
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
                        {pendienteAntiguo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 px-3 py-1 text-xs font-semibold">
                            <CalendarDays className="w-3 h-3" />
                            Pendiente antiguo
                          </span>
                        ) : pedido.impreso ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Impreso
                          </span>
                        ) : pedido.fuera_de_dia ? (
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
}        {mostrarFaltan && (
        )}


