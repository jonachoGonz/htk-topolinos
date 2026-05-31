import { Users } from "lucide-react";
import PatientsList from "@/components/dashboard/PatientsList";

interface PatientsSectionProps {
  professionalId: string;
}

export default function PatientsSection({ professionalId }: PatientsSectionProps) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <Users className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Mis Pacientes
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestiona información, asistencia y notas privadas de cada paciente.
          </p>
        </div>
      </div>

      <PatientsList professionalId={professionalId} />
    </div>
  );
}
