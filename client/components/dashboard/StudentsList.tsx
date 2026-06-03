import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  email: string;
  planName: string;
  planExpiry: string;
  sessionsRemaining: number;
  status: "active" | "expired" | "pending";
}

interface StudentsListProps {
  onViewDetails?: (studentId: string) => void;
}

export default function StudentsList({ onViewDetails }: StudentsListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    const mockStudents: Student[] = [
      { id: "std1", name: "Ana Martínez", email: "ana@example.com", planName: "Plan Premium", planExpiry: "2026-08-31", sessionsRemaining: 8, status: "active" },
      { id: "std2", name: "Carlos Ruiz", email: "carlos@example.com", planName: "Plan Basic", planExpiry: "2026-06-30", sessionsRemaining: 5, status: "active" },
      { id: "std3", name: "Lucía Vargas", email: "lucia@example.com", planName: "Plan Premium", planExpiry: "2026-05-31", sessionsRemaining: 2, status: "pending" },
      { id: "std4", name: "Diego Fernández", email: "diego@example.com", planName: "Plan Basic", planExpiry: "2026-04-30", sessionsRemaining: 0, status: "expired" },
    ];
    setStudents(mockStudents);
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      expired: "bg-red-500/10 text-red-400 border border-red-500/20",
    };
    const labels = { active: "Activo", pending: "Por Vencer", expired: "Vencido" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-lg font-semibold text-white font-lexend">Estudiantes</h2>
      </div>

      {isLoading ? (
        <div className="px-6 py-8 text-center text-gray-500">Cargando estudiantes...</div>
      ) : students.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500">No hay estudiantes registrados</div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06]">
                <tr className="text-left text-xs font-inter text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Vencimiento</th>
                  <th className="px-6 py-3">Sesiones</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition text-white">
                    <td className="px-6 py-3 font-medium">{student.name}</td>
                    <td className="px-6 py-3 text-gray-400">{student.email}</td>
                    <td className="px-6 py-3 text-gray-400">{student.planName}</td>
                    <td className="px-6 py-3">{student.planExpiry}</td>
                    <td className="px-6 py-3">
                      <span className="font-semibold text-[#00d4ff]">{student.sessionsRemaining}</span>
                    </td>
                    <td className="px-6 py-3">{getStatusBadge(student.status)}</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => onViewDetails?.(student.id) || toast("Ver detalles: " + student.name)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-white/[0.04]">
            {students.map((student) => (
              <div key={student.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-medium text-sm">{student.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{student.email}</p>
                  </div>
                  {getStatusBadge(student.status)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500 uppercase text-[10px]">Plan</p>
                    <p className="text-gray-300 mt-0.5">{student.planName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase text-[10px]">Vence</p>
                    <p className="text-gray-300 mt-0.5">{student.planExpiry}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase text-[10px]">Sesiones</p>
                    <p className="text-[#00d4ff] font-semibold mt-0.5">{student.sessionsRemaining}</p>
                  </div>
                </div>
                <button
                  onClick={() => onViewDetails?.(student.id) || toast("Ver detalles: " + student.name)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 rounded-lg transition text-xs font-medium"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver detalles
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
