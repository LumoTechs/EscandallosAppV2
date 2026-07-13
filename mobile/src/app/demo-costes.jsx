import React, { useMemo, useState } from "react";
import {
  Image,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Rect, Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calculator,
  Camera,
  ChefHat,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  PackageSearch,
  ScanLine,
  ShieldCheck,
  TrendingDown,
  UploadCloud,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { T } from "../theme";

const PERIODS = [
  { key: "service", label: "Servicio", multiplier: 1 },
  { key: "week", label: "Semana", multiplier: 6 },
  { key: "month", label: "Mes", multiplier: 26 },
];

const DISHES = [
  {
    id: "choco",
    name: "Choco frito",
    category: "Fritura",
    price: 14.5,
    units: 38,
    target: 32,
    color: "#B2451C",
    soft: "#FBEAD9",
    ingredients: [
      { name: "Choco limpio", qty: "220 g", cost: 3.92 },
      { name: "Aceite alto oleico", qty: "55 ml", cost: 0.68 },
      { name: "Harina especial", qty: "45 g", cost: 0.16 },
      { name: "Limon y sal", qty: "1 ud", cost: 0.18 },
    ],
  },
  {
    id: "calamares",
    name: "Calamares fritos",
    category: "Fritura",
    price: 13.8,
    units: 44,
    target: 32,
    color: "#D98324",
    soft: "#FDF2E2",
    ingredients: [
      { name: "Calamar nacional", qty: "210 g", cost: 4.08 },
      { name: "Aceite alto oleico", qty: "50 ml", cost: 0.62 },
      { name: "Harina especial", qty: "42 g", cost: 0.15 },
      { name: "Alioli", qty: "35 g", cost: 0.24 },
    ],
  },
  {
    id: "adobo",
    name: "Cazon en adobo",
    category: "Clasicos",
    price: 10.5,
    units: 52,
    target: 33,
    color: "#4F7A3C",
    soft: "#ECF3E5",
    ingredients: [
      { name: "Cazon", qty: "180 g", cost: 2.42 },
      { name: "Adobo", qty: "45 g", cost: 0.22 },
      { name: "Aceite alto oleico", qty: "42 ml", cost: 0.52 },
      { name: "Harina especial", qty: "35 g", cost: 0.13 },
    ],
  },
  {
    id: "cartucho",
    name: "Cartucho de pescaito",
    category: "Para compartir",
    price: 12.8,
    units: 31,
    target: 34,
    color: "#1A7A8A",
    soft: "#E0F7F9",
    ingredients: [
      { name: "Boqueron", qty: "110 g", cost: 1.12 },
      { name: "Puntillitas", qty: "90 g", cost: 1.58 },
      { name: "Acedias", qty: "75 g", cost: 1.06 },
      { name: "Aceite y harina", qty: "1 racion", cost: 0.78 },
    ],
  },
  {
    id: "croquetas",
    name: "Croquetas de gambas",
    category: "Entrantes",
    price: 9.2,
    units: 46,
    target: 32,
    color: "#7B3FA0",
    soft: "#F5EEFF",
    ingredients: [
      { name: "Masa croqueta", qty: "180 g", cost: 1.36 },
      { name: "Gamba pelada", qty: "45 g", cost: 0.74 },
      { name: "Pan rallado", qty: "25 g", cost: 0.08 },
      { name: "Aceite alto oleico", qty: "35 ml", cost: 0.43 },
    ],
  },
  {
    id: "ensaladilla",
    name: "Ensaladilla de marisco",
    category: "Frio",
    price: 7.8,
    units: 29,
    target: 31,
    color: "#5B6B8A",
    soft: "#EEF1F7",
    ingredients: [
      { name: "Base ensaladilla", qty: "210 g", cost: 1.08 },
      { name: "Langostino", qty: "35 g", cost: 0.62 },
      { name: "Mayonesa", qty: "38 g", cost: 0.28 },
      { name: "Picos", qty: "1 ud", cost: 0.16 },
    ],
  },
];

const SUPPLIERS = [
  { product: "Aceite alto oleico 25 L", current: "Distribuciones Costa", currentPrice: 56.2, best: "Mayorista Bahia", bestPrice: 51.4, change: 12.9 },
  { product: "Calamar nacional kg", current: "Lonja Sur", currentPrice: 19.4, best: "Pescados Diego", bestPrice: 18.1, change: 7.2 },
  { product: "Choco limpio kg", current: "Mariscos Bahia", currentPrice: 17.8, best: "Mariscos Bahia", bestPrice: 17.8, change: 18.4 },
  { product: "Gamba pelada kg", current: "Congelados Atlantico", currentPrice: 16.5, best: "Congelados Atlantico", bestPrice: 16.5, change: -2.1 },
];

const ALERTS = [
  { title: "Choco limpio", detail: "sube 18,4% frente a la ultima compra", severity: "high" },
  { title: "Aceite alto oleico", detail: "hay 4,80 EUR de diferencia por garrafa", severity: "high" },
  { title: "Calamares fritos", detail: "food cost por encima del objetivo", severity: "medium" },
];

const PROFILE_STATS = [
  { label: "Platos", value: "34" },
  { label: "Facturas", value: "128" },
  { label: "Alertas", value: "7" },
];

const HOME_SHOTS = [
  { title: "Marisco fresco", color: "#1A7A8A", soft: "#E0F7F9" },
  { title: "Fritura al momento", color: "#B2451C", soft: "#FBEAD9" },
  { title: "Producto de lonja", color: "#D98324", soft: "#FDF2E2" },
];

const OCR_RESULT = {
  supplier: "Pescados Diego",
  date: "13/07/2026",
  invoice: "FD-23841",
  confidence: 94,
  subtotal: 169.48,
  tax: 16.94,
  total: 186.42,
  lines: [
    { product: "Calamar nacional", qty: "8,4 kg", unitPrice: 18.1, total: 152.04, effect: "-1,30 EUR/kg vs ultimo precio" },
    { product: "Limones malla", qty: "4 kg", unitPrice: 1.42, total: 5.68, effect: "nuevo precio confirmado" },
    { product: "Harina especial fritura", qty: "10 kg", unitPrice: 1.18, total: 11.8, effect: "+0,06 EUR/kg" },
  ],
  updates: [
    "Actualiza coste de Calamares fritos: 36,9% -> 33,8%",
    "Crea alerta si el proximo proveedor supera 18,10 EUR/kg",
    "Deja la factura en revision humana antes de guardar",
  ],
};

function dishCost(dish, options) {
  const base = dish.ingredients.reduce((sum, ingredient) => sum + ingredient.cost, 0);
  const oilSaving = options.oilDeal && dish.name.toLowerCase().includes("frito") ? 0.38 : 0;
  const wasteSaving = options.wasteControl ? base * 0.035 : 0;
  return Math.max(base - oilSaving - wasteSaving, 0);
}

function eur(value, digits = 0) {
  return `${Number(value).toLocaleString("es-ES", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} EUR`;
}

function pct(value) {
  return `${Number(value).toFixed(1).replace(".", ",")}%`;
}

function DemoDishArt({ dish }) {
  const initials = dish.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={{ width: 58, height: 58, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: T.line }}>
      <Svg width="58" height="58" viewBox="0 0 58 58">
        <Defs>
          <LinearGradient id={`dish-${dish.id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={dish.soft} stopOpacity="1" />
            <Stop offset="1" stopColor={dish.color} stopOpacity="0.95" />
          </LinearGradient>
        </Defs>
        <Rect width="58" height="58" fill={`url(#dish-${dish.id})`} />
        <Circle cx="18" cy="16" r="18" fill="#fff" opacity="0.18" />
        <Circle cx="36" cy="35" r="16" fill="#fff" opacity="0.24" />
      </Svg>
      <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 19, fontFamily: T.serif, color: "#fff", letterSpacing: -0.6 }}>
          {initials}
        </Text>
      </View>
    </View>
  );
}

