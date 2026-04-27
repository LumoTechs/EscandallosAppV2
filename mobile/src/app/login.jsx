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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChefHat, MessageCircle } from "lucide-react-native";
import { T } from "../theme";
import { useSession } from "../utils/auth";

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
      const raw = e?.message || "";
      const msg = raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("networkerror")
        ? "Error de conexión. Comprueba tu red o que la app esté bien configurada."
        : raw.toLowerCase().includes("invalid")
        ? "Credenciales no válidas."
        : raw || "No se pudo iniciar sesión.";
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
        </View>
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
