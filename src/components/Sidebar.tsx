import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  FileSpreadsheet,
  Settings,
  PlusCircle,
  Video,
  Sparkles,
  LogOut,
  UserX,
  UserMinus,
  GraduationCap,
  X,
  Menu,
  Share2,
  Layers,
  Trash2,
} from 'lucide-react';

export type NavView =
  | 'dashboard'
  | 'leads'
  | 'admissions'
  | 'not_interested'
  | 'lost'
  | 'deleted'
  | 'forms'
  | 'followups'
  | 'import'
  | 'integrations'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenAddLead: () => void;
  overdueCount: number;
  dueTodayCount: number;
  newSheetLeadsCount?: number;
  formsCount?: number;
  webhooksCount?: number;
  deletedCount?: number;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onOpenAddLead,
  overdueCount,
  dueTodayCount,
  newSheetLeadsCount = 0,
  formsCount = 0,
  webhooksCount = 0,
  deletedCount = 0,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  onOpenMobile,
}) => {
  const totalAlerts = overdueCount + dueTodayCount;

  const navItems = [
    {
      id: 'dashboard' as NavView,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: totalAlerts > 0 ? totalAlerts : undefined,
      badgeColor: overdueCount > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'leads' as NavView,
      label: 'Lead Directory',
      icon: Users,
      badge: newSheetLeadsCount > 0 ? `+${newSheetLeadsCount} New` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
    },
    {
      id: 'admissions' as NavView,
      label: 'Admissions',
      icon: GraduationCap,
    },
    {
      id: 'not_interested' as NavView,
      label: 'Not Interested',
      icon: UserMinus,
    },
    {
      id: 'lost' as NavView,
      label: 'Lost Leads',
      icon: UserX,
    },
    {
      id: 'deleted' as NavView,
      label: 'Deleted Leads',
      icon: Trash2,
      badge: deletedCount > 0 ? `${deletedCount}` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'forms' as NavView,
      label: 'Sharable Forms',
      icon: Share2,
      badge: formsCount > 0 ? `${formsCount}` : undefined,
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    {
      id: 'followups' as NavView,
      label: 'Follow-ups & Agendas',
      icon: CalendarClock,
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : dueTodayCount > 0 ? `${dueTodayCount} Today` : undefined,
      badgeColor: overdueCount > 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'import' as NavView,
      label: 'CSV Bulk Import',
      icon: FileSpreadsheet,
    },
    {
      id: 'integrations' as NavView,
      label: 'Integrations',
      icon: Layers,
      badge: 'Live',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    {
      id: 'settings' as NavView,
      label: 'Settings & Config',
      icon: Settings,
    },
  ];

  const handleSelectAndClose = (view: NavView) => {
    onSelectView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Academy Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(45,212,191,0.4)] shrink-0">
            <Video className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-slate-100 text-sm tracking-tight leading-none uppercase">
                Tech Lab
              </h1>
              <span className="text-[10px] font-bold text-teal-400 bg-teal-950/80 border border-teal-800/50 px-1.5 py-0.5 rounded uppercase">
                CRM
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium tracking-wider uppercase">
              Academy Lead Engine
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Add Lead CTA */}
      <div className="p-4">
        <button
          onClick={() => {
            onOpenAddLead();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs py-2.5 px-3 rounded-lg shadow-lg shadow-teal-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Lead (Naya Lead)</span>
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-2 space-y-1 overflow-y-auto">
        <div className="px-4 mb-2 text-[10px] font-bold text-slate-600 tracking-widest uppercase">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectAndClose(item.id)}
              className={`w-full flex items-center justify-between px-6 py-3 text-sm transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'active-nav font-semibold'
                  : 'sidebar-item text-slate-400 hover:bg-slate-800/60 hover:text-teal-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-teal-400' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Quick Note */}
      <div className="m-3 p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 text-teal-400 font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Admin Quick Note</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Daily follow-ups ko "Follow-ups" tab se track karein. Reminders in-app alert create karte hain.
        </p>
      </div>

      {/* Footer Profile Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 text-xs flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Admin Sharma</span>
          </div>
          <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Super User
          </span>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full mt-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border border-slate-800 hover:border-rose-950/40 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 font-medium text-[11px] transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 bg-slate-900 flex-col h-screen sticky top-0 shrink-0 select-none z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full z-10 shadow-2xl flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-1.5 px-1 shadow-2xl">
        <button
          onClick={() => onSelectView('dashboard')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
            currentView === 'dashboard' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onSelectView('leads')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
            currentView === 'leads' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Leads</span>
        </button>

        <button
          onClick={() => onSelectView('admissions')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
            currentView === 'admissions' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4 mb-0.5" />
          <span>Admissions</span>
        </button>

        <button
          onClick={() => onSelectView('followups')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors relative ${
            currentView === 'followups' ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarClock className="w-4 h-4 mb-0.5" />
          <span>Followups</span>
          {totalAlerts > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={onOpenMobile}
          className="flex flex-col items-center py-1 px-2 text-[10px] font-medium text-slate-400 hover:text-teal-400"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>Menu</span>
        </button>
      </div>
    </>
  );
};

