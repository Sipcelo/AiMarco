import React, { useEffect, useState } from 'react';
import { CheckCircle, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Button } from '../ui/Button';

interface OnboardingCompleteProps {
  displayName: string;
}

export function OnboardingComplete({ displayName }: OnboardingCompleteProps) {
  const [copied, setCopied] = useState(false);
  const publicLink = `auralynne.com.br/p/${displayName}`;

  useEffect(() => {
    const duration = 2200;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 35 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        colors: ['#ef6f91', '#da5d7e', '#fff0f5', '#ffffff'],
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        colors: ['#ef6f91', '#da5d7e', '#fff0f5', '#ffffff'],
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${publicLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Auralynne - Agende comigo',
        text: `Agende comigo na Auralynne: https://${publicLink}`,
        url: `https://${publicLink}`,
      }).catch(handleCopy);
    } else {
      handleCopy();
    }
  };

  return (
    <div className="auralynne-page">
      <main className="auralynne-auth-shell">
        <section className="auralynne-hero-copy">
          <img src="/img/0a9de795-2aa3-4b77-90eb-af8722986f81.png" alt="Logo Auralynne" className="auralynne-hero-logo" />
          <h1>Tudo pronto!</h1>
          <p>Seu link publico esta pronto para receber novos agendamentos.</p>
        </section>

        <div className="auralynne-card p-7">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="flex justify-center mb-6"
            >
              <div className="bg-[var(--auralynne-primary)] rounded-full p-4 shadow-[0_10px_25px_rgba(233,75,106,0.28)]">
                <CheckCircle size={64} className="text-white" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="auralynne-title auralynne-gradient-text text-3xl mb-2"
            >
              Agenda configurada
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-['Inter'] text-[var(--auralynne-muted)]"
            >
              Agora seus clientes ja podem agendar.
            </motion.p>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <label className="block text-sm font-['Inter'] text-[var(--auralynne-muted)] mb-2">
              Seu link publico:
            </label>
            <div className="flex items-center gap-2 p-4 bg-[var(--auralynne-soft-pink)] rounded-xl border border-[var(--auralynne-border)]">
              <span className="flex-1 font-['Inter'] text-[var(--auralynne-primary)] truncate">
                {publicLink}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-2 bg-[var(--auralynne-primary)] text-white rounded-lg hover:bg-[var(--auralynne-primary-dark)] transition-colors text-sm font-['Inter'] font-bold"
                aria-label="Copiar link"
              >
                <Copy size={16} />
                {copied ? 'COPIADO' : 'COPIAR'}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <Button type="button" variant="secondary" className="w-full" onClick={handleShare}>
              COMPARTILHAR
            </Button>

            <Button type="button" className="w-full" onClick={() => window.location.href = '/agenda'}>
              IR PARA AGENDA
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
