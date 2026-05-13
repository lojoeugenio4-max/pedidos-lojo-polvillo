export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-10">
        
        <h1 className="text-4xl font-bold text-center mb-10">
          App de Pedidos
        </h1>

        <p className="text-center text-gray-600 mb-10">
          Selecciona una plantilla
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <button className="bg-blue-600 hover:bg-blue-700 text-white text-2xl font-semibold p-10 rounded-2xl">
            Bebidas
          </button>

          <button className="bg-red-600 hover:bg-red-700 text-white text-2xl font-semibold p-10 rounded-2xl">
            Charcutería
          </button>

        </div>
      </div>
    </main>
  );
}