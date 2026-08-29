import React, { useState, useEffect, useRef } from 'react';
import {
  CRMSettings,
  CourseItem,
  BatchItem,
  WhatsAppTemplate,
  EmailTemplate,
} from '../types';
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Download,
  MessageSquare,
  Mail,
  BookOpen,
  Layers,
  Sparkles,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eraser,
  Palette,
  Highlighter,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  addCourse,
  updateCourse,
  deactivateCourse,
  reactivateCourse,
  addBatch,
  updateBatch,
  deactivateBatch,
  reactivateBatch,
  addWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
  addEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  subscribeToWhatsAppTemplates,
  subscribeToEmailTemplates,
  DEFAULT_WHATSAPP_TEMPLATES,
  DEFAULT_EMAIL_TEMPLATES,
} from '../lib/storage';

interface SettingsViewProps {
  settings: CRMSettings;
  coursesList?: CourseItem[];
  batchesList?: BatchItem[];
  whatsAppTemplates?: WhatsAppTemplate[];
  emailTemplates?: EmailTemplate[];
  onSaveSettings: (newSettings: CRMSettings) => void;
  onExportAllCSV: () => void;
  onExportJSON: () => void;
  onClearAllData: () => void;
}

const AVAILABLE_PLACEHOLDERS = [
  { tag: '{{name}}', label: 'Student Name' },
  { tag: '{{course_interest}}', label: 'Course' },
  { tag: '{{batch}}', label: 'Batch Name' },
  { tag: '{{phone}}', label: 'Phone Number' },
  { tag: '{{email}}', label: 'Email' },
  { tag: '{{registration_number}}', label: 'Reg No.' },
  { tag: '{{remaining_fees}}', label: 'Remaining Fees' },
  { tag: '{{source}}', label: 'Lead Source' },
  { tag: '{{address}}', label: 'Address' },
  { tag: '{{class_mode}}', label: 'Class Mode' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  coursesList = [],
  batchesList = [],
  whatsAppTemplates: initialWhatsAppTemplates,
  emailTemplates: initialEmailTemplates,
  onSaveSettings,
  onExportAllCSV,
  onExportJSON,
  onClearAllData,
}) => {
  const [sources, setSources] = useState<string[]>(settings.sources);

  // New item inputs
  const [newCourse, setNewCourse] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newBatch, setNewBatch] = useState('');

  // Course editing state
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseName, setEditingCourseName] = useState('');
  const [showInactiveCourses, setShowInactiveCourses] = useState(false);

  // Batch editing state
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = useState('');
  const [showInactiveBatches, setShowInactiveBatches] = useState(false);

  // WhatsApp Templates state
  const [waTemplatesList, setWaTemplatesList] = useState<WhatsAppTemplate[]>(
    initialWhatsAppTemplates || DEFAULT_WHATSAPP_TEMPLATES
  );
  const [isAddingWaTemplate, setIsAddingWaTemplate] = useState(false);
  const [editingWaId, setEditingWaId] = useState<string | null>(null);
  const [waNameInput, setWaNameInput] = useState('');
  const [waMessageInput, setWaMessageInput] = useState('');
  const [waActionStatus, setWaActionStatus] = useState<string | null>(null);
  const waTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Email Templates state
  const [emailTemplatesList, setEmailTemplatesList] = useState<EmailTemplate[]>(
    initialEmailTemplates || DEFAULT_EMAIL_TEMPLATES
  );
  const [isAddingEmailTemplate, setIsAddingEmailTemplate] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailNameInput, setEmailNameInput] = useState('');
  const [emailSubjectInput, setEmailSubjectInput] = useState('');
  const [emailActionStatus, setEmailActionStatus] = useState<string | null>(null);
  const emailEditorRef = useRef<HTMLDivElement>(null);
  const emailColorPickerRef = useRef<HTMLInputElement>(null);
  const emailHighlightPickerRef = useRef<HTMLInputElement>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Danger Zone delete confirm states
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // Subscribe to real-time templates from Firestore
  useEffect(() => {
    const unsubWa = subscribeToWhatsAppTemplates((templates) => {
      if (templates && templates.length > 0) {
        setWaTemplatesList(templates);
      }
    });

    const unsubEm = subscribeToEmailTemplates((templates) => {
      if (templates && templates.length > 0) {
        setEmailTemplatesList(templates);
      }
    });

    return () => {
      unsubWa();
      unsubEm();
    };
  }, []);

  const handleFinalDeleteLeads = () => {
    if (deleteConfirmInput !== 'DELETE') return;
    onClearAllData();
    setShowConfirmDeleteModal(false);
    setDeleteConfirmInput('');
    setShowDeleteSuccess(true);
    setTimeout(() => {
      setShowDeleteSuccess(false);
    }, 5000);
  };

  // Course actions
  const handleAddCourse = async () => {
    if (!newCourse.trim()) return;
    await addCourse(newCourse.trim());
    setNewCourse('');
  };

  const handleStartEditCourse = (item: CourseItem) => {
    setEditingCourseId(item.id);
    setEditingCourseName(item.name);
  };

  const handleSaveEditCourse = async (id: string) => {
    if (editingCourseName.trim()) {
      await updateCourse(id, editingCourseName.trim());
    }
    setEditingCourseId(null);
    setEditingCourseName('');
  };

  const handleRemoveCourse = async (id: string) => {
    await deactivateCourse(id);
  };

  const handleReactivateCourse = async (id: string) => {
    await reactivateCourse(id);
  };

  // Batch actions
  const handleAddBatch = async () => {
    if (!newBatch.trim()) return;
    await addBatch(newBatch.trim());
    setNewBatch('');
  };

  const handleStartEditBatch = (item: BatchItem) => {
    setEditingBatchId(item.id);
    setEditingBatchName(item.name);
  };

  const handleSaveEditBatch = async (id: string) => {
    if (editingBatchName.trim()) {
      await updateBatch(id, editingBatchName.trim());
    }
    setEditingBatchId(null);
    setEditingBatchName('');
  };

  const handleRemoveBatch = async (id: string) => {
    await deactivateBatch(id);
  };

  const handleReactivateBatch = async (id: string) => {
    await reactivateBatch(id);
  };

  // Sources actions
  const handleAddSource = () => {
    if (!newSource.trim()) return;
    if (sources.includes(newSource.trim())) return;
    setSources([...sources, newSource.trim()]);
    setNewSource('');
  };

  const handleRemoveSource = (src: string) => {
    setSources(sources.filter((s) => s !== src));
  };

  // ================= WhatsApp Templates Management =================
  const handleStartAddWaTemplate = () => {
    setEditingWaId(null);
    setWaNameInput('');
    setWaMessageInput('');
    setIsAddingWaTemplate(true);
  };

  const handleStartEditWaTemplate = (template: WhatsAppTemplate) => {
    setEditingWaId(template.id);
    setWaNameInput(template.name);
    setWaMessageInput(template.message);
    setIsAddingWaTemplate(true);
  };

  const handleCancelWaTemplate = () => {
    setEditingWaId(null);
    setWaNameInput('');
    setWaMessageInput('');
    setIsAddingWaTemplate(false);
  };

  const handleInsertWaPlaceholder = (tag: string) => {
    if (waTextareaRef.current) {
      const textarea = waTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prev = waMessageInput;
      const next = prev.substring(0, start) + tag + prev.substring(end);
      setWaMessageInput(next);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      setWaMessageInput((prev) => prev + tag);
    }
  };

  const handleSaveWaTemplate = async () => {
    if (!waNameInput.trim() || !waMessageInput.trim()) return;

    if (editingWaId) {
      await updateWhatsAppTemplate(editingWaId, waNameInput.trim(), waMessageInput.trim());
      setWaActionStatus('WhatsApp template updated!');
    } else {
      await addWhatsAppTemplate(waNameInput.trim(), waMessageInput.trim());
      setWaActionStatus('New WhatsApp template created!');
    }

    handleCancelWaTemplate();
    setTimeout(() => setWaActionStatus(null), 3000);
  };

  const handleDeleteWaTemplate = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete template "${name}"?`)) {
      await deleteWhatsAppTemplate(id);
      setWaActionStatus(`Template "${name}" deleted.`);
      setTimeout(() => setWaActionStatus(null), 3000);
    }
  };

  // ================= Email Templates Management =================
  const handleStartAddEmailTemplate = () => {
    setEditingEmailId(null);
    setEmailNameInput('');
    setEmailSubjectInput('');
    setIsAddingEmailTemplate(true);
    setTimeout(() => {
      if (emailEditorRef.current) {
        emailEditorRef.current.innerHTML =
          '<p>Hi <strong>{{name}}</strong>,</p><p><br></p><p>We are excited to share details about <strong>{{course_interest}}</strong>.</p><p><br></p><p>Warm regards,<br><strong>Team Tech Lab Academy</strong></p>';
      }
    }, 50);
  };

  const handleStartEditEmailTemplate = (template: EmailTemplate) => {
    setEditingEmailId(template.id);
    setEmailNameInput(template.name);
    setEmailSubjectInput(template.subject);
    setIsAddingEmailTemplate(true);
    setTimeout(() => {
      if (emailEditorRef.current) {
        emailEditorRef.current.innerHTML = template.message;
      }
    }, 50);
  };

  const handleCancelEmailTemplate = () => {
    setEditingEmailId(null);
    setEmailNameInput('');
    setEmailSubjectInput('');
    if (emailEditorRef.current) {
      emailEditorRef.current.innerHTML = '';
    }
    setIsAddingEmailTemplate(false);
  };

  const executeEmailCommand = (command: string, value: string | undefined = undefined) => {
    if (emailEditorRef.current) {
      emailEditorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const handleEmailParagraphStyle = (tag: string) => {
    if (emailEditorRef.current) {
      emailEditorRef.current.focus();
      document.execCommand('formatBlock', false, tag);
    }
  };

  const handleInsertEmailLink = () => {
    const url = prompt('Enter the link destination URL (e.g. https://example.com):');
    if (url) {
      executeEmailCommand('createLink', url);
    }
  };

  const handleInsertEmailPlaceholder = (tag: string) => {
    if (emailEditorRef.current) {
      emailEditorRef.current.focus();
      document.execCommand('insertText', false, tag);
    }
  };

  const handleSaveEmailTemplate = async () => {
    const htmlBody = emailEditorRef.current ? emailEditorRef.current.innerHTML.trim() : '';
    if (!emailNameInput.trim() || !emailSubjectInput.trim() || !htmlBody) {
      alert('Please provide a Template Name, Subject, and Message Body.');
      return;
    }

    if (editingEmailId) {
      await updateEmailTemplate(
        editingEmailId,
        emailNameInput.trim(),
        emailSubjectInput.trim(),
        htmlBody
      );
      setEmailActionStatus('Email template updated successfully!');
    } else {
      await addEmailTemplate(
        emailNameInput.trim(),
        emailSubjectInput.trim(),
        htmlBody
      );
      setEmailActionStatus('New Email template created successfully!');
    }

    handleCancelEmailTemplate();
    setTimeout(() => setEmailActionStatus(null), 3000);
  };

  const handleDeleteEmailTemplate = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete email template "${name}"?`)) {
      await deleteEmailTemplate(id);
      setEmailActionStatus(`Email template "${name}" deleted.`);
      setTimeout(() => setEmailActionStatus(null), 3000);
    }
  };

  const handleSaveAllSettings = () => {
    const updated: CRMSettings = {
      courses: coursesList.filter((c) => c.active).map((c) => c.name),
      sources,
      batches: batchesList.filter((b) => b.active).map((b) => b.name),
      whatsappTemplates: waTemplatesList.map((t) => ({
        id: t.id,
        title: t.name,
        message: t.message,
      })),
    };
    onSaveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const activeCourses = coursesList.filter((c) => c.active);
  const inactiveCourses = coursesList.filter((c) => !c.active);

  const activeBatches = batchesList.filter((b) => b.active);
  const inactiveBatches = batchesList.filter((b) => !b.active);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto text-xs">
      {/* Header */}
      <div className="glass p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400 shrink-0" />
            <span>CRM System Settings & Config</span>
          </h2>
          <p className="text-slate-400 mt-1">
            Customize courses, lead sources, batch lists, WhatsApp templates, and rich-text Email templates.
          </p>
        </div>

        <button
          onClick={handleSaveAllSettings}
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg shadow-teal-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer self-stretch sm:self-auto shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{savedSuccess ? 'Saved Successfully ✓' : 'Save Config Changes'}</span>
        </button>
      </div>

      {/* Delete Success Alert */}
      {showDeleteSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-800/80 p-4 rounded-xl flex items-center justify-between gap-3 text-emerald-400 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="font-semibold text-xs">All leads data has been cleared.</span>
          </div>
          <button
            onClick={() => setShowDeleteSuccess(false)}
            className="text-emerald-500 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Dropdown Managers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Manage Courses (Firestore shared) */}
        <div className="glass p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-100">
              <BookOpen className="w-4 h-4 text-teal-400" />
              <span>Course Interests List</span>
            </div>
            <span className="text-[10px] text-teal-400 font-semibold bg-teal-950/60 border border-teal-800/80 px-1.5 py-0.5 rounded">
              Firestore
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCourse();
              }}
              placeholder="Add course name..."
              className="flex-1 bg-slate-900/80 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleAddCourse}
              className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {activeCourses.length === 0 && (
              <p className="text-slate-500 italic py-2 text-center text-[11px]">No active courses found.</p>
            )}
            {activeCourses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-slate-300 font-medium"
              >
                {editingCourseId === c.id ? (
                  <div className="flex items-center gap-1 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingCourseName}
                      onChange={(e) => setEditingCourseName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditCourse(c.id);
                      }}
                      className="flex-1 bg-slate-950 border border-teal-500 text-slate-100 px-2 py-0.5 rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditCourse(c.id)}
                      className="text-teal-400 hover:text-teal-300 p-1"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCourseId(null)}
                      className="text-slate-400 hover:text-slate-300 p-1"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span>{c.name}</span>
                )}

                {editingCourseId !== c.id && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEditCourse(c)}
                      className="text-slate-400 hover:text-teal-400 transition-colors p-1 cursor-pointer"
                      title="Edit Course Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveCourse(c.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Deactivate Course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Deactivated Courses */}
          {inactiveCourses.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setShowInactiveCourses(!showInactiveCourses)}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-medium flex items-center justify-between w-full cursor-pointer"
              >
                <span>Deactivated Courses ({inactiveCourses.length})</span>
                <span className="text-[10px] underline">{showInactiveCourses ? 'Hide' : 'Show'}</span>
              </button>

              {showInactiveCourses && (
                <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                  {inactiveCourses.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-slate-500 text-xs"
                    >
                      <span className="line-through">{c.name}</span>
                      <button
                        onClick={() => handleReactivateCourse(c.id)}
                        className="text-teal-400 hover:text-teal-300 font-semibold text-[10px] px-2 py-0.5 rounded bg-teal-950/80 border border-teal-900 cursor-pointer"
                      >
                        Reactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manage Sources */}
        <div className="glass p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-100 border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Lead Sources List</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Add lead source..."
              className="flex-1 bg-slate-900/80 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleAddSource}
              className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {sources.map((src) => (
              <div
                key={src}
                className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-slate-300 font-medium"
              >
                <span>{src}</span>
                <button
                  onClick={() => handleRemoveSource(src)}
                  className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Manage Batches (Firestore shared) */}
        <div className="glass p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-100">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Batch Names List</span>
            </div>
            <span className="text-[10px] text-teal-400 font-semibold bg-teal-950/60 border border-teal-800/80 px-1.5 py-0.5 rounded">
              Firestore
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newBatch}
              onChange={(e) => setNewBatch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddBatch();
              }}
              placeholder="e.g. Batch 14 - Sep 2026..."
              className="flex-1 bg-slate-900/80 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleAddBatch}
              className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {activeBatches.length === 0 && (
              <p className="text-slate-500 italic py-2 text-center text-[11px]">No active batches found.</p>
            )}
            {activeBatches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-slate-300 font-medium"
              >
                {editingBatchId === b.id ? (
                  <div className="flex items-center gap-1 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingBatchName}
                      onChange={(e) => setEditingBatchName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEditBatch(b.id);
                      }}
                      className="flex-1 bg-slate-950 border border-teal-500 text-slate-100 px-2 py-0.5 rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditBatch(b.id)}
                      className="text-teal-400 hover:text-teal-300 p-1"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingBatchId(null)}
                      className="text-slate-400 hover:text-slate-300 p-1"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span>{b.name}</span>
                )}

                {editingBatchId !== b.id && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEditBatch(b)}
                      className="text-slate-400 hover:text-teal-400 transition-colors p-1 cursor-pointer"
                      title="Edit Batch Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveBatch(b.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="Deactivate Batch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Deactivated Batches */}
          {inactiveBatches.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setShowInactiveBatches(!showInactiveBatches)}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-medium flex items-center justify-between w-full cursor-pointer"
              >
                <span>Deactivated Batches ({inactiveBatches.length})</span>
                <span className="text-[10px] underline">{showInactiveBatches ? 'Hide' : 'Show'}</span>
              </button>

              {showInactiveBatches && (
                <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                  {inactiveBatches.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-900 text-slate-500 text-xs"
                    >
                      <span className="line-through">{b.name}</span>
                      <button
                        onClick={() => handleReactivateBatch(b.id)}
                        className="text-teal-400 hover:text-teal-300 font-semibold text-[10px] px-2 py-0.5 rounded bg-teal-950/80 border border-teal-900 cursor-pointer"
                      >
                        Reactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= WhatsApp Templates Section ================= */}
      <div className="glass p-5 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <span>WhatsApp Templates</span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded">
                  whatsapp_templates
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Pre-formatted messages for one-click and bulk WhatsApp messaging with dynamic lead placeholders.
              </p>
            </div>
          </div>

          <button
            onClick={() => (isAddingWaTemplate ? handleCancelWaTemplate() : handleStartAddWaTemplate())}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
          >
            {isAddingWaTemplate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAddingWaTemplate ? 'Cancel' : 'Add New Template'}</span>
          </button>
        </div>

        {waActionStatus && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-2.5 rounded-lg flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{waActionStatus}</span>
          </div>
        )}

        {/* WhatsApp Add / Edit Form */}
        {isAddingWaTemplate && (
          <div className="bg-slate-950/90 p-4 rounded-xl border border-emerald-800/80 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{editingWaId ? 'Edit WhatsApp Template' : 'Create New WhatsApp Template'}</span>
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Template Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={waNameInput}
                  onChange={(e) => setWaNameInput(e.target.value)}
                  placeholder="e.g. Fee Reminder / Demo Class Invite"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    Message Body <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {waMessageInput.length} chars
                  </span>
                </div>
                <textarea
                  ref={waTextareaRef}
                  rows={4}
                  value={waMessageInput}
                  onChange={(e) => setWaMessageInput(e.target.value)}
                  placeholder="Type message text... (e.g. Hi {{name}}! Your inquiry for {{course_interest}} is confirmed.)"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 placeholder-slate-500 rounded-lg p-3 text-xs leading-relaxed focus:outline-none font-mono"
                />
              </div>

              {/* Placeholders Quick Chips */}
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Click to insert placeholder:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.tag}
                      type="button"
                      onClick={() => handleInsertWaPlaceholder(ph.tag)}
                      className="bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-700 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer"
                      title={ph.label}
                    >
                      {ph.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelWaTemplate}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveWaTemplate}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingWaId ? 'Update Template' : 'Save Template'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing WhatsApp Templates List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {waTemplatesList.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 space-y-2.5 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-100 text-xs truncate">{tpl.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEditWaTemplate(tpl)}
                      className="text-slate-400 hover:text-emerald-400 p-1 transition-colors cursor-pointer"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWaTemplate(tpl.id, tpl.name)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 mt-2 line-clamp-3 whitespace-pre-wrap">
                  {tpl.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= Email Templates Section ================= */}
      <div className="glass p-5 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <span>Email Templates</span>
                <span className="text-[10px] text-blue-400 font-semibold bg-blue-950/80 border border-blue-800 px-1.5 py-0.5 rounded">
                  email_templates
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Rich HTML templates with formatting toolbar and dynamic placeholders for standard emails and course announcements.
              </p>
            </div>
          </div>

          <button
            onClick={() => (isAddingEmailTemplate ? handleCancelEmailTemplate() : handleStartAddEmailTemplate())}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
          >
            {isAddingEmailTemplate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAddingEmailTemplate ? 'Cancel' : 'Add New Template'}</span>
          </button>
        </div>

        {emailActionStatus && (
          <div className="bg-blue-950/60 border border-blue-800 text-blue-300 p-2.5 rounded-lg flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{emailActionStatus}</span>
          </div>
        )}

        {/* Email Add / Edit Form */}
        {isAddingEmailTemplate && (
          <div className="bg-slate-950/90 p-4 rounded-xl border border-blue-800/80 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{editingEmailId ? 'Edit Email Template' : 'Create New Email Template'}</span>
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Template Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailNameInput}
                    onChange={(e) => setEmailNameInput(e.target.value)}
                    placeholder="e.g. Batch Details & Curriculum"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Email Subject <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailSubjectInput}
                    onChange={(e) => setEmailSubjectInput(e.target.value)}
                    placeholder="e.g. Learn {{course_interest}} at Tech Lab Academy"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Rich-Text Message Editor */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Message Body (HTML) <span className="text-rose-400">*</span>
                </label>

                {/* Formatting Toolbar */}
                <div className="bg-slate-900 border border-slate-700 rounded-t-xl p-1.5 flex flex-wrap items-center gap-1 border-b-0 text-slate-300">
                  {/* Paragraph style */}
                  <select
                    onChange={(e) => handleEmailParagraphStyle(e.target.value)}
                    defaultValue="p"
                    className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[11px] font-medium focus:outline-none cursor-pointer"
                    title="Text Style"
                  >
                    <option value="p">Normal</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                  </select>

                  <div className="h-4 w-[1px] bg-slate-800 mx-1" />

                  {/* Bold */}
                  <button
                    type="button"
                    onClick={() => executeEmailCommand('bold')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  {/* Italic */}
                  <button
                    type="button"
                    onClick={() => executeEmailCommand('italic')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  {/* Underline */}
                  <button
                    type="button"
                    onClick={() => executeEmailCommand('underline')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  {/* Strikethrough */}
                  <button
                    type="button"
                    onClick={() => executeEmailCommand('strikeThrough')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-[1px] bg-slate-800 mx-1" />

                  {/* Bullet list */}
                  <button
                    type="button"
                    onClick={() => executeEmailCommand('insertUnorderedList')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>

                  {/* Numbered list */}
                  <button
                    type="button"
                    onClick={() => executeEmailCommand('insertOrderedList')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-[1px] bg-slate-800 mx-1" />

                  {/* Link */}
                  <button
                    type="button"
                    onClick={handleInsertEmailLink}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>

                  {/* Text Color */}
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => emailColorPickerRef.current?.click()}
                      className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Text Color"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={emailColorPickerRef}
                      type="color"
                      defaultValue="#38bdf8"
                      onChange={(e) => executeEmailCommand('foreColor', e.target.value)}
                      className="sr-only"
                    />
                  </div>

                  {/* Highlight Color */}
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => emailHighlightPickerRef.current?.click()}
                      className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Highlight Color"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                    </button>
                    <input
                      ref={emailHighlightPickerRef}
                      type="color"
                      defaultValue="#fef08a"
                      onChange={(e) => executeEmailCommand('hiliteColor', e.target.value)}
                      className="sr-only"
                    />
                  </div>

                  {/* Clear formatting */}
                  <button
                    type="button"
                    onClick={() => executeEmailCommand('removeFormat')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer ml-auto"
                    title="Clear Formatting"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Editable Area */}
                <div
                  ref={emailEditorRef}
                  contentEditable
                  className="w-full bg-slate-950 border border-slate-700 rounded-b-xl p-3 min-h-[140px] max-h-[260px] overflow-y-auto text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-sans leading-relaxed rich-text-area"
                />
              </div>

              {/* Placeholders Quick Chips */}
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Click to insert placeholder at cursor:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_PLACEHOLDERS.map((ph) => (
                    <button
                      key={ph.tag}
                      type="button"
                      onClick={() => handleInsertEmailPlaceholder(ph.tag)}
                      className="bg-slate-800 hover:bg-blue-950 text-slate-300 hover:text-blue-300 border border-slate-700 hover:border-blue-700 px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer"
                      title={ph.label}
                    >
                      {ph.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelEmailTemplate}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEmailTemplate}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingEmailId ? 'Update Email Template' : 'Save Email Template'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Email Templates List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emailTemplatesList.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 space-y-2.5 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-100 text-xs truncate block">{tpl.name}</span>
                    <span className="text-[11px] text-blue-400 font-medium truncate block mt-0.5">
                      Subject: {tpl.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEditEmailTemplate(tpl)}
                      className="text-slate-400 hover:text-blue-400 p-1 transition-colors cursor-pointer"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmailTemplate(tpl.id, tpl.name)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 mt-2 line-clamp-3 prose prose-invert max-w-none text-xs"
                  dangerouslySetInnerHTML={{ __html: tpl.message }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backup, Export & Reset Section */}
      <div className="glass p-5 rounded-xl space-y-4">
        <div className="border-b border-slate-800 pb-2">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-400" />
            <span>Data Backup & System Maintenance</span>
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Export regular backups to keep your student leads and configuration safe.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          {/* Export CSV */}
          <button
            onClick={onExportAllCSV}
            className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <div className="text-left">
              <div>Export All Leads (CSV)</div>
              <div className="text-[10px] text-slate-500 font-normal">Excel/Spreadsheet backup</div>
            </div>
          </button>

          {/* Export JSON */}
          <button
            onClick={onExportJSON}
            className="p-3 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <div className="text-left">
              <div>Export Full Backup (JSON)</div>
              <div className="text-[10px] text-slate-500 font-normal">Complete CRM snapshot</div>
            </div>
          </button>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="border border-red-800/60 bg-red-950/20 p-5 rounded-xl space-y-4 mt-6">
        <div className="flex items-center gap-2 border-b border-red-800/40 pb-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-red-400 text-sm">Danger Zone</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-200">Clear All Leads Data</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed max-w-2xl">
              Permanently delete all leads and their notes from the database. Courses, batches, and any connected student/admission records will remain untouched.
            </p>
          </div>
          <button
            onClick={() => {
              setDeleteConfirmInput('');
              setShowConfirmDeleteModal(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg shadow-red-950/30 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Leads Data</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-950/80 border border-red-800/60 text-red-400 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-bold text-slate-100">Permanently Clear Leads Data?</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  This will permanently delete <strong className="text-red-400">ALL</strong> leads and their notes from the database. This action cannot be undone. This does <strong className="text-teal-400">NOT</strong> affect courses, batches, or any connected student/admission records.
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <label className="block text-[11px] font-medium text-slate-300">
                To confirm, please type <strong className="text-red-400 font-bold">DELETE</strong> in the box below:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2.5 text-xs text-center font-bold tracking-widest uppercase focus:outline-none focus:border-red-500 placeholder-slate-600"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmDeleteModal(false);
                  setDeleteConfirmInput('');
                }}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmInput !== 'DELETE'}
                onClick={handleFinalDeleteLeads}
                className={`flex-1 px-4 py-2 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  deleteConfirmInput === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-950/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
