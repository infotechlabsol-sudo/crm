import React, { useState, useEffect } from 'react';
import { Lead, CRMSettings, WhatsAppTemplate } from '../types';
import {
  X,
  MessageCircle,
  User,
  Phone,
  FileText,
  MessageSquare,
  Info,
  Send,
} from 'lucide-react';
import { cleanPhoneNumber, createWhatsAppLink, replaceLeadPlaceholders } from '../lib/utils';
import { getWhatsAppTemplates } from '../lib/storage';

interface SendWhatsAppModalProps {
  lead: Lead;
  settings?: CRMSettings;
  whatsAppTemplates?: WhatsAppTemplate[];
  onClose: () => void;
}

export const SendWhatsAppModal: React.FC<SendWhatsAppModalProps> = ({
  lead,
  settings,
  whatsAppTemplates,
  onClose,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');

  // Determine effective templates list
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

  // Handle template selection from dropdown
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      return;
    }
    const template = effectiveTemplates.find((t) => t.id === templateId);
    if (template) {
      const personalized = replaceLeadPlaceholders(template.message, lead);
      setMessageText(personalized);
    }
  };

  // Format phone number to +91XXXXXXXXXX
  const formatLeadPhone = (phoneStr: string): string => {
    const digits = cleanPhoneNumber(phoneStr);
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    if (digits.startsWith('+')) {
      return digits;
    }
    return `+91${digits}`;
  };

  const handleSendMessage = () => {
    const waUrl = createWhatsAppLink(lead.phone, messageText.trim());
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      id="whatsapp-compose-modal-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsapp-modal-title"
    >
      <div
        id="whatsapp-compose-modal-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER: Green gradient header bar with WhatsApp icon, bold title & close button */}
        <div
          id="whatsapp-modal-header"
          className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-white shadow-md shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h2 id="whatsapp-modal-title" className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
              Send WhatsApp Message
            </h2>
          </div>
          <button
            id="whatsapp-modal-close-btn"
            onClick={onClose}
            aria-label="Close popup"
            className="w-8 h-8 rounded-lg bg-black/10 hover:bg-black/25 text-white/90 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* 2. LEAD INFO CARD: Light green rounded card with a green left-border accent */}
          <div
            id="whatsapp-lead-info-card"
            className="bg-emerald-950/40 border border-emerald-800/60 border-l-4 border-l-emerald-500 rounded-xl p-3.5 flex items-center gap-3.5 shadow-inner"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-900/70 border border-emerald-700/60 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-100 text-sm truncate">
                {lead.name}
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] sm:text-xs mt-0.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{formatLeadPhone(lead.phone)}</span>
              </div>
            </div>
          </div>

          {/* 3. TEMPLATE SELECTOR */}
          <div className="space-y-1.5">
            <label
              htmlFor="whatsapp-template-select"
              className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select Message Template</span>
            </label>
            <select
              id="whatsapp-template-select"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none transition-colors cursor-pointer"
            >
              <option value="">Select a template...</option>
              {effectiveTemplates.length > 0 ? (
                effectiveTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No templates configured in Settings
                </option>
              )}
            </select>
          </div>

          {/* 4. MESSAGE PREVIEW / EDIT BOX */}
          <div className="space-y-1.5">
            <label
              htmlFor="whatsapp-message-textarea"
              className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Message Preview</span>
            </label>
            <textarea
              id="whatsapp-message-textarea"
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message or select a template..."
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-100 placeholder-slate-500 rounded-xl p-3 text-xs leading-relaxed focus:outline-none transition-colors resize-none font-normal"
            />

            {/* 5. HELPER NOTE & CHARACTER COUNT */}
            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 px-0.5">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Customize the message before sending</span>
              </div>
              <div className="font-mono text-slate-400 shrink-0">
                {messageText.length} characters
              </div>
            </div>
          </div>
        </div>

        {/* 6. FOOTER: Subtle top border, Cancel and Send Message buttons */}
        <div
          id="whatsapp-modal-footer"
          className="bg-slate-950/90 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0"
        >
          <button
            id="whatsapp-modal-cancel-btn"
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-medium px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="whatsapp-modal-send-btn"
            type="button"
            onClick={handleSendMessage}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Message</span>
          </button>
        </div>
      </div>
    </div>
  );
};
