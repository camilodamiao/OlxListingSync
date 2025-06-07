import { useLocation } from "wouter";

const pageNames: Record<string, string> = {
  "/": "Automação de Anúncios",
  "/automation": "Automação de Anúncios",
  "/dashboard": "Dashboard",
  "/configuration": "Configurações",
  "/logs": "Logs do Sistema",
};

const pageDescriptions: Record<string, string> = {
  "/": "Automatize a criação de anúncios do UNIVEN para o OLX Pro",
  "/automation": "Automatize a criação de anúncios do UNIVEN para o OLX Pro",
  "/dashboard": "Visualize estatísticas e progresso das automações",
  "/configuration": "Configure códigos OLX e parâmetros do sistema",
  "/logs": "Monitore logs e atividades do sistema",
};

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {pageNames[location] || "ImobiliBot"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pageDescriptions[location] || "Sistema de automação de anúncios"}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span className="text-sm text-muted-foreground">UNIVEN</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span className="text-sm text-muted-foreground">OLX Pro</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
