import React, { useState } from 'react';
import { Lead, LeadStatus, LeadScore, CRMSettings } from '../types';
import {
  X,
  PhoneCall,
  MessageCircle,
  Clock,
  Send,
  User,
  Trash2,
  Save,
  MessageSquare,
  Sparkles,
  Check,
  Mail,
} from 'lucide-react';
import { SendWhatsAppModal } from './SendWhatsAppModal';
import { SendEmailModal } from './SendEmailModal';

const DEFAULT_EMAIL_TEMPLATE = {
  subject: "Learn {{course_interest}} at Tech Lab Academy — Batch Details Inside",
  body: `Hi {{name}},

Thank you for showing interest in Tech Lab Academy! We're excited to help you build strong, industry-ready skills in {{course_interest}}.

Here's a quick overview of what you can expect from our training:
- Hands-on, project-based learning
- Industry-relevant tools and real editing software
- Flexible batch timings (Online and Offline options available)
- Certification on course completion

Our upcoming batches are filling up fast, and we'd love to have you join us. If you have any questions about the course, fees, or batch schedule, feel free to reply to this email or call us directly.

Looking forward to being a part of your creative journey!

Warm regards,
Team Tech Lab Academy
Mowa, Raipur, Chhattisgarh
info.techlabsol@gmail.com`
};
import {
  getStatusBadgeClass,
  getScoreBadgeClass,
  createTelLink,
  toDatetimeLocalValue,
  formatDateTime,
  isValidPhone,
  cleanPhoneNumber,
} from '../lib/utils';

