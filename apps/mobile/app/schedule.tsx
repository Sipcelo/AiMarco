import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  Share,
  Vibration,
  StatusBar,
  Platform,
  Image,
  TextInput,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  Bell,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Ban,
  UserX,
  MessageCircle,
} from 'lucide-react-native';
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
import { agendaStyles as s } from '../src/styles/agenda.styles';
import { palette } from '../src/theme/tokens';
import { useScheduleMetrics } from '../src/hooks/useScheduleMetrics';
import { BottomSheet } from '../src/components/ui/BottomSheet';
import { SkeletonList } from '../src/components/schedule/SkeletonList';
import { EmptyState } from '../src/components/schedule/EmptyState';
import { AppointmentCard, AgendaItem } from '../src/components/schedule/AppointmentCard';
import { MetricCard, MetricItem } from '../src/components/schedule/MetricCard';

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

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function formatTime(scheduled_at: string): string {
  return new Date(scheduled_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

function formatFullDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

function greetingByHour(): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date()));
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const HEADER_TOP = (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44) + 8;

// ─── Main Screen ─────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);

  // Block sheet
  const [showBlockSheet, setShowBlockSheet] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  // Actions sheet (per appointment)
  const [actionItem, setActionItem] = useState<AgendaItem | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);

  // Reschedule sheet
  const [rescheduleTarget, setRescheduleTarget] = useState<{ id: string; service_id: string } | null>(null);
  const [isRescheduleVisible, setIsRescheduleVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleDays, setRescheduleDays] = useState<string[]>([]);
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const professionalId = user?.id;

  const { stats, nextAppointment } = useScheduleMetrics(
    appointments, {}, {}, availabilityRules, selectedDate, user,
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
      await Share.share({ message: `Agende seu horário comigo no AiMarco: ${shareUrl}`, url: shareUrl });
    } catch (e) { console.error('Share error', e); }
  };

  // ── Data fetchers ──
  useEffect(() => {
    (async () => {
      if (!professionalId || !token) return;
      try {
        const rules = await getAvailabilityRules(token, professionalId);
        setAvailabilityRules(rules.filter((r: any) => r.is_active === true));
      } catch (error) { console.error('Error fetching availability rules:', error); }
    })();
  }, [professionalId, token]);

  useEffect(() => { fetchAppointments(); }, [selectedDate, professionalId]);

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
    } finally { setLoading(false); }
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
      setShowBlockSheet(false);
      setBlockDate(''); setBlockStart(''); setBlockEnd(''); setBlockReason('');
      Alert.alert('Sucesso', result.warnings || 'Horário bloqueado com sucesso.');
      fetchAppointments();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally { setBlocking(false); }
  }

  // ── Appointment actions (via actions sheet) ──
  function openActions(item: AgendaItem) {
    setActionItem(item);
    setActionsVisible(true);
  }

  // Abre a conversa do cliente no WhatsApp (wa.me aceita só dígitos, sem '+').
  async function openWhatsApp(phone?: string) {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) {
      Alert.alert('Sem telefone', 'Este agendamento não tem telefone do cliente.');
      return;
    }
    const url = `https://wa.me/${digits}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  }

  async function performStatus(id: string, newStatus: 'completed' | 'no_show') {
    setActionsVisible(false);
    Vibration.vibrate(20);
    try {
      await updateAppointmentStatus(token!, id, newStatus);
      fetchAppointments();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  }

  function confirmCancel(id: string) {
    setActionsVisible(false);
    Alert.alert('Cancelar agendamento', 'Tem certeza? O cliente perderá este horário.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Sim, cancelar', style: 'destructive',
        onPress: async () => {
          try {
            await cancelAppointment(token!, id);
            fetchAppointments();
          } catch (err: any) { Alert.alert('Erro', err.message); }
        },
      },
    ]);
  }

  // ── Reschedule ──
  async function openRescheduleFlow(item: AgendaItem) {
    setActionsVisible(false);
    setRescheduleTarget({ id: item.id, service_id: item.service_id });
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleSlots([]);
    setRescheduleError('');
    setIsRescheduleVisible(true);
    try {
      const days = await getAvailableDays(token!, professionalId!);
      setRescheduleDays(days || []);
    } catch { setRescheduleDays([]); }
  }

  async function handleRescheduleDateSelect(date: string) {
    setRescheduleDate(date);
    setRescheduleTime('');
    if (!rescheduleTarget) return;
    try {
      const slots = await getAvailability(token!, professionalId!, rescheduleTarget.service_id, date);
      setRescheduleSlots(slots || []);
    } catch { setRescheduleSlots([]); }
  }

  async function handleSubmitReschedule() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;
    setRescheduleSubmitting(true);
    setRescheduleError('');
    try {
      const newScheduledAt = `${rescheduleDate}T${rescheduleTime}:00-03:00`;
      await rescheduleAppointment(token!, rescheduleTarget.id, newScheduledAt);
      closeRescheduleSheet();
      Vibration.vibrate(30);
      fetchAppointments();
      Alert.alert('Sucesso', 'Agendamento reagendado com sucesso.');
    } catch (err: any) {
      const msg = err.message || 'Erro ao reagendar';
      Vibration.vibrate(30);
      setRescheduleError(/horário indisponível|conflito|sobrepõe/i.test(msg) ? `⚠️ Horário indisponível: ${msg}` : msg);
    } finally { setRescheduleSubmitting(false); }
  }

  function closeRescheduleSheet() {
    setIsRescheduleVisible(false);
    setRescheduleTarget(null);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleDays([]);
    setRescheduleSlots([]);
    setRescheduleError('');
  }

  // ── Derived data ──
  const flatListAppointments: AgendaItem[] = appointments
    .filter(a => a.status !== 'cancelled')
    .map(a => ({
      id: a.id,
      service_id: a.service_id,
      status_raw: a.status,
      scheduled_at: a.scheduled_at,
      time: formatTime(a.scheduled_at),
      client: a.client_name || 'Cliente',
      service: a.service_name || 'Serviço',
      phone: a.client_phone,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const metricsData: MetricItem[] = [
    { id: '1', title: 'TOTAL', value: String(stats.total).padStart(2, '0'), subtitle: 'agendamentos', icon: Calendar, color: palette.accent },
    { id: '2', title: 'CONFIRMADOS', value: String(stats.confirmed).padStart(2, '0'), subtitle: 'a atender', icon: CheckCircle, color: palette.confirmed },
    { id: '3', title: 'CONCLUÍDOS', value: String(stats.completed).padStart(2, '0'), subtitle: 'finalizados', icon: CheckCircle, color: palette.completed },
    { id: '4', title: 'CANCELADOS', value: String(stats.cancelled).padStart(2, '0'), subtitle: 'hoje', icon: XCircle, color: palette.cancelled },
  ];

  if (!professionalId) {
    return (
      <View style={[s.center, { padding: 16 }]}>
        <SkeletonList count={3} />
      </View>
    );
  }

  const firstName = user?.display_name?.split(' ')[0] || '';

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />

      {/* Header */}
      <View style={[s.header, { paddingTop: HEADER_TOP }]}>
        <View style={s.headerTop}>
          <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/profile')} activeOpacity={0.8}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={s.avatar} />
            ) : (
              <Image source={require('../img/Regina S. Hair.png')} style={s.avatar} resizeMode="cover" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={onShare} activeOpacity={0.8}>
            <Bell stroke={palette.accent} size={20} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        <Text style={s.greeting}>{greetingByHour()}, {firstName}!</Text>
        <Text style={s.greetingSub}>Aqui está sua agenda</Text>

        {/* Date nav */}
        <View style={s.dateNav}>
          <TouchableOpacity style={s.navBtn} onPress={() => setSelectedDate(addDays(selectedDate, -1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft stroke={palette.accent} size={22} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={s.dateCenter}>
            <Text style={s.dateHeadline}>
              {new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })}
            </Text>
            <Text style={s.dateSub}>{formatFullDate(selectedDate)}</Text>
          </View>
          <TouchableOpacity style={s.navBtn} onPress={() => setSelectedDate(addDays(selectedDate, 1))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronRight stroke={palette.accent} size={22} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics */}
      <View style={s.metricsContainer}>
        <FlatList
          data={metricsData}
          renderItem={({ item, index }) => <MetricCard item={item} index={index} />}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={s.metricsRow}
          scrollEnabled={false}
        />
      </View>

      {/* Next client banner */}
      {nextAppointment ? (
        <View style={s.nextBanner}>
          <View style={s.nextIcon}><Bell stroke={palette.white} size={18} strokeWidth={2.4} /></View>
          <View style={s.nextContent}>
            <Text style={s.nextLabel} numberOfLines={1}>
              Próximo: {nextAppointment.client_name || 'Cliente'} · {nextAppointment.service_name || 'Serviço'}
            </Text>
            <Text style={s.nextTime}>{formatTime(nextAppointment.scheduled_at)}</Text>
          </View>
        </View>
      ) : (
        !loading && (
          <View style={s.nextEmpty}>
            <Bell stroke={palette.textFaint} size={18} />
            <Text style={s.nextEmptyText}>Sem próximos clientes hoje. Bom descanso!</Text>
          </View>
        )
      )}

      {/* List */}
      <View style={s.listContainer}>
        <Text style={s.sectionTitle}>Agendamentos do dia</Text>
        {loading ? (
          <SkeletonList count={4} />
        ) : (
          <FlatList
            data={flatListAppointments}
            renderItem={({ item, index }) => <AppointmentCard item={item} index={index} onPress={openActions} />}
            keyExtractor={item => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                title="Nenhum agendamento"
                subtitle="Você ainda não tem horários marcados para este dia. Compartilhe seu link para receber agendamentos."
                ctaLabel="Compartilhar link"
                onPressCta={onShare}
              />
            }
          />
        )}
      </View>

      {/* FAB */}
      <View style={s.fabContainer}>
        <Pressable style={s.fab} onPress={() => { setBlockDate(selectedDate); setShowBlockSheet(true); }} android_ripple={{ color: 'rgba(255,255,255,0.3)', radius: 30 }}>
          <Plus stroke={palette.accentText} size={26} strokeWidth={2.6} />
        </Pressable>
      </View>

      {/* Actions sheet */}
      <BottomSheet visible={actionsVisible} onClose={() => setActionsVisible(false)} scroll={false}>
        {actionItem && (
          <View>
            <Text style={s.sheetClientName}>{actionItem.client}</Text>
            <Text style={s.sheetClientMeta}>{actionItem.service} · {actionItem.time}</Text>

            {actionItem.phone ? (
              <View style={s.contactBlock}>
                <Text style={s.contactPhone} selectable>{actionItem.phone}</Text>
                <Pressable
                  style={s.whatsappBtn}
                  onPress={() => openWhatsApp(actionItem.phone)}
                  android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  <MessageCircle stroke="#ffffff" size={18} strokeWidth={2.4} />
                  <Text style={s.whatsappBtnText}>Chamar no WhatsApp</Text>
                </Pressable>
              </View>
            ) : null}

            {actionItem.status_raw === 'confirmed' ? (
              <>
                <ActionRow color={palette.accent} icon={RotateCcw} label="Reagendar" onPress={() => openRescheduleFlow(actionItem)} />
                <ActionRow color={palette.completed} icon={CheckCircle} label="Marcar como concluído" onPress={() => performStatus(actionItem.id, 'completed')} />
                <ActionRow color={palette.noShow} icon={UserX} label="Não compareceu" onPress={() => performStatus(actionItem.id, 'no_show')} />
                <ActionRow color={palette.cancelled} icon={Ban} label="Cancelar agendamento" onPress={() => confirmCancel(actionItem.id)} />
              </>
            ) : (
              <Text style={s.chipEmpty}>Este agendamento não está mais ativo.</Text>
            )}
          </View>
        )}
      </BottomSheet>

      {/* Block sheet */}
      <BottomSheet visible={showBlockSheet} onClose={() => setShowBlockSheet(false)} title="Bloquear horário">
        <Text style={s.fieldLabel}>Data</Text>
        <TextInput style={s.field} placeholder="AAAA-MM-DD" placeholderTextColor={palette.textFaint} value={blockDate} onChangeText={setBlockDate} autoCapitalize="none" />
        <Text style={s.fieldLabel}>Início</Text>
        <TextInput style={s.field} placeholder="HH:MM" placeholderTextColor={palette.textFaint} value={blockStart} onChangeText={setBlockStart} autoCapitalize="none" />
        <Text style={s.fieldLabel}>Fim</Text>
        <TextInput style={s.field} placeholder="HH:MM" placeholderTextColor={palette.textFaint} value={blockEnd} onChangeText={setBlockEnd} autoCapitalize="none" />
        <Text style={s.fieldLabel}>Motivo (opcional)</Text>
        <TextInput style={s.field} placeholder="Ex.: almoço, folga…" placeholderTextColor={palette.textFaint} value={blockReason} onChangeText={setBlockReason} />
        <Pressable
          style={[s.primaryBtn, blocking && s.primaryBtnDisabled]}
          onPress={handleCreateBlockedSlot}
          disabled={blocking}
        >
          <Text style={s.primaryBtnText}>{blocking ? 'Bloqueando…' : 'Bloquear horário'}</Text>
        </Pressable>
      </BottomSheet>

      {/* Reschedule sheet */}
      <BottomSheet visible={isRescheduleVisible} onClose={closeRescheduleSheet} title="Reagendar">
        {rescheduleError !== '' && <Text style={s.errorText}>{rescheduleError}</Text>}

        <Text style={s.fieldLabel}>Nova data</Text>
        <View style={s.chipRow}>
          {rescheduleDays.length === 0 && <Text style={s.chipEmpty}>Nenhuma data disponível</Text>}
          {rescheduleDays.map(day => {
            const selected = rescheduleDate === day;
            return (
              <Pressable key={day} onPress={() => handleRescheduleDateSelect(day)} style={[s.chip, selected && s.chipSelected]}>
                <Text style={[s.chipText, selected && s.chipTextSelected]}>
                  {new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {rescheduleDate !== '' && (
          <>
            <Text style={s.fieldLabel}>Horário</Text>
            <View style={s.chipRow}>
              {rescheduleSlots.length === 0 && <Text style={s.chipEmpty}>Nenhum horário disponível</Text>}
              {rescheduleSlots.map(slot => {
                const selected = rescheduleTime === slot;
                return (
                  <Pressable key={slot} onPress={() => setRescheduleTime(slot)} style={[s.chip, selected && s.chipSelected]}>
                    <Text style={[s.chipText, selected && s.chipTextSelected]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Pressable
          style={[s.primaryBtn, (rescheduleSubmitting || !rescheduleDate || !rescheduleTime) && s.primaryBtnDisabled]}
          onPress={handleSubmitReschedule}
          disabled={rescheduleSubmitting || !rescheduleDate || !rescheduleTime}
        >
          <Text style={s.primaryBtnText}>{rescheduleSubmitting ? 'Reagendando…' : 'Confirmar reagendamento'}</Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
}

// ─── Action row inside the actions sheet ─────────────────────
type IconCmp = React.ComponentType<{ stroke?: string; size?: number; strokeWidth?: number }>;
function ActionRow({ color, icon: Icon, label, onPress }: { color: string; icon: IconCmp; label: string; onPress: () => void }) {
  return (
    <Pressable style={s.actionRow} onPress={onPress} android_ripple={{ color: palette.border }}>
      <View style={[s.actionIcon, { backgroundColor: `${color}1A` }]}>
        <Icon stroke={color} size={18} strokeWidth={2.4} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}
