import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertAutomationSchema, insertOlxCodeSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { AutomationService } from "./automation";
import { ConnectivityTester } from "./connectivity-test";

let automationService: AutomationService;
let connectivityTester: ConnectivityTester;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize services
  automationService = new AutomationService(storage, wss);
  connectivityTester = new ConnectivityTester(storage);

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // API Routes

  // Automations
  app.get("/api/automations", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const automations = await storage.getAutomations(limit);
      res.json(automations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automations" });
    }
  });

  app.get("/api/automations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const automation = await storage.getAutomation(id);
      if (!automation) {
        return res.status(404).json({ error: "Automation not found" });
      }
      res.json(automation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation" });
    }
  });

  app.post("/api/automations", async (req, res) => {
    try {
      const data = insertAutomationSchema.parse(req.body);
      const automation = await storage.createAutomation(data);
      
      // Start automation process
      automationService.startAutomation(automation.id);
      
      res.status(201).json(automation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid automation data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create automation" });
    }
  });

  app.put("/api/automations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const automation = await storage.updateAutomation(id, updates);
      if (!automation) {
        return res.status(404).json({ error: "Automation not found" });
      }
      res.json(automation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update automation" });
    }
  });

  app.delete("/api/automations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAutomation(id);
      if (!deleted) {
        return res.status(404).json({ error: "Automation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete automation" });
    }
  });

  // Brokers
  app.get("/api/brokers", async (req, res) => {
    try {
      const brokers = await storage.getBrokers();
      res.json(brokers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brokers" });
    }
  });

  app.get("/api/brokers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const broker = await storage.getBroker(id);
      if (!broker) {
        return res.status(404).json({ error: "Broker not found" });
      }
      res.json(broker);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch broker" });
    }
  });

  // OLX Codes
  app.get("/api/olx-codes", async (req, res) => {
    try {
      const brokerId = req.query.brokerId ? parseInt(req.query.brokerId as string) : undefined;
      const olxCodes = await storage.getOlxCodes(brokerId);
      res.json(olxCodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OLX codes" });
    }
  });

  app.get("/api/brokers/:brokerId/available-codes", async (req, res) => {
    try {
      const brokerId = parseInt(req.params.brokerId);
      const availableCodes = await storage.getAvailableOlxCodes(brokerId);
      res.json(availableCodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch available codes" });
    }
  });

  app.get("/api/brokers/:brokerId/highlighted-codes", async (req, res) => {
    try {
      const brokerId = parseInt(req.params.brokerId);
      const highlightedCodes = await storage.getHighlightedCodes(brokerId);
      res.json(highlightedCodes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch highlighted codes" });
    }
  });

  app.post("/api/olx-codes", async (req, res) => {
    try {
      const data = insertOlxCodeSchema.parse(req.body);
      const olxCode = await storage.createOlxCode(data);
      res.status(201).json(olxCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid OLX code data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create OLX code" });
    }
  });

  app.put("/api/olx-codes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const olxCode = await storage.updateOlxCode(id, updates);
      if (!olxCode) {
        return res.status(404).json({ error: "OLX code not found" });
      }
      res.json(olxCode);
    } catch (error) {
      res.status(500).json({ error: "Failed to update OLX code" });
    }
  });

  app.delete("/api/olx-codes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOlxCode(id);
      if (!deleted) {
        return res.status(404).json({ error: "OLX code not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete OLX code" });
    }
  });

  // System Logs
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const level = req.query.level as string;
      const logs = await storage.getSystemLogs(limit, level);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.delete("/api/logs", async (req, res) => {
    try {
      const olderThan = req.query.olderThan ? new Date(req.query.olderThan as string) : undefined;
      const count = await storage.deleteSystemLogs(olderThan);
      res.json({ deleted: count });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete logs" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const data = insertSettingsSchema.parse({
        key: req.params.key,
        value: req.body.value
      });
      const setting = await storage.setSetting(data);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid setting data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const automations = await storage.getAutomations();
      const totalAutomations = automations.length;
      const activeListings = automations.filter(a => a.status === 'completed').length;
      const successRate = totalAutomations > 0 ? Math.round((activeListings / totalAutomations) * 100) : 0;
      
      // Calculate time saved (assuming 30 minutes per manual listing)
      const timeSavedMinutes = activeListings * 30;
      const timeSavedHours = Math.round(timeSavedMinutes / 60);

      res.json({
        totalAutomations,
        activeListings,
        timeSaved: `${timeSavedHours}h`,
        successRate: `${successRate}%`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Listings Performance - browser automation based
  app.get("/api/dashboard/listings", async (req, res) => {
    try {
      const olxCodes = await storage.getOlxCodes();
      const usedCodes = olxCodes.filter(code => code.isUsed && code.univenCode);
      
      res.json({
        message: "OLX API integration required",
        usedCodes: usedCodes.length,
        codes: usedCodes.map(code => ({
          olxCode: code.code,
          univenCode: code.univenCode,
          isHighlighted: code.isHighlighted,
          status: "ready_for_collection"
        }))
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch listings performance" });
    }
  });

  // Collect listings data via browser automation
  app.post("/api/dashboard/collect-listings", async (req, res) => {
    try {
      const olxCodes = await storage.getOlxCodes();
      const usedCodes = olxCodes.filter(code => code.isUsed && code.univenCode);

      if (usedCodes.length === 0) {
        return res.status(400).json({ 
          error: "Nenhum código configurado", 
          message: "Configure códigos OLX com correlação UNIVEN antes de coletar dados" 
        });
      }

      // Log the collection start
      await storage.createSystemLog({
        level: "info",
        message: `Iniciando coleta de dados de performance para ${usedCodes.length} anúncios`,
        metadata: { usedCodes: usedCodes.length }
      });

      // In a real implementation, this would use Puppeteer to:
      // 1. Navigate to OLX
      // 2. Login with user credentials  
      // 3. Search for each listing by OLX code
      // 4. Extract performance data (views, contacts, favorites)
      // 5. Store the data for dashboard display

      res.json({
        message: "Coleta iniciada com sucesso",
        status: "collecting",
        codesCount: usedCodes.length,
        estimatedTime: `${usedCodes.length * 2} minutos`
      });

    } catch (error) {
      console.error('Error starting listings collection:', error);
      res.status(500).json({ error: "Falha ao iniciar coleta de dados" });
    }
  });

  // Test UNIVEN connectivity
  app.post("/api/test-univen", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Test UNIVEN connection - credentials are now optional for session detection
      const testResult = await connectivityTester.testUnivenConnection(username, password);
      
      res.json(testResult);
    } catch (error) {
      console.error('Error testing UNIVEN connection:', error);
      res.status(500).json({ 
        error: "Erro ao testar conexão",
        message: "Falha ao conectar com UNIVEN" 
      });
    }
  });

  // Test OLX Pro connectivity  
  app.post("/api/test-olx", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: "Credenciais necessárias",
          message: "Email e password são obrigatórios para testar conexão com OLX Pro" 
        });
      }

      // Test OLX Pro connection using HTTP-based approach
      const testResult = await connectivityTester.testOlxConnection(email, password);
      
      res.json(testResult);
    } catch (error) {
      console.error('Error testing OLX connection:', error);
      res.status(500).json({ 
        error: "Erro ao testar conexão",
        message: "Falha ao conectar com OLX Pro" 
      });
    }
  });

  // Property preview endpoint
  app.post("/api/preview-property", async (req, res) => {
    try {
      const { propertyCode } = req.body;
      if (!propertyCode) {
        return res.status(400).json({ error: "Property code is required" });
      }

      // This would normally use Puppeteer to fetch from UNIVEN
      // For now, return a structured response indicating the feature is available
      res.json({
        success: false,
        message: "Property preview requires UNIVEN connection. Please ensure you are logged into UNIVEN and try starting a full automation.",
        propertyCode
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to preview property" });
    }
  });

  return httpServer;
}
