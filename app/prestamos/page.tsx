"use client";

import { ArrowRightIcon } from '@phosphor-icons/react';

const Features: React.FC = () => {
  const actions = [
    { 
      id: 'cat', 
      label: 'CATÁLOGO', 
      title: 'Explorar Catálogo', 
      desc: 'Consulta la disponibilidad de títulos en tiempo real.' 
    },
    { 
      id: 'pre', 
      label: 'PRÉSTAMOS', 
      title: 'Solicitar Libros', 
      desc: 'Gestiona tus pedidos y retiros de forma digital.' 
    },
    { 
      id: 'ren', 
      label: 'RENOVACIONES', 
      title: 'Extender Plazos', 
      desc: 'Amplía el tiempo de tus préstamos vigentes.' 
    },
    { 
      id: 'ale', 
      label: 'ALERTAS', 
      title: 'Mis Notificaciones', 
      desc: 'Recibe avisos sobre devoluciones y novedades.' 
    }
  ];

  return (
    <section className="max-w-350 mx-auto px-10 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {actions.map((item) => (
          <button 
            key={item.id}
            className="group relative flex flex-col items-start p-8 bg-white border border-gray-100 rounded-3xl text-left transition-all duration-300 hover:border-lib-dark hover:shadow-2xl hover:-translate-y-1"
          >
          
            <span className="absolute top-6 right-8 text-[10px] font-black text-gray-200 group-hover:text-lib-dark/20 transition-colors">
              0{actions.indexOf(item) + 1}
            </span>

            <span className="inline-block px-3 py-1 rounded-full bg-lib-accent text-[9px] font-bold tracking-widest text-lib-dark mb-4">
              {item.label}
            </span>
            
     
            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
              {item.title}
            </h3>
     
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed mb-6">
              {item.desc}
            </p>

      
            <span className="text-[10px] font-bold text-lib-dark flex items-center gap-2">
              ACCEDER AHORA <span className="transform group-hover:translate-x-1 transition-transform"><ArrowRightIcon size={20} /></span>
            </span>

    
            <div className="absolute inset-0 bg-linear-to-br from-lib-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />
          </button>
        ))}
      </div>
    </section>
  );
};

export default Features;