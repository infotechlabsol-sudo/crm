import React, { useState, useMemo } from 'react';
import {
  CustomForm,
  CRMSettings,
  Lead,
} from '../types';
import {
  Plus,
  Search,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Users,
  CheckCircle,
  Clock,
  Sparkles,
  Link,
  Filter,
  Eye,
  FileText,
  Share2,
} from 'lucide-react';
import { FormBuilderModal } from './FormBuilderModal';

interface CustomFormsViewProps {
  forms: CustomForm[];
  leads: Lead[];
  settings: CRMSettings;
  onCreateForm: (formData: Omit<CustomForm, 'id'>) => Promise<string>;
  onUpdateForm: (id: string, formData: Partial<CustomForm>) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDeleteForm: (id: string) => Promise<void>;
  onViewSubmissions: (formName: string) => void;
  onOpenPublicForm: (formId: string) => void;
}

export const CustomFormsView: React.FC<CustomFormsViewProps> = ({
  forms,
  leads,
  settings,
  onCreateForm,
  onUpdateForm,
  onToggleActive,
  onDeleteForm,
  onViewSubmissions,
  onOpenPublicForm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showToast = (message: string) => {
    setActionNotice(message);
    setTimeout(() => {
      setActionNotice(null);
    }, 3000);
  };

  // Helper to generate public share URL
  const getPublicFormUrl = (formId: string) => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?public_form=${encodeURIComponent(formId)}`;
  };

  const handleCopyLink = async (formId: string, formName: string) => {
    const url = getPublicFormUrl(formId);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedFormId(formId);
      showToast(`Link copied for "${formName}"! Anyone can submit without login.`);
      setTimeout(() => setCopiedFormId(null), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
      showToast(`Link copied: ${url}`);
    }
  };

  // Filtered forms
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      const matchesSearch =
        f.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.form_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.form_description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? f.active
          : !f.active;

      return matchesSearch && matchesStatus;
    });
  }, [forms, searchTerm, statusFilter]);

  // Total stats
  const totalSubmissions = useMemo(() => {
    return forms.reduce((acc, curr) => acc + (curr.submission_count || 0), 0);
  }, [forms]);

  const activeCount = useMemo(() => {
    return forms.filter((f) => f.active).length;
  }, [forms]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionNotice && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-teal-500/80 text-teal-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="text-xs font-semibold">{actionNotice}</span>
        </div>
      )}

      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-950 text-teal-400 rounded-xl border border-teal-800/80">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Sharable Lead Forms</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800/60">
                  {forms.length} Total
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Create custom landing forms to share on Instagram, WhatsApp & Ads. Submissions flow automatically into your Leads pipeline.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingForm(null);
              setIsBuilderOpen(true);
            }}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Form</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Forms */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Custom Forms</p>
            <p className="text-2xl font-black text-white">{forms.length}</p>
            <p className="text-[11px] text-slate-500">{activeCount} active & ready</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-teal-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Active Forms */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Live Active Forms</p>
            <p className="text-2xl font-black text-emerald-400">{activeCount}</p>
            <p className="text-[11px] text-slate-500">Accepting public responses</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Leads Captured */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Form Submissions</p>
            <p className="text-2xl font-black text-teal-400">{totalSubmissions}</p>
            <p className="text-[11px] text-slate-500">Collected into Leads directory</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-800/60 flex items-center justify-center text-teal-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search forms by name or title..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({forms.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Inactive ({forms.length - activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-white">No Sharable Forms Found</h3>
            <p className="text-xs text-slate-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or filters to find what you need.'
                : 'Create your first lead capture form to share with prospective students.'}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingForm(null);
              setIsBuilderOpen(true);
            }}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Form Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredForms.map((form) => {
            const isCopied = copiedFormId === form.id;
            const fieldsCount = form.fields?.length || 0;
            const submissionsCount = form.submission_count || 0;
            const isDeleting = deleteConfirmId === form.id;

            return (
              <div
                key={form.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 transition-all shadow-sm flex flex-col justify-between"
              >
                {/* Form Card Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            form.active
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                              : 'bg-slate-500'
                          }`}
                        />
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {form.form_name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            form.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {form.active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-teal-400">
                        Public Heading: "{form.form_title}"
                      </p>
                    </div>

                    {/* Submissions Badge */}
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
                        <Users className="w-3.5 h-3.5 text-teal-400" />
                        <span>{submissionsCount} submissions</span>
                      </span>
                    </div>
                  </div>

                  {/* Form Description Preview */}
                  {form.form_description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {form.form_description}
                    </p>
                  )}

                  {/* Field Chips */}
                  <div className="pt-1">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Fields ({fieldsCount}):</span>
                      <span className="text-[10px] text-slate-500">
                        Created {new Date(form.created_timestamp || 0).toLocaleDateString('en-IN')}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                      {(form.fields || []).slice(0, 6).map((f, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium"
                        >
                          {f.label} {f.required ? '*' : ''}
                        </span>
                      ))}
                      {fieldsCount > 6 && (
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-500 font-medium">
                          +{fieldsCount - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Actions Footer */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  {/* Public Link Bar */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <Link className="w-3.5 h-3.5 text-teal-400 ml-2 shrink-0" />
                    <input
                      type="text"
                      readOnly
                      value={getPublicFormUrl(form.id)}
                      className="bg-transparent text-[11px] text-slate-400 w-full focus:outline-none select-all truncate"
                    />
                    <button
                      onClick={() => handleCopyLink(form.id, form.form_name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-teal-600 hover:bg-teal-500 text-white'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Buttons Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Active toggle */}
                      <button
                        onClick={() => onToggleActive(form.id, !form.active)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                        title={form.active ? 'Pause Form Submissions' : 'Activate Form'}
                      >
                        {form.active ? (
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-slate-500" />
                        )}
                        <span className="text-[11px] text-slate-300 font-medium">
                          {form.active ? 'Pause' : 'Activate'}
                        </span>
                      </button>

                      {/* Open / Test public form */}
                      <button
                        onClick={() => onOpenPublicForm(form.id)}
                        className="px-2.5 py-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                        title="Preview Public Form"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                        <span>Preview / Test</span>
                      </button>

                      {/* View Submissions */}
                      <button
                        onClick={() => onViewSubmissions(form.form_name)}
                        className="px-2.5 py-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                        title="View Leads from this Form"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-400" />
                        <span>Submissions</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditingForm(form);
                          setIsBuilderOpen(true);
                        }}
                        className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Form Configuration"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      {isDeleting ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-800">
                          <span className="text-[10px] font-bold text-rose-300 px-1">Delete?</span>
                          <button
                            onClick={() => {
                              onDeleteForm(form.id);
                              setDeleteConfirmId(null);
                              showToast(`Deleted form "${form.form_name}"`);
                            }}
                            className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-500 cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold hover:bg-slate-700 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(form.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Form"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Builder Modal */}
      {isBuilderOpen && (
        <FormBuilderModal
          initialForm={editingForm}
          settings={settings}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingForm(null);
          }}
          onSave={async (formData, existingId) => {
            if (existingId) {
              await onUpdateForm(existingId, formData);
              showToast(`Updated form "${formData.form_name}"`);
            } else {
              const newId = await onCreateForm(formData);
              showToast(`Created & published new form "${formData.form_name}"!`);
            }
          }}
        />
      )}
    </div>
  );
};
