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
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  FileUp,
  Package,
  Percent,
  Store,
  Target,
} from 'lucide-react-native';
import { T } from '../theme';
import { supabase } from '../utils/supabase';
import { useCurrentRestaurant } from '../utils/restaurant/useCurrentRestaurant';
import { trackEvent } from '../utils/telemetry/trackEvent';

const BUSINESS_TYPES = [
  { key: 'restaurant', label: 'Restaurante', hint: 'Carta completa y proveedores recurrentes' },
  { key: 'bar', label: 'Bar / tapas', hint: 'Platos rápidos, raciones y bebida' },
  { key: 'delivery', label: 'Delivery', hint: 'Coste por pedido y margen muy ajustado' },
  { key: 'cafe', label: 'Cafetería', hint: 'Desayunos, carta corta y producto fresco' },
];

const TARGETS = [
  { value: 28, label: '28%', hint: 'Margen agresivo' },
  { value: 32, label: '32%', hint: 'Control estricto' },
  { value: 35, label: '35%', hint: 'Equilibrado' },
  { value: 40, label: '40%', hint: 'Más flexible' },
];

const GOALS = [
  {
    key: 'invoice',
    label: 'Subir primera factura',
    hint: 'La IA extrae productos y precios automáticamente',
    icon: FileUp,
    route: '/upload',
  },
  {
    key: 'recipe',
    label: 'Crear primer escandallo',
    hint: 'Define un plato y calcula su food cost',
    icon: BookOpen,
    route: '/recipes',
  },
  {
    key: 'products',
    label: 'Revisar productos',
    hint: 'Ordena proveedores y precios antes de escandallar',
    icon: Package,
    route: '/products',
  },
];

const STEPS = [
  { key: 'profile', icon: Store, title: 'Perfil del negocio' },
  { key: 'target', icon: Target, title: 'Objetivo de margen' },
  { key: 'goal', icon: ClipboardList, title: 'Primer paso' },
  { key: 'summary', icon: CheckCircle2, title: 'Listo para empezar' },
];