interface LeadDetailModalProps {
  lead: Lead;
  settings: CRMSettings;
  onClose: () => void;
  onSaveLead: (updatedLead: Lead) => void;
  onAddNote: (leadId: string, noteText: string) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  settings,
  onClose,
  onSaveLead,
  onAddNote,
  onStatusChange,
  onDeleteLead,
}) => {
  // Form State
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email || '');
  const [source, setSource] = useState(lead.source);
  const [courseInterest, setCourseInterest] = useState(lead.course_interest);
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [assignedBatch, setAssignedBatch] = useState(lead.assigned_batch || 'Unassigned');
  const [leadScore, setLeadScore] = useState<LeadScore>(lead.lead_score || 'Warm');
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(lead.tags)
      ? lead.tags.join(', ')
      : (typeof lead.tags === 'string' ? lead.tags : '')
  );
  const [nextFollowupDate, setNextFollowupDate] = useState(toDatetimeLocalValue(lead.next_followup_date));
  const [address, setAddress] = useState(lead.address || '');
  const [classMode, setClassMode] = useState<'Online' | 'Offline'>(lead.class_mode || 'Offline');
  const [dob, setDob] = useState(lead.dob || '');

  // Derived course and batch options
  const courseOptions = React.useMemo(() => {
    if (courseInterest && !settings.courses.includes(courseInterest)) {
      return [courseInterest, ...settings.courses];
    }
    return settings.courses;
  }, [settings.courses, courseInterest]);

  const batchOptions = React.useMemo(() => {
    if (assignedBatch && !settings.batches.includes(assignedBatch)) {
      return [assignedBatch, ...settings.batches];
    }
    return settings.batches;
  }, [settings.batches, assignedBatch]);

  // Note State
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Status handle
  const handleStatusSelect = (newSt: LeadStatus) => {
    if (newSt !== status) {
      setStatus(newSt);
      onStatusChange(lead.id, newSt);
    }
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(lead.id, newNoteText.trim());
    setNewNoteText('');
  };

  const handleSaveAll = () => {
    if (!name.trim()) {
      alert('Student name is required!');
      return;
    }
    if (!isValidPhone(phone)) {
      alert('Please enter a valid 10-digit phone number!');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updatedLead: Lead = {
      ...lead,
      name: name.trim(),
      phone: cleanPhoneNumber(phone),
      email: email.trim(),
      source,
      course_interest: courseInterest,
      status,
      assigned_batch: assignedBatch,
      lead_score: leadScore,
      tags: parsedTags,
      next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
      address: address.trim(),
      class_mode: classMode,
      dob: dob || '',
    };

    onSaveLead(updatedLead);
    onClose();
  };

  const ADMISSION_APP_URL = "https://admin.techlabacademy.in";

  const handleConvertToAdmission = () => {
    const nowISO = new Date().toISOString();
    const updatedLead: Lead = {
      ...lead,
      converted_to_student: true,
      status: 'Enrolled',
      notes_history: [
        {
          id: 'note_conv_' + Date.now(),
          note_text: 'Lead converted to formal Admission. Student record created in Admission System.',
          timestamp: nowISO,
          added_by: 'Admin',
          is_system: true,
        },
        ...(lead.notes_history || [])
      ]
    };
    onSaveLead(updatedLead);
    
    // Open in new tab with leadId parameter
    window.open(`https://admin.techlabacademy.in?leadId=${lead.id}`, '_blank');
  };

  const badgeStyle = getStatusBadgeClass(status);
  const scoreBadge = getScoreBadgeClass(leadScore);

  // Template pre-fill for WhatsApp
  const currentTemplate = settings.whatsappTemplates.find((t) => t.id === selectedTemplateId);
  const waMessageText = currentTemplate
    ? currentTemplate.message
        .replace('{name}', name)
        .replace('{course}', courseInterest)
        .replace('{batch}', assignedBatch)
    : `Namaste ${name}! Greetings from Tech Lab Academy regarding your interest in ${courseInterest}. When is a good time to connect?`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400 font-bold text-lg shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">{name}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                >
                  {status}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${scoreBadge.bg} ${scoreBadge.text} ${scoreBadge.border}`}
                >
                  {leadScore}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                ID: {lead.id} • Created: {formatDateTime(lead.created_date)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!lead.converted_to_student ? (
              <button
                onClick={handleConvertToAdmission}
                className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg border border-teal-500/20 transition-all cursor-pointer"
                title="Convert lead to Admission record"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Convert</span>
              </button>
            ) : (
              <a
                href={`https://admin.techlabacademy.in?leadId=${lead.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer shadow-sm"
                title="Open Admission Form (admin.techlabacademy.in)"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Converted</span>
              </a>
            )}

            <a
              href={createTelLink(phone)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
              <span>Call</span>
            </a>

            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-teal-900 text-teal-400 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-all cursor-pointer"
              title="Send WhatsApp Message"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-blue-900 text-blue-400 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-all cursor-pointer"
              title="Send Email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-auto sm:ml-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Editable Lead Details Form (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-400" />
                <span>Student Information</span>
              </h3>
              <span className="text-[10px] text-slate-500">Edit values inline below</span>
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Student Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Phone Number (10 digits) *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-mono font-medium"
                />
              </div>
            </div>

            {/* Email, DOB & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Lead Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {settings.sources.map((s, idx) => (
                    <option key={`source-${s}-${idx}`} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Course Interest, Class Mode & Assigned Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Course Interest</label>
                <select
                  value={courseInterest}
                  onChange={(e) => setCourseInterest(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
                >
                  {courseOptions.map((c, idx) => (
                    <option key={`course-${c}-${idx}`} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Class Mode</label>
                <select
                  value={classMode}
                  onChange={(e) => setClassMode(e.target.value as 'Online' | 'Offline')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-semibold"
                >
                  <option value="Offline">Offline</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Assigned Batch</label>
                <select
                  value={assignedBatch}
                  onChange={(e) => setAssignedBatch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {batchOptions.map((b, idx) => (
                    <option key={`batch-${b}-${idx}`} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pipeline Status & Lead Score */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Pipeline Stage Status</label>
                <select
                  value={status}
                  onChange={(e) => handleStatusSelect(e.target.value as LeadStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-teal-400 font-bold focus:outline-none focus:border-teal-500"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Demo Scheduled">Demo Scheduled</option>
                  <option value="Enrolled">Enrolled</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Lead Score Priority</label>
                <div className="flex gap-2">
                  {(['Hot', 'Warm', 'Cold'] as LeadScore[]).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setLeadScore(sc)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        leadScore === sc
                          ? sc === 'Hot'
                            ? 'bg-red-950 border-red-700 text-red-400'
                            : sc === 'Warm'
                            ? 'bg-amber-950 border-amber-700 text-amber-400'
                            : 'bg-slate-800 border-slate-600 text-slate-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Follow-up Date & Time Picker */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Set Follow-up Reminder (Date + Time)</span>
              </label>
              <input
                type="datetime-local"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                In-app alerts are shown when CRM is open.
              </p>
            </div>

            {/* Address */}
            <div className="text-xs">
              <label className="block text-slate-400 font-medium mb-1">Residential Address (Pata)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House No. 12, Sector 15, Noida, UP"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            {/* Tags Free Text */}
            <div className="text-xs">
              <label className="block text-slate-400 font-medium mb-1">Tags (Comma Separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Reels Editor, High Budget, Evening Batch"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Quick Template Picker for WhatsApp Message */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
              <label className="block text-slate-400 font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                <span>Select WhatsApp Message Template</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5"
              >
                <option value="">Default Friendly Greeting</option>
                {settings.whatsappTemplates.map((tpl, idx) => (
                  <option key={tpl.id || `tpl-${idx}`} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800 italic">
                "{waMessageText}"
              </p>
            </div>
          </div>

          {/* Right Column: Chat-like Notes History & Activity Timeline (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-950/60 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-teal-400" />
                  <span>Notes & Activity Log</span>
                </h3>
                <span className="text-[10px] text-slate-500">Most recent on top</span>
              </div>

              {/* Chat Timeline List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {(!lead.notes_history || lead.notes_history.length === 0) ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No notes recorded yet. Add a note below!
                  </div>
                ) : (
                  lead.notes_history.map((note, idx) => (
                    <div
                      key={note.id ? `${note.id}-${idx}` : `note-${idx}`}
                      className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        note.is_system
                          ? 'bg-slate-900/90 border-slate-800/80 text-slate-400 italic'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-mono">
                        <span className={note.is_system ? 'text-teal-500 font-semibold' : 'text-slate-400 font-medium'}>
                          {note.added_by}
                        </span>
                        <span>{formatDateTime(note.timestamp)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{note.note_text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleNoteSubmit} className="space-y-2 pt-3 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300">Add New Note / Follow-up Update</label>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Type conversation details, fee discussion, student queries..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl p-3 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Note to Log</span>
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => {
              if (lead.converted_to_student) {
                if (window.confirm("This lead has already been converted to an admitted student. Deleting this lead will NOT delete the student's admission record, fee history, or certificate — that data is stored separately and will remain safe. Do you still want to delete this lead record?")) {
                  onDeleteLead(lead.id);
                  onClose();
                }
              } else {
                if (window.confirm(`Delete lead "${name}" permanently?`)) {
                  onDeleteLead(lead.id);
                  onClose();
                }
              }
            }}
            className="w-full sm:w-auto text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 px-3.5 py-2.5 sm:py-2 rounded-lg border border-rose-800/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Lead</span>
          </button>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs font-medium text-slate-400 hover:text-slate-200 px-4 py-2.5 sm:py-2 rounded-lg border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>

            <button
              onClick={handleSaveAll}
              className="flex-1 sm:flex-none text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 px-5 py-2.5 sm:py-2 rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Lead Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Message Compose & Send Popup Modal */}
      {showWhatsAppModal && (
        <SendWhatsAppModal
          lead={{
            ...lead,
            name: name.trim() || lead.name,
            phone: phone || lead.phone,
            email: email.trim() || lead.email,
            course_interest: courseInterest || lead.course_interest,
            assigned_batch: assignedBatch || lead.assigned_batch,
            source: source || lead.source,
          }}
          settings={settings}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {/* Email Compose & Send Popup Modal via EmailJS */}
      {showEmailModal && (
        <SendEmailModal
          lead={{
            ...lead,
            name: name.trim() || lead.name,
            phone: phone || lead.phone,
            email: email.trim() || lead.email,
            course_interest: courseInterest || lead.course_interest,
            assigned_batch: assignedBatch || lead.assigned_batch,
            source: source || lead.source,
          }}
          settings={settings}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
};
