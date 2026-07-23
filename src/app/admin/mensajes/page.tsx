"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  Package,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
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

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  departamento: string;
  imagen_url: string | null;
  activo: boolean | null;
};

type MensajeCliente = {
  id: string;
  mensaje: string;
  cliente_id: number | null;
  dia_pedido: string | null;
  para_todos: boolean | null;
  activo: boolean | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  mostrar_una_sola_vez: boolean | null;
  creado_en: string;
  imagen_url: string | null;
  articulo_id: string | null;
  articulo_nombre: string | null;
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

function fechaEspana(fecha: string | null) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-ES");
}

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
  const [productos, setProductos] = useState<Producto[]>([]);
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
  const [fechaInicio, setFechaInicio] = useState(fechaHoyISO());
  const [fechaFin, setFechaFin] = useState("");
  const [mostrarUnaSolaVez, setMostrarUnaSolaVez] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState({
    mensaje: "",
    fecha_inicio: "",
    fecha_fin: "",
    mostrar_una_sola_vez: false,
    activo: true,
    quitar_imagen: false,
  });

  const [busquedaArticulo, setBusquedaArticulo] = useState("");
  const [articuloSeleccionado, setArticuloSeleccionado] =
    useState<Producto | null>(null);

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
      .select(
        "id, mensaje, cliente_id, dia_pedido, para_todos, activo, fecha_inicio, fecha_fin, mostrar_una_sola_vez, creado_en, imagen_url, articulo_id, articulo_nombre"
      )
      .order("creado_en", { ascending: false });

    if (mensajesError) {
      setMensajeError(JSON.stringify(mensajesError));
      setCargando(false);
      return;
    }

    const { data: productosData, error: productosError } = await supabase
      .from("productos")
      .select("id, codigo, nombre, departamento, imagen_url, activo")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (productosError) {
      setMensajeError(JSON.stringify(productosError));
      setCargando(false);
      return;
    }

    setClientes((clientesData || []) as Cliente[]);
    setMensajes((mensajesData || []) as MensajeCliente[]);
    setProductos((productosData || []) as Producto[]);
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

  const articulosFiltrados = useMemo(() => {
    const q = busquedaArticulo.toLowerCase().trim();

    if (!q) return [];

    return productos
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigo || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [productos, busquedaArticulo]);

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
      fecha_inicio: fechaInicio || fechaHoyISO(),
      fecha_fin: fechaFin || null,
      mostrar_una_sola_vez: mostrarUnaSolaVez,
      activo: true,
      imagen_url: articuloSeleccionado?.imagen_url || null,
      articulo_id: articuloSeleccionado?.id || null,
      articulo_nombre: articuloSeleccionado?.nombre || null,
    };

    const { error } = await supabase
      .from("mensajes_clientes")
      .insert(nuevoMensaje);

    if (error) {
      setMensajeError(JSON.stringify(error));
      return;
    }

    await cargarDatos();
    setArticuloSeleccionado(null);
    setBusquedaArticulo("");

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

  function empezarEdicion(m: MensajeCliente) {
    setEditandoId(m.id);
    setEdicion({
      mensaje: m.mensaje || "",
      fecha_inicio: m.fecha_inicio || fechaHoyISO(),
      fecha_fin: m.fecha_fin || "",
      mostrar_una_sola_vez: Boolean(m.mostrar_una_sola_vez),
      activo: Boolean(m.activo),
      quitar_imagen: false,
    });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setEdicion({
      mensaje: "",
      fecha_inicio: "",
      fecha_fin: "",
      mostrar_una_sola_vez: false,
      activo: true,
      quitar_imagen: false,
    });
  }

  async function guardarEdicion(id: string) {
    setMensajeError("");
    setMensajeOk("");

    if (!edicion.mensaje.trim()) {
      setMensajeError("El mensaje no puede estar vacío.");
      return;
    }

    const camposActualizados: Record<string, unknown> = {
      mensaje: edicion.mensaje.trim(),
      fecha_inicio: edicion.fecha_inicio || fechaHoyISO(),
      fecha_fin: edicion.fecha_fin || null,
      mostrar_una_sola_vez: edicion.mostrar_una_sola_vez,
      activo: edicion.activo,
    };

    if (edicion.quitar_imagen) {
      camposActualizados.imagen_url = null;
      camposActualizados.articulo_id = null;
      camposActualizados.articulo_nombre = null;
    }

    const { error } = await supabase
      .from("mensajes_clientes")
      .update(camposActualizados)
      .eq("id", id);

    if (error) {
      setMensajeError(JSON.stringify(error));
      return;
    }

    cancelarEdicion();
    await cargarDatos();
    setMensajeOk("Aviso modificado correctamente.");
  }

  async function cambiarActivoMensaje(m: MensajeCliente) {
    const nuevoEstado = !m.activo;

    const confirmar = window.confirm(
      nuevoEstado
        ? "¿Quieres reactivar este aviso?"
        : "¿Quieres desactivar este aviso?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("mensajes_clientes")
      .update({ activo: nuevoEstado })
      .eq("id", m.id);

    if (error) {
      setMensajeError(JSON.stringify(error));
      return;
    }

    await cargarDatos();
    setMensajeOk(nuevoEstado ? "Aviso reactivado." : "Aviso desactivado.");
  }

  async function borrarMensaje(id: string) {
    const confirmar = window.confirm(
      "¿Seguro que quieres borrar definitivamente este aviso? Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("mensajes_clientes")
      .delete()
      .eq("id", id);

    if (error) {
      setMensajeError(JSON.stringify(error));
      return;
    }

    if (editandoId === id) cancelarEdicion();

    await cargarDatos();
    setMensajeOk("Aviso borrado definitivamente.");
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

          <div className="space-y-2">
            <label className="block text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Imagen del aviso (opcional)
            </label>

            <p className="text-xs text-slate-500">
              Busca el artículo que quieres anunciar y se usará la foto que ya
              tiene en el catálogo. No hace falta subir una imagen nueva.
            </p>

            {articuloSeleccionado ? (
              <div className="flex items-center gap-3 border rounded-xl p-3 bg-slate-50">
                {articuloSeleccionado.imagen_url ? (
                  <img
                    src={articuloSeleccionado.imagen_url}
                    alt={articuloSeleccionado.nombre}
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center rounded-lg border bg-white text-slate-400 text-xs text-center px-1">
                    Sin foto
                  </div>
                )}

                <div className="flex-1">
                  <p className="font-semibold">{articuloSeleccionado.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {articuloSeleccionado.codigo || "sin código"}
                  </p>
                  {!articuloSeleccionado.imagen_url && (
                    <p className="text-xs text-amber-600">
                      Este artículo todavía no tiene foto en Productos.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() =>
                      setMensaje(
                        `Os informamos de este nuevo producto: ${articuloSeleccionado.nombre}.`
                      )
                    }
                    className="rounded-lg border px-3 py-2 bg-white text-sm"
                  >
                    Usar texto de ejemplo
                  </button>

                  <button
                    onClick={() => {
                      setArticuloSeleccionado(null);
                      setBusquedaArticulo("");
                    }}
                    className="rounded-lg border px-3 py-2 bg-white flex items-center gap-1 text-sm"
                  >
                    <X className="w-4 h-4" />
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />

                <input
                  value={busquedaArticulo}
                  onChange={(e) => setBusquedaArticulo(e.target.value)}
                  placeholder="Buscar artículo por nombre o código..."
                  className="w-full border rounded-xl py-3 pl-10 pr-4"
                />

                {articulosFiltrados.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-72 overflow-y-auto">
                    {articulosFiltrados.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setArticuloSeleccionado(p);
                          setBusquedaArticulo("");
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left border-b last:border-b-0"
                      >
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            className="w-10 h-10 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center rounded-lg border bg-slate-50 text-slate-400 text-[10px] text-center">
                            Sin foto
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-sm">{p.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {p.codigo || "sin código"} · {p.departamento}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Fecha inicio
              </label>

              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Fecha fin
              </label>

              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <label className="flex items-center gap-3 border rounded-xl px-4 py-3 font-semibold bg-white">
              <input
                type="checkbox"
                checked={mostrarUnaSolaVez}
                onChange={(e) => setMostrarUnaSolaVez(e.target.checked)}
                className="w-5 h-5"
              />

              Mostrar una sola vez
            </label>
          </div>

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
                  <th className="text-left p-3">Vigencia</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {!cargando && mensajes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No hay avisos creados.
                    </td>
                  </tr>
                )}

                {mensajes.map((m) => {
                  const editando = editandoId === m.id;

                  return (
                    <tr key={m.id} className="border-t align-top">
                      <td className="p-3 font-semibold">
                        {destinoMensaje(m)}

                        <p className="text-xs text-slate-500 mt-1">
                          Ref. {m.id.slice(0, 8)}
                        </p>
                      </td>

                      <td className="p-3 max-w-xl">
                        {editando ? (
                          <div className="space-y-2">
                            <textarea
                              value={edicion.mensaje}
                              onChange={(e) =>
                                setEdicion({
                                  ...edicion,
                                  mensaje: e.target.value,
                                })
                              }
                              rows={4}
                              className="w-full border rounded-xl p-3"
                            />

                            {m.imagen_url && !edicion.quitar_imagen && (
                              <div className="flex items-center gap-2">
                                <img
                                  src={m.imagen_url}
                                  alt={m.articulo_nombre || "Imagen del aviso"}
                                  className="w-12 h-12 object-cover rounded-lg border"
                                />

                                <label className="flex items-center gap-2 text-xs font-semibold">
                                  <input
                                    type="checkbox"
                                    checked={edicion.quitar_imagen}
                                    onChange={(e) =>
                                      setEdicion({
                                        ...edicion,
                                        quitar_imagen: e.target.checked,
                                      })
                                    }
                                  />
                                  Quitar imagen
                                </label>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {m.imagen_url && (
                              <img
                                src={m.imagen_url}
                                alt={m.articulo_nombre || "Imagen del aviso"}
                                className="w-20 h-20 object-cover rounded-lg border"
                              />
                            )}

                            <p className="line-clamp-4 whitespace-pre-wrap">
                              {m.mensaje}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-sm min-w-52">
                        {editando ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                Inicio
                              </label>
                              <input
                                type="date"
                                value={edicion.fecha_inicio}
                                onChange={(e) =>
                                  setEdicion({
                                    ...edicion,
                                    fecha_inicio: e.target.value,
                                  })
                                }
                                className="w-full border rounded-lg px-3 py-2"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-slate-500 mb-1">
                                Fin
                              </label>
                              <input
                                type="date"
                                value={edicion.fecha_fin}
                                onChange={(e) =>
                                  setEdicion({
                                    ...edicion,
                                    fecha_fin: e.target.value,
                                  })
                                }
                                className="w-full border rounded-lg px-3 py-2"
                              />
                            </div>

                            <label className="flex items-center gap-2 text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={edicion.mostrar_una_sola_vez}
                                onChange={(e) =>
                                  setEdicion({
                                    ...edicion,
                                    mostrar_una_sola_vez: e.target.checked,
                                  })
                                }
                              />
                              Una sola vez
                            </label>
                          </div>
                        ) : (
                          <>
                            <p>
                              Desde: <strong>{fechaEspana(m.fecha_inicio)}</strong>
                            </p>
                            <p>
                              Hasta: <strong>{fechaEspana(m.fecha_fin)}</strong>
                            </p>
                            {m.mostrar_una_sola_vez && (
                              <p className="text-blue-700 font-semibold">
                                Una sola vez
                              </p>
                            )}
                          </>
                        )}
                      </td>

                      <td className="p-3">
                        {editando ? (
                          <label className="flex items-center gap-2 text-sm font-semibold">
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
                        ) : m.activo ? (
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
                        {editando ? (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => guardarEdicion(m.id)}
                              className="rounded-lg bg-black text-white px-3 py-2"
                            >
                              Guardar
                            </button>

                            <button
                              onClick={cancelarEdicion}
                              className="rounded-lg border px-3 py-2 bg-white"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => empezarEdicion(m)}
                              className="rounded-lg border px-3 py-2 bg-white"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => cambiarActivoMensaje(m)}
                              className="rounded-lg border px-3 py-2 bg-white"
                            >
                              {m.activo ? "Desactivar" : "Reactivar"}
                            </button>

                            <button
                              onClick={() => borrarMensaje(m.id)}
                              className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2"
                            >
                              Borrar
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
