import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration (401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Force redirect to login page if we are not already there
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export const dashboardService = {
  async getStats() {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },
};

export const machinesService = {
  async getMachines(params: {
    search?: string;
    type?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get('/machines', { params });
    return response.data;
  },

  async getMachineDetail(id: string) {
    const response = await apiClient.get(`/machines/${id}`);
    return response.data;
  },

  async getMachineHistory(id: string) {
    const response = await apiClient.get(`/history/${id}`);
    return response.data;
  },
};

export const predictService = {
  async predict(data: {
    type: string;
    air_temp: number;
    process_temp: number;
    rotational_speed: number;
    torque: number;
    tool_wear: number;
  }) {
    const response = await apiClient.post('/predict', data);
    return response.data;
  },
};

export const alertsService = {
  async getAlerts(resolved: boolean = false) {
    const response = await apiClient.get('/alerts', { params: { resolved } });
    return response.data;
  },
};

export const modelService = {
  async getStatus() {
    const response = await apiClient.get('/model-status');
    return response.data;
  },

  async retrain() {
    const response = await apiClient.post('/retrain-model');
    return response.data;
  },
};

export const datasetService = {
  async upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/upload-dataset', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const reportsService = {
  async exportDashboardPdf(): Promise<Blob> {
    const response = await apiClient.get('/analytics/export/dashboard', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportMachinePdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`/analytics/export/machine/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportPredictionsCsv(): Promise<Blob> {
    const response = await apiClient.get('/analytics/export/predictions', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const analyticsService = {
  async getAnalytics() {
    const response = await apiClient.get('/analytics');
    return response.data;
  },
};
