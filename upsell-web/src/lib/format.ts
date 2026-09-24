import { format, formatDistanceToNowStrict, isThisYear, isToday } from "date-fns";

/**
 * Formatação de datas para apresentação.
 *
 * A base de dados guarda `timestamptz`; tudo o que é legível por humanos é
 * produzido aqui. Ver `supabase/migrations/20260813000002_timestamps_to_timestamptz.sql`.
 *
 * ⚠️ Estas funções dependem do fuso horário de quem as executa. O servidor
 * (tipicamente UTC) e o browser do utilizador produzem strings diferentes para
 * o mesmo instante, o que gera avisos de hidratação. Os elementos que as usam
 * têm de levar `suppressHydrationWarning`.
 */

/** Hora do relógio, 24h: "23:24" */
export function formatTime(value: Date | string): string {
  return format(new Date(value), "HH:mm");
}

/** Data curta: "15 Jan 2025" (ano omitido se for o corrente) */
export function formatDate(value: Date | string): string {
  const date = new Date(value);
  return format(date, isThisYear(date) ? "d MMM" : "d MMM yyyy");
}

/**
 * Carimbo para listas de conversas: hoje mostra a hora, caso contrário a data.
 * Mantém a coluna estreita sem perder informação.
 */
export function formatListTimestamp(value: Date | string): string {
  const date = new Date(value);
  return isToday(date) ? formatTime(date) : formatDate(date);
}

/**
 * Distância ao momento actual, com direcção: "in 6h", "2h ago".
 * Usado em follow-ups agendados e enviados.
 */
export function formatRelative(value: Date | string): string {
  const date = new Date(value);
  const distance = formatDistanceToNowStrict(date);
  return date.getTime() > Date.now() ? `in ${distance}` : `${distance} ago`;
}
