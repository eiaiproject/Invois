import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/db', () => ({
  SAMPLE_ID_PREFIX: 'sample-',
  isDBEmpty: vi.fn(async () => true),
  isSampleDataRemoved: vi.fn(async () => false),
  saveClient: vi.fn(async () => {}),
  saveItem: vi.fn(async () => {}),
  saveInvoice: vi.fn(async () => {}),
  saveReceipt: vi.fn(async () => {}),
  nextNumber: vi.fn(async () => 'INV-2026-01-0001'),
}));

describe('seedOnce', () => {
  it('seeds sample records at most once when called concurrently (StrictMode / multi-tab)', async () => {
    const db = await import('../../src/lib/db');
    const { seedOnce } = await import('../../src/lib/seed');

    await Promise.all([seedOnce(), seedOnce(), seedOnce()]);

    expect(vi.mocked(db.isDBEmpty)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.saveClient)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(db.saveItem)).toHaveBeenCalledTimes(4);
    expect(vi.mocked(db.saveInvoice)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.saveReceipt)).toHaveBeenCalledTimes(1);
  });

  it('skips seeding when the database already has data', async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const db = await import('../../src/lib/db');
    vi.mocked(db.isDBEmpty).mockResolvedValue(false);
    const { seedOnce } = await import('../../src/lib/seed');

    await seedOnce();

    expect(vi.mocked(db.isDBEmpty)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.saveClient)).not.toHaveBeenCalled();
  });
});
