import React, { useState } from 'react';
import { CRMSettings, CourseItem, BatchItem } from '../types';
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Download,
  RefreshCw,
  MessageSquare,
  BookOpen,
  Layers,
  Sparkles,
  Edit2,
  Check,
  X,
  AlertTriangle,
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
} from '../lib/storage';

interface SettingsViewProps {
  settings: CRMSettings;
  coursesList?: CourseItem[];
  batchesList?: BatchItem[];
  onSaveSettings: (newSettings: CRMSettings) => void;
  onExportAllCSV: () => void;
  onExportJSON: () => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  coursesList = [],
  batchesList = [],
  onSaveSettings,
  onExportAllCSV,
  onExportJSON,
  onClearAllData,
}) => {
  const [sources, setSources] = useState<string[]>(settings.sources);
  const [templates, setTemplates] = useState(settings.whatsappTemplates);

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

  // New Template state
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplMsg, setNewTplMsg] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Danger Zone delete confirm states
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

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

  // Template actions
  const handleAddTemplate = () => {
    if (!newTplTitle.trim() || !newTplMsg.trim()) return;
    const newTpl = {
      id: 'tpl_' + Date.now(),
      title: newTplTitle.trim(),
      message: newTplMsg.trim(),
    };
    setTemplates([...templates, newTpl]);
    setNewTplTitle('');
    setNewTplMsg('');
  };

  const handleRemoveTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const handleSaveAllSettings = () => {
    const updated: CRMSettings = {
      courses: coursesList.filter((c) => c.active).map((c) => c.name),
      sources,
      batches: batchesList.filter((b) => b.active).map((b) => b.name),
      whatsappTemplates: templates,
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
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto text-xs">
      {/* Header */}
      <div className="glass p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400 shrink-0" />
            <span>CRM System Settings & Config</span>
          </h2>
          <p className="text-slate-400 mt-1">
            Customize course interests, lead sources, batch lists, and WhatsApp message templates.
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
                      className="text-slate-400 hover:text-teal-400 transition-colors p-1"
                      title="Edit Course Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveCourse(c.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Deactivate Course (Soft Delete)"
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
                      title="Deactivate Batch (Soft Delete)"
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

      {/* WhatsApp Templates Section */}
      <div className="glass p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-100">
            <MessageSquare className="w-4 h-4 text-teal-400" />
            <span>WhatsApp Message Templates</span>
          </div>
          <span className="text-slate-500 text-[11px]">Use placeholders: {'{name}'}, {'{course}'}, {'{batch}'}</span>
        </div>

        {/* Existing Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{tpl.title}</span>
                <button
                  onClick={() => handleRemoveTemplate(tpl.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded border border-slate-800">
                {tpl.message}
              </p>
            </div>
          ))}
        </div>

        {/* Add New Template Form */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="font-bold text-slate-300">Add New WhatsApp Template</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newTplTitle}
              onChange={(e) => setNewTplTitle(e.target.value)}
              placeholder="Template Title (e.g. Fees Offer)"
              className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2"
            />
            <input
              type="text"
              value={newTplMsg}
              onChange={(e) => setNewTplMsg(e.target.value)}
              placeholder="Hi {name}! Special 20% discount on {course}..."
              className="sm:col-span-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
            />
          </div>
          <button
            onClick={handleAddTemplate}
            className="bg-teal-950 hover:bg-teal-900 text-teal-400 border border-teal-800 font-bold px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Save New Template</span>
          </button>
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

