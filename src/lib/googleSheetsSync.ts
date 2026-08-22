import Papa from 'papaparse';
import { Lead, CRMSettings, LeadScore, LeadStatus } from '../types';

export interface ColumnMapping {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  source?: string;
  course_interest?: string;
  class_mode?: string;
  dob?: string;
  assigned_batch?: string;
  lead_score?: string;
  tags?: string;
  status?: string;
  notes?: string;
  created_date?: string;
}

export interface ImportIssue {
  rowIndex: number;
  data: Record<string, string>;
  reason: string;
}

export interface GoogleSheetsConfig {
  sheetUrlOrId: string;
  sheetName: string;
  columnMapping: ColumnMapping;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number; // default 5
  lastSyncTime?: string;
  lastSyncResult?: {
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    timestamp: string;
  };
}

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  sheetUrlOrId: '',
  sheetName: '',
  columnMapping: {
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    source: 'Source',
    course_interest: 'Course',
  },
  autoSyncEnabled: true,
  syncIntervalMinutes: 5,
};

/**
 * Extracts Google Sheet ID from full URL or raw ID string
 */
export function extractSheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's a full Google Sheets URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise assume it's the raw sheet ID
  return trimmed;
}

/**
 * Fetches Google Sheet data as CSV and returns headers + rows
 */
export async function fetchGoogleSheetData(sheetUrlOrId: string, sheetName?: string): Promise<{
  headers: string[];
  rows: Record<string, string>[];
}> {
  const sheetId = extractSheetId(sheetUrlOrId);
  if (!sheetId) {
    throw new Error('Please enter a valid Google Sheet URL or Sheet ID.');
  }

  let fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  if (sheetName && sheetName.trim()) {
    fetchUrl += `&sheet=${encodeURIComponent(sheetName.trim())}`;
  }

  let response: Response;
  try {
    response = await fetch(fetchUrl);
  } catch (err: any) {
    throw new Error('Network error connecting to Google Sheets. Check your internet connection or URL.');
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Google Sheet not found. Please check the Sheet ID or URL.');
    }
    throw new Error(`Failed to fetch Google Sheet (HTTP ${response.status}). Ensure the sheet is shared as "Anyone with the link – Viewer".`);
  }

  const csvText = await response.text();

  // If HTML returned, sheet is private / login required
  if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.includes('google-signin') || csvText.includes('accounts.google.com')) {
    throw new Error('Access denied. Please set your Google Sheet sharing setting to "Anyone with the link – Viewer".');
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ? results.meta.fields.filter(Boolean) : [];
        if (!headers.length && !results.data.length) {
          reject(new Error('Google Sheet appears to be empty.'));
          return;
        }
        resolve({
          headers,
          rows: results.data,
        });
      },
      error: (error: any) => {
        reject(new Error('CSV parsing error: ' + error.message));
      },
    });
  });
}

/**
 * Cleans phone numbers for comparison
 */
export function cleanPhoneDigits(phoneStr?: string): string {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/\D/g, '');
  // If digits start with country code 91 and length is 12, take last 10
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Auto detects header mapping from detected columns
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const findHeader = (patterns: RegExp[]) => {
    for (const pat of patterns) {
      const match = headers.find((h) => pat.test(h.trim()));
      if (match) return match;
    }
    return '';
  };

  mapping.name = findHeader([/^name$/i, /^student.*name$/i, /^full.*name$/i, /name/i]);
  mapping.phone = findHeader([/^phone$/i, /^mobile$/i, /^contact$/i, /^phone.*number$/i, /phone|mobile/i]);
  mapping.email = findHeader([/^email$/i, /^email.*address$/i, /email|mail/i]);
  mapping.address = findHeader([/^address$/i, /^location$/i, /^city$/i, /address/i]);
  mapping.source = findHeader([/^source$/i, /^lead.*source$/i, /^channel$/i, /source/i]);
  mapping.course_interest = findHeader([/^course$/i, /^course.*interest$/i, /^program$/i, /course/i]);
  mapping.class_mode = findHeader([/^class.*mode$/i, /^mode$/i, /mode/i]);
  mapping.dob = findHeader([/^dob$/i, /^date.*of.*birth$/i, /^birth/i]);
  mapping.assigned_batch = findHeader([/^batch$/i, /^assigned.*batch$/i, /batch/i]);
  mapping.lead_score = findHeader([/^lead.*score$/i, /^score$/i, /^rating$/i, /score/i]);
  mapping.tags = findHeader([/^tags$/i, /^tag$/i, /^keywords$/i, /tag/i]);
  mapping.status = findHeader([/^status$/i, /^lead.*status$/i, /status/i]);
  mapping.notes = findHeader([/^notes$/i, /^remark$/i, /^comments$/i, /note|comment|remark/i]);
  mapping.created_date = findHeader([/^created.*date$/i, /^date$/i, /^timestamp$/i, /date|time/i]);

  return mapping;
}

