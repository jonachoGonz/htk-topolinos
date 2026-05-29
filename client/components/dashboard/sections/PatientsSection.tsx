import { Users } from "lucide-react";
import PatientsList from "@/components/dashboard/PatientsList";

interface PatientsSectionProps {
  professionalId: string;
}

export default function PatientsSection({ professionalId }: PatientsSectionProps) {
  const handleAddNote = (patientId: string) => {
    console.log("Add note for patient:", patientId);
    // TODO: Open progress record form modal
  };

  const handleViewProgress = (patientId: string) => {
    console.log("View progress for patient:", patientId);
    // TODO: Open progress records modal
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <Users className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Mis Pacientes
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestiona tus estudiantes y progreso
          </p>
        </div>
      </div>

      <PatientsList
        professionalId={professionalId}
        onAddNote={handleAddNote}
        onViewProgress={handleViewProgress}
      />
    </div>
  );
}
