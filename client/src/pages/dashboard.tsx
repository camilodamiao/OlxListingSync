import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, CheckCircle, Clock, TrendingUp, Eye, Heart, MessageCircle, Star, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: logs } = useQuery({
    queryKey: ['/api/logs?limit=10'],
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['/api/dashboard/listings'],
  });

  const collectListingsDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/dashboard/collect-listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Falha ao iniciar coleta de dados');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/listings'] });
      toast({
        title: "Coleta iniciada",
        description: "O sistema está coletando dados dos seus anúncios no OLX. Isso pode levar alguns minutos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao coletar dados",
        description: error.message || "Não foi possível iniciar a coleta de dados dos anúncios.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <Tabs defaultValue="automations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="automations" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm rounded-md"
          >
            Automações
          </TabsTrigger>
          <TabsTrigger 
            value="listings" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm rounded-md"
          >
            Performance dos Anúncios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-6">
          {/* Automation Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bot className="text-primary text-xl" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total de Automações</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalAutomations || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-green-600 text-xl" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Publicações Ativas</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.activeListings || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Clock className="text-purple-600 text-xl" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Tempo Economizado</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.timeSaved || "0h"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-orange-600 text-xl" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.successRate || "0%"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente das Automações</CardTitle>
            </CardHeader>
            <CardContent>
              {logs && logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center space-x-4 border-b pb-4 last:border-b-0 last:pb-0">
                      <div className={`w-2 h-2 rounded-full ${
                        log.level === 'error' ? 'bg-red-500' : 
                        log.level === 'warning' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma atividade recente encontrada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-6">
          {listingsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : listings?.message === "OLX API integration required" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance dos Anúncios
                  </div>
                  <Button
                    onClick={() => collectListingsDataMutation.mutate()}
                    disabled={collectListingsDataMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${collectListingsDataMutation.isPending ? 'animate-spin' : ''}`} />
                    {collectListingsDataMutation.isPending ? 'Coletando...' : 'Atualizar Dados'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Eye className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Coleta de Dados via Automação</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Clique em "Atualizar Dados" para que o sistema acesse automaticamente seus anúncios no OLX 
                      e colete informações de performance (visualizações, contatos, favoritos).
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Códigos Configurados:</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      {listings?.usedCodes || 0} códigos em uso com correlação UNIVEN
                    </p>
                    
                    {listings?.codes && listings.codes.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {listings.codes.map((code: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                            <span className="font-mono">{code.olxCode}</span>
                            <span className="text-gray-600">→ {code.univenCode}</span>
                            {code.isHighlighted && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Destaque
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Como funciona:</strong> O sistema abrirá o navegador automaticamente, fará login no OLX, 
                      navegará pelos seus anúncios e coletará os dados de performance. Este processo pode levar alguns minutos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando dados dos anúncios...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}