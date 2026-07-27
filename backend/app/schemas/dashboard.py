from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_machines: int
    healthy_machines: int
    warning_machines: int
    critical_machines: int
    overall_health: float
    predicted_failures: int
    active_alerts: int
