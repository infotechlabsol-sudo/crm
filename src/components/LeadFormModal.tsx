import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, LeadScore, CRMSettings } from '../types';
import { X, PlusCircle, Save } from 'lucide-react';
import { isValidPhone, cleanPhoneNumber } from '../lib/utils';

interface LeadFormModalProps {
  settings: CRMSettings;
  onClose: () => void;
  onAddLead: (lead: Lead) => void;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  settings,
  onClose,
  onAddLead,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState(settings.sources[0] || 'Instagram Ads');
  const [courseInterest, setCourseInterest] = useState(
    settings.courses[0] || ''
  );
  const [status, setStatus] = useState<LeadStatus>('New');
  const [assignedBatch, setAssignedBatch] = useState(
    settings.batches[0] || ''
  );

  useEffect(() => {
    if (settings.courses.length > 0 && (!courseInterest || !settings.courses.includes(courseInterest))) {
      setCourseInterest(settings.courses[0]);
    }
  }, [settings.courses, courseInterest]);

  useEffect(() => {
    if (settings.batches.length > 0 && (!assignedBatch || !settings.batches.includes(assignedBatch))) {
      setAssignedBatch(settings.batches[0]);
    }
  }, [settings.batches, assignedBatch]);
  const [leadScore, setLeadScore] = useState<LeadScore>('Warm');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [address, setAddress] = useState('');
  const [classMode, setClassMode] = useState<'Online' | 'Offline'>('Offline');
  const [dob, setDob] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter student name!');
      return;
    }

    if (!isValidPhone(phone)) {
      alert('Please enter a valid 10-digit phone number!');
      return;
    }

    const nowISO = new Date().toISOString();
    const cleanedDigits = cleanPhoneNumber(phone);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const notesHistory = [
      {
        id: 'n_init_' + Date.now(),
        note_text: initialNote.trim() || 'Lead manually entered into CRM system.',
        timestamp: nowISO,
        added_by: 'Admin',
      },
    ];

    const newLead: Lead = {
      id: 'lead_' + Date.now(),
      name: name.trim(),
      phone: cleanedDigits,
      email: email.trim(),
      source,
      course_interest: courseInterest,
      status,
      assigned_batch: assignedBatch,
      lead_score: leadScore,
      created_date: nowISO,
      last_contacted_date: initialNote ? nowISO : undefined,
      next_followup_date: nextFollowupDate ? new Date(nextFollowupDate).toISOString() : undefined,
      notes_history: notesHistory,
      tags: parsedTags,
      address: address.trim(),
      converted_to_student: false,
      class_mode: classMode,
      dob: dob || '',
    };

    onAddLead(newLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-teal-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">Add New Student Lead (Naya Lead)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Student Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Phone Number (10 digits) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-mono font-medium"
              />
            </div>
          </div>

          {/* Email & DOB & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@gmail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Lead Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {settings.sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course, Class Mode & Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Course Interest</label>
              <select
                value={courseInterest}
                onChange={(e) => setCourseInterest(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
              >
                {settings.courses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Class Mode</label>
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
              <label className="block text-slate-300 font-medium mb-1">Assigned Batch</label>
              <select
                value={assignedBatch}
                onChange={(e) => setAssignedBatch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {settings.batches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Pipeline Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
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
              <label className="block text-slate-300 font-medium mb-1">Lead Score</label>
              <div className="flex gap-2">
                {(['Hot', 'Warm', 'Cold'] as LeadScore[]).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setLeadScore(sc)}
                    className={`flex-1 py-1.5 rounded-lg border font-bold transition-all ${
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

          {/* Next Followup Date */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Schedule Next Follow-up (Date & Time)
            </label>
            <input
              type="datetime-local"
              value={nextFollowupDate}
              onChange={(e) => setNextFollowupDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Residential Address (Pata)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. House No. 12, Sector 15, Noida, UP"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Initial Note */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Initial Note / Inquiry Details</label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="e.g. Student wants weekend batch for After Effects motion design..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Tags (Comma Separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Reels, Urgent, Discount Requested"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg hover:bg-slate-800 text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-2.5 sm:py-2 rounded-lg shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Student Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
