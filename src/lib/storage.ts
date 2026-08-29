import { Lead, CRMSettings, CourseItem, BatchItem, WhatsAppTemplate, EmailTemplate, CustomForm, FormFieldDefinition } from '../types';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  increment,
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

// Default WhatsApp Templates
export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_wa_1',
    name: 'Batch Update & Demo Invite',
    message:
      'Namaste {{name}}! Greetings from Tech Lab Academy. Your inquiry for {{course_interest}} is received. Our next batch ({{batch}}) starts this week. Would you like to join a free 30-min live demo session today?',
    created_timestamp: new Date().toISOString(),
  },
  {
    id: 'tpl_wa_2',
    name: 'Follow-up Call Reminder',
    message:
      'Hi {{name}}, following up regarding your career in Video Editing & Design at Tech Lab Academy. Have you had time to check the course syllabus for {{course_interest}}? Let us know when you are free for a quick call.',
    created_timestamp: new Date().toISOString(),
  },
  {
    id: 'tpl_wa_3',
    name: 'Fee Reminder',
    message:
      'Hi {{name}}, this is a friendly reminder from Tech Lab Academy regarding your pending fees payment for {{course_interest}} (Batch: {{batch}}). Please let us know once transferred so we can confirm your seat.',
    created_timestamp: new Date().toISOString(),
  },
  {
    id: 'tpl_wa_4',
    name: 'Enrolled Welcome & Batch Schedule',
    message:
      'Congratulations {{name}}! Welcome to Tech Lab Academy. You are officially enrolled in {{course_interest}} for {{batch}}. Class timings and software installation setup guide will be shared shortly.',
    created_timestamp: new Date().toISOString(),
  },
];

// Default Rich-Text Email Templates
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_em_1',
    name: 'Batch Details & Curriculum',
    subject: 'Learn {{course_interest}} at Tech Lab Academy — Batch Details Inside',
    message:
      '<p>Hi <strong>{{name}}</strong>,</p><p><br></p><p>Thank you for showing interest in <strong>Tech Lab Academy</strong>! We\'re excited to help you build strong, industry-ready skills in <strong>{{course_interest}}</strong>.</p><p><br></p><p>Here is a quick overview of what you can expect from our training:</p><ul><li>Hands-on, project-based learning</li><li>Industry-relevant tools and real editing software</li><li>Flexible batch timings (Online and Offline options available)</li><li>Certification on course completion</li></ul><p><br></p><p>Our upcoming batch (<strong>{{batch}}</strong>) is filling up fast. If you have any questions about the course modules, fees, or schedule, feel free to reply to this email or call us directly.</p><p><br></p><p>Warm regards,<br><strong>Team Tech Lab Academy</strong><br>Mowa, Raipur, Chhattisgarh<br><a href="mailto:info.techlabsol@gmail.com">info.techlabsol@gmail.com</a></p>',
    created_timestamp: new Date().toISOString(),
  },
  {
    id: 'tpl_em_2',
    name: 'Free Demo Class Invitation',
    subject: 'Free Live Demo Session for {{course_interest}} — Tech Lab Academy',
    message:
      '<p>Hi <strong>{{name}}</strong>,</p><p><br></p><p>We would love to invite you to a <strong>Free 30-Minute Live Demo Class</strong> on <strong>{{course_interest}}</strong>!</p><p><br></p><p>In this interactive session, you\'ll explore:</p><ul><li>Live software workflow walkthrough</li><li>Course syllabus and career opportunities</li><li>Q&amp;A with our lead instructor</li></ul><p><br></p><p>Please reply with your preferred day and time to reserve your slot.</p><p><br></p><p>Best regards,<br><strong>Tech Lab Academy</strong><br><a href="mailto:info.techlabsol@gmail.com">info.techlabsol@gmail.com</a></p>',
    created_timestamp: new Date().toISOString(),
  },
  {
    id: 'tpl_em_3',
    name: 'Fee Reminder & Seat Confirmation',
    subject: 'Fee Payment & Admission Confirmation for {{course_interest}} — Tech Lab Academy',
    message:
      '<p>Dear <strong>{{name}}</strong>,</p><p><br></p><p>This is a gentle update regarding your admission for <strong>{{course_interest}}</strong> (Batch: <strong>{{batch}}</strong>) at Tech Lab Academy.</p><p><br></p><p>To secure your seat and receive the software installation guide, please complete your registration and pending fee payment.</p><p><br></p><p>If you have already made the transfer, please reply to this email with your transaction screenshot.</p><p><br></p><p>Thank you,<br><strong>Tech Lab Academy Team</strong></p>',
    created_timestamp: new Date().toISOString(),
  },
];

