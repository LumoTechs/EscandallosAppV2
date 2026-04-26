import React from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useEffect, useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Flame,
} from "lucide-react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useRouter } from "expo-router";
import { T } from "../../theme";
import { apiFetch } from "../../utils/apiFetch";
import { useSession } from "../../utils/auth";

const CATEGORIES = [
  { key: "entrantes",   label: "Entrantes",   color: "#4F7A3C", soft: "#ECF3E5" },
  { key: "principales", label: "Principales", color: "#B2451C", soft: "#FBEAD9" },
  { key: "segundos",    label: "Segundos",    color: "#D98324", soft: "#FDF2E2" },
  { key: "postres",     label: "Postres",     color: "#7B3FA0", soft: "#F5EEFF" },
  { key: "bebidas",     label: "Bebidas",     color: "#1A7A8A", soft: "#E0F7F9" },
];

const CATEGORY_ORDER = ["entrantes", "principales", "segundos", "postres", "bebidas", "otros"];

function getCat(key) {
  return (
    CATEGORIES.find((c) => c.key === key) || {
      key: "otros",
      label: "Otros",
      color: T.muted,
      soft: T.bg,
    }
  );
}

function EmptyPeaceful() {
  return (
    <Svg width={140} height={100} viewBox="0 0 140 100">
      <Circle cx="70" cy="60" r="34" fill={T.primarySoft} />
      <Circle cx="70" cy="60" r="34" stroke={T.accent} strokeWidth="1" fill="none" opacity="0.3" />
      <Circle cx="70" cy="60" r="10" fill={T.primary} />
      <Path d="M65 60 L 69 64 L 76 57" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const fmtEUR = (n) => `€${Number(n).toFixed(2)}`;

function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// "Arte" del plato — placeholder hasta que haya foto real.
// Gradiente de la categoría + iniciales en grande tipo monograma de carta.
function DishArt({ cat, name }) {
  const initials = getInitials(name);
  const gradId = `g-${cat.key}`;
  return (
    <View style={{ width: "100%", aspectRatio: 1.15, position: "relative" }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 174" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={cat.soft} stopOpacity="1" />
            <Stop offset="1" stopColor={cat.color} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect width="200" height="174" fill={`url(#${gradId})`} />
        {/* círculos decorativos suaves */}
        <Circle cx="40" cy="30" r="50" fill="#fff" opacity="0.08" />
        <Circle cx="170" cy="150" r="40" fill="#fff" opacity="0.10" />
        <Circle cx="100" cy="87" r="46" fill="#fff" opacity="0.22" />
        <Circle cx="100" cy="87" r="46" stroke="#fff" strokeWidth="1.5" opacity="0.5" fill="none" />
      </Svg>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 44,
            fontFamily: T.serif,
            color: "#fff",
            letterSpacing: -1.5,
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

function RarityBadge({ tier }) {
  if (tier === "gold") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          backgroundColor: "#FFF6DC",
          borderWidth: 1,
          borderColor: "#E8B931",
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: 999,
        }}
      >
        <Sparkles size={9} color="#9C7A12" />
        <Text style={{ fontSize: 9, fontWeight: "800", color: "#9C7A12", letterSpacing: 0.8 }}>
          ESTRELLA
        </Text>
      </View>
    );
  }
  if (tier === "risky") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          backgroundColor: T.primarySoft,
          paddingHorizontal: 7,
          paddingVertical: 3,
          borderRadius: 999,
        }}
      >
        <Flame size={9} color={T.primary} />
        <Text style={{ fontSize: 9, fontWeight: "800", color: T.primary, letterSpacing: 0.8 }}>
          RIESGO
        </Text>
      </View>
    );
  }
  return null;
}

