import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Loader2, Globe, Shield, AlertCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const univenCredentialsSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const olxCredentialsSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type UnivenCredentials = z.infer<typeof univenCredentialsSchema>;
type OlxCredentials = z.infer<typeof olxCredentialsSchema>;

export default function ConnectivityPage() {
  const { toast } = useToast();
  const [univenResult, setUnivenResult] = useState<any>(null);
  const [olxResult, setOlxResult] = useState<any>(null);

  const univenForm = useForm<UnivenCredentials>({
    resolver: zodResolver(univenCredentialsSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const olxForm = useForm<OlxCredentials>({
    resolver: zodResolver(olxCredentialsSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const testUnivenMutation = useMutation({
    mutationFn: async (credentials: UnivenCredentials) => {
      const response = await fetch('/api/test-univen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        throw new Error('Falha ao testar conexão');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUnivenResult(data);
      toast({
        title: data.success ? "Teste bem-sucedido" : "Teste falhado",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message || "Erro ao testar conexão UNIVEN",
        variant: "destructive",
      });
    },
  });

  const testOlxMutation = useMutation({
    mutationFn: async (credentials: OlxCredentials) => {
      const response = await fetch('/api/test-olx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        throw new Error('Falha ao testar conexão');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setOlxResult(data);
      toast({
        title: data.success ? "Teste bem-sucedido" : "Teste falhado",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message || "Erro ao testar conexão OLX Pro",
        variant: "destructive",
      });
    },
  });

  // Session check mutation (without credentials)
  const testSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/test-univen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error('Falha ao verificar sessão');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setUnivenResult(data);
      toast({
        title: data.success ? "Sessão ativa detectada" : "Nenhuma sessão ativa",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na verificação",
        description: error.message || "Erro ao verificar sessão UNIVEN",
        variant: "destructive",
      });
    },
  });

  const onUnivenSubmit = (data: UnivenCredentials) => {
    testUnivenMutation.mutate(data);
  };

  const onOlxSubmit = (data: OlxCredentials) => {
    testOlxMutation.mutate(data);
  };

  const TestResult = ({ result, platform }: { result: any; platform: string }) => {
    if (!result) return null;

    return (
      <div className={`p-4 rounded-lg border ${
        result.success 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={`font-medium ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.success ? 'Conexão Estabelecida' : 'Falha na Conexão'}
          </span>
        </div>
        <p className={`text-sm ${
          result.success ? 'text-green-700' : 'text-red-700'
        }`}>
          {result.message}
        </p>
        {result.timestamp && (
          <p className="text-xs text-gray-500 mt-2">
            Testado em: {new Date(result.timestamp).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Teste de Conectividade</h2>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Sistema de Conectividade Aprimorado</h3>
            <div className="text-sm text-blue-700 mt-1 space-y-2">
              <p><strong>Recomendado:</strong> Faça login manual no UNIVEN no seu navegador primeiro.</p>
              <p><strong>Teste Rápido:</strong> Use "Testar Conectividade" para verificar acesso ao site.</p>
              <p><strong>Com Credenciais:</strong> Valide automaticamente suas credenciais de login.</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="univen" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="univen" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm rounded-md"
          >
            UNIVEN
          </TabsTrigger>
          <TabsTrigger 
            value="olx" 
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm rounded-md"
          >
            OLX Pro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="univen">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Teste de Conexão UNIVEN
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Session Check */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Verificação de Conectividade</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Testa acesso ao UNIVEN e fornece orientações para login manual
                    </p>
                  </div>
                  <Button
                    onClick={() => testSessionMutation.mutate()}
                    disabled={testSessionMutation.isPending}
                    variant="outline"
                    className="shrink-0"
                  >
                    {testSessionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Testar Conectividade
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Ou teste com credenciais</span>
                </div>
              </div>

              <form onSubmit={univenForm.handleSubmit(onUnivenSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="univen-username">Usuário UNIVEN</Label>
                    <Input
                      id="univen-username"
                      type="text"
                      placeholder="Seu usuário UNIVEN"
                      {...univenForm.register("username")}
                      disabled={testUnivenMutation.isPending}
                    />
                    {univenForm.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {univenForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="univen-password">Senha UNIVEN</Label>
                    <Input
                      id="univen-password"
                      type="password"
                      placeholder="Sua senha UNIVEN"
                      {...univenForm.register("password")}
                      disabled={testUnivenMutation.isPending}
                    />
                    {univenForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {univenForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={testUnivenMutation.isPending}
                  className="w-full"
                >
                  {testUnivenMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando Conexão...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Testar Conexão UNIVEN
                    </>
                  )}
                </Button>
              </form>

              <TestResult result={univenResult} platform="UNIVEN" />

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">O que será testado:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Conectividade básica com site UNIVEN (univenweb.com.br)</li>
                  <li>• Se credenciais fornecidas: tentativa de login automático</li>
                  <li>• Se sem credenciais: apenas verifica se site está acessível</li>
                  <li>• Retorna orientações baseadas no resultado</li>
                </ul>
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Recomendação:</strong> Para maior confiabilidade, faça login manualmente no site antes de usar automações.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="olx">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Teste de Conexão OLX Pro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={olxForm.handleSubmit(onOlxSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="olx-email">Email OLX Pro</Label>
                    <Input
                      id="olx-email"
                      type="email"
                      placeholder="Seu email do OLX Pro"
                      {...olxForm.register("email")}
                      disabled={testOlxMutation.isPending}
                    />
                    {olxForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {olxForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="olx-password">Senha OLX Pro</Label>
                    <Input
                      id="olx-password"
                      type="password"
                      placeholder="Sua senha do OLX Pro"
                      {...olxForm.register("password")}
                      disabled={testOlxMutation.isPending}
                    />
                    {olxForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {olxForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={testOlxMutation.isPending}
                  className="w-full"
                >
                  {testOlxMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando Conexão...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Testar Conexão OLX Pro
                    </>
                  )}
                </Button>
              </form>

              <TestResult result={olxResult} platform="OLX Pro" />

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">O que será testado:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Conectividade básica com site OLX (olx.com.br)</li>
                  <li>• Se credenciais fornecidas: tentativa de login automático</li>
                  <li>• Se sem credenciais: apenas verifica se site está acessível</li>
                  <li>• Retorna orientações baseadas no resultado</li>
                </ul>
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Recomendação:</strong> Para maior confiabilidade, faça login manualmente no site antes de usar automações.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Importante sobre Segurança</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Suas credenciais são usadas apenas para teste de conectividade e não são armazenadas no sistema. 
              O teste é feito em tempo real e as informações são descartadas após a verificação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}