// Local in-memory cache to keep synchronous retrieval working
let leadsCache: Lead[] = [];
let coursesCache: CourseItem[] = [];
let batchesCache: BatchItem[] = [];
let whatsAppTemplatesCache: WhatsAppTemplate[] = DEFAULT_WHATSAPP_TEMPLATES;
let emailTemplatesCache: EmailTemplate[] = DEFAULT_EMAIL_TEMPLATES;
let customFormsCache: CustomForm[] = [];
let settingsCache: CRMSettings = DEFAULT_SETTINGS;

// Default sample custom form template
export const DEFAULT_SAMPLE_CUSTOM_FORMS: CustomForm[] = [
  {
    id: 'demo_class_signup',
    form_name: 'Demo Class Signup',
    form_title: 'Book Your Free Demo Class',
    form_description:
      'Join a free 30-minute live demonstration of Video Editing, VFX & GenAI workflows with Tech Lab Academy experts.',
    fields: [
      {
        field_id: 'name',
        label: 'Full Name',
        field_type: 'text',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        field_id: 'phone',
        label: 'WhatsApp / Phone Number',
        field_type: 'phone',
        required: true,
        placeholder: '10-digit mobile number',
      },
      {
        field_id: 'email',
        label: 'Email Address',
        field_type: 'email',
        required: false,
        placeholder: 'name@example.com',
      },
      {
        field_id: 'course_interest',
        label: 'Course You Want to Learn',
        field_type: 'dropdown',
        required: true,
        options: [
          'Full Video Editor Roadmap 365-day',
          'Premiere Pro',
          'After Effects',
          'Photoshop',
          'GenAI Tools',
          'Canva',
        ],
      },
      {
        field_id: 'class_mode',
        label: 'Preferred Mode of Learning',
        field_type: 'radio',
        required: true,
        options: ['Offline (Raipur Campus)', 'Online Live Interactive'],
      },
      {
        field_id: 'prior_experience',
        label: 'Do you have prior video editing experience?',
        field_type: 'radio',
        required: false,
        options: ['Complete Beginner', 'Basic Knowledge', 'Intermediate / Freelancer'],
      },
      {
        field_id: 'queries',
        label: 'Any specific questions or goals?',
        field_type: 'textarea',
        required: false,
        placeholder: 'Tell us what you hope to achieve...',
      },
    ],
    active: true,
    created_timestamp: new Date().toISOString(),
    submission_count: 0,
  },
];

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

// Subscribe to real-time updates for WhatsApp Templates
export function subscribeToWhatsAppTemplates(
  onUpdate: (templates: WhatsAppTemplate[]) => void,
  onError?: (error: any) => void
) {
  const colRef = collection(db, 'whatsapp_templates');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed default templates / migrate from settings
        const seedBatch = writeBatch(db);
        const initialTemplates =
          settingsCache.whatsappTemplates && settingsCache.whatsappTemplates.length > 0
            ? settingsCache.whatsappTemplates.map((t) => ({
                name: t.title,
                message: t.message,
                created_timestamp: new Date().toISOString(),
              }))
            : DEFAULT_WHATSAPP_TEMPLATES.map((t) => ({
                name: t.name,
                message: t.message,
                created_timestamp: new Date().toISOString(),
              }));

        try {
          for (const item of initialTemplates) {
            const newDocRef = doc(collection(db, 'whatsapp_templates'));
            seedBatch.set(newDocRef, item);
          }
          await seedBatch.commit();
        } catch (e) {
          console.warn('Initial seeding of WhatsApp templates:', e);
        }
        onUpdate(DEFAULT_WHATSAPP_TEMPLATES);
        return;
      }

      const templates: WhatsAppTemplate[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        templates.push({
          id: docSnap.id,
          name: data.name || data.title || 'Untitled Template',
          message: data.message || '',
          created_timestamp: data.created_timestamp,
        });
      });

      // Sort by created_timestamp or name
      templates.sort((a, b) => (b.created_timestamp || '').localeCompare(a.created_timestamp || '') || a.name.localeCompare(b.name));
      whatsAppTemplatesCache = templates;
      // Sync into settingsCache for backward compatibility
      settingsCache = {
        ...settingsCache,
        whatsappTemplates: templates.map((t) => ({ id: t.id, title: t.name, message: t.message })),
      };
      onUpdate(templates);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'whatsapp_templates');
      if (onError) onError(error);
    }
  );
}

