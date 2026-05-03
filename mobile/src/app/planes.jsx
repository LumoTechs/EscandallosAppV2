import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChefHat,
  Check,
  Sparkles,
  ArrowLeft,
  MessageCircle,
} from "lucide-react-native";
import { T } from "../theme";
import { useSession } from "../utils/auth";
import { apiFetch } from "../utils/apiFetch";

const WHATSAPP_NUMBER = "34647523682";
const wa = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

const PLANS = [
  {
    id: "basico",
    name: "Básico",
    price: 99,
    tagline: "Para empezar a controlar tus márgenes.",
    checkoutUrl: "https://buy.stripe.com/test_cNicMZgeL66haAXfH5grS00",
    features: [
      "Hasta 10 platos configurables",
      "Escandallos automáticos con IA",
      "Subida de facturas (OCR)",
      "Análisis de costes por receta",
      "Soporte L-V de 9:00 a 14:00",
      "* Estimación media de 5 € mensuales en consumo de tokens, según actividad del cliente",
    ],
    accent: T.info,
    accentSoft: T.infoSoft,
  },
  {
    id: "pro",
    name: "Pro",
    price: 199,
    highlight: true,
    badge: "Más popular",
    tagline: "Para restaurantes con carta y marca propia.",
    checkoutUrl: "https://buy.stripe.com/test_14A9AN2nVgKVbF152rgrS01",
    features: [
      "Hasta 30 platos configurables",
      "Todo lo del plan Básico",
      "App adaptada a la imagen del restaurante",
      "Logos, colores y dominio propio",
      "Soporte L-S de 9:00 a 20:00",
      "* Estimación media de 5 € mensuales en consumo de tokens, según actividad del cliente",
    ],
    accent: T.primary,
    accentSoft: T.primarySoft,
  },
  {
    id: "premium",
    name: "Premium",
    price: 499,
    tagline: "Todo incluido. Sin sorpresas.",
    checkoutUrl: "https://buy.stripe.com/test_dRm14h4w3amx6kH7azgrS02",
    features: [
      "Platos ilimitados (carta completa)",
      "Todo lo del plan Pro",
      "Coste de IA incluido (sin cargos por uso)",
      "Consultoría 1h/mes con Luis",
      "App de Análisis de Márgenes incluida",
      "App de Turnos de Empleados incluida",
      "Soporte prioritario",
    ],
    accent: T.accent,
    accentSoft: T.accentSoft,
  },
];

