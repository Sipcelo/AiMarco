import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { signUp } from '../../services/onboarding.api';

interface SignUpProps {
  onNext: (data: { email: string; password: string; token: string; professionalId: string }) => void;
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
}

export function SignUp({ onNext, setGlobalLoading, setGlobalError }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validatePassword = (value: string) => (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(value)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { email?: string; password?: string } = {};

    if (!validateEmail(email)) {
      newErrors.email = 'Email invalido';
    }

    if (!validatePassword(password)) {
      newErrors.password = 'Senha deve ter 8+ caracteres, 1 maiuscula, 1 numero e caractere especial';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      setGlobalLoading(true);
      setGlobalError(null);
      const displayName = email.split('@')[0] || 'usuario';
      const defaultPhone = '11999999999';
      const defaultBusiness = 'barbershop';
      const result = await signUp(email, password, displayName, defaultPhone, defaultBusiness);
      setIsLoading(false);
      setGlobalLoading(false);
      const professionalId = result.user?.id || result.professional?.id || result.professionalId;
      onNext({ email, password, token: result.token, professionalId });
    } catch (error: any) {
      setIsLoading(false);
      setGlobalLoading(false);
      const message = error.message || 'Erro de conexao';

      if (message.includes('401') || message.includes('unauthorized')) {
        setErrors({ password: 'Sessao expirada' });
        setGlobalError('Sessao expirada. Faca login novamente.');
      } else if (message.includes('409') || message.includes('already exists')) {
        setErrors({ email: 'Email ja cadastrado' });
        setGlobalError('Email ja cadastrado');
      } else if (message.includes('400') || message.includes('invalid')) {
        setErrors({ email: 'Dados invalidos' });
        setGlobalError('Dados invalidos');
      } else {
        setErrors({ email: 'Erro de conexao. Tente novamente.' });
        setGlobalError('Erro de conexao');
      }
    }
  };

  const isValid = email && password && validateEmail(email) && validatePassword(password);

  return (
    <div className="auralynne-page">
      <main className="auralynne-auth-shell">
        <section className="auralynne-hero-copy">
          <img src="/img/0a9de795-2aa3-4b77-90eb-af8722986f81.png" alt="Logo Auralynne" className="auralynne-hero-logo" />
          <h1>Crie sua conta na Auralynne</h1>
          <p>Cadastre-se para organizar horarios e acompanhar seus atendimentos.</p>
        </section>

        <div className="auralynne-card p-7">
          <div className="text-center mb-8">
            <h1 className="auralynne-title auralynne-gradient-text text-3xl mb-2">
              Auralynne
            </h1>
            <h2 className="font-['Inter'] font-semibold text-xl text-[var(--auralynne-text)] mb-1">
              Crie sua conta
            </h2>
            <p className="font-['Inter'] text-[var(--auralynne-muted)]">
              Seu negocio merece uma agenda simples e bonita
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              error={errors.email}
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              error={errors.password}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'CRIANDO...' : 'CRIAR CONTA'}
            </Button>

            <button
              type="button"
              className="w-full text-center font-['Inter'] text-[var(--auralynne-primary)] underline hover:text-[var(--auralynne-primary-dark)]"
            >
              Ja tem conta? Faca login
            </button>
          </form>

          <div className="mt-8">
            <ProgressBar currentStep={1} totalSteps={5} />
          </div>
        </div>
      </main>
    </div>
  );
}
