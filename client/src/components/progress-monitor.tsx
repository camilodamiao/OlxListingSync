import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2 } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

const steps = [
  { key: "connecting_univen", label: "Conectando ao UNIVEN", step: 1 },
  { key: "extracting_data", label: "Extraindo dados do imóvel", step: 2 },
  { key: "downloading_photos", label: "Download de fotos", step: 3 },
  { key: "connecting_olx", label: "Conectando ao OLX Pro", step: 4 },
  { key: "creating_listing", label: "Criando anúncio no OLX Pro", step: 5 },
  { key: "finalizing", label: "Finalizando publicação", step: 6 },
];

export default function ProgressMonitor() {
  const { data: automations } = useQuery({
    queryKey: ['/api/automations?limit=1'],
  });

  const { lastMessage } = useWebSocket();

  const currentAutomation = automations?.[0];
  const isProcessing = currentAutomation?.status === 'processing';
  const currentStep = currentAutomation?.currentStep;
  const progress = currentAutomation?.progress || 0;

  // Get current log from WebSocket or fallback
  const getCurrentLog = () => {
    if (lastMessage?.type === 'log') {
      return lastMessage.data.message;
    }
    if (currentAutomation && isProcessing) {
      return `Processando automação para ${currentAutomation.propertyCode}...`;
    }
    return "Aguardando nova automação...";
  };

  const getStepStatus = (stepKey: string, stepNumber: number) => {
    if (!isProcessing || !currentStep) return "pending";
    
    const currentStepNumber = steps.find(s => s.key === currentStep)?.step || 0;
    
    if (stepNumber < currentStepNumber) return "completed";
    if (stepNumber === currentStepNumber) return "current";
    return "pending";
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-white" />;
      case "current":
        return <Loader2 className="h-4 w-4 text-white animate-spin" />;
      default:
        return <span className="text-muted-foreground text-sm font-medium">{steps.findIndex(s => s.key === status) + 1}</span>;
    }
  };

  const getStepStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-secondary";
      case "current":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  const getStepTextColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-secondary";
      case "current":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso da Automação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => {
            const status = getStepStatus(step.key, step.step);
            return (
              <div key={step.key} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepStyle(status)}`}>
                    {getStepIcon(status)}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  <p className={`text-xs ${getStepTextColor(status)}`}>
                    {status === "completed" ? "Concluído" : 
                     status === "current" ? "Em andamento..." : "Aguardando..."}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm font-medium text-foreground mb-2">
            <span>Progresso Geral</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Log */}
        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
          <p className="text-xs font-medium text-foreground mb-2">Log Atual:</p>
          <p className="text-xs text-muted-foreground font-mono">
            [{new Date().toLocaleTimeString('pt-BR')}] {getCurrentLog()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
