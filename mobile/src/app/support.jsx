import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, ChevronRight, Send } from "lucide-react-native";
import { T } from "../theme";
import { apiFetch } from "../utils/apiFetch";
import { useSession } from "../utils/auth";

const STATUS_META = {
  open:        { label: "Abierto",      color: T.info,    soft: T.infoSoft },
  in_progress: { label: "En proceso",   color: T.warn,    soft: T.warnSoft },
  resolved:    { label: "Resuelto",     color: T.ok,      soft: T.okSoft },
  closed:      { label: "Cerrado",      color: T.muted,   soft: T.line },
};

function statusMeta(s) {
  return STATUS_META[s] || STATUS_META.open;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Support() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, isAuthenticated } = useSession();
  const scrollRef = useRef(null);

  const [view, setView] = useState("list"); // 'list' | 'new' | 'detail'
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    loadTickets();
  }, [isReady, isAuthenticated]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/support");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (ticket) => {
    setSelected(ticket);
    setView("detail");
    try {
      const res = await apiFetch(`/api/support?ticket_id=${ticket.id}`);
      const data = await res.json();
      setSelected(data.ticket);
      setReplies(data.replies || []);
    } catch (e) {
      console.error(e);
    }
  };

  const createTicket = async () => {
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (data.ticket) {
        setTickets((prev) => [data.ticket, ...prev]);
        setSubject("");
        setDescription("");
        setView("list");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSubmitting(true);
    const text = replyText.trim();
    setReplyText("");
    try {
      const res = await apiFetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: selected.id, message: text }),
      });
      const data = await res.json();
      if (data.reply) {
        setReplies((prev) => [...prev, data.reply]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (view === "detail" || view === "new") {
      setView("list");
      setSelected(null);
      setReplies([]);
    } else {
      router.back();
    }
  };

  const renderHeader = (title) => (
    <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <TouchableOpacity onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <ArrowLeft size={20} color={T.ink} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontFamily: T.serif, color: T.ink, letterSpacing: -0.4, flex: 1 }}>
        {title}
      </Text>
    </View>
  );

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
              Ayuda
            </Text>
            <Text style={{ fontSize: 30, fontFamily: T.serif, color: T.ink, letterSpacing: -0.6, marginTop: 6 }}>
              Soporte
            </Text>
            <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 4 }}>
              Consultas y asistencia técnica
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: T.line, backgroundColor: T.surface, alignItems: "center", justifyContent: "center", marginTop: 4 }}
          >
            <ArrowLeft size={16} color={T.inkSoft} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={T.primary} />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={() => setView("new")}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: T.primary,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 18,
                marginBottom: 20,
              }}
            >
              <Plus size={18} color="#fff" strokeWidth={2.2} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                Nuevo ticket
              </Text>
            </TouchableOpacity>

            {tickets.length === 0 ? (
              <View style={{ paddingVertical: 48, alignItems: "center" }}>
                <Text style={{ fontSize: 17, fontFamily: T.serif, color: T.ink }}>Sin tickets aún</Text>
                <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 6, textAlign: "center", maxWidth: 240, lineHeight: 18 }}>
                  Abre un ticket si tienes alguna duda o problema con la app.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {tickets.map((t) => {
                  const meta = statusMeta(t.status);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      activeOpacity={0.8}
                      onPress={() => loadDetail(t)}
                      style={{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 16 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <View style={{ backgroundColor: meta.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: meta.color, letterSpacing: 0.8 }}>
                            {meta.label.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: T.muted }}>{fmtDate(t.created_at)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: T.ink, flex: 1, marginRight: 8 }} numberOfLines={1}>
                          {t.subject}
                        </Text>
                        <ChevronRight size={16} color={T.muted} />
                      </View>
                      <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }} numberOfLines={2}>
                        {t.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  }

  // ── NEW TICKET VIEW ───────────────────────────────────────────────────────
  if (view === "new") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="dark" />
        {renderHeader("Nuevo ticket")}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: T.inkSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Asunto
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Describe el problema brevemente"
            placeholderTextColor={T.muted}
            style={{
              backgroundColor: T.surface,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              color: T.ink,
              marginBottom: 16,
            }}
          />

          <Text style={{ fontSize: 12, fontWeight: "600", color: T.inkSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Descripción
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Explica el problema con detalle, pasos para reproducirlo, etc."
            placeholderTextColor={T.muted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={{
              backgroundColor: T.surface,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              color: T.ink,
              minHeight: 140,
              marginBottom: 24,
            }}
          />

          <TouchableOpacity
            onPress={createTicket}
            activeOpacity={0.8}
            disabled={submitting || !subject.trim() || !description.trim()}
            style={{
              backgroundColor: subject.trim() && description.trim() ? T.primary : T.line,
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: "center",
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Enviar ticket</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const meta = statusMeta(selected.status);
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
      >
        <StatusBar style="dark" />
        {renderHeader(selected.subject)}

        <View style={{ paddingHorizontal: 24, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ backgroundColor: meta.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: meta.color, letterSpacing: 0.8 }}>
              {meta.label.toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: T.muted }}>{fmtDate(selected.created_at)}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Descripción original */}
          <View style={{ backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
              Descripción
            </Text>
            <Text style={{ fontSize: 14, color: T.ink, lineHeight: 20 }}>{selected.description}</Text>
          </View>

          {/* Respuestas */}
          {replies.length > 0 && (
            <View style={{ gap: 10, marginBottom: 16 }}>
              {replies.map((r) => {
                const isUser = r.author === "user";
                return (
                  <View
                    key={r.id}
                    style={{ alignItems: isUser ? "flex-end" : "flex-start" }}
                  >
                    <View
                      style={{
                        maxWidth: "80%",
                        backgroundColor: isUser ? T.primary : T.surface,
                        borderWidth: isUser ? 0 : 1,
                        borderColor: T.line,
                        borderRadius: 14,
                        borderBottomRightRadius: isUser ? 4 : 14,
                        borderBottomLeftRadius: isUser ? 14 : 4,
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: isUser ? "rgba(255,255,255,0.75)" : T.accent, marginBottom: 4 }}>
                        {isUser ? "Tú" : "Soporte LumoTechs"}
                      </Text>
                      <Text style={{ fontSize: 14, color: isUser ? "#fff" : T.ink, lineHeight: 20 }}>
                        {r.message}
                      </Text>
                      <Text style={{ fontSize: 10, color: isUser ? "rgba(255,255,255,0.55)" : T.muted, marginTop: 4, textAlign: isUser ? "right" : "left" }}>
                        {new Date(r.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Input de respuesta */}
        {selected.status !== "closed" && selected.status !== "resolved" && (
          <View style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: insets.bottom + 10,
            borderTopWidth: 1,
            borderTopColor: T.line,
            backgroundColor: T.bg,
          }}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={T.muted}
              multiline
              style={{
                flex: 1,
                backgroundColor: T.surface,
                borderWidth: 1,
                borderColor: T.line,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                color: T.ink,
                maxHeight: 100,
              }}
            />
            <TouchableOpacity
              onPress={sendReply}
              disabled={submitting || !replyText.trim()}
              activeOpacity={0.8}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: replyText.trim() ? T.primary : T.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={17} color="#fff" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  return null;
}