function ProfileAvatar() {
  return (
    <View style={{ width: 106, height: 106, borderRadius: 54, padding: 4, backgroundColor: T.accentSoft }}>
      <View style={{ flex: 1, borderRadius: 50, overflow: "hidden", borderWidth: 3, borderColor: T.surface }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="casa-diego-avatar" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#E0F7F9" stopOpacity="1" />
              <Stop offset="0.55" stopColor="#FDF2E2" stopOpacity="1" />
              <Stop offset="1" stopColor="#B2451C" stopOpacity="0.92" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#casa-diego-avatar)" />
          <Circle cx="50" cy="55" r="28" fill="#fff" opacity="0.34" />
          <Path d="M28 61 C42 47, 58 47, 72 61" stroke="#B2451C" strokeWidth="6" fill="none" strokeLinecap="round" />
          <Path d="M36 50 C42 38, 58 38, 64 50" stroke="#1A7A8A" strokeWidth="5" fill="none" strokeLinecap="round" />
          <Circle cx="41" cy="57" r="3" fill="#2B1D12" opacity="0.72" />
          <Circle cx="59" cy="57" r="3" fill="#2B1D12" opacity="0.72" />
        </Svg>
      </View>
    </View>
  );
}

function GalleryTile({ item, index }) {
  return (
    <View style={{ flex: 1, minWidth: 126, aspectRatio: 1, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: T.line }}>
      <Svg width="100%" height="100%" viewBox="0 0 180 180" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={`home-shot-${index}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={item.soft} stopOpacity="1" />
            <Stop offset="1" stopColor={item.color} stopOpacity="0.94" />
          </LinearGradient>
        </Defs>
        <Rect width="180" height="180" fill={`url(#home-shot-${index})`} />
        <Circle cx="45" cy="40" r="42" fill="#fff" opacity="0.16" />
        <Circle cx="112" cy="96" r="50" fill="#fff" opacity="0.22" />
        <Path d="M42 118 C62 90, 112 88, 138 116" stroke="#fff" strokeWidth="10" fill="none" opacity="0.58" strokeLinecap="round" />
        <Path d="M62 78 C78 58, 104 58, 120 78" stroke="#2B1D12" strokeWidth="6" fill="none" opacity="0.28" strokeLinecap="round" />
      </Svg>
      <View style={{ position: "absolute", left: 10, right: 10, bottom: 10 }}>
        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 2 }}>
          {item.title}
        </Text>
      </View>
    </View>
  );
}

function InvoicePhotoMock() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 280 360" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="invoice-photo-bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDF2E2" stopOpacity="1" />
          <Stop offset="1" stopColor="#B2451C" stopOpacity="0.72" />
        </LinearGradient>
      </Defs>
      <Rect width="280" height="360" fill="url(#invoice-photo-bg)" />
      <Rect x="48" y="28" width="184" height="304" rx="8" fill="#FFFDF9" opacity="0.96" />
      <Rect x="68" y="52" width="86" height="9" rx="4" fill="#2B1D12" opacity="0.72" />
      <Rect x="68" y="75" width="136" height="6" rx="3" fill="#9A8D7A" opacity="0.52" />
      <Rect x="68" y="92" width="112" height="6" rx="3" fill="#9A8D7A" opacity="0.38" />
      {[126, 152, 178, 204].map((y, index) => (
        <React.Fragment key={y}>
          <Rect x="68" y={y} width={index === 0 ? 116 : index === 1 ? 92 : 130} height="7" rx="3" fill="#2B1D12" opacity="0.42" />
          <Rect x="178" y={y} width="34" height="7" rx="3" fill="#B2451C" opacity="0.62" />
        </React.Fragment>
      ))}
      <Rect x="68" y="250" width="144" height="1" fill="#EFE8DD" />
      <Rect x="68" y="270" width="68" height="9" rx="4" fill="#2B1D12" opacity="0.55" />
      <Rect x="164" y="270" width="48" height="9" rx="4" fill="#B2451C" opacity="0.75" />
      <Path d="M58 42 L214 316" stroke="#fff" strokeWidth="10" opacity="0.14" />
    </Svg>
  );
}