export default function Planes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useSession();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const cols = width >= 1100 ? 3 : width >= 760 ? 2 : 1;
  const cardWidth =
    cols === 1 ? "100%" : cols === 2 ? "48%" : "31.5%";

  const onContact = () =>
    Linking.openURL(
      wa("Hola Luis, quiero información sobre los planes de Lumotech.")
    ).catch(() => {});

  // Si el usuario está logueado, generamos un Checkout Session server-side
  // para asociar la suscripción a su cuenta. Si no, abrimos el Payment Link
  // público (lead capture, el alta a la app la sigue dando Luis a mano).
  const onChoose = async (plan) => {
    if (!isAuthenticated) {
      Linking.openURL(plan.checkoutUrl).catch(() => {});
      return;
    }
    setLoadingPlan(plan.id);
    try {
      const res = await apiFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        Linking.openURL(data.url);
      } else {
        // Fallback al payment link si el endpoint falla por config incompleta
        Linking.openURL(plan.checkoutUrl).catch(() => {});
      }
    } catch (e) {
      Linking.openURL(plan.checkoutUrl).catch(() => {});
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 24,
        }}
      >
        {/* Top bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 1200,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 4,
            }}
          >
            <ArrowLeft size={18} color={T.inkSoft} />
            <Text style={{ color: T.inkSoft, fontSize: 14 }}>Volver</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: T.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChefHat size={18} color={T.primary} />
            </View>
            <Text
              style={{ fontFamily: T.serif, fontSize: 20, color: T.ink }}
            >
              Lumotech
            </Text>
          </View>
        </View>

        {/* Hero */}
        <View
          style={{
            alignItems: "center",
            marginTop: 40,
            marginBottom: 40,
            maxWidth: 720,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: T.primarySoft,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} color={T.primary} />
            <Text
              style={{
                color: T.primary,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.4,
              }}
            >
              ESCANDALLOS CON IA
            </Text>
          </View>
          <Text
            style={{
              fontFamily: T.serif,
              fontSize: cols === 1 ? 34 : 44,
              color: T.ink,
              textAlign: "center",
              letterSpacing: -0.8,
              lineHeight: cols === 1 ? 40 : 52,
            }}
          >
            Controla los márgenes de tu restaurante.
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: T.inkSoft,
              textAlign: "center",
              marginTop: 14,
              lineHeight: 24,
            }}
          >
            Sube facturas, calcula escandallos automáticamente y descubre qué
            platos te dan dinero — y cuáles no. Elige el plan que se adapta a
            tu restaurante.
          </Text>
        </View>

        {/* Plans grid */}
        <View
          style={{
            flexDirection: cols === 1 ? "column" : "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 20,
            maxWidth: 1200,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              width={cardWidth}
              loading={loadingPlan === plan.id}
              onChoose={() => onChoose(plan)}
            />
          ))}
        </View>

        {/* Footer */}
        <View
          style={{
            marginTop: 56,
            alignItems: "center",
            maxWidth: 720,
            alignSelf: "center",
          }}
        >
          <Text
            style={{
              color: T.inkSoft,
              fontSize: 14,
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            ¿Dudas, descuento o necesitas algo a medida? Hablamos.
          </Text>
          <TouchableOpacity
            onPress={onContact}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: T.ok,
              backgroundColor: T.okSoft,
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <MessageCircle size={18} color={T.ok} />
            <Text style={{ color: T.ok, fontWeight: "700", fontSize: 14 }}>
              Hablar con Luis por WhatsApp
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: T.muted,
              fontSize: 12,
              marginTop: 24,
              textAlign: "center",
            }}
          >
            Precios sin IVA. Pago mensual recurrente. Cancela cuando quieras.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function PlanCard({ plan, width, onChoose, loading }) {
  const isHighlight = plan.highlight;
  return (
    <View
      style={{
        width,
        minWidth: 260,
        backgroundColor: T.surface,
        borderRadius: 20,
        borderWidth: isHighlight ? 2 : 1,
        borderColor: isHighlight ? plan.accent : T.line,
        padding: 24,
        ...(Platform.OS === "web"
          ? {
              boxShadow: isHighlight
                ? "0 12px 32px -12px rgba(178, 69, 28, 0.25)"
                : "0 4px 14px -4px rgba(43, 29, 18, 0.06)",
            }
          : {
              shadowColor: "#000",
              shadowOpacity: isHighlight ? 0.12 : 0.05,
              shadowRadius: isHighlight ? 18 : 8,
              shadowOffset: { width: 0, height: 6 },
              elevation: isHighlight ? 6 : 2,
            }),
      }}
    >
      {plan.badge ? (
        <View
          style={{
            position: "absolute",
            top: -12,
            right: 20,
            backgroundColor: plan.accent,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 0.4,
            }}
          >
            {plan.badge.toUpperCase()}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: plan.accentSoft,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            color: plan.accent,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.4,
          }}
        >
          {plan.name.toUpperCase()}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Text
          style={{
            fontFamily: T.serif,
            fontSize: 44,
            color: T.ink,
            letterSpacing: -1,
          }}
        >
          {plan.price}€
        </Text>
        <Text style={{ color: T.muted, fontSize: 14 }}>/mes</Text>
      </View>
      <Text
        style={{ color: T.inkSoft, fontSize: 14, marginTop: 6, marginBottom: 18 }}
      >
        {plan.tagline}
      </Text>

      <View style={{ gap: 10, marginBottom: 22 }}>
        {plan.features.map((f, i) => {
          const isNote = f.startsWith("*");
          return (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
            >
              {!isNote && (
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    backgroundColor: plan.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  }}
                >
                  <Check size={12} color={plan.accent} strokeWidth={3} />
                </View>
              )}
              <Text
                style={{
                  flex: 1,
                  color: isNote ? T.muted : T.ink,
                  fontSize: isNote ? 11 : 14,
                  lineHeight: isNote ? 15 : 20,
                  fontStyle: isNote ? "italic" : "normal",
                  marginLeft: isNote ? 28 : 0,
                  marginTop: isNote ? 2 : 0,
                }}
              >
                {f}
              </Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={onChoose}
        disabled={loading}
        style={{
          backgroundColor: isHighlight ? plan.accent : T.surface,
          borderWidth: isHighlight ? 0 : 1.5,
          borderColor: plan.accent,
          borderRadius: 12,
          paddingVertical: 13,
          alignItems: "center",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={isHighlight ? "#fff" : plan.accent} />
        ) : (
          <Text
            style={{
              color: isHighlight ? "#fff" : plan.accent,
              fontWeight: "700",
              fontSize: 14,
              letterSpacing: 0.3,
            }}
          >
            Empezar con {plan.name}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
