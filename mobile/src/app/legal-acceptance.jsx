import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { T } from '../theme';
import { useSession } from '../utils/auth';
import { LEGAL_POLICIES_VERSION, saveLegalAcceptance } from '../utils/legalAcceptance';
import { useLegalAcceptanceCtx } from '../utils/legalAcceptanceContext';

const POLICY_ITEMS = [
  { key: 'privacy', label: 'He leído y acepto la Política de privacidad', tab: 'privacidad' },
  { key: 'terms', label: 'He leído y acepto los Términos y condiciones', tab: 'terminos' },
  { key: 'legal', label: 'He leído y acepto el Aviso legal', tab: 'aviso' },
];

export default function LegalAcceptance() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { setLegalAccepted } = useLegalAcceptanceCtx();
  const [checks, setChecks] = useState({
    privacy: false,
    terms: false,
    legal: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => checks.privacy && checks.terms && checks.legal, [checks]);

  const toggle = (key) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onAccept = async () => {
    setError('');
    if (!user?.id) {
      setError('No se ha detectado tu sesión. Vuelve a iniciar sesión.');
      return;
    }
    if (!canSubmit) {
      setError('Debes aceptar las 3 políticas para continuar.');
      return;
    }

    setSaving(true);
    try {
      await saveLegalAcceptance(user.id);
      setLegalAccepted(true);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e?.message || 'No se pudo guardar la aceptación de políticas.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: insets.bottom + 30,
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 30, fontFamily: T.serif, color: T.ink, letterSpacing: -0.6 }}>
          Confirmación legal
        </Text>
        <Text style={{ fontSize: 14, color: T.inkSoft, marginTop: 8, lineHeight: 22 }}>
          Para continuar en la app necesitas aceptar las políticas legales. Puedes abrir cada documento
          antes de marcar la casilla.
        </Text>
        <Text style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
          Versión de políticas: {LEGAL_POLICIES_VERSION}
        </Text>

        <View
          style={{
            marginTop: 24,
            backgroundColor: T.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: T.line,
            overflow: 'hidden',
          }}
        >
          {POLICY_ITEMS.map((item, index) => {
            const checked = checks[item.key];
            return (
              <View
                key={item.key}
                style={{
                  borderBottomWidth: index < POLICY_ITEMS.length - 1 ? 1 : 0,
                  borderBottomColor: T.line,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => toggle(item.key)}
                  activeOpacity={0.75}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 1.6,
                      borderColor: checked ? T.primary : T.lineStrong,
                      backgroundColor: checked ? T.primary : T.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {checked ? <Check size={14} color="#fff" strokeWidth={2.6} /> : null}
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: T.ink }}>{item.label}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/legal', params: { tab: item.tab } })}
                  style={{ paddingLeft: 34 }}
                >
                  <Text style={{ fontSize: 12, color: T.primary, textDecorationLine: 'underline' }}>
                    Ver documento
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

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
          onPress={onAccept}
          disabled={!canSubmit || saving}
          style={{
            marginTop: 22,
            backgroundColor: canSubmit ? T.primary : T.lineStrong,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>
              Acepto política de privacidad y continuar
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
