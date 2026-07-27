'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { alertsService } from '@/services/api';
import { Alert } from '@/types';
import {
  Bell,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function AlertsLogPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async () => {
    try {
      const activeAlerts = await alertsService.getAlerts(false); // fetch unresolved
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  return (
    <Layout title="Alerts Log">
      <div className="space-y-6">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-300">Active Incidents Log</h2>
            <p className="text-zinc-550 text-xs mt-0.5">Real-time safety threshold triggers</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer text-slate-700 dark:text-zinc-300 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Alerts Container */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-12 rounded-2xl text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-2 border border-emerald-500/20">
              <ShieldCheck size={32} className="stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">All Systems Nominal</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              There are currently no active alerts. All machines are operating within designated safety envelopes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const alertColor = isCritical
                ? 'border-red-500/20 dark:border-red-500/10 bg-red-500/5 hover:bg-red-500/10'
                : 'border-amber-500/20 dark:border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10';

              return (
                <div
                  key={alert.id}
                  className={`border p-5 rounded-2xl shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${alertColor}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon Badge */}
                    <div className={`p-2.5 rounded-xl border shrink-0 ${
                      isCritical
                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      <AlertTriangle size={20} className="stroke-[2]" />
                    </div>

                    {/* Alert Message Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                          {alert.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isCritical
                            ? 'bg-red-500/10 text-red-500 border-red-500/25'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/25'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-650 dark:text-zinc-400 font-medium">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold pt-1">
                        <Clock size={12} />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Machine redirection Link */}
                  <div className="shrink-0 w-full md:w-auto text-right">
                    <Link
                      href={`/machines/${alert.product_id}`}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-zinc-250 dark:border-zinc-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-zinc-350 hover:bg-white dark:hover:bg-zinc-950 transition-all cursor-pointer"
                    >
                      <span>Diagnose Asset {alert.product_id}</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
