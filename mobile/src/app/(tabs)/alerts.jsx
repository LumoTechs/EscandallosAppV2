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
import Svg, { Path, Circle, Line } from "react-native-svg";
import { Check } from "lucide-react-native";
import { T } from "../../theme";

function EmptyZen() {
  return (
    <Svg width={130} height={100} viewBox="0 0 130 100">
      <Path
        d="M65 25 Q 48 25, 48 45 L 48 65 L 42 72 L 88 72 L 82 65 L 82 45 Q 82 25, 65 25 Z"
        fill={T.primarySoft}
        stroke={T.lineStrong}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <Circle cx="65" cy="78" r="4" fill={T.accent} />
      <Line x1="65" y1="20" x2="65" y2="25" stroke={T.lineStrong} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="65" cy="18" r="3" fill={T.primary} />
      <Path d="M100 32 L108 32 L100 42 L108 42" stroke={T.muted} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <Path d="M112 22 L118 22 L112 28 L118 28" stroke={T.muted} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </Svg>
  );
}

export default function Alerts() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch("/api/alerts/list");
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch("/api/alerts/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "unread") return !alert.is_read;
    if (filter === "high") return alert.severity === "high";
    return true;
  });

  const getSeverityColors = (severity) => {
    if (severity === "high")
      return { accent: T.primary, soft: T.primarySoft, label: "Crítica" };
    if (severity === "medium")
      return { accent: T.warn, soft: T.warnSoft, label: "Media" };
    return { accent: T.info, soft: T.infoSoft, label: "Info" };
  };

  const FilterChip = ({ value, label, count }) => {
    const active = filter === value;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: active ? T.ink : T.surface,
          borderWidth: 1,
          borderColor: active ? T.ink : T.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
        onPress={() => setFilter(value)}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: active ? "#fff" : T.ink,
          }}
        >
          {label}
        </Text>
        <View
          style={{
            backgroundColor: active ? "rgba(255,255,255,0.18)" : T.line,
            paddingHorizontal: 6,
            borderRadius: 999,
            minWidth: 20,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: active ? "#fff" : T.inkSoft,
            }}
          >
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: T.accent,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Notificaciones
        </Text>
        <Text
          style={{
            fontSize: 30,
            fontFamily: T.serif,
            color: T.ink,
            letterSpacing: -0.6,
            marginTop: 6,
          }}
        >
          Alertas
        </Text>
        <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 4 }}>
          Cambios de precio y márgenes
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 16,
          gap: 8,
        }}
      >
        <FilterChip value="all" label="Todas" count={alerts.length} />
        <FilterChip
          value="unread"
          label="No leídas"
          count={alerts.filter((a) => !a.is_read).length}
        />
        <FilterChip
          value="high"
          label="Críticas"
          count={alerts.filter((a) => a.severity === "high").length}
        />
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {filteredAlerts.length === 0 ? (
            <View style={{ paddingVertical: 56, alignItems: "center" }}>
              <EmptyZen />
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: T.serif,
                  color: T.ink,
                  marginTop: 16,
                }}
              >
                Todo tranquilo
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: T.inkSoft,
                  marginTop: 4,
                  textAlign: "center",
                  maxWidth: 240,
                  lineHeight: 18,
                }}
              >
                No hay alertas en esta categoría. Las nuevas aparecerán aquí.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredAlerts.map((alert) => {
                const colors = getSeverityColors(alert.severity);
                return (
                  <View
                    key={alert.id}
                    style={{
                      backgroundColor: T.surface,
                      borderWidth: 1,
                      borderColor: T.line,
                      borderRadius: 14,
                      overflow: "hidden",
                      opacity: alert.is_read ? 0.75 : 1,
                    }}
                  >
                    {/* Banda tipo */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        backgroundColor: colors.soft,
                        borderBottomWidth: 2,
                        borderBottomColor: colors.accent,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "800",
                            color: colors.accent,
                            letterSpacing: 1.4,
                            textTransform: "uppercase",
                          }}
                        >
                          {colors.label}
                        </Text>
                      </View>
                      {!alert.is_read && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: colors.accent,
                            }}
                          />
                          <Text style={{ fontSize: 10, fontWeight: "700", color: colors.accent, letterSpacing: 0.8 }}>
                            NUEVA
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ padding: 16 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          color: T.ink,
                          lineHeight: 20,
                          fontWeight: alert.is_read ? "400" : "500",
                        }}
                      >
                        {alert.message}
                      </Text>

                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 10,
                          marginTop: 10,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: T.muted }}>
                          {new Date(alert.created_at).toLocaleDateString("es-ES", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>

                        {alert.product_name && (
                          <>
                            <View
                              style={{
                                width: 3,
                                height: 3,
                                borderRadius: 1.5,
                                backgroundColor: T.muted,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                color: T.inkSoft,
                                fontWeight: "500",
                              }}
                            >
                              {alert.product_name}
                            </Text>
                          </>
                        )}
                      </View>

                      {!alert.is_read && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 12,
                            alignSelf: "flex-start",
                          }}
                          onPress={() => markAsRead(alert.id)}
                        >
                          <Check color={T.primary} size={14} strokeWidth={2.2} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: T.primary,
                            }}
                          >
                            Marcar como leída
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
