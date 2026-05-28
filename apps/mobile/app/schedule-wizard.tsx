import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, Switch } from "react-native-paper";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../src/contexts/AuthContext";
import {
  updateProfile,
  createAvailabilityRules,
  createService,
  listServices,
} from "../src/services/api";
import { scheduleStyles as styles } from "../src/styles/schedule.styles";

const DAYS = [
  { key: 0, label: "Dom" },
  { key: 1, label: "Seg" },
  { key: 2, label: "Ter" },
  { key: 3, label: "Qua" },
  { key: 4, label: "Qui" },
  { key: 5, label: "Sex" },
  { key: 6, label: "Sáb" },
];

interface AvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ShiftConfig {
  enabled: boolean;
  start: string;
  end: string;
}

interface DayConfig {
  morning: ShiftConfig;
  afternoon: ShiftConfig;
}

interface OnboardingData {
  display_name: string;
  bio: string;
  business_type: "barbershop" | "nails" | "hair";
  services?: any[];
}

const ONBOARDING_STORAGE_KEY = "aimarco_onboarding_data";

const defaultDayConfig = (): DayConfig => ({
  morning: { enabled: false, start: "09:00", end: "12:00" },
  afternoon: { enabled: false, start: "13:00", end: "18:00" },
});

function buildRulesFromDays(
  dayConfigs: Record<number, DayConfig>,
): AvailabilityRule[] {
  const rules: AvailabilityRule[] = [];
  for (const [dayKey, cfg] of Object.entries(dayConfigs)) {
    const day = Number(dayKey);
    if (cfg.morning.enabled) {
      const start = String(cfg.morning.start).trim();
      const end = String(cfg.morning.end).trim();
      // Ensure time format is HH:mm (basic validation)
      if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
        rules.push({ day_of_week: day, start_time: start, end_time: end });
      }
    }
    if (cfg.afternoon.enabled) {
      const start = String(cfg.afternoon.start).trim();
      const end = String(cfg.afternoon.end).trim();
      if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
        rules.push({ day_of_week: day, start_time: start, end_time: end });
      }
    }
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
  const [data, setData] = useState<OnboardingData>({
    display_name: "",
    bio: "",
    business_type: "barbershop",
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayConfigs, setDayConfigs] = useState<Record<number, DayConfig>>(
    Object.fromEntries(DAYS.map((d) => [d.key, defaultDayConfig()])),
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const json = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json) as OnboardingData;
        setData(parsed);
      }
    } catch (e) {
      console.warn("Failed to load onboarding data", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDay(selectedDay === day ? null : day);
  };

  const updateShift = (
    day: number,
    shift: "morning" | "afternoon",
    field: keyof ShiftConfig,
    value: boolean | string,
  ) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [shift]: { ...prev[day][shift], [field]: value },
      },
    }));
  };

  const handleFinish = async () => {
    const rules = buildRulesFromDays(dayConfigs);

    if (rules.length === 0) {
      Alert.alert(
        "Agenda obrigatória",
        "Ative pelo menos um turno em um dia da semana.",
      );
      return;
    }

    if (!user || !token) {
      Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
      return;
    }

    setSaving(true);
    try {
      // 1. Prepare profile payload (with sanitization)
      const profileData = {
        display_name: data.display_name.trim(),
        bio: data.bio?.trim() || undefined,
        business_type: data.business_type,
      };

      // 2. Prepare services payload with explicit type casting and sanitization
      const servicesPayload =
        data.services && Array.isArray(data.services)
          ? data.services.map((svc: any) => ({
              name: svc.name.trim(), // Trim whitespace from name
              duration_minutes: Number(svc.duration_minutes),
              price_cents:
                svc.price_cents != null && svc.price_cents !== ""
                  ? Math.round(Number(svc.price_cents))
                  : null,
              description: svc.description || undefined, // Use undefined for optional fields
              // is_active is NOT in ServiceCreateSchema — do not send it (DB default = true)
            }))
          : [];

      // 3. Prepare rules payload (ensure day_of_week is number, times are HH:mm strings)
      const validatedRules = rules.map((rule: any) => ({
        day_of_week: Number(rule.day_of_week),
        start_time: rule.start_time,
        end_time: rule.end_time,
      }));

      // 🔍 LOG FULL PAYLOAD BEFORE SENDING
      console.log(
        "📡 [WIZARD] Sending Payload to Backend:",
        JSON.stringify(
          {
            profileData,
            rules: validatedRules,
            services: servicesPayload,
          },
          null,
          2,
        ),
      );

      // 1. Salva perfil (nome, bio, tipo de negócio)
      console.log("📡 [WIZARD] Salvando Perfil... professionalId=", user.id);
      await updateProfile(token, user.id, profileData);
      console.log("✅ [WIZARD] Perfil salvo.");

      // 2. Salva regras de disponibilidade (batch) - use validated rules
      console.log(
        "📡 [WIZARD] Salvando Agenda (Batch)...",
        validatedRules.length,
        "regras",
      );
      await createAvailabilityRules(token, user.id, validatedRules);
      console.log("✅ [WIZARD] Agenda salva. Regras:", validatedRules.length);

      // 3. Check if services already exist (seeded by backend) — skip creation to avoid duplicates
      let existingServiceCount = 0;
      try {
        const existing = await listServices(token, user.id);
        existingServiceCount = existing.length;
      } catch (e) {
        console.warn("[WIZARD] Could not check existing services", e);
      }

      if (existingServiceCount > 0) {
        console.log(`📡 [WIZARD] Skipping service creation — ${existingServiceCount} services already exist (seeded).`);
      } else if (servicesPayload.length > 0) {
        console.log("📡 [WIZARD] Salvando Serviços...", servicesPayload.length);
        const created = await Promise.all(
          servicesPayload.map((svc) => createService(token, user.id, svc)),
        );
        console.log("✅ [WIZARD] Serviços salvos:", created.length);
      } else {
        console.log(
          "⚠️ [WIZARD] Nenhum serviço para salvar (isso pode impedir o onboarding)",
        );
      }

      // 4. Limpa storage e marca onboarding como completo
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      console.log(
        "🏁 [WIZARD] completeOnboarding() — AuthGuard vai redirecionar para /schedule",
      );
      completeOnboarding();
      // AuthGuard detecta isOnboarded=true e navega para /schedule automaticamente
    } catch (error: any) {
      console.error("❌ [WIZARD] Erro no handleFinish:", error);
      Alert.alert(
        "Erro ao salvar",
        error.message ||
          "Não foi possível salvar suas configurações. Tente novamente.",
      );
    } finally {
      setSaving(false); // Para o spinner em qualquer cenário
      console.log("🔄 [WIZARD] setSaving(false) — spinner parado.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A192F' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: 60 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineLarge" style={styles.title}>
            Sua Agenda
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Selecione os dias e configure os turnos que você trabalha.
          </Text>

          <View style={styles.daysRow}>
            {DAYS.map((day) => {
              const isActive = isDayActive(dayConfigs[day.key]);
              const isSelected = selectedDay === day.key;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                  onPress={() => toggleDay(day.key)}
                >
                  <Text
                    style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}
                  >
                    {day.label}
                  </Text>
                  {isActive && !isSelected && <View style={styles.dayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedDay !== null && (
            <View style={styles.daySection}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                {DAYS[selectedDay].label}
              </Text>

              <ShiftRow
                label="Manhã"
                shift={dayConfigs[selectedDay].morning}
                onToggle={(val) =>
                  updateShift(selectedDay, "morning", "enabled", val)
                }
                onStartChange={(val) =>
                  updateShift(selectedDay, "morning", "start", val)
                }
                onEndChange={(val) =>
                  updateShift(selectedDay, "morning", "end", val)
                }
              />

              <ShiftRow
                label="Tarde"
                shift={dayConfigs[selectedDay].afternoon}
                onToggle={(val) =>
                  updateShift(selectedDay, "afternoon", "enabled", val)
                }
                onStartChange={(val) =>
                  updateShift(selectedDay, "afternoon", "start", val)
                }
                onEndChange={(val) =>
                  updateShift(selectedDay, "afternoon", "end", val)
                }
              />
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleFinish}
            disabled={saving}
            style={styles.finishButton}
            contentStyle={styles.finishButtonContent}
            labelStyle={styles.finishButtonLabel}
            loading={saving}
          >
            Finalizar Configuração
          </Button>
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

function ShiftRow({
  label,
  shift,
  onToggle,
  onStartChange,
  onEndChange,
}: ShiftRowProps) {
  return (
    <View style={styles.shiftRow}>
      <View style={styles.shiftHeader}>
        <Text style={styles.shiftLabel}>{label}</Text>
        <Switch
          value={shift.enabled}
          onValueChange={onToggle}
          trackColor={{ false: "#333", true: "#00D2FF" }}
          thumbColor="#0A192F"
        />
      </View>
      {shift.enabled && (
        <View style={styles.shiftTimes}>
          <View style={styles.timeField}>
            <Text style={styles.timeLabel}>Início</Text>
            <TextInput
              mode="outlined"
              value={shift.start}
              onChangeText={onStartChange}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.timeInput}
              outlineColor="#333"
              activeOutlineColor="#00D2FF"
              textColor="#FFF"
              placeholderTextColor="#e9eff1"
            />
          </View>
          <Text style={styles.timeSeparator}>—</Text>
          <View style={styles.timeField}>
            <Text style={styles.timeLabel}>Fim</Text>
            <TextInput
              mode="outlined"
              value={shift.end}
              onChangeText={onEndChange}
              placeholder="12:00"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.timeInput}
              outlineColor="#333"
              activeOutlineColor="#00D2FF"
              textColor="#FFF"
              placeholderTextColor="#e9eff1"
            />
          </View>
        </View>
      )}
    </View>
  );
}
