# Guia de Transferência para GitHub

## Passos para criar o repositório no GitHub:

### 1. Criar repositório no GitHub
1. Vá para https://github.com/new
2. Nome do repositório: `imobilibot-automation`
3. Descrição: `Sistema de automação UNIVEN para OLX Pro - Transferência automatizada de listings imobiliários`
4. Deixe como **Público** (para facilitar integrações)
5. **NÃO** marque "Add a README file" (já temos um)
6. Clique em "Create repository"

### 2. Arquivos principais do projeto

Copie estes arquivos/pastas do Replit para o GitHub:

```
Arquivos de configuração:
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json
├── drizzle.config.ts
├── README.md
├── .gitignore

Código fonte:
├── client/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── pages/
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   ├── automation.ts
│   ├── connectivity-test.ts
│   ├── vite.ts
│   └── db.ts
└── shared/
    └── schema.ts
```

### 3. Comandos Git (execute no terminal local)

```bash
# Clonar o repositório vazio
git clone https://github.com/SEU_USUARIO/imobilibot-automation.git
cd imobilibot-automation

# Copiar todos os arquivos do projeto aqui

# Adicionar arquivos
git add .

# Fazer o primeiro commit
git commit -m "Initial commit: ImobiliBot automation system"

# Enviar para GitHub
git push origin main
```

### 4. Após upload no GitHub

O repositório estará disponível para:

#### Hospedagem alternativa:
- **Vercel**: Conecte o GitHub repo para deploy automático
- **Railway**: Import from GitHub, adicione PostgreSQL
- **Render**: Deploy from GitHub com banco gratuito
- **Fly.io**: Deploy via CLI conectado ao repo

#### Desenvolvimento:
- **GitHub Codespaces**: Ambiente completo na nuvem
- **GitPod**: IDE online com melhor suporte a Puppeteer

### 5. Configuração de ambiente

Arquivo `.env` exemplo para outras plataformas:
```
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
PORT=3000
```

### 6. Scripts de deploy

Para Railway/Render, adicione ao `package.json`:
```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "tsc server/index.ts --outDir dist",
    "start": "node dist/index.js",
    "dev": "npm run dev",
    "db:push": "drizzle-kit push:pg"
  }
}
```

O GitHub permitirá usar GitHub Actions para CI/CD automático e integração com múltiplas plataformas de hospedagem.