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
import { Camera, FileText, Check, AlertCircle } from "lucide-react-native";
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";
import { T } from "../../theme";

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
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!res.canceled) processImage(res.assets[0]);
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      setError("Se necesita permiso para usar la cámara");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!res.canceled) processImage(res.assets[0]);
  };

  const processImage = async (image) => {
    setError(null);
    setResult(null);
    setSelectedImage(image.uri);
    setProcessing(true);

    try {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        try {
          const apiResponse = await fetch("/api/invoices/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64File: base64 }),
          });
          if (!apiResponse.ok)
            throw new Error(`Error ${apiResponse.status}: ${apiResponse.statusText}`);
          const data = await apiResponse.json();
          setResult(data);
        } catch (err) {
          console.error("Error processing invoice:", err);
          setError(err.message || "Error al procesar la factura");
        } finally {
          setProcessing(false);
        }
      };
      reader.onerror = () => {
        setError("Error al leer el archivo");
        setProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Error inesperado");
      setProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setSelectedImage(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: T.accent,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Nueva entrada
        </Text>
        <Text
          style={{
            fontSize: 30,
            fontFamily: T.serif,
            color: T.ink,
            letterSpacing: -0.6,
            marginTop: 6,
          }}
        >
          Procesar factura
        </Text>
        <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 4 }}>
          Fotografía o selecciona un documento
        </Text>
      </View>

      {!result ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 100,
          }}
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
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: T.serif,
                  color: T.ink,
                  marginTop: 16,
                }}
              >
                Analizando con IA
              </Text>
              <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
                Esto puede tardar unos segundos
              </Text>
            </View>
          ) : (
            <View>
              <View style={{ alignItems: "center", paddingVertical: 12, marginBottom: 8 }}>
                <InvoiceIllustration />
              </View>

              <View style={{ gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={{
                    backgroundColor: T.primary,
                    borderRadius: 16,
                    padding: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                  onPress={takePhoto}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.18)",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Camera color="#fff" size={22} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                      Tomar foto
                    </Text>
                    <Text style={{ fontSize: 12, color: T.accentSoft, marginTop: 2 }}>
                      Usa la cámara del dispositivo
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={{
                    backgroundColor: T.surface,
                    borderWidth: 1,
                    borderColor: T.line,
                    borderRadius: 16,
                    padding: 20,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                  onPress={pickImage}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: T.accentSoft,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <FileText color={T.primary} size={22} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: T.ink }}>
                      Seleccionar de galería
                    </Text>
                    <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                      Escoge una imagen existente
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {selectedImage && !processing && (
                <View
                  style={{
                    backgroundColor: T.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: T.line,
                    padding: 8,
                  }}
                >
                  <Image
                    source={{ uri: selectedImage }}
                    style={{ width: "100%", height: 200, borderRadius: 10 }}
                    resizeMode="cover"
                  />
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
                    marginTop: 16,
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
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: T.okSoft,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                backgroundColor: T.ok,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Check color="#fff" size={20} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: T.serif, color: T.ink }}>
                Factura procesada
              </Text>
              <Text style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                {result.saved_items?.length || 0} productos extraídos
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: T.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: T.line,
              padding: 20,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: T.muted,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Detalles
            </Text>
            <View style={{ gap: 14 }}>
              {[
                { label: "Número de factura", value: result.invoice_data?.invoice_number || "N/A" },
                { label: "Proveedor", value: result.invoice_data?.supplier || "N/A" },
                {
                  label: "Fecha",
                  value: result.invoice_data?.invoice_date
                    ? new Date(result.invoice_data.invoice_date).toLocaleDateString("es-ES")
                    : "N/A",
                },
              ].map((row, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: i > 0 ? 14 : 0,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: T.line,
                  }}
                >
                  <Text style={{ fontSize: 12, color: T.inkSoft }}>{row.label}</Text>
                  <Text style={{ fontSize: 14, color: T.ink, fontWeight: "500" }}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View
            style={{
              backgroundColor: T.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: T.line,
              padding: 20,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: T.serif,
                color: T.ink,
                marginBottom: 14,
                letterSpacing: -0.3,
              }}
            >
              Productos
            </Text>
            <View>
              {result.saved_items?.map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: T.line,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "500", color: T.ink }}>
                    {item.product_name}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: T.inkSoft }}>
                      {parseFloat(item.quantity).toFixed(2)} × €
                      {parseFloat(item.unit_price).toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: T.primary }}>
                      €{parseFloat(item.total_amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {result.alerts && result.alerts.length > 0 && (
            <View
              style={{
                backgroundColor: T.primarySoft,
                borderRadius: 16,
                padding: 20,
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <AlertCircle color={T.primary} size={16} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: T.ink }}>
                  Alertas generadas
                </Text>
              </View>
              <View style={{ gap: 10 }}>
                {result.alerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
                  >
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        backgroundColor: T.primary,
                        borderRadius: 2,
                        marginTop: 6,
                      }}
                    />
                    <Text style={{ flex: 1, fontSize: 13, color: T.ink, lineHeight: 18 }}>
                      {alert.message}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.88}
            style={{
              backgroundColor: T.primary,
              borderRadius: 14,
              padding: 18,
              alignItems: "center",
            }}
            onPress={reset}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
              Procesar otra factura
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
