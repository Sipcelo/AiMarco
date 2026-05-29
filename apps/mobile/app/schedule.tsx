import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  Vibration,
  StatusBar,
  Image,
  Animated,
  ScrollView,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Surface,
  FAB,
  ActivityIndicator,
  Portal,
  Dialog,
  Button,
  IconButton,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import {
  BACKEND_URL,
  listAppointments,
  listBlockedSlots,
  createBlockedSlot,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  getAvailabilityRules,
  getAvailableDays,
  getAvailability,
} from '../src/services/api';
import { scheduleStyles } from '../src/styles/schedule.styles';
import { useScheduleMetrics } from '../src/hooks/useScheduleMetrics';
import { Calendar, CheckCircle, XCircle, Plus, Clock, X } from 'lucide-react-native';

// ─── Helpers ─────────────────────────────────────────────────
function getTodayDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function getWeekDates(dateStr: string): string[] {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setUTCDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function formatTime(scheduled_at: string): string {
  return new Date(scheduled_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

const STATUS_COLORS: Record<string, { border: string; text: string }> = {
  confirmed:  { border: '#00D2FF', text: 'CONFIRMADO' },
  completed:  { border: '#25D371', text: 'CONCLUÍDO' },
  cancelled:  { border: '#FF4A4A', text: 'CANCELADO' },
  no_show:    { border: '#FF9F43', text: 'NÃO COMPARECEU' },
};

// ─── Main Screen ─────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [appointments, setAppointments] = useState([]);
  const [weekAppointments, setWeekAppointments] = useState<Record<string, typeof appointments>>({});
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [availabilityRules, setAvailabilityRules] = useState([]);
  const [weekBlockedSlots, setWeekBlockedSlots] = useState<Record<string, typeof blockedSlots>>({});

  // ── Reschedule per card ──
  const [rescheduleTargetAppointment, setRescheduleTargetAppointment] = useState<{ id: string; service_id: string } | null>(null);
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] = useState(false);
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState('');
  const [rescheduleSelectedTime, setRescheduleSelectedTime] = useState('');
  const [rescheduleAvailableDays, setRescheduleAvailableDays] = useState<string[]>([]);
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState<string[]>([]);
  const [isRescheduleSubmitting, setIsRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const professionalId = user?.id;

  // ── Custom hook: metrics & occupancy ──
  const { stats, revenue, confirmedClientCount, weekOccupancy, nextAppointment } = useScheduleMetrics(
    appointments,
    weekAppointments,
    weekBlockedSlots,
    availabilityRules,
    selectedDate,
    user,
  );

  // Haptic pulse when nextAppointment changes
  const prevNextApptIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentId = nextAppointment?.id;
    if (currentId && currentId !== prevNextApptIdRef.current) {
      Vibration.vibrate(10);
      prevNextApptIdRef.current = currentId;
    }
  }, [nextAppointment]);

  const onShare = async () => {
    if (!user?.slug) { Alert.alert('Erro', 'Slug não disponível.'); return; }
    try {
      const shareUrl = `${BACKEND_URL}/p/${user.slug}`;
      await Share.share({
        message: `Agende seu horário comigo no AiMarco: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) { console.error('Share error', e); }
  };

  const handleLogout = () => {
    setShowMenuModal(false);
    Alert.alert('Sair', 'Tem certeza que deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
          }
        },
      },
    ]);
  };

  // ── Data fetchers ──
  const fetchDays = async () => {
    if (!professionalId || !token) return;
    try {
      const rules = await getAvailabilityRules(token, professionalId);
      setAvailabilityRules(rules.filter((r: any) => r.is_active === true));
    } catch (error) {
      console.error('Error fetching availability rules:', error);
    }
  };

  useEffect(() => {
    fetchDays();
  }, [professionalId, token]);

  useEffect(() => {
    if (viewMode === 'day') fetchAppointments();
    else fetchWeekAppointments(selectedDate);
  }, [selectedDate, viewMode, professionalId]);

  async function fetchAppointments() {
    if (!professionalId || !token) return;
    setLoading(true);
    setAppointments([]);
    setBlockedSlots([]);
    try {
      const [appts, blocked] = await Promise.all([
        listAppointments(token, professionalId, selectedDate),
        listBlockedSlots(token, professionalId, selectedDate),
      ]);
      setAppointments(appts || []);
      setBlockedSlots(blocked || []);
    } catch (err: any) {
      console.error('Error loading appointments:', err?.message);
      Alert.alert('Erro', err.message || 'Falha na conexão');
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeekAppointments(referenceDate: string) {
    if (!professionalId || !token) return;
    setLoading(true);
    const dates = getWeekDates(referenceDate);
    try {
      const [apptResults, blockedResults, days] = await Promise.all([
        Promise.all(dates.map(date =>
          listAppointments(token, professionalId, date)
            .then(r => r || [])
            .catch(() => [])
        )),
        Promise.all(dates.map(date =>
          listBlockedSlots(token, professionalId, date)
            .then(r => r || [])
            .catch(() => [])
        )),
        getAvailableDays(token, professionalId),
      ]);

      const apptsByDate: Record<string, typeof appointments> = {};
      dates.forEach((date, i) => { apptsByDate[date] = apptResults[i]; });
      setWeekAppointments(apptsByDate);

      const blockedByDate: Record<string, typeof blockedSlots> = {};
      dates.forEach((date, i) => { blockedByDate[date] = blockedResults[i]; });
      setWeekBlockedSlots(blockedByDate);
      setWorkingDays(days || []);
    } catch (error) {
      console.error('Error fetching week data:', error);
      Alert.alert('Erro', 'Não foi possível carregar a semana');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBlockedSlot() {
    if (!blockDate.trim() || !blockStart.trim() || !blockEnd.trim()) {
      Alert.alert('Atenção', 'Preencha data, início e fim.'); return;
    }
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const timeRe = /^\d{2}:\d{2}$/;
    if (!dateRe.test(blockDate)) { Alert.alert('Atenção', 'Data inválida. Use AAAA-MM-DD.'); return; }
    if (!timeRe.test(blockStart) || !timeRe.test(blockEnd)) { Alert.alert('Atenção', 'Horário inválido. Use HH:MM.'); return; }
    setBlocking(true);
    try {
      const result = await createBlockedSlot(token!, professionalId!, {
        starts_at: `${blockDate}T${blockStart}:00-03:00`,
        ends_at: `${blockDate}T${blockEnd}:00-03:00`,
        reason: blockReason.trim() || undefined,
      });
      setShowBlockModal(false);
      setBlockDate(''); setBlockStart(''); setBlockEnd(''); setBlockReason('');
      Alert.alert('Sucesso', result.warnings || 'Horário bloqueado com sucesso.');
      viewMode === 'day' ? fetchAppointments() : fetchWeekAppointments(selectedDate);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally { setBlocking(false); }
  }

  async function handleUpdateStatus(id: string, newStatus: 'completed' | 'no_show') {
    const label = newStatus === 'completed' ? 'Concluído' : 'Não compareceu';
    Alert.alert(`Marcar como ${label.toLowerCase()}`, `Confirmar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          Vibration.vibrate(30);
          setUpdatingStatus(id);
          try {
            await updateAppointmentStatus(token!, id, newStatus);
            viewMode === 'day' ? fetchAppointments() : fetchWeekAppointments(selectedDate);
          } catch (err: any) {
            Alert.alert('Erro', err.message);
          } finally { setUpdatingStatus(null); }
        },
      },
    ]);
  }

  async function handleCancel(id: string) {
    Alert.alert('Cancelar agendamento', 'Tem certeza?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim, cancelar', style: 'destructive',
        onPress: async () => {
          setCancelling(id);
          try {
            await cancelAppointment(token!, id);
            viewMode === 'day' ? fetchAppointments() : fetchWeekAppointments(selectedDate);
          } catch (err: any) {
            Alert.alert('Erro', err.message);
          } finally { setCancelling(null); }
        },
      },
    ]);
  }

  // ── Reschedule handlers ──
  async function openRescheduleFlow(item: typeof flatListAppointments[0]) {
    if (item.status_raw !== 'confirmed') return;
    setRescheduleTargetAppointment({ id: item.id, service_id: item.service_id });
    setRescheduleSelectedDate('');
    setRescheduleSelectedTime('');
    setRescheduleAvailableSlots([]);
    setRescheduleError('');
    setIsRescheduleModalVisible(true);
    try {
      const days = await getAvailableDays(token!, professionalId!);
      setRescheduleAvailableDays(days || []);
    } catch {
      setRescheduleAvailableDays([]);
    }
  }

  async function handleRescheduleDateSelect(date: string) {
    setRescheduleSelectedDate(date);
    setRescheduleSelectedTime('');
    if (!rescheduleTargetAppointment) return;
    try {
      const slots = await getAvailability(token!, professionalId!, rescheduleTargetAppointment.service_id, date);
      setRescheduleAvailableSlots(slots || []);
    } catch {
      setRescheduleAvailableSlots([]);
    }
  }

  async function handleSubmitReschedule() {
    if (!rescheduleTargetAppointment || !rescheduleSelectedDate || !rescheduleSelectedTime) return;
    setIsRescheduleSubmitting(true);
    setRescheduleError('');
    try {
      const newScheduledAt = `${rescheduleSelectedDate}T${rescheduleSelectedTime}:00-03:00`;
      await rescheduleAppointment(token!, rescheduleTargetAppointment.id, newScheduledAt);
      closeRescheduleModal();
      Vibration.vibrate(30);
      viewMode === 'day' ? fetchAppointments() : fetchWeekAppointments(rescheduleSelectedDate);
      Alert.alert('Sucesso', 'Agendamento reagendado com sucesso.');
    } catch (err: any) {
      const msg = err.message || 'Erro ao reagendar';
      Vibration.vibrate(30);
      // Diferenciar erro de conflito (409) vs validação (400)
      if (/horário indisponível|conflito|sobrepõe/i.test(msg)) {
        setRescheduleError(`⚠️ Horário indisponível: ${msg}`);
      } else {
        setRescheduleError(msg);
      }
    } finally {
      setIsRescheduleSubmitting(false);
    }
  }

  function closeRescheduleModal() {
    setIsRescheduleModalVisible(false);
    setRescheduleTargetAppointment(null);
    setRescheduleSelectedDate('');
    setRescheduleSelectedTime('');
    setRescheduleAvailableDays([]);
    setRescheduleAvailableSlots([]);
    setRescheduleError('');
  }

  // ── Data para métricas (dinâmico) ──
  const metricsData = [
    {
      id: '1',
      title: 'TOTAL',
      value: String(stats.total).padStart(2, '0'),
      subtitle: 'agendamentos',
      icon: Calendar,
      color: '#e9eff1',
    },
    {
      id: '2',
      title: 'CONFIRMADOS',
      value: String(stats.confirmed).padStart(2, '0'),
      subtitle: 'check-in',
      icon: CheckCircle,
      color: '#00D2FF',
    },
    {
      id: '3',
      title: 'CONCLUÍDOS',
      value: String(stats.completed).padStart(2, '0'),
      subtitle: 'finalizados',
      icon: CheckCircle,
      color: '#25D371',
    },
    {
      id: '4',
      title: 'CANCELADOS',
      value: String(stats.cancelled).padStart(2, '0'),
      subtitle: 'hoje',
      icon: XCircle,
      color: '#FF4A4A',
    },
  ];

  // ── appointments para FlatList (dinâmico, com contexto para reagendamento) ──
  const flatListAppointments = appointments
    .filter(a => a.status !== 'cancelled')
    .map(a => ({
      id: a.id,
      service_id: a.service_id,
      status_raw: a.status,
      scheduled_at: a.scheduled_at,
      time: formatTime(a.scheduled_at),
      client: a.client_name || 'Cliente',
      service: a.service_name || 'Serviço',
      status: STATUS_COLORS[a.status]?.text || a.status,
      color: STATUS_COLORS[a.status]?.border || '#e9eff1',
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const renderMetric = ({ item }: { item: typeof metricsData[0] }) => (
    <Surface style={scheduleStyles.metricCard} elevation={2}>
      <View style={scheduleStyles.metricHeader}>
        <Text style={[scheduleStyles.metricTitle, { color: item.color }]}>{item.title}</Text>
        <item.icon stroke={item.color} size={16} opacity={0.5} />
      </View>
      <View style={scheduleStyles.metricBody}>
        <Text style={[scheduleStyles.metricValue, { color: item.color }]}>{item.value}</Text>
        <Text style={scheduleStyles.metricSubtitle}>{item.subtitle}</Text>
      </View>
    </Surface>
  );

  const renderAppointment = ({ item }: { item: typeof flatListAppointments[0] }) => (
    <Surface style={scheduleStyles.appointmentCard} elevation={1}>
      <View style={scheduleStyles.timeContainer}>
        <Text style={scheduleStyles.timeText}>{item.time}</Text>
      </View>
      <View style={scheduleStyles.appointmentInfo}>
        <Text style={scheduleStyles.clientName}>{item.client}</Text>
        <Text style={scheduleStyles.serviceName}>{item.service}</Text>
      </View>
      <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <View style={[scheduleStyles.statusTag, { backgroundColor: `${item.color}20`, borderColor: item.color }]}>
          <Text style={[scheduleStyles.statusText, { color: item.color }]}>{item.status}</Text>
        </View>
        {item.status_raw === 'confirmed' && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
            onPress={() => openRescheduleFlow(item)}
          >
            <Clock stroke="#00D2FF" size={14} />
            <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '600' }}>Reagendar</Text>
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );

  // ── Pulse animation (must be before any early return) ──
  const isScheduleEmpty = viewMode === 'day' && appointments.length === 0;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isScheduleEmpty) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isScheduleEmpty]);

  // ── Early return after ALL hooks ──
  if (!professionalId) {
    return (
      <View style={[scheduleStyles.container, scheduleStyles.center]}>
        <ActivityIndicator size="large" color="#00D2FF" />
      </View>
    );
  }

  return (
    <View style={scheduleStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A192F" />

      {/* Header */}
      <View style={scheduleStyles.header}>
        <View style={scheduleStyles.headerTop}>
          <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.75}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={scheduleStyles.avatar} />
            ) : (
              <Image
                source={require('../img/Regina S. Hair.png')}
                style={{ width: 36, height: 36, borderRadius: 18 }}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
          <Text style={scheduleStyles.appName}>Minha Agenda</Text>
          {isScheduleEmpty && (
            <Animated.View style={[scheduleStyles.headerShareButton, { transform: [{ scale: pulseAnim }] }]}>
              <TouchableOpacity onPress={onShare} style={scheduleStyles.shareIconBtn}>
                <Text style={scheduleStyles.shareIconText}>📤</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        <Text style={scheduleStyles.greeting}>
          {viewMode === 'day' ? `Bom dia, ${user?.display_name?.split(' ')[0] || ''}!` : `Olá, ${user?.display_name?.split(' ')[0] || ''}!`}
        </Text>
        {viewMode === 'day' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, -1))}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ color: '#00D2FF', fontSize: 22, fontWeight: '600' }}>‹</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={scheduleStyles.dateHeadline}>
                {new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })}
              </Text>
              <Text style={scheduleStyles.dateSub}>{formatFullDate(selectedDate)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, 1))}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ color: '#00D2FF', fontSize: 22, fontWeight: '600' }}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Metrics Grid */}
      {viewMode === 'day' && (
        <View style={scheduleStyles.metricsContainer}>
          <FlatList
            data={metricsData}
            renderItem={renderMetric}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={scheduleStyles.metricsRow}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Next Client Banner */}
      {viewMode === 'day' && (
        <View style={scheduleStyles.nextClientBanner}>
          {nextAppointment ? (
            <>
              <View style={scheduleStyles.nextClientIcon}>
                <Text style={{ fontSize: 18 }}>🔔</Text>
              </View>
              <View style={scheduleStyles.nextClientContent}>
                <Text style={scheduleStyles.nextClientLabel}>
                  Próximo: {nextAppointment.client_name || 'Cliente'} — {nextAppointment.service_name || 'Serviço'}
                </Text>
                <Text style={scheduleStyles.nextClientTime}>
                  {formatTime(nextAppointment.scheduled_at)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={scheduleStyles.nextClientEmpty}>
              Não há mais clientes para hoje. Bom descanso!
            </Text>
          )}
        </View>
      )}

      {/* Appointments List */}
      <View style={scheduleStyles.listContainer}>
        <Text style={scheduleStyles.sectionTitle}>
          {viewMode === 'day' ? 'Próximos Agendamentos' : 'Agendamentos da Semana'}
        </Text>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#00D2FF" />
        ) : (
          <FlatList
            data={flatListAppointments}
            renderItem={renderAppointment}
            keyExtractor={item => item.id}
            contentContainerStyle={scheduleStyles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={scheduleStyles.emptyText}>Nenhum agendamento para este período.</Text>
            }
          />
        )}
      </View>

      {/* FAB */}
      <View style={scheduleStyles.fabContainer}>
        <FAB
          icon={() => <Plus stroke="#0A192F" size={24} />}
          style={scheduleStyles.fab}
          onPress={() => setShowBlockModal(true)}
          customSize={64}
        />
      </View>

      {/* Block Slot Modal */}
      <Portal>
        <Dialog visible={showBlockModal} onDismiss={() => setShowBlockModal(false)}>
          <Dialog.Title>Bloquear Horário</Dialog.Title>
          <Dialog.Content>
            <TextInput
              placeholder="Data (AAAA-MM-DD)"
              value={blockDate}
              onChangeText={setBlockDate}
              style={{ marginBottom: 8 }}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Início (HH:MM)"
              value={blockStart}
              onChangeText={setBlockStart}
              style={{ marginBottom: 8 }}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Fim (HH:MM)"
              value={blockEnd}
              onChangeText={setBlockEnd}
              style={{ marginBottom: 8 }}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Motivo (opcional)"
              value={blockReason}
              onChangeText={setBlockReason}
              style={{ marginBottom: 8 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowBlockModal(false)}>Cancelar</Button>
            <Button onPress={handleCreateBlockedSlot} loading={blocking} disabled={blocking}>Bloquear</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Reschedule Modal */}
      <Portal>
        <Dialog visible={isRescheduleModalVisible} onDismiss={closeRescheduleModal}>
          <Dialog.Title>Reagendar Agendamento</Dialog.Title>
          <Dialog.Content>
            {rescheduleError !== '' && (
              <Text style={{ color: '#FF4A4A', marginBottom: 8 }}>{rescheduleError}</Text>
            )}
            <Text style={{ fontWeight: '600', marginBottom: 4 }}>Selecione a nova data:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {rescheduleAvailableDays.map(day => (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleRescheduleDateSelect(day)}
                  style={{
                    padding: 8,
                    marginHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: rescheduleSelectedDate === day ? '#00D2FF' : '#1A2A3A',
                    minWidth: 60,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: rescheduleSelectedDate === day ? '#0A192F' : '#e9eff1', fontSize: 12 }}>
                    {new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </Text>
                </TouchableOpacity>
              ))}
              {rescheduleAvailableDays.length === 0 && (
                <Text style={{ color: '#e9eff180', fontSize: 12 }}>Nenhuma data disponível</Text>
              )}
            </ScrollView>

            {rescheduleSelectedDate !== '' && (
              <>
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>Selecione o horário:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {rescheduleAvailableSlots.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => setRescheduleSelectedTime(slot)}
                      style={{
                        padding: 8,
                        marginHorizontal: 4,
                        borderRadius: 8,
                        backgroundColor: rescheduleSelectedTime === slot ? '#00D2FF' : '#1A2A3A',
                        minWidth: 56,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: rescheduleSelectedTime === slot ? '#0A192F' : '#e9eff1', fontSize: 12 }}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {rescheduleAvailableSlots.length === 0 && (
                    <Text style={{ color: '#e9eff180', fontSize: 12 }}>Nenhum horário disponível</Text>
                  )}
                </ScrollView>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeRescheduleModal}>Cancelar</Button>
            <Button
              onPress={handleSubmitReschedule}
              loading={isRescheduleSubmitting}
              disabled={isRescheduleSubmitting || !rescheduleSelectedDate || !rescheduleSelectedTime}
            >
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// Kept for schedule-specific date formatting used in render
function formatFullDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dateStr}T12:00:00Z`));
}
