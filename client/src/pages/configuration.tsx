import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Plus, CheckCircle, RotateCcw, Save } from "lucide-react";

export default function ConfigurationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brokers } = useQuery({
    queryKey: ['/api/brokers'],
  });

  const { data: olxCodes } = useQuery({
    queryKey: ['/api/olx-codes'],
  });

  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });

  const [selectedBrokerId, setSelectedBrokerId] = useState<number>(1);
  const [newOlxCode, setNewOlxCode] = useState('');

  // Get setting values
  const getSettingValue = (key: string, defaultValue: any) => {
    const setting = Array.isArray(settings) ? settings.find((s: any) => s.key === key) : null;
    return setting ? setting.value : defaultValue;
  };

  // Filter and sort codes for the selected broker
  const brokerCodes = Array.isArray(olxCodes) ? 
    olxCodes
      .filter((code: any) => code.brokerId === selectedBrokerId)
      .sort((a: any, b: any) => {
        // Priority: highlighted first, then used, then available
        if (a.isHighlighted && !b.isHighlighted) return -1;
        if (!a.isHighlighted && b.isHighlighted) return 1;
        if (a.isUsed && !b.isUsed) return -1;
        if (!a.isUsed && b.isUsed) return 1;
        return a.code.localeCompare(b.code);
      }) : [];
  
  const availableCodes = brokerCodes.filter((code: any) => !code.isUsed);
  const highlightedCodes = brokerCodes.filter((code: any) => code.isHighlighted);
  const totalCodes = brokerCodes.length;

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const response = await apiRequest('PUT', `/api/settings/${key}`, { value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });

  const addOlxCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/olx-codes', { 
        code, 
        brokerId: selectedBrokerId 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/olx-codes'] });
      setNewOlxCode('');
      toast({ title: "Código OLX adicionado com sucesso!" });
    },
    onError: () => {
      toast({ 
        title: "Erro ao adicionar código OLX",
        variant: "destructive" 
      });
    },
  });

  const toggleHighlightMutation = useMutation({
    mutationFn: async ({ id, isHighlighted }: { id: number; isHighlighted: boolean }) => {
      const response = await apiRequest('PUT', `/api/olx-codes/${id}`, { isHighlighted });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/olx-codes'] });
      toast({ title: "Status de destaque atualizado!" });
    },
    onError: () => {
      toast({ 
        title: "Erro ao atualizar destaque", 
        description: "Tente novamente.",
        variant: "destructive" 
      });
    },
  });

  const toggleUsedMutation = useMutation({
    mutationFn: async ({ id, isUsed, univenCode }: { id: number; isUsed: boolean; univenCode?: string }) => {
      const payload: any = { isUsed };
      if (univenCode !== undefined) {
        payload.univenCode = univenCode;
      }
      const response = await apiRequest('PUT', `/api/olx-codes/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/olx-codes'] });
      toast({ title: "Status do código atualizado!" });
    },
    onError: () => {
      toast({ 
        title: "Erro ao atualizar código", 
        description: "Tente novamente.",
        variant: "destructive" 
      });
    },
  });

  const deleteOlxCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/olx-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/olx-codes'] });
      toast({ title: "Código OLX removido com sucesso!" });
    },
  });

  const handleSettingChange = (key: string, value: any) => {
    updateSettingMutation.mutate({ key, value });
  };

  const handleSaveSettings = () => {
    toast({ title: "Configurações salvas com sucesso!" });
  };

  const handleResetSettings = () => {
    // Reset to default values
    const defaults = [
      { key: 'autoRetry', value: true },
      { key: 'downloadPhotos', value: true },
      { key: 'notifications', value: false },
      { key: 'actionDelay', value: 3 },
      { key: 'browserType', value: 'chrome' },
      { key: 'headless', value: false },
    ];

    defaults.forEach(({ key, value }) => {
      updateSettingMutation.mutate({ key, value });
    });

    toast({ title: "Configurações restauradas para os valores padrão!" });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="max-w-none">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* OLX Codes Configuration */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Gerenciar Códigos de Anúncio OLX</h4>
              <p className="text-sm text-muted-foreground mb-6">
                Seus códigos únicos para publicar imóveis no OLX Pro. Você pode destacar até 20 códigos para melhor posicionamento.
              </p>

              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">📋</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700">{totalCodes}</div>
                      <div className="text-sm text-blue-600">Códigos Totais</div>
                      <div className="text-xs text-blue-500">Todos os seus códigos</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✅</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700">{availableCodes.length}</div>
                      <div className="text-sm text-green-600">Disponíveis</div>
                      <div className="text-xs text-green-500">Prontos para usar</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-bold">⭐</span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-700">{highlightedCodes.length}/20</div>
                      <div className="text-sm text-amber-600">Destacados</div>
                      <div className="text-xs text-amber-500">Melhor posição</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-500 mt-0.5">💡</div>
                  <div>
                    <h5 className="font-medium text-blue-900 mb-1">Como funciona:</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Cada código permite publicar 1 anúncio por vez</li>
                      <li>• Códigos destacados (⭐) aparecem primeiro nas buscas</li>
                      <li>• Quando um código está "Em uso", não pode ser usado para outro anúncio</li>
                      <li>• Você pode destacar até 20 códigos simultaneamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Code Management */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="font-medium text-foreground">Seus Códigos ({brokerCodes.length}/40)</h5>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const availableToHighlight = brokerCodes
                          .filter((code: any) => !code.isUsed && !code.isHighlighted)
                          .slice(0, 20 - highlightedCodes.length);
                        
                        availableToHighlight.forEach((code: any) => {
                          toggleHighlightMutation.mutate({
                            id: code.id,
                            isHighlighted: true
                          });
                        });
                      }}
                      disabled={highlightedCodes.length >= 20}
                    >
                      Destacar disponíveis
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        highlightedCodes.forEach((code: any) => {
                          toggleHighlightMutation.mutate({
                            id: code.id,
                            isHighlighted: false
                          });
                        });
                      }}
                      disabled={highlightedCodes.length === 0}
                    >
                      Limpar destaques
                    </Button>
                  </div>
                </div>
                
                {/* Code List */}
                <div className="border rounded-lg overflow-hidden w-full">
                  <div className="max-h-80 overflow-y-auto overflow-x-auto">
                    <table className="w-full min-w-full table-auto">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            Código OLX
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Código UNIVEN
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {brokerCodes.map((code: any) => (
                          <tr key={code.id} className={`transition-colors hover:bg-gray-50 ${
                            code.isHighlighted ? 'bg-amber-50 border-l-4 border-l-amber-400' : 
                            code.isUsed ? 'bg-red-50 border-l-4 border-l-red-400' : 'bg-white hover:bg-gray-25'
                          }`}>
                            <td className="py-4 px-4">
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                {code.code}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {code.isUsed && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                    🔒 Em uso
                                  </span>
                                )}
                                {code.isHighlighted && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                    ⭐ Destaque
                                  </span>
                                )}
                                {!code.isUsed && !code.isHighlighted && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    ✅ Disponível
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Ex: 2807022638"
                                  value={code.univenCode || ''}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    // Debounce the update
                                    setTimeout(() => {
                                      toggleUsedMutation.mutate({
                                        id: code.id,
                                        isUsed: code.isUsed,
                                        univenCode: newValue
                                      });
                                    }, 500);
                                  }}
                                  className="w-36 h-9 text-sm font-mono"
                                  disabled={!code.isUsed}
                                />
                                {!code.isUsed && (
                                  <span className="text-xs text-gray-400 italic">
                                    Apenas para códigos em uso
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleHighlightMutation.mutate({
                                    id: code.id,
                                    isHighlighted: !code.isHighlighted
                                  })}
                                  className="h-9 w-9 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-100 border border-amber-200"
                                  title={code.isHighlighted ? "Remover destaque" : "Destacar código"}
                                >
                                  {code.isHighlighted ? "★" : "☆"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUsedMutation.mutate({
                                    id: code.id,
                                    isUsed: !code.isUsed
                                  })}
                                  className={`h-9 w-9 p-0 border ${code.isUsed ? "text-green-600 hover:text-green-700 hover:bg-green-100 border-green-200" : "text-red-600 hover:text-red-700 hover:bg-red-100 border-red-200"}`}
                                  title={code.isUsed ? "Marcar como disponível" : "Marcar como em uso"}
                                >
                                  {code.isUsed ? "🔓" : "🔒"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteOlxCodeMutation.mutate(code.id)}
                                  className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 border border-red-200"
                                  title="Remover código"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Add new code */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-medium">Adicionar novo código</Label>
                  {totalCodes >= 40 && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      Limite de 40 códigos atingido
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: HA00099"
                    value={newOlxCode}
                    onChange={(e) => setNewOlxCode(e.target.value.toUpperCase())}
                    className="font-mono"
                    disabled={totalCodes >= 40}
                  />
                  <Button
                    onClick={() => addOlxCodeMutation.mutate(newOlxCode)}
                    disabled={!newOlxCode || addOlxCodeMutation.isPending || totalCodes >= 40}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {totalCodes >= 40 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Você atingiu o limite máximo de 40 códigos por corretor. Remova um código existente para adicionar um novo.
                  </p>
                )}
              </div>
            </div>

            {/* Automation Settings */}
            <div>
              <h4 className="text-md font-medium text-foreground mb-4">Configurações de Automação</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-retry" className="text-sm text-foreground">
                    Tentar novamente automaticamente em caso de erro
                  </Label>
                  <Switch
                    id="auto-retry"
                    checked={getSettingValue('autoRetry', true)}
                    onCheckedChange={(checked) => handleSettingChange('autoRetry', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="download-photos" className="text-sm text-foreground">
                    Fazer download automático de fotos
                  </Label>
                  <Switch
                    id="download-photos"
                    checked={getSettingValue('downloadPhotos', true)}
                    onCheckedChange={(checked) => handleSettingChange('downloadPhotos', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="text-sm text-foreground">
                    Notificações do sistema
                  </Label>
                  <Switch
                    id="notifications"
                    checked={getSettingValue('notifications', false)}
                    onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="delay" className="block text-sm font-medium text-foreground mb-2">
                    Delay entre ações (segundos)
                  </Label>
                  <Input
                    id="delay"
                    type="number"
                    min="1"
                    max="10"
                    value={getSettingValue('actionDelay', 3)}
                    onChange={(e) => handleSettingChange('actionDelay', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={handleResetSettings}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
              <Button onClick={handleSaveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Browser Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Navegador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="browser-type" className="block text-sm font-medium text-foreground mb-2">
                  Navegador
                </Label>
                <Select
                  value={getSettingValue('browserType', 'chrome')}
                  onValueChange={(value) => handleSettingChange('browserType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chrome">Google Chrome</SelectItem>
                    <SelectItem value="firefox">Mozilla Firefox</SelectItem>
                    <SelectItem value="edge">Microsoft Edge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="headless" className="text-sm text-foreground">
                  Modo headless (oculto)
                </Label>
                <Switch
                  id="headless"
                  checked={getSettingValue('headless', false)}
                  onCheckedChange={(checked) => handleSettingChange('headless', checked)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">Status das Conexões</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                    <span className="text-sm text-foreground">UNIVEN</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <span className="h-3 w-3 mr-1">?</span>
                      Não testado
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                    <span className="text-sm text-foreground">OLX Pro</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <span className="h-3 w-3 mr-1">?</span>
                      Não testado
                    </span>
                  </div>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    <strong>Importante:</strong> Para testar conectividade real, use a página "Conectividade" no menu lateral. 
                    Esta seção mostra apenas configurações do sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
