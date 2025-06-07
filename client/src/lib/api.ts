import { apiRequest } from "./queryClient";

export const api = {
  // Automations
  automations: {
    list: async (limit?: number) => {
      const url = limit ? `/api/automations?limit=${limit}` : '/api/automations';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch automations');
      return response.json();
    },
    
    get: async (id: number) => {
      const response = await fetch(`/api/automations/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch automation');
      return response.json();
    },
    
    create: async (data: any) => {
      const response = await apiRequest('POST', '/api/automations', data);
      return response.json();
    },
    
    update: async (id: number, data: any) => {
      const response = await apiRequest('PUT', `/api/automations/${id}`, data);
      return response.json();
    },
    
    delete: async (id: number) => {
      await apiRequest('DELETE', `/api/automations/${id}`);
    },
  },

  // OLX Codes
  olxCodes: {
    list: async () => {
      const response = await fetch('/api/olx-codes', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch OLX codes');
      return response.json();
    },
    
    create: async (data: { code: string; name: string }) => {
      const response = await apiRequest('POST', '/api/olx-codes', data);
      return response.json();
    },
    
    update: async (id: number, data: any) => {
      const response = await apiRequest('PUT', `/api/olx-codes/${id}`, data);
      return response.json();
    },
    
    delete: async (id: number) => {
      await apiRequest('DELETE', `/api/olx-codes/${id}`);
    },
  },

  // System Logs
  logs: {
    list: async (limit?: number, level?: string) => {
      let url = '/api/logs';
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (level && level !== 'all') params.append('level', level);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
    
    clear: async (olderThan?: Date) => {
      let url = '/api/logs';
      if (olderThan) url += `?olderThan=${olderThan.toISOString()}`;
      
      const response = await apiRequest('DELETE', url);
      return response.json();
    },
  },

  // Settings
  settings: {
    list: async () => {
      const response = await fetch('/api/settings', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    
    get: async (key: string) => {
      const response = await fetch(`/api/settings/${key}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch setting');
      return response.json();
    },
    
    set: async (key: string, value: any) => {
      const response = await apiRequest('PUT', `/api/settings/${key}`, { value });
      return response.json();
    },
  },

  // Dashboard
  dashboard: {
    getStats: async () => {
      const response = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
  },

  // Property Preview
  previewProperty: async (propertyCode: string) => {
    const response = await apiRequest('POST', '/api/preview-property', { propertyCode });
    return response.json();
  },
};

export default api;
