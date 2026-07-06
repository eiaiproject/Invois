import { describe, it, expect, vi, afterEach } from 'vitest';
import { newId, dateISO, todayISO, addDaysISO, nowISO } from '../../src/types';

describe('newId', () => {
  it('returns a string', () => {
    expect(typeof newId()).toBe('string');
  });

  it('returns unique values', () => {
    const id1 = newId();
    const id2 = newId();
    expect(id1).not.toBe(id2);
  });

  it('returns a valid UUID format', () => {
    const id = newId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});

describe('dateISO', () => {
  it('formats a Date to YYYY-MM-DD', () => {
    const date = new Date(2026, 6, 4); // July 4, 2026
    expect(dateISO(date)).toBe('2026-07-04');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5); // January 5, 2026
    expect(dateISO(date)).toBe('2026-01-05');
  });

  it('handles last day of year', () => {
    const date = new Date(2026, 11, 31); // December 31, 2026
    expect(dateISO(date)).toBe('2026-12-31');
  });
});

describe('todayISO', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today\'s date', () => {
    const result = todayISO();
    const now = new Date();
    const expected = dateISO(now);
    expect(result).toBe(expected);
  });
});

describe('addDaysISO', () => {
  it('adds days to today by default', () => {
    const result = addDaysISO(7);
    const now = new Date();
    now.setDate(now.getDate() + 7);
    expect(result).toBe(dateISO(now));
  });

  it('adds days from a specific date', () => {
    const from = new Date(2026, 6, 4); // July 4
    const result = addDaysISO(7, from);
    expect(result).toBe('2026-07-11');
  });

  it('handles negative days', () => {
    const from = new Date(2026, 6, 10); // July 10
    const result = addDaysISO(-5, from);
    expect(result).toBe('2026-07-05');
  });

  it('handles zero days', () => {
    const from = new Date(2026, 6, 4);
    const result = addDaysISO(0, from);
    expect(result).toBe('2026-07-04');
  });

  it('handles crossing month boundaries', () => {
    const from = new Date(2026, 6, 28); // July 28
    const result = addDaysISO(5, from);
    expect(result).toBe('2026-08-02');
  });
});

describe('nowISO', () => {
  it('returns an ISO string', () => {
    const result = nowISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns current time', () => {
    const before = new Date().toISOString();
    const result = nowISO();
    const after = new Date().toISOString();
    expect(result >= before).toBe(true);
    expect(result <= after).toBe(true);
  });
});