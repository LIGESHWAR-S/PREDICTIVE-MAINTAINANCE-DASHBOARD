'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { machinesService, reportsService } from '@/services/api';
import { MachineDetail, SensorReading } from '@/types';
import {
  ArrowLeft,
  FileText,
  Activity,
  Cpu,
  Clock,
  Thermometer,
  Wrench,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const machineId = params.id as string;

  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchMachineData = async () => {
    setLoading(true);
    try {
      const detail = await machinesService.getMachineDetail(machineId);
      setMachine(detail);

      const hist = await machinesService.getMachineHistory(machineId);
      setHistory(hist);
    } catch (error) {
      console.error('Error fetching machine details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (machineId) {
      fetchMachineData();
    }
  }, [machineId]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await reportsService.exportMachinePdf(machineId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `machine_${machineId}_diagnostics.pdf`);
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
      <Layout title={`Machine Diagnostics: ...`}>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse md:col-span-2" />
            <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            <div className="h-80 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!machine) {
    return (
      <Layout title="Diagnostics Error">
        <div className="text-center py-12 space-y-4">
          <AlertTriangle size={48} className="mx-auto text-red-500" />
          <h3 className="text-lg font-bold">Machine Not Found</h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-450">
            The machine with ID <span className="font-mono font-bold">{machineId}</span> could not be retrieved.
          </p>
          <button
            onClick={() => router.push('/machines')}
            className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl text-sm"
          >
            Back to Registry
          </button>
        </div>
      </Layout>
    );
  }

  // Determine machine status label
  let status = 'Healthy';
  let statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (machine.health_score < 40) {
    status = 'Critical';
    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20';
  } else if (machine.health_score < 80) {
    status = 'Warning';
    statusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  }

  // Format time labels for Recharts
  const chartData = history.map((h) => ({
    ...h,
    formattedTime: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  const latest = machine.latest_reading;

  return (
    <Layout title={`Machine Diagnostics: ${machineId}`}>
      <div className="space-y-6">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/machines')}
              className="p-2 border border-zinc-250 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-300">Diagnostics Console</h2>
              <p className="text-zinc-550 text-xs mt-0.5">Asset health index & raw telemetry plots</p>
            </div>
          </div>
          
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-black font-semibold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <FileText size={16} />
            <span>{exporting ? 'Generating...' : 'Export Diagnostics Report'}</span>
          </button>
        </div>

        {/* Machine Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Health Index Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Health Index</span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full ${statusColor}`}>
                {status}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 py-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {machine.health_score.toFixed(1)}%
              </span>
            </div>

            <div className="w-full bg-zinc-150 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  status === 'Critical' ? 'bg-red-500' :
                  status === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${machine.health_score}%` }}
              />
            </div>
          </div>

          {/* Failure Probability Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Failure Risk</span>
              <Activity size={18} className="text-zinc-500" />
            </div>
            
            <div className="py-2 space-y-1">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {(machine.failure_probability * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-zinc-500 block truncate">
                Failure Class: <span className="font-semibold text-slate-700 dark:text-zinc-300">{machine.predicted_failure_type}</span>
              </span>
            </div>

            <div className="text-[10px] text-zinc-550 dark:text-zinc-450 flex items-center gap-1.5 font-semibold">
              <Clock size={12} />
              <span>Last updated: {new Date(machine.last_updated).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* RUL Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Remaining Useful Life</span>
              <Clock size={18} className="text-zinc-550" />
            </div>
            
            <div className="py-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {machine.estimated_rul.toFixed(0)} <span className="text-lg font-semibold text-zinc-500">mins</span>
              </span>
            </div>

            <div className="text-[10px] text-zinc-550 dark:text-zinc-450 font-semibold">
              Limit: 250 operational minutes
            </div>
          </div>
        </div>

        {/* Maintenance Recommendations Box */}
        <div className={`p-5 border rounded-2xl flex items-start gap-4 shadow-sm ${
          status === 'Critical' ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400' :
          status === 'Warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400' :
          'bg-emerald-500/5 border-emerald-500/10 text-emerald-700 dark:text-emerald-450'
        }`}>
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            status === 'Critical' ? 'bg-red-500/20 border-red-500/30' :
            status === 'Warning' ? 'bg-amber-500/20 border-amber-500/30' :
            'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <Wrench size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wide">Maintenance Directive</h4>
            <p className="text-xs mt-1.5 leading-relaxed font-medium">
              {machine.maintenance_recommendation}
            </p>
          </div>
        </div>

        {/* Live Telemetry Sensor Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Trend */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Thermometer size={18} className="text-red-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Temperature History [K]</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="formattedTime" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="air_temp" name="Air Temp" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="process_temp" name="Process Temp" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RPM & Torque Trend */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-indigo-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Rotational Speed [rpm] vs. Torque [Nm]</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="formattedTime" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                  <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 9 }} stroke="#3B82F6" label={{ value: 'rpm', angle: -90, position: 'insideLeft', style: { fontSize: 8 } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} stroke="#10B981" label={{ value: 'Nm', angle: 90, position: 'insideRight', style: { fontSize: 8 } }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="rotational_speed" name="Speed (rpm)" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="torque" name="Torque (Nm)" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tool Wear Trend */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Tool Wear Accumulation [min]</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="formattedTime" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                  <Tooltip />
                  <Area type="monotone" dataKey="tool_wear" name="Tool Wear (min)" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Failure Probability History */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-pink-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Predicted Failure Risk Trend [%]</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="formattedTime" tick={{ fontSize: 9 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#9CA3AF" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip formatter={(v: any) => `${(Number(v) * 100).toFixed(1)}%`} />
                  <Area type="monotone" dataKey="failure_prob" name="Failure Prob" stroke="#EC4899" fill="#EC4899" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