function RecipeCard({ r }) {
  const cost = parseFloat(r.total_cost || 0);
  const sale = parseFloat(r.sale_price || 0);
  const margin = sale - cost;
  const foodCost = parseFloat(r.actual_food_cost_percentage || 0);
  const target = parseFloat(r.target_food_cost_percentage || 35);
  const isRisky = foodCost > target;
  const isGold = sale > 0 && foodCost > 0 && foodCost <= target - 5;
  const tier = isGold ? "gold" : isRisky ? "risky" : "normal";
  const cat = getCat(r.category);
  const ingCount = Number(r.ingredient_count || 0);

  const borderColor = tier === "gold" ? "#E8B931" : T.line;
  const borderWidth = tier === "gold" ? 1.5 : 1;

  return (
    <View
      style={{
        backgroundColor: T.surface,
        borderRadius: 16,
        borderWidth,
        borderColor,
        overflow: "hidden",
        shadowColor: "#2B1D12",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {/* Header tipo "tipo Pokemon" */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: cat.soft,
          borderBottomWidth: 2,
          borderBottomColor: cat.color,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: cat.color }} />
          <Text
            style={{
              fontSize: 9,
              fontWeight: "800",
              color: cat.color,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
            numberOfLines={1}
          >
            {cat.label}
          </Text>
        </View>
        <RarityBadge tier={tier} />
      </View>

      {/* Frame del "arte" del plato */}
      <View style={{ padding: 8, paddingBottom: 0 }}>
        <View
          style={{
            borderRadius: 10,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: T.line,
          }}
        >
          <DishArt cat={cat} name={r.name} />
        </View>
      </View>

      {/* Nombre + ingredientes */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 }}>
        <Text
          style={{
            fontSize: 16,
            fontFamily: T.serif,
            color: T.ink,
            letterSpacing: -0.3,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {r.name}
        </Text>
        <Text style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
          {ingCount} {ingCount === 1 ? "ingrediente" : "ingredientes"}
        </Text>
      </View>

      {/* Stats grid 2x2 tipo carta */}
      <View
        style={{
          marginHorizontal: 12,
          marginTop: 10,
          marginBottom: 12,
          borderRadius: 10,
          backgroundColor: T.bg,
          borderWidth: 1,
          borderColor: T.line,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row" }}>
          <Stat label="PVP" value={fmtEUR(sale)} color={T.ink} />
          <View style={{ width: 1, backgroundColor: T.line }} />
          <Stat label="Coste" value={fmtEUR(cost)} color={T.inkSoft} />
        </View>
        <View style={{ height: 1, backgroundColor: T.line }} />
        <View style={{ flexDirection: "row" }}>
          <Stat
            label="Margen"
            value={fmtEUR(margin)}
            color={margin >= 0 ? T.ok : T.primary}
          />
          <View style={{ width: 1, backgroundColor: T.line }} />
          <Stat
            label="Food cost"
            value={`${foodCost.toFixed(1)}%`}
            color={isRisky ? T.primary : isGold ? T.ok : T.ink}
          />
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 9 }}>
      <Text
        style={{
          fontSize: 8,
          fontWeight: "800",
          color: T.muted,
          letterSpacing: 1.3,
          textTransform: "uppercase",
          marginBottom: 3,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontFamily: T.serif, color, letterSpacing: -0.2 }}>
        {value}
      </Text>
    </View>
  );
}

export default function Recipes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, isAuthenticated } = useSession();
  const { width: winWidth } = useWindowDimensions();
  const numCols = winWidth >= 1100 ? 4 : winWidth >= 760 ? 3 : 2;
  const cardGap = 14;
  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [newCategory, setNewCategory] = useState(null);
  const [newIngredients, setNewIngredients] = useState([]);
  const [ingSearch, setIngSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    loadData();
  }, [isReady, isAuthenticated]);

  const loadData = async () => {
    try {
      const [recipesRes, productsRes] = await Promise.all([
        apiFetch("/api/recipes/list"),
        apiFetch("/api/products/list"),
      ]);
      const rd = await recipesRes.json();
      const pd = await productsRes.json();
      setRecipes(rd.recipes || []);
      setProducts(pd.products || []);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    for (const r of recipes) {
      const key = r.category || "otros";
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return CATEGORY_ORDER
      .map((key) => ({ key, cat: getCat(key), recipes: map[key] || [] }))
      .filter((g) => g.recipes.length > 0);
  }, [recipes]);

  const filteredForAdd = useMemo(() => {
    if (!ingSearch.trim()) return [];
    const q = ingSearch.toLowerCase().trim();
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .filter((p) => !newIngredients.find((i) => i.product_id === p.id))
      .slice(0, 6);
  }, [ingSearch, products, newIngredients]);

  const liveCost = useMemo(() => {
    return newIngredients.reduce((sum, ing) => {
      const p = products.find((pr) => pr.id === ing.product_id);
      return sum + (p ? parseFloat(p.current_price || 0) * parseFloat(ing.quantity || 0) : 0);
    }, 0);
  }, [newIngredients, products]);

  const liveSale = parseFloat(newSalePrice) || 0;
  const liveMargin = liveSale - liveCost;
  const liveFoodCost = liveSale > 0 ? (liveCost / liveSale) * 100 : 0;

  const addIng = (productId) => {
    setNewIngredients([...newIngredients, { product_id: productId, quantity: 0.1 }]);
    setIngSearch("");
  };

  const updateQty = (productId, qty) => {
    setNewIngredients(
      newIngredients.map((i) =>
        i.product_id === productId ? { ...i, quantity: parseFloat(qty) || 0 } : i
      )
    );
  };

  const removeIng = (productId) => {
    setNewIngredients(newIngredients.filter((i) => i.product_id !== productId));
  };

  const cancel = () => {
    setCreating(false);
    setNewName("");
    setNewSalePrice("");
    setNewCategory(null);
    setNewIngredients([]);
    setIngSearch("");
  };

  const save = async () => {
    if (!newName || !newSalePrice || newIngredients.length === 0) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/recipes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          sale_price: parseFloat(newSalePrice),
          category: newCategory,
          ingredients: newIngredients.map((i) => {
            const p = products.find((pr) => pr.id === i.product_id);
            return { product_id: i.product_id, quantity: i.quantity, unit: p?.unit || null };
          }),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert("Error", err.error || "No se pudo guardar");
        setSaving(false);
        return;
      }
      cancel();
      await loadData();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  // ======= VISTA DE CREACIÓN =======
  if (creating) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
        <StatusBar style="dark" />

        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <TouchableOpacity onPress={cancel} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <ArrowLeft color={T.inkSoft} size={16} />
            <Text style={{ fontSize: 13, color: T.inkSoft }}>Volver</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 11, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
            Nuevo escandallo
          </Text>
          <Text style={{ fontSize: 30, fontFamily: T.serif, color: T.ink, letterSpacing: -0.6, marginTop: 6 }}>
            Crear receta
          </Text>
          <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 4 }}>
            Margen calculado en tiempo real
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero live stats */}
          <View style={{ backgroundColor: T.ink, borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
              Margen en tiempo real
            </Text>
            <Text
              style={{
                fontSize: 40,
                fontFamily: T.serif,
                color: liveMargin >= 0 ? "#fff" : T.accent,
                letterSpacing: -1,
                marginTop: 8,
              }}
            >
              {fmtEUR(liveMargin)}
            </Text>
            <View
              style={{
                flexDirection: "row",
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.12)",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 1 }}>COSTE</Text>
                <Text style={{ fontSize: 18, color: "#fff", fontFamily: T.serif, marginTop: 3 }}>
                  {fmtEUR(liveCost)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 1 }}>FOOD COST</Text>
                <Text
                  style={{
                    fontSize: 18,
                    color: liveFoodCost > 35 ? T.accent : "#fff",
                    fontFamily: T.serif,
                    marginTop: 3,
                  }}
                >
                  {liveFoodCost.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Nombre + PVP */}
          <View style={{ backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 20, marginBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: T.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
              Nombre del plato
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Ej: Pizza Margherita"
              placeholderTextColor={T.muted}
              style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, paddingVertical: 4 }}
            />
            <View style={{ height: 1, backgroundColor: T.line, marginVertical: 14 }} />
            <Text style={{ fontSize: 10, fontWeight: "600", color: T.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
              Precio de venta (PVP)
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 20, color: T.inkSoft }}>€</Text>
              <TextInput
                value={newSalePrice}
                onChangeText={setNewSalePrice}
                placeholder="0.00"
                placeholderTextColor={T.muted}
                keyboardType="decimal-pad"
                style={{ flex: 1, fontSize: 20, fontFamily: T.serif, color: T.ink, paddingVertical: 4 }}
              />
            </View>
          </View>

          {/* Categoría */}
          <View style={{ backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 20, marginBottom: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: T.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
              Sección de la carta
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((cat) => {
                const selected = newCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setNewCategory(selected ? null : cat.key)}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: selected ? cat.color : T.line,
                      backgroundColor: selected ? cat.soft : T.bg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: selected ? cat.color : T.inkSoft,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Ingredientes */}
          <View style={{ backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, letterSpacing: -0.3 }}>
                Ingredientes
              </Text>
              <Text style={{ fontSize: 12, color: T.inkSoft }}>{newIngredients.length} items</Text>
            </View>

            {newIngredients.map((ing, idx) => {
              const p = products.find((pr) => pr.id === ing.product_id);
              if (!p) return null;
              const subtotal = parseFloat(p.current_price || 0) * parseFloat(ing.quantity || 0);
              return (
                <View
                  key={ing.product_id}
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: T.line,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: T.ink }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                        €{Number(p.current_price).toFixed(2)} / {p.unit}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeIng(ing.product_id)} style={{ padding: 4 }}>
                      <Trash2 size={14} color={T.muted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => updateQty(ing.product_id, Math.max(0, ing.quantity - 0.05))}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: T.line,
                        backgroundColor: T.bg,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Minus size={12} color={T.ink} />
                    </TouchableOpacity>
                    <TextInput
                      value={String(ing.quantity)}
                      onChangeText={(v) => updateQty(ing.product_id, v)}
                      keyboardType="decimal-pad"
                      style={{
                        width: 70,
                        textAlign: "center",
                        fontSize: 14,
                        paddingVertical: 6,
                        paddingHorizontal: 4,
                        borderWidth: 1,
                        borderColor: T.line,
                        borderRadius: 8,
                        color: T.ink,
                      }}
                    />
                    <Text style={{ fontSize: 12, color: T.inkSoft }}>{p.unit}</Text>
                    <TouchableOpacity
                      onPress={() => updateQty(ing.product_id, ing.quantity + 0.05)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: T.line,
                        backgroundColor: T.bg,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Plus size={12} color={T.ink} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: T.primary }}>
                        {fmtEUR(subtotal)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View
              style={{
                marginTop: newIngredients.length > 0 ? 14 : 0,
                paddingTop: newIngredients.length > 0 ? 14 : 0,
                borderTopWidth: newIngredients.length > 0 ? 1 : 0,
                borderTopColor: T.line,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: T.bg,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                }}
              >
                <Search size={14} color={T.muted} />
                <TextInput
                  value={ingSearch}
                  onChangeText={setIngSearch}
                  placeholder="Añadir ingrediente..."
                  placeholderTextColor={T.muted}
                  style={{ flex: 1, paddingVertical: 10, fontSize: 13, color: T.ink }}
                />
              </View>
              {filteredForAdd.length > 0 && (
                <View
                  style={{
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: T.line,
                    borderRadius: 10,
                    backgroundColor: T.surface,
                    overflow: "hidden",
                  }}
                >
                  {filteredForAdd.map((p, idx) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => addIng(p.id)}
                      activeOpacity={0.7}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: T.line,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: T.ink, fontWeight: "500" }}>{p.name}</Text>
                        <Text style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                          €{Number(p.current_price).toFixed(2)} / {p.unit}
                        </Text>
                      </View>
                      <Plus size={14} color={T.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={cancel}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: T.line,
                backgroundColor: T.surface,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: T.ink }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              disabled={!newName || !newSalePrice || newIngredients.length === 0 || saving}
              style={{
                flex: 2,
                paddingVertical: 16,
                backgroundColor: T.primary,
                opacity: !newName || !newSalePrice || newIngredients.length === 0 || saving ? 0.4 : 1,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Guardar escandallo</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ======= LISTADO =======
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
          Escandallos
        </Text>
        <Text style={{ fontSize: 30, fontFamily: T.serif, color: T.ink, letterSpacing: -0.6, marginTop: 6 }}>
          La carta
        </Text>
        <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 4 }}>
          Calcula margen y food cost en vivo
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 120,
            maxWidth: 1280,
            width: "100%",
            alignSelf: "center",
          }}
          showsVerticalScrollIndicator={false}
        >
          {recipes.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <EmptyPeaceful />
              <Text style={{ fontSize: 15, fontFamily: T.serif, color: T.ink, marginTop: 12 }}>
                Sin escandallos
              </Text>
              <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
                Crea el primero para ver márgenes
              </Text>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.key} style={{ marginBottom: 28 }}>
                {/* Cabecera de sección */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 14,
                    gap: 10,
                  }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: group.cat.color }} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: group.cat.color,
                      letterSpacing: 1.8,
                      textTransform: "uppercase",
                    }}
                  >
                    {group.cat.label}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: T.line }} />
                  <Text style={{ fontSize: 11, color: T.muted }}>
                    {group.recipes.length} {group.recipes.length === 1 ? "plato" : "platos"}
                  </Text>
                </View>

                {/* Tarjetas en grid responsive */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginHorizontal: -cardGap / 2,
                  }}
                >
                  {group.recipes.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      activeOpacity={0.85}
                      onPress={() => router.push(`/recipes/${r.id}`)}
                      style={{
                        width: `${100 / numCols}%`,
                        paddingHorizontal: cardGap / 2,
                        marginBottom: cardGap,
                      }}
                    >
                      <RecipeCard r={r} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            onPress={() => setCreating(true)}
            activeOpacity={0.88}
            style={{
              backgroundColor: T.primary,
              borderRadius: 14,
              padding: 18,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus color="#fff" size={18} strokeWidth={2.2} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>Nuevo escandallo</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
