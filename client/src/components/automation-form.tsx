import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, Eye, Search } from "lucide-react";

export default function AutomationForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    propertyCode: "",
    olxCode: "",
    videoUrl: "",
    tourUrl: "",
  });

  const { data: olxCodes } = useQuery({
    queryKey: ['/api/olx-codes'],
  });

  const createAutomationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/automations', {
        propertyCode: data.propertyCode,
        olxCode: data.olxCode,
        status: 'pending',
        progress: 0,
        videoUrl: data.videoUrl || null,
        tourUrl: data.tourUrl || null,
        propertyData: null,
        errorMessage: null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automations'] });
      setFormData({ propertyCode: "", olxCode: "", videoUrl: "", tourUrl: "" });
      toast({ title: "Automação iniciada com sucesso!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao iniciar automação",
        description: error.message || "Tente novamente",
        variant: "destructive" 
      });
    },
  });

  const previewPropertyMutation = useMutation({
    mutationFn: async (propertyCode: string) => {
      const response = await apiRequest('POST', '/api/preview-property', { propertyCode });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Prévia carregada com sucesso!" });
      } else {
        toast({ 
          title: "Prévia não disponível",
          description: data.message,
          variant: "destructive" 
        });
      }
    },
    onError: () => {
      toast({ 
        title: "Erro ao carregar prévia",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.propertyCode || !formData.olxCode) {
      toast({ 
        title: "Campos obrigatórios",
        description: "Preencha o código do imóvel e selecione o código OLX",
        variant: "destructive" 
      });
      return;
    }

    createAutomationMutation.mutate(formData);
  };

  const handlePreview = () => {
    if (!formData.propertyCode) {
      toast({ 
        title: "Código obrigatório",
        description: "Digite o código do imóvel para visualizar a prévia",
        variant: "destructive" 
      });
      return;
    }

    previewPropertyMutation.mutate(formData.propertyCode);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Automação</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Code Input */}
          <div>
            <Label htmlFor="property-code">Código do Imóvel</Label>
            <div className="relative mt-2">
              <Input
                id="property-code"
                type="text"
                placeholder="Ex: AP1026, CA1347, PT1256"
                value={formData.propertyCode}
                onChange={(e) => setFormData(prev => ({ ...prev, propertyCode: e.target.value.toUpperCase() }))}
                className="font-mono pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digite o código de referência do imóvel no UNIVEN
            </p>
          </div>

          {/* OLX Code Selection */}
          <div>
            <Label htmlFor="olx-code">Código OLX do Corretor</Label>
            <Select value={formData.olxCode} onValueChange={(value) => setFormData(prev => ({ ...prev, olxCode: value }))}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione o código OLX" />
              </SelectTrigger>
              <SelectContent>
                {olxCodes?.map((code: any) => (
                  <SelectItem key={code.id} value={code.code}>
                    {code.code} - {code.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SEO Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="video-url">URL do Vídeo</Label>
              <Input
                id="video-url"
                type="url"
                placeholder="https://youtube.com/..."
                value={formData.videoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="tour-url">URL do Tour Virtual</Label>
              <Input
                id="tour-url"
                type="url"
                placeholder="https://tour.com/..."
                value={formData.tourUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, tourUrl: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={createAutomationMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {createAutomationMutation.isPending ? "Iniciando..." : "Iniciar Automação"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={previewPropertyMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewPropertyMutation.isPending ? "Carregando..." : "Prévia"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
