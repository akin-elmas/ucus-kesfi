import {
  arrivesNextDay,
  formatBaggage,
  formatDate,
  formatDuration,
  formatPrice,
  formatStops,
  formatTime,
} from '../src/domain/format';
import flightsJson from '../case-kit/flights.json';
import type { FlightDto } from '../src/api/flight.types';

const flights = flightsJson as FlightDto[];
const byId = (id: string) => {
  const f = flights.find(x => x.id === id);
  if (!f) throw new Error(`fixture yok: ${id}`);
  return f;
};

describe('formatPrice (kuruş -> TL)', () => {
  it.each([
    [355000, '3.550,00 TL'],
    [189900, '1.899,00 TL'],
    [134950, '1.349,50 TL'],
    [99900, '999,00 TL'],
    [5, '0,05 TL'],
    [123456789, '1.234.567,89 TL'],
  ])('%i -> %s', (minor, expected) => {
    expect(formatPrice(minor)).toBe(expected);
  });
});

describe('formatBaggage', () => {
  it('0 kg -> "Bagaj dahil değil"', () => {
    expect(formatBaggage(0)).toBe('Bagaj dahil değil');
  });
  it('null -> "Bagaj bilgisi yok"', () => {
    expect(formatBaggage(null)).toBe('Bagaj bilgisi yok');
  });
  it('20 -> "20 kg"', () => {
    expect(formatBaggage(20)).toBe('20 kg');
  });
});

describe('formatTime / formatDate (Europe/Istanbul, cihaz saat diliminden bağımsız)', () => {
  it('FL001 kalkış/varış saat ve tarihi', () => {
    const f = byId('FL001');
    expect(formatTime(f.departureAt)).toBe('06:15');
    expect(formatTime(f.arrivalAt)).toBe('07:25');
    expect(formatDate(f.departureAt)).toBe('15 Ekim 2026');
    expect(arrivesNextDay(f.departureAt, f.arrivalAt)).toBe(false);
  });

  it('FL024 gece yarısını geçer: varış 16 Ekim 2026, ertesi gün işaretli', () => {
    const f = byId('FL024');
    expect(formatTime(f.departureAt)).toBe('23:20');
    expect(formatTime(f.arrivalAt)).toBe('00:45');
    expect(formatDate(f.departureAt)).toBe('15 Ekim 2026');
    expect(formatDate(f.arrivalAt)).toBe('16 Ekim 2026');
    expect(arrivesNextDay(f.departureAt, f.arrivalAt)).toBe(true);
  });

  it('UTC (Z) ile verilen an İstanbul saatine çevrilir', () => {
    expect(formatTime('2026-10-15T21:30:00Z')).toBe('00:30');
    expect(formatDate('2026-10-15T21:30:00Z')).toBe('16 Ekim 2026');
  });

  it('veri setindeki yalnızca FL024 ertesi güne sarkar', () => {
    const nextDay = flights.filter(f => arrivesNextDay(f.departureAt, f.arrivalAt)).map(f => f.id);
    expect(nextDay).toEqual(['FL024']);
  });
});

describe('formatDuration', () => {
  it.each([
    [70, '1 sa 10 dk'],
    [45, '45 dk'],
    [120, '2 sa'],
    [85, '1 sa 25 dk'],
    [0, '0 dk'],
  ])('%i dk -> %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe('formatStops', () => {
  it('0 -> Direkt, 1 -> Aktarmalı', () => {
    expect(formatStops(0)).toBe('Direkt');
    expect(formatStops(1)).toBe('Aktarmalı');
  });
});
