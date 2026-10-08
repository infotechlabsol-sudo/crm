import React, { useState } from 'react';
import { Lead, FollowUpSortOption } from '../types';
import {
  CalendarClock,
  Clock,
  PhoneCall,
  MessageCircle,
  Mail,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import {
  getFollowUpCategory,
  formatRelativeDate,
  getStatusBadgeClass,
  createTelLink,
  toDatetimeLocalValue,
} from '../lib/utils';

interface FollowUpViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onQuickReschedule: (leadId: string, daysToAdd: number) => void;
  onCustomReschedule: (leadId: string, isoDateString: string) => void;
  onMarkContacted: (leadId: string) => void;
  onOpenAddLead: () => void;
  onOpenWhatsApp?: (lead: Lead) => void;
  onOpenEmail?: (lead: Lead) => void;
  sortOption?: FollowUpSortOption;
  onSortOptionChange?: (newSort: FollowUpSortOption) => void;
}

export const sortFollowUpLeads = (list: Lead[], sort: FollowUpSortOption): Lead[] => {
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'DATE_ASC': {
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }

      case 'DATE_DESC': {
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }

      case 'CLASS_ONLINE_FIRST': {
        const getModeRank = (mode?: string) => {
          if (mode === 'Online') return 1;
          if (mode === 'Offline') return 2;
          return 3;
        };
        const rankA = getModeRank(a.class_mode);
        const rankB = getModeRank(b.class_mode);
        if (rankA !== rankB) return rankA - rankB;
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }

      case 'CLASS_OFFLINE_FIRST': {
        const getModeRank = (mode?: string) => {
          if (mode === 'Offline') return 1;
          if (mode === 'Online') return 2;
          return 3;
        };
        const rankA = getModeRank(a.class_mode);
        const rankB = getModeRank(b.class_mode);
        if (rankA !== rankB) return rankA - rankB;
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }

      case 'NAME_ASC': {
        const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        return timeA - timeB;
      }

      case 'NAME_DESC': {
        const cmp = b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        return timeA - timeB;
      }

      case 'SCORE_HOT_FIRST': {
        const getScoreRank = (score?: string) => {
          if (score === 'Hot') return 1;
          if (score === 'Warm') return 2;
          if (score === 'Cold') return 3;
          return 4;
        };
        const rankA = getScoreRank(a.lead_score);
        const rankB = getScoreRank(b.lead_score);
        if (rankA !== rankB) return rankA - rankB;
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }

      case 'STATUS': {
        const statusOrder: Record<string, number> = {
          'New': 1,
          'Contacted': 2,
          'Interested': 3,
          'Follow-up': 4,
          'Demo Scheduled': 5,
          'Enrolled': 6,
          'Not Interested': 7,
          'Lost': 8,
        };
        const rankA = statusOrder[a.status] || 99;
        const rankB = statusOrder[b.status] || 99;
        if (rankA !== rankB) return rankA - rankB;
        const timeA = new Date(a.next_followup_date || 0).getTime();
        const timeB = new Date(b.next_followup_date || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }

      default:
        return 0;
    }
  });
};

