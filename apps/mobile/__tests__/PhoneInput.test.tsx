/**
 * Testes Unitários — PhoneInput Component
 *
 * Objetivo: Validar máscara visual e normalização E.164.
 *
 * Cenários:
 * - Entrada com máscara: (11) 99999-9999 → +5511999999999
 * - Entrada sem máscara: 11999999999 → +5511999999999
 * - Suporte a fixo: (11) 3333-4444 → +551133334444
 * - Limpeza automática de caracteres não numéricos
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PhoneInput from '../src/components/PhoneInput';

describe('PhoneInput Component', () => {

  it('deve aplicar máscara de celular ao digitar', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <PhoneInput value="" onChange={onChange} testID="phone-input" />
    );

    const input = getByTestId('phone-input');

    // Digitar 11 (DDD)
    fireEvent.changeText(input, '11');
    expect(onChange).toHaveBeenCalledWith('11');

    // Continuar digitando número
    fireEvent.changeText(input, '1199999999');
    // Deve ter formatado para (11) 99999-9999? Na implementação, o componente
    // mostra o valor formatado visualmente mas envia E.164 no onChange.
    // Vamos verificar a última chamada:
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toBe('+5511999999999'); // E.164 esperado
  });

  it('deve formatar para fixo (8 dígitos)', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <PhoneInput value="" onChange={onChange} testID="phone-input" />
    );

    const input = getByTestId('phone-input');
    fireEvent.changeText(input, '1133334444');

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toBe('+551133334444');
  });

  it('deve remover caracteres não-numéricos automaticamente', () => {
    const onChange = vi.fn();
    const { getByTestId } = render(
      <PhoneInput value="" onChange={onChange} testID="phone-input" />
    );

    const input = getByTestId('phone-input');
    fireEvent.changeText(input, '(11) 99999-9999');

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall).toBe('+5511999999999');
  });

  it('deve mostrar placeholder padrão', () => {
    const { getByPlaceholderText } = render(
      <PhoneInput value="" onChange={() => {}} placeholder="(11) 99999-9999" />
    );

    expect(getByPlaceholderText('(11) 99999-9999')).toBeTruthy();
  });

  it('deve exibir mensagem de erro quando error prop é fornecido', () => {
    const { getByText } = render(
      <PhoneInput value="" onChange={() => {}} error="Telefone inválido" />
    );

    expect(getByText('Telefone inválido')).toBeTruthy();
  });

  it('não deve exibir erro se error for undefined', () => {
    const { queryByText } = render(
      <PhoneInput value="" onChange={() => {}} />
    );

    expect(queryByText('Telefone inválido')).toBeNull();
  });

  it('deve renderizar com label e indicador required', () => {
    const { getByText } = render(
      <PhoneInput value="" onChange={() => {}} label="Telefone" required />
    );

    expect(getByText('Telefone')).toBeTruthy();
    expect(getByText('*')).toBeTruthy();
  });

  it('não deve mostrar asterisco se não required', () => {
    const { queryByText } = render(
      <PhoneInput value="" onChange={() => {}} label="Telefone" />
    );

    expect(queryByText('*')).toBeNull();
  });

});
