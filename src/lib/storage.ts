import { Lead, CRMSettings, CourseItem, BatchItem } from '../types';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';

// Your web app's Firebase configuration from the user's request
const firebaseConfig = {
  apiKey: "AIzaSyCJIdXU6ZqVlOJKxambasX2vp6voYlMZt4",
  authDomain: "tech-lab-crm.firebaseapp.com",
  projectId: "tech-lab-crm",
  storageBucket: "tech-lab-crm.firebasestorage.app",
  messagingSenderId: "698239065481",
  appId: "1:698239065481:web:e22782093791e1be825558",
  measurementId: "G-QB3TZM2VEN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Error handling helper
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Default settings
export const DEFAULT_SETTINGS: CRMSettings = {
  courses: [
    'Premiere Pro',
    'After Effects',
    'Photoshop',
    'Illustrator',
    'Canva',
    'Full Video Editor Roadmap 365-day',
    'GenAI Tools',
    'Other',
  ],
  sources: [
    'Facebook Ads',
    'Instagram Ads',
    'Google Ads',
    'Walk-in',
    'Referral',
    'YouTube',
    'Other',
  ],
  batches: [
    'Batch 11 - Jul 2026',
    'Batch 12 - Aug 2026',
    'Batch 13 - Sep 2026',
    'Weekend Express Batch',
    'Unassigned',
  ],
  whatsappTemplates: [
    {
      id: 'tpl_1',
      title: 'Batch Update & Demo Invite',
      message:
        'Namaste {name}! Greetings from Tech Lab Academy. Your inquiry for {course} is received. Our next batch ({batch}) starts this week. Would you like to join a free 30-min live demo session today?',
    },
    {
      id: 'tpl_2',
      title: 'Follow-up Call Reminder',
      message:
        'Hi {name}, following up regarding your career in Video Editing & Design at Tech Lab Academy. Have you had time to check the course syllabus for {course}? Let us know when you are free for a quick call.',
    },
    {
      id: 'tpl_3',
      title: 'Enrolled Welcome & Batch Schedule',
      message:
        'Congratulations {name}! Welcome to Tech Lab Academy. You are officially enrolled in {course} for {batch}. Class timings and software installation setup guide will be shared shortly.',
    },
  ],
};

// Local in-memory cache to keep synchronous retrieval working
let leadsCache: Lead[] = [];
let coursesCache: CourseItem[] = [];
let batchesCache: BatchItem[] = [];
let settingsCache: CRMSettings = DEFAULT_SETTINGS;

// Subscribe to real-time updates for Leads
export function subscribeToLeads(
  onUpdate: (leads: Lead[]) => void,
  onError: (error: any) => void
) {
  const colRef = collection(db, 'leads');
  return onSnapshot(colRef, (snapshot) => {
    const leads: Lead[] = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      leads.push({
        id: docSnapshot.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        source: data.source || '',
        course_interest: data.course_interest || '',
        status: data.status || 'New',
        assigned_batch: data.assigned_batch || 'Unassigned',
        lead_score: data.lead_score || 'Warm',
        created_date: data.created_date || new Date().toISOString(),
        last_contacted_date: data.last_contacted_date,
        next_followup_date: data.next_followup_date,
        notes_history: data.notes_history || [],
        tags: Array.isArray(data.tags)
          ? data.tags
          : (typeof data.tags === 'string' && data.tags
              ? (data.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
              : []),
        address: data.address || '',
        converted_to_student: data.converted_to_student || false,
        class_mode: data.class_mode || 'Offline',
        dob: data.dob || '',
      } as Lead);
    });

    // Sort leads chronologically (created_date desc) to match local-storage order
    leads.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

    leadsCache = leads;
    onUpdate(leads);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'leads');
    onError(error);
  });
}

