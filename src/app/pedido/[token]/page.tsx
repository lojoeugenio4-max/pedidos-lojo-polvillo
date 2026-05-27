"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Send,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

const departamentos = ["Bebidas", "Charcutería"];

type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  departamento: string;
  categoria: string;
  unidad: string | null;
  orden_preparacion: number | null;
  activo: boolean | null;
  imagen_url: string | null;
};

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

type LineaPedido = Producto & {
  cajas: number;
  unidades: number;
};

type Pedido = {
  [key: string]: LineaPedido;
};

type PedidoExistente = {
  id: string;
  cliente_id: number;
  fecha: string;
  estado: string | null;
  impreso: boolean;
  creado_en: string;
  fuera_de_dia: boolean | null;
};

type LineaPedidoExistente = {
  codigo_articulo: string;
  nombre_articulo: string;
  departamento: string;
  cajas: number;
  unidades: number;
};

function normalizarTexto(valor: string | null) {
  return (valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function diaHoyEspana() {
  return normalizarTexto(
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

function irAlPrimerArticulo() {
  window.setTimeout(() => {
    const primerArticulo = document.querySelector(
      "[data-producto-visible='true']"
    ) as HTMLElement | null;

    const cabecera = document.getElementById("cabecera-filtros");
    const alturaCabecera = cabecera ? cabecera.offsetHeight : 0;

    if (primerArticulo) {
      const posicion =
        primerArticulo.getBoundingClientRect().top +
        window.scrollY -
        alturaCabecera -
        12;

      window.scrollTo({
        top: Math.max(posicion, 0),
        behavior: "smooth",
      });

      return;
    }

    const inicio = document.getElementById("inicio-articulos");

    if (inicio) {
      const posicion =
        inicio.getBoundingClientRect().top +
        window.scrollY -
        alturaCabecera -
        12;

      window.scrollTo({
        top: Math.max(posicion, 0),
        behavior: "smooth",
      });
    }
  }, 250);
}

export default function PedidoClientePage() {
  const params = useParams();
  const token = String(params.token);

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargandoCliente, setCargandoCliente] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [departamento, setDepartamento] = useState("Bebidas");
  const [categoria, setCategoria] = useState("Todas");
  const [pedido, setPedido] = useState<Pedido>({});
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [ultimoArticulo, setUltimoArticulo] = useState<string | null>(null);
  const [scrollPendiente, setScrollPendiente] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);
  const [pedidoExistente, setPedidoExistente] =
    useState<PedidoExistente | null>(null);
  const [pedidoImpresoHoy, setPedidoImpresoHoy] =
    useState<PedidoExistente | null>(null);

  async function cargarCliente() {
    setCargandoCliente(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("Clientes")
      .select("id, codigo, nombre, telefono, dia_pedido, ruta, activo, token_pedido")
      .eq("token_pedido", token)
      .single();

    if (error) {
      setMensaje("No se ha encontrado el enlace de pedido.");
      setCargandoCliente(false);
      return;
    }

    const clienteEncontrado = data as Cliente;

    if (clienteEncontrado.activo === false) {
      setMensaje("Este enlace de pedido no está activo.");
      setCliente(null);
      setCargandoCliente(false);
      return;
    }

    setCliente(clienteEncontrado);
    setCargandoCliente(false);
  }

  async function cargarProductos() {
    setCargandoProductos(true);

    const { data, error } = await supabase
      .from("productos")
      .select(
        "id, codigo, nombre, departamento, categoria, unidad, orden_preparacion, activo, imagen_url"
      )
      .eq("activo", true)
      .order("departamento", { ascending: true })
      .order("orden_preparacion", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje(JSON.stringify(error));
      setCargandoProductos(false);
      return;
    }

    const productosNormalizados = (data || []).map((p) => ({
      ...p,
      categoria: p.categoria || "Sin categoría",
    })) as Producto[];

    setProductos(productosNormalizados);
    setCargandoProductos(false);
  }

  async function cargarPedidoExistente(
    clienteId: number,
    productosBase: Producto[]
  ) {
    const fechaHoy = fechaHoyISO();

    const { data: pedidosNoImpresosData, error: noImpresosError } =
      await supabase
        .from("pedidos")
        .select("id, cliente_id, fecha, estado, impreso, creado_en, fuera_de_dia")
        .eq("cliente_id", clienteId)
        .eq("fecha", fechaHoy)
        .eq("impreso", false)
        .neq("estado", "sustituido")
        .order("creado_en", { ascending: false })
        .limit(1);

    if (noImpresosError) {
      setMensaje(JSON.stringify(noImpresosError));
      return;
    }

    const pedidoNoImpreso =
      ((pedidosNoImpresosData || [])[0] as PedidoExistente | undefined) ||
      null;

    const { data: pedidosImpresosData, error: impresosError } = await supabase
      .from("pedidos")
      .select("id, cliente_id, fecha, estado, impreso, creado_en, fuera_de_dia")
      .eq("cliente_id", clienteId)
      .eq("fecha", fechaHoy)
      .eq("impreso", true)
      .neq("estado", "sustituido")
      .order("creado_en", { ascending: false })
      .limit(1);

    if (impresosError) {
      setMensaje(JSON.stringify(impresosError));
      return;
    }

    const pedidoImpreso =
      ((pedidosImpresosData || [])[0] as PedidoExistente | undefined) || null;

    setPedidoExistente(pedidoNoImpreso);
    setPedidoImpresoHoy(pedidoNoImpreso ? null : pedidoImpreso);

    if (!pedidoNoImpreso) {
      setPedido({});
      return;
    }

    const { data: lineasData, error: lineasError } = await supabase
      .from("lineas_pedido")
      .select("codigo_articulo, nombre_articulo, departamento, cajas, unidades")
      .eq("pedido_id", pedidoNoImpreso.id);

    if (lineasError) {
      setMensaje(JSON.stringify(lineasError));
      return;
    }

    const lineas = (lineasData || []) as LineaPedidoExistente[];
    const pedidoCargado: Pedido = {};

    lineas.forEach((linea) => {
      const producto =
        productosBase.find((p) => p.codigo === linea.codigo_articulo) || null;

      if (!producto) return;

      pedidoCargado[producto.codigo] = {
        ...producto,
        cajas: Number(linea.cajas) || 0,
        unidades: Number(linea.unidades) || 0,
      };
    });

    setPedido(pedidoCargado);
    setMensaje(
      "Ya tenías un pedido de hoy sin imprimir. Puedes modificarlo y volver a enviarlo."
    );
  }

  useEffect(() => {
    cargarCliente();
    cargarProductos();
  }, []);

  useEffect(() => {
    if (!cliente || productos.length === 0) return;

    cargarPedidoExistente(cliente.id, productos);
  }, [cliente, productos]);

  const productosDelDepartamento = useMemo(() => {
    return productos.filter(
      (p) => normalizarTexto(p.departamento) === normalizarTexto(departamento)
    );
  }, [productos, departamento]);

  const categoriasDisponibles = useMemo(() => {
    const categorias = productosDelDepartamento
      .map((p) => p.categoria || "Sin categoría")
      .filter((cat) => Boolean(cat && cat.trim()));

    return ["Todas", ...Array.from(new Set(categorias)).sort((a, b) =>
      a.localeCompare(b, "es")
    )];
  }, [productosDelDepartamento]);

  useEffect(() => {
    if (!categoriasDisponibles.includes(categoria)) {
      setCategoria("Todas");
    }
  }, [categoriasDisponibles, categoria]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return productosDelDepartamento
      .filter((p) => {
        const coincideCategoria =
          categoria === "Todas" ||
          normalizarTexto(p.categoria) === normalizarTexto(categoria);

        const coincideBusqueda =
          !q ||
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.includes(q) ||
          (p.categoria || "").toLowerCase().includes(q);

        return coincideCategoria && coincideBusqueda;
      })
      .sort((a, b) => {
        const ordenA = a.orden_preparacion ?? 9999;
        const ordenB = b.orden_preparacion ?? 9999;

        if (ordenA !== ordenB) return ordenA - ordenB;

        return a.nombre.localeCompare(b.nombre, "es");
      });
  }, [busqueda, categoria, productosDelDepartamento]);

  useEffect(() => {
    if (!scrollPendiente) return;

    irAlPrimerArticulo();
    setScrollPendiente(false);
  }, [scrollPendiente, productosFiltrados]);

  const lineasPedido = Object.values(pedido)
    .filter((item) => item.cajas > 0 || item.unidades > 0)
    .sort((a, b) => {
      if (a.departamento !== b.departamento) {
        return a.departamento.localeCompare(b.departamento, "es");
      }

      return a.nombre.localeCompare(b.nombre, "es");
    });

  const bebidasPedido = lineasPedido.filter(
    (item) => item.departamento === "Bebidas"
  );

  const charcuteriaPedido = lineasPedido.filter(
    (item) => item.departamento === "Charcutería"
  );

  const totalLineas = lineasPedido.length;

  function actualizarCantidad(
    producto: Producto,
    tipo: "cajas" | "unidades",
    valor: string
  ) {
    const soloNumeros = valor.replace(/\D/g, "");
    const cantidad = Math.max(0, Number(soloNumeros) || 0);

    setUltimoArticulo(producto.codigo);

    window.setTimeout(() => {
      document
        .getElementById(`producto-${producto.codigo}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);

    setPedido((prev) => {
      const actual = prev[producto.codigo] || {
        ...producto,
        cajas: 0,
        unidades: 0,
      };

      const actualizado: LineaPedido =
        producto.departamento === "Bebidas"
          ? { ...actual, cajas: cantidad, unidades: 0 }
          : {
              ...actual,
              cajas: tipo === "cajas" ? cantidad : 0,
              unidades: tipo === "unidades" ? cantidad : 0,
            };

      const copia = { ...prev };

      if (actualizado.cajas === 0 && actualizado.unidades === 0) {
        delete copia[producto.codigo];
      } else {
        copia[producto.codigo] = actualizado;
      }

      return copia;
    });
  }

  function limpiarPedido() {
    setPedido({});
    setMensaje("");
    setMostrarPreview(false);
  }

  function cantidadActual(producto: Producto, tipo: "cajas" | "unidades") {
    return pedido[producto.codigo]?.[tipo] || 0;
  }

  function abrirPreview() {
    setMensaje("");

    if (lineasPedido.length === 0) {
      setMensaje("Añade al menos un artículo al pedido.");
      return;
    }

    setMostrarPreview(true);
  }

  async function enviarPedido() {
    setMensaje("");

    if (!cliente) {
      setMensaje("No se ha encontrado el cliente.");
      return;
    }

    if (lineasPedido.length === 0) {
      setMensaje("Añade al menos un artículo al pedido.");
      return;
    }

    try {
      setEnviando(true);

      const diaHoy = diaHoyEspana();
      const diaCliente = normalizarTexto(cliente.dia_pedido);

      const fueraDeDia = Boolean(diaCliente) && diaCliente !== diaHoy;

      const { data: pedidosNoImpresosAhora, error: buscarPedidoError } =
        await supabase
          .from("pedidos")
          .select("id, impreso, estado")
          .eq("cliente_id", cliente.id)
          .eq("fecha", fechaHoyISO())
          .eq("impreso", false)
          .neq("estado", "sustituido")
          .order("creado_en", { ascending: false })
          .limit(1);

      if (buscarPedidoError) throw buscarPedidoError;

      const pedidoNoImpresoActual =
        pedidosNoImpresosAhora && pedidosNoImpresosAhora.length > 0
          ? pedidosNoImpresosAhora[0]
          : null;

      let pedidoId = "";

      if (pedidoNoImpresoActual) {
        pedidoId = pedidoNoImpresoActual.id;

        const { error: updatePedidoError } = await supabase
          .from("pedidos")
          .update({
            estado: fueraDeDia ? "fuera_de_dia" : "recibido",
            fuera_de_dia: fueraDeDia,
            impreso: false,
          })
          .eq("id", pedidoId)
          .eq("impreso", false);

        if (updatePedidoError) throw updatePedidoError;

        const { error: borrarLineasError } = await supabase
          .from("lineas_pedido")
          .delete()
          .eq("pedido_id", pedidoId);

        if (borrarLineasError) throw borrarLineasError;
      } else {
        const { data: pedidoCreado, error: pedidoError } = await supabase
          .from("pedidos")
          .insert({
            cliente_id: cliente.id,
            fecha: fechaHoyISO(),
            estado: fueraDeDia ? "fuera_de_dia" : "recibido",
            impreso: false,
            fuera_de_dia: fueraDeDia,
          })
          .select("id")
          .single();

        if (pedidoError) throw pedidoError;

        pedidoId = pedidoCreado.id;
      }

      const lineas = lineasPedido.map((item) => ({
        pedido_id: pedidoId,
        codigo_articulo: item.codigo,
        nombre_articulo: item.nombre,
        departamento: item.departamento,
        cajas: item.cajas,
        unidades: item.unidades,
      }));

      const { error: lineasError } = await supabase
        .from("lineas_pedido")
        .insert(lineas);

      if (lineasError) throw lineasError;

      setMensaje(
        pedidoExistente
          ? "Pedido modificado correctamente."
          : pedidoImpresoHoy
            ? "Pedido adicional enviado correctamente."
            : fueraDeDia
              ? "Pedido enviado correctamente. Aviso: fuera del día habitual."
              : "Pedido enviado correctamente."
      );

      setPedido({});
      setMostrarPreview(false);
      setBusqueda("");
      setDepartamento("Bebidas");
      setCategoria("Todas");
      setUltimoArticulo(null);
      setPedidoExistente(null);
      setPedidoImpresoHoy(null);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        setMensaje(error.message);
      } else {
        setMensaje(JSON.stringify(error));
      }
    } finally {
      setEnviando(false);
    }
  }

  if (cargandoCliente || cargandoProductos) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6">
          Cargando enlace de pedido...
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <AlertCircle className="w-5 h-5" />
            Enlace no válido
          </div>

          <p className="text-slate-600">
            {mensaje || "No se ha encontrado este enlace de pedido."}
          </p>
        </div>
      </main>
    );
  }

  if (mostrarPreview) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-6 pb-80">
        <div className="max-w-4xl mx-auto space-y-6">
          <header className="bg-white rounded-2xl shadow p-3 md:p-6">
            <h1 className="text-3xl md:text-4xl font-bold">
              Revisar pedido
            </h1>

            <p className="text-slate-600 mt-2">
              Pedido de <strong>{cliente.nombre}</strong>
            </p>
          </header>

          <section className="bg-white rounded-2xl shadow p-4 md:p-6 space-y-6">
            {pedidoExistente && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-sm">
                Vas a modificar el pedido enviado hoy. Se sustituirán sus líneas por esta revisión.
              </div>
            )}

            {pedidoImpresoHoy && !pedidoExistente && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-3 text-sm">
                El pedido anterior ya está impreso. Este envío se guardará como pedido adicional.
              </div>
            )}

            {bebidasPedido.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Bebidas</h2>

                <div className="space-y-2">
                  {bebidasPedido.map((item) => (
                    <div
                      key={item.codigo}
                      className="border rounded-xl p-3 flex justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold">{item.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Código {item.codigo}
                        </p>
                      </div>

                      <p className="font-bold whitespace-nowrap">
                        {item.cajas} caja{item.cajas === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {charcuteriaPedido.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Charcutería</h2>

                <div className="space-y-2">
                  {charcuteriaPedido.map((item) => (
                    <div
                      key={item.codigo}
                      className="border rounded-xl p-3 flex justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold">{item.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Código {item.codigo}
                        </p>
                      </div>

                      <p className="font-bold whitespace-nowrap">
                        {item.cajas > 0
                          ? `${item.cajas} caja${item.cajas === 1 ? "" : "s"}`
                          : `${item.unidades} unidad${
                              item.unidades === 1 ? "" : "es"
                            }`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mensaje && (
              <p className="text-sm font-medium text-center">{mensaje}</p>
            )}
          </section>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-3 md:p-4 z-50">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <button
              onClick={() => setMostrarPreview(false)}
              disabled={enviando}
              className="w-full md:w-auto border rounded-xl py-3 px-6 font-bold flex items-center justify-center gap-2 bg-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver y modificar
            </button>

            <button
              onClick={enviarPedido}
              disabled={enviando}
              className="w-full md:w-auto bg-black text-white rounded-xl py-3 px-6 font-bold flex items-center justify-center gap-2 disabled:bg-slate-400"
            >
              <CheckCircle className="w-4 h-4" />
              {enviando
                ? "Enviando..."
                : pedidoExistente
                  ? "Confirmar modificación"
                  : pedidoImpresoHoy
                    ? "Enviar pedido adicional"
                    : "Confirmar y enviar"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 pb-80">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold">
                Polvillo · Pedido
              </h1>

              <p className="text-slate-600 mt-1">
                Pedido de <strong>{cliente.nombre}</strong>
              </p>

              {cliente.dia_pedido && (
                <p className="text-sm text-slate-500 mt-1">
                  Día habitual de pedido: {cliente.dia_pedido}
                </p>
              )}
            </div>

            <div className="bg-slate-100 rounded-2xl p-3 flex items-center gap-3">
              <ShoppingCart className="w-6 h-6" />

              <div>
                <p className="text-sm text-slate-500">Pedido actual</p>
                <p className="text-2xl font-bold">{totalLineas} líneas</p>
              </div>
            </div>
          </div>
        </header>

        {pedidoExistente && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-sm">
            <strong>Pedido cargado para modificar.</strong>{" "}
            Este pedido aún no está impreso. Si confirmas, se actualizará el pedido existente.
          </div>
        )}

        {pedidoImpresoHoy && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-3 text-sm">
            <strong>Ya tienes un pedido impreso hoy.</strong>{" "}
            Si envías otro pedido, se guardará como pedido adicional.
          </div>
        )}

        <div
          id="cabecera-filtros"
          className="sticky top-0 z-40 bg-slate-100 pt-1 pb-2"
        >
          <div className="bg-white rounded-2xl p-3 shadow space-y-2">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />

                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full border rounded-xl py-2.5 pl-10 pr-4"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {departamentos.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                    setDepartamento(d);
                    setCategoria("Todas");
                  }}
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                      departamento === d ? "bg-black text-white" : "bg-white"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
                {categoriasDisponibles.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategoria(cat);
                      setUltimoArticulo(null);
                      setScrollPendiente(true);
                    }}
                    className={`h-9 rounded-lg border text-xs font-bold text-center px-2 transition ${
                      categoria === cat
                        ? "bg-slate-900 text-white border-slate-900 shadow"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block truncate">{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>



        <div id="inicio-articulos" className="scroll-mt-52" />

        <section className="space-y-2 pb-40 md:pb-32">
          {productosFiltrados.map((p) => {
            const cajas = cantidadActual(p, "cajas");
            const unidades = cantidadActual(p, "unidades");

            return (
              <div
                id={`producto-${p.codigo}`}
                data-producto-visible="true"
                key={`${p.codigo}-${p.nombre}`}
                className={`rounded-xl p-3 shadow transition-all ${
                  ultimoArticulo === p.codigo
                    ? "bg-blue-50 ring-2 ring-blue-400"
                    : "bg-white"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:items-center">
                  <div className="flex gap-3 items-start">
                    {p.imagen_url && (
                      <button
                        type="button"
                        onClick={() => setImagenAmpliada(p.imagen_url)}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-xl border bg-white shrink-0 overflow-hidden flex items-center justify-center"
                        title="Ampliar imagen"
                      >
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </button>
                    )}

                    <div>
                      <p className="text-xs text-slate-500">
                        Código {p.codigo}
                      </p>

                      <h2 className="font-bold text-sm md:text-base mt-0.5 leading-tight">
                        {p.nombre}
                      </h2>

                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.departamento} · {p.categoria}
                      </p>
                    </div>
                  </div>

                  {p.departamento === "Bebidas" ? (
                    <div className="w-full md:w-36">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        CAJAS
                      </label>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={cajas || ""}
                        onChange={(e) =>
                          actualizarCantidad(p, "cajas", e.target.value)
                        }
                        className="w-full border rounded-xl px-3 py-1.5 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 w-full md:w-72">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-0.5">
                          CAJAS
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={cajas || ""}
                          onChange={(e) =>
                            actualizarCantidad(p, "cajas", e.target.value)
                          }
                          className="w-full border rounded-xl px-3 py-1.5 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-0.5">
                          UNIDADES
                        </label>

                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={unidades || ""}
                          onChange={(e) =>
                            actualizarCantidad(p, "unidades", e.target.value)
                          }
                          className="w-full border rounded-xl px-3 py-1.5 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <div className="h-40 md:h-32" aria-hidden="true" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-3 md:p-4 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div>
              <p className="text-sm text-slate-500">Pedido actual</p>
              <p className="font-bold">{totalLineas} líneas</p>
            </div>

            <button
              onClick={limpiarPedido}
              className="text-red-500 flex items-center gap-1 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar
            </button>
          </div>

          <div className="flex-1">
            {mensaje && (
              <p className="mb-2 text-sm font-medium text-center md:text-right">
                {mensaje}
              </p>
            )}

            <button
              onClick={abrirPreview}
              disabled={enviando}
              className="w-full md:w-auto md:min-w-64 bg-black text-white rounded-xl py-3 px-6 font-bold flex items-center justify-center gap-2 disabled:bg-slate-400 md:ml-auto"
            >
              <Send className="w-4 h-4" />
              Revisar pedido
            </button>
          </div>
        </div>
      </div>

      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-[999] bg-black/70 p-4 flex items-center justify-center"
          onClick={() => setImagenAmpliada(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-4xl max-h-[90vh] w-full flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setImagenAmpliada(null)}
                className="rounded-lg border px-3 py-2"
              >
                Cerrar
              </button>
            </div>

            <img
              src={imagenAmpliada}
              alt="Imagen ampliada"
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
