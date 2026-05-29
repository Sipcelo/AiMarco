import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { Toggle } from '../ui/Toggle';
import { createAvailability } from '../../services/onboarding.api';

interface TimeWindow {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  day: string;
  isOpen: boolean;
  morning: TimeWindow;
  afternoon: TimeWindow;
}

interface AvailabilitySetupProps {
  onNext: (availability: DaySchedule[]) => void;
  onBack: () => void;
  professionalId: string;
  token: string;
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
}

const initialSchedule: DaySchedule[] = [
  { day: 'Segunda',  isOpen: true,  morning: { enabled: true, startTime: '08:00', endTime: '11:00' }, afternoon: { enabled: true, startTime: '14:00', endTime: '18:00' } },
  { day: 'Terca',    isOpen: true,  morning: { enabled: true, startTime: '08:00', endTime: '11:00' }, afternoon: { enabled: true, startTime: '14:00', endTime: '18:00' } },
  { day: 'Quarta',   isOpen: true,  morning: { enabled: true, startTime: '08:00', endTime: '11:00' }, afternoon: { enabled: true, startTime: '14:00', endTime: '18:00' } },
  { day: 'Quinta',   isOpen: true,  morning: { enabled: true, startTime: '08:00', endTime: '11:00' }, afternoon: { enabled: true, startTime: '14:00', endTime: '18:00' } },
  { day: 'Sexta',    isOpen: true,  morning: { enabled: true, startTime: '08:00', endTime: '11:00' }, afternoon: { enabled: true, startTime: '14:00', endTime: '18:00' } },
  { day: 'Sabado',   isOpen: true,  morning: { enabled: true, startTime: '08:00', endTime: '11:00' }, afternoon: { enabled: true, startTime: '14:00', endTime: '18:00' } },
  { day: 'Domingo',  isOpen: false, morning: { enabled: false, startTime: '08:00', endTime: '11:00' }, afternoon: { enabled: false, startTime: '14:00', endTime: '18:00' } },
];

const DAY_NUMBER: Record<string, number> = {
  Domingo: 0, Segunda: 1, Terca: 2, Quarta: 3, Quinta: 4, Sexta: 5, Sabado: 6,
};

