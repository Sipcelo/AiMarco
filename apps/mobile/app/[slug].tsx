import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Scissors, Share2, Mail, User, Clock } from 'lucide-react-native';
import {
  getProfessionalBySlug,
  Professional,
  ServiceItem,
  createPublicAppointment,
  getPublicAvailability,
} from '../src/services/api';
import { PhoneInput } from '../src/components/PhoneInput';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { Button } from '../src/components/ui/Button';
import { TextField } from '../src/components/ui/TextField';
import { SkeletonList } from '../src/components/schedule/SkeletonList';
import { palette, radius, spacing, typography, shadow } from '../src/theme/tokens';

type TimeSlot = { id: string; start_time: string; end_time: string };

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const BUSINESS_LABEL: Record<string, string> = {
  barbershop: 'Barbeiro',
  nails: 'Manicure/Pedicure',
  hair: 'Cabelereiro',
};

export default function ProfessionalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimesMap, setAvailableTimesMap] = useState<Record<string, TimeSlot[]>>({});

  const [showBookingSheet, setShowBookingSheet] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getProfessionalBySlug(slug)
      .then((data) => {
        setProfessional(data);
        if (data && data.services?.length > 0) setSelectedServiceId(data.services[0].id);
      })
      .catch((err) => setError(err.message || 'Erro ao buscar dados do profissional.'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!professional) return;
    const days: string[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    setAvailableDates(days);
    if (days.length > 0) setSelectedDate(days[0]);
  }, [professional]);

  useEffect(() => {
    if (!professional?.slug || !selectedDate || !selectedServiceId) return;
    getPublicAvailability(professional.slug, selectedDate, selectedServiceId)
      .then((times: string[]) => {
        const slots: TimeSlot[] = times.map((time) => ({ id: `${selectedDate}-${time}`, start_time: time, end_time: time }));
        setAvailableTimesMap((prev) => ({ ...prev, [selectedDate]: slots }));
      })
      .catch(() => setAvailableTimesMap((prev) => ({ ...prev, [selectedDate]: [] })));
  }, [professional?.slug, selectedDate, selectedServiceId]);

  const services = useMemo<ServiceItem[]>(() => professional?.services || [], [professional]);
  const selectedService = useMemo(() => services.find((s) => s.id === selectedServiceId) || services[0], [services, selectedServiceId]);
  const availableTimes = useMemo(() => (selectedDate ? availableTimesMap[selectedDate] || [] : []), [selectedDate, availableTimesMap]);

  const formatServicePrice = (cents: number | null) => {
    if (cents === null || cents === undefined) return 'R$ --';
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  const handleBookNow = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      Alert.alert('Atenção', 'Selecione serviço, data e horário.');
      return;
    }
    setShowBookingSheet(true);
  };

  const handleBookingSubmit = async () => {
    if (!professional || !selectedService || !selectedDate || !selectedTime) return;
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail.trim())) { Alert.alert('Atenção', 'Email inválido.'); return; }
    const phoneRegex = /^\+?55?\d{10,11}$/;
    if (!phoneRegex.test(clientPhone.trim())) { Alert.alert('Atenção', 'Telefone inválido.'); return; }

    setBookingSubmitting(true);
    try {
      await createPublicAppointment({
        professional_id: professional.id,
        service_id: selectedService.id,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
      });
      setShowBookingSheet(false);
      Alert.alert('Sucesso! 🎉', `Seu agendamento para ${selectedService.name} foi solicitado. Em breve você receberá uma confirmação!`);
      setClientName('');
      setClientEmail('');
      setClientPhone('');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível realizar o agendamento.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading} testID="loading-indicator">
        <SkeletonList count={4} />
      </View>
    );
  }

  if (error || !professional) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Profissional não encontrado.'}</Text>
        <View style={{ marginTop: spacing.lg, width: 200 }}>
          <Button label="Tentar novamente" variant="secondary" onPress={() => router.replace(`/${slug}`)} />
        </View>
      </View>
    );
  }

  const canBook = !!(selectedService && selectedDate && selectedTime);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft stroke={palette.text} size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => {}} hitSlop={8}>
            <Share2 stroke={palette.accent} size={18} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <View style={styles.profile}>
          {professional.avatar_url ? (
            <Image source={{ uri: professional.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{professional.display_name?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
          )}
          <Text style={styles.profName}>{professional.display_name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{BUSINESS_LABEL[professional.business_type] || 'Profissional'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Services */}
        <Text style={styles.sectionTitle}>Escolha o serviço</Text>
        {services.map((service) => {
          const selected = selectedServiceId === service.id;
          return (
            <TouchableOpacity key={service.id} activeOpacity={0.85} onPress={() => setSelectedServiceId(service.id)}>
              <View style={[styles.serviceCard, selected && styles.serviceCardSelected]}>
                <View style={[styles.serviceIcon, selected && styles.serviceIconSelected]}>
                  <Scissors stroke={selected ? palette.accentText : palette.accent} size={18} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.serviceMeta}>
                    <Clock stroke={palette.textFaint} size={13} />
                    <Text style={styles.serviceDuration}>{service.duration_minutes} min</Text>
                  </View>
                </View>
                <Text style={[styles.servicePrice, selected && { color: palette.accent }]}>{formatServicePrice(service.price_cents)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Dates */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Data</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {availableDates.map((date) => {
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const weekday = WEEKDAYS[d.getDay()];
            const selected = selectedDate === date;
            return (
              <TouchableOpacity key={date} activeOpacity={0.85} onPress={() => { setSelectedDate(date); setSelectedTime(null); }}>
                <View style={[styles.dateCard, selected && styles.dateCardSelected]}>
                  <Text style={[styles.dateWeekday, selected && styles.textSelected]}>{weekday}</Text>
                  <Text style={[styles.dateDay, selected && styles.textSelected]}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Times */}
        {selectedDate && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Horário</Text>
            <View style={styles.timeGrid}>
              {availableTimes.length > 0 ? (
                availableTimes.map((slot) => {
                  const selected = selectedTime === slot.start_time;
                  return (
                    <TouchableOpacity
                      key={slot.start_time}
                      activeOpacity={0.85}
                      onPress={() => setSelectedTime(slot.start_time)}
                      style={[styles.timeCard, selected && styles.timeCardSelected]}
                    >
                      <Text style={[styles.timeText, selected && styles.textSelected]}>{slot.start_time}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noTimes}>Nenhum horário disponível para esta data.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryPrice}>{selectedService ? formatServicePrice(selectedService.price_cents) : 'R$ --'}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.lg }}>
          <Button label="Agendar agora" onPress={handleBookNow} disabled={!canBook} />
        </View>
      </View>

      {/* Booking sheet */}
      <BottomSheet visible={showBookingSheet} onClose={() => setShowBookingSheet(false)} title={`Agendar ${selectedService?.name ?? ''}`}>
        <TextField
          label="Seu nome"
          placeholder="Nome completo"
          value={clientName}
          onChangeText={setClientName}
          autoCapitalize="words"
          icon={<User stroke={palette.textFaint} size={18} />}
        />
        <TextField
          label="Email"
          placeholder="seu@email.com"
          value={clientEmail}
          onChangeText={setClientEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          icon={<Mail stroke={palette.textFaint} size={18} />}
        />
        <PhoneInput
          label="Telefone"
          value={clientPhone}
          onChangeText={setClientPhone}
          placeholder="(00) 00000-0000"
          required
          containerStyle={{ width: '100%', marginBottom: spacing.lg }}
          labelStyle={{ ...typography.label, color: palette.textMuted, marginBottom: spacing.xs }}
          style={styles.phoneInput}
        />
        <Button label="Confirmar agendamento" onPress={handleBookingSubmit} loading={bookingSubmitting} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  loading: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', padding: spacing.xl },
  center: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorText: { ...typography.body, color: palette.textMuted, textAlign: 'center' },

  header: { backgroundColor: palette.surface, paddingTop: spacing.xxl + spacing.md, paddingBottom: spacing.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, ...shadow.card },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  headerBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceSunken },
  profile: { alignItems: 'center', marginTop: spacing.sm },
  avatar: { width: 76, height: 76, borderRadius: radius.pill, backgroundColor: palette.surfaceSunken },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.display, color: palette.accent },
  profName: { ...typography.title, color: palette.text, marginTop: spacing.md },
  badge: { backgroundColor: palette.accentSoft, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill, marginTop: spacing.sm },
  badgeText: { ...typography.caption, color: palette.accent, fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  sectionTitle: { ...typography.heading, color: palette.text, marginBottom: spacing.md },

  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: palette.border },
  serviceCardSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
  serviceIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  serviceIconSelected: { backgroundColor: palette.accent },
  serviceName: { ...typography.body, color: palette.text, fontWeight: '700', fontSize: 15 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  serviceDuration: { ...typography.label, color: palette.textMuted, fontWeight: '500' },
  servicePrice: { ...typography.heading, color: palette.text },

  dateScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateCard: { width: 60, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.border },
  dateCardSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  dateWeekday: { ...typography.caption, color: palette.textMuted, fontSize: 10 },
  dateDay: { ...typography.heading, color: palette.text, marginTop: 2 },
  textSelected: { color: palette.accentText },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeCard: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.sm, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.border },
  timeCardSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  timeText: { ...typography.label, color: palette.text, fontSize: 14 },
  noTimes: { ...typography.body, color: palette.textFaint, fontStyle: 'italic' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    ...shadow.sheet,
  },
  summaryLabel: { ...typography.caption, color: palette.textFaint },
  summaryPrice: { ...typography.title, color: palette.text },

  phoneInput: { borderWidth: 1.5, borderColor: palette.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, fontSize: 15, color: palette.text, backgroundColor: palette.surface },
});
