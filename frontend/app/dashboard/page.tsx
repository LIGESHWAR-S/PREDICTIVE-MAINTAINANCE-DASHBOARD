'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { dashboardService, analyticsService, reportsService } from '@/services/api';
import { DashboardStats } from '@/types';
import {
  Activity,
  Cpu,
  AlertTriangle,
  FileDown,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      const statsData = await dashboardService.getStats();
      setStats(statsData);
      
      const analyticsData = await analyticsService.getAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await reportsService.exportDashboardPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'dashboard_health_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          
          {/* KPI grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>

          {/* Charts grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  const kpis = [
    {
      title: 'Total Machines',
      value: stats?.total_machines ?? 0,
      icon: Cpu,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Healthy Machines',
      value: stats?.healthy_machines ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Warning Machines',
      value: stats?.warning_machines ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Critical Machines',
      value: stats?.critical_machines ?? 0,
      icon: AlertTriangle,
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
      title: 'System Health',
      value: `${stats?.overall_health ?? 100}%`,
      icon: ShieldCheck,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'Predicted Failures',
      value: stats?.predicted_failures ?? 0,
      icon: Activity,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Active Alerts',
      value: stats?.active_alerts ?? 0,
      icon: AlertTriangle,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    },
  ];

  // Colors for health distribution pie chart
  const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Dashboard Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-300">System Overview</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Real-time health telemetry & predictions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer text-slate-700 dark:text-zinc-300 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-black font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <FileDown size={16} />
              <span>{exporting ? 'Generating...' : 'Export Report'}</span>
            </button>
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            // The 7th KPI spans 1 column but fits nicely
            return (
              <div
                key={index}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-xs text-zinc-550 dark:text-zinc-450 font-semibold uppercase tracking-wider block">
                    {kpi.title}
                  </span>
                  <span className="text-2xl font-bold text-slate-950 dark:text-white block">
                    {kpi.value}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${kpi.color}`}>
                  <Icon size={20} className="stroke-[2]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* No Data State Banner */}
        {stats?.total_machines === 0 && (
          <div className="p-8 bg-zinc-905 dark:bg-zinc-900 border border-dashed border-zinc-350 dark:border-zinc-800 rounded-2xl text-center space-y-4">
            <Cpu size={48} className="mx-auto text-zinc-450 dark:text-zinc-650" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Monitored Assets</h3>
            <p className="text-sm text-zinc-550 dark:text-zinc-450 max-w-md mx-auto">
              The dataset is currently empty. Head over to the **Dataset Upload** page to upload the AI4I 2020 Predictive Maintenance CSV file and bootstrap the pipeline.
            </p>
            <button
              onClick={() => (window.location.href = '/upload')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-black font-semibold rounded-xl text-sm cursor-pointer shadow-md"
            >
              Go to Upload
            </button>
          </div>
        )}

        {stats && stats.total_machines > 0 && (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Health Score Distribution */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Machine Health Distribution</h3>
                  <span className="text-xs text-zinc-500 block">Status division of assets</span>
                </div>
                <div className="h-72 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.health_distribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(analytics?.health_distribution || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">
                      {stats.overall_health}%
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Overall
                    </span>
                  </div>
                </div>
              </div>

              {/* Failure Type Distribution */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Failure Type Distribution</h3>
                  <span className="text-xs text-zinc-500 block">Classified counts of predicted failures</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.failure_types || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                      <XAxis dataKey="type" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                        {(analytics?.failure_types || []).map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.type.includes('TWF') ? '#DC2626' :
                              entry.type.includes('HDF') ? '#EF4444' :
                              entry.type.includes('PWF') ? '#F59E0B' :
                              entry.type.includes('OSF') ? '#3B82F6' :
                              entry.type.includes('RNF') ? '#10B981' : '#6B7280'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Temperature Trend */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Process vs. Air Temperature Trend</h3>
                  <span className="text-xs text-zinc-500 block">Chronological sensor timeline sample (Kelvin)</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.sensor_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="air_temp" name="Air Temp (K)" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="process_temp" name="Process Temp (K)" stroke="#EF4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Alerts Over Time */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Active Incident Rates</h3>
                  <span className="text-xs text-zinc-500 block">Total alerts generated over the last 7 days</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.alerts_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="alerts" name="Incidents Triggered" fill="#EC4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Machine Comparison */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">High-Risk Assets Correlation</h3>
                  <span className="text-xs text-zinc-500 block">Top 5 machines sorted by failure probability</span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.machine_comparison || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                      <XAxis dataKey="product_id" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" unit="%" />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="failure_probability" name="Failure Risk" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
