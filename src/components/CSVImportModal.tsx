import React, { useState } from 'react';
import Papa from 'papaparse';
import { Lead, CRMSettings } from '../types';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';
import { isValidPhone, cleanPhoneNumber } from '../lib/utils';

interface CSVImportModalProps {
  existingLeads: Lead[];
  settings: CRMSettings;
  onClose: () => void;
  onImportComplete: (newLeads: Lead[], updatedLeads: Lead[]) => void;
}

interface ParsedRow {
  raw: Record<string, string>;
  mappedName: string;
  mappedPhone: string;
  mappedEmail: string;
  mappedSource: string;
  mappedCourse: string;
  mappedBatch: string;
  mappedClassMode: 'Online' | 'Offline';
  mappedDob: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate: boolean;
  existingLeadId?: string;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  existingLeads,
  settings,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  // Mapping state
  const [headerMapping, setHeaderMapping] = useState<{
    name: string;
    phone: string;
    email: string;
    source: string;
    course_interest: string;
    assigned_batch: string;
    class_mode: string;
    dob: string;
  }>({
    name: '',
    phone: '',
    email: '',
    source: '',
    course_interest: '',
    assigned_batch: '',
    class_mode: '',
    dob: '',
  });

  // Duplicate strategy: 'skip' | 'update'
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');

