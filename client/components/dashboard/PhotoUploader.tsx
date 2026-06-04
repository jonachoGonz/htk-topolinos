import { useRef, useState } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/services/supabase";

interface PhotoUploaderProps {
  patientId: string;
  currentUrl?: string;
  onChange: (url: string | null) => void;
  /**
   * Label shown above the upload buttons. Defaults to "Foto del paciente"
   * for the patient form, but Mi Perfil for the professional passes
   * "Foto del profesional" instead.
   */
  label?: string;
  /** alt attribute for the preview img. Defaults to the label. */
  alt?: string;
}

const BUCKET = "patient-photos";
const MAX_SIZE_MB = 5;

export default function PhotoUploader({ patientId, currentUrl, onChange, label, alt }: PhotoUploaderProps) {
  const displayLabel = label ?? "Foto del paciente";
  const altText = alt ?? displayLabel;
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(currentUrl);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Tamaño máximo ${MAX_SIZE_MB} MB`);
      return;
    }

    setUploading(true);
    try {
      // Path: <patient_uuid>/avatar-<timestamp>.<ext>
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${patientId}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (upErr) {
        // Helpful message when bucket doesn't exist
        if (/bucket/i.test(upErr.message) && /not found/i.test(upErr.message)) {
          toast.error(
            `Bucket '${BUCKET}' no existe. Créalo en Supabase Storage (público) antes de subir.`
          );
        } else {
          toast.error(`Error: ${upErr.message}`);
        }
        return;
      }

      // Get public URL
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = data.publicUrl;

      setPreview(url);
      onChange(url);
      toast.success("Foto subida");
    } catch (e: any) {
      toast.error(`Error: ${e.message || e}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange(null);
  };

  return (
    <div className="flex items-start gap-4">
      {/* Preview */}
      <div className="relative">
        {preview ? (
          <img
            src={preview}
            alt={altText}
            className="w-24 h-24 rounded-xl object-cover border border-white/10"
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-[#0a0e1a] border border-dashed border-white/15 flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-600" />
          </div>
        )}
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition"
            title="Quitar foto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Buttons */}
      <div className="flex-1 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
          {displayLabel} (opcional, máx {MAX_SIZE_MB} MB)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-xs font-semibold hover:bg-[#00d4ff]/20 transition disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            Tomar foto
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-semibold hover:bg-white/[0.08] transition disabled:opacity-40"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir desde galería
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
