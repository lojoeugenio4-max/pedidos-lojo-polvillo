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
  History,
  ChevronDown,
  ChevronUp,
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

type PedidoHistorico = {
  id: string;
  fecha: string;
  estado: string | null;
  creado_en: string;
};

type LineaHistorico = {
  pedido_id: string;
  codigo_articulo: string;
  nombre_articulo: string;
  departamento: string;
  cajas: number;
  unidades: number;
};

type BorradorLocal = {
  creado_en: string;
  lineas: {
    codigo: string;
    cajas: number;
    unidades: number;
  }[];
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

const indiceDiasSemana: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

function fechaPedidoObjetivoISO(diaPedido: string | null) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(partes.find((p) => p.type === "year")?.value);
  const month = Number(partes.find((p) => p.type === "month")?.value);
  const day = Number(partes.find((p) => p.type === "day")?.value);

  const fechaMadrid = new Date(year, month - 1, day);
  const diaNormalizado = normalizarTexto(diaPedido);
  const diaObjetivo = indiceDiasSemana[diaNormalizado];

  if (diaObjetivo === undefined) return fechaHoyISO();

  const diaActual = fechaMadrid.getDay();
  let diasHastaObjetivo = diaObjetivo - diaActual;

  if (diasHastaObjetivo < 0) diasHastaObjetivo += 7;

  const fechaObjetivo = new Date(fechaMadrid);
  fechaObjetivo.setDate(fechaMadrid.getDate() + diasHastaObjetivo);

  const objetivoYear = fechaObjetivo.getFullYear();
  const objetivoMonth = String(fechaObjetivo.getMonth() + 1).padStart(2, "0");
  const objetivoDay = String(fechaObjetivo.getDate()).padStart(2, "0");

  return `${objetivoYear}-${objetivoMonth}-${objetivoDay}`;
}

function claveBorradorPedido(token: string) {
  return `borrador-pedido-${token}`;
}

