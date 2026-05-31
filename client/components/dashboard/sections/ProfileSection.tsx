import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TeacherProfileForm from "@/components/dashboard/TeacherProfileForm";

export default function ProfileSection() {
  const { user } = useAuth();
  if (!user?.id) return null;

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <User className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Mi Perfil
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Edita tu información profesional, especialidades y biografía
          </p>
        </div>
      </div>

      <TeacherProfileForm teacherId={user.id} />
    </div>
  );
}
