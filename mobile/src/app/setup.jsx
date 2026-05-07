import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ChefHat, Utensils, ClipboardList, ArrowRight, SkipForward } from 'lucide-react-native';
import { T } from '../theme';
import { supabase } from '../utils/supabase';
import {
  useCurrentRestaurant,
  markSetupCompleted,
} from '../utils/restaurant/useCurrentRestaurant';

const STEPS = [
  { key: 'name', icon: ChefHat, title: 'Tu restaurante' },
  { key: 'menu', icon: Utensils, title: 'Tu carta' },
  { key: 'recipes', icon: ClipboardList, title: 'Tus escandallos' },
];

export default function Setup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: restaurant, isLoading } = useCurrentRestaurant();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [finishing, setFinishing] = useState(false);

  React.useEffect(() => {
    if (restaurant?.name && !name) setName(restaurant.name);
  }, [restaurant, name]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={T.primary} />
      </View>
    );
  }

  const totalSteps = STEPS.length;
  const isLast = step === totalSteps - 1;

  async function saveName() {
    if (!name.trim() || !restaurant) return next();
    setSavingName(true);
    const { error } = await supabase
      .from('restaurants')
      .update({ name: name.trim() })
      .eq('id', restaurant.id);
    setSavingName(false);
    if (error) {
      Alert.alert('No se pudo guardar', error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['current-restaurant'] });
    next();
  }

  function next() {
    if (isLast) return finish();
    setStep((s) => s + 1);
  }

  async function finish() {
    if (!restaurant) return;
    setFinishing(true);
    try {
      await markSetupCompleted(restaurant.id);
      await queryClient.invalidateQueries({ queryKey: ['current-restaurant'] });
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo completar el setup');
    } finally {
      setFinishing(false);
    }
  }

  const Icon = STEPS[step].icon;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header con progreso */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: T.muted, fontWeight: '600' }}>
            Paso {step + 1} de {totalSteps}
          </Text>
          <TouchableOpacity onPress={finish} disabled={finishing} hitSlop={8}>
            <Text style={{ color: T.muted, fontSize: 13, fontWeight: '600' }}>
              {finishing ? 'Guardando…' : 'Saltar todo'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 12 }}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: i <= step ? T.primary : T.line,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: T.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Icon color={T.primary} size={28} />
          </View>
          <Text
            style={{
              fontSize: 26,
              fontFamily: T.serif,
              color: T.ink,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {STEPS[step].title}
          </Text>
        </View>

        {step === 0 && (
          <View>
            <Text style={{ color: T.inkSoft, marginBottom: 14, lineHeight: 20 }}>
              ¿Cómo se llama tu restaurante? Lo verás en la cabecera de la app y en los escandallos.
              Puedes cambiarlo más tarde desde ajustes.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej. Casa Lumo"
              placeholderTextColor={T.muted}
              autoCapitalize="words"
              style={{
                borderWidth: 1,
                borderColor: T.lineStrong,
                backgroundColor: T.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 14,
                fontSize: 16,
                color: T.ink,
              }}
            />
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={{ color: T.inkSoft, marginBottom: 14, lineHeight: 20 }}>
              Tu carta son los platos que sirves. Los escandallarás (calcular el coste real) en el
              siguiente paso o cuando quieras.
            </Text>
            <View
              style={{
                backgroundColor: T.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: T.line,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: T.ink, fontWeight: '600', marginBottom: 6 }}>
                Cómo añadir platos
              </Text>
              <Text style={{ color: T.inkSoft, lineHeight: 20 }}>
                Tras este wizard puedes ir a la pestaña <Text style={{ fontWeight: '700' }}>Recetas</Text>{' '}
                y crear cada plato con su precio de venta. La app te dirá si su food cost real
                supera tu objetivo.
              </Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ color: T.inkSoft, marginBottom: 14, lineHeight: 20 }}>
              Un escandallo es la lista de ingredientes de un plato con su cantidad y precio. Te lo
              calcularemos automáticamente con los productos que ya tengas cargados.
            </Text>
            <View
              style={{
                backgroundColor: T.accentSoft,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: T.line,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: T.ink, fontWeight: '600', marginBottom: 6 }}>
                Tip
              </Text>
              <Text style={{ color: T.inkSoft, lineHeight: 20 }}>
                Sube primero una factura de proveedor desde la pestaña{' '}
                <Text style={{ fontWeight: '700' }}>Subir factura</Text>: la IA extrae productos y
                precios automáticamente. Después escandalla cada plato con esos ingredientes.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer fijo */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderColor: T.line,
          backgroundColor: T.bg,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={next}
          disabled={savingName || finishing}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: T.lineStrong,
            backgroundColor: T.surface,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <SkipForward color={T.inkSoft} size={16} />
          <Text style={{ color: T.inkSoft, fontWeight: '600' }}>Saltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={step === 0 ? saveName : next}
          disabled={savingName || finishing}
          style={{
            flex: 2,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: T.primary,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: savingName || finishing ? 0.6 : 1,
          }}
        >
          {savingName || finishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {isLast ? 'Terminar' : 'Siguiente'}
              </Text>
              <ArrowRight color="#fff" size={16} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
