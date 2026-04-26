import React from "react";
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
import { useRouter } from "expo-router";
import Svg, {
  Path,
  Circle,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { ArrowUpRight, TrendingUp, ChefHat } from "lucide-react-native";
import { T } from "../../theme";

function Sparkline({ data, color = T.primary, width = 280, height = 50 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return { x, y };
  });
  const path = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.25" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#sparkGrad)" />
      <Path
        d={path}
        stroke={color}
        strokeWidth={1.8}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={color}
      />
    </Svg>
  );
}

function BarChart({ data, color = T.primary, width = 300, height = 100 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));
  const barW = (width - (data.length - 1) * 6) / data.length;
  return (
    <Svg width={width} height={height + 20}>
      {data.map((d, i) => {
        const h = (d.value / max) * height;
        const x = i * (barW + 6);
        const y = height - h;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            <SvgText
              x={x + barW / 2}
              y={height + 14}
              fontSize="9"
              fill={T.muted}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function EmptyPeaceful() {
  return (
    <Svg width={140} height={100} viewBox="0 0 140 100">
      <Circle cx="70" cy="60" r="34" fill={T.primarySoft} />
      <Circle cx="70" cy="60" r="34" stroke={T.accent} strokeWidth="1" fill="none" opacity="0.3" />
      <Circle cx="70" cy="60" r="24" stroke={T.accent} strokeWidth="0.8" fill="none" opacity="0.5" />
      <Circle cx="70" cy="60" r="10" fill={T.primary} />
      <Path d="M65 60 L 69 64 L 76 57" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [purchasesData, setPurchasesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [alertsRes, recipesRes] = await Promise.all([
        fetch("/api/alerts/list?unread_only=true"),
        fetch("/api/recipes/list"),
      ]);
      const alertsData = await alertsRes.json();
      const recipesData = await recipesRes.json();
      setAlerts(alertsData.alerts || []);
      setRecipes(recipesData.recipes || []);

      // Demo mientras no tengas API de compras mensuales; sustituye por endpoint real
      setPurchasesData([
        { label: "Dic", value: 1850 },
        { label: "Ene", value: 2100 },
        { label: "Feb", value: 1980 },
        { label: "Mar", value: 2350 },
        { label: "Abr", value: 1108 },
      ]);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const criticalAlerts = alerts.filter((a) => a.severity === "high");
  const recipesAtRisk = recipes.filter(
    (r) =>
      parseFloat(r.actual_food_cost_percentage) >
      parseFloat(r.target_food_cost_percentage),
  );

  // Food cost medio real de todos los escandallos
  const avgFoodCost =
    recipes.length > 0
      ? recipes.reduce((sum, r) => sum + parseFloat(r.actual_food_cost_percentage || 0), 0) /
        recipes.length
      : 0;

  const costTrend = [32, 34, 33, 36, 35, 38, 37, Math.round(avgFoodCost) || 39];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: T.accent,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Panel de control
        </Text>
        <Text
          style={{
            fontSize: 34,
            fontFamily: T.serif,
            color: T.ink,
            letterSpacing: -0.8,
            marginTop: 6,
          }}
        >
          GastroCost
        </Text>
        <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 4, lineHeight: 20 }}>
          Control de costes y escandallos
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 24 }}>
            {/* Hero */}
            <View style={{ backgroundColor: T.ink, borderRadius: 20, padding: 24, marginBottom: 16, overflow: "hidden" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
                    Food cost medio
                  </Text>
                  <Text style={{ fontSize: 44, fontFamily: T.serif, color: "#fff", letterSpacing: -1, marginTop: 8 }}>
                    {avgFoodCost.toFixed(0)}
                    <Text style={{ fontSize: 24, color: T.accent }}>%</Text>
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: "rgba(217,131,36,0.18)",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  <TrendingUp color={T.accent} size={12} strokeWidth={2.2} />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: T.accent }}>+2.1%</Text>
                </View>
              </View>
              <View style={{ marginTop: 16, marginHorizontal: -4 }}>
                <Sparkline data={costTrend} color={T.accent} width={280} height={50} />
              </View>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8, letterSpacing: 0.3 }}>
                Últimos 8 días
              </Text>
            </View>

            {/* Métricas */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: T.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.line }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: T.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>
                  En riesgo
                </Text>
                <Text style={{ fontSize: 32, fontFamily: T.serif, color: T.ink, marginTop: 6, letterSpacing: -0.5 }}>
                  {recipesAtRisk.length}
                </Text>
                <View style={{ height: 4, backgroundColor: T.line, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                  <View
                    style={{
                      height: 4,
                      width: `${recipes.length > 0 ? Math.min((recipesAtRisk.length / recipes.length) * 100, 100) : 0}%`,
                      backgroundColor: T.accent,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
              <View style={{ flex: 1, backgroundColor: T.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.line }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: T.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>
                  Escandallos
                </Text>
                <Text style={{ fontSize: 32, fontFamily: T.serif, color: T.ink, marginTop: 6, letterSpacing: -0.5 }}>
                  {recipes.length}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 }}>
                  <ChefHat size={11} color={T.ok} strokeWidth={2} />
                  <Text style={{ fontSize: 10, color: T.ok, fontWeight: "600" }}>Activos</Text>
                </View>
              </View>
            </View>

            {/* Compras por mes */}
            {purchasesData.length > 0 && (
              <View style={{ backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 20, marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, letterSpacing: -0.3 }}>
                  Compras por mes
                </Text>
                <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, marginBottom: 12 }}>
                  Últimos 5 meses — €
                </Text>
                <BarChart data={purchasesData} color={T.primary} width={300} height={100} />
              </View>
            )}

            {/* Alertas críticas */}
            <View style={{ backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 20, marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, letterSpacing: -0.3 }}>
                    Alertas críticas
                  </Text>
                  <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                    Requieren tu atención
                  </Text>
                </View>
                {criticalAlerts.length > 0 && (
                  <View style={{ backgroundColor: T.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: T.primary }}>
                      {criticalAlerts.length}
                    </Text>
                  </View>
                )}
              </View>

              {criticalAlerts.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <EmptyPeaceful />
                  <Text style={{ fontSize: 15, fontFamily: T.serif, color: T.ink, marginTop: 12 }}>
                    Todo en orden
                  </Text>
                  <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
                    Los precios están estables
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {criticalAlerts.slice(0, 3).map((alert) => (
                    <View
                      key={alert.id}
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        paddingVertical: 10,
                        borderTopWidth: 1,
                        borderTopColor: T.line,
                      }}
                    >
                      <View style={{ width: 3, backgroundColor: T.primary, borderRadius: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: T.ink, lineHeight: 18 }}>
                          {alert.message}
                        </Text>
                        <Text style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                          {new Date(alert.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                          })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Quick actions */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: T.muted,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 12,
                marginTop: 4,
              }}
            >
              Acciones rápidas
            </Text>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  backgroundColor: T.primary,
                  borderRadius: 14,
                  padding: 18,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(tabs)/upload")}
              >
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
                    Procesar nueva factura
                  </Text>
                  <Text style={{ fontSize: 12, color: T.accentSoft, marginTop: 2 }}>
                    Escaneo con IA
                  </Text>
                </View>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.18)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ArrowUpRight color="#fff" size={18} strokeWidth={2} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  backgroundColor: T.surface,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 14,
                  padding: 18,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => router.push("/(tabs)/recipes")}
              >
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: T.ink }}>
                    Crear escandallo
                  </Text>
                  <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                    Calcula margen en tiempo real
                  </Text>
                </View>
                <ArrowUpRight color={T.ink} size={18} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
