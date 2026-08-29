import React from 'react';
import { Lead, LeadStatus } from '../types';
import {
  Users,
  UserPlus,
  CalendarCheck2,
  GraduationCap,
  TrendingUp,
  PhoneCall,
  MessageCircle,
  Mail,
  Clock,
  ArrowRight,
  CheckCircle2,
  Award,
} from 'lucide-react';
import {
  formatRelativeDate,
  getFollowUpCategory,
  createTelLink,
  getStatusBadgeClass,
} from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DashboardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateToLeads: (filterStatus?: string) => void;
  onNavigateToAdmissions?: () => void;
  onNavigateToFollowups: () => void;
  onOpenAddLead: () => void;
  onOpenWhatsApp?: (lead: Lead) => void;
  onOpenEmail?: (lead: Lead) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  leads,
  onSelectLead,
  onNavigateToLeads,
  onNavigateToAdmissions,
  onNavigateToFollowups,
  onOpenAddLead,
  onOpenWhatsApp,
  onOpenEmail,
}) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. KPI Calculations
  const totalLeads = leads.length;

  const newLeadsToday = leads.filter((l) => {
    const created = new Date(l.created_date);
    return created >= startOfToday;
  }).length;

  const totalAdmissions = leads.filter(
    (l) => l.status === 'Enrolled' || l.converted_to_student
  ).length;

  const enrolledThisMonth = leads.filter((l) => {
    if (l.status !== 'Enrolled' && !l.converted_to_student) return false;
    const dateStr = l.enrolled_date || l.last_contacted_date || l.created_date;
    if (!dateStr) return false;
    const enrollDate = new Date(dateStr);
    return (
      enrollDate.getFullYear() === now.getFullYear() &&
      enrollDate.getMonth() === now.getMonth()
    );
  }).length;

  const conversionRate = totalLeads > 0
    ? ((totalAdmissions / totalLeads) * 100).toFixed(1)
    : '0.0';

  // 2. Follow-ups Due Today or Overdue (Sorted by time ascending)
  const followupsDueList = leads
    .filter((l) => {
      if (!l.next_followup_date) return false;
      if (l.status === 'Enrolled' || l.status === 'Lost' || l.status === 'Not Interested') return false;
      const cat = getFollowUpCategory(l.next_followup_date);
      return cat === 'overdue' || cat === 'due_today';
    })
    .sort((a, b) => {
      const dateA = new Date(a.next_followup_date || 0).getTime();
      const dateB = new Date(b.next_followup_date || 0).getTime();
      return dateA - dateB;
    });

  const dueTodayCount = leads.filter((l) => getFollowUpCategory(l.next_followup_date) === 'due_today').length;
  const overdueCount = leads.filter((l) => getFollowUpCategory(l.next_followup_date) === 'overdue').length;

  // 3. Pipeline Funnel Data (By Status)
  const pipelineOrder: LeadStatus[] = [
    'New',
    'Contacted',
    'Interested',
    'Follow-up',
    'Demo Scheduled',
    'Enrolled',
    'Not Interested',
    'Lost',
  ];

  const statusColors: Record<LeadStatus, string> = {
    New: '#38bdf8',
    Contacted: '#0284c7',
    Interested: '#c084fc',
    'Follow-up': '#f59e0b',
    'Demo Scheduled': '#2dd4bf',
    Enrolled: '#4ade80',
    'Not Interested': '#64748b',
    Lost: '#f43f5e',
  };

  const statusChartData = pipelineOrder.map((status) => {
    const count = leads.filter((l) => l.status === status).length;
    return {
      status,
      count,
      fill: statusColors[status] || '#64748b',
    };
  });

  // 4. Leads by Source Data
  const sourceCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const src = l.source || 'Other';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const sourceChartData = Object.keys(sourceCounts).map((source) => ({
    source,
    count: sourceCounts[source],
  }));

  const SOURCE_BAR_COLORS = ['#2dd4bf', '#38bdf8', '#a855f7', '#f43f5e', '#f59e0b', '#10b981', '#64748b'];

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Info */}
      <div className="glass p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Tech Lab Academy Overview</span>
            <span className="text-[10px] sm:text-xs font-normal text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60 uppercase tracking-wider font-semibold">
              Live Dashboard
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline analysis, pending student follow-ups, and conversion metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => onNavigateToLeads()}
            className="flex-1 sm:flex-none text-xs font-semibold text-teal-400 bg-teal-950/80 hover:bg-teal-900 border border-teal-800/80 px-3 sm:px-3.5 py-2 rounded-lg transition-all cursor-pointer text-center"
          >
            View Leads ({totalLeads})
          </button>
          <button
            onClick={onOpenAddLead}
            className="flex-1 sm:flex-none text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 px-3 sm:px-3.5 py-2 rounded-lg shadow-lg shadow-teal-950/30 transition-all cursor-pointer text-center"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Leads */}
        <div
          onClick={() => onNavigateToLeads()}
          className="glass p-4 rounded-xl flex flex-col justify-between hover:border-slate-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-bold text-slate-100">{totalLeads}</span>
            <span className="text-teal-400 text-xs pb-1 font-semibold">All Time</span>
          </div>
        </div>

        {/* Card 2: New Leads Today */}
        <div
          onClick={() => onNavigateToLeads('New')}
          className="glass p-4 rounded-xl flex flex-col justify-between hover:border-slate-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Today</span>
            <UserPlus className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-bold text-sky-400">{newLeadsToday}</span>
            <span className="text-sky-400 text-xs pb-1 font-semibold">Fresh</span>
          </div>
        </div>

        {/* Card 3: Follow-ups Due Today & Overdue */}
        <div
          onClick={onNavigateToFollowups}
          className={`glass p-4 rounded-xl flex flex-col justify-between transition-all cursor-pointer group ${
            overdueCount > 0
              ? 'border-amber-500/30 shadow-[inset_0_0_15px_rgba(245,158,11,0.05)]'
              : 'hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Due / Overdue</span>
            <CalendarCheck2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-bold text-amber-400">{dueTodayCount + overdueCount}</span>
            {overdueCount > 0 ? (
              <span className="text-rose-400 text-xs pb-1 font-bold">
                {overdueCount} Overdue
              </span>
            ) : (
              <span className="text-amber-400 text-xs pb-1 font-semibold">Action Due</span>
            )}
          </div>
        </div>

        {/* Card 4: Total Admissions */}
        <div
          onClick={() => onNavigateToAdmissions ? onNavigateToAdmissions() : onNavigateToLeads('Enrolled')}
          className="glass p-4 rounded-xl flex flex-col justify-between hover:border-slate-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Admissions</span>
            <GraduationCap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-bold text-emerald-400">{totalAdmissions}</span>
            <span className="text-emerald-400 text-xs pb-1 font-semibold">
              +{enrolledThisMonth} this mo.
            </span>
          </div>
        </div>

        {/* Card 5: Admissions This Month */}
        <div
          onClick={() => onNavigateToAdmissions ? onNavigateToAdmissions() : onNavigateToLeads('Enrolled')}
          className="glass p-4 rounded-xl flex flex-col justify-between hover:border-slate-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admissions (Month)</span>
            <Award className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-bold text-teal-400">{enrolledThisMonth}</span>
            <span className="text-teal-400 text-xs pb-1 font-semibold">Current Month</span>
          </div>
        </div>

        {/* Card 6: Conversion Rate */}
        <div className="glass p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-end justify-between mt-3">
            <span className="text-3xl font-bold text-purple-400">{conversionRate}%</span>
            <span className="text-slate-500 text-xs pb-1 font-semibold">Overall</span>
          </div>
        </div>
      </div>

      {/* PROMINENT SECTION: Follow-ups Due Today or Overdue */}
      <div className="glass rounded-xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>High Priority Follow-ups</span>
                <span className="text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold uppercase">
                  {followupsDueList.length} Action Required
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Students expecting a call or WhatsApp message regarding batch updates or course demos.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToFollowups}
            className="text-xs font-semibold text-teal-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>View All Follow-ups</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {followupsDueList.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40">
            <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-200">No Pending Follow-ups Due Today</h4>
            <p className="text-xs text-slate-500 mt-1">
              All scheduled student calls for today are cleared.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/50">
                <tr className="text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="px-5 py-3 font-semibold">Lead Name</th>
                  <th className="px-5 py-3 font-semibold">Course Interest</th>
                  <th className="px-5 py-3 font-semibold">Follow-up Time</th>
                  <th className="px-5 py-3 font-semibold text-center">Score</th>
                  <th className="px-5 py-3 font-semibold text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-800/80">
                {followupsDueList.map((lead) => {
                  const cat = getFollowUpCategory(lead.next_followup_date);
                  const isOverdue = cat === 'overdue';

                  const defaultWaText = `Namaste ${lead.name}! Greetings from Tech Lab Academy regarding your interest in ${lead.course_interest}. Is now a good time to speak?`;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      onClick={() => onSelectLead(lead)}
                    >
                      {/* Name & Phone */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-100 group-hover:text-teal-400 transition-colors">
                          {lead.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          +91 {lead.phone}
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-5 py-4">
                        <span className="text-slate-300">{lead.course_interest}</span>
                      </td>

                      {/* Followup time */}
                      <td className={`px-5 py-4 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatRelativeDate(lead.next_followup_date)}</span>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={
                            lead.lead_score === 'Hot'
                              ? 'text-red-400 font-bold'
                              : lead.lead_score === 'Warm'
                              ? 'text-amber-400 font-bold'
                              : 'text-slate-500 font-medium'
                          }
                        >
                          {(lead.lead_score || 'Cold').toUpperCase()}
                        </span>
                      </td>

                      {/* Quick Contact Buttons */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Call Button */}
                          <a
                            href={createTelLink(lead.phone)}
                            title="Call Now"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded border border-slate-700 transition-all inline-flex"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>

                          {/* WhatsApp Button */}
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp?.(lead)}
                            title="Send WhatsApp Message"
                            className="bg-slate-800 hover:bg-teal-900 text-teal-400 p-2 rounded border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          {/* Email Button */}
                          <button
                            type="button"
                            onClick={() => onOpenEmail?.(lead)}
                            title="Send Email"
                            className="bg-slate-800 hover:bg-blue-900 text-blue-400 p-2 rounded border border-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bar Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Pipeline Funnel (Status) */}
        <div className="glass p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Pipeline Funnel
              </h3>
              <p className="text-xs text-slate-500">Distribution across lead stages</p>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              Pipeline
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="status"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#2dd4bf' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Leads by Source */}
        <div className="glass p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Lead Sources
              </h3>
              <p className="text-xs text-slate-500">Inbound channel performance & acquisition</p>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              Sources
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="source"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {sourceChartData.map((entry, index) => (
                    <Cell
                      key={`source-cell-${index}`}
                      fill={SOURCE_BAR_COLORS[index % SOURCE_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
