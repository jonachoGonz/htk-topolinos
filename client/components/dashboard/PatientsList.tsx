import { useEffect, useState } from "react";
import { Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { getBookings } from "@/services/supabase";

interface PatientsListProps {
  professionalId: string;
  onAddNote?: (patientId: string) => void;
  onViewProgress?: (patientId: string) => void;
}

interface PatientWithBooking {
  id: string;
  name: string;
  email: string;
  lastSession?: string;
  remainingSessions?: number;
}

export default function PatientsList({
  professionalId,
  onAddNote,
  onViewProgress,
}: PatientsListProps) {
  const [patients, setPatients] = useState<PatientWithBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [professionalId]);

  const fetchPatients = async () => {
    setIsLoading(true);
    const result = await getBookings("professional", professionalId);

    if (result.success) {
      // For MVP, we're showing a simplified list
      // In a real implementation, you'd fetch additional student data from profiles
      const mockPatients: PatientWithBooking[] = [
        {
          id: "s1",
          name: "Ana Martínez",
          email: "ana.martinez@example.com",
          lastSession: "Hoy 10:30",
          remainingSessions: 8,
        },
        {
          id: "s2",
          name: "Carlos Ruiz",
          email: "carlos.ruiz@example.com",
          lastSession: "Ayer 14:00",
          remainingSessions: 5,
        },
        {
          id: "s3",
          name: "Lucía Vargas",
          email: "lucia.vargas@example.com",
          lastSession: "Hace 3 días",
          remainingSessions: 2,
        },
      ];
      setPatients(mockPatients);
    } else {
      toast.error(`Error al cargar pacientes: ${result.error}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-lg font-semibold text-white font-lexend">
          Mis Pacientes
        </h2>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 text-center text-gray-500">
          Cargando pacientes...
        </div>
      ) : patients.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500">
          No tienes pacientes asignados aún
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr className="text-left text-xs font-inter text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Última Sesión</th>
                <th className="px-6 py-3">Sesiones Restantes</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-white/[0.02] transition text-white"
                >
                  <td className="px-6 py-3 font-medium">{patient.name}</td>
                  <td className="px-6 py-3 text-gray-400">{patient.email}</td>
                  <td className="px-6 py-3 text-gray-400">
                    {patient.lastSession || "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-[#00d4ff] font-semibold">
                      {patient.remainingSessions || 0}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onViewProgress?.(patient.id) ||
                          toast("Ver progreso: " + patient.name)
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </button>
                      <button
                        onClick={() =>
                          onAddNote?.(patient.id) ||
                          toast("Agregar nota: " + patient.name)
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nota
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
