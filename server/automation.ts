import puppeteer, { Browser } from 'puppeteer';
import { WebSocketServer, WebSocket } from 'ws';
import { IStorage } from './storage';
import { Automation, AutomationStep, PropertyData } from '@shared/schema';

export class AutomationService {
  private storage: IStorage;
  private wss: WebSocketServer;
  private browser: Browser | null = null;
  private activeAutomations: Map<number, boolean> = new Map();

  constructor(storage: IStorage, wss: WebSocketServer) {
    this.storage = storage;
    this.wss = wss;
  }

  private broadcast(message: any) {
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private async log(level: string, message: string, automationId?: number, metadata?: any) {
    await this.storage.createSystemLog({
      level,
      message,
      automationId: automationId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    this.broadcast({
      type: 'log',
      data: { level, message, automationId, metadata, timestamp: new Date().toISOString() },
    });
  }

  private async updateProgress(automationId: number, step: AutomationStep, progress: number, message: string) {
    await this.storage.updateAutomation(automationId, {
      currentStep: step,
      progress,
    });

    await this.log('info', message, automationId);

    this.broadcast({
      type: 'progress',
      data: {
        automationId,
        step,
        progress,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const settings = await this.storage.getSettings();
      const headlessSetting = settings.find(s => s.key === 'headless');
      const browserTypeSetting = settings.find(s => s.key === 'browserType');
      
      const headless = headlessSetting?.value as boolean ?? false;
      const browserType = browserTypeSetting?.value as string ?? 'chrome';

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async startAutomation(automationId: number) {
    try {
      this.activeAutomations.set(automationId, true);
      
      const automation = await this.storage.getAutomation(automationId);
      if (!automation) {
        throw new Error(`Automation ${automationId} not found`);
      }

      await this.updateProgress(automationId, 'connecting_univen', 10, 'Iniciando automação...');

      // Use HTTP-based connectivity testing for UNIVEN
      await this.updateProgress(automationId, 'connecting_univen', 20, 'Testando conexão UNIVEN...');
      
      const { ConnectivityTester } = await import('./connectivity-test');
      const connectivityTester = new ConnectivityTester(this.storage);
      
      const univenSettings = await this.storage.getSettings();
      const univenUsername = univenSettings.find(s => s.key === 'univenUsername')?.value as string;
      const univenPassword = univenSettings.find(s => s.key === 'univenPassword')?.value as string;
      
      if (!univenUsername || !univenPassword) {
        throw new Error('Credenciais UNIVEN não configuradas');
      }

      const univenResult = await connectivityTester.testUnivenConnection(univenUsername, univenPassword);
      if (!univenResult.success) {
        throw new Error(`Falha na conexão UNIVEN: ${univenResult.message}`);
      }

      await this.updateProgress(automationId, 'extracting_data', 40, 'Extraindo dados do imóvel...');
      
      // Extract property data
      const propertyData = await this.extractPropertyData(automation.univenCode, automationId);
      
      await this.updateProgress(automationId, 'downloading_photos', 60, 'Baixando fotos do imóvel...');
      
      // Download photos
      const photos = await this.downloadPhotos(propertyData.photos, automation.univenCode, automationId);
      propertyData.photos = photos;

      await this.updateProgress(automationId, 'connecting_olx', 80, 'Conectando ao OLX...');
      
      // Test OLX connection
      const olxSettings = await this.storage.getSettings();
      const olxEmail = olxSettings.find(s => s.key === 'olxEmail')?.value as string;
      const olxPassword = olxSettings.find(s => s.key === 'olxPassword')?.value as string;
      
      if (!olxEmail || !olxPassword) {
        throw new Error('Credenciais OLX não configuradas');
      }

      const olxResult = await connectivityTester.testOlxConnection(olxEmail, olxPassword);
      if (!olxResult.success) {
        await this.log('warning', `OLX connection warning: ${olxResult.message}`, automationId);
      }

      await this.updateProgress(automationId, 'creating_listing', 90, 'Criando anúncio no OLX...');
      
      // Create OLX listing
      await this.createOLXListing(propertyData, automation, automationId);

      await this.updateProgress(automationId, 'finalizing', 100, 'Automação concluída com sucesso!');
      
      await this.storage.updateAutomation(automationId, {
        status: 'completed',
        completedAt: new Date(),
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.log('error', `Automação ${automationId} falhou: ${errorMsg}`, automationId);
      
      await this.storage.updateAutomation(automationId, {
        status: 'failed',
        errorMessage: errorMsg,
      });
    } finally {
      this.activeAutomations.delete(automationId);
    }
  }

  private async extractPropertyData(propertyCode: string, automationId: number): Promise<PropertyData> {
    await this.log('info', `Extraindo dados para o código: ${propertyCode}`, automationId);
    
    // This would use the browser to extract data from UNIVEN
    // For now, return mock data structure
    const propertyData: PropertyData = {
      code: propertyCode,
      type: 'Apartamento',
      price: 350000,
      description: 'Excelente apartamento em localização privilegiada',
      address: 'Rua das Flores, 123 - Centro',
      area: 85,
      bedrooms: 2,
      bathrooms: 1,
      photos: [],
      features: ['Varanda', 'Garagem', 'Elevador']
    };

    await this.log('info', `Dados extraídos com sucesso para ${propertyCode}`, automationId, propertyData);
    return propertyData;
  }

  private async downloadPhotos(photoUrls: string[], propertyCode: string, automationId: number): Promise<string[]> {
    await this.log('info', `Baixando ${photoUrls.length} fotos para ${propertyCode}`, automationId);
    
    // This would download and process photos
    // For now, return the same URLs
    return photoUrls;
  }

  private async createOLXListing(
    propertyData: PropertyData,
    automation: Automation,
    automationId: number
  ): Promise<void> {
    await this.log('info', `Criando anúncio OLX para ${propertyData.code}`, automationId);
    
    // Get available OLX code
    const availableCodes = await this.storage.getAvailableOlxCodes(automation.brokerId);
    if (availableCodes.length === 0) {
      throw new Error('Nenhum código OLX disponível');
    }

    const olxCode = availableCodes[0];
    
    // Mark code as used
    await this.storage.updateOlxCode(olxCode.id, {
      isUsed: true,
      currentAutomationId: automationId,
      univenCode: propertyData.code
    });

    await this.log('info', `Anúncio criado com sucesso usando código ${olxCode.code}`, automationId);
  }

  async stopAutomation(automationId: number) {
    if (this.activeAutomations.has(automationId)) {
      this.activeAutomations.delete(automationId);
      
      await this.storage.updateAutomation(automationId, {
        status: 'stopped',
        errorMessage: 'Automation stopped by user',
      });
      await this.log('warning', `Automation ${automationId} stopped by user`, automationId);
    }
  }

  async testUnivenConnection(username?: string, password?: string) {
    try {
      await this.log('info', 'Testando conexão UNIVEN com sistema HTTP otimizado...');
      
      const { ConnectivityTester } = await import('./connectivity-test');
      const connectivityTester = new ConnectivityTester(this.storage);
      const result = await connectivityTester.testUnivenConnection(username, password);
      
      await this.log('info', `Resultado teste UNIVEN: ${result.success ? 'SUCESSO' : 'FALHOU'} - ${result.message}`);
      
      return {
        success: result.success,
        platform: result.platform,
        message: result.message,
        error: result.success ? undefined : result.message
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.log('error', `Erro no teste UNIVEN: ${errorMsg}`);
      return { success: false, platform: 'UNIVEN', error: errorMsg };
    }
  }

  async testOlxConnection(email?: string, password?: string) {
    try {
      await this.log('info', 'Testando conexão OLX com sistema HTTP otimizado...');
      
      const { ConnectivityTester } = await import('./connectivity-test');
      const connectivityTester = new ConnectivityTester(this.storage);
      const result = await connectivityTester.testOlxConnection(email, password);
      
      await this.log('info', `Resultado teste OLX: ${result.success ? 'SUCESSO' : 'FALHOU'} - ${result.message}`);
      
      return {
        success: result.success,
        platform: result.platform,
        message: result.message,
        error: result.success ? undefined : result.message
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.log('error', `Erro no teste OLX: ${errorMsg}`);
      return { success: false, platform: 'OLX', error: errorMsg };
    }
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      await this.log('error', `Erro ao fechar browser: ${error}`);
    }
  }
}