import { IStorage } from './storage';

export interface ConnectivityTestResult {
  success: boolean;
  message: string;
  platform: string;
  timestamp: Date;
  recommendation?: string;
  requiresCredentials?: boolean;
}

export class ConnectivityTester {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  private async log(level: string, message: string): Promise<void> {
    await this.storage.createSystemLog({
      level,
      message,
      automationId: null,
      metadata: null
    });
  }

  async testUnivenConnection(username?: string, password?: string): Promise<ConnectivityTestResult> {
    try {
      await this.log('info', '=== INICIANDO TESTE UNIVEN (DETECÇÃO DE SESSÃO BROWSER) ===');
      
      // PASSO 1: Usar Puppeteer para verificar sessão ativa
      await this.log('info', 'PASSO 1: Verificando sessão ativa via browser automation...');
      
      const puppeteer = await import('puppeteer');
      let browser = null;
      
      try {
        browser = await puppeteer.default.launch({
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
        
        const page = await browser.newPage();
        
        // Definir user agent realístico
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await this.log('info', 'PASSO 1: Navegando para UNIVEN...');
        
        // Navegar para UNIVEN
        const response = await page.goto('https://www.univenweb.com.br/', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        if (!response || response.status() !== 200) {
          await this.log('error', `PASSO 1: Site inacessível (Status: ${response?.status()})`);
          return {
            success: false,
            message: `Site UNIVEN inacessível (Status: ${response?.status()}). Verifique sua conexão.`,
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        }
        
        await this.log('info', `PASSO 1: Site carregado (Status: ${response.status()})`);
        
        // Aguardar um pouco para a página carregar completamente
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUrl = page.url();
        await this.log('info', `PASSO 1: URL atual: ${currentUrl}`);
        
        // Verificar se a URL indica uma área logada
        if (currentUrl.includes('/dashboard') || 
            currentUrl.includes('/imovel/') || 
            currentUrl.includes('/principal') ||
            currentUrl.includes('/home') ||
            !currentUrl.includes('/login')) {
          
          // Tentar verificar elementos que indicam usuário logado
          try {
            await page.waitForSelector('body', { timeout: 3000 });
            
            const pageContent = await page.content();
            const sessionIndicators = [
              'sair',
              'logout',
              'Meus Imóveis',
              'Área do Usuário',
              'dashboard',
              'menu-usuario',
              'Bem-vindo',
              'Olá,'
            ];
            
            const hasSessionIndicator = sessionIndicators.some(indicator => 
              pageContent.toLowerCase().includes(indicator.toLowerCase())
            );
            
            if (hasSessionIndicator) {
              await this.log('info', 'PASSO 1: ✓ SESSÃO ATIVA DETECTADA no browser!');
              await browser.close();
              return {
                success: true,
                message: 'UNIVEN conectado! Sessão ativa detectada no navegador.',
                platform: 'UNIVEN',
                timestamp: new Date(),
                recommendation: 'browser_session_active'
              };
            }
            
          } catch (elementError) {
            await this.log('info', `PASSO 1: Erro ao verificar elementos: ${elementError instanceof Error ? elementError.message : 'Erro'}`);
          }
        }
        
        await this.log('info', 'PASSO 1: Nenhuma sessão ativa detectada no browser');
        await browser.close();
        
      } catch (browserError) {
        if (browser) {
          try { await browser.close(); } catch {}
        }
        await this.log('warning', `PASSO 1: Erro no browser: ${browserError instanceof Error ? browserError.message : 'Erro desconhecido'}`);
      }

      // PASSO 2: Se não detectou sessão, informar sobre login manual
      await this.log('info', 'RESULTADO: Nenhuma sessão ativa detectada');
      return {
        success: false,
        message: 'Nenhuma sessão ativa no UNIVEN. Recomendamos fazer login manual no navegador primeiro.',
        platform: 'UNIVEN',
        timestamp: new Date(),
        requiresCredentials: false,
        recommendation: 'manual_browser_login'
      };
      
      if (!response.ok) {
        await this.log('error', `PASSO 2 FALHOU: Site retornou status ${response.status}`);
        return {
          success: false,
          message: `Não foi possível conectar ao site UNIVEN (Status: ${response.status}). Verifique sua conexão com a internet.`,
          platform: 'UNIVEN',
          timestamp: new Date()
        };
      }
      
      await this.log('info', `PASSO 2 OK: Site acessível (Status: ${response.status})`);

      // PASSO 3: Análise da página de login
      await this.log('info', 'PASSO 3: Analisando estrutura da página de login');
      
      const pageContent = await response.text();
      
      // Verificar se há campos de login (padrões específicos para UNIVEN)
      const hasUserField = pageContent.includes('id="txt_email"') || 
                          pageContent.includes('type="email"') ||
                          /input[^>]*name\s*=\s*["']?(usuario|username|user|email)["']?/i.test(pageContent);
      
      const hasPasswordField = pageContent.includes('id="txt_senha"') ||
                               pageContent.includes('type="password"') ||
                               /input[^>]*name\s*=\s*["']?senha["']?/i.test(pageContent);
      
      await this.log('info', `PASSO 3: Campo usuário encontrado: ${hasUserField}`);
      await this.log('info', `PASSO 3: Campo senha encontrado: ${hasPasswordField}`);
      
      if (!hasUserField || !hasPasswordField) {
        return {
          success: false,
          message: 'Campos de login não encontrados na página UNIVEN. O layout do site pode ter mudado.',
          platform: 'UNIVEN',
          timestamp: new Date()
        };
      }

      // PASSO 4: Teste de credenciais via POST
      await this.log('info', 'PASSO 4: Testando credenciais via requisição POST');
      
      // URL de login do UNIVEN (encontrada no JavaScript)
      const loginUrl = 'https://www.univenweb.com.br/view/login/verifica_login.php';
      await this.log('info', `PASSO 4: URL de login UNIVEN: ${loginUrl}`);
      
      // Tentar login
      try {
        const loginResponse = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.univenweb.com.br/',
            'Origin': 'https://www.univenweb.com.br'
          },
          body: `email=${encodeURIComponent(username)}&senha=${encodeURIComponent(password)}&lembrar=0`,
          redirect: 'manual'
        });
        
        await this.log('info', `PASSO 4: Resposta do login: ${loginResponse.status}`);
        
        // PASSO 5: Analisar resposta
        await this.log('info', 'PASSO 5: Analisando resposta do servidor');
        
        // Redirecionamento indica possível sucesso
        if (loginResponse.status === 302 || loginResponse.status === 301) {
          const location = loginResponse.headers.get('location');
          await this.log('info', `PASSO 5: Redirecionamento detectado para: ${location}`);
          
          if (location && (location.includes('dashboard') || location.includes('home') || 
                          location.includes('principal') || location.includes('sistema') ||
                          location.includes('menu'))) {
            await this.log('info', 'RESULTADO: Login SUCESSO (redirecionamento para área logada)');
            return {
              success: true,
              message: 'Login UNIVEN realizado com sucesso! Credenciais válidas - sistema redirecionou para área logada.',
              platform: 'UNIVEN',
              timestamp: new Date()
            };
          }
        }
        
        // Analisar conteúdo da resposta (códigos específicos do UNIVEN)
        const responseText = await loginResponse.text().then(text => text.replace("ï»¿", ""));
        
        await this.log('info', `PASSO 5: Resposta recebida (${responseText.length} chars): "${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}"`);
        await this.log('info', `PASSO 5: Tamanho da resposta: ${responseText.length} caracteres`);
        
        // Log adicional para análise
        if (responseText.length > 10) {
          await this.log('info', `PASSO 5: Primeiros 100 chars: "${responseText.substring(0, 100)}"`);
          if (responseText.length > 100) {
            await this.log('info', `PASSO 5: Últimos 100 chars: "${responseText.substring(responseText.length - 100)}"`);
          }
        }
        
        // Analisar códigos de retorno específicos do UNIVEN (baseado no JavaScript)
        const trimmedResponse = responseText.trim();
        
        // Verificar se há separador de dados (!-!)
        const responseParts = trimmedResponse.split("!-!");
        const responseCode = responseParts[0];
        
        await this.log('info', `PASSO 5: Código de resposta UNIVEN: "${responseCode}"`);
        
        if (responseCode === "1") {
          await this.log('error', 'RESULTADO: Senha incorreta detectada');
          return {
            success: false,
            message: 'Senha incorreta para UNIVEN. Verifique sua senha e tente novamente.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode === "2") {
          await this.log('error', 'RESULTADO: Dados incorretos detectados');
          return {
            success: false,
            message: 'Dados incorretos para UNIVEN. Verifique seu email e senha.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode === "3") {
          await this.log('error', 'RESULTADO: Número de acessos excedido');
          return {
            success: false,
            message: 'Número de acessos excedeu o contratado no UNIVEN.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode === "4") {
          await this.log('error', 'RESULTADO: Cadastro desativado');
          return {
            success: false,
            message: 'Cadastro da imobiliária está desativado no UNIVEN.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode === "-1") {
          await this.log('error', 'RESULTADO: Sistema em manutenção');
          return {
            success: false,
            message: 'Sistema UNIVEN em manutenção. Tente novamente em alguns minutos.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode.includes("eval(") || responseCode.includes("window.open")) {
          await this.log('info', 'RESULTADO: Login SUCESSO - JavaScript de redirecionamento detectado');
          return {
            success: true,
            message: 'Login UNIVEN realizado com sucesso! Credenciais válidas e sistema retornou redirecionamento.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode === "" || responseCode === "erro") {
          await this.log('error', 'RESULTADO: Erro no sistema ou credenciais inválidas');
          return {
            success: false,
            message: 'Erro no sistema UNIVEN ou credenciais inválidas.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode.trim() === "0") {
          // Código 0 indica sucesso
          await this.log('info', 'RESULTADO: Login SUCESSO - Código "0" detectado');
          return {
            success: true,
            message: 'Login UNIVEN realizado com sucesso! Credenciais válidas (código 0).',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode.includes('window.open') || responseCode.includes('location.href') || responseCode.includes('eval(') || responseCode.includes('redirect')) {
          // JavaScript de redirecionamento detectado - login bem-sucedido
          await this.log('info', 'RESULTADO: Login SUCESSO - JavaScript de redirecionamento detectado');
          return {
            success: true,
            message: 'Login UNIVEN realizado com sucesso! Sistema retornou JavaScript de redirecionamento.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode.includes('parent.') || responseCode.includes('top.') || responseCode.includes('window.') || responseCode.includes('document.')) {
          // Comandos JavaScript que modificam janela/documento - típico de sucesso
          await this.log('info', 'RESULTADO: Login SUCESSO - Comandos JavaScript de interface detectados');
          return {
            success: true,
            message: 'Login UNIVEN realizado com sucesso! Sistema retornou comandos JavaScript válidos.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else if (responseCode.length > 30 && !responseCode.match(/^[0-9]+$/)) {
          // Resposta longa que não é apenas números - provavelmente JavaScript de sucesso
          await this.log('info', 'RESULTADO: Login provavelmente SUCESSO - Resposta JavaScript complexa detectada');
          return {
            success: true,
            message: 'Login UNIVEN aparenta ter sido bem-sucedido. Resposta JavaScript complexa do servidor.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else {
          await this.log('warning', `RESULTADO: Resposta não reconhecida: "${responseCode.substring(0, 50)}..."`);
          return {
            success: false,
            message: `Resposta não reconhecida do UNIVEN. Sistema pode estar funcionando de forma diferente. Código: "${responseCode.substring(0, 30)}..."`,
            platform: 'UNIVEN',
            timestamp: new Date(),
            recommendation: 'manual_verification'
          };
        }
        
      } catch (postError) {
        const errorMsg = postError instanceof Error ? postError.message : 'Erro desconhecido';
        await this.log('error', `PASSO 4 FALHOU: ${errorMsg}`);
        
        return {
          success: false,
          message: 'Erro técnico durante teste de login. Verifique sua conexão ou tente manualmente.',
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

  async testOlxConnection(email?: string, password?: string): Promise<ConnectivityTestResult> {
    try {
      // PASSO 1: Validação de credenciais
      await this.log('info', '=== INICIANDO TESTE OLX PRO (Canal Pro) ===');
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

      // PASSO 2: Teste de conectividade básica
      await this.log('info', 'PASSO 2: Testando conectividade básica com https://canalpro.grupozap.com/');
      
      const response = await fetch('https://canalpro.grupozap.com/', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
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

      // PASSO 3: Análise da página
      await this.log('info', 'PASSO 3: Analisando página Canal Pro');
      
      const pageContent = await response.text();
      
      // Verificar se há login/autenticação
      const hasLoginForm = /login|entrar|email|password|senha/i.test(pageContent);
      const isReactApp = pageContent.includes('react') || pageContent.includes('__NEXT_DATA__') || 
                        pageContent.includes('_app') || pageContent.includes('webpack');
      
      await this.log('info', `PASSO 3: Indicadores de login encontrados: ${hasLoginForm}`);
      await this.log('info', `PASSO 3: Aplicação React/SPA detectada: ${isReactApp}`);
      
      if (isReactApp) {
        // Para SPAs como Canal Pro, é difícil testar login via HTTP simples
        await this.log('info', 'PASSO 4: Canal Pro é uma SPA - teste limitado disponível');
        
        return {
          success: true,
          message: 'Canal Pro OLX está acessível. Devido à arquitetura SPA, recomendamos verificar as credenciais fazendo login manual no site.',
          platform: 'OLX Pro',
          timestamp: new Date(),
          recommendation: 'manual_login_recommended'
        };
      }
      
      // Se não for SPA, tentar teste direto
      await this.log('info', 'PASSO 4: Tentando localizar endpoint de login');
      
      // Procurar por API endpoints ou formulários
      const apiMatch = pageContent.match(/api[\/\\]auth|api[\/\\]login|\/login/i);
      
      if (apiMatch) {
        await this.log('info', `PASSO 4: Possível endpoint encontrado: ${apiMatch[0]}`);
        
        return {
          success: true,
          message: 'Canal Pro OLX está acessível e endpoint de autenticação detectado. Para validação completa das credenciais, recomendamos teste manual.',
          platform: 'OLX Pro',
          timestamp: new Date(),
          recommendation: 'manual_validation'
        };
      } else {
        await this.log('info', 'PASSO 4: Estrutura de login não identificada');
        
        return {
          success: true,
          message: 'Canal Pro OLX está acessível. Recomendamos verificar as credenciais fazendo login manual no site.',
          platform: 'OLX Pro',
          timestamp: new Date(),
          recommendation: 'manual_login'
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
}