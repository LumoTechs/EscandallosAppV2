import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Path, Circle } from "react-native-svg";
import { CheckCircle2, BellOff } from "lucide-react-native";
import { T } from "../../theme";
import { apiFetch } from "../../utils/apiFetch";
import { useSession } from "../../utils/auth";

function EmptyZen({ message }) {
  return (
    <View style={{ paddingVertical: 64, alignItems: "center" }}>
      <Svg width={72} height={72} viewBox="0 0 72 72">
        <Circle cx="36" cy="36" r="34" fill={T.primarySoft} />
        <Path
          d="M28 36 L34 42 L46 30"
          stroke={T.primary}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
        />
      </Svg>
      <Text style={{ fontSize: 17, fontFamily: T.serif, color: T.ink, marginTop: 16 }}>
        Todo tranquilo
      </Text>
      <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 4, textAlign: "center", maxWidth: 220, lineHeight: 18 }}>
        {message}
      </Text>
    </View>
  );
}

function getSeverity(severity) {
  if (severity === "high")   return { accent: T.primary, soft: T.primarySoft, label: "Crítica" };
  if (severity === "medium") return { accent: T.warn,    soft: T.warnSoft,    label: "Media"   };
  return                            { accent: T.info,    soft: T.infoSoft,    label: "Info"    };
}

function fmtDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0)
    return `Hoy ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7)  return `Hace ${diffDays} días`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const FILTERS = [
  { key: "all",    label: "Todas"    },
  { key: "unread", label: "Sin leer" },
  { key: "high",   label: "Críticas" },
];

const EMPTY_MESSAGES = {
  all:    "No hay alertas registradas. Las nuevas aparecerán aquí.",
  unread: "No tienes alertas sin leer. ¡Todo al día!",
  high:   "No hay alertas críticas activas.",
};

export default function Alerts() {
  const insets = useSafeAreaInsets();
  const { isReady, isAuthenticated } = useSession();
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    loadAlerts();
  }, [isReady, isAuthenticated]);

  const loadAlerts = async () => {
    try {
      const res  = await apiFetch("/api/alerts/list");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (e) {
      console.error("Error loading alerts:", e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    try {
      await apiFetch("/api/alerts/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.error("Error marking alert as read:", e);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: false } : a)));
    }
  };

  const markAllAsRead = async () => {
    const unread = alerts.filter((a) => !a.is_read);
    if (!unread.length) return;
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    await Promise.all(
      unread.map((a) =>
        apiFetch("/api/alerts/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: a.id }),
        }).catch(() => {})
      )
    );
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const counts = {
    all:    alerts.length,
    unread: unreadCount,
    high:   alerts.filter((a) => a.severity === "high").length,
  };

  const filtered = alerts.filter((a) => {
    if (filter === "unread") return !a.is_read;
    if (filter === "high")   return a.severity === "high";
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
          Notificaciones
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 30, fontFamily: T.serif, color: T.ink, letterSpacing: -0.6 }}>
              Alertas
            </Text>
            {unreadCount > 0 && (
              <View style={{ backgroundColor: T.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, minWidth: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: T.primary }}>Leer todo</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>
          Cambios de precio y márgenes
        </Text>
      </View>

      {/* ── Segmented control ── */}
      <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.line, padding: 3, gap: 2 }}>
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                onPress={() => setFilter(key)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 9,
                  backgroundColor: active ? T.ink : "transparent",
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : T.inkSoft }}>
                  {label}
                </Text>
                {counts[key] > 0 && (
                  <View style={{ backgroundColor: active ? "rgba(255,255,255,0.22)" : T.line, borderRadius: 999, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: active ? "#fff" : T.inkSoft }}>
                      {counts[key]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Lista ── */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <EmptyZen message={EMPTY_MESSAGES[filter]} />
          ) : (
            <View style={{ gap: 8 }}>
              {filtered.map((alert) => {
                const c    = getSeverity(alert.severity);
                const read = alert.is_read;
                return (
                  <TouchableOpacity
                    key={alert.id}
                    activeOpacity={read ? 0.95 : 0.75}
                    onPress={() => !read && markAsRead(alert.id)}
                    style={{
                      flexDirection: "row",
                      borderRadius: 14,
                      overflow: "hidden",
                      backgroundColor: read ? T.bg : T.surface,
                      borderWidth: 1,
                      borderColor: read ? T.line : c.accent + "44",
                    }}
                  >
                    {/* Barra lateral de severidad */}
                    <View style={{ width: 4, backgroundColor: read ? T.line : c.accent }} />

                    {/* Contenido */}
                    <View style={{ flex: 1, padding: 14 }}>

                      {/* Fila superior: badges + fecha */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ backgroundColor: read ? T.line : c.soft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: "800", color: read ? T.muted : c.accent, letterSpacing: 1.2, textTransform: "uppercase" }}>
                              {c.label}
                            </Text>
                          </View>
                          {!read && (
                            <View style={{ backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.8 }}>
                                NUEVA
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: T.muted }}>
                          {fmtDate(alert.created_at)}
                        </Text>
                      </View>

                      {/* Mensaje */}
                      <Text style={{ fontSize: 14, color: read ? T.inkSoft : T.ink, lineHeight: 20, fontWeight: read ? "400" : "500" }}>
                        {alert.message}
                      </Text>

                      {/* Fila inferior: producto + indicador de estado */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                        {alert.product_name ? (
                          <View style={{ backgroundColor: T.bg, borderWidth: 1, borderColor: T.line, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 11, color: T.inkSoft, fontWeight: "500" }}>
                              {alert.product_name}
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}

                        {read ? (
                          <CheckCircle2 size={16} color={T.ok} strokeWidth={1.8} />
                        ) : (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent }} />
                            <Text style={{ fontSize: 11, fontWeight: "600", color: c.accent }}>
                              Toca para marcar leída
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
