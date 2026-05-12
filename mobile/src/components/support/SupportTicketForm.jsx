import React, { useState } from "react";
import {
  ActivityIndicator,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Send } from "lucide-react-native";
import { T } from "../../theme";
import { createTicket } from "../../utils/support/createTicket";

export function SupportTicketForm({ restaurantId }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [includeTechContext, setIncludeTechContext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const canSubmit = !!restaurantId && subject.trim().length > 0 && message.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setResult(null);
    const response = await createTicket({
      restaurantId,
      subject,
      message,
      includeTechContext,
    });
    setResult(response);
    setLoading(false);
    if (response.success) {
      setSubject("");
      setMessage("");
    }
  }

  if (result?.success) {
    return (
      <View
        style={{
          backgroundColor: T.okSoft,
          borderColor: T.ok,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
        }}
      >
        <Text style={{ color: T.ink, fontSize: 14, fontWeight: "700" }}>
          Ticket enviado
        </Text>
        <Text style={{ color: T.inkSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
          Te responderemos lo antes posible.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="Asunto"
        placeholderTextColor={T.muted}
        maxLength={200}
        editable={!loading}
        style={inputStyle}
      />
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Describe el problema..."
        placeholderTextColor={T.muted}
        maxLength={2000}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        editable={!loading}
        style={[inputStyle, { minHeight: 112, paddingTop: 12 }]}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: T.ink, fontSize: 13, fontWeight: "700" }}>
            Contexto técnico
          </Text>
          <Text style={{ color: T.inkSoft, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
            Incluye ruta y dispositivo para diagnosticar antes.
          </Text>
        </View>
        <Switch
          value={includeTechContext}
          onValueChange={setIncludeTechContext}
          disabled={loading}
          trackColor={{ false: T.lineStrong, true: T.primarySoft }}
          thumbColor={includeTechContext ? T.primary : T.muted}
        />
      </View>

      {result?.error ? (
        <View
          style={{
            backgroundColor: T.warnSoft,
            borderColor: T.warn,
            borderWidth: 1,
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ color: T.ink, fontSize: 12 }}>{result.error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
        style={{
          backgroundColor: canSubmit && !loading ? T.primary : T.line,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Send size={15} color={canSubmit ? "#fff" : T.muted} strokeWidth={2.2} />
            <Text
              style={{
                color: canSubmit ? "#fff" : T.muted,
                fontWeight: "800",
                fontSize: 14,
              }}
            >
              Enviar ticket de soporte
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const inputStyle = {
  backgroundColor: T.bg,
  borderColor: T.line,
  borderWidth: 1,
  borderRadius: 12,
  color: T.ink,
  fontSize: 14,
  paddingHorizontal: 12,
  paddingVertical: 11,
};