/**
 * Processes rows from Google Sheet and syncs with CRM leads list
 */
export function processSheetSync({
  rows,
  mapping,
  existingLeads,
  settings,
}: {
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  existingLeads: Lead[];
  settings: CRMSettings;
}): {
  updatedLeads: Lead[];
  newLeads: Lead[];
  createdCount: number;
  updatedCount: number;
  skippedRows: ImportIssue[];
  createdLeadDetails: { name: string; source: string }[];
} {
  const nowISO = new Date().toISOString();
  const createdLeadDetails: { name: string; source: string }[] = [];
  const skippedRows: ImportIssue[] = [];

  const leadMap = new Map<string, Lead>();
  existingLeads.forEach((l) => leadMap.set(l.id, { ...l }));

  let createdCount = 0;
  let updatedCount = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // Row index (accounting for header)

    // Extract mapped field values
    const rawName = mapping.name ? (row[mapping.name] || '').trim() : '';
    const rawPhone = mapping.phone ? (row[mapping.phone] || '').trim() : '';
    const cleanedPhone = cleanPhoneDigits(rawPhone);
    const rawEmail = mapping.email ? (row[mapping.email] || '').trim().toLowerCase() : '';
    const rawAddress = mapping.address ? (row[mapping.address] || '').trim() : '';
    const rawSource = mapping.source ? (row[mapping.source] || '').trim() : '';
    const rawCourse = mapping.course_interest ? (row[mapping.course_interest] || '').trim() : '';
    const rawClassMode = mapping.class_mode ? (row[mapping.class_mode] || '').trim() : '';
    const rawDob = mapping.dob ? (row[mapping.dob] || '').trim() : '';
    const rawBatch = mapping.assigned_batch ? (row[mapping.assigned_batch] || '').trim() : '';
    const rawScore = mapping.lead_score ? (row[mapping.lead_score] || '').trim() : '';
    const rawTags = mapping.tags ? (row[mapping.tags] || '').trim() : '';
    const rawStatus = mapping.status ? (row[mapping.status] || '').trim() : '';
    const rawNotes = mapping.notes ? (row[mapping.notes] || '').trim() : '';
    const rawDate = mapping.created_date ? (row[mapping.created_date] || '').trim() : '';

    // Validation check: Required field Name or Phone
    if (!rawName && !cleanedPhone && !rawEmail) {
      skippedRows.push({
        rowIndex: rowNum,
        data: row,
        reason: 'Missing required contact identifier (Name, Phone, or Email).',
      });
      return;
    }

    const finalName = rawName || `Student ${cleanedPhone || 'Lead'}`;

    // Look for existing lead match by Phone or Email
    let matchedLead: Lead | undefined;

    if (cleanedPhone && cleanedPhone.length >= 7) {
      matchedLead = Array.from(leadMap.values()).find(
        (l) => cleanPhoneDigits(l.phone) === cleanedPhone
      );
    }

    if (!matchedLead && rawEmail) {
      matchedLead = Array.from(leadMap.values()).find(
        (l) => l.email && l.email.toLowerCase() === rawEmail
      );
    }

    // Default Fallbacks
    const defaultSource = rawSource || 'Facebook (Google Sheet)';
    const defaultCourse = rawCourse || settings.courses[0] || 'General Course';
    const defaultBatch = rawBatch || settings.batches[0] || 'Unassigned';

    let classModeVal: 'Online' | 'Offline' = 'Offline';
    if (rawClassMode.toLowerCase().includes('online')) classModeVal = 'Online';

    let scoreVal: LeadScore = 'Warm';
    if (rawScore.toLowerCase().includes('hot')) scoreVal = 'Hot';
    else if (rawScore.toLowerCase().includes('cold')) scoreVal = 'Cold';

    const tagsArr = rawTags
      ? rawTags.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
      : ['Google Sheet'];

    if (matchedLead) {
      // UPDATE EXISTING LEAD - Only overwrite mapped non-empty values
      let changed = false;

      if (rawName && matchedLead.name !== rawName) {
        matchedLead.name = rawName;
        changed = true;
      }
      if (rawEmail && matchedLead.email !== rawEmail) {
        matchedLead.email = rawEmail;
        changed = true;
      }
      if (rawAddress && matchedLead.address !== rawAddress) {
        matchedLead.address = rawAddress;
        changed = true;
      }
      if (rawSource && matchedLead.source !== rawSource) {
        matchedLead.source = rawSource;
        changed = true;
      }
      if (rawCourse && matchedLead.course_interest !== rawCourse) {
        matchedLead.course_interest = rawCourse;
        changed = true;
      }
      if (rawClassMode && matchedLead.class_mode !== classModeVal) {
        matchedLead.class_mode = classModeVal;
        changed = true;
      }
      if (rawDob && matchedLead.dob !== rawDob) {
        matchedLead.dob = rawDob;
        changed = true;
      }
      if (rawBatch && matchedLead.assigned_batch !== rawBatch) {
        matchedLead.assigned_batch = rawBatch;
        changed = true;
      }
      if (rawScore && matchedLead.lead_score !== scoreVal) {
        matchedLead.lead_score = scoreVal;
        changed = true;
      }

      if (rawNotes) {
        const hasNote = matchedLead.notes_history?.some((n) => n.note_text === rawNotes);
        if (!hasNote) {
          matchedLead.notes_history = matchedLead.notes_history || [];
          matchedLead.notes_history.unshift({
            id: 'n_gsync_' + Date.now() + Math.random().toString(36).substring(2, 5),
            note_text: rawNotes,
            timestamp: nowISO,
            added_by: 'Google Sheet Sync',
          });
          changed = true;
        }
      }

      if (changed) {
        matchedLead.last_contacted_date = nowISO;
        leadMap.set(matchedLead.id, matchedLead);
        updatedCount++;
      }
    } else {
      // CREATE NEW LEAD
      const newLeadId = 'lead_gsync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      
      let validCreatedDate = nowISO;
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          validCreatedDate = parsedDate.toISOString();
        }
      }

      const initialNotes = [
        {
          id: 'n_init_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          note_text: rawNotes || 'Imported automatically via Google Sheet live sync.',
          timestamp: nowISO,
          added_by: 'Google Sheet Sync',
        },
      ];

      let initialStatus: LeadStatus = 'New';
      if (rawStatus && ['New', 'Contacted', 'Interested', 'Follow-up', 'Demo Scheduled', 'Enrolled', 'Not Interested', 'Lost'].includes(rawStatus)) {
        initialStatus = rawStatus as LeadStatus;
      }

      const newLead: Lead = {
        id: newLeadId,
        name: finalName,
        phone: rawPhone || cleanedPhone,
        email: rawEmail || undefined,
        address: rawAddress || undefined,
        source: defaultSource,
        course_interest: defaultCourse,
        status: initialStatus,
        assigned_batch: defaultBatch,
        lead_score: scoreVal,
        created_date: validCreatedDate,
        class_mode: classModeVal,
        dob: rawDob || undefined,
        notes_history: initialNotes,
        tags: tagsArr,
      };

      leadMap.set(newLeadId, newLead);
      createdCount++;
      createdLeadDetails.push({ name: newLead.name, source: newLead.source });
    }
  });

  const allResultLeads = Array.from(leadMap.values());
  const newLeads = allResultLeads.filter((l) => l.id.startsWith('lead_gsync_') && !existingLeads.some((e) => e.id === l.id));
  const updatedLeads = allResultLeads.filter((l) => existingLeads.some((e) => e.id === l.id));

  return {
    updatedLeads: allResultLeads,
    newLeads,
    createdCount,
    updatedCount,
    skippedRows,
    createdLeadDetails,
  };
}

/**
 * Web Audio API synthesized notification sound (crisp double chime)
 */
export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Tone 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.1);
    gain2.gain.setValueAtTime(0.18, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch (e) {
    // Audio context initialization blocked or unsupported
  }
}
