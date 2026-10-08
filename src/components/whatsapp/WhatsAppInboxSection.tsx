import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WAMessage, Lead } from '../../types';
import {
  subscribeToWAMessages,
  sendManualWAMessage,
} from '../../lib/storage';
import {
  MessageSquare,
  Search,
  Send,
  User,
  Phone,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Filter,
  ArrowDownCircle,
  Tag,
  GraduationCap,
} from 'lucide-react';

interface WhatsAppInboxSectionProps {
  leads: Lead[];
  onSelectLead?: (lead: Lead) => void;
}

interface ConversationGroup {
  phone: string;
  cleanPhone: string;
  lead?: Lead;
  lastMessage: WAMessage;
  unreadCount: number;
  totalMessages: number;
  capturedFields: Record<string, string>;
}

export const WhatsAppInboxSection: React.FC<WhatsAppInboxSectionProps> = ({
  leads,
  onSelectLead,
}) => {
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time WhatsApp messages
  useEffect(() => {
    const unsub = subscribeToWAMessages((data) => {
      setMessages(data);
    });
    return () => unsub();
  }, []);

  // Helper to normalize phone numbers for matching
  const normalizePhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    return digits.slice(-10); // Match last 10 digits
  };

  // Group messages by phone number
  const conversations = useMemo(() => {
    const groups: Record<string, ConversationGroup> = {};

    messages.forEach((msg) => {
      const clean = normalizePhone(msg.phone);
      if (!clean) return;

      // Find matching lead from CRM
      const matchedLead = leads.find((l) => normalizePhone(l.phone) === clean);

      if (!groups[clean]) {
        // Collect any custom attributes or captured fields from lead
        const captured: Record<string, string> = {};
        if (matchedLead?.customFields) {
          Object.assign(captured, matchedLead.customFields);
        }

        groups[clean] = {
          phone: msg.phone,
          cleanPhone: clean,
          lead: matchedLead,
          lastMessage: msg,
          unreadCount: 0,
          totalMessages: 0,
          capturedFields: captured,
        };
      }

      groups[clean].totalMessages += 1;
      // If msg timestamp is newer, update lastMessage
      if (
        new Date(msg.timestamp).getTime() >=
        new Date(groups[clean].lastMessage.timestamp).getTime()
      ) {
        groups[clean].lastMessage = msg;
      }
    });

    // If there are leads that have no messages yet, we can also show them if searched
    const list = Object.values(groups);
    // Sort conversations by most recent message descending
    list.sort(
      (a, b) =>
        new Date(b.lastMessage.timestamp).getTime() -
        new Date(a.lastMessage.timestamp).getTime()
    );

    return list;
  }, [messages, leads]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedPhone && conversations.length > 0) {
      setSelectedPhone(conversations[0].cleanPhone);
    }
  }, [conversations, selectedPhone]);

  // Scroll to bottom when messages for selected conversation update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPhone]);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.lead?.name.toLowerCase().includes(q);
    const phoneMatch = c.phone.includes(q) || c.cleanPhone.includes(q);
    const textMatch = (c.lastMessage.text || c.lastMessage.message || '').toLowerCase().includes(q);
    return nameMatch || phoneMatch || textMatch;
  });

  const selectedConversation = conversations.find((c) => c.cleanPhone === selectedPhone);

  const selectedMessages = useMemo(() => {
    if (!selectedPhone) return [];
    return messages.filter((m) => normalizePhone(m.phone) === selectedPhone);
  }, [messages, selectedPhone]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedPhone || isSending) return;

    setIsSending(true);
    const textToSend = replyText.trim();
    setReplyText('');

    try {
      await sendManualWAMessage(
        selectedConversation?.phone || selectedPhone,
        textToSend,
        selectedConversation?.lead?.name
      );
    } catch (err) {
      console.error('Failed to send WhatsApp message:', err);
      alert('Failed to send message to Firestore.');
      setReplyText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatConversationDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[750px] max-h-[85vh]">
      {/* 1. LEFT PANEL: Conversations List */}
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950/60 shrink-0">
        {/* Inbox Header */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Inbox</span>
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
              {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by student name, phone, or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {filteredConversations.map((conv) => {
            const isSelected = conv.cleanPhone === selectedPhone;
            const leadName = conv.lead?.name;
            const lastText = conv.lastMessage.text || conv.lastMessage.message || '';
            const isOutgoing = conv.lastMessage.direction === 'outgoing';

            return (
              <div
                key={conv.cleanPhone}
                onClick={() => setSelectedPhone(conv.cleanPhone)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-850/90 border-l-4 border-teal-400 shadow-inner'
                    : 'hover:bg-slate-900/60 border-l-4 border-transparent'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow ${
                    conv.lead
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {leadName ? leadName.slice(0, 2).toUpperCase() : <Phone className="w-4 h-4" />}
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-teal-300' : 'text-slate-100'
                      }`}
                    >
                      {leadName || `+${conv.phone}`}
                    </h4>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {formatConversationDate(conv.lastMessage.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    {isOutgoing && (
                      <span className="text-teal-400 shrink-0">
                        {conv.lastMessage.status === 'read' ? (
                          <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                        ) : conv.lastMessage.status === 'delivered' ? (
                          <CheckCheck className="w-3 h-3 text-slate-400" />
                        ) : (
                          <Check className="w-3 h-3 text-slate-500" />
                        )}
                      </span>
                    )}
                    <p className="truncate flex-1 font-normal leading-tight">{lastText}</p>
                  </div>

                  {/* Lead Tag if available */}
                  {conv.lead && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] bg-slate-900 text-teal-300 border border-slate-800 px-1.5 py-0.2 rounded font-medium truncate">
                        {conv.lead.courseInterest}
                      </span>
                      {conv.lead.leadScore !== undefined && (
                        <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.2 rounded font-mono font-bold">
                          {conv.lead.leadScore} pts
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs text-slate-400">No conversations found</p>
              <p className="text-[11px] text-slate-600">
                Incoming messages from your WhatsApp webhook will appear here in real-time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT PANEL: Message Thread & Lead Context Header */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative">
        {selectedConversation ? (
          <>
            {/* Top Bar: Lead Context & CRM Action */}
            <div className="bg-[#1f2c34] px-4 py-3 border-b border-[#2a3942] flex flex-wrap items-center justify-between gap-3 shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  {selectedConversation.lead?.name
                    ? selectedConversation.lead.name.slice(0, 2).toUpperCase()
                    : 'WA'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100">
                      {selectedConversation.lead?.name || `+${selectedConversation.phone}`}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (+{selectedConversation.phone})
                    </span>
                  </div>

                  {selectedConversation.lead && (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-teal-300 font-semibold">
                        {selectedConversation.lead.courseInterest}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] text-slate-300">
                        {selectedConversation.lead.classMode || 'Raipur'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-semibold border border-slate-700">
                        {selectedConversation.lead.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action: Open in CRM */}
              {selectedConversation.lead && onSelectLead && (
                <button
                  type="button"
                  onClick={() => onSelectLead(selectedConversation.lead!)}
                  className="text-xs bg-[#00a884] hover:bg-[#02be96] text-[#111b21] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <span>View CRM Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Captured Flow Answers Sub-bar (if available) */}
            {selectedConversation.capturedFields &&
              Object.keys(selectedConversation.capturedFields).length > 0 && (
                <div className="bg-[#111b21] border-b border-[#222d34] px-4 py-2 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-teal-400" />
                    <span>Captured Answers:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Object.entries(selectedConversation.capturedFields).map(([k, v]) => (
                      <span
                        key={k}
                        className="bg-[#202c33] text-teal-300 border border-[#2a3942] text-[10px] px-2 py-0.5 rounded font-mono"
                      >
                        <strong>{k}:</strong> {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedMessages.map((msg) => {
                const isOutgoing = msg.direction === 'outgoing';
                const text = msg.text || msg.message || '';

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-xl px-3.5 py-2 shadow-sm text-xs space-y-1 ${
                        isOutgoing
                          ? 'bg-[#005c4b] text-white rounded-tr-none border border-emerald-700/40'
                          : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-[#2a3942]'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap text-xs">{text}</p>
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] pt-0.5 ${
                          isOutgoing ? 'text-emerald-200/80' : 'text-[#8696a0]'
                        }`}
                      >
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        {isOutgoing && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3 h-3 text-emerald-200" />
                            ) : msg.status === 'sent' ? (
                              <Check className="w-3 h-3 text-emerald-200" />
                            ) : (
                              <Clock className="w-3 h-3 text-emerald-300 animate-pulse" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Reply Bar */}
            <form
              onSubmit={handleSendReply}
              className="bg-[#202c33] p-3 border-t border-[#2a3942] flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type a WhatsApp reply... (dispatched by your backend daemon)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-[#2a3942] border border-[#3b4a54] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#00a884]"
              />

              <button
                type="submit"
                disabled={!replyText.trim() || isSending}
                className="w-10 h-10 rounded-xl bg-[#00a884] hover:bg-[#02be96] text-[#111b21] flex items-center justify-center shadow transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                title="Send WhatsApp Message"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-[#111b21] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
            <h4 className="text-sm font-bold text-slate-300">Select a Conversation</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Choose a lead from the left pane to view conversation history, captured flow answers, and send direct WhatsApp replies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
