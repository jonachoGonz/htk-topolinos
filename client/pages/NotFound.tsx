import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404: Ruta no encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
      <div className="text-center px-6">
        <p className="text-[#00d4ff] text-sm font-lexend uppercase tracking-widest mb-4">
          Error 404
        </p>
        <h1 className="text-6xl font-bold text-white font-lexend mb-4">
          Página no encontrada
        </h1>
        <p className="text-gray-400 text-lg font-inter mb-8">
          La dirección que buscás no existe o fue movida.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-white/20 text-gray-300 hover:text-white hover:border-white/40 rounded-xl text-sm font-lexend transition"
          >
            Volver atrás
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] rounded-xl text-sm font-bold font-lexend transition"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
