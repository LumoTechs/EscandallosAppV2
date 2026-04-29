import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChefHat, MessageCircle, Check, X } from "lucide-react-native";
import { T } from "../theme";
import { useSession } from "../utils/auth";

const TOKEN_NOTE = "* Consumo medio de tokens mensual al rededor de 5€, sujeto a actividad del cliente";

const PLANS = [
  {
    key: "basico",
    name: "Plan Básico",
    price: "49€",
    period: "/mes",
    color: T.primary,
    soft: T.primarySoft,
    features: [
      "Hasta 3 usuarios",
      "Escandallos ilimitados",
      "Procesado de facturas con IA",
      "Alertas de variación de precios",
      "Historial de precios 6 meses",
      TOKEN_NOTE,
    ],
  },
  {
    key: "pro",
    name: "Plan Pro",
    price: "99€",
    period: "/mes",
    color: "#7B3FA0",
    soft: "#F5EEFF",
    features: [
      "Usuarios ilimitados",
      "Escandallos ilimitados",
      "Procesado de facturas con IA",
      "Alertas avanzadas con IA",
      "Historial de precios completo",
      "Informes y exportación",
      "Soporte prioritario",
      TOKEN_NOTE,
    ],
  },
];

function PlansModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: T.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 24,
            maxHeight: "90%",
          }}
        >
          {/* Handle + cerrar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 20, fontFamily: T.serif, color: T.ink, letterSpacing: -0.4 }}>
              Planes
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, justifyContent: "center", alignItems: "center" }}>
              <X size={16} color={T.ink} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
            {PLANS.map((plan) => (
              <View
                key={plan.key}
                style={{
                  backgroundColor: T.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: T.line,
                  overflow: "hidden",
                }}
              >
                {/* Banda de color */}
                <View style={{ backgroundColor: plan.soft, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.line }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: plan.color }}>{plan.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 4 }}>
                    <Text style={{ fontSize: 28, fontFamily: T.serif, color: plan.color, letterSpacing: -0.5 }}>{plan.price}</Text>
                    <Text style={{ fontSize: 13, color: plan.color, opacity: 0.7 }}>{plan.period}</Text>
                  </View>
                </View>

                {/* Features */}
                <View style={{ padding: 16, gap: 8 }}>
                  {plan.features.map((feat, i) => {
                    const isNote = feat.startsWith("*");
                    return (
                      <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: isNote ? "flex-start" : "center", marginTop: isNote ? 4 : 0 }}>
                        {!isNote && (
                          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: plan.soft, justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
                            <Check size={10} color={plan.color} strokeWidth={3} />
                          </View>
                        )}
                        <Text style={{
                          fontSize: isNote ? 11 : 13,
                          color: isNote ? T.muted : T.ink,
                          flex: 1,
                          lineHeight: isNote ? 16 : 20,
                          fontStyle: isNote ? "italic" : "normal",
                          marginLeft: isNote ? 28 : 0,
                        }}>
                          {feat}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => { onClose(); Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`); }}
              activeOpacity={0.88}
              style={{ backgroundColor: T.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Solicitar acceso</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const WHATSAPP_NUMBER = "34647523682";
const WHATSAPP_TEXT = encodeURIComponent(
  "Hola Luis, me gustaría probar Lumotech para mi restaurante."
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`;

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isAuthenticated, isReady } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPlans, setShowPlans] = useState(false);

  React.useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isReady, isAuthenticated, router]);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Introduce email y contraseña.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (e) {
      const msg = e?.message?.toLowerCase().includes("invalid")
        ? "Credenciales no válidas."
        : e?.message || "No se pudo iniciar sesión.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onRequestAccess = () => {
    Linking.openURL(WHATSAPP_URL).catch(() => {
      setError("No se pudo abrir WhatsApp.");
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: T.primarySoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <ChefHat size={36} color={T.primary} />
          </View>
          <Text
            style={{
              fontFamily: T.serif,
              fontSize: 32,
              color: T.ink,
              letterSpacing: -0.5,
            }}
          >
            Lumotech
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: T.inkSoft,
              marginTop: 4,
            }}
          >
            Escandallos para restaurantes
          </Text>
        </View>

        <View
          style={{
            backgroundColor: T.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: T.line,
            padding: 20,
            maxWidth: 420,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 6,
            }}
          >
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@restaurante.com"
            placeholderTextColor={T.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!submitting}
            style={inputStyle}
          />

          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginTop: 16,
              marginBottom: 6,
            }}
          >
            Contraseña
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={T.muted}
            secureTextEntry
            textContentType="password"
            editable={!submitting}
            onSubmitEditing={onSubmit}
            style={inputStyle}
          />

          {error ? (
            <View
              style={{
                marginTop: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: T.warnSoft,
                borderWidth: 1,
                borderColor: T.warn,
              }}
            >
              <Text style={{ color: T.ink, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={submitting}
            style={{
              marginTop: 20,
              backgroundColor: T.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: 15,
                  letterSpacing: 0.3,
                }}
              >
                Entrar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View
          style={{
            marginTop: 24,
            maxWidth: 420,
            width: "100%",
            alignSelf: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: T.inkSoft, fontSize: 13, marginBottom: 10 }}>
            ¿Aún no tienes acceso?
          </Text>
          <TouchableOpacity
            onPress={onRequestAccess}
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
              Solicitar acceso por WhatsApp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowPlans(true)} style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 13, color: T.primary, fontWeight: "600", textDecorationLine: "underline" }}>
              Ver planes
            </Text>
          </TouchableOpacity>
        </View>

        <PlansModal visible={showPlans} onClose={() => setShowPlans(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: T.line,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: Platform.OS === "ios" ? 14 : 10,
  fontSize: 16,
  color: T.ink,
  backgroundColor: T.bg,
};
