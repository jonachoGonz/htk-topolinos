import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, supabase } from "@/services/supabase";

export default function ProfileForm() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    specialization: "",
  });

  // Usar user?.id (primitivo estable) para evitar el bucle infinito
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      setIsFetching(true);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, specialization")
        .eq("id", user.id)
        .single();

      if (data) {
        setFormData({
          fullName: data.full_name || "",
          phone: data.phone || "",
          specialization: data.specialization || "",
        });
      }
      setIsFetching(false);
    };

    fetchProfile();
  }, [user?.id]);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }

    if (!user?.id) {
      toast.error("Usuario no autenticado");
      return;
    }

    setIsLoading(true);
    const result = await updateProfile(user.id, {
      full_name: formData.fullName,
      phone: formData.phone,
      specialization: formData.specialization,
    });

    if (result.success) {
      toast.success("Perfil actualizado correctamente");
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white font-lexend">
            Información Profesional
          </h2>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Actualiza tus datos profesionales
          </p>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-xs font-inter text-gray-400 uppercase tracking-wider">
            Nombre Completo
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="Tu nombre completo"
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 font-inter focus:outline-none focus:border-[#00d4ff]/40"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-xs font-inter text-gray-400 uppercase tracking-wider">
            Teléfono
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+56912345678"
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 font-inter focus:outline-none focus:border-[#00d4ff]/40"
          />
        </div>

        {/* Specialization */}
        <div className="space-y-2">
          <label className="text-xs font-inter text-gray-400 uppercase tracking-wider">
            Especialización
          </label>
          <select
            value={formData.specialization}
            onChange={(e) => handleChange("specialization", e.target.value)}
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-4 py-2.5 text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
          >
            <option value="">Selecciona una especialización</option>
            <option value="kinesiologia">Kinesiología</option>
            <option value="nutricion">Nutrición</option>
            <option value="terapia">Terapia</option>
            <option value="psicologia">Psicología</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <label className="text-xs font-inter text-gray-400 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-4 py-2.5 text-gray-500 font-inter cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 font-inter">
            El email no puede ser modificado
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg transition font-semibold disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
