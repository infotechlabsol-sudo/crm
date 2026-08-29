import React, { useState } from 'react';
import { Lead, CRMSettings, WhatsAppTemplate } from '../types';
import {
  MessageSquare,
  X,
  ExternalLink,
  Send,
} from 'lucide-react';
import { createWhatsAppLink, replaceLeadPlaceholders } from '../lib/utils';
import { getWhatsAppTemplates } from '../lib/storage';

interface BulkWhatsAppModalProps {
  selectedLeads: Lead[];
  settings: CRMSettings;
  whatsAppTemplates?: WhatsAppTemplate[];
  onClose: () => void;
  onAddBulkNote: (leadIds: string[], noteText: string) => void;
}

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  selectedLeads,
  settings,
  whatsAppTemplates,
  onClose,
  onAddBulkNote,
}) => {
  const effectiveTemplates: { id: string; name: string; message: string }[] = React.useMemo(() => {
    if (whatsAppTemplates && whatsAppTemplates.length > 0) {
      return whatsAppTemplates;
    }
    const cached = getWhatsAppTemplates();
    if (cached && cached.length > 0) {
      return cached;
    }
    if (settings?.whatsappTemplates && settings.whatsappTemplates.length > 0) {
      return settings.whatsappTemplates.map((t) => ({ id: t.id, name: t.title, message: t.message }));
    }
    return [];
  }, [whatsAppTemplates, settings]);

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    effectiveTemplates[0]?.id || ''
  );
  const [customMessage, setCustomMessage] = useState(
    effectiveTemplates[0]?.message ||
      'Namaste {{name}}! Greetings from Tech Lab Academy regarding your interest in {{course_interest}}. Our new batch ({{batch}}) is launching this week!'
  );

  const [logged, setLogged] = useState(false);

  // When template changes
  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = effectiveTemplates.find((t) => t.id === tplId);
    if (found) {
      setCustomMessage(found.message);
    }
  };

  // Generate personalized message for a lead
  const renderPersonalizedText = (lead: Lead) => {
    return replaceLeadPlaceholders(customMessage, lead);
  };

  const handleLogBulkNote = () => {
    const leadIds = selectedLeads.map((l) => l.id);
    onAddBulkNote(
      leadIds,
      `Sent Bulk WhatsApp Message: "${customMessage.slice(0, 60)}..."`
    );
    setLogged(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-5 h-5 text-teal-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
              Bulk WhatsApp Dispatch ({selectedLeads.length} Students)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Template Selector & Editor */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200">Select Message Template</label>
              <div className="text-[11px] text-slate-500 font-mono">
                Placeholders: {'{{name}}'}, {'{{course_interest}}'}, {'{{batch}}'}
              </div>
            </div>

            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 font-medium cursor-pointer"
            >
              {effectiveTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Customize Message Format
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-3 font-mono text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Generated Clickable Links List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                Clickable WhatsApp Links per Student
              </h3>
              <span className="text-slate-500">Each link opens pre-filled WhatsApp web/app tab</span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950">
              {selectedLeads.map((lead) => {
                const personalizedMsg = renderPersonalizedText(lead);
                const waUrl = createWhatsAppLink(lead.phone, personalizedMsg);

                return (
                  <div
                    key={lead.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span>{lead.name}</span>
                        <span className="text-slate-500 font-mono text-[11px] font-normal">
                          (+91 {lead.phone})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        "{personalizedMsg}"
                      </p>
                    </div>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-teal-950 hover:bg-teal-900 text-teal-400 border border-teal-800 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send WA</span>
                      <ExternalLink className="w-3 h-3 text-teal-500" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log Note Option */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-200">Log Activity to Lead Timelines</div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Automatically add a system note to all {selectedLeads.length} leads recording this WhatsApp message dispatch.
              </p>
            </div>

            <button
              onClick={handleLogBulkNote}
              disabled={logged}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center shrink-0 ${
                logged
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {logged ? 'Activity Logged ✓' : 'Log Note to Leads'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-2.5 sm:py-2 rounded-lg text-xs cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
