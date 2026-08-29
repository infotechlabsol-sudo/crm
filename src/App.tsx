import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import {
  getLeads,
  saveLead,
  updateLeadStatus,
  addNoteToLead,
  deleteLead,
  deleteLeadsBulk,
  restoreLead,
  restoreLeadsBulk,
  permanentlyDeleteLead,
  permanentlyDeleteLeadsBulk,
  getSettings,
  saveSettings,
  clearAllLeads,
  saveLeads,
  auth,
  subscribeToLeads,
  subscribeToSettings,
  subscribeToCourses,
  subscribeToBatches,
  subscribeToWhatsAppTemplates,
  subscribeToEmailTemplates,
  subscribeToCustomForms,
  createCustomForm,
  updateCustomForm,
  toggleCustomFormActive,
  deleteCustomForm,
  subscribeToWebhooks,
  createWebhook,
  updateWebhook,
  toggleWebhookActive,
  deleteWebhook,
  DEFAULT_WHATSAPP_TEMPLATES,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_SAMPLE_CUSTOM_FORMS,
  DEFAULT_SAMPLE_WEBHOOKS,
} from './lib/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  Lead,
  LeadStatus,
  CRMSettings,
  CourseItem,
  BatchItem,
  WhatsAppTemplate,
  EmailTemplate,
  CustomForm,
  Webhook,
} from './types';
import { getFollowUpCategory } from './lib/utils';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { LeadList } from './components/LeadList';
import { LeadDetailModal } from './components/LeadDetailModal';
import { LeadFormModal } from './components/LeadFormModal';
import { CSVImportModal } from './components/CSVImportModal';
import { FollowUpView } from './components/FollowUpView';
import { BulkWhatsAppModal } from './components/BulkWhatsAppModal';
import { SendWhatsAppModal } from './components/SendWhatsAppModal';
import { SendEmailModal } from './components/SendEmailModal';
import { SettingsView } from './components/SettingsView';
import { CustomFormsView } from './components/CustomFormsView';
import { PublicFormView } from './components/PublicFormView';
import { IntegrationsView } from './components/IntegrationsView';
import { LoginView } from './components/LoginView';
import { Loader2 } from 'lucide-react';
import {
  GoogleSheetsConfig,
  DEFAULT_SHEETS_CONFIG,
  fetchGoogleSheetData,
  processSheetSync,
  playNotificationSound,
  ImportIssue,
} from './lib/googleSheetsSync';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { SyncToastNotification, ToastMessage } from './components/SyncToastNotification';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  // Check for public form URL query param e.g. ?public_form=XYZ or ?form_id=XYZ or hash #form/XYZ
  const [publicFormId, setPublicFormId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qForm = params.get('public_form') || params.get('form_id') || params.get('form');
      if (qForm) return qForm;

      const hash = window.location.hash;
      if (hash.startsWith('#form/')) {
        return hash.replace('#form/', '');
      }
    } catch (e) {}
    return null;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('tech_lab_crm_theme') as 'light' | 'dark') || 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tech_lab_crm_theme', next);
  };

  const [leads, setLeads] = useState<Lead[]>([]);
  const [coursesList, setCoursesList] = useState<CourseItem[]>([]);
  const [batchesList, setBatchesList] = useState<BatchItem[]>([]);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_WHATSAPP_TEMPLATES);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [customForms, setCustomForms] = useState<CustomForm[]>(DEFAULT_SAMPLE_CUSTOM_FORMS);
  const [webhooks, setWebhooks] = useState<Webhook[]>(DEFAULT_SAMPLE_WEBHOOKS);
  const [settings, setSettings] = useState<CRMSettings>(DEFAULT_SETTINGS_LOCAL_FALLBACK());

  // Live active courses and batches from Firestore collections
  const activeCourses = useMemo(() => {
    if (coursesList.length > 0) {
      return coursesList.filter((c) => c.active).map((c) => c.name);
    }
    return settings.courses || [];
  }, [coursesList, settings.courses]);

  const activeBatches = useMemo(() => {
    if (batchesList.length > 0) {
      return batchesList.filter((b) => b.active).map((b) => b.name);
    }
    return settings.batches || [];
  }, [batchesList, settings.batches]);

  const effectiveSettings: CRMSettings = useMemo(
    () => ({
      ...settings,
      courses: activeCourses,
      batches: activeBatches,
    }),
    [settings, activeCourses, activeBatches]
  );
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');

  // Initial Filter for Lead List View when jumping from Dashboard
  const [leadListStatusFilter, setLeadListStatusFilter] = useState('ALL');

  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [bulkWhatsAppLeadIds, setBulkWhatsAppLeadIds] = useState<string[]>([]);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<Lead | null>(null);
  const [emailModalLead, setEmailModalLead] = useState<Lead | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Google Sheets Auto-Sync state
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem('techlab_crm_google_sheets_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SHEETS_CONFIG;
  });
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [newSheetLeadsCount, setNewSheetLeadsCount] = useState(0);
  const [skippedRowsHistory, setSkippedRowsHistory] = useState<ImportIssue[]>([]);

  const handleSaveSheetsConfig = (newConfig: GoogleSheetsConfig) => {
    setSheetsConfig(newConfig);
    try {
      localStorage.setItem('techlab_crm_google_sheets_config', JSON.stringify(newConfig));
    } catch (e) {}
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const runGoogleSheetSync = async (): Promise<{ createdCount: number; updatedCount: number; skippedCount: number }> => {
    if (!sheetsConfig.sheetUrlOrId.trim()) {
      throw new Error('No Google Sheet URL or ID configured.');
    }

    setIsSheetsSyncing(true);
    try {
      const data = await fetchGoogleSheetData(sheetsConfig.sheetUrlOrId, sheetsConfig.sheetName);
      const currentLeads = getLeads();

      const result = processSheetSync({
        rows: data.rows,
        mapping: sheetsConfig.columnMapping,
        existingLeads: currentLeads,
        settings: effectiveSettings,
      });

      // Save updated leads
      if (result.createdCount > 0 || result.updatedCount > 0) {
        saveLeads(result.updatedLeads);
        refreshLeads();

        // Play sound chime
        playNotificationSound();

        // Show Toast Notifications
        if (result.createdLeadDetails.length > 0 && result.createdLeadDetails.length <= 3) {
          result.createdLeadDetails.forEach((ld, i) => {
            const toastId = 'toast_' + Date.now() + '_' + i;
            setToasts((prev) => [
              ...prev,
              {
                id: toastId,
                title: `⚡ New Lead: ${ld.name}`,
                subtitle: `Source: ${ld.source}`,
              },
            ]);
            setTimeout(() => handleDismissToast(toastId), 5000);
          });
        } else {
          const toastId = 'toast_summary_' + Date.now();
          setToasts((prev) => [
            ...prev,
            {
              id: toastId,
              title: `⚡ Google Sheet Sync Complete`,
              subtitle: `${result.createdCount} new lead(s) added, ${result.updatedCount} lead(s) updated.`,
            },
          ]);
          setTimeout(() => handleDismissToast(toastId), 5000);
        }

        if (currentView !== 'leads' && result.createdCount > 0) {
          setNewSheetLeadsCount((prev) => prev + result.createdCount);
        }
      }

      setSkippedRowsHistory(result.skippedRows);

      const updatedConfig: GoogleSheetsConfig = {
        ...sheetsConfig,
        lastSyncTime: new Date().toISOString(),
        lastSyncResult: {
          createdCount: result.createdCount,
          updatedCount: result.updatedCount,
          skippedCount: result.skippedRows.length,
          timestamp: new Date().toISOString(),
        },
      };

      handleSaveSheetsConfig(updatedConfig);

      return {
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedRows.length,
      };
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  // Local static fallback for settings
  function DEFAULT_SETTINGS_LOCAL_FALLBACK(): CRMSettings {
    return {
      courses: ['Premiere Pro', 'After Effects', 'Photoshop', 'Illustrator', 'Canva', 'Full Video Editor Roadmap 365-day', 'GenAI Tools', 'Other'],
      sources: ['Facebook Ads', 'Instagram Ads', 'Google Ads', 'Walk-in', 'Referral', 'YouTube', 'Other'],
      batches: ['Batch 11 - Jul 2026', 'Batch 12 - Aug 2026', 'Batch 13 - Sep 2026', 'Weekend Express Batch', 'Unassigned'],
      whatsappTemplates: [
        { id: 'tpl_1', title: 'Batch Update & Demo Invite', message: 'Namaste {name}! Greetings from Tech Lab Academy. Your inquiry for {course} is received. Our next batch ({batch}) starts this week. Would you like to join a free 30-min live demo session today?' },
        { id: 'tpl_2', title: 'Follow-up Call Reminder', message: 'Hi {name}, following up regarding your career in Video Editing & Design at Tech Lab Academy. Have you had time to check the course syllabus for {course}? Let us know when you are free for a quick call.' },
        { id: 'tpl_3', title: 'Enrolled Welcome & Batch Schedule', message: 'Congratulations {name}! Welcome to Tech Lab Academy. You are officially enrolled in {course} for {batch}. Class timings and software installation setup guide will be shared shortly.' }
      ]
    };
  }

  // Handle Firebase Auth subscription
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Handle Firestore subscription when authenticated
  useEffect(() => {
    if (!user) {
      setDataLoading(true);
      return;
    }

    let leadsLoaded = false;
    let settingsLoaded = false;

    const unsubscribeLeads = subscribeToLeads(
      (loadedLeads) => {
        setLeads(loadedLeads);
        leadsLoaded = true;
        
        // Sync open detail modal in real-time
        setSelectedLead((prev) => {
          if (!prev) return null;
          return loadedLeads.find((l) => l.id === prev.id) || null;
        });

        if (leadsLoaded && settingsLoaded) {
          setDataLoading(false);
        }
      },
      (error) => {
        console.error('Leads subscription error:', error);
      }
    );

    const unsubscribeSettings = subscribeToSettings(
      (loadedSettings) => {
        setSettings(loadedSettings);
        settingsLoaded = true;
        if (leadsLoaded && settingsLoaded) {
          setDataLoading(false);
        }
      },
      (error) => {
        console.error('Settings subscription error:', error);
      }
    );

    const unsubscribeCourses = subscribeToCourses(
      (loadedCourses) => {
        setCoursesList(loadedCourses);
      },
      (error) => {
        console.error('Courses subscription error:', error);
      }
    );

    const unsubscribeBatches = subscribeToBatches(
      (loadedBatches) => {
        setBatchesList(loadedBatches);
      },
      (error) => {
        console.error('Batches subscription error:', error);
      }
    );

    const unsubscribeWhatsAppTemplates = subscribeToWhatsAppTemplates(
      (loaded) => {
        setWhatsAppTemplates(loaded);
      },
      (error) => {
        console.error('WhatsApp templates subscription error:', error);
      }
    );

    const unsubscribeEmailTemplates = subscribeToEmailTemplates(
      (loaded) => {
        setEmailTemplates(loaded);
      },
      (error) => {
        console.error('Email templates subscription error:', error);
      }
    );

    const unsubscribeCustomForms = subscribeToCustomForms(
      (loadedForms) => {
        setCustomForms(loadedForms);
      },
      (error) => {
        console.error('Custom forms subscription error:', error);
      }
    );

    const unsubscribeWebhooks = subscribeToWebhooks(
      (loadedWebhooks) => {
        setWebhooks(loadedWebhooks);
      },
      (error) => {
        console.error('Webhooks subscription error:', error);
      }
    );

    return () => {
      unsubscribeLeads();
      unsubscribeSettings();
      unsubscribeCourses();
      unsubscribeBatches();
      unsubscribeWhatsAppTemplates();
      unsubscribeEmailTemplates();
      unsubscribeCustomForms();
      unsubscribeWebhooks();
    };
  }, [user]);

  // 5-Minute Auto-Sync Interval
  useEffect(() => {
    if (!sheetsConfig.autoSyncEnabled || !sheetsConfig.sheetUrlOrId || dataLoading) {
      return;
    }

    // Initial check on load
    const initialTimer = setTimeout(() => {
      runGoogleSheetSync().catch((e) => console.log('Auto sync error:', e));
    }, 4000);

    const intervalMs = (sheetsConfig.syncIntervalMinutes || 5) * 60 * 1000;
    const interval = setInterval(() => {
      runGoogleSheetSync().catch((e) => console.log('Auto sync error:', e));
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [sheetsConfig.autoSyncEnabled, sheetsConfig.sheetUrlOrId, sheetsConfig.syncIntervalMinutes, dataLoading]);

  const refreshLeads = () => {
    // Real-time onSnapshot updates React state automatically
  };

  // Badges counters
  const overdueCount = leads.filter(
    (l) => !l.is_deleted && getFollowUpCategory(l.next_followup_date) === 'overdue'
  ).length;

  const dueTodayCount = leads.filter(
    (l) => !l.is_deleted && getFollowUpCategory(l.next_followup_date) === 'due_today'
  ).length;

  const deletedCount = leads.filter((l) => l.is_deleted).length;

  // Handlers
  const handleSaveLead = (updatedLead: Lead) => {
    saveLead(updatedLead);
    refreshLeads();
  };

  const handleAddNote = (leadId: string, noteText: string) => {
    addNoteToLead(leadId, noteText, 'Admin');
    refreshLeads();
    // Update currently open detail view lead
    if (selectedLead && selectedLead.id === leadId) {
      const updated = getLeads().find((l) => l.id === leadId);
      if (updated) setSelectedLead(updated);
    }
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateLeadStatus(leadId, newStatus, 'Admin');
    refreshLeads();
    if (selectedLead && selectedLead.id === leadId) {
      const updated = getLeads().find((l) => l.id === leadId);
      if (updated) setSelectedLead(updated);
    }
  };

  const handleDeleteLead = (leadId: string) => {
    deleteLead(leadId);
    refreshLeads();
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(null);
    }
  };

  const handleRestoreLead = (leadId: string) => {
    restoreLead(leadId);
    refreshLeads();
    if (selectedLead && selectedLead.id === leadId) {
      const updated = getLeads().find((l) => l.id === leadId);
      if (updated) setSelectedLead(updated);
    }
  };

  const handleRestoreLeadsBulk = (leadIds: string[]) => {
    restoreLeadsBulk(leadIds);
    refreshLeads();
  };

  const handlePermanentlyDeleteLead = (leadId: string) => {
    permanentlyDeleteLead(leadId);
    refreshLeads();
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(null);
    }
  };

  const handlePermanentlyDeleteLeadsBulk = (leadIds: string[]) => {
    permanentlyDeleteLeadsBulk(leadIds);
    refreshLeads();
  };

  const handleBulkChangeStatus = (selectedIds: string[], status: LeadStatus) => {
    selectedIds.forEach((id) => {
      updateLeadStatus(id, status, 'Admin (Bulk Action)');
    });
    refreshLeads();
  };

  const handleBulkAssignBatch = (selectedIds: string[], batch: string) => {
    const currentLeads = getLeads();
    selectedIds.forEach((id) => {
      const lead = currentLeads.find((l) => l.id === id);
      if (lead) {
        lead.assigned_batch = batch;
        lead.notes_history = lead.notes_history || [];
        lead.notes_history.unshift({
          id: 'n_batch_' + Date.now() + Math.random().toString(36).substr(2, 4),
          note_text: `Assigned to batch: "${batch}"`,
          timestamp: new Date().toISOString(),
          added_by: 'Admin (Bulk Action)',
          is_system: true,
        });
      }
    });
    saveLeads(currentLeads);
    refreshLeads();
  };

  const handleBulkDelete = (selectedIds: string[]) => {
    deleteLeadsBulk(selectedIds);
    refreshLeads();
  };

  const handleAddBulkNote = (leadIds: string[], noteText: string) => {
    leadIds.forEach((id) => {
      addNoteToLead(id, noteText, 'Admin (Bulk WhatsApp)');
    });
    refreshLeads();
  };

  const handleQuickReschedule = (leadId: string, daysToAdd: number) => {
    const currentLeads = getLeads();
    const lead = currentLeads.find((l) => l.id === leadId);
    if (lead) {
      const targetDate = lead.next_followup_date ? new Date(lead.next_followup_date) : new Date();
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      lead.next_followup_date = targetDate.toISOString();
      saveLeads(currentLeads);
      refreshLeads();
    }
  };

  const handleCustomReschedule = (leadId: string, isoDateString: string) => {
    const currentLeads = getLeads();
    const lead = currentLeads.find((l) => l.id === leadId);
    if (lead) {
      lead.next_followup_date = isoDateString;
      saveLeads(currentLeads);
      refreshLeads();
    }
  };

  const handleMarkContacted = (leadId: string) => {
    const currentLeads = getLeads();
    const lead = currentLeads.find((l) => l.id === leadId);
    if (lead) {
      const nowISO = new Date().toISOString();
      lead.last_contacted_date = nowISO;
      if (lead.status === 'New') {
        lead.status = 'Contacted';
      }
      lead.notes_history = lead.notes_history || [];
      lead.notes_history.unshift({
        id: 'n_cont_' + Date.now(),
        note_text: 'Marked as Contacted / Followed-up.',
        timestamp: nowISO,
        added_by: 'Admin',
      });
      saveLeads(currentLeads);
      refreshLeads();
    }
  };

  const handleMarkFollowUpDone = (leadId: string) => {
    const currentLeads = getLeads();
    const lead = currentLeads.find((l) => l.id === leadId);
    if (lead) {
      const nowISO = new Date().toISOString();
      lead.next_followup_date = '';
      lead.last_contacted_date = nowISO;
      lead.notes_history = lead.notes_history || [];
      lead.notes_history.unshift({
        id: 'n_done_' + Date.now(),
        note_text: 'Follow-up marked as completed.',
        timestamp: nowISO,
        added_by: 'Admin',
        is_system: true,
      });
      saveLead(lead);
      refreshLeads();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...lead });
      }
    }
  };

  // CSV Export Utility
  const handleExportCSV = (leadsToExport: Lead[] = leads) => {
    const exportData = leadsToExport.map((l) => ({
      ID: l.id,
      Name: l.name,
      Phone: l.phone,
      Email: l.email || '',
      Address: l.address || '',
      Source: l.source,
      Course_Interest: l.course_interest,
      Class_Mode: l.class_mode || 'Offline',
      DOB: l.dob || '',
      Status: l.status,
      Assigned_Batch: l.assigned_batch || '',
      Lead_Score: l.lead_score,
      Next_Followup: l.next_followup_date || '',
      Created_Date: l.created_date,
      Tags: l.tags ? l.tags.join(', ') : '',
    }));

    const csvString = Papa.unparse(exportData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TechLab_CRM_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const fullData = {
      app: 'Tech Lab CRM',
      exported_at: new Date().toISOString(),
      leads,
      settings,
    };
    const jsonString = JSON.stringify(fullData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TechLab_CRM_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV Import Completion
  const handleCSVImportComplete = (newLeads: Lead[], updatedLeads: Lead[]) => {
    const current = getLeads();
    const updatedMap = new Map(updatedLeads.map((u) => [u.id, u]));

    const merged = current.map((l) => updatedMap.get(l.id) || l);
    const finalLeads = [...newLeads, ...merged];

    saveLeads(finalLeads);
    refreshLeads();
  };

  // Navigation title lookup
  const viewTitles: Record<NavView, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'Academy performance, pipeline funnel & pending follow-ups',
    },
    leads: {
      title: 'Student Lead Directory',
      subtitle: 'Filter, search, and manage all student inquiries',
    },
    admissions: {
      title: 'Admissions & Enrolled Students',
      subtitle: 'View and manage all converted student enrollments and records',
    },
    not_interested: {
      title: 'Not Interested Leads Archive',
      subtitle: 'View and reactivate student inquiries marked as Not Interested',
    },
    lost: {
      title: 'Lost Leads Archive',
      subtitle: 'View and reactivate student leads marked as Lost',
    },
    deleted: {
      title: 'Deleted Leads Trash & Archive',
      subtitle: 'Review soft-deleted student leads, restore active records, or purge permanently',
    },
    forms: {
      title: 'Sharable Lead Forms',
      subtitle: 'Create, share, and track public lead capture pages',
    },
    followups: {
      title: 'Follow-ups & Agendas',
      subtitle: 'Schedule of student calls, demos, and WhatsApp check-ins',
    },
    import: {
      title: 'Bulk CSV Lead Import',
      subtitle: 'Import Meta Ads, Google Lead Forms, or Excel spreadsheets',
    },
    integrations: {
      title: 'Integrations & Lead Ingestion Hub',
      subtitle: 'Google Sheets Live Sync, Sharable Forms, and Zapier / Make.com Webhooks',
    },
    settings: {
      title: 'System Configuration',
      subtitle: 'Custom courses, batches, sources, and WhatsApp message templates',
    },
  };

  const currentHeaderInfo = viewTitles[currentView];

  const bulkWhatsAppLeads = leads.filter((l) => bulkWhatsAppLeadIds.includes(l.id));

  // If a public form URL is accessed, display the form page directly with NO login required
  if (publicFormId) {
    return (
      <PublicFormView
        formId={publicFormId}
        onExit={() => {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('public_form');
            url.searchParams.delete('form_id');
            url.searchParams.delete('form');
            window.history.pushState({}, '', url.pathname);
          } catch (e) {}
          setPublicFormId(null);
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-3" />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Initializing CRM Security...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-4" />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing with Firestore Database...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex font-sans antialiased selection:bg-teal-500 selection:text-black ${theme} ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          setCurrentView(v);
          if (v === 'leads') {
            setLeadListStatusFilter('ALL');
            setNewSheetLeadsCount(0);
          }
        }}
        onOpenAddLead={() => setShowAddLeadModal(true)}
        overdueCount={overdueCount}
        dueTodayCount={dueTodayCount}
        newSheetLeadsCount={newSheetLeadsCount}
        formsCount={customForms.length}
        webhooksCount={webhooks.length}
        deletedCount={deletedCount}
        onLogout={() => signOut(auth)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenMobile={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Header Bar */}
        <Header
          title={currentHeaderInfo.title}
          subtitle={currentHeaderInfo.subtitle}
          globalSearch={globalSearch}
          onGlobalSearchChange={(val) => {
            setGlobalSearch(val);
            if (val.trim() && currentView !== 'leads') {
              setCurrentView('leads');
            }
          }}
          onOpenAddLead={() => setShowAddLeadModal(true)}
          onOpenBulkWhatsApp={() => {
            setBulkWhatsAppLeadIds(leads.map((l) => l.id));
            setShowBulkWhatsAppModal(true);
          }}
          onExportCSV={() => handleExportCSV(leads)}
          overdueCount={overdueCount}
          dueTodayCount={dueTodayCount}
          onRefresh={refreshLeads}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          leads={leads}
          onSelectLead={(l) => setSelectedLead(l)}
          onMarkFollowUpDone={handleMarkFollowUpDone}
          onNavigateToFollowups={() => setCurrentView('followups')}
        />

        {/* View Switcher Container */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <Dashboard
              leads={leads}
              onSelectLead={(l) => setSelectedLead(l)}
              onNavigateToLeads={(stFilter) => {
                if (stFilter === 'Enrolled') {
                  setCurrentView('admissions');
                } else {
                  setLeadListStatusFilter(stFilter || 'ALL');
                  setCurrentView('leads');
                }
              }}
              onNavigateToAdmissions={() => setCurrentView('admissions')}
              onNavigateToFollowups={() => setCurrentView('followups')}
              onOpenAddLead={() => setShowAddLeadModal(true)}
              onOpenWhatsApp={(l) => setWhatsAppModalLead(l)}
              onOpenEmail={(l) => setEmailModalLead(l)}
            />
          )}

          {(currentView === 'leads' ||
            currentView === 'lost' ||
            currentView === 'admissions' ||
            currentView === 'not_interested' ||
            currentView === 'deleted') && (
            <LeadList
              leads={leads}
              settings={effectiveSettings}
              onSelectLead={(l) => setSelectedLead(l)}
              onBulkChangeStatus={handleBulkChangeStatus}
              onBulkAssignBatch={handleBulkAssignBatch}
              onBulkDelete={handleBulkDelete}
              onRestoreLead={handleRestoreLead}
              onRestoreLeadsBulk={handleRestoreLeadsBulk}
              onPermanentDeleteLead={handlePermanentlyDeleteLead}
              onPermanentDeleteLeadsBulk={handlePermanentlyDeleteLeadsBulk}
              onOpenBulkWhatsAppWithSelection={(selectedIds) => {
                setBulkWhatsAppLeadIds(selectedIds);
                setShowBulkWhatsAppModal(true);
              }}
              onExportSelectedCSV={(selectedLeads) => handleExportCSV(selectedLeads)}
              onOpenAddLead={() => setShowAddLeadModal(true)}
              initialStatusFilter={
                currentView === 'lost'
                  ? 'Lost'
                  : currentView === 'admissions'
                  ? 'Enrolled'
                  : currentView === 'not_interested'
                  ? 'Not Interested'
                  : leadListStatusFilter
              }
              isLostLeadsView={currentView === 'lost'}
              isAdmissionsView={currentView === 'admissions'}
              isNotInterestedView={currentView === 'not_interested'}
              isDeletedLeadsView={currentView === 'deleted'}
              onOpenGoogleSheetsModal={() => setShowSheetsModal(true)}
              onTriggerSheetSync={runGoogleSheetSync}
              isSheetSyncing={isSheetsSyncing}
              sheetsConfigured={Boolean(sheetsConfig.sheetUrlOrId)}
              onOpenWhatsApp={(l) => setWhatsAppModalLead(l)}
              onOpenEmail={(l) => setEmailModalLead(l)}
            />
          )}

          {currentView === 'followups' && (
            <FollowUpView
              leads={leads}
              onSelectLead={(l) => setSelectedLead(l)}
              onQuickReschedule={handleQuickReschedule}
              onCustomReschedule={handleCustomReschedule}
              onMarkContacted={handleMarkContacted}
              onOpenAddLead={() => setShowAddLeadModal(true)}
              onOpenWhatsApp={(l) => setWhatsAppModalLead(l)}
              onOpenEmail={(l) => setEmailModalLead(l)}
            />
          )}

          {currentView === 'import' && (
            <CSVImportModal
              existingLeads={leads}
              settings={effectiveSettings}
              onClose={() => setCurrentView('leads')}
              onImportComplete={handleCSVImportComplete}
            />
          )}

          {currentView === 'forms' && (
            <div className="p-4 sm:p-6">
              <CustomFormsView
                forms={customForms}
                leads={leads}
                settings={effectiveSettings}
                onCreateForm={async (formData) => {
                  return await createCustomForm(formData);
                }}
                onUpdateForm={async (id, formData) => {
                  await updateCustomForm(id, formData);
                }}
                onToggleActive={async (id, active) => {
                  await toggleCustomFormActive(id, active);
                }}
                onDeleteForm={async (id) => {
                  await deleteCustomForm(id);
                }}
                onViewSubmissions={(formName) => {
                  setGlobalSearch(formName);
                  setLeadListStatusFilter('ALL');
                  setCurrentView('leads');
                }}
                onOpenPublicForm={(formId) => {
                  setPublicFormId(formId);
                }}
              />
            </div>
          )}

          {currentView === 'integrations' && (
            <IntegrationsView
              sheetsConfig={sheetsConfig}
              onSaveSheetsConfig={handleSaveSheetsConfig}
              onRunSheetSync={runGoogleSheetSync}
              isSheetSyncing={isSheetsSyncing}
              skippedRowsHistory={skippedRowsHistory}
              forms={customForms}
              onNavigateToForms={() => setCurrentView('forms')}
              onOpenPublicForm={(formId) => {
                setPublicFormId(formId);
              }}
              webhooks={webhooks}
              onCreateWebhook={async (name) => {
                return await createWebhook(name);
              }}
              onUpdateWebhook={async (id, name) => {
                await updateWebhook(id, name);
              }}
              onToggleWebhookActive={async (id, active) => {
                await toggleWebhookActive(id, active);
              }}
              onDeleteWebhook={async (id) => {
                await deleteWebhook(id);
              }}
              onWebhookLeadCreated={(createdLead) => {
                refreshLeads();
                playNotificationSound();
                setToasts((prev) => [
                  ...prev,
                  {
                    id: 'toast_' + Date.now(),
                    title: `⚡ Webhook Lead Ingested: ${createdLead.name}`,
                    subtitle: `Source: ${createdLead.source}`,
                  },
                ]);
              }}
              leads={leads}
              settings={effectiveSettings}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              settings={effectiveSettings}
              coursesList={coursesList}
              batchesList={batchesList}
              whatsAppTemplates={whatsAppTemplates}
              emailTemplates={emailTemplates}
              onSaveSettings={(newSettings) => {
                saveSettings(newSettings);
                setSettings(newSettings);
              }}
              onExportAllCSV={() => handleExportCSV(leads)}
              onExportJSON={handleExportJSON}
              onClearAllData={() => {
                clearAllLeads();
                refreshLeads();
              }}
            />
          )}
        </main>
      </div>

      {/* Modals */}

      {/* 1. Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          settings={effectiveSettings}
          onClose={() => setSelectedLead(null)}
          onSaveLead={handleSaveLead}
          onAddNote={handleAddNote}
          onStatusChange={handleStatusChange}
          onDeleteLead={handleDeleteLead}
          onRestoreLead={handleRestoreLead}
          onPermanentDeleteLead={handlePermanentlyDeleteLead}
        />
      )}

      {/* 2. Manual Add Lead Modal */}
      {showAddLeadModal && (
        <LeadFormModal
          settings={effectiveSettings}
          onClose={() => setShowAddLeadModal(false)}
          onAddLead={(newLead) => {
            saveLead(newLead);
            refreshLeads();
          }}
        />
      )}

      {/* 3. Bulk WhatsApp Modal */}
      {showBulkWhatsAppModal && (
        <BulkWhatsAppModal
          selectedLeads={bulkWhatsAppLeads.length > 0 ? bulkWhatsAppLeads : leads}
          settings={effectiveSettings}
          whatsAppTemplates={whatsAppTemplates}
          onClose={() => setShowBulkWhatsAppModal(false)}
          onAddBulkNote={handleAddBulkNote}
        />
      )}

      {/* 4. Google Sheets Sync Modal */}
      {showSheetsModal && (
        <GoogleSheetsSyncModal
          config={sheetsConfig}
          settings={effectiveSettings}
          onSaveConfig={handleSaveSheetsConfig}
          onRunSyncNow={runGoogleSheetSync}
          onClose={() => setShowSheetsModal(false)}
          isSyncing={isSheetsSyncing}
          skippedRowsHistory={skippedRowsHistory}
        />
      )}

      {/* 5. Individual Send WhatsApp Modal */}
      {whatsAppModalLead && (
        <SendWhatsAppModal
          lead={whatsAppModalLead}
          settings={effectiveSettings}
          whatsAppTemplates={whatsAppTemplates}
          onClose={() => setWhatsAppModalLead(null)}
        />
      )}

      {/* 6. Individual Send Email Modal via EmailJS */}
      {emailModalLead && (
        <SendEmailModal
          lead={emailModalLead}
          settings={effectiveSettings}
          emailTemplates={emailTemplates}
          onClose={() => setEmailModalLead(null)}
        />
      )}

      {/* Top Right Toast Notifications */}
      <SyncToastNotification toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
