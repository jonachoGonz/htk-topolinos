import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { getAppSettings } from "@/services/supabase";

export default function WhatsAppFloat() {
  const [phone, setPhone] = useState<string>("+56994748507");
  useEffect(() => {
    getAppSettings().then((r) => {
      const p = r.data?.whatsapp_phone || r.data?.center_phone;
      if (p) setPhone(p);
    });
  }, []);
  const digits = phone.replace(/\D/g, "");
  return (
    <a
      href={`https://wa.me/${digits}?text=Hola%20HTK%20Center%2C%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
}