function irAlPrimerArticulo() {
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      const primerArticulo = document.querySelector(
        "[data-producto-visible='true']"
      ) as HTMLElement | null;

      const cabecera = document.getElementById("cabecera-filtros");
      const alturaCabecera = cabecera ? cabecera.getBoundingClientRect().height : 0;
      const margenExtra = 16;

      const destino = primerArticulo || document.getElementById("inicio-articulos");

      if (!destino) return;

      const posicion =
        destino.getBoundingClientRect().top +
        window.scrollY -
        alturaCabecera -
        margenExtra;

      window.scrollTo({
        top: Math.max(posicion, 0),
        behavior: "smooth",
      });
    });
  }, 150);
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
  const [avisoPedido, setAvisoPedido] = useState<{
    titulo: string;
    texto: string;
  } | null>(null);
  const [mensajeAviso, setMensajeAviso] = useState<string | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  const [historicoPedidos, setHistoricoPedidos] = useState<PedidoHistorico[]>([]);
  const [lineasHistorico, setLineasHistorico] = useState<LineaHistorico[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const [borradorPreparado, setBorradorPreparado] = useState(false);
  const [mensajeBorrador, setMensajeBorrador] = useState<string | null>(null);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);
  const [mensajeFinalizado, setMensajeFinalizado] = useState("Pedido enviado correctamente.");

  function cargarBorradorLocal(productosBase: Producto[]) {
    try {
      const guardado = window.localStorage.getItem(claveBorradorPedido(token));

      if (!guardado) return null;

      const borrador = JSON.parse(guardado) as BorradorLocal;
      const pedidoBorrador: Pedido = {};

      borrador.lineas.forEach((linea) => {
        const producto =
          productosBase.find((p) => p.codigo === linea.codigo) || null;

        if (!producto) return;

        const cajas = Number(linea.cajas) || 0;
        const unidades = Number(linea.unidades) || 0;

        if (cajas === 0 && unidades === 0) return;

        pedidoBorrador[producto.codigo] = {
          ...producto,
          cajas,
          unidades,
        };
      });

      if (Object.keys(pedidoBorrador).length === 0) return null;

      return pedidoBorrador;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function guardarBorradorLocal(pedidoActual: Pedido) {
    try {
      const lineas = Object.values(pedidoActual)
        .filter((item) => item.cajas > 0 || item.unidades > 0)
        .map((item) => ({
          codigo: item.codigo,
          cajas: item.cajas,
          unidades: item.unidades,
        }));

      if (lineas.length === 0) {
        window.localStorage.removeItem(claveBorradorPedido(token));
        return;
      }

      const borrador: BorradorLocal = {
        creado_en: new Date().toISOString(),
        lineas,
      };

      window.localStorage.setItem(
        claveBorradorPedido(token),
        JSON.stringify(borrador)
      );
    } catch (error) {
      console.error(error);
    }
  }

  function borrarBorradorLocal() {
    try {
      window.localStorage.removeItem(claveBorradorPedido(token));
    } catch (error) {
      console.error(error);
    }
  }

  async function cargarHistoricoPedidos(clienteId: number) {
    const { data, error } = await supabase.rpc(
      "obtener_historico_servicio_completo",
      {
        p_cliente_id: clienteId,
      }
    );

    if (error) {
      console.error(error);
      return;
    }

    const pedidos = (data || []).map((item: any) => ({
      id: item.id,
      fecha: item.fecha,
      estado: item.estado,
      creado_en: item.creado_en,
    })) as PedidoHistorico[];

    const lineas = (data || []).flatMap((item: any) =>
      (item.lineas || []).map((linea: any) => ({
        pedido_id: item.id,
        codigo_articulo: linea.codigo_articulo,
        nombre_articulo: linea.nombre_articulo,
        departamento: linea.departamento,
        cajas: Number(linea.cajas) || 0,
        unidades: Number(linea.unidades) || 0,
      }))
    ) as LineaHistorico[];

    setHistoricoPedidos(pedidos);
    setLineasHistorico(lineas);
  }

  async function cargarAvisos(clienteActual: Cliente) {
    const diaCliente = normalizarTexto(clienteActual.dia_pedido);
    const hoy = fechaHoyISO();

    const { data, error } = await supabase
      .from("mensajes_clientes")
      .select(
        "id, mensaje, cliente_id, dia_pedido, para_todos, activo, fecha_inicio, fecha_fin, mostrar_una_sola_vez, creado_en"
      )
      .eq("activo", true)
      .lte("fecha_inicio", hoy)
      .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const posiblesAvisos = (data || []).filter((m) => {
      if (m.para_todos) return true;

      if (m.cliente_id && Number(m.cliente_id) === Number(clienteActual.id)) {
        return true;
      }

      if (m.dia_pedido && normalizarTexto(m.dia_pedido) === diaCliente) {
        return true;
      }

      return false;
    });

    for (const aviso of posiblesAvisos) {
      if (aviso.mostrar_una_sola_vez) {
        const { data: leidoData, error: leidoError } = await supabase
          .from("mensajes_clientes_leidos")
          .select("id")
          .eq("mensaje_id", aviso.id)
          .eq("cliente_id", clienteActual.id)
          .maybeSingle();

        if (leidoError) {
          console.error(leidoError);
          continue;
        }

        if (leidoData) continue;
      }

      setMensajeAviso(aviso.mensaje);
      setMostrarAviso(true);
      return;
    }

    setMensajeAviso(null);
    setMostrarAviso(false);
  }

  async function aceptarAviso() {
    if (!cliente || !mensajeAviso) {
      setMostrarAviso(false);
      return;
    }

    const diaCliente = normalizarTexto(cliente.dia_pedido);
    const hoy = fechaHoyISO();

    const { data, error } = await supabase
      .from("mensajes_clientes")
      .select(
        "id, mensaje, cliente_id, dia_pedido, para_todos, activo, fecha_inicio, fecha_fin, mostrar_una_sola_vez, creado_en"
      )
      .eq("activo", true)
      .lte("fecha_inicio", hoy)
      .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error(error);
      setMostrarAviso(false);
      return;
    }

    const aviso = (data || []).find((m) => {
      const coincide =
        m.para_todos ||
        (m.cliente_id && Number(m.cliente_id) === Number(cliente.id)) ||
        (m.dia_pedido && normalizarTexto(m.dia_pedido) === diaCliente);

      return coincide && m.mensaje === mensajeAviso;
    });

    if (aviso?.mostrar_una_sola_vez) {
      await supabase.from("mensajes_clientes_leidos").upsert({
        mensaje_id: aviso.id,
        cliente_id: cliente.id,
      });
    }

    setMostrarAviso(false);
  }

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
    await cargarAvisos(clienteEncontrado);
    await cargarHistoricoPedidos(clienteEncontrado.id);
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
    const fechaHoy = fechaPedidoObjetivoISO(cliente?.dia_pedido || null);

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
      setBorradorPreparado(true);
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
      setBorradorPreparado(true);
      return;
    }

    const pedidoImpreso =
      ((pedidosImpresosData || [])[0] as PedidoExistente | undefined) || null;

    setPedidoExistente(pedidoNoImpreso);
    setPedidoImpresoHoy(pedidoNoImpreso ? null : pedidoImpreso);

    if (pedidoNoImpreso) {
      setAvisoPedido({
        titulo: "Pedido cargado para modificar",
        texto:
          "Ya tenías un pedido enviado para tu próximo día de pedido y todavía no está impreso. Puedes modificarlo y volver a enviarlo.",
      });
    } else if (pedidoImpreso) {
      setAvisoPedido({
        titulo: "Pedido ya impreso",
        texto:
          "Tu pedido anterior ya está impreso. Si envías otro pedido, se guardará como pedido adicional.",
      });
    }

    let pedidoBase: Pedido = {};

    if (pedidoNoImpreso) {
      const { data: lineasData, error: lineasError } = await supabase
        .from("lineas_pedido")
        .select("codigo_articulo, nombre_articulo, departamento, cajas, unidades")
        .eq("pedido_id", pedidoNoImpreso.id);

      if (lineasError) {
        setMensaje(JSON.stringify(lineasError));
        setBorradorPreparado(true);
        return;
      }

      const lineas = (lineasData || []) as LineaPedidoExistente[];

      lineas.forEach((linea) => {
        const producto =
          productosBase.find((p) => p.codigo === linea.codigo_articulo) || null;

        if (!producto) return;

        pedidoBase[producto.codigo] = {
          ...producto,
          cajas: Number(linea.cajas) || 0,
          unidades: Number(linea.unidades) || 0,
        };
      });
    }

    /*
      Si ya hay un pedido abierto en Supabase sin imprimir, SIEMPRE manda ese pedido.
      Esto evita que un borrador local antiguo machaque el pedido real ya enviado.
      Así, cuando el cliente vuelve a entrar, ve las cantidades ya pedidas y puede añadir o modificar.
    */
    if (pedidoNoImpreso) {
      setPedido(pedidoBase);
      borrarBorradorLocal();
      setMensajeBorrador(null);
      setBorradorPreparado(true);
      return;
    }

    const borradorLocal = cargarBorradorLocal(productosBase);

    if (borradorLocal) {
      setPedido(borradorLocal);
      setMensajeBorrador(
        "Hemos recuperado un pedido que se quedó sin enviar en este dispositivo."
      );
    } else {
      setPedido(pedidoBase);
    }

    setBorradorPreparado(true);
  }

  useEffect(() => {
    cargarCliente();
    cargarProductos();
  }, []);
