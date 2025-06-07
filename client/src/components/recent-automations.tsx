import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, RotateCcw, X } from "lucide-react";

export default function RecentAutomations() {
  const { data: automations, isLoading } = useQuery({
    queryKey: ['/api/automations'],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
            Publicado
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <span className="w-2 h-2 bg-yellow-600 rounded-full mr-1 animate-pulse"></span>
            Processando
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <span className="w-2 h-2 bg-red-600 rounded-full mr-1"></span>
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
            Pendente
          </Badge>
        );
    }
  };

  const getPropertyType = (code: string) => {
    if (code.startsWith('AP')) return 'Apartamento';
    if (code.startsWith('CA')) return 'Casa';
    if (code.startsWith('PT')) return 'Apartamento';
    return 'Imóvel';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/20 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Automações Recentes</CardTitle>
          <Button variant="ghost" size="sm">
            Ver todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {automations && automations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/20">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Corretor OLX
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {automations.slice(0, 10).map((automation: any) => (
                  <tr key={automation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                      {automation.propertyCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {getPropertyType(automation.propertyCode)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {automation.olxCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(automation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(automation.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {automation.status === 'failed' ? (
                          <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : automation.status === 'processing' ? (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-accent hover:text-accent">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma automação encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Inicie sua primeira automação para ver os resultados aqui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
