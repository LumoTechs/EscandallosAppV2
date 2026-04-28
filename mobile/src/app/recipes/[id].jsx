import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from "react-native-svg";
import { ArrowLeft, Sparkles, Flame, AlertCircle, Camera } from "lucide-react-native";
import { T } from "../../theme";
import { apiFetch } from "../../utils/apiFetch";

const CATEGORIES = [
  { key: "entrantes",   label: "Entrantes",   color: "#4F7A3C", soft: "#ECF3E5" },
  { key: "principales", label: "Principales", color: "#B2451C", soft: "#FBEAD9" },
  { key: "segundos",    label: "Segundos",    color: "#D98324", soft: "#FDF2E2" },
  { key: "postres",     label: "Postres",     color: "#7B3FA0", soft: "#F5EEFF" },
  { key: "bebidas",     label: "Bebidas",     color: "#1A7A8A", soft: "#E0F7F9" },
];

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

const fmtEUR = (n) => `€${Number(n).toFixed(2)}`;

function getInitials(name) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function DishArt({ cat, name, height = 220 }) {
  const initials = getInitials(name);
  const gradId = `g-detail-${cat.key}`;
  return (
    <View style={{ width: "100%", height, position: "relative" }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 174" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={cat.soft} stopOpacity="1" />
            <Stop offset="1" stopColor={cat.color} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect width="200" height="174" fill={`url(#${gradId})`} />
        <Circle cx="40" cy="30" r="55" fill="#fff" opacity="0.08" />
        <Circle cx="170" cy="150" r="50" fill="#fff" opacity="0.10" />
        <Circle cx="100" cy="87" r="52" fill="#fff" opacity="0.22" />
        <Circle cx="100" cy="87" r="52" stroke="#fff" strokeWidth="1.5" opacity="0.5" fill="none" />
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
            fontSize: 72,
            fontFamily: T.serif,
            color: "#fff",
            letterSpacing: -2,
            textShadowColor: "rgba(0,0,0,0.20)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
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
          gap: 5,
          backgroundColor: "#FFF6DC",
          borderWidth: 1,
          borderColor: "#E8B931",
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
        }}
      >
        <Sparkles size={11} color="#9C7A12" />
        <Text style={{ fontSize: 10, fontWeight: "800", color: "#9C7A12", letterSpacing: 1 }}>
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
          gap: 5,
          backgroundColor: T.primarySoft,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
        }}
      >
        <Flame size={11} color={T.primary} />
        <Text style={{ fontSize: 10, fontWeight: "800", color: T.primary, letterSpacing: 1 }}>
          EN RIESGO
        </Text>
      </View>
    );
  }
  return null;
}

function StatBig({ label, value, color }) {
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: "800",
          color: T.muted,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          marginBottom: 5,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontFamily: T.serif, color, letterSpacing: -0.5 }}>
        {value}
      </Text>
    </View>
  );
}

