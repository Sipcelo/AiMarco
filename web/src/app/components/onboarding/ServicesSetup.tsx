import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { ServiceCard } from '../ui/ServiceCard';
import { Input } from '../ui/Input';
import { createService, brlToCents } from '../../services/onboarding.api';

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface ServicesSetupProps {
  onNext: (services: Service[]) => void;
  onBack: () => void;
  professionalId: string;
  token: string;
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
}

export function ServicesSetup({ onNext, onBack, professionalId, token, setGlobalLoading, setGlobalError }: ServicesSetupProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [servicePrice, setServicePrice] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNewServiceModal = () => {
    setEditingService(null);
    setServiceName('');
    setServiceDuration('30');
    setServicePrice('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditServiceModal = (service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDuration(service.duration.toString());
    setServicePrice(service.price.toString());
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceName.trim() || !servicePrice) {
      setError('Preencha o nome e o preco do servico');
      return;
    }

    const duration = parseInt(serviceDuration, 10);
    if (duration < 15) {
      setError('A duracao minima e de 15 minutos');
      return;
    }

    const price = parseFloat(servicePrice);
    if (price <= 0) {
      setError('O preco deve ser maior que zero');
      return;
    }

    setIsAddingService(true);
    setError(null);

    try {
      setGlobalLoading(true);
      setGlobalError(null);
      const result = await createService(professionalId, token, {
        name: serviceName.trim(),
        duration_minutes: duration,
        price_cents: brlToCents(servicePrice),
      });

      const newService: Service = {
        id: result.id,
        name: result.name,
        duration,
        price,
      };

      setServices((current) => (
        editingService
          ? current.map((service) => service.id === editingService.id ? newService : service)
          : [...current, newService]
      ));

      setIsAddingService(false);
      setGlobalLoading(false);
      setIsModalOpen(false);
      setServiceName('');
      setServiceDuration('30');
      setServicePrice('');
    } catch (err: any) {
      setIsAddingService(false);
      setGlobalLoading(false);
      const message = err.message || 'Erro ao salvar servico';

      if (message.includes('401') || message.includes('unauthorized')) {
        setError('Sessao expirada');
        setGlobalError('Sessao expirada');
      } else if (message.includes('400') || message.includes('invalid')) {
        setError('Dados do servico invalidos');
        setGlobalError('Dados do servico invalidos');
      } else if (message.includes('409')) {
        setError('Servico ja cadastrado');
        setGlobalError('Servico ja cadastrado');
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
          <h1>Monte seus servicos</h1>
          <p>Defina o que pode ser agendado e quanto tempo cada atendimento leva.</p>
        </section>

        <div className="auralynne-card p-7 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6">
            <h2 className="auralynne-title auralynne-gradient-text text-2xl mb-1">
              Seus servicos
            </h2>
            <p className="font-['Inter'] text-[var(--auralynne-muted)]">
              Adicione os principais servicos
            </p>
          </div>

          <div className="mb-6">
            <ProgressBar currentStep={3} totalSteps={5} />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button type="button" variant="secondary" className="w-full" onClick={openNewServiceModal}>
              + Adicionar servico
            </Button>

            {services.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                duration={service.duration}
                price={service.price}
                onEdit={() => openEditServiceModal(service)}
                onDelete={() => setServices((current) => current.filter((item) => item.id !== service.id))}
              />
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <Button type="button" className="w-full" onClick={() => onNext(services)} disabled={services.length === 0}>
              PROXIMO
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="auralynne-card p-7">
            <div className="flex justify-between items-center mb-6">
              <h3 className="auralynne-title text-xl text-[var(--auralynne-text)]">
                {editingService ? 'Editar servico' : 'Adicionar servico'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--auralynne-muted)] hover:text-[var(--auralynne-text)]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome do servico"
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Ex: Corte de cabelo"
              />

              <div className="w-full">
                <label className="block text-sm font-['Inter'] text-[var(--auralynne-muted)] mb-2">
                  Duracao (minutos)
                </label>
                <select
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  className="w-full h-14 rounded-[10px] bg-white border border-[var(--auralynne-border)] px-4 font-['Inter'] text-[var(--auralynne-text)] focus:outline-none focus:border-[var(--auralynne-primary)] focus:border-2"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>

              <Input
                label="Preco (R$)"
                type="number"
                step="0.01"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                placeholder="50.00"
              />

              <Button
                type="button"
                className="w-full"
                onClick={handleSaveService}
                disabled={isAddingService || !serviceName || !servicePrice}
              >
                {isAddingService ? 'SALVANDO...' : 'SALVAR'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
