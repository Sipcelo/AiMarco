import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { Toggle } from '../ui/Toggle';
import { createAvailability } from '../../services/onboarding.api';

interface DaySchedule {
  day: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
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
  { day: 'Segunda', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { day: 'Terca', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { day: 'Quarta', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { day: 'Quinta', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { day: 'Sexta', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { day: 'Sabado', isOpen: false, startTime: '09:00', endTime: '18:00' },
  { day: 'Domingo', isOpen: false, startTime: '09:00', endTime: '18:00' },
];

export function AvailabilitySetup({ onNext, onBack, professionalId, token, setGlobalLoading, setGlobalError }: AvailabilitySetupProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (index: number, isOpen: boolean) => {
    const next = [...schedule];
    next[index].isOpen = isOpen;
    setSchedule(next);
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const next = [...schedule];
    next[index][field] = value;
    setSchedule(next);
  };

  const dayToNumber = (day: string): number => {
    const map: Record<string, number> = {
      Domingo: 0,
      Segunda: 1,
      Terca: 2,
      Quarta: 3,
      Quinta: 4,
      Sexta: 5,
      Sabado: 6,
    };
    return map[day] || 0;
  };

  const handleSubmit = async () => {
    const openDays = schedule.filter((day) => day.isOpen);
    if (openDays.length === 0) {
      setError('Selecione pelo menos um dia da semana');
      setGlobalError('Selecione pelo menos um dia da semana');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setGlobalLoading(true);
    setGlobalError(null);

    try {
      await Promise.all(openDays.map((day) =>
        createAvailability(professionalId, token, {
          day_of_week: dayToNumber(day.day),
          start_time: day.startTime,
          end_time: day.endTime,
        }),
      ));

      setIsSubmitting(false);
      setGlobalLoading(false);
      onNext(schedule);
    } catch (err: any) {
      setIsSubmitting(false);
      setGlobalLoading(false);
      const message = err.message || 'Erro ao salvar disponibilidade';

      if (message.includes('401') || message.includes('unauthorized')) {
        setError('Sessao expirada');
        setGlobalError('Sessao expirada');
      } else if (message.includes('400') || message.includes('invalid')) {
        setError('Horarios invalidos');
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
          <p>Escolha os dias de atendimento para montar sua agenda publica.</p>
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
                <div className="flex items-center justify-between mb-3">
                  <span className="font-['Inter'] font-semibold text-[var(--auralynne-text)]">
                    {day.day}
                  </span>
                  <Toggle
                    checked={day.isOpen}
                    onChange={(checked) => handleToggle(index, checked)}
                    label={`Toggle ${day.day}`}
                  />
                </div>

                {day.isOpen ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                      className="flex-1 h-12 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-3 font-['Inter'] text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2"
                    />
                    <span className="text-[var(--auralynne-muted)] font-['Inter']">-</span>
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                      className="flex-1 h-12 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-3 font-['Inter'] text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2"
                    />
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
