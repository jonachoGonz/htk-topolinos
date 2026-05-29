import { Shield } from "lucide-react";
import StudentsList from "@/components/dashboard/StudentsList";

export default function AdminSection() {
  const handleViewStudentDetails = (studentId: string) => {
    console.log("View student details:", studentId);
    // TODO: Open student details modal
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <Shield className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Administración
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestión de estudiantes y suscripciones
          </p>
        </div>
      </div>

      <StudentsList onViewDetails={handleViewStudentDetails} />
    </div>
  );
}