function OcrStat({ label, value, tone = T.ink }) {
  return (
    <View style={{ flex: 1, minWidth: 104, backgroundColor: T.bg, borderRadius: 10, borderWidth: 1, borderColor: T.line, padding: 10 }}>
      <Text style={{ fontSize: 9, fontWeight: "800", color: T.muted, letterSpacing: 0.9, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ fontSize: 17, fontFamily: T.serif, color: tone, marginTop: 4 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MiniTrend({ data, width = 220, height = 54, color = T.accent }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((value, index) => ({
    x: index * step,
    y: height - ((value - min) / range) * (height - 8) - 4,
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="cost-demo-trend" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.26" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#cost-demo-trend)" />
      <Path d={line} stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill={color} />
    </Svg>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = T.primary }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.line,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: "800", color: T.muted, letterSpacing: 1.1, textTransform: "uppercase" }}>
          {label}
        </Text>
        <Icon size={15} color={tone} strokeWidth={2.2} />
      </View>
      <Text style={{ fontSize: 26, fontFamily: T.serif, color: T.ink, marginTop: 8, letterSpacing: -0.7 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: T.inkSoft, marginTop: 4, lineHeight: 15 }}>
        {sub}
      </Text>
    </View>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.line,
        borderRadius: 12,
        padding: 5,
      }}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.8}
            onPress={() => onChange(option.key)}
            style={{
              flex: 1,
              minWidth: 82,
              backgroundColor: active ? T.ink : "transparent",
              borderRadius: 8,
              paddingVertical: 9,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "800", color: active ? "#fff" : T.inkSoft }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TogglePill({ active, label, onPress, icon: Icon }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        borderWidth: 1,
        borderColor: active ? T.ok : T.line,
        backgroundColor: active ? T.okSoft : T.surface,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <Icon size={14} color={active ? T.ok : T.inkSoft} strokeWidth={2.2} />
      <Text style={{ fontSize: 12, color: active ? T.ok : T.inkSoft, fontWeight: "800" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CostBar({ value, target }) {
  const width = Math.min(Math.max(value, 3), 72);
  const targetLeft = Math.min(Math.max(target, 4), 72);
  const over = value > target;
  return (
    <View style={{ height: 9, backgroundColor: T.line, borderRadius: 999, overflow: "hidden", position: "relative" }}>
      <View
        style={{
          width: `${width}%`,
          height: 9,
          borderRadius: 999,
          backgroundColor: over ? T.primary : T.ok,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: `${targetLeft}%`,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: T.ink,
          opacity: 0.5,
        }}
      />
    </View>
  );
}

export default function CostControlDemo() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const maxContent = Math.min(width - 28, 1180);
  const chartWidth = Math.min(compact ? width - 62 : 430, 430);
  const [periodKey, setPeriodKey] = useState("service");
  const [selectedDishId, setSelectedDishId] = useState("calamares");
  const [priceDelta, setPriceDelta] = useState(0.5);
  const [oilDeal, setOilDeal] = useState(true);
  const [wasteControl, setWasteControl] = useState(false);
  const [ocrPhotoUri, setOcrPhotoUri] = useState(null);
  const [ocrPhotoName, setOcrPhotoName] = useState("foto-demo-casa-diego.jpg");

  const period = PERIODS.find((item) => item.key === periodKey) || PERIODS[0];
  const selectedDish = DISHES.find((dish) => dish.id === selectedDishId) || DISHES[0];
  const options = { oilDeal, wasteControl };

  const pickInvoicePhoto = () => {
    if (typeof document === "undefined") {
      setOcrPhotoName("foto-demo-casa-diego.jpg");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setOcrPhotoName(file.name);
      const reader = new FileReader();
      reader.onload = () => setOcrPhotoUri(String(reader.result || ""));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const rows = useMemo(() => {
    return DISHES.map((dish) => {
      const cost = dishCost(dish, options);
      const price = dish.id === selectedDish.id ? dish.price + priceDelta : dish.price;
      const revenue = price * dish.units * period.multiplier;
      const totalCost = cost * dish.units * period.multiplier;
      const foodCost = price > 0 ? (cost / price) * 100 : 0;
      return {
        ...dish,
        cost,
        price,
        revenue,
        totalCost,
        foodCost,
        margin: price - cost,
        totalMargin: revenue - totalCost,
        status: foodCost > dish.target ? "risk" : foodCost < dish.target - 5 ? "star" : "ok",
      };
    }).sort((a, b) => b.foodCost - a.foodCost);
  }, [options.oilDeal, options.wasteControl, period.multiplier, priceDelta, selectedDish.id]);

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      cost: acc.cost + row.totalCost,
      margin: acc.margin + row.totalMargin,
      risk: acc.risk + (row.status === "risk" ? 1 : 0),
    }),
    { revenue: 0, cost: 0, margin: 0, risk: 0 },
  );
  const avgFoodCost = totals.revenue > 0 ? (totals.cost / totals.revenue) * 100 : 0;
  const baselineSelectedCost = dishCost(selectedDish, { oilDeal: false, wasteControl: false });
  const selectedAdjustedCost = dishCost(selectedDish, options);
  const monthlyImpact =
    ((selectedDish.price + priceDelta - selectedAdjustedCost) -
      (selectedDish.price - baselineSelectedCost)) *
    selectedDish.units *
    26;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + 44 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: maxContent, paddingHorizontal: compact ? 14 : 24 }}>
          <View
            style={{
              marginTop: compact ? 14 : 22,
              marginBottom: 14,
              backgroundColor: T.surface,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 18,
              padding: compact ? 15 : 20,
            }}
          >
            <View style={{ flexDirection: compact ? "column" : "row", gap: 18, alignItems: compact ? "stretch" : "center" }}>
              <ProfileAvatar />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: T.ink, letterSpacing: 0.2 }}>
                    @casadiego.marisqueria
                  </Text>
                  <View style={{ backgroundColor: T.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: T.accent }}>DEMO PRIVADA</Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: compact ? 34 : 44,
                    lineHeight: compact ? 40 : 50,
                    fontFamily: T.serif,
                    color: T.ink,
                    letterSpacing: -1,
                    marginTop: 7,
                  }}
                >
                  Casa Diego Marisqueria
                </Text>
                <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 6, lineHeight: 20, maxWidth: 680 }}>
                  Marisco, fritura y producto fresco con control diario de compras, facturas y margen por plato.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 }}>
                  {PROFILE_STATS.map((item) => (
                    <View key={item.label} style={{ minWidth: 82, backgroundColor: T.bg, borderWidth: 1, borderColor: T.line, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 }}>
                      <Text style={{ fontSize: 17, fontFamily: T.serif, color: T.ink }}>{item.value}</Text>
                      <Text style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ minWidth: compact ? "100%" : 270 }}>
                <Segmented options={PERIODS} value={periodKey} onChange={setPeriodKey} />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push("/login")}
                  style={{
                    marginTop: 10,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: T.ink,
                    borderRadius: 12,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>Entrar a GastroCost</Text>
                  <ArrowUpRight color="#fff" size={15} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              {HOME_SHOTS.map((item, index) => (
                <GalleryTile key={item.title} item={item} index={index} />
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <Kpi icon={CircleDollarSign} label="Ventas" value={eur(totals.revenue)} sub={`${period.label.toLowerCase()} simulado`} tone={T.ok} />
            <Kpi icon={PackageSearch} label="Materia prima" value={eur(totals.cost)} sub={`${pct(avgFoodCost)} food cost medio`} tone={avgFoodCost > 33 ? T.primary : T.ok} />
            <Kpi icon={BarChart3} label="Margen bruto" value={eur(totals.margin)} sub={`${DISHES.length} platos controlados`} tone={T.accent} />
            <Kpi icon={AlertTriangle} label="En riesgo" value={String(totals.risk)} sub="platos por encima del objetivo" tone={totals.risk ? T.primary : T.ok} />
          </View>

          <View
            style={{
              backgroundColor: T.surface,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 16,
              padding: compact ? 14 : 18,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: compact ? "column" : "row", gap: 16 }}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={pickInvoicePhoto}
                style={{
                  width: compact ? "100%" : 286,
                  minHeight: 258,
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: T.bg,
                  borderWidth: 1,
                  borderColor: T.line,
                }}
              >
                {ocrPhotoUri ? (
                  <Image source={{ uri: ocrPhotoUri }} style={{ width: "100%", height: 258 }} resizeMode="cover" />
                ) : (
                  <View style={{ height: 258 }}>
                    <InvoicePhotoMock />
                  </View>
                )}
                <View
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    bottom: 10,
                    backgroundColor: "rgba(43,29,18,0.86)",
                    borderRadius: 12,
                    padding: 11,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }} numberOfLines={1}>
                      {ocrPhotoName || "foto de factura"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 10, marginTop: 2 }}>
                      Toca para cambiar foto
                    </Text>
                  </View>
                  <Camera color="#fff" size={18} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: T.accent, letterSpacing: 1.8, textTransform: "uppercase" }}>
                        OCR facturas con foto
                      </Text>
                      <View style={{ backgroundColor: T.okSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: "800", color: T.ok }}>LECTURA IA</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 24, fontFamily: T.serif, color: T.ink, marginTop: 6, letterSpacing: -0.5 }}>
                      Subir foto, extraer lineas y actualizar costes
                    </Text>
                    <Text style={{ fontSize: 12, color: T.inkSoft, lineHeight: 18, marginTop: 5 }}>
                      Demo offline: la foto se previsualiza en local y el resultado muestra el flujo que luego ejecuta la IA real.
                    </Text>
                  </View>
                  <ScanLine color={T.primary} size={22} />
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={pickInvoicePhoto}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      backgroundColor: T.ink,
                      borderRadius: 11,
                      paddingHorizontal: 13,
                      paddingVertical: 11,
                    }}
                  >
                    <UploadCloud color="#fff" size={16} />
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>Cargar foto de factura</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setOcrPhotoUri(null);
                      setOcrPhotoName("foto-demo-casa-diego.jpg");
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      backgroundColor: T.accentSoft,
                      borderRadius: 11,
                      paddingHorizontal: 13,
                      paddingVertical: 11,
                    }}
                  >
                    <FileText color={T.accent} size={16} />
                    <Text style={{ color: T.accent, fontSize: 12, fontWeight: "800" }}>Usar factura demo</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <OcrStat label="Proveedor" value={OCR_RESULT.supplier} tone={T.ink} />
                  <OcrStat label="Confianza" value={`${OCR_RESULT.confidence}%`} tone={T.ok} />
                  <OcrStat label="Total" value={eur(OCR_RESULT.total, 2)} tone={T.primary} />
                </View>

                <View style={{ marginTop: 12, borderWidth: 1, borderColor: T.line, borderRadius: 12, overflow: "hidden" }}>
                  {OCR_RESULT.lines.map((line, index) => (
                    <View
                      key={line.product}
                      style={{
                        padding: 11,
                        backgroundColor: index % 2 === 0 ? T.bg : T.surface,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: T.line,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: T.ink }}>{line.product}</Text>
                        <Text style={{ fontSize: 13, fontFamily: T.serif, color: T.ink }}>{eur(line.total, 2)}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: T.inkSoft, marginTop: 4 }}>
                        {line.qty} · {eur(line.unitPrice, 2)} · {line.effect}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={{ gap: 7, marginTop: 12 }}>
                  {OCR_RESULT.updates.map((item) => (
                    <View key={item} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <CheckCircle2 color={T.ok} size={15} style={{ marginTop: 1 }} />
                      <Text style={{ flex: 1, fontSize: 12, color: T.inkSoft, lineHeight: 17 }}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: compact ? "column" : "row", gap: 14 }}>
            <View style={{ flex: compact ? undefined : 1.45, gap: 14 }}>
              <View
                style={{
                  backgroundColor: T.surface,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 16,
                  padding: compact ? 14 : 18,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 20, fontFamily: T.serif, color: T.ink, letterSpacing: -0.4 }}>
                      Escandallos vivos
                    </Text>
                    <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
                      Ranking por desviacion de food cost
                    </Text>
                  </View>
                  <ChefHat color={T.primary} size={20} />
                </View>

                <View style={{ gap: 9 }}>
                  {rows.map((dish) => (
                    <TouchableOpacity
                      key={dish.id}
                      activeOpacity={0.82}
                      onPress={() => setSelectedDishId(dish.id)}
                      style={{
                        borderWidth: 1,
                        borderColor: selectedDishId === dish.id ? T.primary : T.line,
                        backgroundColor: selectedDishId === dish.id ? T.primarySoft : T.bg,
                        borderRadius: 14,
                        padding: 10,
                      }}
                    >
                      <View style={{ flexDirection: compact ? "column" : "row", gap: 12 }}>
                        <View style={{ flexDirection: "row", gap: 11, flex: 1, minWidth: 220 }}>
                          <DemoDishArt dish={dish} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                              <Text style={{ fontSize: 16, fontFamily: T.serif, color: T.ink, letterSpacing: -0.2 }}>
                                {dish.name}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: dish.status === "risk" ? T.primarySoft : dish.status === "star" ? T.okSoft : T.infoSoft,
                                  borderRadius: 999,
                                  paddingHorizontal: 7,
                                  paddingVertical: 3,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "800",
                                    color: dish.status === "risk" ? T.primary : dish.status === "star" ? T.ok : T.info,
                                  }}
                                >
                                  {dish.status === "risk" ? "RIESGO" : dish.status === "star" ? "ESTRELLA" : "OK"}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                              {dish.category} · {dish.units} raciones/servicio
                            </Text>
                            <View style={{ marginTop: 9 }}>
                              <CostBar value={dish.foodCost} target={dish.target} />
                            </View>
                            <Text style={{ fontSize: 11, color: T.inkSoft, marginTop: 5 }}>
                              Food cost {pct(dish.foodCost)} · objetivo {pct(dish.target)}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                            minWidth: compact ? "100%" : 260,
                            justifyContent: compact ? "flex-start" : "flex-end",
                          }}
                        >
                          {[
                            ["PVP", eur(dish.price, 2)],
                            ["Coste", eur(dish.cost, 2)],
                            ["Margen", eur(dish.margin, 2)],
                            [period.label, eur(dish.totalMargin)],
                          ].map(([label, value]) => (
                            <View
                              key={label}
                              style={{
                                minWidth: 76,
                                backgroundColor: T.surface,
                                borderWidth: 1,
                                borderColor: T.line,
                                borderRadius: 10,
                                paddingHorizontal: 9,
                                paddingVertical: 7,
                              }}
                            >
                              <Text style={{ fontSize: 9, fontWeight: "800", color: T.muted, letterSpacing: 0.9, textTransform: "uppercase" }}>
                                {label}
                              </Text>
                              <Text style={{ fontSize: 13, fontFamily: T.serif, color: T.ink, marginTop: 2 }}>
                                {value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View
                style={{
                  backgroundColor: T.ink,
                  borderRadius: 16,
                  padding: compact ? 16 : 20,
                  overflow: "hidden",
                }}
              >
                <View style={{ flexDirection: compact ? "column" : "row", gap: 18, alignItems: compact ? "stretch" : "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: T.accent, letterSpacing: 1.8, textTransform: "uppercase" }}>
                      Simulador de decision
                    </Text>
                    <Text style={{ fontSize: 26, fontFamily: T.serif, color: "#fff", marginTop: 6, letterSpacing: -0.6 }}>
                      {selectedDish.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", marginTop: 5, lineHeight: 18 }}>
                      Impacto mensual con precio, proveedor y merma ajustados.
                    </Text>
                    <Text style={{ fontSize: 42, fontFamily: T.serif, color: monthlyImpact >= 0 ? "#fff" : T.accent, marginTop: 12, letterSpacing: -1.2 }}>
                      {monthlyImpact >= 0 ? "+" : ""}{eur(monthlyImpact)}
                    </Text>
                  </View>
                  <View style={{ minWidth: compact ? "100%" : 330, gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 7 }}>
                      {[-0.5, 0, 0.5, 1].map((delta) => (
                        <TouchableOpacity
                          key={delta}
                          activeOpacity={0.8}
                          onPress={() => setPriceDelta(delta)}
                          style={{
                            flex: 1,
                            borderRadius: 10,
                            backgroundColor: priceDelta === delta ? T.accent : "rgba(255,255,255,0.08)",
                            borderWidth: 1,
                            borderColor: priceDelta === delta ? T.accent : "rgba(255,255,255,0.14)",
                            paddingVertical: 10,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                            {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} EUR
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <TogglePill active={oilDeal} label="Mejor aceite" onPress={() => setOilDeal(!oilDeal)} icon={TrendingDown} />
                      <TogglePill active={wasteControl} label="Merma -3,5%" onPress={() => setWasteControl(!wasteControl)} icon={ShieldCheck} />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ flex: compact ? undefined : 0.9, gap: 14 }}>
              <View
                style={{
                  backgroundColor: T.surface,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 16,
                  padding: compact ? 14 : 18,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 20, fontFamily: T.serif, color: T.ink, letterSpacing: -0.4 }}>
                      Alertas de compra
                    </Text>
                    <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
                      Prioridad por impacto en margen
                    </Text>
                  </View>
                  <View style={{ backgroundColor: T.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: T.primary }}>{ALERTS.length}</Text>
                  </View>
                </View>
                <View style={{ gap: 10 }}>
                  {ALERTS.map((alert) => (
                    <View
                      key={alert.title}
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        paddingVertical: 10,
                        borderTopWidth: 1,
                        borderTopColor: T.line,
                      }}
                    >
                      <View style={{ width: 4, borderRadius: 999, backgroundColor: alert.severity === "high" ? T.primary : T.accent }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: T.ink }}>{alert.title}</Text>
                        <Text style={{ fontSize: 12, color: T.inkSoft, lineHeight: 17, marginTop: 3 }}>
                          {alert.detail}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View
                style={{
                  backgroundColor: T.surface,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 16,
                  padding: compact ? 14 : 18,
                }}
              >
                <Text style={{ fontSize: 20, fontFamily: T.serif, color: T.ink, letterSpacing: -0.4 }}>
                  Tendencia food cost
                </Text>
                <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 3, marginBottom: 12 }}>
                  Ultimas 8 semanas
                </Text>
                <MiniTrend data={[30.8, 31.4, 32.1, 33.6, 34.2, 33.1, 32.4, avgFoodCost]} width={chartWidth} />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <View style={{ flex: 1, backgroundColor: T.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: T.line }}>
                    <Text style={{ fontSize: 9, fontWeight: "800", color: T.muted, letterSpacing: 0.9 }}>OBJETIVO</Text>
                    <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, marginTop: 3 }}>32%</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: T.bg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: T.line }}>
                    <Text style={{ fontSize: 9, fontWeight: "800", color: T.muted, letterSpacing: 0.9 }}>ACTUAL</Text>
                    <Text style={{ fontSize: 18, fontFamily: T.serif, color: avgFoodCost > 32 ? T.primary : T.ok, marginTop: 3 }}>
                      {pct(avgFoodCost)}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: T.surface,
                  borderWidth: 1,
                  borderColor: T.line,
                  borderRadius: 16,
                  padding: compact ? 14 : 18,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Calculator color={T.primary} size={18} />
                  <Text style={{ fontSize: 20, fontFamily: T.serif, color: T.ink, letterSpacing: -0.4 }}>
                    Comparar proveedores
                  </Text>
                </View>
                <View style={{ gap: 9 }}>
                  {SUPPLIERS.map((item) => {
                    const saving = item.currentPrice - item.bestPrice;
                    return (
                      <View
                        key={item.product}
                        style={{
                          backgroundColor: T.bg,
                          borderWidth: 1,
                          borderColor: T.line,
                          borderRadius: 12,
                          padding: 11,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                          <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: T.ink, lineHeight: 17 }}>
                            {item.product}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: "800", color: item.change > 0 ? T.primary : T.ok }}>
                            {item.change > 0 ? "+" : ""}{pct(item.change)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: T.inkSoft, marginTop: 5 }}>
                          Actual: {item.current} · {eur(item.currentPrice, 2)}
                        </Text>
                        <Text style={{ fontSize: 11, color: saving > 0 ? T.ok : T.muted, marginTop: 3 }}>
                          Mejor: {item.best} · {eur(item.bestPrice, 2)}{saving > 0 ? ` · ahorro ${eur(saving, 2)}` : ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
