import React, { useEffect, useRef } from 'react';
import { Lead } from '../types';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Check,
  X,
  Sparkles,
  CalendarClock,
} from 'lucide-react';
import { getFollowUpCategory } from '../lib/utils';

interface NotificationDropdownProps {
  leads: Lead[];
  isOpen: boolean;
  onClose: () => void;
  onSelectLead: (lead: Lead) => void;
  onMarkDone: (leadId: string) => void;
  onNavigateToFollowups?: () => void;
}

function getFollowUpContext(isoString?: string, courseInterest?: string): string {
  if (!isoString) return courseInterest || 'Follow-up pending';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return courseInterest || 'Follow-up pending';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 3600 * 24));
  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  let timeDesc = '';
  if (diffDays === 0) {
    timeDesc = `Follow-up due today (${timeStr})`;
  } else if (diffDays === 1) {
    timeDesc = `Follow-up was due yesterday`;
  } else if (diffDays > 1) {
    timeDesc = `Follow-up was due ${diffDays} days ago`;
  } else if (diffDays < 0) {
    timeDesc = `Scheduled for ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  } else {
    timeDesc = `Due on ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }

  return courseInterest ? `${timeDesc} • ${courseInterest}` : timeDesc;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  leads,
  isOpen,
  onClose,
  onSelectLead,
  onMarkDone,
  onNavigateToFollowups,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Group leads (exclude soft-deleted)
  const activeLeads = leads.filter((l) => !l.is_deleted);

  const overdueLeads = activeLeads
    .filter((l) => getFollowUpCategory(l.next_followup_date) === 'overdue')
    .sort((a, b) => new Date(a.next_followup_date || 0).getTime() - new Date(b.next_followup_date || 0).getTime());

  const dueTodayLeads = activeLeads
    .filter((l) => getFollowUpCategory(l.next_followup_date) === 'due_today')
    .sort((a, b) => new Date(a.next_followup_date || 0).getTime() - new Date(b.next_followup_date || 0).getTime());

  const totalPending = overdueLeads.length + dueTodayLeads.length;

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      id="notification-action-center"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-slate-900/98 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-950 border border-teal-700/80 flex items-center justify-center text-teal-300 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
              <span>Action Center</span>
              {totalPending > 0 && (
                <span className="bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] shadow-sm">
                  {totalPending}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">Pending reminders & follow-ups</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close notifications"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Body */}
      <div className="max-h-[65vh] sm:max-h-96 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
        {totalPending === 0 ? (
          /* Empty State */
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-emerald-950/70 border border-emerald-700/80 flex items-center justify-center text-emerald-300 mb-1 shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-white text-sm">You're all caught up!</p>
            <p className="text-xs text-slate-300 max-w-[240px] leading-relaxed">
              No pending follow-ups or overdue actions.
            </p>
          </div>
        ) : (
          <div className="p-2.5 space-y-3.5">
            {/* Section A: Overdue Follow-ups */}
            {overdueLeads.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Overdue Follow-ups ({overdueLeads.length})</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {overdueLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-2.5 bg-rose-950/30 hover:bg-rose-950/45 border border-rose-800/60 rounded-xl transition-all flex items-center justify-between gap-2.5 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white truncate text-xs">
                            {lead.name}
                          </span>
                          {lead.assigned_batch && (
                            <span className="text-[10px] text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-medium truncate max-w-[100px]">
                              {lead.assigned_batch}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-rose-200 truncate mt-0.5 font-medium">
                          {getFollowUpContext(lead.next_followup_date, lead.course_interest)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* View Button */}
                        <button
                          onClick={() => {
                            onSelectLead(lead);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                          title="View lead details"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3 text-slate-300" />
                        </button>

                        {/* Done Button */}
                        <button
                          onClick={() => onMarkDone(lead.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                          title="Mark follow-up done"
                        >
                          <Check className="w-3 h-3" />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section B: Follow-ups Due Today */}
            {dueTodayLeads.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Follow-ups Due Today ({dueTodayLeads.length})</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {dueTodayLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-2.5 bg-amber-950/30 hover:bg-amber-950/45 border border-amber-800/60 rounded-xl transition-all flex items-center justify-between gap-2.5 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white truncate text-xs">
                            {lead.name}
                          </span>
                          {lead.assigned_batch && (
                            <span className="text-[10px] text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-medium truncate max-w-[100px]">
                              {lead.assigned_batch}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-200 truncate mt-0.5 font-medium">
                          {getFollowUpContext(lead.next_followup_date, lead.course_interest)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* View Button */}
                        <button
                          onClick={() => {
                            onSelectLead(lead);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                          title="View lead details"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3 text-slate-300" />
                        </button>

                        {/* Done Button */}
                        <button
                          onClick={() => onMarkDone(lead.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                          title="Mark follow-up done"
                        >
                          <Check className="w-3 h-3" />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      {totalPending > 0 && onNavigateToFollowups && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-200 font-medium">
            {totalPending} active reminder{totalPending > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              onNavigateToFollowups();
              onClose();
            }}
            className="text-teal-300 hover:text-teal-200 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Open Follow-ups View →</span>
          </button>
        </div>
      )}
    </div>
  );
};
