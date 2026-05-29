import { User } from "lucide-react";
import ProfileForm from "@/components/dashboard/ProfileForm";

export default function ProfileSection() {
  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <User className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Mi Perfil
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Edita tu información profesional
          </p>
        </div>
      </div>

      <ProfileForm />
    </div>
  );
}