export default function RecipeDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width: winWidth } = useWindowDimensions();
  const isWide = winWidth >= 760;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/recipes/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (alive) setError(err.error || `HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (alive) setRecipe(data.recipe);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <ArrowLeft color={T.inkSoft} size={16} />
            <Text style={{ fontSize: 13, color: T.inkSoft }}>Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <AlertCircle size={28} color={T.primary} />
          <Text style={{ fontSize: 16, fontFamily: T.serif, color: T.ink, marginTop: 12 }}>
            No se pudo cargar la receta
          </Text>
          <Text style={{ fontSize: 13, color: T.muted, marginTop: 6, textAlign: "center" }}>
            {error || "Inténtalo de nuevo"}
          </Text>
        </View>
      </View>
    );
  }

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Error", "No se pudo leer la imagen.");
      return;
    }
    setUploading(true);
    try {
      const mimeType = asset.mimeType || "image/jpeg";
      const base64Image = `data:${mimeType};base64,${asset.base64}`;
      const res = await apiFetch(`/api/recipes/${id}/upload-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image, mimeType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.image_url) {
        setRecipe((prev) => ({ ...prev, image_url: data.image_url }));
      }
    } catch (e) {
      console.error("Upload error:", e);
      Alert.alert("Error", "No se pudo subir la imagen. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const cat = getCat(recipe.category);
  const sale = parseFloat(recipe.sale_price || 0);
  const cost = parseFloat(recipe.total_cost || 0);
  const margin = parseFloat(recipe.margin || 0);
  const foodCost = parseFloat(recipe.actual_food_cost_percentage || 0);
  const target = parseFloat(recipe.target_food_cost_percentage || 35);
  const isRisky = foodCost > target;
  const isGold = sale > 0 && foodCost > 0 && foodCost <= target - 5;
  const tier = isGold ? "gold" : isRisky ? "risky" : "normal";

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}
        >
          <ArrowLeft color={T.inkSoft} size={16} />
          <Text style={{ fontSize: 13, color: T.inkSoft }}>Volver</Text>
        </TouchableOpacity>
        <RarityBadge tier={tier} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
          maxWidth: 920,
          width: "100%",
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View
          style={{
            backgroundColor: T.surface,
            borderRadius: 18,
            borderWidth: tier === "gold" ? 1.5 : 1,
            borderColor: tier === "gold" ? "#E8B931" : T.line,
            overflow: "hidden",
            shadowColor: "#2B1D12",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 14,
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: cat.soft,
              borderBottomWidth: 2,
              borderBottomColor: cat.color,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  color: cat.color,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {cat.label}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: cat.color, fontWeight: "600" }}>
              {recipe.ingredients.length} {recipe.ingredients.length === 1 ? "ingrediente" : "ingredientes"}
            </Text>
          </View>

          <View style={{ padding: 14 }}>
            <View
              style={{
                position: "relative",
                borderRadius: 14,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: T.line,
              }}
            >
              {recipe.image_url ? (
                <Image
                  source={{ uri: recipe.image_url }}
                  style={{ width: "100%", height: isWide ? 280 : 200 }}
                  resizeMode="cover"
                />
              ) : (
                <DishArt cat={cat} name={recipe.name} height={isWide ? 280 : 200} />
              )}
              <TouchableOpacity
                onPress={pickAndUpload}
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={14} color="#fff" />
                )}
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                  {uploading ? "Subiendo..." : recipe.image_url ? "Cambiar foto" : "Subir foto"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 28,
                fontFamily: T.serif,
                color: T.ink,
                letterSpacing: -0.6,
                marginTop: 16,
              }}
            >
              {recipe.name}
            </Text>
            <Text style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
              Objetivo de food cost: {Number(target).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Stats grid 2x2 */}
        <View
          style={{
            marginTop: 18,
            backgroundColor: T.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: T.line,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row" }}>
            <StatBig label="PVP" value={fmtEUR(sale)} color={T.ink} />
            <View style={{ width: 1, backgroundColor: T.line }} />
            <StatBig label="Coste total" value={fmtEUR(cost)} color={T.inkSoft} />
          </View>
          <View style={{ height: 1, backgroundColor: T.line }} />
          <View style={{ flexDirection: "row" }}>
            <StatBig
              label="Margen"
              value={fmtEUR(margin)}
              color={margin >= 0 ? T.ok : T.primary}
            />
            <View style={{ width: 1, backgroundColor: T.line }} />
            <StatBig
              label="Food cost"
              value={`${foodCost.toFixed(1)}%`}
              color={isRisky ? T.primary : isGold ? T.ok : T.ink}
            />
          </View>
        </View>

        {isRisky && (
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              gap: 10,
              alignItems: "flex-start",
              padding: 14,
              backgroundColor: T.primarySoft,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: T.primary,
            }}
          >
            <AlertCircle size={16} color={T.primary} />
            <Text style={{ flex: 1, fontSize: 13, color: T.primary, lineHeight: 18 }}>
              Food cost {foodCost.toFixed(1)}% supera el objetivo {target.toFixed(0)}%.
              Sube PVP o ajusta porciones para reducir coste.
            </Text>
          </View>
        )}

        {/* Ingredientes */}
        <View
          style={{
            marginTop: 18,
            backgroundColor: T.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: T.line,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: T.line,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: T.muted,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              Ingredientes
            </Text>
            <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, marginTop: 4 }}>
              Desglose por línea
            </Text>
          </View>
          {recipe.ingredients.length === 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: T.muted }}>Sin ingredientes</Text>
            </View>
          ) : (
            recipe.ingredients.map((ing, idx) => {
              const pctOfCost = cost > 0 ? (ing.line_cost / cost) * 100 : 0;
              return (
                <View
                  key={ing.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: T.line,
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: T.ink }}>
                      {ing.product_name}
                    </Text>
                    <Text style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      {ing.quantity.toFixed(2)} {ing.unit || ""} · {fmtEUR(ing.current_price)}/{ing.unit || "ud"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 14, fontFamily: T.serif, color: T.ink }}>
                      {fmtEUR(ing.line_cost)}
                    </Text>
                    <Text style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                      {pctOfCost.toFixed(0)}% del coste
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
