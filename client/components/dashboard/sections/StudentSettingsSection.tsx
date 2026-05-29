import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/supabase";
import ProfileForm from "../ProfileForm";

export default function StudentSettingsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sesión cerrada");
      navigate("/");
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Configuración
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestiona tu perfil y preferencias
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <ProfileForm />

        {/* Danger Zone */}
        <div className="max-w-2xl">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-red-400 font-lexend">
                Zona Peligrosa
              </h3>
              <p className="text-gray-400 text-sm font-inter mt-1">
                Acciones que no se pueden deshacer
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
