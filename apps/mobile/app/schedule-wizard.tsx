import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { updateProfile, createAvailabilityRules, createService, listServices } from '../src/services/api';
import { TextField } from '../src/components/ui/TextField';
import { Button } from '../src/components/ui/Button';
import { OnboardingProgress } from '../src/components/onboarding/OnboardingProgress';
import { SkeletonList } from '../src/components/schedule/SkeletonList';
import { palette, radius, spacing, typography, shadow } from '../src/theme/tokens';

const DAYS = [
  { key: 0, label: 'Dom' }, { key: 1, label: 'Seg' }, { key: 2, label: 'Ter' },
  { key: 3, label: 'Qua' }, { key: 4, label: 'Qui' }, { key: 5, label: 'Sex' }, { key: 6, label: 'Sáb' },
];

interface AvailabilityRule { day_of_week: number; start_time: string; end_time: string; }
interface ShiftConfig { enabled: boolean; start: string; end: string; }
interface DayConfig { morning: ShiftConfig; afternoon: ShiftConfig; }
interface OnboardingData { display_name: string; bio: string; business_type: 'barbershop' | 'nails' | 'hair'; services?: any[]; }

const ONBOARDING_STORAGE_KEY = 'aimarco_onboarding_data';

const defaultDayConfig = (): DayConfig => ({
  morning: { enabled: false, start: '09:00', end: '12:00' },
  afternoon: { enabled: false, start: '13:00', end: '18:00' },
});

function buildRulesFromDays(dayConfigs: Record<number, DayConfig>): AvailabilityRule[] {
  const rules: AvailabilityRule[] = [];
  for (const [dayKey, cfg] of Object.entries(dayConfigs)) {
    const day = Number(dayKey);
    (['morning', 'afternoon'] as const).forEach((shiftKey) => {
      const shift = cfg[shiftKey];
      if (shift.enabled) {
        const start = String(shift.start).trim();
        const end = String(shift.end).trim();
        if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
          rules.push({ day_of_week: day, start_time: start, end_time: end });
        }
      }
    });
  }
  return rules;
}

function isDayActive(cfg: DayConfig): boolean {
  return cfg.morning.enabled || cfg.afternoon.enabled;
}

