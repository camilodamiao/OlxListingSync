# ImobiliBot - Sistema de Automação UNIVEN para OLX Pro

Plataforma de automação para corretores imobiliários que transfere automaticamente propriedades do UNIVEN para o OLX Pro, otimizando a gestão de códigos e simplificando processos.

## 🚀 Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL + Drizzle ORM
- **Automação**: Puppeteer para navegação automatizada
- **UI**: Tailwind CSS + shadcn/ui
- **Hospedagem**: Replit (desenvolvimento)

## 📋 Funcionalidades

### ✅ Implementadas
- Sistema de conectividade robusto sem dependência de browser automation
- Interface de teste de conectividade UNIVEN e OLX Pro
- Gerenciamento de códigos OLX (40 códigos por corretor, 20 destacáveis)
- Sistema de logs detalhado
- Dashboard com métricas de automação
- Configurações personalizáveis

### 🔄 Em Desenvolvimento
- Automação completa de transferência de propriedades
- Sistema de detecção de sessão ativa
- Analytics de performance de listings
- Correlação manual entre códigos UNIVEN e OLX

## 🛠️ Instalação e Execução

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npm run db:push

# Iniciar desenvolvimento
npm run dev
```

## 📁 Estrutura do Projeto

```
├── client/src/           # Frontend React
│   ├── components/       # Componentes reutilizáveis
│   ├── pages/           # Páginas da aplicação
│   ├── hooks/           # Hooks personalizados
│   └── lib/             # Utilitários e configurações
├── server/              # Backend Express
│   ├── routes.ts        # Rotas da API
│   ├── storage.ts       # Camada de dados
│   ├── automation.ts    # Serviço de automação
│   └── connectivity-test.ts # Testes de conectividade
├── shared/              # Código compartilhado
│   └── schema.ts        # Esquemas do banco de dados
└── docs/                # Documentação do projeto
```

## 🔧 Configuração

### Variáveis de Ambiente
```
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=imobilibot
```

### Banco de Dados
O projeto usa PostgreSQL com Drizzle ORM. As tabelas principais:
- `automations` - Registros de automações
- `brokers` - Dados dos corretores
- `olx_codes` - Códigos OLX disponíveis
- `system_logs` - Logs do sistema
- `settings` - Configurações da aplicação

## 📊 Recursos Principais

### Conectividade Inteligente
- Teste de conectividade sem browser automation
- Validação de credenciais UNIVEN e OLX Pro
- Fallback robusto para ambientes restritivos

### Gerenciamento de Códigos
- 40 códigos OLX por corretor
- 20 códigos destacáveis para melhor ranking
- Sistema de correlação com propriedades UNIVEN

### Dashboard Analytics
- Métricas de automações realizadas
- Performance de listings
- Tempo economizado
- Taxa de sucesso

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🔗 Links Úteis

- [UNIVEN](https://univenweb.com.br) - Sistema de gestão imobiliária
- [OLX Pro](https://pro.olx.com.br) - Plataforma de anúncios profissionais
- [Documentação Drizzle](https://orm.drizzle.team) - ORM TypeScript

## 📞 Suporte

Para suporte e dúvidas, entre em contato através do repositório GitHub.