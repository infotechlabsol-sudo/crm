import React, { useState } from 'react';
import {
  Search,
  Plus,
  MessageSquare,
  Download,
  Bell,
  RefreshCw,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { Lead } from '../types';
import { NotificationDropdown } from './NotificationDropdown';
import { playNotificationChime } from '../lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onOpenAddLead: () => void;
  onOpenBulkWhatsApp: () => void;
  onExportCSV: () => void;
  overdueCount: number;
  dueTodayCount: number;
  onRefresh: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenMobileSidebar?: () => void;
  leads?: Lead[];
  onSelectLead?: (lead: Lead) => void;
  onMarkFollowUpDone?: (leadId: string) => void;
  onNavigateToFollowups?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  globalSearch,
  onGlobalSearchChange,
  onOpenAddLead,
  onOpenBulkWhatsApp,
  onExportCSV,
  overdueCount,
  dueTodayCount,
  onRefresh,
  theme = 'dark',
  onToggleTheme,
  onOpenMobileSidebar,
  leads = [],
  onSelectLead,
  onMarkFollowUpDone,
  onNavigateToFollowups,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const totalPendingNotifications = overdueCount + dueTodayCount;

  const handleToggleNotifications = () => {
    const nextState = !isNotificationOpen;
    if (nextState) {
      playNotificationChime();
    }
    setIsNotificationOpen(nextState);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 gap-2">
      {/* Title & Mobile Hamburger */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden shrink-0 cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5 truncate">
            <span className="truncate">{title}</span>
            {overdueCount > 0 && (
              <span className="text-[10px] sm:text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Bell className="w-3 h-3 animate-bounce" />
                <span>{overdueCount}</span>
                <span className="hidden sm:inline">Overdue</span>
              </span>
            )}
          </h1>
          {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 font-normal truncate hidden xs:block">{subtitle}</p>}
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="w-80 relative hidden md:block">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={globalSearch}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          placeholder="Search leads by name or phone..."
          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all"
        />
        {globalSearch && (
          <button
            onClick={() => onGlobalSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
          >
            ×
          </button>
        )}
      </div>

      {/* Right Quick Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>
        )}

        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notification Bell with Action Center Dropdown */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={handleToggleNotifications}
            title={
              totalPendingNotifications > 0
                ? `${totalPendingNotifications} pending reminder${totalPendingNotifications > 1 ? 's' : ''}`
                : 'Action Center & Notifications'
            }
            className={`p-1.5 sm:p-2 rounded-lg transition-all border relative cursor-pointer ${
              isNotificationOpen
                ? 'bg-teal-950/80 text-teal-400 border-teal-800 shadow-md shadow-teal-950/40'
                : totalPendingNotifications > 0
                ? 'text-slate-200 hover:text-white hover:bg-slate-800 border-slate-700/80 bg-slate-850'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent hover:border-slate-700'
            }`}
          >
            <Bell className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-400 animate-pulse' : ''}`} />
            {totalPendingNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white font-bold text-[10px] leading-tight rounded-full flex items-center justify-center shadow-lg shadow-rose-950/50 border border-slate-900 animate-in fade-in zoom-in-75 duration-150">
                {totalPendingNotifications > 99 ? '99+' : totalPendingNotifications}
              </span>
            )}
          </button>

          {/* Anchored Dropdown Panel */}
          <NotificationDropdown
            leads={leads}
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            onSelectLead={(lead) => {
              onSelectLead?.(lead);
              setIsNotificationOpen(false);
            }}
            onMarkDone={(leadId) => {
              onMarkFollowUpDone?.(leadId);
            }}
            onNavigateToFollowups={() => {
              onNavigateToFollowups?.();
              setIsNotificationOpen(false);
            }}
          />
        </div>

        <button
          onClick={onExportCSV}
          title="Export All Leads as CSV"
          className="hidden lg:flex items-center gap-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={onOpenBulkWhatsApp}
          title="Bulk WhatsApp Tool"
          className="flex items-center gap-1.5 bg-teal-950/60 hover:bg-teal-900/80 text-teal-400 text-xs font-medium px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-teal-800/60 transition-all cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Bulk WhatsApp</span>
        </button>

        <button
          onClick={onOpenAddLead}
          className="bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium shadow-lg shadow-teal-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </button>
      </div>
    </header>
  );
};

