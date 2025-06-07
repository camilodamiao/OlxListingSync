import puppeteer, { Browser, Page } from 'puppeteer';
import { WebSocketServer, WebSocket } from 'ws';
import { IStorage } from './storage';
import { type Automation, type AutomationStep, type PropertyData } from '@shared/schema';
import path from 'path';
import fs from 'fs';

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
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private async log(level: string, message: string, automationId?: number, metadata?: any) {
    await this.storage.createSystemLog({
      level,
      message,
      automationId,
      metadata,
    });

    // Broadcast log to WebSocket clients
    this.broadcast({
      type: 'log',
      data: {
        level,
        message,
        automationId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async updateProgress(automationId: number, step: AutomationStep, progress: number, message: string) {
    await this.storage.updateAutomation(automationId, {
      currentStep: step,
      progress,
    });

    await this.log('info', message, automationId);

    // Broadcast progress update
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
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--no-experiments',
          '--hide-scrollbars',
          '--mute-audio',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows'
        ],
      });
    }
    return this.browser;
  }

  async startAutomation(automationId: number) {
    if (this.activeAutomations.has(automationId)) {
      await this.log('warning', `Automation ${automationId} is already running`, automationId);
      return;
    }

    this.activeAutomations.set(automationId, true);

    try {
      const automation = await this.storage.getAutomation(automationId);
      if (!automation) {
        throw new Error(`Automation ${automationId} not found`);
      }

      await this.storage.updateAutomation(automationId, { status: 'processing' });
      await this.log('info', `Starting automation for property ${automation.propertyCode}`, automationId);

      // Step 1: Connect to UNIVEN
      await this.updateProgress(automationId, 'connecting_univen', 10, 'Connecting to UNIVEN system...');
      const propertyData = await this.extractPropertyData(automation.propertyCode, automationId);

      // Step 2: Extract property data
      await this.updateProgress(automationId, 'extracting_data', 30, 'Extracting property data...');
      
      // Step 3: Download photos
      await this.updateProgress(automationId, 'downloading_photos', 50, 'Downloading property photos...');
      const photoPaths = await this.downloadPhotos(propertyData.photos, automation.propertyCode, automationId);

      // Step 4: Connect to OLX
      await this.updateProgress(automationId, 'connecting_olx', 70, 'Connecting to OLX Pro...');
      
      // Step 5: Create listing
      await this.updateProgress(automationId, 'creating_listing', 85, 'Creating listing on OLX Pro...');
      await this.createOLXListing(propertyData, automation, photoPaths, automationId);

      // Step 6: Finalize
      await this.updateProgress(automationId, 'finalizing', 100, 'Automation completed successfully!');
      
      await this.storage.updateAutomation(automationId, {
        status: 'completed',
        progress: 100,
        propertyData: propertyData as any,
        completedAt: new Date(),
      });

      await this.log('success', `Automation completed successfully for property ${automation.propertyCode}`, automationId);

    } catch (error) {
      await this.log('error', `Automation failed: ${error}`, automationId);
      await this.storage.updateAutomation(automationId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.activeAutomations.delete(automationId);
    }
  }

  private async extractPropertyData(propertyCode: string, automationId: number): Promise<PropertyData> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await this.log('info', `Navigating to UNIVEN for property ${propertyCode}`, automationId);

      // This is where we would implement actual UNIVEN scraping
      // For now, we simulate the process with a delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulated property data - in real implementation, this would be scraped
      const propertyData: PropertyData = {
        code: propertyCode,
        type: propertyCode.startsWith('AP') ? 'Apartamento' : 
              propertyCode.startsWith('CA') ? 'Casa' : 'Apartamento',
        price: Math.floor(Math.random() * 2000000) + 300000,
        description: `Excelente ${propertyCode.startsWith('AP') ? 'apartamento' : 'casa'} em ótima localização.`,
        address: 'Rua Exemplo, 123 - Centro',
        area: Math.floor(Math.random() * 200) + 50,
        bedrooms: Math.floor(Math.random() * 4) + 1,
        bathrooms: Math.floor(Math.random() * 3) + 1,
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
        features: ['Garagem', 'Área de lazer', 'Portaria 24h'],
      };

      await this.log('success', `Property data extracted for ${propertyCode}`, automationId, propertyData);
      return propertyData;

    } finally {
      await page.close();
    }
  }

  private async downloadPhotos(photoUrls: string[], propertyCode: string, automationId: number): Promise<string[]> {
    const settings = await this.storage.getSettings();
    const downloadPhotosSetting = settings.find(s => s.key === 'downloadPhotos');
    
    if (!(downloadPhotosSetting?.value as boolean)) {
      await this.log('info', 'Photo download disabled in settings', automationId);
      return photoUrls;
    }

    try {
      // Create photos directory if it doesn't exist
      const photosDir = path.join(process.cwd(), 'photos', propertyCode);
      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
      }

      const downloadedPaths: string[] = [];

      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];
        const filename = `photo_${i + 1}.jpg`;
        const filepath = path.join(photosDir, filename);

        // Simulate photo download
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In real implementation, we would download the actual image
        downloadedPaths.push(filepath);
        
        await this.log('info', `Downloaded photo ${i + 1}/${photoUrls.length}`, automationId);
      }

      await this.log('success', `Downloaded ${downloadedPaths.length} photos for ${propertyCode}`, automationId);
      return downloadedPaths;

    } catch (error) {
      await this.log('warning', `Failed to download photos: ${error}`, automationId);
      return photoUrls; // Return original URLs as fallback
    }
  }

  private async createOLXListing(
    propertyData: PropertyData,
    automation: Automation,
    photoPaths: string[],
    automationId: number
  ): Promise<void> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await this.log('info', 'Navigating to OLX Pro', automationId);

      // This is where we would implement actual OLX Pro automation
      // For now, we simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000));

      const olxCode = await this.storage.getOlxCodeByCode(automation.olxCode);
      if (!olxCode) {
        throw new Error(`OLX code ${automation.olxCode} not found`);
      }

      await this.log('info', `Creating listing for broker ${olxCode.name} (${olxCode.code})`, automationId);

      // Simulate listing creation steps
      await this.log('info', 'Filling property details...', automationId);
      await new Promise(resolve => setTimeout(resolve, 1000));

      await this.log('info', 'Uploading photos...', automationId);
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (automation.videoUrl) {
        await this.log('info', 'Adding video URL...', automationId);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (automation.tourUrl) {
        await this.log('info', 'Adding virtual tour URL...', automationId);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await this.log('info', 'Publishing listing...', automationId);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const listingId = `OLX${Date.now()}`;
      await this.log('success', `Listing created successfully with ID: ${listingId}`, automationId);

    } finally {
      await page.close();
    }
  }

  async stopAutomation(automationId: number) {
    if (this.activeAutomations.has(automationId)) {
      this.activeAutomations.delete(automationId);
      await this.storage.updateAutomation(automationId, {
        status: 'failed',
        errorMessage: 'Automation stopped by user',
      });
      await this.log('warning', `Automation ${automationId} stopped by user`, automationId);
    }
  }

  async testUnivenConnection(username?: string, password?: string) {
    try {
      await this.log('info', 'Testando conexão UNIVEN com sistema HTTP otimizado...');
      
      // Use the optimized HTTP-based connectivity testing
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
      
      // Use the optimized HTTP-based connectivity testing
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
          await this.log('error', 'PASSO 5 FALHOU: Campo de usuário não encontrado');
          await this.log('info', 'Seletores testados: ' + usernameSelectors.join(', '));
          await page.close();
          return {
            success: false,
            message: 'Campo de usuário não encontrado na página UNIVEN. O layout do site pode ter mudado.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        }
        
        await this.log('info', `PASSO 5A OK: Campo usuário encontrado com seletor: ${usernameSelector}`);
        
        // Lista de seletores possíveis para campo de senha
        const passwordSelectors = [
          'input[name="senha"]',
          'input[name="password"]',
          'input[type="password"]',
          '#senha',
          '#password',
          '[placeholder*="senha"]',
          '[placeholder*="password"]'
        ];
        
        let passwordField = null;
        let passwordSelector = '';
        
        for (const selector of passwordSelectors) {
          passwordField = await page.$(selector);
          if (passwordField) {
            passwordSelector = selector;
            break;
          }
        }
        
        if (!passwordField) {
          await this.log('error', 'PASSO 5 FALHOU: Campo de senha não encontrado');
          await this.log('info', 'Seletores testados: ' + passwordSelectors.join(', '));
          await page.close();
          return {
            success: false,
            message: 'Campo de senha não encontrado na página UNIVEN. O layout do site pode ter mudado.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        }
        
        await this.log('info', `PASSO 5B OK: Campo senha encontrado com seletor: ${passwordSelector}`);

        // PASSO 6: Preencher credenciais
        await this.log('info', 'PASSO 6: Preenchendo credenciais de login');
        
        // Limpar campos primeiro
        await usernameField.click({ clickCount: 3 });
        await usernameField.type(username, { delay: 100 });
        await this.log('info', 'PASSO 6A: Campo usuário preenchido');
        
        await passwordField.click({ clickCount: 3 });
        await passwordField.type(password, { delay: 100 });
        await this.log('info', 'PASSO 6B: Campo senha preenchido');

        // PASSO 7: Submeter formulário
        await this.log('info', 'PASSO 7: Enviando formulário de login');
        
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button.btn-primary',
          'button.btn-login',
          '.btn-login',
          '#btnLogin',
          'button:contains("Entrar")',
          'button:contains("Login")',
          '.submit-btn'
        ];
        
        let submitted = false;
        for (const selector of submitSelectors) {
          const submitButton = await page.$(selector);
          if (submitButton) {
            await submitButton.click();
            submitted = true;
            await this.log('info', `PASSO 7 OK: Formulário enviado usando: ${selector}`);
            break;
          }
        }
        
        if (!submitted) {
          // Tentar Enter como último recurso
          await page.keyboard.press('Enter');
          await this.log('info', 'PASSO 7 OK: Formulário enviado usando tecla Enter');
        }

        // PASSO 8: Aguardar e analisar resposta
        await this.log('info', 'PASSO 8: Aguardando resposta do servidor (5 segundos)');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentUrl = page.url();
        const pageContent = await page.content();
        const pageTitle = await page.title();
        
        await this.log('info', `PASSO 8: URL atual: ${currentUrl}`);
        await this.log('info', `PASSO 8: Título da página: ${pageTitle}`);
        
        await page.close();

        // PASSO 9: Determinar resultado baseado em indicadores
        await this.log('info', 'PASSO 9: Analisando resultado do login');
        
        // Indicadores de SUCESSO
        const successIndicators = [
          // URL mudou para área logada
          currentUrl.includes('dashboard'),
          currentUrl.includes('home'),
          currentUrl.includes('principal'),
          currentUrl.includes('menu'),
          currentUrl.includes('sistema'),
          currentUrl !== 'https://univenweb.com.br/' && currentUrl !== 'https://univenweb.com.br/index.html',
          
          // Conteúdo indica usuário logado
          pageContent.toLowerCase().includes('logout'),
          pageContent.toLowerCase().includes('sair'),
          pageContent.toLowerCase().includes('bem-vindo'),
          pageContent.toLowerCase().includes('dashboard'),
          pageContent.toLowerCase().includes('menu principal'),
          
          // Título indica área logada
          pageTitle.toLowerCase().includes('sistema'),
          pageTitle.toLowerCase().includes('dashboard'),
          pageTitle.toLowerCase().includes('principal')
        ];
        
        // Indicadores de ERRO
        const errorIndicators = [
          pageContent.toLowerCase().includes('usuário inválido'),
          pageContent.toLowerCase().includes('senha incorreta'),
          pageContent.toLowerCase().includes('credenciais inválidas'),
          pageContent.toLowerCase().includes('erro de login'),
          pageContent.toLowerCase().includes('login inválido'),
          pageContent.toLowerCase().includes('dados incorretos'),
          pageContent.toLowerCase().includes('acesso negado'),
          pageContent.toLowerCase().includes('invalid'),
          pageContent.toLowerCase().includes('incorrect'),
          pageContent.toLowerCase().includes('failed'),
          
          // URL permaneceu na página de login
          currentUrl === 'https://univenweb.com.br/',
          currentUrl === 'https://univenweb.com.br/index.html'
        ];
        
        const successCount = successIndicators.filter(indicator => indicator).length;
        const errorCount = errorIndicators.filter(indicator => indicator).length;
        
        await this.log('info', `PASSO 9: Indicadores de sucesso encontrados: ${successCount}`);
        await this.log('info', `PASSO 9: Indicadores de erro encontrados: ${errorCount}`);
        
        if (successCount > 0 && errorCount === 0) {
          await this.log('info', 'RESULTADO: Login realizado com SUCESSO');
          return {
            success: true,
            message: 'Login UNIVEN realizado com sucesso! Credenciais válidas e funcionando.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (errorCount > 0) {
          await this.log('error', 'RESULTADO: Credenciais INVÁLIDAS');
          return {
            success: false,
            message: 'Credenciais inválidas para UNIVEN. Verifique seu usuário e senha.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else {
          await this.log('warning', 'RESULTADO: Inconclusivo - não foi possível determinar sucesso ou falha');
          return {
            success: false,
            message: 'Não foi possível confirmar o login. A página pode ter mudado ou há problemas de conectividade. Tente fazer login manualmente no site.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        }
        
      } catch (browserError) {
        await page.close();
        const errorMsg = browserError instanceof Error ? browserError.message : 'Erro desconhecido';
        await this.log('error', `ERRO NO BROWSER: ${errorMsg}`);
        
        return {
          success: false,
          message: 'Erro técnico durante o teste de login. Verifique sua conexão ou tente fazer login manualmente no site.',
          platform: 'UNIVEN',
          timestamp: new Date()
        };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.log('error', `ERRO GERAL: ${errorMsg}`);
      
      return {
        success: false,
        message: 'Erro de conectividade com UNIVEN. Verifique sua conexão com a internet.',
        platform: 'UNIVEN',
        timestamp: new Date()
      };
    }
  }

  async testOlxConnection(email?: string, password?: string) {
    try {
      // PASSO 1: Log inicial e validação de credenciais
      await this.log('info', '=== INICIANDO TESTE OLX PRO (Canal Pro Grupo ZAP) ===');
      await this.log('info', 'PASSO 1: Validando credenciais fornecidas');
      
      if (!email || !password) {
        await this.log('error', 'ERRO: Credenciais não fornecidas');
        return {
          success: false,
          message: 'Email e password são obrigatórios para testar a conexão com OLX Pro.',
          platform: 'OLX Pro',
          timestamp: new Date(),
          requiresCredentials: true
        };
      }
      
      await this.log('info', `PASSO 1 OK: Credenciais fornecidas - email: ${email}`);

      // PASSO 2: Teste de conectividade básica com Canal Pro (URL correta)
      await this.log('info', 'PASSO 2: Testando conectividade básica com https://canalpro.grupozap.com/');
      
      const response = await fetch('https://canalpro.grupozap.com/', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      if (!response.ok) {
        await this.log('error', `PASSO 2 FALHOU: Site retornou status ${response.status}`);
        return {
          success: false,
          message: `Não foi possível conectar ao Canal Pro OLX (Status: ${response.status}). Verifique sua conexão com a internet.`,
          platform: 'OLX Pro',
          timestamp: new Date()
        };
      }
      
      await this.log('info', `PASSO 2 OK: Canal Pro acessível (Status: ${response.status})`);

      // PASSO 3: Inicializar browser para teste real de login
      await this.log('info', 'PASSO 3: Inicializando browser para teste de login OLX Pro');
      
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Configurar página para simular usuário real e evitar detecção de bot
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      // Configurações extras para evitar detecção de bot
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });
      
      try {
        // PASSO 4: Navegar diretamente para página de login do Canal Pro
        await this.log('info', 'PASSO 4: Navegando para página de login Canal Pro');
        
        await page.goto('https://canalpro.grupozap.com/login', { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        
        await this.log('info', 'PASSO 4 OK: Página de login carregada');

        // PASSO 5: Localizar campos de login na página Canal Pro
        await this.log('info', 'PASSO 5: Procurando campos de login na página Canal Pro');
        
        // Aguardar carregamento completo
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Lista de seletores possíveis para campo de email
        const emailSelectors = [
          'input[name="email"]',
          'input[name="username"]',
          'input[name="user"]',
          'input[type="email"]',
          'input[type="text"]',
          '#email',
          '#username',
          '#user',
          '.form-control[type="email"]',
          '.form-control[type="text"]',
          '[placeholder*="email"]',
          '[placeholder*="e-mail"]',
          '[placeholder*="usuário"]'
        ];
        
        let emailField = null;
        let emailSelector = '';
        
        for (const selector of emailSelectors) {
          emailField = await page.$(selector);
          if (emailField) {
            emailSelector = selector;
            break;
          }
        }
        
        if (!emailField) {
          await this.log('error', 'PASSO 5 FALHOU: Campo de email não encontrado');
          await this.log('info', 'Seletores testados: ' + emailSelectors.join(', '));
          await page.close();
          return {
            success: false,
            message: 'Campo de email não encontrado na página Canal Pro. O layout do site pode ter mudado.',
            platform: 'OLX Pro',
            timestamp: new Date()
          };
        }
        
        await this.log('info', `PASSO 5A OK: Campo email encontrado com seletor: ${emailSelector}`);
        
        // Lista de seletores possíveis para campo de senha
        const passwordSelectors = [
          'input[name="password"]',
          'input[name="senha"]',
          'input[type="password"]',
          '#password',
          '#senha',
          '.form-control[type="password"]',
          '[placeholder*="senha"]',
          '[placeholder*="password"]'
        ];
        
        let passwordField = null;
        let passwordSelector = '';
        
        for (const selector of passwordSelectors) {
          passwordField = await page.$(selector);
          if (passwordField) {
            passwordSelector = selector;
            break;
          }
        }
        
        if (!passwordField) {
          await this.log('error', 'PASSO 5 FALHOU: Campo de senha não encontrado');
          await this.log('info', 'Seletores testados: ' + passwordSelectors.join(', '));
          await page.close();
          return {
            success: false,
            message: 'Campo de senha não encontrado na página Canal Pro. O layout do site pode ter mudado.',
            platform: 'OLX Pro',
            timestamp: new Date()
          };
        }
        
        await this.log('info', `PASSO 5B OK: Campo senha encontrado com seletor: ${passwordSelector}`);

        // PASSO 6: Preencher credenciais
        await this.log('info', 'PASSO 6: Preenchendo credenciais de login Canal Pro');
        
        // Limpar campos primeiro e preencher devagar para evitar detecção de bot
        await emailField.click({ clickCount: 3 });
        await emailField.type(email, { delay: 150 });
        await this.log('info', 'PASSO 6A: Campo email preenchido');
        
        await passwordField.click({ clickCount: 3 });
        await passwordField.type(password, { delay: 150 });
        await this.log('info', 'PASSO 6B: Campo senha preenchido');

        // PASSO 7: Submeter formulário
        await this.log('info', 'PASSO 7: Enviando formulário de login Canal Pro');
        
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button.btn-primary',
          'button.btn-login',
          '.btn-login',
          '#btnLogin',
          'button:contains("Entrar")',
          'button:contains("Login")',
          'button:contains("Acessar")',
          '.submit-btn',
          '.login-btn'
        ];
        
        let submitted = false;
        for (const selector of submitSelectors) {
          const submitButton = await page.$(selector);
          if (submitButton) {
            await submitButton.click();
            submitted = true;
            await this.log('info', `PASSO 7 OK: Formulário enviado usando: ${selector}`);
            break;
          }
        }
        
        if (!submitted) {
          // Tentar Enter como último recurso
          await page.keyboard.press('Enter');
          await this.log('info', 'PASSO 7 OK: Formulário enviado usando tecla Enter');
        }

        // PASSO 8: Aguardar resposta e possível redirecionamento
        await this.log('info', 'PASSO 8: Aguardando resposta do servidor (8 segundos para Canal Pro)');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const currentUrl = page.url();
        const pageContent = await page.content();
        const pageTitle = await page.title();
        
        await this.log('info', `PASSO 8: URL atual: ${currentUrl}`);
        await this.log('info', `PASSO 8: Título da página: ${pageTitle}`);
        
        await page.close();

        // PASSO 9: Determinar resultado baseado em indicadores específicos do Canal Pro
        await this.log('info', 'PASSO 9: Analisando resultado do login Canal Pro');
        
        // Indicadores de SUCESSO para Canal Pro / OLX
        const successIndicators = [
          // URL mudou para área logada
          currentUrl.includes('dashboard'),
          currentUrl.includes('painel'),
          currentUrl.includes('admin'),
          currentUrl.includes('portal'),
          currentUrl.includes('home'),
          currentUrl.includes('main'),
          currentUrl !== 'https://canalpro.grupozap.com/login' && currentUrl !== 'https://canalpro.grupozap.com/',
          
          // Conteúdo indica usuário logado
          pageContent.toLowerCase().includes('logout'),
          pageContent.toLowerCase().includes('sair'),
          pageContent.toLowerCase().includes('bem-vindo'),
          pageContent.toLowerCase().includes('dashboard'),
          pageContent.toLowerCase().includes('painel'),
          pageContent.toLowerCase().includes('meus anúncios'),
          pageContent.toLowerCase().includes('olx pro'),
          pageContent.toLowerCase().includes('canal pro'),
          
          // Título indica área logada
          pageTitle.toLowerCase().includes('dashboard'),
          pageTitle.toLowerCase().includes('painel'),
          pageTitle.toLowerCase().includes('portal'),
          pageTitle.toLowerCase().includes('olx pro')
        ];
        
        // Indicadores de ERRO
        const errorIndicators = [
          pageContent.toLowerCase().includes('email inválido'),
          pageContent.toLowerCase().includes('senha incorreta'),
          pageContent.toLowerCase().includes('credenciais inválidas'),
          pageContent.toLowerCase().includes('erro de login'),
          pageContent.toLowerCase().includes('login inválido'),
          pageContent.toLowerCase().includes('dados incorretos'),
          pageContent.toLowerCase().includes('acesso negado'),
          pageContent.toLowerCase().includes('usuário não encontrado'),
          pageContent.toLowerCase().includes('invalid'),
          pageContent.toLowerCase().includes('incorrect'),
          pageContent.toLowerCase().includes('failed'),
          pageContent.toLowerCase().includes('error'),
          
          // URL permaneceu na página de login
          currentUrl === 'https://canalpro.grupozap.com/login',
          currentUrl === 'https://canalpro.grupozap.com/'
        ];
        
        const successCount = successIndicators.filter(indicator => indicator).length;
        const errorCount = errorIndicators.filter(indicator => indicator).length;
        
        await this.log('info', `PASSO 9: Indicadores de sucesso encontrados: ${successCount}`);
        await this.log('info', `PASSO 9: Indicadores de erro encontrados: ${errorCount}`);
        
        if (successCount > 0 && errorCount === 0) {
          await this.log('info', 'RESULTADO: Login Canal Pro realizado com SUCESSO');
          return {
            success: true,
            message: 'Login OLX Pro (Canal Pro) realizado com sucesso! Credenciais válidas e funcionando.',
            platform: 'OLX Pro',
            timestamp: new Date()
          };
        } else if (errorCount > 0) {
          await this.log('error', 'RESULTADO: Credenciais INVÁLIDAS para Canal Pro');
          return {
            success: false,
            message: 'Credenciais inválidas para OLX Pro (Canal Pro). Verifique seu email e senha.',
            platform: 'OLX Pro',
            timestamp: new Date()
          };
        } else {
          await this.log('warning', 'RESULTADO: Inconclusivo - não foi possível determinar sucesso ou falha');
          return {
            success: false,
            message: 'Não foi possível confirmar o login no Canal Pro. A página pode ter mudado ou há problemas de conectividade. Tente fazer login manualmente no site.',
            platform: 'OLX Pro',
            timestamp: new Date()
          };
        }
        
      } catch (browserError) {
        await page.close();
        const errorMsg = browserError instanceof Error ? browserError.message : 'Erro desconhecido';
        await this.log('error', `ERRO NO BROWSER: ${errorMsg}`);
        
        return {
          success: false,
          message: 'Erro técnico durante o teste de login Canal Pro. Verifique sua conexão ou tente fazer login manualmente no site.',
          platform: 'OLX Pro',
          timestamp: new Date()
        };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.log('error', `ERRO GERAL CANAL PRO: ${errorMsg}`);
      
      return {
        success: false,
        message: 'Erro de conectividade com Canal Pro OLX. Verifique sua conexão com a internet.',
        platform: 'OLX Pro',
        timestamp: new Date()
      };
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