// Subscribe to real-time updates for Email Templates
export function subscribeToEmailTemplates(
  onUpdate: (templates: EmailTemplate[]) => void,
  onError?: (error: any) => void
) {
  const colRef = collection(db, 'email_templates');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed default email templates
        const seedBatch = writeBatch(db);
        try {
          for (const item of DEFAULT_EMAIL_TEMPLATES) {
            const newDocRef = doc(collection(db, 'email_templates'));
            seedBatch.set(newDocRef, {
              name: item.name,
              subject: item.subject,
              message: item.message,
              created_timestamp: new Date().toISOString(),
            });
          }
          await seedBatch.commit();
        } catch (e) {
          console.warn('Initial seeding of Email templates:', e);
        }
        onUpdate(DEFAULT_EMAIL_TEMPLATES);
        return;
      }

      const templates: EmailTemplate[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        templates.push({
          id: docSnap.id,
          name: data.name || 'Untitled Email Template',
          subject: data.subject || '',
          message: data.message || '',
          created_timestamp: data.created_timestamp,
        });
      });

      templates.sort((a, b) => (b.created_timestamp || '').localeCompare(a.created_timestamp || '') || a.name.localeCompare(b.name));
      emailTemplatesCache = templates;
      onUpdate(templates);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'email_templates');
      if (onError) onError(error);
    }
  );
}

// WhatsApp Template CRUD Operations
export async function addWhatsAppTemplate(name: string, message: string): Promise<string> {
  const trimmedName = name.trim();
  const trimmedMessage = message.trim();
  if (!trimmedName || !trimmedMessage) return '';
  try {
    const docRef = await addDoc(collection(db, 'whatsapp_templates'), {
      name: trimmedName,
      message: trimmedMessage,
      created_timestamp: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'whatsapp_templates');
    return '';
  }
}

export async function updateWhatsAppTemplate(id: string, name: string, message: string): Promise<void> {
  const trimmedName = name.trim();
  const trimmedMessage = message.trim();
  if (!id || !trimmedName || !trimmedMessage) return;
  try {
    await setDoc(
      doc(db, 'whatsapp_templates', id),
      { name: trimmedName, message: trimmedMessage },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `whatsapp_templates/${id}`);
  }
}

export async function deleteWhatsAppTemplate(id: string): Promise<void> {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'whatsapp_templates', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `whatsapp_templates/${id}`);
  }
}

// Email Template CRUD Operations
export async function addEmailTemplate(name: string, subject: string, message: string): Promise<string> {
  const trimmedName = name.trim();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  if (!trimmedName || !trimmedSubject || !trimmedMessage) return '';
  try {
    const docRef = await addDoc(collection(db, 'email_templates'), {
      name: trimmedName,
      subject: trimmedSubject,
      message: trimmedMessage,
      created_timestamp: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'email_templates');
    return '';
  }
}

export async function updateEmailTemplate(id: string, name: string, subject: string, message: string): Promise<void> {
  const trimmedName = name.trim();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  if (!id || !trimmedName || !trimmedSubject || !trimmedMessage) return;
  try {
    await setDoc(
      doc(db, 'email_templates', id),
      { name: trimmedName, subject: trimmedSubject, message: trimmedMessage },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `email_templates/${id}`);
  }
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  if (!id) return;
  try {
    await deleteDoc(doc(db, 'email_templates', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `email_templates/${id}`);
  }
}

export function getWhatsAppTemplates(): WhatsAppTemplate[] {
  return whatsAppTemplatesCache;
}

export function getEmailTemplates(): EmailTemplate[] {
  return emailTemplatesCache;
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

// ----------------------------------------------------
// Custom Forms (Sharable Forms) Firestore Operations
// ----------------------------------------------------

export function subscribeToCustomForms(
  onUpdate: (forms: CustomForm[]) => void,
  onError?: (error: any) => void
) {
  const colRef = collection(db, 'custom_forms');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed default sample form so the user immediately has a functional demo form
        const seedBatch = writeBatch(db);
        try {
          for (const item of DEFAULT_SAMPLE_CUSTOM_FORMS) {
            const { id, ...data } = item;
            const newDocRef = doc(db, 'custom_forms', id);
            seedBatch.set(newDocRef, {
              ...data,
              created_timestamp: new Date().toISOString(),
            });
          }
          await seedBatch.commit();
        } catch (e) {
          console.warn('Initial seeding of Custom Forms:', e);
        }
        onUpdate(DEFAULT_SAMPLE_CUSTOM_FORMS);
        return;
      }

      const forms: CustomForm[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        forms.push({
          id: docSnap.id,
          form_name: data.form_name || 'Untitled Form',
          form_title: data.form_title || 'Lead Inquiry Form',
          form_description: data.form_description || '',
          fields: Array.isArray(data.fields) ? data.fields : [],
          active: data.active !== false,
          created_timestamp: data.created_timestamp || new Date().toISOString(),
          submission_count: typeof data.submission_count === 'number' ? data.submission_count : 0,
        });
      });

      // Sort by creation date descending
      forms.sort(
        (a, b) =>
          new Date(b.created_timestamp || 0).getTime() -
          new Date(a.created_timestamp || 0).getTime()
      );

      customFormsCache = forms;
      onUpdate(forms);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'custom_forms');
      if (onError) onError(error);
    }
  );
}

