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
      await this.log('info', 'Iniciando teste de conectividade UNIVEN');
      
      // Test basic connectivity with multiple endpoints
      const endpoints = [
        'https://univenweb.com.br',
        'https://www.univenweb.com.br',
        'https://univenweb.com.br/login'
      ];
      
      let connectivitySuccess = false;
      let workingEndpoint = '';
      
      for (const endpoint of endpoints) {
        try {
          await this.log('info', `Testando conectividade com ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            connectivitySuccess = true;
            workingEndpoint = endpoint;
            await this.log('info', `Conectividade confirmada com ${endpoint}`);
            break;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          await this.log('warning', `Falha ao conectar com ${endpoint}: ${errorMsg}`);
        }
      }
      
      if (!connectivitySuccess) {
        await this.log('error', 'Falha na conectividade com todos os endpoints UNIVEN');
        return {
          success: false,
          message: 'Site UNIVEN inacessível. Verifique sua conexão com a internet.',
          platform: 'UNIVEN',
          timestamp: new Date(),
          recommendation: 'Tente novamente em alguns minutos ou verifique se o site está funcionando.'
        };
      }
      
      await this.log('info', `Conectividade básica confirmada com UNIVEN (${workingEndpoint})`);
      
      // If no credentials provided, return success with guidance
      if (!username || !password) {
        await this.log('info', 'Teste de conectividade básica concluído com sucesso');
        return {
          success: true,
          message: 'Site UNIVEN acessível. Para melhor resultado, faça login manualmente no navegador antes de usar automações.',
          platform: 'UNIVEN',
          timestamp: new Date(),
          recommendation: 'Abra https://univenweb.com.br em outra aba, faça login, e depois use as automações.'
        };
      }
      
      // If credentials provided, attempt basic login validation
      await this.log('info', 'Tentando validar credenciais via requisição básica');
      
      try {
        const loginResponse = await fetch(`${workingEndpoint}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          body: new URLSearchParams({
            username: username,
            password: password
          }).toString(),
          signal: AbortSignal.timeout(15000)
        });

        if (loginResponse.ok) {
          await this.log('info', 'Login realizado com sucesso');
          return {
            success: true,
            message: 'Credenciais validadas com sucesso no UNIVEN.',
            platform: 'UNIVEN',
            timestamp: new Date()
          };
        } else {
          await this.log('warning', `Falha no login: ${loginResponse.status}`);
          return {
            success: false,
            message: 'Credenciais inválidas ou erro no login.',
            platform: 'UNIVEN',
            timestamp: new Date(),
            recommendation: 'Verifique suas credenciais e tente novamente.'
          };
        }
      } catch (loginError) {
        const errorMsg = loginError instanceof Error ? loginError.message : 'Erro desconhecido';
        await this.log('warning', `Erro na validação de credenciais: ${errorMsg}`);
        return {
          success: true,
          message: 'Site UNIVEN acessível, mas não foi possível validar credenciais automaticamente. Recomendamos login manual.',
          platform: 'UNIVEN',
          timestamp: new Date(),
          recommendation: 'Faça login manualmente no navegador para melhor compatibilidade.'
        };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.log('error', `Erro geral no teste UNIVEN: ${errorMsg}`);
      
      return {
        success: false,
        message: `Erro no teste de conectividade UNIVEN: ${errorMsg}`,
        platform: 'UNIVEN',
        timestamp: new Date()
      };
    }
  }

  async testOlxConnection(email?: string, password?: string): Promise<ConnectivityTestResult> {
    try {
      await this.log('info', 'Iniciando teste de conectividade OLX Pro');
      
      const response = await fetch('https://pro.olx.com.br/', {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        await this.log('info', 'OLX Pro acessível');
        return {
          success: true,
          message: 'OLX Pro está acessível. Recomendamos verificar credenciais fazendo login manual.',
          platform: 'OLX Pro',
          timestamp: new Date(),
          recommendation: 'Faça login manualmente no OLX Pro para verificar suas credenciais.'
        };
      } else {
        await this.log('warning', `OLX Pro retornou status ${response.status}`);
        return {
          success: false,
          message: `OLX Pro inacessível (Status: ${response.status})`,
          platform: 'OLX Pro',
          timestamp: new Date()
        };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      await this.log('error', `Erro no teste OLX: ${errorMsg}`);
      
      return {
        success: false,
        message: `Erro no teste de conectividade OLX Pro: ${errorMsg}`,
        platform: 'OLX Pro',
        timestamp: new Date()
      };
    }
  }
}