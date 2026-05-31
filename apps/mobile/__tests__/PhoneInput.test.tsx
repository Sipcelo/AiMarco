/**
 * Testes Unitários — PhoneInput Component
 *
 * Objetivo: Validar máscara visual e normalização E.164 (BR).
 *
 * Cenários:
 * - Entrada com máscara: (11) 99999-8888 → +5511999998888
 * - Entrada sem máscara: 11999998888 → +5511999998888
 * - Suporte a fixo (10 dígitos): 1133334444 → +551133334444
 * - Limpeza automática de caracteres não numéricos
 * - Placeholder, erro, label e indicador required
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PhoneInput from '../src/components/PhoneInput';

describe('PhoneInput Component', () => {
  it('mantém apenas o DDD enquanto incompleto', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PhoneInput value="" onChangeText={onChangeText} testID="phone-input" />
    );

    fireEvent.changeText(getByTestId('phone-input'), '11');
    expect(onChangeText).toHaveBeenLastCalledWith('11');
  });

  it('normaliza celular completo para E.164', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PhoneInput value="" onChangeText={onChangeText} testID="phone-input" />
    );

    fireEvent.changeText(getByTestId('phone-input'), '11999998888');
    expect(onChangeText).toHaveBeenLastCalledWith('+5511999998888');
  });

  it('normaliza telefone fixo (10 dígitos) para E.164', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PhoneInput value="" onChangeText={onChangeText} testID="phone-input" />
    );

    fireEvent.changeText(getByTestId('phone-input'), '1133334444');
    expect(onChangeText).toHaveBeenLastCalledWith('+551133334444');
  });

  it('remove caracteres não-numéricos automaticamente', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <PhoneInput value="" onChangeText={onChangeText} testID="phone-input" />
    );

    fireEvent.changeText(getByTestId('phone-input'), '(11) 99999-8888');
    expect(onChangeText).toHaveBeenLastCalledWith('+5511999998888');
  });

  it('mostra o placeholder padrão', () => {
    const { getByPlaceholderText } = render(
      <PhoneInput value="" onChangeText={() => {}} placeholder="(11) 99999-9999" />
    );

    expect(getByPlaceholderText('(11) 99999-9999')).toBeTruthy();
  });

  it('exibe mensagem de erro quando a prop error é fornecida', () => {
    const { getByText } = render(
      <PhoneInput value="" onChangeText={() => {}} error="Telefone inválido" />
    );

    expect(getByText('Telefone inválido')).toBeTruthy();
  });

  it('não exibe erro quando error é undefined', () => {
    const { queryByText } = render(
      <PhoneInput value="" onChangeText={() => {}} />
    );

    expect(queryByText('Telefone inválido')).toBeNull();
  });

  it('renderiza label e indicador required', () => {
    const { getByText } = render(
      <PhoneInput value="" onChangeText={() => {}} label="Telefone" required />
    );

    expect(getByText(/Telefone/)).toBeTruthy();
    expect(getByText(/\*/)).toBeTruthy();
  });

  it('não mostra asterisco quando não required', () => {
    const { queryByText } = render(
      <PhoneInput value="" onChangeText={() => {}} label="Telefone" />
    );

    expect(queryByText(/\*/)).toBeNull();
  });
});
