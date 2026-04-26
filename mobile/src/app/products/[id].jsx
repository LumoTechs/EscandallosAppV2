import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  G,
  Text as SvgText,
} from "react-native-svg";
import {
  ArrowLeft,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Edit3,
  Check,
} from "lucide-react-native";
import { T } from "../../theme";
import { apiFetch } from "../../utils/apiFetch";

// Gráfico de área con eje y tooltip sobrio
function PriceChart({ data, width = 320, height = 160 }) {
  if (!data || data.length < 2) {
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: T.muted, fontSize: 12 }}>
          Necesitamos al menos 2 puntos para mostrar la evolución
        </Text>
      </View>
    );
  }
  const padding = { top: 16, right: 12, bottom: 26, left: 36 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const stepX = w / (data.length - 1);
  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + h - ((d.price - min) / range) * h,
    price: d.price,
    date: d.date,
  }));

  const path = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");
  const area = `${path} L${padding.left + w},${padding.top + h} L${padding.left},${padding.top + h} Z`;

  // ticks del eje Y (3 líneas)
  const yTicks = [0, 0.5, 1].map((t) => {
    const val = min + range * (1 - t);
    return {
      y: padding.top + t * h,
      label: `€${val.toFixed(2)}`,
    };
  });

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={T.primary} stopOpacity="0.25" />
          <Stop offset="1" stopColor={T.primary} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* grid Y */}
      {yTicks.map((t, i) => (
        <G key={i}>
          <Line
            x1={padding.left}
            x2={padding.left + w}
            y1={t.y}
            y2={t.y}
            stroke={T.line}
            strokeWidth={1}
            strokeDasharray="2,4"
          />
          <SvgText
            x={padding.left - 6}
            y={t.y + 3}
            fill={T.muted}
            fontSize="9"
            textAnchor="end"
          >
            {t.label}
          </SvgText>
        </G>
      ))}
      {/* área */}
      <Path d={area} fill="url(#priceGrad)" />
      {/* línea */}
      <Path
        d={path}
        stroke={T.primary}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* punto final */}
      <Circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={4}
        fill={T.primary}
      />
      <Circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={8}
        fill={T.primary}
        opacity="0.2"
      />
    </Svg>
  );
}

// Input editable in-line con confirmación
function InlineEdit({ value, onSave, prefix = "", suffix = "", fontSize = 16, fontWeight = "400" }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value ?? ""));

  useEffect(() => {
    if (!editing) setLocal(String(value ?? ""));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if (local !== String(value)) onSave(local);
  };

  if (editing) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize, color: T.ink }}>{prefix}</Text>
        <TextInput
          value={local}
          onChangeText={setLocal}
          onBlur={commit}
          onSubmitEditing={commit}
          autoFocus
          keyboardType={typeof value === "number" ? "decimal-pad" : "default"}
          style={{
            fontSize,
            fontWeight,
            color: T.ink,
            borderBottomWidth: 1,
            borderBottomColor: T.accent,
            paddingVertical: 2,
            minWidth: 60,
          }}
        />
        <Text style={{ fontSize, color: T.inkSoft }}>{suffix}</Text>
        <TouchableOpacity onPress={commit} style={{ marginLeft: 4 }}>
          <Check color={T.ok} size={16} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => setEditing(true)}
      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize, fontWeight, color: T.ink }}>
        {prefix}
        {value ?? "—"}
        {suffix}
      </Text>
      <Edit3 color={T.muted} size={12} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

