/**
 * Testes — Tela pública de booking por slug (app/[slug].tsx)
 *
 * Cobre os estados críticos do produto público:
 * - loading
 * - erro de API
 * - profissional não encontrado (resposta nula)
 * - render do perfil e serviços
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ProfessionalScreen from '../app/[slug]';
import * as Api from '../src/services/api';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ slug: 'john-doe' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

const professional = {
  id: 'p1',
  display_name: 'John Doe',
  bio: 'Bio sample',
  avatar_url: null,
  timezone: 'America/Sao_Paulo',
  slug: 'john-doe',
  business_type: 'barbershop' as const,
  services: [
    {
      id: 's1',
      name: 'Corte Masculino',
      duration_minutes: 30,
      price_cents: 5000,
      description: null,
      is_active: true,
    },
  ],
};

describe('ProfessionalScreen (booking público)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    // Evita chamadas de rede reais ao buscar horários após carregar o perfil
    jest.spyOn(Api, 'getPublicAvailability').mockResolvedValue([]);
  });

  it('renderiza o estado de loading', () => {
    jest
      .spyOn(Api, 'getProfessionalBySlug')
      .mockImplementation(() => new Promise(() => {}));

    const { getByTestId } = render(<ProfessionalScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renderiza o estado de erro quando a API falha', async () => {
    jest
      .spyOn(Api, 'getProfessionalBySlug')
      .mockRejectedValue(new Error('API falhou'));

    const { findByText } = render(<ProfessionalScreen />);
    expect(await findByText(/API falhou/i)).toBeTruthy();
  });

  it('renderiza "não encontrado" quando a API retorna nulo', async () => {
    jest.spyOn(Api, 'getProfessionalBySlug').mockResolvedValue(null as any);

    const { findByText } = render(<ProfessionalScreen />);
    expect(await findByText(/Profissional não encontrado/i)).toBeTruthy();
  });

  it('renderiza o perfil e os serviços quando há dados', async () => {
    jest
      .spyOn(Api, 'getProfessionalBySlug')
      .mockResolvedValue(professional as any);

    const { findByText } = render(<ProfessionalScreen />);
    expect(await findByText(/John Doe/i)).toBeTruthy();
    expect(await findByText(/Corte Masculino/i)).toBeTruthy();
  });
});
