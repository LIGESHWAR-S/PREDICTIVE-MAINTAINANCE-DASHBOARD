export interface SensorReading {
  id: number;
  product_id: string;
  timestamp: string;
  air_temp: number;
  process_temp: number;
  rotational_speed: number;
  torque: number;
  tool_wear: number;
  failure_prob: number;
  failure_type: string;
  is_failure: boolean;
}

export interface Machine {
  product_id: string;
  type: string;
  last_updated: string;
  latest_reading: SensorReading | null;
  failure_probability: number;
  health_score: number;
  status: 'Healthy' | 'Warning' | 'Critical';
}

export interface MachineDetail {
  product_id: string;
  type: string;
  last_updated: string;
  latest_reading: SensorReading | null;
  health_score: number;
  failure_probability: number;
  predicted_failure_type: string;
  maintenance_recommendation: string;
  estimated_rul: number;
}

export interface Alert {
  id: number;
  product_id: string;
  timestamp: string;
  type: string;
  message: string;
  severity: 'warning' | 'critical';
  is_resolved: boolean;
}

export interface DashboardStats {
  total_machines: number;
  healthy_machines: number;
  warning_machines: number;
  critical_machines: number;
  overall_health: number;
  predicted_failures: number;
  active_alerts: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  samples_trained: number;
}

export interface ModelStatus {
  trained: boolean;
  message?: string;
  metrics?: ModelMetrics;
}

export interface User {
  username: string;
  role: 'admin' | 'user';
}
