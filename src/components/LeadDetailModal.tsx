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
  RotateCcw,
  AlertTriangle,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Calculator,
} from 'lucide-react';
import { QUALIFICATION_QUESTIONS, getQualificationSummary, calculateLeadScore } from '../lib/qualification';
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
  formatRelativeDate,
} from '../lib/utils';

interface LeadDetailModalProps {
  lead: Lead;
  settings: CRMSettings;
  onClose: () => void;
  onSaveLead: (updatedLead: Lead) => void;
  onAddNote: (leadId: string, noteText: string) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onRestoreLead?: (leadId: string) => void;
  onPermanentDeleteLead?: (leadId: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  settings,
  onClose,
  onSaveLead,
  onAddNote,
  onStatusChange,
  onDeleteLead,
  onRestoreLead,
  onPermanentDeleteLead,
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

  // Lead Qualification Checklist State
  const [qualificationAnswers, setQualificationAnswers] = useState<Record<string, 'Hot' | 'Warm' | 'Cold' | null>>(() => {
    return lead.qualification_answers || {};
  });
  const [qualificationCompleted, setQualificationCompleted] = useState<boolean>(() => {
    return lead.qualification_completed === true;
  });

  // Check if any answers currently exist
  const hasExistingAnswers = React.useMemo(() => {
    return Object.values(lead.qualification_answers || {}).some(
      (v) => v === 'Hot' || v === 'Warm' || v === 'Cold'
    );
  }, [lead.qualification_answers]);

  // Section should be collapsed by default for leads that haven't been qualified yet (Requirement 6)
  const [isChecklistExpanded, setIsChecklistExpanded] = useState<boolean>(
    Boolean(lead.qualification_completed || hasExistingAnswers)
  );

  const [scoreConfirmation, setScoreConfirmation] = useState<LeadScore | null>(null);

  // Manual note state for checklist section
  const [checklistNoteText, setChecklistNoteText] = useState('');
  const [checklistNoteSuccess, setChecklistNoteSuccess] = useState(false);

  const handleSaveChecklistNote = () => {
    if (!checklistNoteText.trim()) return;
    onAddNote(lead.id, checklistNoteText.trim());
    setChecklistNoteText('');
    setChecklistNoteSuccess(true);
    setTimeout(() => {
      setChecklistNoteSuccess(false);
    }, 3000);
  };

  // Live-updating summary
  const summary = React.useMemo(() => {
    return getQualificationSummary(qualificationAnswers);
  }, [qualificationAnswers]);

  // Immediate save & live calculation on answer select
  const handleSelectQualificationAnswer = (qid: string, selectedOption: 'Hot' | 'Warm' | 'Cold') => {
    const currentVal = qualificationAnswers[qid];
    // If clicking same answer, keep it or toggle; clicking selects option immediately
    const nextVal: 'Hot' | 'Warm' | 'Cold' | null = currentVal === selectedOption ? null : selectedOption;

    const newAnswers: Record<string, 'Hot' | 'Warm' | 'Cold' | null> = {
      ...qualificationAnswers,
      [qid]: nextVal,
    };
    setQualificationAnswers(newAnswers);

    const hasAny = Object.values(newAnswers).some(
      (v) => v === 'Hot' || v === 'Warm' || v === 'Cold'
    );
    setQualificationCompleted(hasAny);

    // Live calculation of lead score based on majority with warmer tie-breaker
    const calculated = calculateLeadScore(newAnswers);
    const newScore = calculated || leadScore;
    if (calculated) {
      setLeadScore(calculated);
      setScoreConfirmation(calculated);
    }

    // Immediately save into lead data model without separate save button
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updatedLead: Lead = {
      ...lead,
      name: name.trim() || lead.name,
      phone: phone.trim() ? cleanPhoneNumber(phone) : lead.phone,
      email: email.trim(),
      source,
      course_interest: courseInterest,
      status,
      assigned_batch: assignedBatch,
      lead_score: newScore,
      tags: parsedTags,
      next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
      address: address.trim(),
      class_mode: classMode,
      dob: dob || '',
      qualification_answers: newAnswers,
      qualification_completed: hasAny,
    };

    onSaveLead(updatedLead);
  };

  // Calculate Lead Score button handler
  const handleCalculateScoreClick = () => {
    const calculated = calculateLeadScore(qualificationAnswers);
    if (!calculated) {
      return;
    }

    setLeadScore(calculated);
    setScoreConfirmation(calculated);
    setQualificationCompleted(true);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updatedLead: Lead = {
      ...lead,
      name: name.trim() || lead.name,
      phone: phone.trim() ? cleanPhoneNumber(phone) : lead.phone,
      email: email.trim(),
      source,
      course_interest: courseInterest,
      status,
      assigned_batch: assignedBatch,
      lead_score: calculated,
      tags: parsedTags,
      next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
      address: address.trim(),
      class_mode: classMode,
      dob: dob || '',
      qualification_answers: qualificationAnswers,
      qualification_completed: true,
    };

    onSaveLead(updatedLead);
  };

  // Danger Zone Permanent Delete Modal state
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

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
      qualification_answers: qualificationAnswers,
      qualification_completed: qualificationCompleted,
    };