export const FollowUpView: React.FC<FollowUpViewProps> = ({
  leads,
  onSelectLead,
  onQuickReschedule,
  onCustomReschedule,
  onMarkContacted,
  onOpenAddLead,
  onOpenWhatsApp,
  onOpenEmail,
  sortOption,
  onSortOptionChange,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
  const [internalSortOption, setInternalSortOption] = useState<FollowUpSortOption>('DATE_ASC');
  const [rescheduleModalLead, setRescheduleModalLead] = useState<Lead | null>(null);
  const [customDateTime, setCustomDateTime] = useState('');

  const currentSortOption = sortOption ?? internalSortOption;

  const handleSortChange = (newSort: FollowUpSortOption) => {
    setInternalSortOption(newSort);
    if (onSortOptionChange) {
      onSortOptionChange(newSort);
    }
  };

  // Filter leads with next_followup_date (exclude deleted leads)
  const followUpLeads = leads.filter(
    (l) => !l.is_deleted && !!l.next_followup_date
  );

  const overdueList = followUpLeads.filter(
    (l) => getFollowUpCategory(l.next_followup_date) === 'overdue'
  );
  const dueTodayList = followUpLeads.filter(
    (l) => getFollowUpCategory(l.next_followup_date) === 'due_today'
  );
  const upcomingList = followUpLeads.filter(
    (l) => getFollowUpCategory(l.next_followup_date) === 'upcoming'
  );

  const baseList =
    activeTab === 'OVERDUE'
      ? overdueList
      : activeTab === 'TODAY'
      ? dueTodayList
      : activeTab === 'UPCOMING'
      ? upcomingList
      : followUpLeads;

  const displayedList = sortFollowUpLeads(baseList, currentSortOption);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rescheduleModalLead && customDateTime) {
      onCustomReschedule(rescheduleModalLead.id, new Date(customDateTime).toISOString());
      setRescheduleModalLead(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header Alert Notice Banner */}
      <div className="glass p-4 sm:p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400 shrink-0" />
            <span>Follow-up Agendas & Reminders</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Chronological schedule of all pending student calls and WhatsApp check-ins.
          </p>
        </div>

        {/* Notice badge */}
        <div className="bg-teal-950/80 border border-teal-800/80 p-3 rounded-xl text-xs text-teal-300 max-w-md flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <span>
            <strong>In-App Alert System:</strong> Reminders operate as visual badges and priority lists when the app is open in your browser tab.
          </span>
        </div>
      </div>

      {/* Category Tabs & Controls */}
      <div className="glass p-3 rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto pb-1 lg:pb-0 max-w-full">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 sm:px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({followUpLeads.length})
          </button>

          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3 sm:px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'OVERDUE'
                ? 'bg-red-950 text-red-400 border border-red-800'
                : 'text-red-400 hover:bg-red-950/40'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue ({overdueList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TODAY')}
            className={`px-3 sm:px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'TODAY'
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today ({dueTodayList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-3 sm:px-3.5 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'UPCOMING'
                ? 'bg-teal-950 text-teal-400 border border-teal-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Upcoming ({upcomingList.length})</span>
          </button>
        </div>

        {/* Right Controls: Sort Dropdown & Schedule Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="followup-sort-select" className="text-slate-400 font-medium shrink-0 whitespace-nowrap flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
              <span>Sort by:</span>
            </label>
            <select
              id="followup-sort-select"
              value={currentSortOption}
              onChange={(e) => handleSortChange(e.target.value as FollowUpSortOption)}
              className="bg-slate-900/80 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-teal-500 cursor-pointer font-medium w-full sm:w-auto"
            >
              <option value="DATE_ASC">Follow-up Date (Earliest first)</option>
              <option value="DATE_DESC">Follow-up Date (Latest first)</option>
              <option value="CLASS_ONLINE_FIRST">Class Mode (Online first)</option>
              <option value="CLASS_OFFLINE_FIRST">Class Mode (Offline first)</option>
              <option value="NAME_ASC">Lead Name (A-Z)</option>
              <option value="NAME_DESC">Lead Name (Z-A)</option>
              <option value="SCORE_HOT_FIRST">Lead Score (Hot first)</option>
              <option value="STATUS">Status</option>
            </select>
          </div>

          <button
            onClick={onOpenAddLead}
            className="text-xs bg-teal-600 hover:bg-teal-500 text-white font-medium px-3.5 py-2 rounded-lg shadow-lg shadow-teal-950/30 cursor-pointer text-center shrink-0 whitespace-nowrap"
          >
            + Schedule New Lead
          </button>
        </div>
      </div>

      {/* Followup List Cards */}
      {displayedList.length === 0 ? (
        <div className="glass p-12 text-center rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-100">No Follow-ups in this Tab!</h3>
          <p className="text-xs text-slate-400 mt-1">All scheduled student calls for this filter are completed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((lead) => {
            const cat = getFollowUpCategory(lead.next_followup_date);
            const isOverdue = cat === 'overdue';
            const isToday = cat === 'due_today';
            const badgeStyle = getStatusBadgeClass(lead.status);

            const defaultWaText = `Namaste ${lead.name}! Greetings from Tech Lab Academy regarding your interest in ${lead.course_interest}. Is now a good time to speak?`;

            return (
              <div
                key={lead.id}
                className={`glass p-5 rounded-xl space-y-4 shadow-md transition-all flex flex-col justify-between ${
                  isOverdue
                    ? 'border-red-800/80 bg-red-950/10 hover:border-red-700'
                    : isToday
                    ? 'border-amber-800/80 bg-amber-950/10 hover:border-amber-700'
                    : 'hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Header: Name, Status & Followup Banner */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3
                        onClick={() => onSelectLead(lead)}
                        className="text-sm font-bold text-slate-100 hover:text-teal-400 transition-colors cursor-pointer"
                      >
                        {lead.name}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">+91 {lead.phone}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  {/* Scheduled Time Banner */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock
                        className={`w-4 h-4 ${
                          isOverdue ? 'text-red-400' : isToday ? 'text-amber-400' : 'text-teal-400'
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          isOverdue ? 'text-red-400' : isToday ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        {formatRelativeDate(lead.next_followup_date)}
                      </span>
                    </div>

                    {isOverdue && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-950 border border-red-800 px-1.5 py-0.5 rounded">
                        Overdue
                      </span>
                    )}
                  </div>

                  {/* Course & Batch info */}
                  <div className="mt-3 text-xs space-y-1">
                    <div className="text-slate-300">
                      <span className="text-slate-500 font-medium">Course:</span>{' '}
                      <strong className="text-slate-200">{lead.course_interest}</strong>
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500 font-medium">Batch:</span>{' '}
                      {lead.assigned_batch || 'Unassigned'}
                    </div>
                    {lead.notes_history && lead.notes_history.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80 italic line-clamp-2">
                        "{lead.notes_history[0].note_text}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Reschedule & Contact Bar */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  {/* Reschedule Buttons */}
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Quick Reschedule:
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onQuickReschedule(lead.id, 1)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded border border-slate-700 transition-all cursor-pointer"
                    >
                      +1 Day
                    </button>
                    <button
                      onClick={() => onQuickReschedule(lead.id, 2)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded border border-slate-700 transition-all cursor-pointer"
                    >
                      +2 Days
                    </button>
                    <button
                      onClick={() => onQuickReschedule(lead.id, 7)}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded border border-slate-700 transition-all cursor-pointer"
                    >
                      +1 Wk
                    </button>
                    <button
                      onClick={() => {
                        setRescheduleModalLead(lead);
                        setCustomDateTime(toDatetimeLocalValue(lead.next_followup_date));
                      }}
                      className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-teal-400 text-[10px] font-bold rounded border border-slate-700 transition-all cursor-pointer"
                    >
                      Custom
                    </button>
                  </div>

                  {/* Contact Action Bar */}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => onMarkContacted(lead.id)}
                      className="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done / Contacted</span>
                    </button>

                    <a
                      href={createTelLink(lead.phone)}
                      title="Call Now"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp?.(lead)}
                      title="Send WhatsApp Message"
                      className="p-1.5 bg-slate-800 hover:bg-teal-900 text-teal-400 rounded-lg border border-slate-700 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenEmail?.(lead)}
                      title="Send Email"
                      className="p-1.5 bg-slate-800 hover:bg-blue-900 text-blue-400 rounded-lg border border-slate-700 transition-all cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Reschedule Date-Time Picker Modal */}
      {rescheduleModalLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-100">
              Reschedule Follow-up for {rescheduleModalLead.name}
            </h3>

            <form onSubmit={handleCustomSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Select New Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2.5 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalLead(null)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-2 rounded-lg"
                >
                  Save Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
