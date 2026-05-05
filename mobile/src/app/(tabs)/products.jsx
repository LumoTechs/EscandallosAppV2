import React from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { useEffect, useState, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Search,
  X,
  ChevronDown,
  FileText,
  TrendingUp,
  TrendingDown,
  Merge,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { T } from "../../theme";
import { apiFetch } from "../../utils/apiFetch";
import { useSession } from "../../utils/auth";

// Paleta para asignar color por proveedor (hash → índice)
const SUPPLIER_PALETTE = [
  { color: "#4F7A3C", soft: "#ECF3E5" }, // verde
  { color: "#B2451C", soft: "#FBEAD9" }, // rojo
  { color: "#D98324", soft: "#FDF2E2" }, // naranja
  { color: "#7B3FA0", soft: "#F5EEFF" }, // púrpura
  { color: "#1A7A8A", soft: "#E0F7F9" }, // azul
  { color: "#5B6B8A", soft: "#EEF1F7" }, // gris-azul
];

function supplierColor(name) {
  if (!name || name === "Sin proveedor") return { color: T.muted, soft: T.bg };
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SUPPLIER_PALETTE[Math.abs(hash) % SUPPLIER_PALETTE.length];
}

function ProductThumb({ unit, palette, size = 44 }) {
  const label = (unit || "ud").slice(0, 2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: 10, overflow: "hidden" }}>
      <Svg width="100%" height="100%" viewBox="0 0 44 44">
        <Defs>
          <LinearGradient id={`pt-${label}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.soft} stopOpacity="1" />
            <Stop offset="1" stopColor={palette.color} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect width="44" height="44" fill={`url(#pt-${label})`} />
        <Circle cx="32" cy="10" r="14" fill="#fff" opacity="0.18" />
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
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#fff", letterSpacing: -0.3 }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function MiniSpark({ data, color = T.primary, width = 50, height = 22 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });
  const path = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");
  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

function EmptyBasket() {
  return (
    <Svg width={120} height={100} viewBox="0 0 120 100">
      <Path d="M30 45 L90 45 L82 85 L38 85 Z" fill={T.primarySoft} stroke={T.lineStrong} strokeWidth="1.2" strokeLinejoin="round" />
      <Path d="M42 45 Q 60 20, 78 45" stroke={T.lineStrong} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Circle cx="82" cy="30" r="10" stroke={T.primary} strokeWidth="2" fill={T.surface} />
    </Svg>
  );
}

export default function Products() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, isAuthenticated } = useSession();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState("productos");
  const [invoiceSort, setInvoiceSort] = useState("recientes"); // "recientes" | "fecha"
  const [mergeModal, setMergeModal] = useState(false);
  const [mergeCanonical, setMergeCanonical] = useState("");
  const [mergeAlias, setMergeAlias] = useState("");
  const [mergeSaving, setMergeSaving] = useState(false);

  const supplierNames = useMemo(
    () => groups.map((g) => g.supplier).filter((s) => s && s !== "Sin proveedor").sort(),
    [groups]
  );

  const handleMerge = async () => {
    if (!mergeCanonical.trim() || !mergeAlias.trim()) {
      Alert.alert("Faltan datos", "Selecciona los dos proveedores.");
      return;
    }
    if (mergeCanonical.trim() === mergeAlias.trim()) {
      Alert.alert("Error", "Los dos proveedores deben ser diferentes.");
      return;
    }
    setMergeSaving(true);
    try {
      const res = await apiFetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: mergeAlias.trim(), canonical: mergeCanonical.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      setMergeModal(false);
      setMergeCanonical("");
      setMergeAlias("");
      loadGroups(); // recargar para ver el efecto
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setMergeSaving(false);
    }
  };

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    loadGroups();
  }, [search, isReady, isAuthenticated]);

  const loadGroups = async () => {
    try {
      const params = new URLSearchParams({ grouped: "true" });
      if (search) params.append("search", search);
      const res = await apiFetch(`/api/products/list?${params}`);
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (e) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  const totalProducts = useMemo(
    () => groups.reduce((s, g) => s + (g.products?.length || 0), 0),
    [groups]
  );

  const allProducts = useMemo(() => {
    const list = [];
    for (const g of groups) {
      for (const p of g.products || []) {
        list.push({ ...p, supplier: g.supplier });
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [groups]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: T.accent,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Inventario
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 6,
          }}
        >
          <Text style={{ fontSize: 30, fontFamily: T.serif, color: T.ink, letterSpacing: -0.6 }}>
            Productos
          </Text>
          {!loading && (
            <Text style={{ fontSize: 13, color: T.inkSoft, fontWeight: "500" }}>
              {totalProducts} {totalProducts === 1 ? "producto" : "productos"}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>
          Organizados por proveedor
        </Text>
      </View>

      {/* Pestañas */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: T.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: T.line,
            padding: 3,
          }}
        >
          {[
            { key: "productos", label: "Productos" },
            { key: "proveedores", label: "Proveedores" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: tab === t.key ? T.primary : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: tab === t.key ? "#fff" : T.inkSoft,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Buscador */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: T.line,
            borderRadius: 12,
            paddingHorizontal: 14,
            backgroundColor: T.surface,
          }}
        >
          <Search color={T.muted} size={18} strokeWidth={1.8} />
          <TextInput
            placeholder="Buscar producto..."
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: T.ink }}
            placeholderTextColor={T.muted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X color={T.muted} size={16} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : tab === "productos" ? (
        /* ── PESTAÑA PRODUCTOS ── */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {allProducts.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <EmptyBasket />
              <Text style={{ fontSize: 17, fontFamily: T.serif, color: T.ink, marginTop: 16 }}>Sin resultados</Text>
              <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>Procesa una factura para empezar</Text>
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
              {allProducts.map((p, idx) => {
                const palette = supplierColor(p.supplier);
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/products/${p.id}`)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      gap: 12,
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: T.line,
                    }}
                  >
                    <ProductThumb unit={p.unit} palette={palette} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, color: T.ink, fontWeight: "500" }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                        {p.supplier || "Sin proveedor"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: T.ink, fontFamily: T.serif, letterSpacing: -0.2 }}>
                        €{Number(p.current_price || 0).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                        por {p.unit || "ud"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        /* ── PESTAÑA PROVEEDORES ── */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Toggle orden + botón unificar */}
          {groups.length > 0 && (
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 12, alignItems: "center" }}>
              {[
                { key: "recientes", label: "Recientes" },
                { key: "fecha", label: "Fecha factura" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setInvoiceSort(opt.key)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: invoiceSort === opt.key ? T.primary : T.surface,
                    borderWidth: 1,
                    borderColor: invoiceSort === opt.key ? T.primary : T.line,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: invoiceSort === opt.key ? "#fff" : T.inkSoft }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => setMergeModal(true)}
                activeOpacity={0.75}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: T.line,
                  backgroundColor: T.surface,
                }}
              >
                <Merge size={12} color={T.inkSoft} strokeWidth={2} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: T.inkSoft }}>Unificar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Modal unificar proveedores */}
          <Modal visible={mergeModal} animationType="slide" transparent onRequestClose={() => setMergeModal(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
              <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 20, fontFamily: T.serif, color: T.ink, letterSpacing: -0.4 }}>Unificar proveedores</Text>
                  <TouchableOpacity onPress={() => setMergeModal(false)} activeOpacity={0.7}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, justifyContent: "center", alignItems: "center" }}>
                    <X size={16} color={T.ink} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: T.inkSoft, marginBottom: 20 }}>
                  El nombre alternativo pasará a tratarse como el proveedor principal, tanto en datos existentes como en nuevas facturas.
                </Text>

                <Text style={{ fontSize: 11, fontWeight: "700", color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                  Proveedor principal (nombre que se conserva)
                </Text>
                <TextInput
                  value={mergeCanonical}
                  onChangeText={setMergeCanonical}
                  placeholder="Escribe o selecciona..."
                  placeholderTextColor={T.muted}
                  style={{ borderWidth: 1, borderColor: T.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: T.ink, backgroundColor: T.surface, marginBottom: 6 }}
                />
                {supplierNames.filter((s) => mergeCanonical && s.toLowerCase().includes(mergeCanonical.toLowerCase()) && s !== mergeCanonical).slice(0, 4).map((s) => (
                  <TouchableOpacity key={s} onPress={() => setMergeCanonical(s)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: T.ink }}>{s}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={{ fontSize: 11, fontWeight: "700", color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 14 }}>
                  Nombre alternativo (se unificará con el principal)
                </Text>
                <TextInput
                  value={mergeAlias}
                  onChangeText={setMergeAlias}
                  placeholder="Escribe o selecciona..."
                  placeholderTextColor={T.muted}
                  style={{ borderWidth: 1, borderColor: T.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: T.ink, backgroundColor: T.surface, marginBottom: 6 }}
                />
                {supplierNames.filter((s) => mergeAlias && s.toLowerCase().includes(mergeAlias.toLowerCase()) && s !== mergeAlias && s !== mergeCanonical).slice(0, 4).map((s) => (
                  <TouchableOpacity key={s} onPress={() => setMergeAlias(s)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line, marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: T.ink }}>{s}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={handleMerge}
                  disabled={mergeSaving}
                  activeOpacity={0.88}
                  style={{ backgroundColor: T.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 20, opacity: mergeSaving ? 0.7 : 1 }}
                >
                  {mergeSaving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Unificar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {groups.length === 0 ? (
            <View style={{ paddingVertical: 48, alignItems: "center" }}>
              <EmptyBasket />
              <Text style={{ fontSize: 17, fontFamily: T.serif, color: T.ink, marginTop: 16 }}>
                Sin resultados
              </Text>
              <Text style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>
                Procesa una factura para empezar
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {groups.map((g) => {
                const isOpen = expanded === g.supplier;
                const items = g.products || [];
                const invoices = [...(g.invoices || [])].sort((a, b) => {
                  if (invoiceSort === "fecha") {
                    return new Date(b.invoice_date || 0) - new Date(a.invoice_date || 0);
                  }
                  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                });
                const palette = supplierColor(g.supplier);
                return (
                  <View
                    key={g.supplier}
                    style={{
                      backgroundColor: T.surface,
                      borderWidth: 1,
                      borderColor: T.line,
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setExpanded(isOpen ? null : g.supplier)}
                    >
                      {/* Banda tipo */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          backgroundColor: palette.soft,
                          borderBottomWidth: 2,
                          borderBottomColor: palette.color,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.color }} />
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "800",
                              color: palette.color,
                              letterSpacing: 1.4,
                              textTransform: "uppercase",
                            }}
                            numberOfLines={1}
                          >
                            Proveedor
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: palette.color, fontWeight: "700" }}>
                          {items.length} {items.length === 1 ? "ítem" : "ítems"}
                        </Text>
                      </View>
                      {/* Contenido del header */}
                      <View
                        style={{
                          padding: 16,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 17, fontFamily: T.serif, color: T.ink, letterSpacing: -0.3 }}>
                            {g.supplier}
                          </Text>
                          <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
                            {invoices.length > 0
                              ? `${invoices.length} factura${invoices.length !== 1 ? "s" : ""} escaneada${invoices.length !== 1 ? "s" : ""}`
                              : "Sin facturas registradas"}
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: isOpen ? palette.soft : T.bg,
                            borderWidth: 1,
                            borderColor: isOpen ? palette.color : T.line,
                            justifyContent: "center",
                            alignItems: "center",
                            transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
                          }}
                        >
                          <ChevronDown color={isOpen ? palette.color : T.inkSoft} size={16} strokeWidth={2} />
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={{ borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.bg }}>
                        {invoices.length > 0 && (
                          <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: T.line }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "600",
                                color: T.muted,
                                letterSpacing: 1.2,
                                textTransform: "uppercase",
                                marginBottom: 10,
                              }}
                            >
                              Facturas escaneadas
                            </Text>
                            <View style={{ gap: 6 }}>
                              {invoices.map((inv) => (
                                <TouchableOpacity
                                  key={inv.id}
                                  activeOpacity={0.75}
                                  onPress={() => router.push(`/invoices/${inv.id}`)}
                                  style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: 12,
                                    backgroundColor: T.surface,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: T.line,
                                  }}
                                >
                                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flex: 1 }}>
                                    <FileText size={14} color={T.accent} />
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 13, color: T.ink, fontWeight: "500" }}>
                                        {inv.invoice_number || "Sin número"}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                                        {inv.invoice_date
                                          ? new Date(inv.invoice_date).toLocaleDateString("es-ES")
                                          : "Sin fecha"}
                                        {inv.items_count > 0 && ` · ${inv.items_count} ítems`}
                                      </Text>
                                    </View>
                                  </View>
                                  {inv.total > 0 && (
                                    <Text style={{ fontSize: 13, fontWeight: "600", color: T.primary }}>
                                      €{Number(inv.total).toFixed(2)}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}

                        <View style={{ paddingVertical: 4 }}>
                          {items.map((p, idx) => (
                            <TouchableOpacity
                              key={p.id}
                              activeOpacity={0.7}
                              onPress={() => router.push(`/products/${p.id}`)}
                              style={{
                                paddingHorizontal: 18,
                                paddingVertical: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                                borderTopWidth: idx > 0 ? 1 : 0,
                                borderTopColor: T.line,
                              }}
                            >
                              <ProductThumb unit={p.unit} palette={palette} />
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={{ fontSize: 14, color: T.ink, fontWeight: "500" }}>
                                  {p.name}
                                </Text>
                                <Text style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                                  Actualizado{" "}
                                  {p.last_updated
                                    ? new Date(p.last_updated).toLocaleDateString("es-ES")
                                    : "—"}
                                </Text>
                              </View>
                              <View style={{ alignItems: "flex-end" }}>
                                <Text style={{ fontSize: 14, fontWeight: "700", color: T.ink, fontFamily: T.serif, letterSpacing: -0.2 }}>
                                  €{Number(p.current_price || 0).toFixed(2)}
                                </Text>
                                <Text style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                                  por {p.unit || "ud"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