export default function ProductDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, hRes] = await Promise.all([
        apiFetch(`/api/products/${id}`),
        apiFetch(`/api/products/${id}/history?range=6m`),
      ]);
      if (!pRes.ok) throw new Error(`Producto: ${pRes.status}`);
      const pData = await pRes.json();
      const hData = await hRes.json();
      setProduct(pData.product);
      setHistory(hData.history || []);
      setStats(hData.stats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (body) => {
    try {
      setSaving(true);
      const res = await apiFetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setProduct((prev) => ({ ...prev, ...data.product }));
      // si cambió el precio, recargamos historial
      if (body.current_price !== undefined) {
        const hRes = await apiFetch(`/api/products/${id}/history?range=6m`);
        const hData = await hRes.json();
        setHistory(hData.history || []);
        setStats(hData.stats);
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      "Eliminar producto",
      `¿Seguro que quieres eliminar "${product.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const res = await apiFetch(`/api/products/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) {
              Alert.alert("No se puede eliminar", data.error);
              return;
            }
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={T.primary} size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, padding: 24, justifyContent: "center" }}>
        <Text style={{ color: T.ink }}>{error || "Producto no encontrado"}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: T.primary }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pct = product.change_percentage;
  const isUp = (pct ?? 0) > 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: T.line,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: T.line,
            backgroundColor: T.surface,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ArrowLeft color={T.ink} size={18} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 15, fontFamily: T.serif, color: T.ink }} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity
          onPress={onDelete}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: T.line,
            backgroundColor: T.surface,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Trash2 color={T.ink} size={16} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera */}
        <View style={{ padding: 24 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: T.accent,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {product.category || "Sin categoría"}
          </Text>

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 11, color: T.muted, letterSpacing: 0.5 }}>NOMBRE</Text>
            <View style={{ marginTop: 4 }}>
              <InlineEdit
                value={product.name}
                onSave={(v) => patch({ name: v })}
                fontSize={24}
                fontWeight="400"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20 }}>
            <View>
              <Text style={{ fontSize: 11, color: T.muted, letterSpacing: 0.5 }}>PRECIO ACTUAL</Text>
              <View style={{ marginTop: 4 }}>
                <InlineEdit
                  value={parseFloat(product.current_price ?? 0).toFixed(2)}
                  onSave={(v) => patch({ current_price: parseFloat(v) })}
                  prefix="€"
                  fontSize={38}
                  fontWeight="400"
                />
              </View>
              <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
                por{" "}
                <InlineEdit
                  value={product.unit || ""}
                  onSave={(v) => patch({ unit: v })}
                  fontSize={12}
                />
              </Text>
            </View>

            {pct != null && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: isUp ? T.primarySoft : T.okSoft,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}
              >
                {isUp ? (
                  <TrendingUp color={T.primary} size={12} strokeWidth={2.2} />
                ) : (
                  <TrendingDown color={T.ok} size={12} strokeWidth={2.2} />
                )}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: isUp ? T.primary : T.ok,
                  }}
                >
                  {pct > 0 ? "+" : ""}
                  {pct.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Gráfico */}
        <View style={{ paddingHorizontal: 24 }}>
          <View
            style={{
              backgroundColor: T.surface,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: T.muted,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Evolución 6 meses
            </Text>
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <PriceChart data={history} width={320} height={180} />
            </View>
            {stats && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: T.line,
                }}
              >
                <View>
                  <Text style={{ fontSize: 10, color: T.muted }}>Mínimo</Text>
                  <Text style={{ fontSize: 14, fontFamily: T.serif, color: T.ink, marginTop: 2 }}>
                    €{stats.min.toFixed(2)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: T.muted }}>Máximo</Text>
                  <Text style={{ fontSize: 14, fontFamily: T.serif, color: T.ink, marginTop: 2 }}>
                    €{stats.max.toFixed(2)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: T.muted }}>Registros</Text>
                  <Text style={{ fontSize: 14, fontFamily: T.serif, color: T.ink, marginTop: 2 }}>
                    {stats.points}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Uso en recetas */}
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <View
            style={{
              backgroundColor: T.surface,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: T.muted,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Usado en recetas
            </Text>
            <Text style={{ fontSize: 28, fontFamily: T.serif, color: T.ink, marginTop: 8 }}>
              {product.used_in_recipes_count}
            </Text>
            <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
              {product.used_in_recipes_count === 0
                ? "Aún no forma parte de ninguna receta"
                : `Si este producto sube de precio, afecta a ${product.used_in_recipes_count} escandallo(s)`}
            </Text>
          </View>
        </View>

        {/* Metadata */}
        <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
          <Text
            style={{
              fontSize: 11,
              color: T.muted,
              letterSpacing: 0.3,
            }}
          >
            Actualizado{" "}
            {product.last_updated
              ? new Date(product.last_updated).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—"}
            {saving && "  ·  guardando..."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
