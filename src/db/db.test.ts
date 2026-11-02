import { afterEach, describe, expect, it } from 'vitest';
import { PrimeDB } from './db';

describe('PrimeDB', () => {
  let db: PrimeDB | undefined;
  afterEach(async () => {
    await db?.delete();
  });

  it('opens at the latest schema and stores settings', async () => {
    db = new PrimeDB('prime-test');
    await db.settings.put({ key: 'k', value: 42, updatedAt: 0 });
    expect((await db.settings.get('k'))?.value).toBe(42);
    expect(db.verno).toBe(1);
  });
});