export function getCustomForms(): CustomForm[] {
  return customFormsCache;
}

export async function getCustomFormById(id: string): Promise<CustomForm | null> {
  // Check local cache first
  const cached = customFormsCache.find((f) => f.id === id);
  if (cached) return cached;

  try {
    const docRef = doc(db, 'custom_forms', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        form_name: data.form_name || 'Untitled Form',
        form_title: data.form_title || 'Lead Inquiry Form',
        form_description: data.form_description || '',
        fields: Array.isArray(data.fields) ? data.fields : [],
        active: data.active !== false,
        created_timestamp: data.created_timestamp || new Date().toISOString(),
        submission_count: typeof data.submission_count === 'number' ? data.submission_count : 0,
      };
    }
  } catch (e) {
    console.warn('Error fetching form by id:', e);
  }

  // Fallback to sample form if id matches
  const fallback = DEFAULT_SAMPLE_CUSTOM_FORMS.find((f) => f.id === id);
  return fallback || null;
}

export async function createCustomForm(
  formData: Omit<CustomForm, 'id'>
): Promise<string> {
  try {
    const cleanData = sanitizeData({
      form_name: formData.form_name.trim(),
      form_title: formData.form_title.trim(),
      form_description: (formData.form_description || '').trim(),
      fields: formData.fields || [],
      active: formData.active !== false,
      created_timestamp: formData.created_timestamp || new Date().toISOString(),
      submission_count: 0,
    });

    const docRef = await addDoc(collection(db, 'custom_forms'), cleanData);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'custom_forms');
    throw err;
  }
}

export async function updateCustomForm(
  id: string,
  formData: Partial<CustomForm>
): Promise<void> {
  try {
    const cleanData = sanitizeData(formData);
    await setDoc(doc(db, 'custom_forms', id), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `custom_forms/${id}`);
    throw err;
  }
}

export async function toggleCustomFormActive(
  id: string,
  active: boolean
): Promise<void> {
  try {
    await setDoc(doc(db, 'custom_forms', id), { active }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `custom_forms/${id}`);
    throw err;
  }
}

export async function deleteCustomForm(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'custom_forms', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `custom_forms/${id}`);
    throw err;
  }
}

