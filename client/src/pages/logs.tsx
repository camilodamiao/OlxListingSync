import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Download } from "lucide-react";

export default function LogsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logFilter, setLogFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ['/api/logs', logFilter],
    queryFn: async () => {
      const url = logFilter === "all" ? '/api/logs' : `/api/logs?level=${logFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/logs');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      toast({ title: "Logs limpos com sucesso!" });
    },
    onError: () => {
      toast({
        title: "Erro ao limpar logs",
        variant: "destructive"
      });
    },
  });

  const exportLogs = () => {
    if (!logs || logs.length === 0) {
      toast({
        title: "Nenhum log para exportar",
        variant: "destructive"
      });
      return;
    }

    const logData = logs.map((log: any) => ({
      timestamp: new Date(log.timestamp).toLocaleString('pt-BR'),
      level: log.level,
      message: log.message,
      automationId: log.automationId,
    }));

    const csvContent = [
      ['Timestamp', 'Level', 'Message', 'Automation ID'].join(','),
      ...logData.map((log: any) => [
        `"${log.timestamp}"`,
        log.level,
        `"${log.message}"`,
        log.automationId || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `imobilibot-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Logs exportados com sucesso!" });
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
      default:
        return 'text-blue-400';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return '[SUCCESS]';
      case 'error':
        return '[ERROR]';
      case 'warning':
        return '[WARNING]';
      case 'info':
      default:
        return '[INFO]';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logs do Sistema</CardTitle>
          <div className="flex items-center space-x-4">
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os logs</SelectItem>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearLogsMutation.mutate()}
              disabled={clearLogsMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={exportLogs}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-400">Carregando logs...</div>
          ) : logs && logs.length > 0 ? (
            logs.map((log: any) => (
              <div key={log.id} className="mb-2">
                <span className="text-gray-400">
                  [{new Date(log.timestamp).toLocaleString('pt-BR')}]
                </span>
                <span className={`ml-2 ${getLogColor(log.level)}`}>
                  {getLogIcon(log.level)}
                </span>
                <span className="ml-2">{log.message}</span>
                {log.automationId && (
                  <span className="ml-2 text-purple-400">
                    [Auto: {log.automationId}]
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400">Nenhum log encontrado</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
