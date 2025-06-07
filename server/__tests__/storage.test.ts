import { describe, it, expect, beforeEach } from 'vitest';
import { MemStorage } from '../storage';

describe('MemStorage automations', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  it('creates and retrieves an automation', async () => {
    const automation = await storage.createAutomation({
      propertyCode: 'P1',
      olxCode: 'O1',
      status: 'pending'
    });

    expect(automation.id).toBeGreaterThan(0);
    const fetched = await storage.getAutomation(automation.id);
    expect(fetched).toEqual(automation);
  });

  it('returns automations sorted and limited', async () => {
    const a1 = await storage.createAutomation({ propertyCode: 'A1', olxCode: 'O1', status: 'pending' });
    const a2 = await storage.createAutomation({ propertyCode: 'A2', olxCode: 'O2', status: 'pending' });

    const all = await storage.getAutomations();
    expect(all[0].id).toBe(a2.id);
    expect(all[1].id).toBe(a1.id);

    const limited = await storage.getAutomations(1);
    expect(limited).toHaveLength(1);
    expect(limited[0].id).toBe(a2.id);
  });

  it('updates an automation', async () => {
    const auto = await storage.createAutomation({ propertyCode: 'A', olxCode: 'O', status: 'pending' });
    const updated = await storage.updateAutomation(auto.id, { status: 'completed', progress: 100 });
    expect(updated?.status).toBe('completed');
    expect(updated?.progress).toBe(100);

    const fetched = await storage.getAutomation(auto.id);
    expect(fetched?.status).toBe('completed');
  });

  it('deletes an automation', async () => {
    const auto = await storage.createAutomation({ propertyCode: 'A', olxCode: 'O', status: 'pending' });
    const removed = await storage.deleteAutomation(auto.id);
    expect(removed).toBe(true);
    const fetched = await storage.getAutomation(auto.id);
    expect(fetched).toBeUndefined();
  });
});
