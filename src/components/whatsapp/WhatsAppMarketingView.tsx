import React, { useState } from 'react';
import { Lead } from '../../types';
import { WhatsAppApiConfigSection } from './WhatsAppApiConfigSection';
import { WhatsAppDripCampaignsSection } from './WhatsAppDripCampaignsSection';
import { WhatsAppTriggersSection } from './WhatsAppTriggersSection';
import { WhatsAppFlowsSection } from './WhatsAppFlowsSection';
import { WhatsAppInboxSection } from './WhatsAppInboxSection';
import {
  Key,
  Clock,
  Zap,
  GitBranch,
  MessageSquare,
  Sparkles,
  Layers,
  Radio,
} from 'lucide-react';

export type WhatsAppSubTab =
  | 'credentials'
  | 'drip'
  | 'triggers'
  | 'flows'
  | 'inbox';

interface WhatsAppMarketingViewProps {
  leads: Lead[];
  onSelectLead?: (lead: Lead) => void;
  defaultSubTab?: WhatsAppSubTab;
}

export const WhatsAppMarketingView: React.FC<WhatsAppMarketingViewProps> = ({
  leads,
  onSelectLead,
  defaultSubTab = 'credentials',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<WhatsAppSubTab>(defaultSubTab);

  const subTabs = [
    {
      id: 'credentials' as WhatsAppSubTab,
      label: 'API Credentials',
      icon: Key,
      badge: null,
    },
    {
      id: 'drip' as WhatsAppSubTab,
      label: 'Drip Campaigns',
      icon: Clock,
      badge: null,
    },
    {
      id: 'triggers' as WhatsAppSubTab,
      label: 'Instant Triggers',
      icon: Zap,
      badge: null,
    },
    {
      id: 'flows' as WhatsAppSubTab,
      label: 'Automation Flows',
      icon: GitBranch,
      badge: 'Interactive',
    },
    {
      id: 'inbox' as WhatsAppSubTab,
      label: 'WA Inbox',
      icon: MessageSquare,
      badge: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-xl flex items-center gap-1.5 overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/50 text-teal-300 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-teal-400' : 'text-slate-400'
                }`}
              />
              <span>{tab.label}</span>

              {tab.badge && (
                <span className="text-[9px] bg-teal-950 text-teal-400 border border-teal-800 px-1.5 py-0.2 rounded-full uppercase tracking-wider font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-section Content Area */}
      <div className="min-h-[500px]">
        {activeSubTab === 'credentials' && <WhatsAppApiConfigSection />}
        {activeSubTab === 'drip' && <WhatsAppDripCampaignsSection />}
        {activeSubTab === 'triggers' && <WhatsAppTriggersSection />}
        {activeSubTab === 'flows' && <WhatsAppFlowsSection />}
        {activeSubTab === 'inbox' && (
          <WhatsAppInboxSection leads={leads} onSelectLead={onSelectLead} />
        )}
      </div>
    </div>
  );
};
