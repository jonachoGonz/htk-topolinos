import { useEffect, useState } from "react";
import { Search, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getStudents,
  getPlanTemplates,
  getStudentPlan,
  assignPlanToStudent,
  type PlanTemplate,
} from "@/services/supabase";

interface Student {
  id: string;
  full_name: string;
  email?: string;
  current_plan?: string;
  remaining?: number;
}

export default function AdminPlanAssignment() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Record<string, string>>({});
  const [selectedDuration, setSelectedDuration] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [studentsRes, plansRes] = await Promise.all([
      getStudents(),
      getPlanTemplates(false),
    ]);

    if (studentsRes.success && studentsRes.data) {
      // Hydrate each student with current plan info
      const withPlans = await Promise.all(
        studentsRes.data.map(async (s) => {
          const planRes = await getStudentPlan(s.id);
          return {
            ...s,
            current_plan: planRes.success ? planRes.data?.name : undefined,
            remaining: planRes.success ? planRes.data?.remaining_sessions : 0,
          };
        })
      );
      setStudents(withPlans);
    } else {
      toast.error(`Error cargando alumnos: ${studentsRes.error}`);
    }

    if (plansRes.success) setPlans(plansRes.data || []);
    else toast.error(`Error cargando planes: ${plansRes.error}`);

    setLoading(false);
  };

  const handleAssign = async (studentId: string) => {
    const planId = selectedPlan[studentId];
    const duration = selectedDuration[studentId] || 1;

    if (!planId) {
      toast.error("Selecciona un plan");
      return;
    }

    setAssigning(studentId);
    const res = await assignPlanToStudent(studentId, planId, duration);
    if (res.success) {
      toast.success("Plan asignado correctamente");
      fetchData();
    } else {
      toast.error(`Error: ${res.error}`);
    }
    setAssigning(null);
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-montserrat">
          Asignación de Planes
        </h2>
        <p className="text-gray-400 text-sm font-inter mt-1">
          Asigna o cambia el plan activo de cada alumno.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[#0f131a] border border-white/[0.08] rounded-xl px-3">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar alumno por nombre o email..."
          className="flex-1 bg-transparent py-2.5 text-sm text-white font-inter focus:outline-none"
        />
      </div>

      {/* Students list */}
      {loading ? (
        <div className="py-8 flex items-center justify-center text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando alumnos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          {search ? "Sin resultados" : "No hay alumnos registrados"}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold font-lexend text-sm">
                    {s.full_name || "Sin nombre"}
                  </p>
                  {s.email && (
                    <p className="text-gray-500 text-xs font-inter">{s.email}</p>
                  )}
                </div>
                {s.current_plan && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      Plan actual
                    </p>
                    <p className="text-[#00d4ff] text-xs font-semibold">
                      {s.current_plan}
                    </p>
                    <p className="text-gray-400 text-[10px]">
                      {s.remaining} clases restantes
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
                <select
                  value={selectedPlan[s.id] ?? ""}
                  onChange={(e) =>
                    setSelectedPlan({ ...selectedPlan, [s.id]: e.target.value })
                  }
                  className="flex-1 bg-[#0a0e1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
                >
                  <option value="">— Selecciona plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.monthly_classes} clases/mes)
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDuration[s.id] ?? 1}
                  onChange={(e) =>
                    setSelectedDuration({
                      ...selectedDuration,
                      [s.id]: parseInt(e.target.value),
                    })
                  }
                  className="bg-[#0a0e1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
                >
                  <option value={1}>1 mes</option>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>

                <button
                  onClick={() => handleAssign(s.id)}
                  disabled={assigning === s.id || !selectedPlan[s.id]}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] rounded-lg text-xs font-bold font-lexend transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {assigning === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  Asignar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
