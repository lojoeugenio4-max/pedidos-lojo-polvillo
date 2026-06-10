"use client";

import Link from "next/link";
import {
  Package,
  Users,
  ShoppingCart,
  MessageCircle,
  FileSpreadsheet,
  History,
} from "lucide-react";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-4xl font-bold">
            Panel de control
          </h1>

          <p className="text-slate-600 mt-2">
            Gestión de clientes, productos y pedidos
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          <Link
            href="/admin/clientes"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition border"
          >
            <div className="flex items-center gap-3">
              <Users className="w-7 h-7" />
              <h2 className="text-xl font-bold">
                Clientes
              </h2>
            </div>

            <p className="text-slate-500 mt-2">
              Gestión de clientes y enlaces
            </p>
          </Link>

          <Link
            href="/admin/productos"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition border"
          >
            <div className="flex items-center gap-3">
              <Package className="w-7 h-7" />
              <h2 className="text-xl font-bold">
                Productos
              </h2>
            </div>

            <p className="text-slate-500 mt-2">
              Gestión de productos y categorías
            </p>
          </Link>

          <Link
            href="/admin/pedidos"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition border"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-7 h-7" />
              <h2 className="text-xl font-bold">
                Pedidos
              </h2>
            </div>

            <p className="text-slate-500 mt-2">
              Control de pedidos recibidos
            </p>
          </Link>

          <Link
            href="/admin/mensajes"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition border"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-7 h-7" />
              <h2 className="text-xl font-bold">
                Mensajes
              </h2>
            </div>

            <p className="text-slate-500 mt-2">
              Enviar mensajes WhatsApp a clientes
            </p>
          </Link>

          <Link
            href="/admin/listado-articulos"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition border"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-7 h-7" />
              <h2 className="text-xl font-bold">
                Plantillas
              </h2>
            </div>

            <p className="text-slate-500 mt-2">
              Imprimir listados para pedidos telefónicos
            </p>
          </Link>

          <Link
            href="/admin/historico"
            className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition border"
          >
            <div className="flex items-center gap-3">
              <History className="w-7 h-7" />
              <h2 className="text-xl font-bold">
                Histórico
              </h2>
            </div>

            <p className="text-slate-500 mt-2">
              Consultar los 4 últimos pedidos de una tienda
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
