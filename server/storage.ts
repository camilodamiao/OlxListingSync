import {
  automations,
  brokers,
  olxCodes,
  systemLogs,
  settings,
  type Automation,
  type InsertAutomation,
  type Broker,
  type InsertBroker,
  type OlxCode,
  type InsertOlxCode,
  type SystemLog,
  type InsertSystemLog,
  type Settings,
  type InsertSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Automations
  getAutomation(id: number): Promise<Automation | undefined>;
  getAutomations(limit?: number): Promise<Automation[]>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: number, updates: Partial<Automation>): Promise<Automation | undefined>;
  deleteAutomation(id: number): Promise<boolean>;

  // Brokers
  getBroker(id: number): Promise<Broker | undefined>;
  getBrokers(): Promise<Broker[]>;
  createBroker(broker: InsertBroker): Promise<Broker>;
  updateBroker(id: number, updates: Partial<Broker>): Promise<Broker | undefined>;
  deleteBroker(id: number): Promise<boolean>;

  // OLX Codes
  getOlxCode(id: number): Promise<OlxCode | undefined>;
  getOlxCodes(brokerId?: number): Promise<OlxCode[]>;
  getOlxCodeByCode(code: string): Promise<OlxCode | undefined>;
  getAvailableOlxCodes(brokerId: number): Promise<OlxCode[]>;
  getHighlightedCodes(brokerId: number): Promise<OlxCode[]>;
  createOlxCode(olxCode: InsertOlxCode): Promise<OlxCode>;
  updateOlxCode(id: number, updates: Partial<OlxCode>): Promise<OlxCode | undefined>;
  deleteOlxCode(id: number): Promise<boolean>;
  bulkCreateOlxCodes(brokerId: number, codes: string[]): Promise<OlxCode[]>;

  // System Logs
  getSystemLog(id: number): Promise<SystemLog | undefined>;
  getSystemLogs(limit?: number, level?: string): Promise<SystemLog[]>;
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  deleteSystemLogs(olderThan?: Date): Promise<number>;

  // Settings
  getSetting(key: string): Promise<Settings | undefined>;
  getSettings(): Promise<Settings[]>;
  setSetting(setting: InsertSettings): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private automations: Map<number, Automation>;
  private brokers: Map<number, Broker>;
  private olxCodes: Map<number, OlxCode>;
  private systemLogs: Map<number, SystemLog>;
  private settings: Map<string, Settings>;
  private currentAutomationId: number;
  private currentBrokerId: number;
  private currentOlxCodeId: number;
  private currentLogId: number;
  private currentSettingId: number;

  constructor() {
    this.automations = new Map();
    this.brokers = new Map();
    this.olxCodes = new Map();
    this.systemLogs = new Map();
    this.settings = new Map();
    this.currentAutomationId = 1;
    this.currentBrokerId = 1;
    this.currentOlxCodeId = 1;
    this.currentLogId = 1;
    this.currentSettingId = 1;

    // Initialize with default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create the main broker (you)
    const mainBroker: Broker = {
      id: this.currentBrokerId++,
      name: "Corretor Principal",
      email: "corretor@example.com",
      isActive: true,
      createdAt: new Date(),
    };
    this.brokers.set(mainBroker.id, mainBroker);

    // Your 40 OLX codes
    const yourOlxCodes = [
      "HA00011", "HA00012", "HA00013", "HA00014", "HA00015", "HA00016", "HA00017", "HA00018", "HA00019", "HA00020",
      "HA00021", "HA00022", "HA00023", "HA00024", "HA00025", "HA00026", "HA00040", "HA00041", "HA00042", "HA00043",
      "HA00044", "HA00045", "HA00046", "HA00047", "HA00048", "HA00049", "HA00050", "HA00051", "HA00052", "HA00053",
      "HA00054", "HA00055", "HA00056", "HA00057", "HA00058", "HA00059", "PT01237", "PT01478", "PT01479", "PT01480"
    ];

    yourOlxCodes.forEach((code) => {
      const olxCode: OlxCode = {
        id: this.currentOlxCodeId++,
        code: code,
        brokerId: mainBroker.id,
        isUsed: false,
        isHighlighted: false,
        isActive: true,
        currentAutomationId: null,
        univenCode: null,
        createdAt: new Date(),
      };
      this.olxCodes.set(olxCode.id, olxCode);
    });

    // Initialize default settings
    const defaultSettings = [
      { key: "autoRetry", value: true },
      { key: "downloadPhotos", value: true },
      { key: "notifications", value: false },
      { key: "actionDelay", value: 3 },
      { key: "browserType", value: "chrome" },
      { key: "headless", value: false },
    ];

    defaultSettings.forEach((settingData) => {
      const setting: Settings = {
        id: this.currentSettingId++,
        key: settingData.key,
        value: settingData.value,
        updatedAt: new Date(),
      };
      this.settings.set(settingData.key, setting);
    });
  }

  // Brokers
  async getBroker(id: number): Promise<Broker | undefined> {
    return this.brokers.get(id);
  }

  async getBrokers(): Promise<Broker[]> {
    return Array.from(this.brokers.values()).filter(broker => broker.isActive);
  }

  async createBroker(insertBroker: InsertBroker): Promise<Broker> {
    const broker: Broker = {
      ...insertBroker,
      id: this.currentBrokerId++,
      email: insertBroker.email ?? null,
      isActive: insertBroker.isActive ?? true,
      createdAt: new Date(),
    };
    this.brokers.set(broker.id, broker);
    return broker;
  }

  async updateBroker(id: number, updates: Partial<Broker>): Promise<Broker | undefined> {
    const broker = this.brokers.get(id);
    if (!broker) return undefined;

    const updatedBroker = { ...broker, ...updates };
    this.brokers.set(id, updatedBroker);
    return updatedBroker;
  }

  async deleteBroker(id: number): Promise<boolean> {
    return this.brokers.delete(id);
  }

  // Automations
  async getAutomation(id: number): Promise<Automation | undefined> {
    return this.automations.get(id);
  }

  async getAutomations(limit?: number): Promise<Automation[]> {
    const automations = Array.from(this.automations.values()).sort(
      (a, b) => b.createdAt!.getTime() - a.createdAt!.getTime()
    );
    return limit ? automations.slice(0, limit) : automations;
  }

  async createAutomation(insertAutomation: InsertAutomation): Promise<Automation> {
    const automation: Automation = {
      ...insertAutomation,
      id: this.currentAutomationId++,
      progress: insertAutomation.progress ?? 0,
      currentStep: insertAutomation.currentStep ?? null,
      videoUrl: insertAutomation.videoUrl ?? null,
      tourUrl: insertAutomation.tourUrl ?? null,
      propertyData: insertAutomation.propertyData ?? null,
      errorMessage: insertAutomation.errorMessage ?? null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.automations.set(automation.id, automation);
    return automation;
  }

  async updateAutomation(id: number, updates: Partial<Automation>): Promise<Automation | undefined> {
    const automation = this.automations.get(id);
    if (!automation) return undefined;

    const updatedAutomation = { ...automation, ...updates };
    this.automations.set(id, updatedAutomation);
    return updatedAutomation;
  }

  async deleteAutomation(id: number): Promise<boolean> {
    return this.automations.delete(id);
  }

  // OLX Codes
  async getOlxCode(id: number): Promise<OlxCode | undefined> {
    return this.olxCodes.get(id);
  }

  async getOlxCodes(brokerId?: number): Promise<OlxCode[]> {
    let codes = Array.from(this.olxCodes.values()).filter(code => code.isActive);
    if (brokerId) {
      codes = codes.filter(code => code.brokerId === brokerId);
    }
    return codes;
  }

  async getOlxCodeByCode(code: string): Promise<OlxCode | undefined> {
    return Array.from(this.olxCodes.values()).find(olxCode => olxCode.code === code);
  }

  async getAvailableOlxCodes(brokerId: number): Promise<OlxCode[]> {
    return Array.from(this.olxCodes.values()).filter(code => 
      code.brokerId === brokerId && code.isActive && !code.isUsed
    );
  }

  async getHighlightedCodes(brokerId: number): Promise<OlxCode[]> {
    return Array.from(this.olxCodes.values()).filter(code => 
      code.brokerId === brokerId && code.isActive && code.isHighlighted
    );
  }

  async createOlxCode(insertOlxCode: InsertOlxCode): Promise<OlxCode> {
    const olxCode: OlxCode = {
      ...insertOlxCode,
      id: this.currentOlxCodeId++,
      brokerId: insertOlxCode.brokerId ?? null,
      isUsed: insertOlxCode.isUsed ?? false,
      isHighlighted: insertOlxCode.isHighlighted ?? false,
      isActive: insertOlxCode.isActive ?? true,
      currentAutomationId: insertOlxCode.currentAutomationId ?? null,
      univenCode: insertOlxCode.univenCode ?? null,
      createdAt: new Date(),
    };
    this.olxCodes.set(olxCode.id, olxCode);
    return olxCode;
  }

  async bulkCreateOlxCodes(brokerId: number, codes: string[]): Promise<OlxCode[]> {
    const createdCodes: OlxCode[] = [];
    
    for (const code of codes) {
      const olxCode: OlxCode = {
        id: this.currentOlxCodeId++,
        code: code,
        brokerId: brokerId,
        isUsed: false,
        isHighlighted: false,
        isActive: true,
        currentAutomationId: null,
        univenCode: null,
        createdAt: new Date(),
      };
      this.olxCodes.set(olxCode.id, olxCode);
      createdCodes.push(olxCode);
    }
    
    return createdCodes;
  }

  async updateOlxCode(id: number, updates: Partial<OlxCode>): Promise<OlxCode | undefined> {
    const olxCode = this.olxCodes.get(id);
    if (!olxCode) return undefined;

    const updatedOlxCode = { ...olxCode, ...updates };
    this.olxCodes.set(id, updatedOlxCode);
    return updatedOlxCode;
  }

  async deleteOlxCode(id: number): Promise<boolean> {
    return this.olxCodes.delete(id);
  }

  // System Logs
  async getSystemLog(id: number): Promise<SystemLog | undefined> {
    return this.systemLogs.get(id);
  }

  async getSystemLogs(limit?: number, level?: string): Promise<SystemLog[]> {
    let logs = Array.from(this.systemLogs.values());
    
    if (level && level !== "all") {
      logs = logs.filter(log => log.level === level);
    }

    logs.sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
    return limit ? logs.slice(0, limit) : logs;
  }

  async createSystemLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const log: SystemLog = {
      ...insertLog,
      id: this.currentLogId++,
      automationId: insertLog.automationId ?? null,
      metadata: insertLog.metadata ?? null,
      timestamp: new Date(),
    };
    this.systemLogs.set(log.id, log);
    return log;
  }

  async deleteSystemLogs(olderThan?: Date): Promise<number> {
    if (!olderThan) {
      const count = this.systemLogs.size;
      this.systemLogs.clear();
      return count;
    }

    let deleteCount = 0;
    const logsToDelete: number[] = [];
    
    this.systemLogs.forEach((log, id) => {
      if (log.timestamp! < olderThan) {
        logsToDelete.push(id);
      }
    });

    logsToDelete.forEach(id => {
      this.systemLogs.delete(id);
      deleteCount++;
    });

    return deleteCount;
  }

  // Settings
  async getSetting(key: string): Promise<Settings | undefined> {
    return this.settings.get(key);
  }

  async getSettings(): Promise<Settings[]> {
    return Array.from(this.settings.values());
  }

  async setSetting(insertSetting: InsertSettings): Promise<Settings> {
    const existing = this.settings.get(insertSetting.key);
    const setting: Settings = {
      id: existing?.id || this.currentSettingId++,
      key: insertSetting.key,
      value: insertSetting.value,
      updatedAt: new Date(),
    };
    this.settings.set(setting.key, setting);
    return setting;
  }
}

