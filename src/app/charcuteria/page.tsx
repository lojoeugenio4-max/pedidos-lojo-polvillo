"use client";

import { useState } from "react";

const articulos = [
  "Jamón cocido",
  "Chorizo vela",
  "Salchichón",
  "Queso manchego",
  "Bacon",
  "Lomo embuchado",
];

export default function CharcuteriaPage() {
  const [pedido, setPedido] = useState<
    Record<string, { cajas: string; unidades: string }>
  >({});

  function cambiarValor(
    articulo: string,
    campo: "cajas" | "unidades",
    valor: string
  ) {
    setPedido((actual) => ({
      ...actual,
      [articulo]: {
        cajas: campo === "cajas" ? valor : "",
        unidades: campo === "unidades" ? valor : "",
      },
    }));
  }

  return (
    <main className="min-h-screen bg-red-50 p-10">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-10">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Pedido Charcutería
        </h1>

        <div className="grid grid-cols-3 gap-4 font-bold border-b pb-3 mb-4">
          <div>Artículo</div>
          <div>Cajas</div>
          <div>Unidades</div>
        </div>

        <div className="space-y-4">
          {articulos.map((articulo) => (
            <div
              key={articulo}
              className="grid grid-cols-3 gap-4 items-center border-b pb-4"
            >
              <div className="text-xl font-medium">{articulo}</div>

              <input
                type="number"
                placeholder="Cajas"
                value={pedido[articulo]?.cajas || ""}
                onChange={(e) =>
                  cambiarValor(articulo, "cajas", e.target.value)
                }
                className="border rounded-lg p-3"
              />

              <input
                type="number"
                placeholder="Unidades"
                value={pedido[articulo]?.unidades || ""}
                onChange={(e) =>
                  cambiarValor(articulo, "unidades", e.target.value)
                }
                className="border rounded-lg p-3"
              />
            </div>
          ))}
        </div>

        <p className="mt-6 text-gray-600">
          Nota: en el PDF aparecerá también el campo Kilos, vacío para rellenar
          a mano durante la preparación.
        </p>

        <button className="mt-10 w-full bg-red-600 hover:bg-red-700 text-white text-2xl font-bold py-4 rounded-2xl">
          Enviar Pedido
        </button>
      </div>
    </main>
  );
}