    if (checklistNoteText.trim()) {
      onAddNote(lead.id, checklistNoteText.trim());
    }

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

        {/* Deleted Lead Warning Banner if deleted */}
        {lead.is_deleted && (
          <div className="bg-rose-950/40 border-b border-rose-800/80 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                This lead is archived in <strong>Deleted Leads</strong> (deleted {lead.deleted_date ? formatRelativeDate(lead.deleted_date) : 'recently'}).
              </span>
            </div>
            {onRestoreLead && (
              <button
                type="button"
                onClick={() => {
                  onRestoreLead(lead.id);
                  onClose();
                }}
                className="bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-800/80 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Lead</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto min-h-0">
          {/* Left Column: Editable Lead Details Form (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-4 overflow-y-auto">
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

            {/* Lead Qualification Checklist Section */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all shadow-sm">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
                className="w-full px-3.5 py-3 flex items-center justify-between gap-2 text-left hover:bg-slate-900/60 transition-colors cursor-pointer select-none"
                aria-expanded={isChecklistExpanded}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-teal-950/80 border border-teal-800/80 text-teal-400 shrink-0">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-200">
                        Lead Qualification Checklist
                      </span>
                      {summary.hotCount + summary.warmCount + summary.coldCount > 0 ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${scoreBadge.bg} ${scoreBadge.text} ${scoreBadge.border}`}
                        >
                          Score: {leadScore}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-slate-900 text-slate-400 border-slate-800">
                          Not Yet Qualified
                        </span>
                      )}
                    </div>
                    {!isChecklistExpanded && (summary.hotCount + summary.warmCount + summary.coldCount === 0) && (
                      <p className="text-[11px] text-teal-400/90 mt-0.5 font-medium">
                        Not yet qualified - click to start the qualification checklist
                      </p>
                    )}
                    {!isChecklistExpanded && (summary.hotCount + summary.warmCount + summary.coldCount > 0) && (
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {summary.hotCount + summary.warmCount + summary.coldCount} of 9 answered • Hot: {summary.hotCount}, Warm: {summary.warmCount}, Cold: {summary.coldCount}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                  <span className="text-[11px] font-medium hidden sm:inline text-slate-400">
                    {isChecklistExpanded ? 'Collapse' : 'Expand'}
                  </span>
                  {isChecklistExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Collapsed State Invitation Banner (Requirement 6) */}
              {!isChecklistExpanded && (summary.hotCount + summary.warmCount + summary.coldCount === 0) && (
                <div
                  onClick={() => setIsChecklistExpanded(true)}
                  className="px-3.5 pb-3 pt-0 cursor-pointer"
                >
                  <div className="p-3 rounded-lg bg-teal-950/20 border border-teal-900/40 hover:border-teal-700/60 transition-all flex items-center justify-between text-xs text-teal-300">
                    <span className="font-medium">
                      Not yet qualified - click to start the qualification checklist
                    </span>
                    <span className="text-[11px] font-bold text-teal-400 bg-teal-950 px-2.5 py-1 rounded border border-teal-800 shrink-0">
                      Start Checklist →
                    </span>
                  </div>
                </div>
              )}

              {/* Expanded Checklist Body */}
              {isChecklistExpanded && (
                <div className="p-3.5 border-t border-slate-800/80 space-y-3.5 bg-slate-950/40">
                  {/* 9 Questions List with Descriptive Phrase Buttons */}
                  <div className="space-y-3">
                    {QUALIFICATION_QUESTIONS.map((q) => {
                      const answer = qualificationAnswers[q.id];
                      return (
                        <div
                          key={q.id}
                          className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-950/80 border border-teal-800/60 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                              {q.number}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 leading-snug">
                              {q.label}
                            </span>
                          </div>

                          {/* 3 Pill / Chip Buttons with descriptive answer phrases */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pl-0 sm:pl-6 pt-0.5">
                            {q.options.map((opt) => {
                              const isSelected = answer === opt.value;
                              const optStyle =
                                opt.value === 'Hot'
                                  ? isSelected
                                    ? 'bg-red-950/90 border-red-500 text-red-200 shadow-sm shadow-red-950/50 ring-1 ring-red-500/40'
                                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-red-800/60 hover:text-red-300 hover:bg-slate-900/80'
                                  : opt.value === 'Warm'
                                  ? isSelected
                                    ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-sm shadow-amber-950/50 ring-1 ring-amber-500/40'
                                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-amber-800/60 hover:text-amber-300 hover:bg-slate-900/80'
                                  : isSelected
                                  ? 'bg-slate-800 border-slate-400 text-slate-100 shadow-sm ring-1 ring-slate-400/40'
                                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300 hover:bg-slate-900/80';

                              return (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => handleSelectQualificationAnswer(q.id, opt.value)}
                                  className={`px-2.5 py-1.5 text-[11px] sm:text-xs rounded-lg border font-medium flex items-center gap-1.5 transition-all cursor-pointer text-left leading-tight ${optStyle}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-transform ${
                                      isSelected
                                        ? opt.value === 'Hot'
                                          ? 'bg-red-400 scale-110 shadow-[0_0_6px_rgba(248,113,113,0.8)]'
                                          : opt.value === 'Warm'
                                          ? 'bg-amber-400 scale-110 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                                          : 'bg-slate-300 scale-110'
                                        : 'bg-slate-700'
                                    }`}
                                  />
                                  <span className="flex-1 break-words leading-snug">
                                    {opt.label === '-' ? (
                                      <span>
                                        <span className="font-bold">-</span>{' '}
                                        <span className="text-[10px] text-slate-400 font-normal">
                                          (No comparison)
                                        </span>
                                      </span>
                                    ) : (
                                      opt.label
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Bar (Requirement 4) */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Checklist Summary</span>
                      <span className="font-mono text-slate-500">
                        {summary.hotCount + summary.warmCount + summary.coldCount}/9 answered
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold pt-0.5">
                      <span className="text-red-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                        <span>Hot: {summary.hotCount}</span>
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        <span>Warm: {summary.warmCount}</span>
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                        <span>Cold: {summary.coldCount}</span>
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <span>Unanswered: {summary.unansweredCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* Calculate Lead Score Button & Confirmation (Requirement 5) */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCalculateScoreClick}
                      disabled={summary.hotCount + summary.warmCount + summary.coldCount === 0}
                      className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-teal-500/30"
                    >
                      <Calculator className="w-4 h-4 text-amber-300" />
                      <span>Calculate Lead Score</span>
                    </button>

                    {/* Brief confirmation banner */}
                    {scoreConfirmation && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs animate-fadeIn">
                        <div className="flex items-center gap-2 min-w-0">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-slate-200">
                            Lead score updated to:
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                              getScoreBadgeClass(scoreConfirmation).bg
                            } ${getScoreBadgeClass(scoreConfirmation).text} ${
                              getScoreBadgeClass(scoreConfirmation).border
                            }`}
                          >
                            {scoreConfirmation}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400/90 font-medium shrink-0 ml-2">
                          Synced
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Add New Note Box to type anything manually below the selected section */}
                  <div className="pt-3.5 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                        <span>Add New Note</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-normal">Type anything manually</span>
                    </div>

                    <textarea
                      value={checklistNoteText}
                      onChange={(e) => setChecklistNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          if (checklistNoteText.trim()) {
                            handleSaveChecklistNote();
                          }
                        }
                      }}
                      placeholder="Type conversation details, fee discussion, specific student requirements..."
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl p-3 focus:outline-none focus:border-teal-500 font-medium leading-relaxed resize-y"
                    />

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {checklistNoteSuccess ? (
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 animate-fadeIn">
                          <Check className="w-3.5 h-3.5" />
                          <span>Note saved to student's activity log!</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          Saves directly to student's notes & activity timeline
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveChecklistNote}
                        disabled={!checklistNoteText.trim()}
                        className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs py-2 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Save Note</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
          <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-950/60 flex flex-col justify-between space-y-4 overflow-y-auto">
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
          {lead.is_deleted ? (
            <div className="flex items-center gap-2 flex-wrap">
              {onRestoreLead && (
                <button
                  type="button"
                  onClick={() => {
                    onRestoreLead(lead.id);
                    onClose();
                  }}
                  className="w-full sm:w-auto text-xs font-semibold text-teal-300 hover:text-teal-200 bg-teal-950/80 hover:bg-teal-900 border border-teal-800/80 px-3.5 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Lead</span>
                </button>
              )}

              {onPermanentDeleteLead && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPermanentDeleteConfirm(true);
                    setDeleteConfirmInput('');
                  }}
                  className="w-full sm:w-auto text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 px-3.5 py-2.5 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (lead.converted_to_student) {
                  if (window.confirm("This lead has already been converted to an admitted student. Deleting this lead will NOT delete the student's admission record, fee history, or certificate — that data is stored separately and will remain safe. Do you still want to delete this lead record?")) {
                    onDeleteLead(lead.id);
                    onClose();
                  }
                } else {
                  if (window.confirm(`Are you sure you want to delete lead "${name}"? You can restore it from Deleted Leads later.`)) {
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
          )}

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

      {/* Danger Zone Permanent Delete Confirmation Modal */}
      {showPermanentDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-red-900/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl shadow-red-950/40">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-950/80 border border-red-800/60 text-red-400 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Delete Permanently & Irreversibly?
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  This will permanently and irreversibly delete this lead and all its notes and activity history. This cannot be undone. Are you absolutely sure?
                </p>
                <div className="mt-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-400">Target Lead:</span>{' '}
                  <strong className="text-slate-200">{lead.name}</strong>{' '}
                  <span className="text-slate-500">(+91 {lead.phone})</span>
                </div>
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
                type="button"
                onClick={() => {
                  setShowPermanentDeleteConfirm(false);
                  setDeleteConfirmInput('');
                }}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput !== 'DELETE'}
                onClick={() => {
                  if (deleteConfirmInput === 'DELETE') {
                    onPermanentDeleteLead?.(lead.id);
                    setShowPermanentDeleteConfirm(false);
                    onClose();
                  }
                }}
                className={`flex-1 px-4 py-2 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  deleteConfirmInput === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-950/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Permanent Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