useEffect(() => {
  const recargar = async () => {
    if (document.visibilityState !== "visible") return;

    await cargarCliente();
    await cargarProductos();

    if (cliente && productos.length > 0) {
      await cargarPedidoExistente(cliente.id, productos);
      await cargarHistoricoPedidos(cliente.id);
    }
  };

  document.addEventListener("visibilitychange", recargar);
  window.addEventListener("focus", recargar);

  return () => {
    document.removeEventListener("visibilitychange", recargar);
    window.removeEventListener("focus", recargar);
  };
}, [cliente, productos]);
  useEffect(() => {
    if (!cliente || productos.length === 0) return;

    cargarPedidoExistente(cliente.id, productos);
  }, [cliente, productos]);

  useEffect(() => {
    if (!cliente || !borradorPreparado) return;

    guardarBorradorLocal(pedido);
  }, [pedido, cliente, borradorPreparado]);

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
    const q = normalizarTexto(busqueda);

    const baseProductos = q ? productos : productosDelDepartamento;

    return baseProductos
      .filter((p) => {
        if (q) {
          return (
            normalizarTexto(p.nombre).includes(q) ||
            normalizarTexto(p.codigo).includes(q)
          );
        }

        const coincideCategoria =
          categoria === "Todas" ||
          normalizarTexto(p.categoria) === normalizarTexto(categoria);

        return coincideCategoria;
      })
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", {
          sensitivity: "base",
          numeric: true,
        })
      );
  }, [busqueda, categoria, productos, productosDelDepartamento]);

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
    setMensajeBorrador(null);
    setMostrarPreview(false);
    borrarBorradorLocal();
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

      const fechaObjetivoPedido = fechaPedidoObjetivoISO(cliente.dia_pedido);
      const fueraDeDia = fechaObjetivoPedido !== fechaHoyISO();

      const lineas = lineasPedido.map((item) => ({
        codigo_articulo: item.codigo,
        nombre_articulo: item.nombre,
        departamento: item.departamento,
        cajas: item.cajas,
        unidades: item.unidades,
      }));

      const { error } = await supabase.rpc("guardar_pedido_cliente", {
        p_cliente_id: cliente.id,
        p_fecha: fechaObjetivoPedido,
        p_estado: "recibido",
        p_fuera_de_dia: fueraDeDia,
        p_lineas: lineas,
      });

      if (error) throw error;

      borrarBorradorLocal();
      setMensajeBorrador(null);

      const textoFinal = fueraDeDia
        ? `Pedido recibido correctamente para tu próximo día de pedido: ${fechaObjetivoPedido}.`
        : "Pedido enviado correctamente.";

      setMensajeFinalizado(textoFinal);
      setPedidoFinalizado(true);
      setPedido({});
      setMostrarPreview(false);
      setBusqueda("");
      setDepartamento("Bebidas");
      setCategoria("Todas");
      setUltimoArticulo(null);
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
          <div className="flex items-center gap-2 text-black font-bold">
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

  if (pedidoFinalizado) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-6 flex items-center justify-center">
        <section className="w-full max-w-lg bg-white rounded-2xl shadow p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-green-700" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-black">
              Pedido enviado correctamente
            </h1>

            <p className="text-slate-600 mt-3">
              {mensajeFinalizado}
            </p>

            <p className="text-sm text-slate-500 mt-3">
              Si quieres hacer otra modificación, vuelve a cargar la aplicación para recuperar el pedido actualizado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-black text-white rounded-xl py-3 font-bold"
          >
            Volver a cargar aplicación
          </button>
        </section>
      </main>
    );
  }

  if (mostrarPreview) {
    return (
      <main className="min-h-screen bg-slate-100 p-3 md:p-6 pb-44">
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

            {bebidasPedido.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3 text-black">Bebidas</h2>

                <div className="space-y-2">
                  {bebidasPedido.map((item) => (
                    <div
                      key={item.codigo}
                      className="border rounded-xl p-3 flex justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-black">{item.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Código {item.codigo}
                        </p>
                      </div>

                      <p className="font-bold whitespace-nowrap text-black">
                        {item.cajas} caja{item.cajas === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {charcuteriaPedido.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3 text-black">Charcutería</h2>

                <div className="space-y-2">
                  {charcuteriaPedido.map((item) => (
                    <div
                      key={item.codigo}
                      className="border rounded-xl p-3 flex justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-black">{item.nombre}</p>
                        <p className="text-xs text-slate-500">
                          Código {item.codigo}
                        </p>
                      </div>

                      <p className="font-bold whitespace-nowrap text-black">
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
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[auto_auto] gap-2 md:items-center md:justify-between">
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
    <main className="min-h-screen bg-slate-100 p-3 md:p-6 pb-44">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-6">
        <header className="bg-white rounded-xl shadow px-3 py-2 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg md:text-3xl font-bold leading-tight truncate text-black">
                Polvillo · Pedido
              </h1>

              <p className="text-xs md:text-sm text-slate-600 truncate">
                <strong>{cliente.nombre}</strong>
                {cliente.dia_pedido ? ` · ${cliente.dia_pedido}` : ""}
              </p>
            </div>

            <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0 text-black">
              <ShoppingCart className="w-5 h-5" />

              <div>
                <p className="text-xs text-slate-500 leading-none">Líneas</p>
                <p className="text-lg font-bold leading-tight text-black">{totalLineas}</p>
              </div>
            </div>
          </div>
        </header>

        {mensajeBorrador && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl shadow p-3 md:p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />

              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-900">
                  {mensajeBorrador}
                </p>

                <button
                  type="button"
                  onClick={() => setMensajeBorrador(null)}
                  className="text-xs font-bold underline text-amber-900"
                >
                  Entendido
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl shadow p-3 md:p-4">
          <button
            type="button"
            onClick={() => setMostrarHistorico((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-black" />

              <div>
                <h2 className="font-bold text-black">
                  Mis 2 últimos pedidos
                </h2>

                <p className="text-xs text-slate-500">
                  Consulta tus pedidos anteriores
                </p>
              </div>
            </div>

            {mostrarHistorico ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {mostrarHistorico && (
            historicoPedidos.length === 0 ? (
              <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">
                  Todavía no tienes pedidos anteriores.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {historicoPedidos.map((pedidoHistorico) => {
                  const lineas = lineasHistorico.filter(
                    (linea) => linea.pedido_id === pedidoHistorico.id
                  );

                  return (
                    <div
                      key={pedidoHistorico.id}
                      className="border rounded-xl p-3 bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="font-bold text-black">
                          Pedido del{" "}
                          {new Date(
                            `${pedidoHistorico.fecha}T00:00:00`
                          ).toLocaleDateString("es-ES")}
                        </h3>

                        <span className="text-xs rounded-full bg-white border px-2 py-1 text-slate-600">
                          {pedidoHistorico.estado || "recibido"}
                        </span>
                      </div>

                      {lineas.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Este pedido no tiene líneas guardadas.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {lineas.map((linea, index) => (
                            <div
                              key={`${linea.pedido_id}-${linea.codigo_articulo}-${index}`}
                              className="flex justify-between gap-3 text-sm border-b last:border-b-0 pb-1"
                            >
                              <div>
                                <p className="font-semibold text-black">
                                  {linea.nombre_articulo}
                                </p>

                                <p className="text-xs text-slate-500">
                                  Código {linea.codigo_articulo}
                                </p>
                              </div>

                              <p className="font-bold whitespace-nowrap text-black">
                                {linea.cajas > 0
                                  ? `${linea.cajas} caja${linea.cajas === 1 ? "" : "s"}`
                                  : `${linea.unidades} unidad${
                                      linea.unidades === 1 ? "" : "es"
                                    }`}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </section>

        <div
          id="cabecera-filtros"
          className="sticky top-0 z-40 bg-slate-100 pt-1 pb-1"
        >
          <div className="bg-white rounded-xl p-2 shadow space-y-1.5">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

                <input
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setUltimoArticulo(null);
                  }}
                  placeholder="Buscar artículo..."
                  className="w-full border rounded-lg py-2 pl-9 pr-10 text-base md:text-sm"
                />

                {busqueda && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda("");
                      setUltimoArticulo(null);
                    }}
                    className="absolute right-2 top-1.5 h-7 w-7 rounded-full bg-slate-100 text-black font-bold"
                    aria-label="Borrar búsqueda"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-wrap">
                {departamentos.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDepartamento(d);
                      setCategoria("Todas");
                      setBusqueda("");
                      setUltimoArticulo(null);
                      setScrollPendiente(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      departamento === d ? "bg-black text-white" : "bg-white"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-1">
                {categoriasDisponibles.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategoria(cat);
                      setBusqueda("");
                      setUltimoArticulo(null);
                      setScrollPendiente(true);
                    }}
                    className={`h-8 rounded-md border text-[11px] font-bold text-center px-1.5 transition ${
                      categoria === cat
                        ? "bg-black text-white border-black shadow"
                        : "bg-white hover:bg-slate-100"
                    }`}
                  >
                    <span className="block truncate">{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="inicio-articulos" className="scroll-mt-40" />

        <section className="space-y-1.5 pb-36 md:pb-32">
          {productosFiltrados.length === 0 && (
            <div className="bg-white rounded-xl p-4 shadow text-center space-y-3">
              <p className="font-semibold text-slate-700">
                No hay artículos con esa búsqueda o filtro.
              </p>

              {busqueda && (
                <button
                  onClick={() => {
                    setBusqueda("");
                    setScrollPendiente(true);
                  }}
                  className="rounded-lg bg-black text-white px-4 py-2 font-bold"
                >
                  Borrar búsqueda
                </button>
              )}
            </div>
          )}

          {productosFiltrados.map((p) => {
            const cajas = cantidadActual(p, "cajas");
            const unidades = cantidadActual(p, "unidades");

            return (
              <div
                id={`producto-${p.codigo}`}
                data-producto-visible="true"
                key={`${p.codigo}-${p.nombre}`}
                className={`rounded-lg p-2 shadow transition-all ${
                  ultimoArticulo === p.codigo
                    ? "bg-slate-100 ring-2 ring-slate-400"
                    : "bg-white"
                }`}
              >
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <div className="flex gap-2 items-start">
                    {p.imagen_url && (
                      <button
                        type="button"
                        onClick={() => setImagenAmpliada(p.imagen_url)}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-lg border bg-white shrink-0 overflow-hidden flex items-center justify-center"
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

                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Código {p.codigo}
                      </p>

                      <h2 className="font-bold text-sm md:text-base leading-tight break-words text-black">
                        {p.nombre}
                      </h2>

                      <p className="text-[11px] text-slate-500 leading-tight">
                        {p.categoria}
                      </p>
                    </div>
                  </div>

                  {p.departamento === "Bebidas" ? (
                    <div className="w-20 md:w-32">
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
                        className="w-full border rounded-lg px-2 py-1 text-center text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 w-36 md:w-64">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
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
                          className="w-full border rounded-lg px-2 py-1 text-center text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
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
                          className="w-full border rounded-lg px-2 py-1 text-center text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

        <div className="h-36 md:h-32" aria-hidden="true" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-2 md:p-4 z-50">
        <div className="max-w-7xl mx-auto space-y-1.5">
          {mensaje && (
            <p className="text-xs md:text-sm font-medium text-center line-clamp-2">
              {mensaje}
            </p>
          )}

          <div className="grid grid-cols-[auto_auto_1fr] items-center gap-2">
            <div className="min-w-14">
              <p className="text-[11px] text-slate-500 leading-none">Líneas</p>
              <p className="text-xl font-bold leading-tight text-black">{totalLineas}</p>
            </div>

            <button
              onClick={limpiarPedido}
              className="text-slate-700 flex items-center gap-1 text-xs px-2 py-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar
            </button>

            <button
              onClick={abrirPreview}
              disabled={enviando}
              className="bg-black text-white rounded-xl py-3 px-3 font-bold flex items-center justify-center gap-2 disabled:bg-slate-400"
            >
              <Send className="w-4 h-4" />
              Revisar pedido
            </button>
          </div>
        </div>
      </div>

      {avisoPedido && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-7 h-7 text-black" />

              <h2 className="text-2xl font-bold">
                {avisoPedido.titulo}
              </h2>
            </div>

            <div className="text-slate-700 whitespace-pre-wrap text-base leading-relaxed">
              {avisoPedido.texto}
            </div>

            <button
              onClick={() => setAvisoPedido(null)}
              className="w-full bg-black text-white rounded-xl py-3 font-bold"
            >
              Aceptar y continuar
            </button>
          </div>
        </div>
      )}

      {mostrarAviso && mensajeAviso && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-7 h-7 text-black" />

              <h2 className="text-2xl font-bold">
                Aviso importante
              </h2>
            </div>

            <div className="text-slate-700 whitespace-pre-wrap text-base leading-relaxed">
              {mensajeAviso}
            </div>

            <button
              onClick={aceptarAviso}
              className="w-full bg-black text-white rounded-xl py-3 font-bold"
            >
              Aceptar y hacer pedido
            </button>
          </div>
        </div>
      )}

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
