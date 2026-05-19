"use client";

import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutAdminButton() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    setSaliendo(true);

    await fetch("/api/admin-logout", {
      method: "POST",
    });

    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={cerrarSesion}
      disabled={saliendo}
      className="rounded-xl border bg-white px-4 py-3 flex items-center justify-center gap-2 disabled:opacity-60"
    >
      <LogOut className="w-4 h-4" />
      {saliendo ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