  // Parsed Preview Rows
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);

  // Final summary stats
  const [summary, setSummary] = useState({
    imported: 0,
    updated: 0,
    skipped: 0,
    total: 0,
  });

  // Client-side sample CSV generation and download
  const handleDownloadSample = () => {
    const headers = ['name', 'phone', 'email', 'source', 'course_interest', 'class_mode', 'dob'];
    const sampleCourse = settings.courses[0] || 'Web Development';
    const row = ['Rahul Sharma', '9876543210', 'rahul.sharma@example.com', 'Facebook Ads', sampleCourse, 'Offline', '2002-06-15'];
    
    const csvContent = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'tech_lab_leads_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a valid .csv file!');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.warn('CSV Parse Warnings:', results.errors);
        }

        const data = results.data as Record<string, string>[];
        if (!data || data.length === 0) {
          alert('CSV file is empty or invalid!');
          return;
        }

        const headers = Object.keys(data[0] || {});
        setRawHeaders(headers);
        setRawRows(data);

        // Auto detect matching headers
        const autoMap = {
          name: headers.find((h) => /name|student|client|person/i.test(h)) || headers[0] || '',
          phone: headers.find((h) => /phone|mobile|contact|number/i.test(h)) || headers[1] || '',
          email: headers.find((h) => /email|mail/i.test(h)) || '',
          source: headers.find((h) => /source|channel|utm|ad/i.test(h)) || '',
          course_interest: headers.find((h) => /course|interest|program/i.test(h)) || '',
          assigned_batch: headers.find((h) => /batch|group/i.test(h)) || '',
          class_mode: headers.find((h) => /class.*mode|mode|type/i.test(h)) || '',
          dob: headers.find((h) => /dob|birth|date.*birth/i.test(h)) || '',
        };

        setHeaderMapping(autoMap);
        setStep('mapping');
      },
      error: (err) => {
        alert('Failed to parse CSV file: ' + err.message);
      },
    });
  };

  // Process Mapping into Preview Rows
  const handleProcessMapping = () => {
    const existingPhoneMap = new Map<string, Lead>();
    existingLeads.forEach((l) => {
      const cleanP = cleanPhoneNumber(l.phone);
      if (cleanP) existingPhoneMap.set(cleanP, l);
    });

    const rows: ParsedRow[] = rawRows.map((row) => {
      const mName = (row[headerMapping.name] || '').trim();
      const mPhoneRaw = (row[headerMapping.phone] || '').trim();
      const mPhoneClean = cleanPhoneNumber(mPhoneRaw);
      const mEmail = (row[headerMapping.email] || '').trim();
      const mSource = (row[headerMapping.source] || '').trim() || settings.sources[0] || 'Facebook Ads';
      const mCourse = (row[headerMapping.course_interest] || '').trim() || settings.courses[0] || 'General Course';
      const mBatch = (row[headerMapping.assigned_batch] || '').trim() || settings.batches[0] || 'Unassigned';
      const mClassModeRaw = headerMapping.class_mode ? (row[headerMapping.class_mode] || '').trim() : '';
      const mClassMode: 'Online' | 'Offline' = mClassModeRaw.toLowerCase().includes('online') ? 'Online' : 'Offline';
      const mDob = headerMapping.dob ? (row[headerMapping.dob] || '').trim() : '';

      let isValid = true;
      let validationError: string | undefined;

      if (!mName) {
        isValid = false;
        validationError = 'Missing name';
      } else if (!mPhoneClean || !isValidPhone(mPhoneClean)) {
        isValid = false;
        validationError = 'Invalid or missing phone';
      }

      const existingLead = existingPhoneMap.get(mPhoneClean);
      const isDuplicate = !!existingLead;

      return {
        raw: row,
        mappedName: mName,
        mappedPhone: mPhoneClean,
        mappedEmail: mEmail,
        mappedSource: mSource,
        mappedCourse: mCourse,
        mappedBatch: mBatch,
        mappedClassMode: mClassMode,
        mappedDob: mDob,
        isValid,
        validationError,
        isDuplicate,
        existingLeadId: existingLead?.id,
      };
    });

    setPreviewRows(rows);
    setStep('preview');
  };

  // Perform Final Import
  const handleConfirmImport = () => {
    const nowISO = new Date().toISOString();
    const newLeadsToSave: Lead[] = [];
    const updatedLeadsToSave: Lead[] = [];

    let countImported = 0;
    let countUpdated = 0;
    let countSkipped = 0;

    previewRows.forEach((row) => {
      if (!row.isValid) {
        countSkipped++;
        return;
      }

      if (row.isDuplicate) {
        if (duplicateStrategy === 'skip') {
          countSkipped++;
          return;
        } else if (duplicateStrategy === 'update' && row.existingLeadId) {
          const original = existingLeads.find((l) => l.id === row.existingLeadId);
          if (original) {
            const updated: Lead = {
              ...original,
              name: row.mappedName || original.name,
              email: row.mappedEmail || original.email,
              source: row.mappedSource || original.source,
              course_interest: row.mappedCourse || original.course_interest,
              assigned_batch: row.mappedBatch || original.assigned_batch,
              class_mode: row.mappedClassMode || original.class_mode || 'Offline',
              dob: row.mappedDob || original.dob || '',
              last_contacted_date: nowISO,
              notes_history: [
                {
                  id: 'n_import_' + Date.now() + Math.random().toString(36).substring(2, 5),
                  note_text: 'Lead updated via CSV bulk re-import.',
                  timestamp: nowISO,
                  added_by: 'System (CSV Import)',
                  is_system: true,
                },
                ...(original.notes_history || []),
              ],
            };
            updatedLeadsToSave.push(updated);
            countUpdated++;
          }
          return;
        }
      }

      // Create fresh lead
      const freshLead: Lead = {
        id: 'lead_csv_' + Date.now() + Math.random().toString(36).substring(2, 6),
        name: row.mappedName,
        phone: row.mappedPhone,
        email: row.mappedEmail,
        source: row.mappedSource,
        course_interest: row.mappedCourse,
        status: 'New',
        assigned_batch: row.mappedBatch,
        class_mode: row.mappedClassMode || 'Offline',
        dob: row.mappedDob || '',
        lead_score: 'Warm',
        created_date: nowISO,
        notes_history: [
          {
            id: 'n_init_' + Date.now(),
            note_text: 'Lead imported via CSV file.',
            timestamp: nowISO,
            added_by: 'System (CSV Import)',
            is_system: true,
          },
        ],
        tags: ['CSV Import'],
      };

      newLeadsToSave.push(freshLead);
      countImported++;
    });

    onImportComplete(newLeadsToSave, updatedLeadsToSave);

    setSummary({
      imported: countImported,
      updated: countUpdated,
      skipped: countSkipped,
      total: previewRows.length,
    });

    setStep('result');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-teal-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">Bulk CSV Lead Import</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Upload File */}
        {step === 'upload' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-950/80 border border-teal-800/60 flex items-center justify-center mx-auto text-teal-400 shadow-lg">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">Upload CSV Lead Spreadsheet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upload your CSV file with student contacts (Meta Ads export, Google Lead Forms, or local registers).
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-800 hover:border-teal-500/80 rounded-xl p-8 bg-slate-950 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">
                Click or drag & drop .CSV file here
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Expected columns: Name, Phone, Email, Source, Course Interest, Class Mode, DOB</p>
            </div>

            {/* Download Template Section */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="space-y-1 flex-1">
                <p className="text-[11px] font-semibold text-slate-200">Need a starting template?</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Download this template, fill in your leads, then upload it below. Don't change the column headers.
                </p>
                <p className="text-[10px] text-slate-500 italic">
                  Note: For Date of Birth (dob), please use the format <strong className="text-teal-400 font-medium">YYYY-MM-DD</strong> (e.g., 2002-06-15).
                </p>
              </div>
              <button
                onClick={handleDownloadSample}
                className="w-full sm:w-auto shrink-0 bg-teal-950 hover:bg-teal-900/80 border border-teal-800 text-teal-400 text-xs px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Mapping Headers */}
        {step === 'mapping' && (
          <div className="p-6 space-y-5 text-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Map CSV Columns to CRM Fields</h3>
              <p className="text-slate-400 mt-0.5">
                Verify which CSV column matches each required lead field. Found {rawRows.length} rows in CSV.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 border border-slate-800 rounded-xl">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Student Name Field *</label>
                <select
                  value={headerMapping.name}
                  onChange={(e) => setHeaderMapping({ ...headerMapping, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">-- Select Column --</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Phone Number Field *</label>
                <select
                  value={headerMapping.phone}
                  onChange={(e) => setHeaderMapping({ ...headerMapping, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">-- Select Column --</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Field</label>
                <select
                  value={headerMapping.email}
                  onChange={(e) => setHeaderMapping({ ...headerMapping, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">(Optional) Select Column</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Lead Source Field</label>
                <select
                  value={headerMapping.source}
                  onChange={(e) => setHeaderMapping({ ...headerMapping, source: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">(Optional) Select Column</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Course Interest Field</label>
                <select
                  value={headerMapping.course_interest}
                  onChange={(e) =>
                    setHeaderMapping({ ...headerMapping, course_interest: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">(Optional) Select Column</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Batch Field</label>
                <select
                  value={headerMapping.assigned_batch}
                  onChange={(e) =>
                    setHeaderMapping({ ...headerMapping, assigned_batch: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">(Optional) Select Column</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Class Mode Field</label>
                <select
                  value={headerMapping.class_mode}
                  onChange={(e) =>
                    setHeaderMapping({ ...headerMapping, class_mode: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">(Optional) Select Column</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Date of Birth (DOB) Field</label>
                <select
                  value={headerMapping.dob}
                  onChange={(e) =>
                    setHeaderMapping({ ...headerMapping, dob: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
                >
                  <option value="">(Optional) Select Column</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                Back
              </button>

              <button
                onClick={handleProcessMapping}
                disabled={!headerMapping.name || !headerMapping.phone}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <span>Continue to Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Duplicate Handling */}
        {step === 'preview' && (
          <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 border border-slate-800 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Preview Leads Data ({previewRows.length} Rows)
                </h3>
                <p className="text-slate-400 mt-0.5">
                  Valid: {previewRows.filter((r) => r.isValid).length} | Invalid:{' '}
                  {previewRows.filter((r) => !r.isValid).length} | Duplicates:{' '}
                  {previewRows.filter((r) => r.isDuplicate).length}
                </p>
              </div>

              {/* Duplicate Strategy Option */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">When Duplicate Phone Found:</span>
                <select
                  value={duplicateStrategy}
                  onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-teal-400 font-bold rounded-lg p-1.5"
                >
                  <option value="skip">Skip Duplicates</option>
                  <option value="update">Update Existing Lead Info</option>
                </select>
              </div>
            </div>

            {/* Table Preview */}
            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-800/40 ${
                        !row.isValid
                          ? 'bg-rose-950/20 text-rose-300'
                          : row.isDuplicate
                          ? 'bg-amber-950/20 text-amber-300'
                          : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-semibold">
                        {!row.isValid ? (
                          <span className="text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800">
                            Skipped: {row.validationError}
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                            Duplicate Phone ({duplicateStrategy.toUpperCase()})
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                            Ready to Import
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-100">{row.mappedName || '—'}</td>
                      <td className="py-2 px-3 font-mono">{row.mappedPhone || '—'}</td>
                      <td className="py-2 px-3 text-slate-400">{row.mappedEmail || '—'}</td>
                      <td className="py-2 px-3">{row.mappedCourse}</td>
                      <td className="py-2 px-3 text-slate-400">{row.mappedSource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                Back to Mapping
              </button>

              <button
                onClick={handleConfirmImport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-lg shadow-md cursor-pointer"
              >
                Confirm & Import Leads Now
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Result Summary */}
        {step === 'result' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-100">CSV Import Completed!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Leads have been parsed and synchronized into your CRM local database.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-xs">
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-emerald-400">{summary.imported}</div>
                <div className="text-slate-400 font-medium mt-1">Fresh Leads Added</div>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-teal-400">{summary.updated}</div>
                <div className="text-slate-400 font-medium mt-1">Existing Updated</div>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl">
                <div className="text-2xl font-bold text-rose-400">{summary.skipped}</div>
                <div className="text-slate-400 font-medium mt-1">Rows Skipped</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 py-2.5 rounded-lg shadow-md cursor-pointer"
            >
              Done — Back to Directory
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
