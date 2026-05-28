import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { updateProfile } from '../../services/onboarding.api';

interface ProfileSetupProps {
  onNext: (data: { fullName: string; displayName: string; businessType: string; phone: string; slug: string }) => void;
  onBack: () => void;
  professionalId: string;
  token: string;
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
}

export function ProfileSetup({ onNext, onBack, professionalId, token, setGlobalLoading, setGlobalError }: ProfileSetupProps) {
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFullName(value);

    if (!displayName || displayName === fullName.toLowerCase().replace(/\s+/g, '-')) {
      const auto = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setDisplayName(auto);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !displayName.trim() || !businessType || !phone.trim()) {
      setError('Preencha todos os campos obrigatorios');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setGlobalLoading(true);
      setGlobalError(null);
      const result = await updateProfile(professionalId, token, {
        display_name: displayName,
        bio: '',
        business_type: businessType as 'barbershop' | 'nails' | 'hair',
        phone: phone.trim(),
      });

      setIsLoading(false);
      setGlobalLoading(false);
      onNext({
        fullName: fullName.trim(),
        displayName: displayName.trim(),
        businessType,
        phone: phone.trim(),
        slug: result.slug,
      });
    } catch (err: any) {
      setIsLoading(false);
      setGlobalLoading(false);
      const message = err.message || 'Erro de conexao';

      if (message.includes('401') || message.includes('unauthorized')) {
        setError('Sessao expirada. Faca login novamente.');
        setGlobalError('Sessao expirada. Faca login novamente.');
      } else if (message.includes('400') || message.includes('invalid')) {
        setError('Dados invalidos. Verifique as informacoes.');
        setGlobalError('Dados invalidos');
      } else if (message.includes('409')) {
        setError('Email ou dados ja existem.');
        setGlobalError('Email ou dados ja existem');
      } else {
        setError('Erro de conexao. Tente novamente.');
        setGlobalError('Erro de conexao');
      }
    }
  };

  const isValid = fullName.trim().length >= 3 && displayName.trim() && businessType && phone.trim().length >= 14;

  return (
    <div className="auralynne-page">
      <main className="auralynne-auth-shell">
        <section className="auralynne-hero-copy">
          <img src="/img/0a9de795-2aa3-4b77-90eb-af8722986f81.png" alt="Logo Auralynne" className="auralynne-hero-logo" />
          <h1>Perfil da sua agenda</h1>
          <p>Configure como seu negocio aparece para clientes no link publico.</p>
        </section>

        <div className="auralynne-card p-7">
          <div className="text-center mb-6">
            <h2 className="auralynne-title auralynne-gradient-text text-2xl mb-1">
              Perfil profissional
            </h2>
            <p className="font-['Inter'] text-[var(--auralynne-muted)]">
              Conte sobre voce
            </p>
          </div>

          <div className="mb-6">
            <ProgressBar currentStep={2} totalSteps={5} />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Nome completo"
              type="text"
              value={fullName}
              onChange={handleFullNameChange}
              placeholder="Joao Silva"
            />

            <Input
              label="Nome publico"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="salao-da-joana"
            />

            <div className="w-full">
              <label className="block text-sm font-['Inter'] text-[var(--auralynne-muted)] mb-2">
                Tipo de negocio
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full h-14 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-4 font-['Inter'] text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2 focus:shadow-[0_0_0_5px_rgba(239,111,145,0.1)] transition-all"
              >
                <option value="">Selecione...</option>
                <option value="barbershop">Barbearia</option>
                <option value="hair">Cabeleireiro / Salao</option>
                <option value="nails">Manicure / Pedicure</option>
              </select>
            </div>

            <Input
              label="Telefone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              maxLength={15}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'SALVANDO...' : 'PROXIMO'}
            </Button>

            <button
              type="button"
              onClick={onBack}
              className="w-full text-center font-['Inter'] text-[var(--auralynne-primary)] underline hover:text-[var(--auralynne-primary-dark)]"
            >
              Voltar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
