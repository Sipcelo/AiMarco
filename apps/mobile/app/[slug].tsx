import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  StatusBar,
} from 'react-native';
import { Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProfessionalBySlug, Professional, ServiceItem, createPublicAppointment, getPublicAvailability, BACKEND_URL } from '../src/services/api';
import { bookingStyles } from '../src/styles/booking.styles';
import { ChevronLeft, Scissors } from 'lucide-react-native';
import { PhoneInput } from '../src/components/PhoneInput';

// Tipos
type TimeSlot = {
  id: string;
  start_time: string;
  end_time: string;
};

export default function ProfessionalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  // Estado principal
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado da seleção
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimesMap, setAvailableTimesMap] = useState<Record<string, TimeSlot[]>>({});

  // Modal de agendamento
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // ── Fetch professional data ──
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getProfessionalBySlug(slug)
      .then((data) => {
        setProfessional(data);
        if (data.services?.length > 0) {
          setSelectedServiceId(data.services[0].id);
        }
      })
      .catch((err) => {
        setError(err.message || 'Erro ao buscar dados do profissional.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // ── Generate available dates (next 14 days) ──
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
    if (days.length > 0) {
      setSelectedDate(days[0]);
    }
  }, [professional]);

  // ── Fetch available times quando uma data é selecionada ──
  useEffect(() => {
    if (!professional?.slug || !selectedDate || !selectedServiceId) return;
    getPublicAvailability(professional.slug, selectedDate, selectedServiceId)
      .then((times: string[]) => {
        const slots: TimeSlot[] = times.map(time => ({
          id: `${selectedDate}-${time}`,
          start_time: time,
          end_time: time,
        }));
        setAvailableTimesMap(prev => ({ ...prev, [selectedDate]: slots }));
      })
      .catch(() => {
        setAvailableTimesMap(prev => ({ ...prev, [selectedDate]: [] }));
      });
  }, [professional?.slug, selectedDate, selectedServiceId]);

  // ── Derived ──
  const services = useMemo<ServiceItem[]>(
    () => professional?.services || [],
    [professional]
  );

  const selectedService = useMemo(
    () => services.find(s => s.id === selectedServiceId) || services[0],
    [services, selectedServiceId]
  );

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    return {
      full: selectedDate,
      day: String(d.getDate()).padStart(2, '0'),
      weekday: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()],
    };
  }, [selectedDate]);

  const availableTimes = useMemo(() => {
    if (!selectedDate) return [];
    return availableTimesMap[selectedDate] || [];
  }, [selectedDate, availableTimesMap]);

  // ── Handlers ──
  const handleShare = async () => {
    if (!professional) return;
    const shareUrl = `https://aimarco.app/${slug}`;
    const message = `📋 Agende com ${professional.display_name}\n\nServiços disponíveis no AiMarco!\n\nAcesse: ${shareUrl}`;
    try {
      await Share.share({ message, url: shareUrl });
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  };

  const handleBookNow = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      Alert.alert('Atenção', 'Selecione serviço, data e horário.');
      return;
    }
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async () => {
    if (!professional || !selectedService || !selectedDate || !selectedTime) return;
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail.trim())) {
      Alert.alert('Atenção', 'Email inválido.');
      return;
    }

    const phoneRegex = /^\+?55?\d{10,11}$/;
    if (!phoneRegex.test(clientPhone.trim())) {
      Alert.alert('Atenção', 'Telefone inválido.');
      return;
    }

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
      Alert.alert(
        'Sucesso! 📋',
        `Seu agendamento para ${selectedService.name} foi solicitado. Em breve você receberá uma confirmação!`,
        [{ text: 'OK', onPress: () => setShowBookingModal(false) }]
      );
      // Reset form
      setClientName('');
      setClientEmail('');
      setClientPhone('');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível realizar o agendamento.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // ── Render helpers ──
  const formatServicePrice = (cents: number | null) => {
    if (cents === null || cents === undefined) return 'R$ --';
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[bookingStyles.container, bookingStyles.center]}>
        <ActivityIndicator size="large" color="#00D2FF" />
      </View>
    );
  }

  // ── Error state ──
  if (error || !professional) {
    return (
      <View style={[bookingStyles.container, bookingStyles.center]}>
        <Text style={bookingStyles.error}>{error || 'Profissional não encontrado.'}</Text>
        <TouchableOpacity style={bookingStyles.retryButton} onPress={() => setLoading(true)}>
          <Text style={bookingStyles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={bookingStyles.container}>
      {/* Header */}
      <View style={bookingStyles.header}>
        <TouchableOpacity style={bookingStyles.backButton} onPress={() => router.back()}>
          <ChevronLeft stroke="#FFFFFF" size={24} />
        </TouchableOpacity>
        <View style={bookingStyles.profileContainer}>
          {professional.avatar_url ? (
            <Image source={{ uri: professional.avatar_url }} style={bookingStyles.avatar} />
          ) : (
            <View style={[bookingStyles.avatar, bookingStyles.avatarPlaceholder]}>
              <Text style={bookingStyles.avatarInitial}>
                {professional.display_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={bookingStyles.profName}>{professional.display_name}</Text>
          <Text style={bookingStyles.profTitle}>
            {professional.business_type === 'barbershop' ? '💈 Barbeiro' :
             professional.business_type === 'nails' ? '💅 Manicure/Pedicure' :
             '✂️ Cabelereiro'}
          </Text>
        </View>
      </View>

      <ScrollView style={bookingStyles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Services */}
        <View style={bookingStyles.section}>
          <Text style={bookingStyles.sectionTitle}>Escolha o Serviço</Text>
          {services.map(service => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.8}
              onPress={() => setSelectedServiceId(service.id)}
            >
              <Surface style={[
                bookingStyles.serviceCard,
                selectedServiceId === service.id && bookingStyles.serviceCardSelected
              ]} elevation={1}>
                <View style={bookingStyles.serviceIconContainer}>
                  <Scissors stroke={selectedServiceId === service.id ? '#00D2FF' : '#e9eff1'} size={20} />
                </View>
                <View style={bookingStyles.serviceInfo}>
                  <Text style={bookingStyles.serviceName}>{service.name}</Text>
                  <Text style={bookingStyles.serviceDuration}>{service.duration_minutes} min</Text>
                </View>
                <Text style={bookingStyles.servicePrice}>{formatServicePrice(service.price_cents)}</Text>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dates */}
        <View style={bookingStyles.section}>
          <Text style={bookingStyles.sectionTitle}>Data</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bookingStyles.dateScroll}>
            {availableDates.map(date => {
              const d = new Date(date);
              const day = String(d.getDate()).padStart(2, '0');
              const weekday = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()];
              return (
                <TouchableOpacity
                  key={date}
                  activeOpacity={0.8}
                  onPress={() => { setSelectedDate(date); setSelectedTime(null); }}
                >
                  <Surface style={[
                    bookingStyles.dateCard,
                    selectedDate === date && bookingStyles.dateCardSelected
                  ]} elevation={1}>
                    <Text style={[
                      bookingStyles.dateWeekday,
                      selectedDate === date && bookingStyles.textSelected
                    ]}>{weekday}</Text>
                    <Text style={[
                      bookingStyles.dateDay,
                      selectedDate === date && bookingStyles.textSelected
                    ]}>{day}</Text>
                  </Surface>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Times */}
        {selectedDate && (
          <View style={bookingStyles.section}>
            <Text style={bookingStyles.sectionTitle}>Horário</Text>
            <View style={bookingStyles.timeGrid}>
              {availableTimes.length > 0 ? (
                availableTimes.map(slot => (
                  <TouchableOpacity
                    key={slot.start_time}
                    activeOpacity={0.8}
                    onPress={() => setSelectedTime(slot.start_time)}
                    style={[
                      bookingStyles.timeCard,
                      selectedTime === slot.start_time && bookingStyles.timeCardSelected
                    ]}
                  >
                    <Text style={[
                      bookingStyles.timeText,
                      selectedTime === slot.start_time && bookingStyles.textSelected
                    ]}>{slot.start_time}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={bookingStyles.noTimesText}>Nenhum horário disponível para esta data.</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <Surface style={bookingStyles.bottomBar}>
        <View style={bookingStyles.summaryInfo}>
          <Text style={bookingStyles.summaryTotal}>Total</Text>
          <Text style={bookingStyles.summaryPrice}>
            {selectedService ? formatServicePrice(selectedService.price_cents) : 'R$ --'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            bookingStyles.bookButton,
            (!selectedService || !selectedDate || !selectedTime) && bookingStyles.bookButtonDisabled
          ]}
          onPress={handleBookNow}
          disabled={!selectedService || !selectedDate || !selectedTime}
        >
          <Text style={bookingStyles.bookButtonText}>Agendar agora</Text>
        </TouchableOpacity>
      </Surface>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <KeyboardAvoidingView
          style={bookingStyles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={bookingStyles.modalContent}>
            <View style={bookingStyles.modalBox}>
              <Text style={bookingStyles.modalTitle}>
                Agendar {selectedService?.name}
              </Text>

              <Text style={bookingStyles.modalLabel}>Seu nome *</Text>
              <TextInput
                style={bookingStyles.modalInput}
                placeholder="Nome completo"
                value={clientName}
                onChangeText={setClientName}
                autoCapitalize="words"
              />

              <Text style={bookingStyles.modalLabel}>Email *</Text>
              <TextInput
                style={bookingStyles.modalInput}
                placeholder="seu@email.com"
                value={clientEmail}
                onChangeText={setClientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <PhoneInput
                label="Telefone *"
                value={clientPhone}
                onChangeText={setClientPhone}
                placeholder="(00) 00000-0000"
                required
                containerStyle={{ width: '100%' }}
                labelStyle={{ fontSize: 14, fontWeight: '600', color: '#FFF', marginBottom: 6 }}
                style={[bookingStyles.modalInput, { borderWidth: 1, borderColor: '#DEE2E6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 }]}
              />

              <TouchableOpacity
                style={[
                  bookingStyles.modalConfirmButton,
                  bookingSubmitting && bookingStyles.modalConfirmButtonDisabled
                ]}
                onPress={handleBookingSubmit}
                disabled={bookingSubmitting}
              >
                {bookingSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={bookingStyles.modalConfirmButtonText}>Confirmar Agendamento</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={bookingStyles.modalCancelButton}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={bookingStyles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}