'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { datasetService, modelService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { ModelStatus } from '@/types';
import {
  Upload,
  Settings,
  BrainCircuit,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileSpreadsheet,
} from 'lucide-react';

export default function DatasetUploadPage() {
  const { user, isAdmin } = useAuth();
  
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Retrain State
  const [retraining, setRetraining] = useState(false);

  const fetchModelStatus = async () => {
    try {
      const data = await modelService.getStatus();
      setModelStatus(data);
    } catch (error) {
      console.error('Error fetching model status:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchModelStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setUploadMessage(null);
      } else {
        setUploadMessage({ type: 'error', text: 'Please select a valid CSV file.' });
        setFile(null);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);

    try {
      const response = await datasetService.upload(file);
      setUploadMessage({
        type: 'success',
        text: `Successfully imported ${response.records_imported} records. Model retrained with accuracy ${(response.model_metrics.accuracy * 100).toFixed(2)}%!`,
      });
      setFile(null);
      // Refresh model metrics
      fetchModelStatus();
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Failed to upload and parse dataset.';
      setUploadMessage({ type: 'error', text: detail });
    } finally {
      setUploading(false);
    }
  };

  const handleManualRetrain = async () => {
    setRetraining(true);
    setUploadMessage(null);
    try {
      const response = await modelService.retrain();
      setUploadMessage({
        type: 'success',
        text: `Model successfully retrained on current database. Accuracy: ${(response.metrics.accuracy * 100).toFixed(2)}%.`,
      });
      fetchModelStatus();
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Failed to retrain model.';
      setUploadMessage({ type: 'error', text: detail });
    } finally {
      setRetraining(false);
    }
  };

  return (
    <Layout title="Dataset Upload">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-300">Model Pipeline & Bootstrapping</h2>
          <p className="text-zinc-550 text-xs mt-0.5">Retrain the Random Forest model and ingestion pipeline</p>
        </div>

        {/* Global Action Message */}
        {uploadMessage && (
          <div className={`p-4 border rounded-2xl flex items-start gap-3 shadow-sm ${
            uploadMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-450'
              : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
          }`}>
            {uploadMessage.type === 'success' ? (
              <CheckCircle2 className="shrink-0 text-emerald-500" size={20} />
            ) : (
              <AlertTriangle className="shrink-0 text-red-500" size={20} />
            )}
            <p className="text-xs font-semibold leading-relaxed">{uploadMessage.text}</p>
          </div>
        )}

        {/* Grid panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* File Upload Form (Spans 2 cols) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm lg:col-span-2 space-y-6 relative">
            {!isAdmin && (
              <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] rounded-2xl z-20 flex flex-col items-center justify-center space-y-3">
                <Lock className="text-zinc-400 animate-bounce" size={28} />
                <span className="text-sm font-bold text-white">Administrative Lock</span>
                <p className="text-xs text-zinc-300 max-w-xs text-center px-4">
                  Only administrators can upload datasets and initiate system-wide retraining.
                </p>
              </div>
            )}

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-emerald-500" />
                <span>Upload Maintenance Log CSV</span>
              </h3>
              <p className="text-xs text-zinc-550 dark:text-zinc-450 mt-1">
                Ingest telemetry sheets. Validates columns, repopulates PostgreSQL databases, and updates ML model weights.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-6">
              {/* Drag and Drop Zone Mock */}
              <div className="border-2 border-dashed border-zinc-250 dark:border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center bg-zinc-50 dark:bg-zinc-955 transition-all">
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={!isAdmin}
                />
                
                <label htmlFor="csv-file-input" className="cursor-pointer space-y-3 block">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                    <FileSpreadsheet size={28} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-zinc-200 block">
                      {file ? file.name : 'Select AI4I 2020 CSV File'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold block mt-1">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports standard CSV format'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Upload Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!file || uploading || !isAdmin}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-450 text-black font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Processing Pipeline...</span>
                    </div>
                  ) : (
                    'Ingest & Retrain'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Model Status Metrics (Spans 1 col) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BrainCircuit size={18} className="text-purple-500" />
                  <span>Model Performance</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Status of trained Random Forest classifier</p>
              </div>

              {loadingMetrics ? (
                <div className="space-y-4 py-2">
                  <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : modelStatus?.trained ? (
                <div className="space-y-4">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2.5 bg-emerald-500/5 p-3 border border-emerald-500/10 rounded-xl">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Weights Active</span>
                      <span className="text-[10px] text-zinc-550 dark:text-zinc-450 block font-semibold">Trained on {modelStatus.metrics?.samples_trained} logs</span>
                    </div>
                  </div>

                  {/* Metrics meters */}
                  <div className="space-y-3.5">
                    {[
                      { name: 'Accuracy', val: modelStatus.metrics?.accuracy, color: 'bg-emerald-500' },
                      { name: 'Precision', val: modelStatus.metrics?.precision, color: 'bg-blue-500' },
                      { name: 'Recall', val: modelStatus.metrics?.recall, color: 'bg-purple-500' },
                      { name: 'F1 Score', val: modelStatus.metrics?.f1_score, color: 'bg-pink-500' },
                    ].map((metric) => {
                      const percentage = ((metric.val || 0) * 100).toFixed(1);
                      return (
                        <div key={metric.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-500">{metric.name}</span>
                            <span className="text-slate-900 dark:text-white font-mono">{percentage}%</span>
                          </div>
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${metric.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2.5 bg-amber-500/5 p-3 border border-amber-500/15 rounded-xl">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Rules Fallback Active</span>
                      <span className="text-[10px] text-zinc-550 dark:text-zinc-450 block font-semibold">ML Classifier offline</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    No trained Random Forest model was detected. In order to run inference using ML pipelines, please upload a training dataset.
                  </p>
                </div>
              )}
            </div>

            {/* Manual Retraining Button */}
            {modelStatus?.trained && (
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850">
                <button
                  onClick={handleManualRetrain}
                  disabled={retraining || !isAdmin}
                  className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 disabled:opacity-55 font-semibold text-xs text-slate-800 dark:text-zinc-200 flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer border border-zinc-250 dark:border-zinc-750"
                >
                  {retraining ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-700 dark:border-zinc-350 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                  <span>{retraining ? 'Fitting classifier...' : 'Force Manual Retraining'}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}
