export default function BebidasPage() {
  const bebidas = [
    "Coca-Cola",
    "Agua 1.5L",
    "Fanta Naranja",
    "Cerveza",
    "Tónica",
  ];

  return (
    <main className="min-h-screen bg-blue-50 p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-10">

        <h1 className="text-4xl font-bold mb-8 text-center">
          Pedido Bebidas
        </h1>

        <div className="space-y-4">

          {bebidas.map((bebida) => (
            <div
              key={bebida}
              className="grid grid-cols-2 gap-4 items-center border-b pb-4"
            >
              <div className="text-xl font-medium">
                {bebida}
              </div>

              <input
                type="number"
                placeholder="Cajas"
                className="border rounded-lg p-3"
              />
            </div>
          ))}

        </div>

        <button className="mt-10 w-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold py-4 rounded-2xl">
          Enviar Pedido
        </button>

      </div>
    </main>
  );
}
