import { config } from '../config.js';

/**
 * Dispara uma mensagem de WhatsApp via API externa (ex: Evolution API).
 * Implementa validação sanitizada do número de telefone.
 */
export async function sendWhatsAppMessage(phone: string, text: string) {
  // Limpeza do número de telefone (extrai apenas os dígitos numéricos)
  const cleanedPhone = phone.replace(/\D/g, '');

  if (!cleanedPhone) {
    throw new Error('Número de telefone inválido após sanitização.');
  }

  // Faz a requisição não bloqueante para o endpoint de destino listado no .env
  const response = await fetch(config.WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.WHATSAPP_API_KEY
    },
    body: JSON.stringify({
      number: cleanedPhone,
      text: text
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha na API WhatsApp (${response.status}): ${errorBody}`);
  }

  return response.json();
}