// Subscribe to real-time updates for Courses
export function subscribeToCourses(
  onUpdate: (courses: CourseItem[]) => void,
  onError?: (error: any) => void
) {
  const colRef = collection(db, 'courses');
  return onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty) {
      onUpdate([]);
      return;
    }

    const items: CourseItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        name: data.name || '',
        active: data.active !== false,
        created_timestamp: data.created_timestamp,
      });
    });

    items.sort((a, b) => a.name.localeCompare(b.name));
    coursesCache = items;
    settingsCache = {
      ...settingsCache,
      courses: items.filter((c) => c.active).map((c) => c.name),
    };
    onUpdate(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'courses');
    if (onError) onError(error);
  });
}

// Subscribe to real-time updates for Batches
export function subscribeToBatches(
  onUpdate: (batches: BatchItem[]) => void,
  onError?: (error: any) => void
) {
  const colRef = collection(db, 'batches');
  return onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty) {
      onUpdate([]);
      return;
    }

    const items: BatchItem[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        name: data.name || '',
        active: data.active !== false,
        created_timestamp: data.created_timestamp,
      });
    });

    items.sort((a, b) => a.name.localeCompare(b.name));
    batchesCache = items;
    settingsCache = {
      ...settingsCache,
      batches: items.filter((b) => b.active).map((b) => b.name),
    };
    onUpdate(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'batches');
    if (onError) onError(error);
  });
}

// Course CRUD Operations
export async function addCourse(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await addDoc(collection(db, 'courses'), {
      name: trimmed,
      active: true,
      created_timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'courses');
  }
}

export async function updateCourse(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await setDoc(doc(db, 'courses', id), { name: trimmed }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `courses/${id}`);
  }
}

export async function deactivateCourse(id: string): Promise<void> {
  try {
    await setDoc(doc(db, 'courses', id), { active: false }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `courses/${id}`);
  }
}

export async function reactivateCourse(id: string): Promise<void> {
  try {
    await setDoc(doc(db, 'courses', id), { active: true }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `courses/${id}`);
  }
}

// Batch CRUD Operations
export async function addBatch(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await addDoc(collection(db, 'batches'), {
      name: trimmed,
      active: true,
      created_timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'batches');
  }
}

export async function updateBatch(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await setDoc(doc(db, 'batches', id), { name: trimmed }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `batches/${id}`);
  }
}

export async function deactivateBatch(id: string): Promise<void> {
  try {
    await setDoc(doc(db, 'batches', id), { active: false }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `batches/${id}`);
  }
}

export async function reactivateBatch(id: string): Promise<void> {
  try {
    await setDoc(doc(db, 'batches', id), { active: true }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `batches/${id}`);
  }
}

export function getCourses(): CourseItem[] {
  return coursesCache;
}

export function getActiveCourses(): string[] {
  return coursesCache.filter((c) => c.active).map((c) => c.name);
}

export function getBatches(): BatchItem[] {
  return batchesCache;
}

export function getActiveBatches(): string[] {
  return batchesCache.filter((b) => b.active).map((b) => b.name);
}

// Subscribe to real-time updates for Settings
export function subscribeToSettings(
  onUpdate: (settings: CRMSettings) => void,
  onError: (error: any) => void
) {
  const docRef = doc(db, 'settings', 'config');
  return onSnapshot(docRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data() as CRMSettings;
      settingsCache = {
        courses: getActiveCourses().length > 0 ? getActiveCourses() : (data.courses || DEFAULT_SETTINGS.courses),
        sources: data.sources || DEFAULT_SETTINGS.sources,
        batches: getActiveBatches().length > 0 ? getActiveBatches() : (data.batches || DEFAULT_SETTINGS.batches),
        whatsappTemplates: data.whatsappTemplates || DEFAULT_SETTINGS.whatsappTemplates,
      };
      onUpdate(settingsCache);
    } else {
      onUpdate(DEFAULT_SETTINGS);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'settings/config');
    onError(error);
  });
}

// Synchronous Fallbacks
export function getLeads(): Lead[] {
  return leadsCache;
}

export function getSettings(): CRMSettings {
  return settingsCache;
}

// Helper to deep clean undefined values from any object for Firestore compatibility
function sanitizeData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item));
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        clean[key] = sanitizeData(obj[key]);
      }
    }
    return clean;
  }
  return obj;
}

