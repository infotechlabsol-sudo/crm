import React, { useState } from 'react';
import Papa from 'papaparse';
import { Lead, CRMSettings, LeadScore } from '../types';
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
  mappedAddress: string;
  mappedSource: string;
  mappedCourse: string;
  mappedClassMode: 'Online' | 'Offline';
  mappedDob: string;
  mappedBatch: string;
  mappedLeadScore: LeadScore;
  mappedTags: string[];
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

  // Mapping state for all 11 fields
  const [headerMapping, setHeaderMapping] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
    source: string;
    course_interest: string;
    class_mode: string;
    dob: string;
    assigned_batch: string;
    lead_score: string;
    tags: string;
  }>({
    name: '',
    phone: '',
    email: '',
    address: '',
    source: '',
    course_interest: '',
    class_mode: '',
    dob: '',
    assigned_batch: '',
    lead_score: '',
    tags: '',
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

  // Client-side sample CSV generation and download containing all 11 fields
  const handleDownloadSample = () => {
    const sampleData = [
      {
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul.sharma@example.com',
        address: 'Mowa, Raipur, Chhattisgarh',
        source: 'Facebook Ads',
        course_interest: 'Premiere Pro',
        class_mode: 'Offline',
        dob: '15-06-2002',
        assigned_batch: 'Batch 12 - Aug 2026',
        lead_score: 'Warm',
        tags: 'interested in weekend batch',
      },
    ];

    const csvContent = Papa.unparse(sampleData);
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
          name: headers.find((h) => /^name$|student.*name|client.*name|person/i.test(h.trim())) || headers.find((h) => /name/i.test(h)) || headers[0] || '',
          phone: headers.find((h) => /^phone$|mobile|contact|number/i.test(h.trim())) || headers[1] || '',
          email: headers.find((h) => /^email$|mail/i.test(h.trim())) || '',
          address: headers.find((h) => /^address$|location|city|place/i.test(h.trim())) || '',
          source: headers.find((h) => /^source$|channel|utm|ad/i.test(h.trim())) || '',
          course_interest: headers.find((h) => /^course_interest$|course|interest|program/i.test(h.trim())) || '',
          class_mode: headers.find((h) => /^class_mode$|class.*mode|mode|type/i.test(h.trim())) || '',
          dob: headers.find((h) => /^dob$|birth|date.*birth/i.test(h.trim())) || '',
          assigned_batch: headers.find((h) => /^assigned_batch$|batch|group/i.test(h.trim())) || '',
          lead_score: headers.find((h) => /^lead_score$|score|rating|lead.*score|priority/i.test(h.trim())) || '',
          tags: headers.find((h) => /^tags$|^tag$|label|keyword/i.test(h.trim())) || '',
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
      const mAddress = headerMapping.address ? (row[headerMapping.address] || '').trim() : '';
      const mSource = (row[headerMapping.source] || '').trim() || settings.sources[0] || 'Facebook Ads';
      const mCourse = (row[headerMapping.course_interest] || '').trim() || settings.courses[0] || 'General Course';
      const mBatch = (row[headerMapping.assigned_batch] || '').trim() || settings.batches[0] || 'Unassigned';
      
      const mClassModeRaw = headerMapping.class_mode ? (row[headerMapping.class_mode] || '').trim() : '';
      const mClassMode: 'Online' | 'Offline' = mClassModeRaw.toLowerCase().includes('online') ? 'Online' : 'Offline';
      
      const mDob = headerMapping.dob ? (row[headerMapping.dob] || '').trim() : '';

      const mScoreRaw = headerMapping.lead_score ? (row[headerMapping.lead_score] || '').trim().toLowerCase() : '';
      let mLeadScore: LeadScore = 'Warm';
      if (mScoreRaw.includes('hot')) mLeadScore = 'Hot';
      else if (mScoreRaw.includes('cold')) mLeadScore = 'Cold';
      else if (mScoreRaw.includes('warm')) mLeadScore = 'Warm';

      const mTagsRaw = headerMapping.tags ? (row[headerMapping.tags] || '').trim() : '';
      const mTags = mTagsRaw
        ? mTagsRaw.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
        : [];

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
        mappedAddress: mAddress,
        mappedSource: mSource,
        mappedCourse: mCourse,
        mappedBatch: mBatch,
        mappedClassMode: mClassMode,
        mappedDob: mDob,
        mappedLeadScore: mLeadScore,
        mappedTags: mTags,
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
              email: row.mappedEmail !== '' ? row.mappedEmail : original.email,
              address: row.mappedAddress !== '' ? row.mappedAddress : original.address,
              source: row.mappedSource || original.source,
              course_interest: row.mappedCourse || original.course_interest,
              assigned_batch: row.mappedBatch || original.assigned_batch,
              class_mode: row.mappedClassMode || original.class_mode || 'Offline',
              dob: row.mappedDob !== '' ? row.mappedDob : original.dob || '',
              lead_score: row.mappedLeadScore || original.lead_score || 'Warm',
              tags: row.mappedTags.length > 0 ? row.mappedTags : original.tags || [],
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
        email: row.mappedEmail || undefined,
        address: row.mappedAddress || undefined,
        source: row.mappedSource,
        course_interest: row.mappedCourse,
        status: 'New',
        assigned_batch: row.mappedBatch,
        class_mode: row.mappedClassMode || 'Offline',
        dob: row.mappedDob || '',
        lead_score: row.mappedLeadScore || 'Warm',
        created_date: nowISO,
        notes_history: [
          {
            id: 'n_init_' + Date.now() + Math.random().toString(36).substring(2, 5),
            note_text: 'Lead imported via CSV file.',
            timestamp: nowISO,
            added_by: 'System (CSV Import)',
            is_system: true,
          },
        ],
        tags: row.mappedTags.length > 0 ? row.mappedTags : ['CSV Import'],
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
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
          <div className="p-6 sm:p-8 text-center space-y-6 overflow-y-auto">
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
              <p className="text-[10px] text-slate-500 mt-1">
                Supported columns: name, phone, email, address, source, course_interest, class_mode, dob, assigned_batch, lead_score, tags
              </p>
            </div>

            {/* Download Template Section */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="space-y-1 flex-1">
                <p className="text-[11px] font-semibold text-slate-200">Need a starting template?</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Download this complete 11-column template, fill in your leads, then upload it above.
                </p>
                <p className="text-[10px] text-slate-500 italic">
                  Note: Optional fields left blank will save as default values for that lead.
                </p>
              </div>
              <button
                onClick={handleDownloadSample}
                className="w-full sm:w-auto shrink-0 bg-teal-950 hover:bg-teal-900/80 border border-teal-800 text-teal-400 text-xs px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Mapping Headers */}
        {step === 'mapping' && (
          <div className="p-6 space-y-5 text-xs overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Map CSV Columns to CRM Fields</h3>
              <p className="text-slate-400 mt-0.5">
                Verify which CSV column matches each lead field. Found {rawRows.length} rows in CSV.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-slate-950 p-4 border border-slate-800 rounded-xl">
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
                <label className="block text-slate-300 font-medium mb-1">Address Field</label>
                <select
                  value={headerMapping.address}
                  onChange={(e) => setHeaderMapping({ ...headerMapping, address: e.target.value })}
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
                <label className="block text-slate-300 font-medium mb-1">Lead Score Field</label>
                <select
                  value={headerMapping.lead_score}
                  onChange={(e) =>
                    setHeaderMapping({ ...headerMapping, lead_score: e.target.value })
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
                <label className="block text-slate-300 font-medium mb-1">Tags Field</label>
                <select
                  value={headerMapping.tags}
                  onChange={(e) =>
                    setHeaderMapping({ ...headerMapping, tags: e.target.value })
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
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
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

            {/* Table Preview showing all mapped columns */}
            <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left min-w-[1100px]">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Class Mode</th>
                    <th className="py-2.5 px-3">DOB</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Tags</th>
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
                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                        {!row.isValid ? (
                          <span className="text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800">
                            Skipped: {row.validationError}
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                            Duplicate ({duplicateStrategy.toUpperCase()})
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                            Ready
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-100 whitespace-nowrap">{row.mappedName || '—'}</td>
                      <td className="py-2 px-3 font-mono whitespace-nowrap">{row.mappedPhone || '—'}</td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{row.mappedEmail || '—'}</td>
                      <td className="py-2 px-3 text-slate-400 max-w-[150px] truncate" title={row.mappedAddress}>{row.mappedAddress || '—'}</td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{row.mappedSource}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{row.mappedCourse}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{row.mappedClassMode}</td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{row.mappedDob || '—'}</td>
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{row.mappedBatch}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{row.mappedLeadScore}</td>
                      <td className="py-2 px-3 text-slate-400 max-w-[150px] truncate" title={row.mappedTags.join(', ')}>
                        {row.mappedTags.length > 0 ? row.mappedTags.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
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
                Leads have been parsed and synchronized into your CRM database.
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

