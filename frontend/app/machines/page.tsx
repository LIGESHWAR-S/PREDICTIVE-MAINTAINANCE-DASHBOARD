'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { machinesService, reportsService } from '@/services/api';
import { Machine } from '@/types';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
} from 'lucide-react';

export default function MachineListPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('product_id');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const response = await machinesService.getMachines({
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      });
      setMachines(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching machines:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly or just trigger on input
    const handler = setTimeout(() => {
      fetchMachines();
    }, 300);

    return () => clearTimeout(handler);
  }, [search, type, status, sortBy, sortOrder, page]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [search, type, status]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await reportsService.exportPredictionsCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'predictive_maintenance_results.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout title="Machine List">
      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-300">Asset Registry</h2>
            <p className="text-zinc-550 text-xs mt-0.5">Explore telemetry metrics & risk matrices</p>
          </div>
          
          <button
            onClick={handleExportCSV}
            disabled={exporting || machines.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-black font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            <span>{exporting ? 'Generating...' : 'Export CSV'}</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-4 rounded-2xl shadow-sm">
          {/* Search bar */}
          <div className="relative lg:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Search by Machine ID..."
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="">All Types (L, M, H)</option>
              <option value="L">Low (L)</option>
              <option value="M">Medium (M)</option>
              <option value="H">High (H)</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 pointer-events-none">
              <Filter size={14} />
            </span>
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 pointer-events-none">
              <Filter size={14} />
            </span>
          </div>

          {/* Sorter Selector */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="w-full pl-3 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 rounded-xl text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="product_id-asc">ID (A-Z)</option>
              <option value="product_id-desc">ID (Z-A)</option>
              <option value="health_score-desc">Health (High-Low)</option>
              <option value="health_score-asc">Health (Low-High)</option>
              <option value="failure_probability-desc">Risk (High-Low)</option>
              <option value="failure_probability-asc">Risk (Low-High)</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 pointer-events-none">
              <ArrowUpDown size={14} />
            </span>
          </div>
        </div>

        {/* Table / List Container */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-955 text-zinc-500 border-b border-zinc-150 dark:border-zinc-850">
                <tr>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Machine ID</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Type</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Air Temp [K]</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Process Temp [K]</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Rotational Speed [rpm]</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Torque [Nm]</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Tool Wear [min]</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('failure_probability')}>
                    <div className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-white">
                      <span>Failure Prob</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {loading ? (
                  [...Array(6)].map((_, idx) => (
                    <tr key={idx} className="h-16 animate-pulse">
                      <td className="p-4"><div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" /></td>
                      <td className="p-4"><div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" /></td>
                      <td className="p-4 text-right"><div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded inline-block" /></td>
                    </tr>
                  ))
                ) : machines.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-zinc-500">
                      No machines found matching the query.
                    </td>
                  </tr>
                ) : (
                  machines.map((machine) => {
                    const r = machine.latest_reading;
                    // Status Badge Mapping
                    const statusStyles = {
                      Healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                      Warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      Critical: 'bg-red-500/10 text-red-500 border-red-500/20',
                    };
                    const statusClass = statusStyles[machine.status] || '';

                    return (
                      <tr key={machine.product_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                        <td className="p-4 font-mono font-semibold text-slate-900 dark:text-white">
                          {machine.product_id}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-400 font-medium">
                            Type {machine.type}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-350">{r ? r.air_temp.toFixed(1) : 'N/A'}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-350">{r ? r.process_temp.toFixed(1) : 'N/A'}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-350">{r ? r.rotational_speed.toFixed(0) : 'N/A'}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-350">{r ? r.torque.toFixed(1) : 'N/A'}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-350">{r ? r.tool_wear.toFixed(0) : 'N/A'}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {/* Small Bar */}
                            <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full ${
                                  machine.status === 'Critical' ? 'bg-red-500' :
                                  machine.status === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${machine.failure_probability * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-slate-800 dark:text-zinc-200 font-semibold">
                              {(machine.failure_probability * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold border rounded-full ${statusClass}`}>
                            {machine.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/machines/${machine.product_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-250 dark:border-zinc-850 text-xs font-semibold rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                          >
                            <Eye size={12} />
                            <span>Diagnose</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-semibold">
                Showing {Math.min(total, (page - 1) * limit + 1)}-{Math.min(total, page * limit)} of {total} machines
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-zinc-250 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-zinc-250 dark:border-zinc-800 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