// Async Storage Actions
export function saveLeads(leads: Lead[]): void {
  try {
    leads.forEach(async (lead) => {
      const { id, ...data } = lead;
      // Ensure default fields
      if (data.status === 'Enrolled') {
        data.converted_to_student = true;
        if (!data.enrolled_date) {
          data.enrolled_date = new Date().toISOString();
        }
      }
      if (data.converted_to_student === undefined) {
        data.converted_to_student = false;
      }
      if (data.address === undefined) {
        data.address = '';
      }
      if (data.class_mode === undefined) {
        data.class_mode = 'Offline';
      }
      if (data.dob === undefined) {
        data.dob = '';
      }
      const sanitized = sanitizeData(data);
      await setDoc(doc(db, 'leads', id), sanitized);
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, 'leads_bulk');
  }
}

export function getLeadById(id: string): Lead | undefined {
  return leadsCache.find((l) => l.id === id);
}

export function saveLead(lead: Lead): Lead {
  const { id, ...data } = lead;
  if (data.status === 'Enrolled' || data.converted_to_student) {
    if (!data.enrolled_date) {
      data.enrolled_date = new Date().toISOString();
    }
  }
  if (data.status === 'Enrolled' && !data.converted_to_student) {
    data.converted_to_student = true;
  }
  if (data.converted_to_student === undefined) {
    data.converted_to_student = false;
  }
  if (data.address === undefined) {
    data.address = '';
  }
  if (data.class_mode === undefined) {
    data.class_mode = 'Offline';
  }
  if (data.dob === undefined) {
    data.dob = '';
  }
  const sanitized = sanitizeData(data);
  setDoc(doc(db, 'leads', id), sanitized).catch((err) => {
    handleFirestoreError(err, OperationType.WRITE, `leads/${id}`);
  });
  return lead;
}

export function updateLeadStatus(id: string, newStatus: Lead['status'], actor: string = 'Admin'): Lead | undefined {
  const lead = leadsCache.find((l) => l.id === id);
  if (!lead) return undefined;

  const oldStatus = lead.status;
  if (oldStatus !== newStatus) {
    const updatedLead: Lead = {
      ...lead,
      status: newStatus,
      converted_to_student: newStatus === 'Enrolled' ? true : lead.converted_to_student,
      enrolled_date: newStatus === 'Enrolled' ? (lead.enrolled_date || new Date().toISOString()) : lead.enrolled_date,
      notes_history: [
        {
          id: 'note_' + Date.now(),
          note_text: `Status changed from "${oldStatus}" to "${newStatus}"`,
          timestamp: new Date().toISOString(),
          added_by: actor,
          is_system: true,
        },
        ...(lead.notes_history || [])
      ]
    };
    saveLead(updatedLead);
  }
  return lead;
}

export function addNoteToLead(id: string, noteText: string, actor: string = 'Admin'): Lead | undefined {
  const lead = leadsCache.find((l) => l.id === id);
  if (!lead) return undefined;

  const nowISO = new Date().toISOString();
  const updatedLead: Lead = {
    ...lead,
    last_contacted_date: nowISO,
    notes_history: [
      {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        note_text: noteText,
        timestamp: nowISO,
        added_by: actor,
      },
      ...(lead.notes_history || [])
    ]
  };
  saveLead(updatedLead);
  return updatedLead;
}

export function deleteLead(id: string): void {
  deleteDoc(doc(db, 'leads', id)).catch((err) => {
    handleFirestoreError(err, OperationType.DELETE, `leads/${id}`);
  });
}

export function deleteLeadsBulk(ids: string[]): void {
  ids.forEach((id) => {
    deleteLead(id);
  });
}

export function saveSettings(settings: CRMSettings): void {
  settingsCache = settings;
  setDoc(doc(db, 'settings', 'config'), settings).catch((err) => {
    handleFirestoreError(err, OperationType.WRITE, 'settings/config');
  });
}

export function clearAllLeads(): void {
  localStorage.setItem('techlab_crm_manually_cleared_v1', 'true');
  leadsCache.forEach((lead) => {
    deleteLead(lead.id);
  });
}
