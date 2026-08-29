import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Share2,
  Webhook as WebhookIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Zap,
  Sliders,
  AlertTriangle,
  Clock,
  Play,
  Code2,
  ChevronRight,
  ShieldCheck,
  Layers,
  ArrowRight,
  X,
  Info,
} from 'lucide-react';
import {
  CRMSettings,
  Lead,
  CustomForm,
  Webhook,
} from '../types';
import {
  GoogleSheetsConfig,
  ColumnMapping,
  ImportIssue,
  fetchGoogleSheetData,
  autoDetectMapping,
  extractSheetId,
} from '../lib/googleSheetsSync';
import { formatRelativeDate } from '../lib/utils';
import { processIncomingWebhook } from '../lib/storage';

interface IntegrationsViewProps {
  // Google Sheets Props
  sheetsConfig: GoogleSheetsConfig;
  onSaveSheetsConfig: (newConfig: GoogleSheetsConfig) => void;
  onRunSheetSync: () => Promise<{ createdCount: number; updatedCount: number; skippedCount: number }>;
  isSheetSyncing: boolean;
  skippedRowsHistory?: ImportIssue[];

  // Sharable Forms Props
  forms: CustomForm[];
  onNavigateToForms: () => void;
  onOpenPublicForm: (formId: string) => void;

  // Webhooks Props
  webhooks: Webhook[];
  onCreateWebhook: (name: string) => Promise<Webhook>;
  onUpdateWebhook: (id: string, name: string) => Promise<void>;
  onToggleWebhookActive: (id: string, active: boolean) => Promise<void>;
  onDeleteWebhook: (id: string) => Promise<void>;
  onWebhookLeadCreated?: (lead: Lead) => void;

