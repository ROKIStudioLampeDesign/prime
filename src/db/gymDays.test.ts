import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LocalDate } from '../domain/date';
import { PrimeDB } from './db';
import { getGymDay, setGymDay, setRestDay } from './gymDays';

const day = '2026-11-04' as LocalDate;
let n = 0;
let db: PrimeDB;
beforeEach(() => {
  db = new PrimeDB(`prime-gymdays-${++n}`);
});
afterEach(async () => {
  await db.delete();
});

describe('rest days', () => {
  it('marks and unmarks a rest day', async () => {
    await setRestDay(day, true, db);
    expect(await getGymDay(day, db)).toEqual({ date: day, attended: false, rest: true });
    await setRestDay(day, false, db);
    expect(await getGymDay(day, db)).toEqual({ date: day, attended: false });
  });

  it('keeps rest and manual attendance exclusive', async () => {
    await setGymDay(day, true, db);
    await setRestDay(day, true, db);
    expect(await getGymDay(day, db)).toMatchObject({ attended: false, rest: true });
    await setGymDay(day, true, db);
    expect(await getGymDay(day, db)).toEqual({ date: day, attended: true });
  });
});
