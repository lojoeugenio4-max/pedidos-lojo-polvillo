"use client";

import React, { useState } from "react";
import { Lock, LogIn, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function iniciarSesion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje("");

    if (!password.trim()) {
      setMensaje("Introduce la contraseña.");
      return;
    }

    try {
      setEntrando(true);

      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMensaje(data.message || "No se pudo iniciar sesión.");
        return;
      }

      const next = searchParams.get("next") || "/admin";
      router.push(next);
      router.refresh();
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo iniciar sesión.");
    } finally {
      setEntrando(false);
    }
  }

  const faltaConfiguracion = searchParams.get("error") === "missing_secret";

  return (
    <main className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
      <section className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>

          <h1 className="text-3xl font-bold">Acceso administración</h1>

          <p className="text-slate-600">
            Introduce la contraseña para entrar al panel interno.
          </p>
        </div>

        {faltaConfiguracion && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Falta configurar ADMIN_SESSION_SECRET en Vercel.</span>
          </div>
        )}

        {mensaje && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {mensaje}
          </div>
        )}

        <form onSubmit={iniciarSesion} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña admin"
            className="w-full border rounded-xl px-4 py-3"
            autoFocus
          />

          <button
            type="submit"
            disabled={entrando}
            className="w-full bg-black text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:bg-slate-400"
          >
            <LogIn className="w-4 h-4" />
            {entrando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