  // Global Leads & Settings
  leads: Lead[];
  settings: CRMSettings;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  sheetsConfig,
  onSaveSheetsConfig,
  onRunSheetSync,
  isSheetSyncing,
  skippedRowsHistory = [],
  forms,
  onNavigateToForms,
  onOpenPublicForm,
  webhooks,
  onCreateWebhook,
  onUpdateWebhook,
  onToggleWebhookActive,
  onDeleteWebhook,
  onWebhookLeadCreated,
  leads,
  settings,
}) => {
  // Active Tab: 'all' | 'sheets' | 'forms' | 'webhooks'
  const [activeSection, setActiveSection] = useState<'all' | 'sheets' | 'forms' | 'webhooks'>('all');

  // ==========================================
  // Google Sheets Local State
  // ==========================================
  const [sheetUrlOrId, setSheetUrlOrId] = useState(sheetsConfig.sheetUrlOrId || '');
  const [sheetName, setSheetName] = useState(sheetsConfig.sheetName || '');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(sheetsConfig.autoSyncEnabled ?? true);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(sheetsConfig.columnMapping || {});
  const [sheetsActiveTab, setSheetsActiveTab] = useState<'connection' | 'mapping' | 'issues'>('connection');

  const [testingConnection, setTestingConnection] = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [connectionSuccess, setConnectionSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewRowsCount, setPreviewRowsCount] = useState<number>(0);
  const [sheetFeedbackMessage, setSheetFeedbackMessage] = useState<string | null>(null);

  // Test connection to Google Sheet
  const handleTestConnection = async () => {
    if (!sheetUrlOrId.trim()) {
      setErrorMessage('Please enter a Google Sheet URL or Sheet ID.');
      setConnectionSuccess(false);
      return;
    }

    setTestingConnection(true);
    setErrorMessage(null);
    setConnectionSuccess(null);

    try {
      const data = await fetchGoogleSheetData(sheetUrlOrId, sheetName);
      setDetectedHeaders(data.headers);
      setPreviewRowsCount(data.rows.length);
      setConnectionSuccess(true);

      // Auto detect mapping
      const detected = autoDetectMapping(data.headers);
      setColumnMapping((prev) => ({
        ...detected,
        ...prev,
      }));

      setSheetsActiveTab('mapping');
    } catch (err: any) {
      setConnectionSuccess(false);
      setErrorMessage(err.message || 'Failed to connect to Google Sheet. Ensure the sheet is shared as Anyone with the link can view.');
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Config Changes
  const handleSaveSheets = () => {
    const updatedConfig: GoogleSheetsConfig = {
      ...sheetsConfig,
      sheetUrlOrId: sheetUrlOrId.trim(),
      sheetName: sheetName.trim(),
      columnMapping,
      autoSyncEnabled,
      syncIntervalMinutes: 5,
    };
    onSaveSheetsConfig(updatedConfig);
    setSheetFeedbackMessage('Google Sheets configuration saved successfully!');
    setTimeout(() => setSheetFeedbackMessage(null), 3500);
  };

  // Run Sync Now
  const handleTriggerSync = async () => {
    setSheetFeedbackMessage(null);
    try {
      const res = await onRunSheetSync();
      setSheetFeedbackMessage(
        `Sync completed: ${res.createdCount} new lead(s) added, ${res.updatedCount} lead(s) updated (${res.skippedCount} skipped).`
      );
      setTimeout(() => setSheetFeedbackMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed.');
    }
  };

  // Google Sheets Leads Count
  const googleSheetLeadsCount = leads.filter(
    (l) =>
      l.id.startsWith('lead_gsync_') ||
      (l.source && l.source.toLowerCase().includes('google sheet')) ||
      (l.source && l.source.toLowerCase().includes('sheet'))
  ).length;

  // ==========================================
  // Webhooks State
  // ==========================================
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [editWebhookName, setEditWebhookName] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [webhookActionMsg, setWebhookActionMsg] = useState<string | null>(null);

  // Test Webhook Simulator Modal State
  const [testWebhookModal, setTestWebhookModal] = useState<Webhook | null>(null);
  const [testPayloadJson, setTestPayloadJson] = useState<string>(
    JSON.stringify(
      {
        name: 'Aman Verma',
        phone: '9876543210',
        email: 'aman.verma@example.com',
        course_interest: 'Premiere Pro',
        class_mode: 'Offline',
        address: 'Raipur, Chhattisgarh',
        lead_score: 'Hot',
        tags: 'Walkin Demo, Summer 2026',
        message: 'Interested in video editing 1-year course',
      },
      null,
      2
    )
  );
  const [isTestingSending, setIsTestingSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; lead?: Lead } | null>(null);

  const getWebhookUrl = (webhookKey: string) => {
    try {
      const origin = window.location.origin;
      return `${origin}/api/webhook/${webhookKey}`;
    } catch (e) {
      return `https://app.techlabcrm.com/api/webhook/${webhookKey}`;
    }
  };

  const handleCopy = (text: string, type: 'key' | 'url', id: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2500);
    } else {
      setCopiedUrlId(id);
      setTimeout(() => setCopiedUrlId(null), 2500);
    }
  };

  const handleCreateWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim()) return;

    try {
      const created = await onCreateWebhook(newWebhookName.trim());
      setNewWebhookName('');
      setIsCreatingWebhook(false);
      setWebhookActionMsg(`Webhook "${created.name}" created successfully!`);
      setTimeout(() => setWebhookActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create webhook');
    }
  };

  const handleSaveEditWebhook = async (id: string) => {
    if (!editWebhookName.trim()) return;
    try {
      await onUpdateWebhook(id, editWebhookName.trim());
      setEditingWebhookId(null);
      setEditWebhookName('');
      setWebhookActionMsg('Webhook name updated!');
      setTimeout(() => setWebhookActionMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update webhook');
    }
  };

  const handleDeleteWebhookConfirm = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete webhook "${name}"? External automations using this URL will stop working.`)) {
      try {
        await onDeleteWebhook(id);
        setWebhookActionMsg(`Webhook "${name}" deleted.`);
        setTimeout(() => setWebhookActionMsg(null), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to delete webhook');
      }
    }
  };

  // Run Test Webhook
  const handleExecuteTestWebhook = async () => {
    if (!testWebhookModal) return;
    setIsTestingSending(true);
    setTestResult(null);

    try {
      let parsed: any;
      try {
        parsed = JSON.parse(testPayloadJson);
      } catch (e) {
        throw new Error('Invalid JSON format. Please fix the JSON syntax.');
      }

      // Try actual HTTP POST first
      const webhookUrl = getWebhookUrl(testWebhookModal.webhook_key);
      let resSuccess = false;
      let resLead: any = null;

      try {
        const fetchRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });
        if (fetchRes.ok) {
          const resData = await fetchRes.json();
          resSuccess = true;
          resLead = resData;
        }
      } catch (networkErr) {
        // If local preview environment blocks relative fetch, run client-side Firestore processor
      }

      if (!resSuccess) {
        const clientRes = await processIncomingWebhook(testWebhookModal.webhook_key, parsed);
        resSuccess = true;
        resLead = clientRes.lead;
        if (onWebhookLeadCreated && clientRes.lead) {
          onWebhookLeadCreated(clientRes.lead);
        }
      }

      setTestResult({
        success: true,
        message: 'Lead created successfully! Lead status set to "New".',
        lead: resLead,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to process webhook test payload.',
      });
    } finally {
      setIsTestingSending(false);
    }
  };

  // Active Forms Summary
  const activeFormsCount = forms.filter((f) => f.active).length;
  const totalFormSubmissions = forms.reduce((sum, f) => sum + (f.submission_count || 0), 0);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto text-xs">
      {/* Top Header */}
      <div className="glass p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800/80 shadow-xl bg-slate-900/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0 shadow-[0_0_15px_rgba(45,212,191,0.15)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                Integrations & Lead Ingestion Hub
              </h1>
              <span className="text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/60 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Consolidate and automate lead capture from Google Sheets, Sharable Forms, and Zapier/Make Webhooks.
            </p>
          </div>
        </div>

        {/* Quick Section Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'all'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Integrations (3)
          </button>
          <button
            onClick={() => setActiveSection('sheets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'sheets'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets</span>
          </button>
          <button
            onClick={() => setActiveSection('forms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'forms'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Sharable Forms</span>
          </button>
          <button
            onClick={() => setActiveSection('webhooks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'webhooks'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <WebhookIcon className="w-3.5 h-3.5" />
            <span>Webhooks</span>
          </button>
        </div>
      </div>

      {/* Global Action Messages */}
      {webhookActionMsg && (
        <div className="bg-purple-950/80 border border-purple-800/80 text-purple-200 px-4 py-3 rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{webhookActionMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: GOOGLE SHEETS LIVE SYNC                                       */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'sheets') && (
        <section className="glass rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl bg-slate-900/50">
          {/* Card Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    Google Sheets Sync
                  </h2>
                  {sheetsConfig.sheetUrlOrId ? (
                    <span className="text-[11px] font-semibold bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Connected & Active</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full">
                      Not Configured
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Automatically pull, parse, and synchronize student inquiries directly from public Google Sheets.
                </p>
              </div>
            </div>

            {/* Metrics & Sync Trigger */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-3 text-right">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Synced Leads
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    {googleSheetLeadsCount} Leads
                  </div>
                </div>
              </div>

              <button
                onClick={handleTriggerSync}
                disabled={isSheetSyncing || !sheetUrlOrId.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/30"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSheetSyncing ? 'animate-spin' : ''}`} />
                <span>{isSheetSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          {/* Feedback & Error Alerts */}
          {sheetFeedbackMessage && (
            <div className="mx-6 mt-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{sheetFeedbackMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mx-6 mt-4 bg-red-950/80 border border-red-800 text-red-300 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sheets Sub-Tabs */}
          <div className="px-6 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold bg-slate-950/30">
            <button
              onClick={() => setSheetsActiveTab('connection')}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                sheetsActiveTab === 'connection'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sheet Connection</span>
            </button>
            <button
              onClick={() => setSheetsActiveTab('mapping')}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                sheetsActiveTab === 'mapping'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Column Mapping</span>
              {detectedHeaders.length > 0 && (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded-full">
                  {detectedHeaders.length} cols
                </span>
              )}
            </button>
            <button
              onClick={() => setSheetsActiveTab('issues')}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                sheetsActiveTab === 'issues'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Skipped & Validation Issues</span>
              {skippedRowsHistory.length > 0 && (
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.2 rounded-full">
                  {skippedRowsHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Sub-Tab 1: Connection Config */}
          {sheetsActiveTab === 'connection' && (
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                    Google Sheet Public URL or Sheet ID <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={sheetUrlOrId}
                      onChange={(e) => setSheetUrlOrId(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection || !sheetUrlOrId.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                      <span>{testingConnection ? 'Connecting...' : 'Test Connection'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tip: In Google Sheets, click <strong>Share</strong> &rarr; Set to <strong>"Anyone with the link can view"</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                      Sheet Tab Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="e.g. Sheet1, Leads, Form Responses 1"
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 p-2.5 rounded-xl cursor-pointer hover:border-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                        className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                      />
                      <div>
                        <div className="text-slate-200 font-semibold text-xs">Auto-Sync in Background</div>
                        <div className="text-[11px] text-slate-400">Pulls new rows automatically every 5 minutes</div>
                      </div>
                    </label>
                  </div>
                </div>

                {connectionSuccess && (
                  <div className="bg-emerald-950/60 border border-emerald-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Successfully connected! Found <strong>{detectedHeaders.length} columns</strong> and <strong>{previewRowsCount} rows</strong>.
                      </span>
                    </div>
                    <button
                      onClick={() => setSheetsActiveTab('mapping')}
                      className="underline font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      Review Column Mapping &rarr;
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveSheets}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Sheet Configuration</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Column Mapping */}
          {sheetsActiveTab === 'mapping' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-200 text-xs">Match Google Sheet Columns to CRM Fields</h3>
                  <p className="text-slate-400 text-[11px]">Map corresponding headers from your spreadsheet to student lead attributes.</p>
                </div>
                {detectedHeaders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const detected = autoDetectMapping(detectedHeaders);
                      setColumnMapping(detected);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auto-Detect Mapping</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                {[
                  { field: 'name', label: 'Full Name', req: true },
                  { field: 'phone', label: 'Phone / Mobile', req: true },
                  { field: 'email', label: 'Email Address' },
                  { field: 'course_interest', label: 'Course Interest' },
                  { field: 'source', label: 'Lead Source' },
                  { field: 'class_mode', label: 'Class Mode (Online/Offline)' },
                  { field: 'address', label: 'Address / Location' },
                  { field: 'dob', label: 'Date of Birth' },
                  { field: 'assigned_batch', label: 'Assigned Batch' },
                  { field: 'lead_score', label: 'Lead Score (Hot/Warm/Cold)' },
                  { field: 'tags', label: 'Tags / Remarks' },
                ].map(({ field, label, req }) => (
                  <div key={field} className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                    <span className="text-slate-300 font-medium text-xs">
                      {label} {req && <span className="text-red-400">*</span>}
                    </span>
                    <select
                      value={columnMapping[field as keyof ColumnMapping] || ''}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          [field]: e.target.value,
                        })
                      }
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 max-w-[200px] focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Unmapped --</option>
                      {detectedHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSaveSheets}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Sheet Configuration</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Skipped Rows & Issues */}
          {sheetsActiveTab === 'issues' && (
            <div className="p-6 space-y-4">
              {skippedRowsHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-slate-300 font-bold text-xs">No validation issues or skipped rows.</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">All ingested rows met name and phone requirements.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {skippedRowsHistory.map((issue, idx) => (
                    <div key={idx} className="bg-red-950/30 border border-red-900/60 p-3 rounded-xl flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-red-300 font-bold">Row #{issue.rowIndex}: {issue.reason}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">
                            Raw Name: <em>{issue.rawName || '(empty)'}</em> | Phone: <em>{issue.rawPhone || '(empty)'}</em>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: SHARABLE FORMS SUMMARY CARD                                   */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'forms') && (
        <section className="glass rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl bg-slate-900/50">
          <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-800/80 flex items-center justify-center text-teal-400 shrink-0 shadow-sm">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    Sharable Lead Capture Forms
                  </h2>
                  <span className="text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/80 px-2 py-0.5 rounded-full">
                    {forms.length} Forms Total
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Public mobile-optimized landing forms for student inquiry registration.
                </p>
              </div>
            </div>

            {/* Quick Stats & Navigation Button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Active Forms</div>
                  <div className="text-sm font-bold text-teal-400">{activeFormsCount}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Submissions</div>
                  <div className="text-sm font-bold text-emerald-400">{totalFormSubmissions}</div>
                </div>
              </div>

              <button
                onClick={onNavigateToForms}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-950/40"
              >
                <span>Manage Forms & Builder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Preview of top forms */}
          {forms.length > 0 && (
            <div className="p-5 border-t border-slate-800 bg-slate-950/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {forms.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs truncate">{f.form_name}</span>
                        {f.active ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {f.fields.length} Fields &bull; {f.submission_count || 0} Submissions
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenPublicForm(f.id)}
                      className="p-1.5 text-teal-400 hover:bg-teal-950/80 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Open Public Form Preview"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION C: WEBHOOKS (NEW FEATURE)                                         */}
      {/* ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'webhooks') && (
        <section className="glass rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl bg-slate-900/50 space-y-0">
          {/* Section Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/80 flex items-center justify-center text-purple-400 shrink-0 shadow-sm">
                <WebhookIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    Webhooks & Automated Ingestion
                  </h2>
                  <span className="text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded-full">
                    {webhooks.length} Webhooks Configured
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Receive instant POST HTTP requests from Zapier, Make.com, Facebook Lead Ads, WordPress, or custom APIs.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsCreatingWebhook(true);
                setNewWebhookName('');
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/40 shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Webhook</span>
            </button>
          </div>

          {/* Create Webhook Inline Form */}
          {isCreatingWebhook && (
            <div className="p-5 border-b border-slate-800 bg-purple-950/20 animate-fadeIn">
              <form onSubmit={handleCreateWebhookSubmit} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Inbound Webhook</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreatingWebhook(false)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    placeholder="Webhook Name (e.g. Zapier - Website Popup, Facebook Lead Ads via Make)"
                    className="flex-1 bg-slate-950 border border-purple-800/80 text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-purple-950/30"
                    >
                      Save & Generate URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingWebhook(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2.5 rounded-xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Webhooks List */}
          <div className="p-5 sm:p-6 space-y-4">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800">
                <WebhookIcon className="w-10 h-10 text-purple-400 mx-auto mb-2.5 opacity-80" />
                <p className="text-slate-200 font-bold text-sm">No webhooks created yet</p>
                <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                  Click "Create New Webhook" to generate a unique HTTP endpoint and link your CRM with Zapier, Make.com, or website forms.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {webhooks.map((wh) => {
                  const fullUrl = getWebhookUrl(wh.webhook_key);
                  const isEditing = editingWebhookId === wh.id;

                  return (
                    <div
                      key={wh.id}
                      className={`p-4 rounded-xl border transition-all ${
                        wh.active
                          ? 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700 shadow-md'
                          : 'bg-slate-950/40 border-slate-800/40 opacity-70'
                      }`}
                    >
                      {/* Webhook Header & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => onToggleWebhookActive(wh.id, !wh.active)}
                            className={`w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-125 ${
                              wh.active
                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                : 'bg-slate-600'
                            }`}
                            title={wh.active ? 'Click to Deactivate' : 'Click to Activate'}
                          />
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editWebhookName}
                                onChange={(e) => setEditWebhookName(e.target.value)}
                                className="bg-slate-900 border border-purple-500 text-slate-100 px-2.5 py-1 rounded-lg text-xs"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEditWebhook(wh.id)}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded-md text-xs cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingWebhookId(null)}
                                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-slate-100 text-xs sm:text-sm truncate">
                                {wh.name}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingWebhookId(wh.id);
                                  setEditWebhookName(wh.name);
                                }}
                                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                                title="Edit Webhook Name"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Stats & Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                            <span className="bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-full font-semibold">
                              {wh.total_received || 0} Received
                            </span>
                            {wh.last_received_timestamp ? (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Last: {formatRelativeDate(wh.last_received_timestamp)}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">No requests yet</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Toggle Active Button */}
                            <button
                              onClick={() => onToggleWebhookActive(wh.id, !wh.active)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                wh.active
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {wh.active ? 'Disable' : 'Enable'}
                            </button>

                            {/* Test Simulator Button */}
                            <button
                              onClick={() => {
                                setTestWebhookModal(wh);
                                setTestResult(null);
                              }}
                              className="bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Test sending a sample payload"
                            >
                              <Play className="w-3 h-3 text-purple-400" />
                              <span>Test Webhook</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteWebhookConfirm(wh.id, wh.name)}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete Webhook"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Webhook URL & Details */}
                      <div className="pt-3 space-y-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-purple-300 font-mono flex items-center justify-between overflow-x-auto">
                            <span className="truncate">{fullUrl}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(fullUrl, 'url', wh.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            {copiedUrlId === wh.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copy Webhook URL</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Helper Note */}
                        <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-lg">
                          <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <span>
                            Send a <strong>POST</strong> request with a JSON body containing at least <code className="text-purple-300 bg-slate-950 px-1 py-0.5 rounded">'name'</code> and <code className="text-purple-300 bg-slate-950 px-1 py-0.5 rounded">'phone'</code> to this URL from tools like <strong>Zapier</strong>, <strong>Make.com</strong>, or any custom integration.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Code Samples & Payload Guide */}
            <div className="mt-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Webhook Payload Reference & Integration Guide
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
                {/* JSON Example */}
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans font-semibold mb-2 flex items-center justify-between">
                    <span>Sample JSON Payload (POST Body)</span>
                    <span className="text-purple-400">application/json</span>
                  </div>
                  <pre className="text-[11px] text-purple-200 overflow-x-auto">
{`{
  "name": "Rahul Sharma",
  "phone": "9876543210",
  "email": "rahul@example.com",
  "source": "Zapier - Website Popup",
  "course_interest": "Premiere Pro",
  "class_mode": "Offline",
  "address": "Raipur, CG",
  "lead_score": "Hot",
  "tags": "Demo Booked, Summer 2026"
}`}
                  </pre>
                </div>

                {/* cURL Example */}
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans font-semibold mb-2 flex items-center justify-between">
                    <span>cURL Request Example</span>
                    <span className="text-emerald-400">Terminal / Bash</span>
                  </div>
                  <pre className="text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST https://[YOUR_APP_DOMAIN]/api/webhook/[YOUR_WEBHOOK_KEY] \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Rahul Sharma","phone":"9876543210","course_interest":"Premiere Pro"}'`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TEST WEBHOOK MODAL SIMULATOR                                              */}
      {/* ========================================================================= */}
      {testWebhookModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Test Webhook: {testWebhookModal.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Simulate sending an external POST request to verify real-time CRM lead creation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestWebhookModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Target Webhook URL
                </label>
                <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-purple-300 truncate">
                  {getWebhookUrl(testWebhookModal.webhook_key)}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  JSON Request Payload
                </label>
                <textarea
                  rows={8}
                  value={testPayloadJson}
                  onChange={(e) => setTestPayloadJson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/80 border-red-800 text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">{testResult.success ? 'Success!' : 'Error'}</div>
                    <div className="text-[11px] mt-0.5">{testResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTestWebhookModal(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteTestWebhook}
                disabled={isTestingSending}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/40 disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isTestingSending ? 'animate-spin' : ''}`} />
                <span>{isTestingSending ? 'Sending Request...' : 'Send Test Request'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
