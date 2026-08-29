import React, { useState, useMemo } from 'react';
import {
  Lead,
  LeadStatus,
  LeadFilterState,
  SortField,
  SortOrder,
  CRMSettings,
} from '../types';
import {
  Search,
  PhoneCall,
  MessageCircle,
  Mail,
  Clock,
  CheckSquare,
  Square,
  ArrowUpDown,
  Download,
  Users,
  Trash2,
  GraduationCap,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  UserMinus,
  UserX,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  formatRelativeDate,
  getStatusBadgeClass,
  getScoreBadgeClass,
  createTelLink,
  getFollowUpCategory,
} from '../lib/utils';

interface LeadListProps {
  leads: Lead[];
  settings: CRMSettings;
  onSelectLead: (lead: Lead) => void;
  onBulkChangeStatus: (selectedIds: string[], status: LeadStatus) => void;
  onBulkAssignBatch: (selectedIds: string[], batch: string) => void;
  onBulkDelete: (selectedIds: string[]) => void;
  onOpenBulkWhatsAppWithSelection: (selectedIds: string[]) => void;
  onExportSelectedCSV: (selectedLeads: Lead[]) => void;
  onOpenAddLead: () => void;
  initialStatusFilter?: string;
  isLostLeadsView?: boolean;
  isAdmissionsView?: boolean;
  isNotInterestedView?: boolean;
  isDeletedLeadsView?: boolean;
  onRestoreLead?: (leadId: string) => void;
  onPermanentDeleteLead?: (leadId: string) => void;
  onBulkRestore?: (selectedIds: string[]) => void;
  onBulkPermanentDelete?: (selectedIds: string[]) => void;
  onOpenGoogleSheetsModal?: () => void;
  onTriggerSheetSync?: () => void;
  isSheetSyncing?: boolean;
  sheetsConfigured?: boolean;
  onOpenWhatsApp?: (lead: Lead) => void;
  onOpenEmail?: (lead: Lead) => void;
}

