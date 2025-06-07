import { useLocation } from "wouter";
import { Link } from "wouter";
import { Bot, Play, BarChart, Settings, FileText, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Automação", href: "/automation", icon: Play },
  { name: "Dashboard", href: "/dashboard", icon: BarChart },
  { name: "Configurações", href: "/configuration", icon: Settings },
  { name: "Conectividade", href: "/connectivity", icon: Wifi },
  { name: "Logs", href: "/logs", icon: FileText },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-card shadow-lg border-r border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="text-primary-foreground text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ImobiliBot</h1>
            <p className="text-sm text-muted-foreground">Automação de Anúncios</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href === "/automation" && location === "/");
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