export async function submitPublicLeadForm(
  formId: string,
  form: CustomForm,
  submittedValues: Record<string, any>
): Promise<Lead> {
  // Normalize and map known lead fields
  let name = '';
  let phone = '';
  let email = '';
  let course_interest = 'Other';
  let class_mode: 'Online' | 'Offline' = 'Offline';
  let address = '';
  let dob = '';
  const customTags: string[] = [`Form: ${form.form_name}`];
  const submissionSummaryLines: string[] = [
    `Submitted via Sharable Form: "${form.form_name}"`,
    `Public Form Title: "${form.form_title}"`,
    `Submission Date: ${new Date().toLocaleString('en-IN')}`,
    '--- Form Responses ---',
  ];

  // Iterate over form fields
  for (const field of form.fields) {
    const val = submittedValues[field.field_id];
    const isProvided = val !== undefined && val !== null && val !== '';
    const displayVal = Array.isArray(val) ? val.join(', ') : isProvided ? String(val).trim() : 'N/A';

    submissionSummaryLines.push(`${field.label}: ${displayVal}`);

    if (!isProvided) continue;

    const normalizedId = field.field_id.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const normalizedLabel = field.label.toLowerCase();

    // Map Name
    if (
      normalizedId === 'name' ||
      normalizedId === 'full_name' ||
      normalizedId === 'student_name' ||
      normalizedLabel.includes('full name') ||
      normalizedLabel.includes('your name') ||
      normalizedLabel.includes('candidate name')
    ) {
      if (!name) name = String(val).trim();
    }
    // Map Phone
    else if (
      normalizedId === 'phone' ||
      normalizedId === 'mobile' ||
      normalizedId === 'whatsapp' ||
      normalizedId === 'contact' ||
      field.field_type === 'phone' ||
      normalizedLabel.includes('phone') ||
      normalizedLabel.includes('mobile') ||
      normalizedLabel.includes('whatsapp')
    ) {
      if (!phone) phone = String(val).trim();
    }
    // Map Email
    else if (
      normalizedId === 'email' ||
      field.field_type === 'email' ||
      normalizedLabel.includes('email')
    ) {
      if (!email) email = String(val).trim();
    }
    // Map Course Interest
    else if (
      normalizedId === 'course_interest' ||
      normalizedId === 'course' ||
      normalizedLabel.includes('course') ||
      normalizedLabel.includes('program')
    ) {
      course_interest = String(val).trim();
    }
    // Map Class Mode
    else if (
      normalizedId === 'class_mode' ||
      normalizedLabel.includes('mode') ||
      normalizedLabel.includes('online') ||
      normalizedLabel.includes('offline')
    ) {
      const modeStr = String(val).toLowerCase();
      if (modeStr.includes('online')) {
        class_mode = 'Online';
      } else {
        class_mode = 'Offline';
      }
    }
    // Map Address / City
    else if (
      normalizedId === 'address' ||
      normalizedId === 'city' ||
      normalizedId === 'location' ||
      normalizedLabel.includes('address') ||
      normalizedLabel.includes('city')
    ) {
      address = String(val).trim();
    }
    // Map Date of Birth
    else if (
      normalizedId === 'dob' ||
      normalizedId === 'birthdate' ||
      normalizedLabel.includes('date of birth') ||
      normalizedLabel.includes('birthday')
    ) {
      dob = String(val).trim();
    }
    // Other custom fields -> add to tags
    else {
      customTags.push(`${field.label}: ${displayVal}`);
    }
  }

  // Fallback name if none found
  if (!name.trim()) {
    name = submittedValues['name'] || 'New Website Inquiry';
  }

  // Fallback phone
  if (!phone.trim()) {
    phone = submittedValues['phone'] || '';
  }

  const nowISO = new Date().toISOString();

  const newLeadData: Omit<Lead, 'id'> = {
    name,
    phone,
    email: email || undefined,
    source: form.form_name || 'Public Form',
    course_interest,
    status: 'New',
    assigned_batch: 'Unassigned',
    lead_score: 'Warm',
    created_date: nowISO,
    last_contacted_date: undefined,
    next_followup_date: undefined,
    tags: customTags,
    address: address || '',
    converted_to_student: false,
    class_mode,
    dob: dob || '',
    notes_history: [
      {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        note_text: submissionSummaryLines.join('\n'),
        timestamp: nowISO,
        added_by: 'Public Form System',
        is_system: true,
      },
    ],
  };

  const cleanLeadData = sanitizeData(newLeadData);

  // 1. Create document in Firestore 'leads' collection
  const leadDocRef = await addDoc(collection(db, 'leads'), cleanLeadData);
  const createdLead: Lead = {
    id: leadDocRef.id,
    ...newLeadData,
  };

  // 2. Increment submission count in 'custom_forms' collection
  try {
    const formDocRef = doc(db, 'custom_forms', formId);
    await setDoc(
      formDocRef,
      {
        submission_count: (form.submission_count || 0) + 1,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not update form submission count:', err);
  }

  return createdLead;
}

