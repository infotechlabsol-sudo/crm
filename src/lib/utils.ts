import { LeadStatus, LeadScore } from '../types';

/**
 * Clean phone number to digits only
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Validate phone number (must have at least 10 digits)
 */
export function isValidPhone(phone: string): boolean {
  const digits = cleanPhoneNumber(phone);
  return digits.length >= 10 && digits.length <= 13;
}

/**
 * Format phone number nicely for display (e.g. +91 98765 43210 or 98765 43210)
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = cleanPhoneNumber(phone);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Create WhatsApp link wa.me
 */
export function createWhatsAppLink(phone: string, text?: string): string {
  let digits = cleanPhoneNumber(phone);
  if (digits.length === 10) {
    digits = '91' + digits; // Default India prefix
  }
  const encodedText = text ? encodeURIComponent(text) : '';
  return `https://wa.me/${digits}${encodedText ? `?text=${encodedText}` : ''}`;
}

/**
 * Create Call tel: link
 */
export function createTelLink(phone: string): string {
  const digits = cleanPhoneNumber(phone);
  return `tel:+${digits.length === 10 ? '91' + digits : digits}`;
}

/**
 * Format ISO date string into readable display (e.g. "27 Jul 2026, 02:30 PM")
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return 'Not Set';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format ISO date into relative or short date ("Today, 3:00 PM", "Yesterday", "28 Aug")
 */
export function formatRelativeDate(isoString?: string): string {
  if (!isoString) return 'None';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'None';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
  const diffTime = startOfDate.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Tomorrow, ${timeStr}`;
  if (diffDays === -1) return `Yesterday, ${timeStr}`;
  if (diffDays < -1) return `${Math.abs(diffDays)}d ago, ${timeStr}`;
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays}d, ${timeStr}`;

  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + `, ${timeStr}`;
}

/**
 * Check follow-up status (overdue, due_today, upcoming, none)
 */
export function getFollowUpCategory(isoString?: string): 'overdue' | 'due_today' | 'upcoming' | 'none' {
  if (!isoString) return 'none';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'none';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (d < startOfToday) return 'overdue';
  if (d >= startOfToday && d <= endOfToday) return 'due_today';
  return 'upcoming';
}

/**
 * Format Date object to value for datetime-local HTML input ("YYYY-MM-DDTHH:mm")
 */
export function toDatetimeLocalValue(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get status badge classes for dark UI
 */
export function getStatusBadgeClass(status: LeadStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'New':
      return { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-800/60' };
    case 'Contacted':
      return { bg: 'bg-sky-950/60', text: 'text-sky-400', border: 'border-sky-800/60' };
    case 'Interested':
      return { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-800/60' };
    case 'Follow-up':
      return { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-800/60' };
    case 'Demo Scheduled':
      return { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-800/60' };
    case 'Enrolled':
      return { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-800/60' };
    case 'Not Interested':
      return { bg: 'bg-zinc-800/60', text: 'text-zinc-400', border: 'border-zinc-700/60' };
    case 'Lost':
      return { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-800/60' };
    default:
      return { bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };
  }
}

/**
 * Replace template placeholders like {{name}}, {{course_interest}}, {{batch}}, etc.
 */
export function replaceLeadPlaceholders(
  templateText: string,
  lead?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    source?: string;
    course_interest?: string;
    assigned_batch?: string;
    lead_score?: string;
    address?: string;
    class_mode?: string;
    [key: string]: any;
  } | null
): string {
  if (!templateText) return '';
  if (!lead) return templateText;

  const rawPhone = lead.phone || '';
  const digits = cleanPhoneNumber(rawPhone);
  const formattedPhone = digits.length === 10 ? `+91${digits}` : digits ? `+${digits}` : '';

  const regNum = lead.id ? `REG-${lead.id.slice(-6).toUpperCase()}` : 'REG-000000';
  const remainingFees = '₹0';

  let result = templateText;

  // Double curly braces {{placeholder}}
  result = result
    .replace(/\{\{\s*name\s*\}\}/gi, lead.name || '')
    .replace(/\{\{\s*course(?:_interest)?\s*\}\}/gi, lead.course_interest || 'Video Editing')
    .replace(/\{\{\s*batch\s*\}\}/gi, lead.assigned_batch || 'Upcoming Batch')
    .replace(/\{\{\s*assigned_batch\s*\}\}/gi, lead.assigned_batch || 'Upcoming Batch')
    .replace(/\{\{\s*phone\s*\}\}/gi, formattedPhone)
    .replace(/\{\{\s*email\s*\}\}/gi, lead.email || '')
    .replace(/\{\{\s*source\s*\}\}/gi, lead.source || '')
    .replace(/\{\{\s*registration_number\s*\}\}/gi, regNum)
    .replace(/\{\{\s*remaining_fees\s*\}\}/gi, remainingFees)
    .replace(/\{\{\s*address\s*\}\}/gi, lead.address || '')
    .replace(/\{\{\s*class_mode\s*\}\}/gi, lead.class_mode || 'Offline')
    .replace(/\{\{\s*lead_score\s*\}\}/gi, lead.lead_score || 'Warm');

  // Single curly braces {placeholder}
  result = result
    .replace(/\{\s*name\s*\}/gi, lead.name || '')
    .replace(/\{\s*course(?:_interest)?\s*\}/gi, lead.course_interest || 'Video Editing')
    .replace(/\{\s*batch\s*\}/gi, lead.assigned_batch || 'Upcoming Batch')
    .replace(/\{\s*assigned_batch\s*\}/gi, lead.assigned_batch || 'Upcoming Batch')
    .replace(/\{\s*phone\s*\}/gi, formattedPhone)
    .replace(/\{\s*email\s*\}/gi, lead.email || '')
    .replace(/\{\s*source\s*\}/gi, lead.source || '')
    .replace(/\{\s*registration_number\s*\}/gi, regNum)
    .replace(/\{\s*remaining_fees\s*\}/gi, remainingFees)
    .replace(/\{\s*address\s*\}/gi, lead.address || '')
    .replace(/\{\s*class_mode\s*\}/gi, lead.class_mode || 'Offline')
    .replace(/\{\s*lead_score\s*\}/gi, lead.lead_score || 'Warm');

  return result;
}

/**
 * Web Audio API synthesized notification sound (pleasant, non-intrusive bell chime)
 */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // Bell Tone 1: 880 Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Bell Tone 2: 1318.5 Hz (E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.06);
    gain2.gain.setValueAtTime(0.14, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Gracefully handle browser autoplay policies
  }
}

/**
 * Get lead score badge classes
 */
export function getScoreBadgeClass(score: LeadScore): { bg: string; text: string; border: string } {
  switch (score) {
    case 'Hot':
      return { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-800/50' };
    case 'Warm':
      return { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-800/50' };
    case 'Cold':
      return { bg: 'bg-slate-800/60', text: 'text-slate-400', border: 'border-slate-700/50' };
    default:
      return { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' };
  }
}