function OptionCard({ selected, icon: Icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        borderWidth: 1,
        borderColor: selected ? T.primary : T.line,
        backgroundColor: selected ? T.primarySoft : T.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {Icon && (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: selected ? T.primary : T.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon color={selected ? '#fff' : T.primary} size={19} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>{title}</Text>
        <Text style={{ color: T.inkSoft, fontSize: 13, lineHeight: 18, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: selected ? T.primary : T.lineStrong,
          backgroundColor: selected ? T.primary : T.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <CheckCircle2 color="#fff" size={14} />}
      </View>
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: T.line,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 18,
      }}
    >
      <Text style={{ color: T.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: T.ink, fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export default function Setup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: restaurant, isLoading } = useCurrentRestaurant();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [targetFoodCost, setTargetFoodCost] = useState(35);
  const [goal, setGoal] = useState('invoice');
  const [saving, setSaving] = useState(false);
  const setupStartTracked = React.useRef(false);

  React.useEffect(() => {
    if (!restaurant) return;
    if (restaurant.name && !name) setName(restaurant.name);
    if (restaurant.business_type) setBusinessType(restaurant.business_type);
    if (restaurant.target_food_cost_percentage) {
      setTargetFoodCost(Number(restaurant.target_food_cost_percentage));
    }
    if (restaurant.onboarding_goal) setGoal(restaurant.onboarding_goal);
  }, [restaurant, name]);

  React.useEffect(() => {
    if (!restaurant || setupStartTracked.current) return;
    setupStartTracked.current = true;
    trackEvent('setup_started', {
      restaurantId: restaurant.id,
      metadata: {
        setup_completed: Boolean(restaurant.setup_completed),
      },
    });
  }, [restaurant]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={T.primary} />
      </View>
    );
  }

  const totalSteps = STEPS.length;
  const current = STEPS[step];
  const isLast = step === totalSteps - 1;
  const Icon = current.icon;
  const selectedType = BUSINESS_TYPES.find((t) => t.key === businessType) || BUSINESS_TYPES[0];
  const selectedGoal = GOALS.find((g) => g.key === goal) || GOALS[0];

  async function saveProgress({ complete = false } = {}) {
    if (!restaurant) return;
    setSaving(true);
    const payload = {
      name: name.trim() || restaurant.name || 'Mi restaurante',
      business_type: businessType,
      target_food_cost_percentage: targetFoodCost,
      onboarding_goal: goal,
      ...(complete ? { setup_completed: true } : {}),
    };
    const { error } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', restaurant.id);
    setSaving(false);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['current-restaurant'] });
  }

  async function next() {
    if (isLast) return finish(selectedGoal.route);
    try {
      if (step === 0 || step === 1 || step === 2) {
        await saveProgress();
      }
      setStep((s) => s + 1);
    } catch (err) {
      Alert.alert('No se pudo guardar', err.message || 'Revisa los datos e inténtalo de nuevo');
    }
  }

  async function finish(route = '/(tabs)') {
    if (!restaurant) return;
    setSaving(true);
    try {
      await saveProgress({ complete: true });
      await queryClient.invalidateQueries({ queryKey: ['current-restaurant'] });
      trackEvent('setup_completed', {
        restaurantId: restaurant.id,
        metadata: {
          business_type: businessType,
          target_food_cost_percentage: targetFoodCost,
          onboarding_goal: goal,
        },
      });
      router.replace(route);
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo completar el setup');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: T.muted, fontWeight: '700' }}>
            Paso {step + 1} de {totalSteps}
          </Text>
          <TouchableOpacity onPress={() => finish('/(tabs)')} disabled={saving} hitSlop={8}>
            <Text style={{ color: T.muted, fontSize: 13, fontWeight: '700' }}>
              {saving ? 'Guardando...' : 'Saltar'}
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
        showsVerticalScrollIndicator={false}
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
            {current.title}
          </Text>
          <Text style={{ color: T.inkSoft, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            Configuramos lo mínimo para que la primera factura y el primer escandallo tengan sentido.
          </Text>
        </View>

        {step === 0 && (
          <View>
            <Text style={{ color: T.ink, fontWeight: '800', marginBottom: 8 }}>
              Nombre visible
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
                marginBottom: 18,
              }}
            />
            <Text style={{ color: T.ink, fontWeight: '800', marginBottom: 10 }}>
              Tipo de negocio
            </Text>
            {BUSINESS_TYPES.map((type) => (
              <OptionCard
                key={type.key}
                selected={businessType === type.key}
                icon={ChefHat}
                title={type.label}
                subtitle={type.hint}
                onPress={() => setBusinessType(type.key)}
              />
            ))}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={{ color: T.inkSoft, marginBottom: 16, lineHeight: 20 }}>
              El food cost objetivo se usará como referencia para saber cuándo un plato está sano o
              necesita revisión.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {TARGETS.map((target) => {
                const selected = targetFoodCost === target.value;
                return (
                  <TouchableOpacity
                    key={target.value}
                    onPress={() => setTargetFoodCost(target.value)}
                    activeOpacity={0.85}
                    style={{
                      width: '47%',
                      borderWidth: 1,
                      borderColor: selected ? T.primary : T.line,
                      backgroundColor: selected ? T.primarySoft : T.surface,
                      borderRadius: 14,
                      padding: 16,
                      minHeight: 112,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Percent color={selected ? T.primary : T.muted} size={18} />
                      <Text style={{ color: T.ink, fontSize: 26, fontFamily: T.serif, fontWeight: '700' }}>
                        {target.label}
                      </Text>
                    </View>
                    <Text style={{ color: T.inkSoft, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                      {target.hint}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={{ color: T.inkSoft, marginBottom: 16, lineHeight: 20 }}>
              Elige dónde aterrizar al terminar. No bloquea nada: solo te deja en la pantalla más útil
              para empezar.
            </Text>
            {GOALS.map((item) => (
              <OptionCard
                key={item.key}
                selected={goal === item.key}
                icon={item.icon}
                title={item.label}
                subtitle={item.hint}
                onPress={() => setGoal(item.key)}
              />
            ))}
          </View>
        )}

        {step === 3 && (
          <View
            style={{
              backgroundColor: T.surface,
              borderWidth: 1,
              borderColor: T.line,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <SummaryRow label="Restaurante" value={name.trim() || restaurant?.name || 'Mi restaurante'} />
            <SummaryRow label="Tipo" value={selectedType.label} />
            <SummaryRow label="Food cost objetivo" value={`${targetFoodCost}%`} />
            <SummaryRow label="Primera acción" value={selectedGoal.label} />
            <View style={{ backgroundColor: T.okSoft, borderRadius: 12, padding: 14, marginTop: 16 }}>
              <Text style={{ color: T.ok, fontWeight: '800', marginBottom: 4 }}>
                Configuración lista
              </Text>
              <Text style={{ color: T.inkSoft, lineHeight: 20 }}>
                La app queda preparada para comparar platos contra tu objetivo y llevarte directo al
                flujo inicial.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

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
        {step > 0 && (
          <TouchableOpacity
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            disabled={saving}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: T.lineStrong,
              backgroundColor: T.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: T.inkSoft, fontWeight: '700' }}>Atrás</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={next}
          disabled={saving}
          style={{
            flex: step > 0 ? 2 : 1,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: T.primary,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={{ color: '#fff', fontWeight: '800' }}>
                {isLast ? 'Entrar en la app' : 'Siguiente'}
              </Text>
              <ArrowRight color="#fff" size={16} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