export function AvailabilitySetup({ onNext, onBack, professionalId, token, setGlobalLoading, setGlobalError }: AvailabilitySetupProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (index: number, isOpen: boolean) => {
    const next = schedule.map((d, i) => i === index ? { ...d, isOpen } : d);
    setSchedule(next);
  };

  const togglePeriod = (index: number, period: 'morning' | 'afternoon', enabled: boolean) => {
    const next = schedule.map((d, i) =>
      i === index ? { ...d, [period]: { ...d[period], enabled } } : d
    );
    setSchedule(next);
  };

  const changeTime = (index: number, period: 'morning' | 'afternoon', field: 'startTime' | 'endTime', value: string) => {
    const next = schedule.map((d, i) =>
      i === index ? { ...d, [period]: { ...d[period], [field]: value } } : d
    );
    setSchedule(next);
  };

  const handleSubmit = async () => {
    const openDays = schedule.filter((d) => d.isOpen);
    if (openDays.length === 0) {
      const msg = 'Selecione pelo menos um dia da semana';
      setError(msg);
      setGlobalError(msg);
      return;
    }

    // Build batch payload — up to 2 rules per open day
    const rules = openDays.flatMap((day) => {
      const dayNum = DAY_NUMBER[day.day];
      const windows = [];
      if (day.morning.enabled) {
        windows.push({ day_of_week: dayNum, start_time: day.morning.startTime, end_time: day.morning.endTime, is_active: true });
      }
      if (day.afternoon.enabled) {
        windows.push({ day_of_week: dayNum, start_time: day.afternoon.startTime, end_time: day.afternoon.endTime, is_active: true });
      }
      return windows;
    });

    if (rules.length === 0) {
      const msg = 'Habilite pelo menos um periodo (manha ou tarde)';
      setError(msg);
      setGlobalError(msg);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setGlobalLoading(true);
    setGlobalError(null);

    try {
      await createAvailability(professionalId, token, rules);
      setIsSubmitting(false);
      setGlobalLoading(false);
      onNext(schedule);
    } catch (err: any) {
      setIsSubmitting(false);
      setGlobalLoading(false);
      const message = err.message || '';
      if (message.includes('401') || message.includes('unauthorized')) {
        setError('Sessao expirada');
        setGlobalError('Sessao expirada');
      } else if (message.includes('400') || message.includes('invalid') || message.includes('sobrepor')) {
        setError('Horarios invalidos ou sobrepostos');
        setGlobalError('Horarios invalidos');
      } else {
        setError('Erro de conexao. Tente novamente.');
        setGlobalError('Erro de conexao');
      }
    }
  };

  return (
    <div className="auralynne-page">
      <main className="auralynne-auth-shell">
        <section className="auralynne-hero-copy">
          <img src="/img/0a9de795-2aa3-4b77-90eb-af8722986f81.png" alt="Logo Auralynne" className="auralynne-hero-logo" />
          <h1>Defina seus horarios</h1>
          <p>Escolha os dias e turnos de atendimento para montar sua agenda publica.</p>
        </section>

        <div className="auralynne-card p-7 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6">
            <h2 className="auralynne-title auralynne-gradient-text text-2xl mb-1">
              Disponibilidade
            </h2>
            <p className="font-['Inter'] text-[var(--auralynne-muted)]">
              Quando voce atende?
            </p>
          </div>

          <div className="mb-6">
            <ProgressBar currentStep={4} totalSteps={5} />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {schedule.map((day, index) => (
              <div key={day.day} className="p-4 bg-[var(--auralynne-soft-pink)] rounded-xl border border-[var(--auralynne-border)]">
                {/* Day header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-['Inter'] font-semibold text-[var(--auralynne-text)]">
                    {day.day}
                  </span>
                  <Toggle
                    checked={day.isOpen}
                    onChange={(checked) => toggleDay(index, checked)}
                    label={`Toggle ${day.day}`}
                  />
                </div>

                {day.isOpen ? (
                  <div className="space-y-3">
                    {/* Morning period */}
                    <div className="flex items-center gap-2">
                      <span className="font-['Inter'] text-xs text-[var(--auralynne-muted)] w-14 shrink-0">Manhã</span>
                      <Toggle
                        checked={day.morning.enabled}
                        onChange={(checked) => togglePeriod(index, 'morning', checked)}
                        label={`Manha ${day.day}`}
                      />
                      {day.morning.enabled && (
                        <>
                          <input
                            type="time"
                            value={day.morning.startTime}
                            onChange={(e) => changeTime(index, 'morning', 'startTime', e.target.value)}
                            className="flex-1 h-10 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-2 font-['Inter'] text-sm text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2"
                          />
                          <span className="text-[var(--auralynne-muted)] font-['Inter'] text-sm">-</span>
                          <input
                            type="time"
                            value={day.morning.endTime}
                            onChange={(e) => changeTime(index, 'morning', 'endTime', e.target.value)}
                            className="flex-1 h-10 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-2 font-['Inter'] text-sm text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2"
                          />
                        </>
                      )}
                    </div>

                    {/* Afternoon period */}
                    <div className="flex items-center gap-2">
                      <span className="font-['Inter'] text-xs text-[var(--auralynne-muted)] w-14 shrink-0">Tarde</span>
                      <Toggle
                        checked={day.afternoon.enabled}
                        onChange={(checked) => togglePeriod(index, 'afternoon', checked)}
                        label={`Tarde ${day.day}`}
                      />
                      {day.afternoon.enabled && (
                        <>
                          <input
                            type="time"
                            value={day.afternoon.startTime}
                            onChange={(e) => changeTime(index, 'afternoon', 'startTime', e.target.value)}
                            className="flex-1 h-10 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-2 font-['Inter'] text-sm text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2"
                          />
                          <span className="text-[var(--auralynne-muted)] font-['Inter'] text-sm">-</span>
                          <input
                            type="time"
                            value={day.afternoon.endTime}
                            onChange={(e) => changeTime(index, 'afternoon', 'endTime', e.target.value)}
                            className="flex-1 h-10 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-2 font-['Inter'] text-sm text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[var(--auralynne-muted)] font-['Inter'] text-sm">
                    Fechado
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <Button type="button" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'SALVANDO...' : 'PROXIMO'}
            </Button>

            <button
              type="button"
              onClick={onBack}
              className="w-full text-center font-['Inter'] text-[var(--auralynne-primary)] underline hover:text-[var(--auralynne-primary-dark)]"
            >
              Voltar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
