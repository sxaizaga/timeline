// src/telegram.ts
// Función para notificar a un bot de Telegram si se detecta una palabra prohibida

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

export async function notifyTelegram({ description, badWord, ip }: { description: string; badWord: string; ip: string }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  const text = `🚨 *Palabra prohibida detectada*\n\n*Palabra:* ${badWord}\n*Descripción:* ${description}\n*IP:* ${ip}`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });
}