// DatabaseStorage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  async getBroker(id: number): Promise<Broker | undefined> {
    const [broker] = await db.select().from(brokers).where(eq(brokers.id, id));
    return broker || undefined;
  }

  async getBrokers(): Promise<Broker[]> {
    return await db.select().from(brokers).where(eq(brokers.isActive, true));
  }

  async createBroker(insertBroker: InsertBroker): Promise<Broker> {
    const [broker] = await db
      .insert(brokers)
      .values(insertBroker)
      .returning();
    return broker;
  }

  async updateBroker(id: number, updates: Partial<Broker>): Promise<Broker | undefined> {
    const [broker] = await db
      .update(brokers)
      .set(updates)
      .where(eq(brokers.id, id))
      .returning();
    return broker || undefined;
  }

  async deleteBroker(id: number): Promise<boolean> {
    const result = await db.delete(brokers).where(eq(brokers.id, id));
    return result.rowCount > 0;
  }

  async getAutomation(id: number): Promise<Automation | undefined> {
    const [automation] = await db.select().from(automations).where(eq(automations.id, id));
    return automation || undefined;
  }

  async getAutomations(limit?: number): Promise<Automation[]> {
    let query = db.select().from(automations).orderBy(automations.createdAt);
    if (limit) {
      query = query.limit(limit);
    }
    return await query;
  }

  async createAutomation(insertAutomation: InsertAutomation): Promise<Automation> {
    const [automation] = await db
      .insert(automations)
      .values(insertAutomation)
      .returning();
    return automation;
  }

  async updateAutomation(id: number, updates: Partial<Automation>): Promise<Automation | undefined> {
    const [automation] = await db
      .update(automations)
      .set(updates)
      .where(eq(automations.id, id))
      .returning();
    return automation || undefined;
  }

  async deleteAutomation(id: number): Promise<boolean> {
    const result = await db.delete(automations).where(eq(automations.id, id));
    return result.rowCount > 0;
  }

  async getOlxCode(id: number): Promise<OlxCode | undefined> {
    const [olxCode] = await db.select().from(olxCodes).where(eq(olxCodes.id, id));
    return olxCode || undefined;
  }

  async getOlxCodes(brokerId?: number): Promise<OlxCode[]> {
    let query = db.select().from(olxCodes).where(eq(olxCodes.isActive, true));
    if (brokerId) {
      query = query.where(eq(olxCodes.brokerId, brokerId));
    }
    return await query;
  }

  async getOlxCodeByCode(code: string): Promise<OlxCode | undefined> {
    const [olxCode] = await db.select().from(olxCodes).where(eq(olxCodes.code, code));
    return olxCode || undefined;
  }

  async getAvailableOlxCodes(brokerId: number): Promise<OlxCode[]> {
    return await db.select().from(olxCodes)
      .where(eq(olxCodes.brokerId, brokerId))
      .where(eq(olxCodes.isActive, true))
      .where(eq(olxCodes.isUsed, false));
  }

  async getHighlightedCodes(brokerId: number): Promise<OlxCode[]> {
    return await db.select().from(olxCodes)
      .where(eq(olxCodes.brokerId, brokerId))
      .where(eq(olxCodes.isActive, true))
      .where(eq(olxCodes.isHighlighted, true));
  }

  async createOlxCode(insertOlxCode: InsertOlxCode): Promise<OlxCode> {
    const [olxCode] = await db
      .insert(olxCodes)
      .values(insertOlxCode)
      .returning();
    return olxCode;
  }

  async updateOlxCode(id: number, updates: Partial<OlxCode>): Promise<OlxCode | undefined> {
    const [olxCode] = await db
      .update(olxCodes)
      .set(updates)
      .where(eq(olxCodes.id, id))
      .returning();
    return olxCode || undefined;
  }

  async deleteOlxCode(id: number): Promise<boolean> {
    const result = await db.delete(olxCodes).where(eq(olxCodes.id, id));
    return result.rowCount > 0;
  }

  async bulkCreateOlxCodes(brokerId: number, codes: string[]): Promise<OlxCode[]> {
    const insertData = codes.map(code => ({
      code,
      brokerId,
      isUsed: false,
      isHighlighted: false,
      isActive: true,
      currentAutomationId: null,
    }));
    
    return await db.insert(olxCodes).values(insertData).returning();
  }

  async getSystemLog(id: number): Promise<SystemLog | undefined> {
    const [log] = await db.select().from(systemLogs).where(eq(systemLogs.id, id));
    return log || undefined;
  }

  async getSystemLogs(limit?: number, level?: string): Promise<SystemLog[]> {
    let query = db.select().from(systemLogs).orderBy(systemLogs.timestamp);
    if (level) {
      query = query.where(eq(systemLogs.level, level));
    }
    if (limit) {
      query = query.limit(limit);
    }
    return await query;
  }

  async createSystemLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const [log] = await db
      .insert(systemLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async deleteSystemLogs(olderThan?: Date): Promise<number> {
    let result;
    if (olderThan) {
      result = await db.delete(systemLogs).where(systemLogs.timestamp < olderThan);
    } else {
      result = await db.delete(systemLogs);
    }
    return result.rowCount;
  }

  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async getSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  async setSetting(insertSetting: InsertSettings): Promise<Settings> {
    const [setting] = await db
      .insert(settings)
      .values(insertSetting)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: insertSetting.value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
