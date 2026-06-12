"use client";

const Sidebar: React.FC = () => {
  const generos = [
    { n: "Ficción", c: 128 },
    { n: "Clásico", c: 96 },
    { n: "Fantasía", c: 74 },
    { n: "Misterio", c: 52 },
    { n: "Ciencia ficción", c: 41 },
    { n: "Historia", c: 38 }
  ];

  return (
    <aside className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm h-fit sticky top-24">
      <h3 className="font-bold text-lg mb-6">Géneros destacados</h3>
      <div className="space-y-4">
        {generos.map((g) => (
          <div key={g.n} className="flex justify-between items-center group cursor-pointer">
            <span className="text-sm text-gray-500 group-hover:text-lib-dark"> {g.n}</span>
            <span className="bg-lib-accent px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 group-hover:bg-lib-dark group-hover:text-white transition-all">
              {g.c}
            </span>
          </div>
        ))}
      </div>
      <button className="w-full mt-8 py-3 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-gray-50 transition-colors">
        VER TODOS LOS GÉNEROS →
      </button>
    </aside>
  );
};

export default Sidebar;