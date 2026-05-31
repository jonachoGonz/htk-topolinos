import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import PatientForm from "../PatientForm";

export default function StudentSettingsSection() {
  const { user } = useAuth();

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Configuración
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Edita tu información personal, médica y preferencias
          </p>
        </div>
      </div>

      {user?.id && (
        <PatientForm
          patientId={user.id}
          onSaved={() => toast.success("Perfil guardado")}
          onCancel={() => {}}
        />
      )}
    </div>
  );
}
