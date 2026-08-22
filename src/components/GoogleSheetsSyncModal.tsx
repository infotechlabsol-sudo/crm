import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  Database,
  Sliders,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  GoogleSheetsConfig,
  ColumnMapping,
  ImportIssue,
  fetchGoogleSheetData,
  autoDetectMapping,
  extractSheetId,
} from '../lib/googleSheetsSync';
import { CRMSettings } from '../types';

interface GoogleSheetsSyncModalProps {
  config: GoogleSheetsConfig;
  settings: CRMSettings;
  onSaveConfig: (newConfig: GoogleSheetsConfig) => void;
  onRunSyncNow: () => Promise<{ createdCount: number; updatedCount: number; skippedCount: number }>;
  onClose: () => void;
  isSyncing: boolean;
  skippedRowsHistory?: ImportIssue[];
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  config,
  settings,
  onSaveConfig,
  onRunSyncNow,
  onClose,
  isSyncing,
  skippedRowsHistory = [],
}) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'mapping' | 'issues'>('connection');

  // Form State
  const [sheetUrlOrId, setSheetUrlOrId] = useState(config.sheetUrlOrId || '');
  const [sheetName, setSheetName] = useState(config.sheetName || '');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(config.autoSyncEnabled ?? true);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(config.columnMapping || {});

  // Connection testing state
  const [testingConnection, setTestingConnection] = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [connectionSuccess, setConnectionSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewRowsCount, setPreviewRowsCount] = useState<number>(0);

  // Sync state message
  const [syncFeedbackMessage, setSyncFeedbackMessage] = useState<string | null>(null);

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

      // Auto detect mapping if current mapping is mostly empty
      const detected = autoDetectMapping(data.headers);
      setColumnMapping((prev) => ({
        ...detected,
        ...prev,
      }));

      setActiveTab('mapping');
    } catch (err: any) {
      setConnectionSuccess(false);
      setErrorMessage(err.message || 'Failed to connect to Google Sheet.');
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Config Changes
  const handleSaveAll = () => {
    const updatedConfig: GoogleSheetsConfig = {
      ...config,
      sheetUrlOrId: sheetUrlOrId.trim(),
      sheetName: sheetName.trim(),
      columnMapping,
      autoSyncEnabled,
      syncIntervalMinutes: 5,
    };
    onSaveConfig(updatedConfig);
    setSyncFeedbackMessage('Settings saved successfully!');
    setTimeout(() => setSyncFeedbackMessage(null), 3000);
  };

  // Trigger Sync Now
  const handleTriggerSync = async () => {
    setSyncFeedbackMessage(null);
    try {
      const res = await onRunSyncNow();
      setSyncFeedbackMessage(
        `Sync completed! ${res.createdCount} new leads added, ${res.updatedCount} leads updated (${res.skippedCount} skipped).`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed.');
    }
  };

  const sheetId = extractSheetId(sheetUrlOrId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Google Sheets Live Lead Integration</span>
                {config.sheetUrlOrId && (
                  <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Connected</span>
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Automatically capture and update CRM student leads from any public Google Sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950/50 px-4 sm:px-6 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('connection')}
            className={`py-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'connection'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>1. Sheet Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('mapping')}
            className={`py-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'mapping'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>2. Column Mapping</span>
            {detectedHeaders.length > 0 && (
              <span className="text-[9px] bg-teal-950 text-teal-400 px-1.5 py-0.2 rounded border border-teal-800">
                {detectedHeaders.length} cols
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`py-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'issues'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Import Issues</span>
            {skippedRowsHistory.length > 0 && (
              <span className="text-[9px] bg-rose-950 text-rose-400 px-1.5 py-0.2 rounded border border-rose-800">
                {skippedRowsHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {/* Feedback or Error messages */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Connection Warning</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {syncFeedbackMessage && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-3.5 rounded-xl flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncFeedbackMessage}</span>
            </div>
          )}

          {/* TAB 1: CONNECTION SETUP */}
          {activeTab === 'connection' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-bold">Google Sheet URL or Sheet ID *</label>
                  <span className="text-[10px] text-teal-400 font-medium flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    <span>No API key or login needed</span>
                  </span>
                </div>

                <input
                  type="text"
                  value={sheetUrlOrId}
                  onChange={(e) => {
                    setSheetUrlOrId(e.target.value);
                    setConnectionSuccess(null);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2.5 focus:outline-none focus:border-teal-500 font-mono text-xs"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Tab / Sheet Name <span className="text-slate-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="e.g. Form Responses 1 or Sheet1"
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-teal-500 text-xs"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {testingConnection ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Test Connection & Fetch Columns</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Connection Success State */}
                {connectionSuccess && (
                  <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-lg p-3 text-emerald-300 flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Successfully connected! Detected <strong>{detectedHeaders.length} columns</strong> and{' '}
                        <strong>{previewRowsCount} rows</strong>.
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab('mapping')}
                      className="text-xs text-teal-300 hover:text-white underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Proceed to Mapping</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions Guide */}
              <div className="bg-slate-950/80 p-4 border border-slate-800 rounded-xl space-y-2 text-slate-300">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-teal-400" />
                  <span>How to share your Google Sheet for integration:</span>
                </h4>
                <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                  <li>Open your Google Sheet or Google Form responses spreadsheet.</li>
                  <li>Click the top-right <strong className="text-slate-200">"Share"</strong> button.</li>
                  <li>Under General Access, change from "Restricted" to <strong className="text-teal-400 font-semibold">"Anyone with the link"</strong> (Viewer).</li>
                  <li>Copy the link and paste it into the field above.</li>
                </ol>
              </div>

              {/* Auto Sync Toggle & Status */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span>Automatic Live Sync (Every 5 Minutes)</span>
                    {autoSyncEnabled && (
                      <span className="text-[10px] bg-teal-950 text-teal-400 px-2 py-0.5 rounded border border-teal-800">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Automatically checks for new form responses or edited rows every 5 minutes in background.
                  </p>
                </div>
                <button
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    autoSyncEnabled ? 'bg-teal-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COLUMN MAPPING */}
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Map Google Sheet Columns to CRM Lead Fields</h3>
                  <p className="text-slate-400 text-[11px]">
                    Select which Google Sheet column populates each CRM lead attribute.
                  </p>
                </div>
                {detectedHeaders.length > 0 && (
                  <button
                    onClick={() => setColumnMapping(autoDetectMapping(detectedHeaders))}
                    className="text-xs text-teal-400 hover:text-teal-300 underline font-semibold cursor-pointer"
                  >
                    Auto-Detect Column Names
                  </button>
                )}
              </div>

              {detectedHeaders.length === 0 ? (
                <div className="bg-slate-950 p-6 border border-slate-800 rounded-xl text-center space-y-3">
                  <p className="text-slate-400">No columns detected yet. Please test connection first.</p>
                  <button
                    onClick={() => setActiveTab('connection')}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2 rounded-lg text-xs"
                  >
                    Go to Connection Setup
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-950 p-4 border border-slate-800 rounded-xl">
                  {/* Name */}
                  <div>
                    <label className="block text-slate-200 font-bold mb-1">Student Name Field *</label>
                    <select
                      value={columnMapping.name || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Select Sheet Column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-slate-200 font-bold mb-1">Phone Number Field *</label>
                    <select
                      value={columnMapping.phone || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Select Sheet Column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Email Address Field</label>
                    <select
                      value={columnMapping.email || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Address Field</label>
                    <select
                      value={columnMapping.address || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Lead Source Field</label>
                    <select
                      value={columnMapping.source || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, source: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Default: Facebook (Google Sheet))</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Course Interest Field</label>
                    <select
                      value={columnMapping.course_interest || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, course_interest: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class Mode */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Class Mode Field</label>
                    <select
                      value={columnMapping.class_mode || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, class_mode: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DOB */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Date of Birth Field</label>
                    <select
                      value={columnMapping.dob || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, dob: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Assigned Batch Field</label>
                    <select
                      value={columnMapping.assigned_batch || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, assigned_batch: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lead Score */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Lead Score Field</label>
                    <select
                      value={columnMapping.lead_score || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, lead_score: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Tags Field</label>
                    <select
                      value={columnMapping.tags || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, tags: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Remarks / Notes Field</label>
                    <select
                      value={columnMapping.notes || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, notes: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="">(Ignore column)</option>
                      {detectedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMPORT ISSUES */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Import Issues & Skipped Rows</h3>
                <p className="text-slate-400 text-[11px]">
                  Rows missing required contact information (Name or Phone) are automatically logged here.
                </p>
              </div>

              {skippedRowsHistory.length === 0 ? (
                <div className="bg-slate-950 p-8 border border-slate-800 rounded-xl text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-200">No import issues detected!</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">All Google Sheet rows were mapped successfully.</p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Row #</th>
                        <th className="py-2.5 px-3">Issue Reason</th>
                        <th className="py-2.5 px-3">Row Data Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {skippedRowsHistory.map((issue, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-bold text-rose-400">Row {issue.rowIndex}</td>
                          <td className="py-2 px-3 text-slate-300">{issue.reason}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10px] truncate max-w-[250px]">
                            {JSON.stringify(issue.data)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Last Sync:{' '}
              <strong className="text-slate-200">
                {config.lastSyncTime
                  ? new Date(config.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Never'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing || !sheetUrlOrId}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              onClick={() => {
                handleSaveAll();
                onClose();
              }}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-2 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Save & Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
