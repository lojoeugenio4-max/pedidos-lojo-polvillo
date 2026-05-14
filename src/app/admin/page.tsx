"use client";

import React from "react";
import Link from "next/link";
import {
  ClipboardList,
  Users,
  Package,
  ArrowRight,
  Home,
} from "lucide-react";

const opciones = [
  {
    titulo: "Pedidos",
    descripcion:
      "Ver pedidos recibidos, tiendas pendientes, fuera de día e impresión.",
    href: "/admin/pedidos",
    icono: ClipboardList,
  },
  {
    titulo: "Clientes",
    descripcion:
      "Crear clientes, editar rutas, días de pedido y copiar enlaces.",
    href: "/admin/clientes",
    icono: Users,
  },
  {
    titulo: "Artículos",
    descripcion:
      "Gestionar productos, activar/desactivar y ordenar picking.",
    href: "/admin/productos",
    icono: Package,
  },
];

export default function AdminHomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-black text-white p-3">
              <Home className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Panel de administración
              </h1>

              <p className="text-slate-600 mt-2">
                Gestión interna de pedidos, clientes y artículos.
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {opciones.map((opcion) => {
            const Icono = opcion.icono;

            return (
              <Link
                key={opcion.href}
                href={opcion.href}
                className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition-shadow border border-transparent hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <Icono className="w-8 h-8" />
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>

                <h2 className="text-2xl font-bold mt-6">
                  {opcion.titulo}
                </h2>

                <p className="text-slate-600 mt-2 leading-relaxed">
                  {opcion.descripcion}
                </p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
