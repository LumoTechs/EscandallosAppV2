import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useEffect, useState, useMemo } from "react";
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
import { ArrowUpRight, TrendingUp, ChefHat, Sparkles, Flame, LogOut } from "lucide-react-native";
import { T } from "../../theme";
import { useSession } from "../../utils/auth";

const RECIPE_CATEGORIES = [
  { key: "entrantes",   color: "#4F7A3C", soft: "#ECF3E5", label: "Entrantes" },
  { key: "principales", color: "#B2451C", soft: "#FBEAD9", label: "Principales" },
  { key: "segundos",    color: "#D98324", soft: "#FDF2E2", label: "Segundos" },
  { key: "postres",     color: "#7B3FA0", soft: "#F5EEFF", label: "Postres" },
  { key: "bebidas",     color: "#1A7A8A", soft: "#E0F7F9", label: "Bebidas" },
];
function getRCat(key) {
  return (
    RECIPE_CATEGORIES.find((c) => c.key === key) || {
      key: "otros",
      color: T.muted,
      soft: T.bg,
      label: "Otros",
    }
  );
}
function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
function MiniDishArt({ cat, name }) {
  const initials = getInitials(name);
  const gradId = `mini-${cat.key}-${initials}`;
  return (
    <View style={{ width: "100%", aspectRatio: 1.3, position: "relative" }}>
      <Svg width="100%" height="100%" viewBox="0 0 130 100" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={cat.soft} stopOpacity="1" />
            <Stop offset="1" stopColor={cat.color} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect width="130" height="100" fill={`url(#${gradId})`} />
        <Circle cx="30" cy="20" r="32" fill="#fff" opacity="0.10" />
        <Circle cx="65" cy="50" r="30" fill="#fff" opacity="0.22" />
        <Circle cx="65" cy="50" r="30" stroke="#fff" strokeWidth="1.2" opacity="0.5" fill="none" />
      </Svg>
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
        <Text
          style={{
            fontSize: 28,
            fontFamily: T.serif,
            color: "#fff",
            letterSpacing: -0.8,
            textShadowColor: "rgba(0,0,0,0.18)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {initials}
        </Text>
      </View>
    </View>
  );
}

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
  const { signOut } = useSession();
  const { width: winWidth } = useWindowDimensions();
  const topCols = winWidth >= 1100 ? 4 : winWidth >= 760 ? 3 : 2;
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

  const topRecipes = useMemo(() => {
    return recipes
      .map((r) => {
        const sale = parseFloat(r.sale_price || 0);
        const cost = parseFloat(r.total_cost || 0);
        return { ...r, _margin: sale - cost };
      })
      .filter((r) => parseFloat(r.sale_price || 0) > 0)
      .sort((a, b) => b._margin - a._margin)
      .slice(0, 4);
  }, [recipes]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
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
        <TouchableOpacity
          onPress={signOut}
          accessibilityLabel="Cerrar sesión"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: T.line,
            backgroundColor: T.surface,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          <LogOut size={16} color={T.inkSoft} />
        </TouchableOpacity>
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

            {/* Top platos */}
            {topRecipes.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 12,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: T.muted,
                        letterSpacing: 1.5,
                        textTransform: "uppercase",
                      }}
                    >
                      Top platos
                    </Text>
                    <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, letterSpacing: -0.3, marginTop: 2 }}>
                      Por margen
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/recipes")}>
                    <Text style={{ fontSize: 12, color: T.primary, fontWeight: "600" }}>
                      Ver todo →
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginHorizontal: -5,
                  }}
                >
                  {topRecipes.map((r) => {
                    const cat = getRCat(r.category);
                    const sale = parseFloat(r.sale_price || 0);
                    const cost = parseFloat(r.total_cost || 0);
                    const margin = sale - cost;
                    const fc = parseFloat(r.actual_food_cost_percentage || 0);
                    const target = parseFloat(r.target_food_cost_percentage || 35);
                    const isGold = sale > 0 && fc > 0 && fc <= target - 5;
                    const isRisky = fc > target;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/recipes/${r.id}`)}
                        style={{
                          width: `${100 / topCols}%`,
                          paddingHorizontal: 5,
                          marginBottom: 10,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: T.surface,
                            borderRadius: 14,
                            borderWidth: isGold ? 1.5 : 1,
                            borderColor: isGold ? "#E8B931" : T.line,
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor: cat.soft,
                              borderBottomWidth: 2,
                              borderBottomColor: cat.color,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 8,
                                fontWeight: "800",
                                color: cat.color,
                                letterSpacing: 1.1,
                                textTransform: "uppercase",
                              }}
                              numberOfLines={1}
                            >
                              {cat.label}
                            </Text>
                            {isGold && <Sparkles size={9} color="#9C7A12" />}
                            {isRisky && <Flame size={9} color={T.primary} />}
                          </View>
                          <View style={{ padding: 6, paddingBottom: 0 }}>
                            <View style={{ borderRadius: 8, overflow: "hidden" }}>
                              <MiniDishArt cat={cat} name={r.name} />
                            </View>
                          </View>
                          <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontFamily: T.serif,
                                color: T.ink,
                                letterSpacing: -0.2,
                                lineHeight: 15,
                              }}
                              numberOfLines={2}
                            >
                              {r.name}
                            </Text>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
                              <View>
                                <Text style={{ fontSize: 8, fontWeight: "800", color: T.muted, letterSpacing: 1, textTransform: "uppercase" }}>
                                  Margen
                                </Text>
                                <Text style={{ fontSize: 13, fontFamily: T.serif, color: margin >= 0 ? T.ok : T.primary, marginTop: 1 }}>
                                  €{margin.toFixed(2)}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: isRisky ? T.primary : T.inkSoft, fontWeight: "600" }}>
                                {fc.toFixed(0)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

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