export default function ScheduleWizardScreen() {
  const router = useRouter();
  const { user, token, completeOnboarding } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({ display_name: '', bio: '', business_type: 'barbershop' });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>(
    Object.fromEntries(DAYS.map((d) => [d.key, defaultDayConfig()])),
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (json) setData(JSON.parse(json) as OnboardingData);
    } catch (e) {
      console.warn('Failed to load onboarding data', e);
    } finally { setLoading(false); }
  };

  const toggleDay = (day: number) => setSelectedDay(selectedDay === day ? null : day);

  const updateShift = (day: number, shift: 'morning' | 'afternoon', field: keyof ShiftConfig, value: boolean | string) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], [shift]: { ...prev[day][shift], [field]: value } },
    }));
  };

  const handleFinish = async () => {
    const rules = buildRulesFromDays(dayConfigs);
    if (rules.length === 0) { Alert.alert('Agenda obrigatória', 'Ative pelo menos um turno em um dia da semana.'); return; }
    if (!user || !token) { Alert.alert('Erro', 'Sessão expirada. Faça login novamente.'); return; }

    setSaving(true);
    try {
      const profileData = {
        display_name: data.display_name.trim(),
        bio: data.bio?.trim() || undefined,
        business_type: data.business_type,
      };
      const servicesPayload = data.services && Array.isArray(data.services)
        ? data.services.map((svc: any) => ({
            name: svc.name.trim(),
            duration_minutes: Number(svc.duration_minutes),
            price_cents: svc.price_cents != null && svc.price_cents !== '' ? Math.round(Number(svc.price_cents)) : null,
            description: svc.description || undefined,
          }))
        : [];
      const validatedRules = rules.map((rule) => ({
        day_of_week: Number(rule.day_of_week),
        start_time: rule.start_time,
        end_time: rule.end_time,
      }));

      await updateProfile(token, user.id, profileData);
      await createAvailabilityRules(token, user.id, validatedRules);

      let existingServiceCount = 0;
      try {
        const existing = await listServices(token, user.id);
        existingServiceCount = existing.length;
      } catch (e) {
        console.warn('[WIZARD] Could not check existing services', e);
      }

      if (existingServiceCount === 0 && servicesPayload.length > 0) {
        await Promise.all(servicesPayload.map((svc) => createService(token, user.id, svc)));
      }

      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      completeOnboarding();
    } catch (error: any) {
      console.error('❌ [WIZARD] Erro no handleFinish:', error);
      Alert.alert('Erro ao salvar', error.message || 'Não foi possível salvar suas configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.loading}><SkeletonList count={3} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <OnboardingProgress step={3} total={3} />
          <Text style={styles.title}>Sua agenda</Text>
          <Text style={styles.subtitle}>Selecione os dias e configure os turnos que você trabalha.</Text>

          <View style={styles.daysRow}>
            {DAYS.map((day) => {
              const active = isDayActive(dayConfigs[day.key]);
              const selected = selectedDay === day.key;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayChip, selected && styles.dayChipSelected, active && !selected && styles.dayChipActive]}
                  onPress={() => toggleDay(day.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dayLabel, selected && styles.dayLabelSelected, active && !selected && styles.dayLabelActive]}>
                    {day.label}
                  </Text>
                  {active && !selected && <View style={styles.dayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedDay !== null && (
            <View style={styles.daySection}>
              <Text style={styles.sectionTitle}>{DAYS[selectedDay].label}</Text>
              <ShiftRow
                label="Manhã"
                shift={dayConfigs[selectedDay].morning}
                onToggle={(val) => updateShift(selectedDay, 'morning', 'enabled', val)}
                onStartChange={(val) => updateShift(selectedDay, 'morning', 'start', val)}
                onEndChange={(val) => updateShift(selectedDay, 'morning', 'end', val)}
              />
              <ShiftRow
                label="Tarde"
                shift={dayConfigs[selectedDay].afternoon}
                onToggle={(val) => updateShift(selectedDay, 'afternoon', 'enabled', val)}
                onStartChange={(val) => updateShift(selectedDay, 'afternoon', 'start', val)}
                onEndChange={(val) => updateShift(selectedDay, 'afternoon', 'end', val)}
              />
            </View>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <Button label="Finalizar configuração" onPress={handleFinish} loading={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface ShiftRowProps {
  label: string;
  shift: ShiftConfig;
  onToggle: (val: boolean) => void;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
}

function ShiftRow({ label, shift, onToggle, onStartChange, onEndChange }: ShiftRowProps) {
  return (
    <View style={styles.shiftRow}>
      <View style={styles.shiftHeader}>
        <Text style={styles.shiftLabel}>{label}</Text>
        <Switch
          value={shift.enabled}
          onValueChange={onToggle}
          trackColor={{ false: palette.border, true: palette.accent }}
          thumbColor={palette.white}
        />
      </View>
      {shift.enabled && (
        <View style={styles.shiftTimes}>
          <View style={styles.timeField}>
            <TextField label="Início" value={shift.start} onChangeText={onStartChange} placeholder="09:00" keyboardType="numbers-and-punctuation" maxLength={5} />
          </View>
          <Text style={styles.timeSeparator}>—</Text>
          <View style={styles.timeField}>
            <TextField label="Fim" value={shift.end} onChangeText={onEndChange} placeholder="12:00" keyboardType="numbers-and-punctuation" maxLength={5} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  loading: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', padding: spacing.xl },
  scroll: { padding: spacing.xl, paddingBottom: 60, flexGrow: 1 },
  title: { ...typography.display, color: palette.text, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: palette.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs, marginBottom: spacing.lg },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  dayChipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  dayChipActive: { borderColor: palette.accent },
  dayLabel: { ...typography.caption, color: palette.textMuted, fontWeight: '700' },
  dayLabelSelected: { color: palette.accentText },
  dayLabelActive: { color: palette.accent },
  dayDot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: palette.accent, marginTop: 4 },
  daySection: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  sectionTitle: { ...typography.heading, color: palette.text, marginBottom: spacing.md },
  shiftRow: { marginBottom: spacing.md },
  shiftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  shiftLabel: { ...typography.body, color: palette.text, fontWeight: '600', fontSize: 15 },
  shiftTimes: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  timeField: { flex: 1 },
  timeSeparator: { ...typography.body, color: palette.textFaint, marginBottom: 16, paddingHorizontal: 2 },
});
