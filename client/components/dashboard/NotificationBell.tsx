import { useEffect, useState } from "react";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotifications, getUnreadCount, markNotificationRead,
  markAllNotificationsRead, subscribeToNotifications,
  type AppNotification,
} from "@/services/supabase";

const TYPE_EMOJI: Record<string, string> = {
  booking_reminder: "⏰", new_booking: "📅", plan_purchased: "💳",
  plan_assigned: "🎁", plan_expiry: "⚠️", booking_cancelled: "❌",
  class_reagendar: "🔁", patient_paused: "⏸", new_signup: "🆕",
  booking_attended: "✅", admin_message: "📢",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshCount = async () => {
    const r = await getUnreadCount();
    if (r.success) setUnread(r.count);
  };

  const refreshList = async () => {
    setLoading(true);
    const r = await getNotifications(30);
    if (r.success) setItems(r.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    refreshCount();
    const unsub = subscribeToNotifications(user.id, (n) => {
      setItems((prev) => [n, ...prev].slice(0, 30));
      setUnread((u) => u + 1);
      // Live toast
      toast(n.title, { description: n.body });
    });
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    if (open) refreshList();
  }, [open]);

  const handleClick = async (n: AppNotification) => {
    if (!n.read_at) {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-white/[0.05] transition text-gray-300 hover:text-white"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[90vw] sm:w-96 max-h-[80vh] bg-[#0a0e1a] border border-white/10 rounded-xl shadow-2xl z-40 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold font-lexend text-sm">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={handleMarkAll}
                    className="text-[10px] uppercase text-[#00d4ff] hover:text-cyan-300 transition flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Marcar todo
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Cargando…
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No tienes notificaciones</div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left p-3 hover:bg-white/[0.03] transition flex gap-3 ${
                        !n.read_at ? "bg-[#00d4ff]/[0.04]" : ""
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{TYPE_EMOJI[n.type] || "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read_at ? "text-white font-semibold" : "text-gray-300"}`}>
                          {n.title}
                        </p>
                        {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-gray-600 mt-1">
                          {new Date(n.created_at).toLocaleString("es", {
                            day: "numeric", month: "short",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!n.read_at && (
                        <span className="w-2 h-2 rounded-full bg-[#00d4ff] flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
