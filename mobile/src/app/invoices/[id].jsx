import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, FileText, Package } from "lucide-react-native";
import { T } from "../../theme";
import { apiFetch } from "../../utils/apiFetch";

const fmtEUR = (n) => `€${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "—");

const STATUS_LABELS = {
  processed: { label: "Procesada", color: "#4F7A3C", soft: "#ECF3E5" },
  pending:   { label: "Pendiente", color: "#D98324", soft: "#FDF2E2" },
  error:     { label: "Error",     color: "#B2451C", soft: "#FBEAD9" },
};

function statusStyle(status) {
  return STATUS_LABELS[status] || { label: status || "—", color: T.muted, soft: T.bg };
}

export default function InvoiceDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setInvoice(data.invoice);
        setItems(data.items || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const st = invoice ? statusStyle(invoice.status) : null;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: T.line,
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: T.surface,
            borderWidth: 1,
            borderColor: T.line,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={18} color={T.ink} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
            Factura
          </Text>
          <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, letterSpacing: -0.3 }} numberOfLines={1}>
            {invoice?.invoice_number || "Cargando…"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : error || !invoice ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 15, color: T.muted, textAlign: "center" }}>
            {error || "No se pudo cargar la factura"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta resumen */}
          <View
            style={{
              backgroundColor: T.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: T.line,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            {/* Banda de color */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: st.soft,
                borderBottomWidth: 2,
                borderBottomColor: st.color,
              }}
            >
              <FileText size={12} color={st.color} strokeWidth={2.2} />
              <Text style={{ fontSize: 10, fontWeight: "800", color: st.color, letterSpacing: 1.4, textTransform: "uppercase" }}>
                {st.label}
              </Text>
            </View>

            <View style={{ padding: 16, gap: 10 }}>
              <Row label="Proveedor"   value={invoice.supplier || "—"} />
              <Row label="Fecha"       value={fmtDate(invoice.invoice_date)} />
              <Row label="Nº factura"  value={invoice.invoice_number || "—"} />
              <View style={{ borderTopWidth: 1, borderTopColor: T.line, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: T.ink }}>Total</Text>
                <Text style={{ fontSize: 20, fontFamily: T.serif, fontWeight: "700", color: T.primary, letterSpacing: -0.4 }}>
                  {fmtEUR(invoice.total)}
                </Text>
              </View>
            </View>
          </View>

          {/* Líneas de la factura */}
          <Text
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: T.muted,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Líneas ({items.length})
          </Text>

          {items.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Package size={36} color={T.muted} strokeWidth={1.4} />
              <Text style={{ fontSize: 14, color: T.muted, marginTop: 10 }}>Sin líneas registradas</Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: T.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: T.line,
                overflow: "hidden",
              }}
            >
              {/* Cabecera tabla */}
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: T.bg,
                  borderBottomWidth: 1,
                  borderBottomColor: T.line,
                }}
              >
                <Text style={{ flex: 1, fontSize: 10, fontWeight: "600", color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Producto
                </Text>
                <Text style={{ width: 48, fontSize: 10, fontWeight: "600", color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "right" }}>
                  Cant.
                </Text>
                <Text style={{ width: 60, fontSize: 10, fontWeight: "600", color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "right" }}>
                  P/ud
                </Text>
                <Text style={{ width: 64, fontSize: 10, fontWeight: "600", color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "right" }}>
                  Total
                </Text>
              </View>

              {items.map((item, idx) => (
                <View
                  key={item.id ?? idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: T.line,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 13, color: T.ink, fontWeight: "500" }} numberOfLines={2}>
                    {item.product_name || "—"}
                  </Text>
                  <Text style={{ width: 48, fontSize: 13, color: T.inkSoft, textAlign: "right" }}>
                    {item.quantity ?? "—"}
                  </Text>
                  <Text style={{ width: 60, fontSize: 13, color: T.inkSoft, textAlign: "right" }}>
                    {item.unit_price != null ? fmtEUR(item.unit_price) : "—"}
                  </Text>
                  <Text style={{ width: 64, fontSize: 13, fontWeight: "600", color: T.primary, textAlign: "right" }}>
                    {item.total_price != null ? fmtEUR(item.total_price) : "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 13, color: T.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, color: T.ink, fontWeight: "500" }}>{value}</Text>
    </View>
  );
}
