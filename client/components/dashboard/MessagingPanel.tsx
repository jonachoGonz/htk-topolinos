import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft, MessageSquare, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  listMessageThreads, getMessagesWith, sendMessage, markThreadRead,
  subscribeToMessagesWith, getAllProfessionals, getStudents,
  type MessageThread, type MessageRow,
} from "@/services/supabase";

export default function MessagingPanel() {
  const { user, userRole } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<{ id: string; full_name: string; role?: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const refreshThreads = async () => {
    const r = await listMessageThreads();
    if (r.success) setThreads(r.data || []);
  };

  useEffect(() => {
    refreshThreads().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId || !user?.id) return;
    (async () => {
      const r = await getMessagesWith(selectedId);
      if (r.success) setMessages(r.data || []);
      await markThreadRead(selectedId);
      refreshThreads();
    })();
    const unsub = subscribeToMessagesWith(user.id, selectedId, (m) => {
      setMessages((prev) => [...prev, m]);
      if (m.recipient_id === user.id) markThreadRead(selectedId).then(refreshThreads);
    });
    return () => unsub();
  }, [selectedId, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openContacts = async () => {
    setShowContacts(true);
    // Students see professionals; teachers/admin see students
    const r = userRole === "student" ? await getAllProfessionals() : await getStudents();
    if (r.success) setContacts((r.data || []).map((p: any) => ({ ...p, role: p.role || (userRole === "student" ? "teacher" : "student") })));
  };

  const handleSend = async () => {
    if (!selectedId || !input.trim()) return;
    const body = input.trim();
    setInput("");
    const r = await sendMessage(selectedId, body);
    if (r.success && r.data) {
      setMessages((prev) => [...prev, r.data!]);
      refreshThreads();
    } else {
      toast.error(`Error: ${r.error}`);
      setInput(body);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Thread list */}
      <div className={`lg:w-72 ${selectedId ? "hidden lg:flex" : "flex"} flex-col bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden`}>
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-white font-semibold font-lexend text-sm">Mensajes</h3>
          <button onClick={openContacts}
            className="px-2 py-1 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-xs font-semibold hover:bg-[#00d4ff]/20 transition flex items-center gap-1">
            <Search className="w-3 h-3" /> Nuevo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Sin conversaciones.<br/>Click en "Nuevo" para empezar.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {threads.map((t) => (
                <button key={t.other_user_id}
                  onClick={() => { setSelectedId(t.other_user_id); setSelectedName(t.other_user_name); }}
                  className={`w-full text-left p-3 hover:bg-white/[0.02] transition flex gap-3 ${
                    selectedId === t.other_user_id ? "bg-[#00d4ff]/[0.06]" : ""
                  }`}>
                  {t.other_user_photo ? (
                    <img src={t.other_user_photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#00d4ff] font-bold text-sm">{t.other_user_name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold text-sm truncate">{t.other_user_name}</p>
                      {t.unread_count > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate">{t.last_message}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`flex-1 ${!selectedId ? "hidden lg:flex" : "flex"} flex-col bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden`}>
        {selectedId ? (
          <>
            <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
              <button onClick={() => setSelectedId(null)} className="lg:hidden text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <p className="text-white font-semibold text-sm">{selectedName}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                      mine ? "bg-[#00d4ff] text-[#05050A]" : "bg-white/[0.05] text-white"
                    }`}>
                      <p>{m.body}</p>
                      <p className={`text-[9px] mt-1 ${mine ? "text-[#05050A]/60" : "text-gray-500"}`}>
                        {new Date(m.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-white/[0.06] flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSend())}
                placeholder="Escribe un mensaje…"
                className="flex-1 bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
              <button onClick={handleSend} disabled={!input.trim()}
                className="px-3 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] transition disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Selecciona una conversación
          </div>
        )}
      </div>

      {/* Contacts picker modal */}
      {showContacts && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowContacts(false)}>
          <div className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Nueva conversación</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="p-6 text-center text-gray-500 text-sm">Sin contactos</p>
              ) : (
                contacts.map((c) => (
                  <button key={c.id}
                    onClick={() => { setSelectedId(c.id); setSelectedName(c.full_name); setShowContacts(false); }}
                    className="w-full text-left p-3 hover:bg-white/[0.03] transition border-b border-white/[0.04]">
                    <p className="text-white text-sm font-semibold">{c.full_name}</p>
                    <p className="text-gray-500 text-xs">{c.role === "teacher" ? "Profesional" : "Alumno"}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