export const LeadList: React.FC<LeadListProps> = ({
  leads,
  settings,
  onSelectLead,
  onBulkChangeStatus,
  onBulkAssignBatch,
  onBulkDelete,
  onOpenBulkWhatsAppWithSelection,
  onExportSelectedCSV,
  onOpenAddLead,
  initialStatusFilter = 'ALL',
  isLostLeadsView = false,
  isAdmissionsView = false,
  isNotInterestedView = false,
  isDeletedLeadsView = false,
  onRestoreLead,
  onPermanentDeleteLead,
  onBulkRestore,
  onBulkPermanentDelete,
  onOpenGoogleSheetsModal,
  onTriggerSheetSync,
  isSheetSyncing = false,
  sheetsConfigured = false,
  onOpenWhatsApp,
  onOpenEmail,
}) => {
  // Filter state
  const [filterState, setFilterState] = useState<LeadFilterState>({
    search: '',
    status: isNotInterestedView ? 'Not Interested' : initialStatusFilter,
    source: 'ALL',
    course: 'ALL',
    batch: 'ALL',
    dateRange: 'ALL',
    classMode: 'ALL',
  });

  // Sorting
  const [sortField, setSortField] = useState<SortField>(isDeletedLeadsView ? ('created_date' as any) : 'created_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk action dropdown states
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);
  const [showBulkBatchMenu, setShowBulkBatchMenu] = useState(false);

  // Show Lost leads in standard Directory when status is ALL
  const [showLostLeadsInAll, setShowLostLeadsInAll] = useState(false);

  // Show Enrolled leads in standard Directory when status is ALL
  const [showEnrolledLeads, setShowEnrolledLeads] = useState(false);

  // Show Not Interested leads in standard Directory when status is ALL
  const [showNotInterestedInAll, setShowNotInterestedInAll] = useState(false);

  // Permanent Delete Confirmation Modal State
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{
    lead?: Lead;
    ids?: string[];
  } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Filter & Sort Logic
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        // Deleted vs Non-deleted views
        if (isDeletedLeadsView) {
          if (!lead.is_deleted) return false;
        } else {
          if (lead.is_deleted) return false;
        }

        // Search
        if (filterState.search.trim()) {
          const query = filterState.search.toLowerCase();
          const nameMatch = lead.name.toLowerCase().includes(query);
          const phoneMatch = lead.phone.includes(query);
          const emailMatch = lead.email ? lead.email.toLowerCase().includes(query) : false;
          const tagsMatch = Array.isArray(lead.tags)
            ? lead.tags.some((t) => t.toLowerCase().includes(query))
            : false;
          if (!nameMatch && !phoneMatch && !emailMatch && !tagsMatch) {
            return false;
          }
        }

        // Status Filtering
        if (isDeletedLeadsView) {
          // Allow all or specific status filtering within deleted archive
          if (filterState.status !== 'ALL' && lead.status !== filterState.status) {
            return false;
          }
        } else if (isNotInterestedView) {
          if (lead.status !== 'Not Interested') {
            return false;
          }
        } else if (isLostLeadsView) {
          if (lead.status !== 'Lost') {
            return false;
          }
        } else if (isAdmissionsView) {
          if (lead.status !== 'Enrolled' && !lead.converted_to_student) {
            return false;
          }
        } else {
          const isEnrolled = lead.status === 'Enrolled' || lead.converted_to_student;
          const isLost = lead.status === 'Lost';
          const isNotInterested = lead.status === 'Not Interested';

          if (filterState.status !== 'ALL') {
            if (lead.status !== filterState.status) {
              return false;
            }
          } else {
            if (isLost && !showLostLeadsInAll) {
              return false;
            }
            if (isEnrolled && !showEnrolledLeads) {
              return false;
            }
            if (isNotInterested && !showNotInterestedInAll) {
              return false;
            }
          }
        }

        // Source
        if (filterState.source !== 'ALL' && lead.source !== filterState.source) {
          return false;
        }

        // Course
        if (filterState.course !== 'ALL' && lead.course_interest !== filterState.course) {
          return false;
        }

        // Batch
        if (filterState.batch !== 'ALL' && lead.assigned_batch !== filterState.batch) {
          return false;
        }

        // Class Mode
        if (filterState.classMode && filterState.classMode !== 'ALL') {
          const leadMode = lead.class_mode || 'Offline';
          if (leadMode !== filterState.classMode) {
            return false;
          }
        }

        // Date Range
        if (filterState.dateRange !== 'ALL') {
          const created = new Date(lead.created_date).getTime();
          const now = new Date();
          if (filterState.dateRange === 'TODAY') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            if (created < startOfToday) return false;
          } else if (filterState.dateRange === 'THIS_WEEK') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
            if (created < startOfWeek) return false;
          } else if (filterState.dateRange === 'THIS_MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            if (created < startOfMonth) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField] || '';
        let valB: any = b[sortField] || '';

        if (sortField === 'created_date' || sortField === 'next_followup_date' || (sortField as string) === 'deleted_date') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [leads, filterState, sortField, sortOrder, isDeletedLeadsView, isNotInterestedView, isLostLeadsView, isAdmissionsView, showLostLeadsInAll, showEnrolledLeads, showNotInterestedInAll]);

  // Select all handler
  const isAllSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((l) => selectedIds.includes(l.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSortChange = (field: SortField | 'deleted_date') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortOrder('desc');
    }
  };

  const selectedLeadsObjects = leads.filter((l) => selectedIds.includes(l.id));

  const handleConfirmPermanentDelete = () => {
    if (deleteConfirmInput !== 'DELETE' || !permanentDeleteTarget) return;

    if (permanentDeleteTarget.lead && onPermanentDeleteLead) {
      onPermanentDeleteLead(permanentDeleteTarget.lead.id);
    } else if (permanentDeleteTarget.ids && onBulkPermanentDelete) {
      onBulkPermanentDelete(permanentDeleteTarget.ids);
      setSelectedIds([]);
    }
    setPermanentDeleteTarget(null);
    setDeleteConfirmInput('');
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 max-w-7xl mx-auto">
      {/* Title & Filter Controls Bar */}
      <div className="glass p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Search & Google Sheets Actions */}
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterState.search}
              onChange={(e) => setFilterState({ ...filterState, search: e.target.value })}
              placeholder="Search student name, phone number, email, or #tags..."
              className="w-full bg-slate-900/80 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-teal-500"
            />
          </div>

          {!isDeletedLeadsView && onOpenGoogleSheetsModal && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onOpenGoogleSheetsModal}
                className="bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800/80 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Configure Google Sheets Auto-Sync & Column Mapping"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">Google Sheet</span>
                {sheetsConfigured && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              {onTriggerSheetSync && sheetsConfigured && (
                <button
                  onClick={onTriggerSheetSync}
                  disabled={isSheetSyncing}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 p-2 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                  title="Sync Now from Google Sheet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSheetSyncing ? 'animate-spin text-teal-400' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter / Status Badge */}
          {isDeletedLeadsView ? (
            <div className="bg-rose-950/50 border border-rose-800 text-rose-300 font-bold rounded-lg px-2.5 py-2 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Status: Deleted Leads Archive</span>
            </div>
          ) : isAdmissionsView ? (
            <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 font-bold rounded-lg px-2.5 py-2 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Status: Enrolled / Admissions Only</span>
            </div>
          ) : isNotInterestedView ? (
            <div className="bg-slate-800/90 border border-slate-700 text-slate-300 font-bold rounded-lg px-2.5 py-2 flex items-center gap-1.5">
              <UserMinus className="w-4 h-4 text-slate-400" />
              <span>Status: Not Interested Only</span>
            </div>
          ) : isLostLeadsView ? (
            <div className="bg-rose-950/40 border border-rose-900 text-rose-400 font-bold rounded-lg px-2.5 py-2 flex items-center gap-1">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>Status: Lost Only</span>
            </div>
          ) : (
            <>
              <select
                value={filterState.status}
                onChange={(e) => setFilterState({ ...filterState, status: e.target.value })}
                className="bg-slate-900/80 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Demo Scheduled">Demo Scheduled</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Lost">Lost</option>
              </select>

              {filterState.status === 'ALL' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 px-2 py-1.5 text-slate-400 select-none cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={showEnrolledLeads}
                      onChange={(e) => setShowEnrolledLeads(e.target.checked)}
                      className="accent-teal-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Show Enrolled</span>
                  </label>
                  <label className="flex items-center gap-1.5 px-2 py-1.5 text-slate-400 select-none cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={showNotInterestedInAll}
                      onChange={(e) => setShowNotInterestedInAll(e.target.checked)}
                      className="accent-teal-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Show Not Interested</span>
                  </label>
                  <label className="flex items-center gap-1.5 px-2 py-1.5 text-slate-400 select-none cursor-pointer hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={showLostLeadsInAll}
                      onChange={(e) => setShowLostLeadsInAll(e.target.checked)}
                      className="accent-teal-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Show Lost</span>
                  </label>
                </div>
              )}
            </>
          )}

          {/* Course Filter */}
          <select
            value={filterState.course}
            onChange={(e) => setFilterState({ ...filterState, course: e.target.value })}
            className="bg-slate-900/80 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Courses</option>
            {settings.courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={filterState.source}
            onChange={(e) => setFilterState({ ...filterState, source: e.target.value })}
            className="bg-slate-900/80 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Sources</option>
            {settings.sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={filterState.batch}
            onChange={(e) => setFilterState({ ...filterState, batch: e.target.value })}
            className="bg-slate-900/80 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Batches</option>
            {settings.batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select
            value={filterState.dateRange}
            onChange={(e) => setFilterState({ ...filterState, dateRange: e.target.value as any })}
            className="bg-slate-900/80 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Created Today</option>
            <option value="THIS_WEEK">Created This Week</option>
            <option value="THIS_MONTH">Created This Month</option>
          </select>

          {/* Class Mode Filter */}
          <select
            value={filterState.classMode || 'ALL'}
            onChange={(e) => setFilterState({ ...filterState, classMode: e.target.value })}
            className="bg-slate-900/80 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Class Modes</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>

          {/* Clear Filters Button */}
          {(filterState.status !== (isDeletedLeadsView ? 'ALL' : isNotInterestedView ? 'Not Interested' : isLostLeadsView ? 'Lost' : isAdmissionsView ? 'Enrolled' : 'ALL') ||
            filterState.source !== 'ALL' ||
            filterState.course !== 'ALL' ||
            filterState.batch !== 'ALL' ||
            filterState.dateRange !== 'ALL' ||
            (filterState.classMode && filterState.classMode !== 'ALL') ||
            filterState.search) && (
            <button
              onClick={() =>
                setFilterState({
                  search: '',
                  status: isDeletedLeadsView ? 'ALL' : isNotInterestedView ? 'Not Interested' : isLostLeadsView ? 'Lost' : isAdmissionsView ? 'Enrolled' : 'ALL',
                  source: 'ALL',
                  course: 'ALL',
                  batch: 'ALL',
                  dateRange: 'ALL',
                  classMode: 'ALL',
                })
              }
              className="text-xs text-rose-400 hover:text-rose-300 underline font-medium px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (Appears when items are checked) */}
      {selectedIds.length > 0 && (
        <div className="bg-teal-950/90 border border-teal-800 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 font-semibold text-teal-200">
            <span className="bg-teal-800 px-2 py-0.5 rounded text-white font-bold">
              {selectedIds.length}
            </span>
            <span>Leads Selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDeletedLeadsView ? (
              <>
                {/* Restore Selected */}
                <button
                  onClick={() => {
                    onBulkRestore?.(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="bg-teal-900 hover:bg-teal-800 text-teal-200 px-3 py-1.5 rounded-lg border border-teal-700 font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Selected ({selectedIds.length})</span>
                </button>

                {/* Export Selected CSV */}
                <button
                  onClick={() => onExportSelectedCSV(selectedLeadsObjects)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Selected CSV</span>
                </button>

                {/* Bulk Permanent Delete */}
                <button
                  onClick={() => {
                    setPermanentDeleteTarget({ ids: selectedIds });
                    setDeleteConfirmInput('');
                  }}
                  className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-800 font-medium transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </>
            ) : (
              <>
                {/* Bulk Status Change */}
                <div className="relative">
                  <button
                    onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition-all cursor-pointer"
                  >
                    Change Status ▾
                  </button>
                  {showBulkStatusMenu && (
                    <div className="absolute top-full mt-1 left-0 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-30 py-1 divide-y divide-slate-800">
                      {(
                        [
                          'New',
                          'Contacted',
                          'Interested',
                          'Follow-up',
                          'Demo Scheduled',
                          'Enrolled',
                          'Not Interested',
                          'Lost',
                        ] as LeadStatus[]
                      ).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            onBulkChangeStatus(selectedIds, st);
                            setShowBulkStatusMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-teal-400 text-xs font-medium cursor-pointer"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk Batch Assign */}
                <div className="relative">
                  <button
                    onClick={() => setShowBulkBatchMenu(!showBulkBatchMenu)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition-all cursor-pointer"
                  >
                    Assign Batch ▾
                  </button>
                  {showBulkBatchMenu && (
                    <div className="absolute top-full mt-1 left-0 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-30 py-1">
                      {settings.batches.map((bt) => (
                        <button
                          key={bt}
                          onClick={() => {
                            onBulkAssignBatch(selectedIds, bt);
                            setShowBulkBatchMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-teal-400 text-xs font-medium truncate cursor-pointer"
                        >
                          {bt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk WhatsApp */}
                <button
                  onClick={() => onOpenBulkWhatsAppWithSelection(selectedIds)}
                  className="bg-teal-900 hover:bg-teal-800 text-teal-200 px-3 py-1.5 rounded-lg border border-teal-700 font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Bulk WhatsApp</span>
                </button>

                {/* Export Selected as CSV */}
                <button
                  onClick={() => onExportSelectedCSV(selectedLeadsObjects)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Selected CSV</span>
                </button>

                {/* Bulk Delete (Soft Delete) */}
                <button
                  onClick={() => {
                    const selectedLeadsObjects = leads.filter((l) => selectedIds.includes(l.id));
                    const containsConverted = selectedLeadsObjects.some((l) => l.converted_to_student);
                    if (containsConverted) {
                      if (window.confirm("One or more selected leads have already been converted to an admitted student. Deleting these leads will NOT delete the student's admission record, fee history, or certificate — that data is stored separately and will remain safe. Do you still want to delete these lead records?")) {
                        onBulkDelete(selectedIds);
                        setSelectedIds([]);
                      }
                    } else {
                      if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected leads?`)) {
                        onBulkDelete(selectedIds);
                        setSelectedIds([]);
                      }
                    }
                  }}
                  className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-800 font-medium transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Stacked Card View */}
      <div className="space-y-3 md:hidden">
        {filteredLeads.length === 0 ? (
          <div className="glass p-8 text-center rounded-xl text-slate-500">
            {isDeletedLeadsView ? (
              <>
                <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-300">No deleted leads</p>
                <p className="text-xs text-slate-500 mt-1">
                  Deleted leads will appear here and can be restored.
                </p>
              </>
            ) : isNotInterestedView ? (
              <>
                <UserMinus className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-300">No leads marked as 'Not Interested' found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Student leads marked as Not Interested will be kept here.
                </p>
                <button
                  onClick={onOpenAddLead}
                  className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                >
                  + Add First Lead
                </button>
              </>
            ) : isAdmissionsView ? (
              <>
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                <p className="font-semibold text-slate-300">No enrolled student admissions found</p>
                <button
                  onClick={onOpenAddLead}
                  className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                >
                  + Add First Lead
                </button>
              </>
            ) : isLostLeadsView ? (
              <>
                <UserX className="w-8 h-8 mx-auto mb-2 text-rose-600" />
                <p className="font-semibold text-slate-300">No lost leads found</p>
                <button
                  onClick={onOpenAddLead}
                  className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                >
                  + Add First Lead
                </button>
              </>
            ) : (
              <>
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-300">No leads match your filter or query</p>
                <button
                  onClick={onOpenAddLead}
                  className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                >
                  + Add First Lead
                </button>
              </>
            )}
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isChecked = selectedIds.includes(lead.id);
            const badgeStyle = getStatusBadgeClass(lead.status);
            const cat = getFollowUpCategory(lead.next_followup_date);
            const scoreBadge = getScoreBadgeClass(lead.lead_score);

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`glass p-4 rounded-xl space-y-3 cursor-pointer transition-all border ${
                  isChecked ? 'border-teal-500/50 bg-teal-950/20' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header: Select + Name + Badges */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={(e) => handleToggleSelectOne(lead.id, e)}
                      className="text-slate-400 hover:text-teal-400 p-0.5 shrink-0"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-teal-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm hover:text-teal-400 transition-colors truncate">
                          {lead.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${scoreBadge.bg} ${scoreBadge.text} ${scoreBadge.border}`}
                        >
                          {lead.lead_score}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">+91 {lead.phone}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                  >
                    {lead.status}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block text-[10px] uppercase">Course:</span>
                    <span className="text-slate-200 font-medium truncate block">{lead.course_interest}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block text-[10px] uppercase">Class Mode:</span>
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                        (lead.class_mode || 'Offline') === 'Online'
                          ? 'bg-blue-950/80 text-blue-400 border-blue-900'
                          : 'bg-amber-950/60 text-amber-500 border-amber-900/60'
                      }`}
                    >
                      {lead.class_mode || 'Offline'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block text-[10px] uppercase">Source:</span>
                    <span className="text-slate-400 font-medium truncate block">{lead.source}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block text-[10px] uppercase">Batch:</span>
                    <span className="text-slate-400 font-medium truncate block">{lead.assigned_batch || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Deleted Date or Next Follow-up banner */}
                {isDeletedLeadsView ? (
                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/50 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-slate-400 text-[11px]">Deleted:</span>
                      <span className="font-semibold text-rose-300">
                        {lead.deleted_date ? formatRelativeDate(lead.deleted_date) : 'Recently'}
                      </span>
                    </div>
                  </div>
                ) : lead.next_followup_date ? (
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock
                        className={`w-3.5 h-3.5 ${
                          cat === 'overdue' ? 'text-red-400' : cat === 'due_today' ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      />
                      <span className="text-slate-400 text-[11px]">Follow-up:</span>
                      <span
                        className={`font-semibold ${
                          cat === 'overdue' ? 'text-red-400' : cat === 'due_today' ? 'text-amber-300' : 'text-slate-300'
                        }`}
                      >
                        {formatRelativeDate(lead.next_followup_date)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Card Quick Actions */}
                <div className="flex items-center justify-between gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                  {isDeletedLeadsView ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onRestoreLead?.(lead.id)}
                        className="flex-1 py-2 bg-teal-950/80 hover:bg-teal-900 text-teal-300 text-xs font-semibold rounded-lg border border-teal-800/80 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPermanentDeleteTarget({ lead });
                          setDeleteConfirmInput('');
                        }}
                        className="flex-1 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold rounded-lg border border-rose-800/80 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>

                      <button
                        onClick={() => onSelectLead(lead)}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
                      >
                        Details
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href={createTelLink(lead.phone)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1 transition-all"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                        <span>Call</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp?.(lead)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-teal-900 text-teal-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Send WhatsApp Message"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-teal-400" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenEmail?.(lead)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-blue-900 text-blue-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Send Email"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>Email</span>
                      </button>

                      <button
                        onClick={() => onSelectLead(lead)}
                        className="px-2.5 py-2 bg-teal-950/80 hover:bg-teal-900 text-teal-400 text-xs font-semibold rounded-lg border border-teal-800/80 transition-all cursor-pointer"
                      >
                        Details
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main High-Density Table (Desktop) */}
      <div className="glass rounded-xl overflow-hidden shadow-xl hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/50 sticky top-0">
              <tr className="text-[11px] text-slate-500 uppercase tracking-widest border-b border-slate-800 select-none">
                <th className="py-3.5 px-4 w-10">
                  <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSortChange('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1 font-semibold">
                    <span>Student Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                <th className="py-3.5 px-4 font-semibold">Source</th>
                <th className="py-3.5 px-4 font-semibold">Course Interest</th>
                <th
                  onClick={() => handleSortChange('status')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1 font-semibold">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                {isDeletedLeadsView ? (
                  <th
                    onClick={() => handleSortChange('deleted_date')}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <span>Deleted Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                ) : (
                  <th
                    onClick={() => handleSortChange('next_followup_date')}
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-200"
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <span>Next Follow-up</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </th>
                )}
                <th className="py-3.5 px-4 font-semibold">Assigned Batch</th>
                <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    {isDeletedLeadsView ? (
                      <>
                        <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-slate-300">No deleted leads</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Deleted leads will appear here and can be restored.
                        </p>
                      </>
                    ) : isNotInterestedView ? (
                      <>
                        <UserMinus className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-slate-300">No leads marked as 'Not Interested' found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Student leads marked as Not Interested will be kept here.
                        </p>
                        <button
                          onClick={onOpenAddLead}
                          className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                        >
                          + Add First Lead
                        </button>
                      </>
                    ) : isAdmissionsView ? (
                      <>
                        <GraduationCap className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                        <p className="font-semibold text-slate-300">No enrolled student admissions found</p>
                        <button
                          onClick={onOpenAddLead}
                          className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                        >
                          + Add First Lead
                        </button>
                      </>
                    ) : isLostLeadsView ? (
                      <>
                        <UserX className="w-8 h-8 mx-auto mb-2 text-rose-600" />
                        <p className="font-semibold text-slate-300">No lost leads found</p>
                        <button
                          onClick={onOpenAddLead}
                          className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                        >
                          + Add First Lead
                        </button>
                      </>
                    ) : (
                      <>
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-slate-300">No leads match your filter or query</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Try clearing filters or add a new lead to get started.
                        </p>
                        <button
                          onClick={onOpenAddLead}
                          className="mt-3 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-block cursor-pointer"
                        >
                          + Add First Lead
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isChecked = selectedIds.includes(lead.id);
                  const badgeStyle = getStatusBadgeClass(lead.status);
                  const cat = getFollowUpCategory(lead.next_followup_date);
                  const scoreBadge = getScoreBadgeClass(lead.lead_score);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className={`hover:bg-slate-800/30 transition-colors cursor-pointer group ${
                        isChecked ? 'bg-teal-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4" onClick={(e) => handleToggleSelectOne(lead.id, e)}>
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-teal-400 cursor-pointer" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400 cursor-pointer" />
                        )}
                      </td>

                      {/* Name & Lead Score */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-100 group-hover:text-teal-400 transition-colors">
                            {lead.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${scoreBadge.bg} ${scoreBadge.text} ${scoreBadge.border}`}
                          >
                            {lead.lead_score}
                          </span>
                        </div>
                        {lead.email && <div className="text-[10px] text-slate-500">{lead.email}</div>}
                        {Array.isArray(lead.tags) && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700/60"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 font-mono text-slate-300 font-medium">
                        +91 {lead.phone}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 text-slate-400 font-medium">{lead.source}</td>

                      {/* Course Interest */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-200 font-medium">{lead.course_interest}</span>
                          <div>
                            <span
                              className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                                (lead.class_mode || 'Offline') === 'Online'
                                  ? 'bg-blue-950/80 text-blue-400 border-blue-900'
                                  : 'bg-amber-950/60 text-amber-500 border-amber-900/60'
                              }`}
                            >
                              {lead.class_mode || 'Offline'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Next Followup OR Deleted Date */}
                      {isDeletedLeadsView ? (
                        <td className="py-3 px-4">
                          {lead.deleted_date ? (
                            <div className="flex items-center gap-1.5 font-medium text-rose-300">
                              <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>{formatRelativeDate(lead.deleted_date)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Recently</span>
                          )}
                        </td>
                      ) : (
                        <td className="py-3 px-4">
                          {lead.next_followup_date ? (
                            <div>
                              <div className="flex items-center gap-1 font-medium">
                                <Clock
                                  className={`w-3 h-3 ${
                                    cat === 'overdue'
                                      ? 'text-red-400'
                                      : cat === 'due_today'
                                      ? 'text-amber-400'
                                      : 'text-slate-500'
                                  }`}
                                />
                                <span
                                  className={
                                    cat === 'overdue'
                                      ? 'text-red-400 font-bold'
                                      : cat === 'due_today'
                                      ? 'text-amber-300 font-semibold'
                                      : 'text-slate-400'
                                  }
                                >
                                  {formatRelativeDate(lead.next_followup_date)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">Not Scheduled</span>
                          )}
                        </td>
                      )}

                      {/* Batch */}
                      <td className="py-3 px-4 text-slate-400">{lead.assigned_batch || 'Unassigned'}</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isDeletedLeadsView ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onRestoreLead?.(lead.id)}
                              className="bg-teal-950/80 hover:bg-teal-900 text-teal-300 px-2.5 py-1.5 rounded-lg border border-teal-800/80 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                              title="Restore Lead"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPermanentDeleteTarget({ lead });
                                setDeleteConfirmInput('');
                              }}
                              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-2.5 py-1.5 rounded-lg border border-rose-800/80 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Permanently</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Call Button */}
                            <a
                              href={createTelLink(lead.phone)}
                              title="Call Now"
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded border border-slate-700 transition-all inline-flex"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>

                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() => onOpenWhatsApp?.(lead)}
                              title="Send WhatsApp Message"
                              className="bg-slate-800 hover:bg-teal-900 text-teal-400 p-1.5 rounded border border-slate-700 transition-all inline-flex cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Email Button */}
                            <button
                              type="button"
                              onClick={() => onOpenEmail?.(lead)}
                              title="Send Email"
                              className="bg-slate-800 hover:bg-blue-900 text-blue-400 p-1.5 rounded border border-slate-700 transition-all inline-flex cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Showing <strong>{filteredLeads.length}</strong> of <strong>{leads.length}</strong> {isDeletedLeadsView ? 'deleted' : 'total'} leads
          </span>
          <span className="text-[11px] text-slate-500">Click any row to open full Lead Detail editor & notes</span>
        </div>
      </div>

      {/* Strong "Danger Zone" Permanent Delete Confirmation Modal */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
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
                  This will permanently and irreversibly delete this lead and all its history. This cannot be undone. Are you absolutely sure?
                </p>
                {permanentDeleteTarget.lead && (
                  <div className="mt-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                    <span className="text-slate-400">Target Lead:</span>{' '}
                    <strong className="text-slate-200">{permanentDeleteTarget.lead.name}</strong>{' '}
                    <span className="text-slate-500">(+91 {permanentDeleteTarget.lead.phone})</span>
                  </div>
                )}
                {permanentDeleteTarget.ids && (
                  <div className="mt-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                    <span className="text-slate-400">Target Count:</span>{' '}
                    <strong className="text-rose-400">{permanentDeleteTarget.ids.length} selected leads</strong>
                  </div>
                )}
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
                  setPermanentDeleteTarget(null);
                  setDeleteConfirmInput('');
                }}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput !== 'DELETE'}
                onClick={handleConfirmPermanentDelete}
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
    </div>
  );
};
