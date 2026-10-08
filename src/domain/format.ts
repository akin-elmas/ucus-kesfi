const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

const MONTHS_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

function toIstanbul(iso: string): Date {
  return new Date(Date.parse(iso) + ISTANBUL_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(iso: string): string {
  const d = toIstanbul(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = toIstanbul(iso);
  return `${d.getUTCDate()} ${MONTHS_TR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export function formatPrice(priceMinor: number): string {
  const lira = Math.floor(priceMinor / 100);
  const kurus = priceMinor % 100;
  const grouped = String(lira).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${grouped},${pad(kurus)} TL`;
}

export function formatBaggage(baggageKg: number | null): string {
  if (baggageKg === null) return 'Bagaj bilgisi yok';
  if (baggageKg === 0) return 'Bagaj dahil değil';
  return `${baggageKg} kg`;
}

export function formatStops(stops: 0 | 1): string {
  return stops === 0 ? 'Direkt' : 'Aktarmalı';
}

export function arrivesNextDay(departureIso: string, arrivalIso: string): boolean {
  return formatDate(departureIso) !== formatDate(arrivalIso);
}
