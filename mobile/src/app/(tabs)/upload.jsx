import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { Camera, FileText, Check, AlertCircle, X, Plus } from "lucide-react-native";
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";
import { T } from "../../theme";
import { apiFetch } from "../../utils/apiFetch";

function InvoiceIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Rect x="30" y="20" width="60" height="80" rx="4" fill={T.surface} stroke={T.lineStrong} strokeWidth="1.2" />
      <Path d="M82 20 L90 28 L82 28 Z" fill={T.primarySoft} stroke={T.lineStrong} strokeWidth="1" />
      <Line x1="38" y1="36" x2="70" y2="36" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="38" y1="46" x2="80" y2="46" stroke={T.line} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="38" y1="54" x2="75" y2="54" stroke={T.line} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="38" y1="66" x2="80" y2="66" stroke={T.line} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="38" y1="74" x2="65" y2="74" stroke={T.line} strokeWidth="1.2" strokeLinecap="round" />
      <Rect x="38" y="84" width="44" height="8" rx="2" fill={T.primarySoft} />
      <Circle cx="92" cy="72" r="12" fill={T.primary} />
      <Path d="M87 72 L 91 76 L 98 69" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function UploadInvoice() {
  const insets = useSafeAreaInsets();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]); // una entrada por factura procesada
  const [error, setError] = useState(null);
  // Cada imagen: { uri, base64, mimeType }
  const [images, setImages] = useState([]);

  const addFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.6,
      base64: true,
    });
    if (res.canceled) return;
    const newImages = res.assets
      .filter((a) => a.base64)
      .map((a) => ({ uri: a.uri, base64: a.base64, mimeType: a.mimeType || "image/jpeg" }));
    setImages((prev) => [...prev, ...newImages]);
    setError(null);
  };

  const addFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Se necesita permiso para usar la cámara");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    if (!asset.base64) { setError("No se pudo leer la imagen"); return; }
    setImages((prev) => [...prev, { uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType || "image/jpeg" }]);
    setError(null);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const processImages = async () => {
    if (images.length === 0) return;
    setError(null);
    setResults([]);
    setProcessing(true);
    setProgress({ current: 0, total: images.length });

    const collected = [];
    for (let i = 0; i < images.length; i++) {
      setProgress({ current: i + 1, total: images.length });
      const img = images[i];
      try {
        const base64File = `data:${img.mimeType};base64,${img.base64}`;
        const apiResponse = await apiFetch("/api/invoices/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64Files: [base64File] }),
        });
        if (!apiResponse.ok) {
          const errData = await apiResponse.json().catch(() => ({}));
          collected.push({ error: errData.error || `Error ${apiResponse.status}` });
        } else {
          collected.push(await apiResponse.json());
        }
      } catch (err) {
        console.error("Error processing invoice:", err);
        collected.push({ error: err.message || "Error al procesar" });
      }
    }

    setResults(collected);
    setProcessing(false);
  };

  const reset = () => {
    setResults([]);
    setError(null);
    setImages([]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: "600", color: T.accent, letterSpacing: 2, textTransform: "uppercase" }}>
          Nueva entrada
        </Text>
        <Text style={{ fontSize: 30, fontFamily: T.serif, color: T.ink, letterSpacing: -0.6, marginTop: 6 }}>
          Procesar factura
        </Text>
        <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 4 }}>
          Añade una o varias fotos de la misma factura
        </Text>
      </View>

      {results.length === 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {processing ? (
            <View
              style={{
                backgroundColor: T.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: T.line,
                padding: 40,
                alignItems: "center",
              }}
            >
              <View style={{ marginBottom: 20 }}>
                <InvoiceIllustration />
              </View>
              <ActivityIndicator size="small" color={T.primary} />
              <Text style={{ fontSize: 16, fontFamily: T.serif, color: T.ink, marginTop: 16 }}>
                {progress.total > 1
                  ? `Factura ${progress.current} de ${progress.total}`
                  : "Analizando con IA"}
              </Text>
              <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
                Esto puede tardar unos segundos
              </Text>
            </View>
          ) : (
            <View>
              {/* Miniaturas de imágenes seleccionadas */}
              {images.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: T.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
                    {images.length} {images.length === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
                      {images.map((img, idx) => (
                        <View key={idx} style={{ position: "relative" }}>
                          <Image
                            source={{ uri: img.uri }}
                            style={{ width: 100, height: 120, borderRadius: 10, backgroundColor: T.surface }}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => removeImage(idx)}
                            activeOpacity={0.8}
                            style={{
                              position: "absolute",
                              top: 5,
                              right: 5,
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: "rgba(0,0,0,0.55)",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <X size={12} color="#fff" strokeWidth={2.5} />
                          </TouchableOpacity>
                          <View
                            style={{
                              position: "absolute",
                              bottom: 5,
                              left: 5,
                              backgroundColor: "rgba(0,0,0,0.45)",
                              borderRadius: 5,
                              paddingHorizontal: 5,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontSize: 10, color: "#fff", fontWeight: "600" }}>{idx + 1}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Botones de añadir */}
              <View style={{ gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={{
                    backgroundColor: images.length === 0 ? T.primary : T.surface,
                    borderWidth: images.length === 0 ? 0 : 1,
                    borderColor: T.line,
                    borderRadius: 16,
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                  }}
                  onPress={addFromCamera}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: images.length === 0 ? "rgba(255,255,255,0.18)" : T.accentSoft,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Camera color={images.length === 0 ? "#fff" : T.primary} size={20} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: images.length === 0 ? "#fff" : T.ink }}>
                      {images.length === 0 ? "Tomar foto" : "Añadir otra foto"}
                    </Text>
                    <Text style={{ fontSize: 12, color: images.length === 0 ? T.accentSoft : T.inkSoft, marginTop: 1 }}>
                      Usa la cámara del dispositivo
                    </Text>
                  </View>
                  {images.length > 0 && <Plus size={18} color={T.muted} strokeWidth={2} />}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={{
                    backgroundColor: T.surface,
                    borderWidth: 1,
                    borderColor: T.line,
                    borderRadius: 16,
                    padding: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                  }}
                  onPress={addFromGallery}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: T.accentSoft,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <FileText color={T.primary} size={20} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: T.ink }}>
                      {images.length === 0 ? "Seleccionar de galería" : "Añadir de galería"}
                    </Text>
                    <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 1 }}>
                      Selección múltiple permitida
                    </Text>
                  </View>
                  {images.length > 0 && <Plus size={18} color={T.muted} strokeWidth={2} />}
                </TouchableOpacity>
              </View>

              {/* Botón procesar */}
              {images.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={processImages}
                  style={{
                    backgroundColor: T.primary,
                    borderRadius: 16,
                    padding: 18,
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                    Procesar {images.length === 1 ? "1 imagen" : `${images.length} imágenes`}
                  </Text>
                </TouchableOpacity>
              )}

              {!images.length && (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <InvoiceIllustration />
                </View>
              )}

              {error && (
                <View
                  style={{
                    backgroundColor: T.primarySoft,
                    borderLeftWidth: 3,
                    borderLeftColor: T.primary,
                    borderRadius: 10,
                    padding: 14,
                    marginTop: 8,
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  <AlertCircle color={T.primary} size={18} strokeWidth={1.8} />
                  <Text style={{ fontSize: 13, color: T.ink, flex: 1 }}>{error}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera resumen */}
          <View style={{ backgroundColor: T.okSoft, borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ width: 40, height: 40, backgroundColor: T.ok, borderRadius: 20, justifyContent: "center", alignItems: "center" }}>
              <Check color="#fff" size={20} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: T.serif, color: T.ink }}>
                {results.length === 1 ? "Factura procesada" : `${results.length} facturas procesadas`}
              </Text>
              <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                {results.filter((r) => !r.error).reduce((s, r) => s + (r.saved_items?.length || 0), 0)} productos extraídos en total
              </Text>
            </View>
          </View>

          {/* Una tarjeta por factura */}
          {results.map((res, idx) => (
            <View key={idx} style={{ marginBottom: 16 }}>
              {results.length > 1 && (
                <Text style={{ fontSize: 10, fontWeight: "600", color: T.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>
                  Factura {idx + 1}
                </Text>
              )}

              {res.error ? (
                <View style={{ backgroundColor: T.primarySoft, borderLeftWidth: 3, borderLeftColor: T.primary, borderRadius: 10, padding: 14, flexDirection: "row", gap: 10 }}>
                  <AlertCircle color={T.primary} size={18} strokeWidth={1.8} />
                  <Text style={{ fontSize: 13, color: T.ink, flex: 1 }}>{res.error}</Text>
                </View>
              ) : (
                <>
                  <View style={{ backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 20, marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: T.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Detalles</Text>
                    <View style={{ gap: 14 }}>
                      {[
                        { label: "Número de factura", value: res.invoice_data?.invoice_number || "N/A" },
                        { label: "Proveedor", value: res.invoice_data?.supplier || "N/A" },
                        { label: "Fecha", value: res.invoice_data?.invoice_date ? new Date(res.invoice_data.invoice_date).toLocaleDateString("es-ES") : "N/A" },
                      ].map((row, i) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: i > 0 ? 14 : 0, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: T.line }}>
                          <Text style={{ fontSize: 12, color: T.inkSoft }}>{row.label}</Text>
                          <Text style={{ fontSize: 14, color: T.ink, fontWeight: "500" }}>{row.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={{ backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.line, padding: 20, marginBottom: 10 }}>
                    <Text style={{ fontSize: 18, fontFamily: T.serif, color: T.ink, marginBottom: 14, letterSpacing: -0.3 }}>Productos</Text>
                    {res.saved_items?.map((item, i) => (
                      <View key={i} style={{ paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: T.line }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", color: T.ink }}>{item.product_name}</Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                          <Text style={{ fontSize: 12, color: T.inkSoft }}>
                            {parseFloat(item.quantity).toFixed(2)} × €{parseFloat(item.unit_price).toFixed(2)}
                          </Text>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: T.primary }}>
                            €{parseFloat(item.total_amount).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {res.alerts?.length > 0 && (
                    <View style={{ backgroundColor: T.primarySoft, borderRadius: 16, padding: 20, marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <AlertCircle color={T.primary} size={16} strokeWidth={2} />
                        <Text style={{ fontSize: 14, fontWeight: "600", color: T.ink }}>Alertas generadas</Text>
                      </View>
                      <View style={{ gap: 10 }}>
                        {res.alerts.map((alert) => (
                          <View key={alert.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                            <View style={{ width: 4, height: 4, backgroundColor: T.primary, borderRadius: 2, marginTop: 6 }} />
                            <Text style={{ flex: 1, fontSize: 13, color: T.ink, lineHeight: 18 }}>{alert.message}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          ))}

          <TouchableOpacity
            activeOpacity={0.88}
            style={{ backgroundColor: T.primary, borderRadius: 14, padding: 18, alignItems: "center" }}
            onPress={reset}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>Procesar más facturas</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
