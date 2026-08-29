import React, { useState, useEffect, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { Lead, CRMSettings, EmailTemplate } from '../types';
import {
  X,
  Send,
  User,
  Mail,
  FileText,
  Paperclip,
  Info,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eraser,
  Palette,
  Highlighter,
} from 'lucide-react';
import { cleanPhoneNumber, replaceLeadPlaceholders } from '../lib/utils';
import { getEmailTemplates, DEFAULT_EMAIL_TEMPLATES } from '../lib/storage';

interface SendEmailModalProps {
  lead: Lead;
  settings?: CRMSettings;
  emailTemplates?: EmailTemplate[];
  onClose: () => void;
  onSuccessNotification?: (msg: string) => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  lead,
  settings,
  emailTemplates,
  onClose,
  onSuccessNotification,
}) => {
  const [fromAccount, setFromAccount] = useState('default');
  const [toEmail, setToEmail] = useState(lead.email || '');
  const [ccEmail, setCcEmail] = useState('');
  const [bccEmail, setBccEmail] = useState('');
  const [subject, setSubject] = useState(
    lead.course_interest
      ? `Regarding your inquiry for ${lead.course_interest} — Tech Lab Academy`
      : 'Greetings from Tech Lab Academy'
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // File Attachment State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rich Text Editor Ref
  const editorRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const highlightPickerRef = useRef<HTMLInputElement>(null);

  // Derived effective email templates
  const effectiveTemplates: EmailTemplate[] = React.useMemo(() => {
    if (emailTemplates && emailTemplates.length > 0) {
      return emailTemplates;
    }
    const cached = getEmailTemplates();
    if (cached && cached.length > 0) {
      return cached;
    }
    return DEFAULT_EMAIL_TEMPLATES;
  }, [emailTemplates]);

  // Initialize editor default content
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      const defaultBody = `<p>Hi <strong>${lead.name || 'there'}</strong>,</p><p><br></p><p>Thank you for showing interest in <strong>Tech Lab Academy</strong>! We're excited to help you build strong, industry-ready skills in ${
        lead.course_interest || 'Video Editing & Design'
      }.</p><p><br></p><p>Our next batch starts soon. Please let us know if you have any questions about the course modules, fees, or class schedules.</p><p><br></p><p>Warm regards,<br><strong>Team Tech Lab Academy</strong><br>Mowa, Raipur, Chhattisgarh<br><a href="mailto:info.techlabsol@gmail.com">info.techlabsol@gmail.com</a></p>`;
      editorRef.current.innerHTML = defaultBody;
    }
  }, [lead.name, lead.course_interest]);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = effectiveTemplates.find((t) => t.id === templateId);
    if (template) {
      const personalizedSubject = replaceLeadPlaceholders(template.subject, lead);
      const personalizedHtml = replaceLeadPlaceholders(template.message, lead);

      setSubject(personalizedSubject);

      if (editorRef.current) {
        editorRef.current.innerHTML = personalizedHtml;
      }
    }
  };

  // Rich text formatting commands
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const handleParagraphStyle = (tag: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('formatBlock', false, tag);
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter the link URL:', 'https://');
    if (url && url !== 'https://') {
      executeCommand('createLink', url);
    }
  };

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    executeCommand('foreColor', e.target.value);
  };

  const handleHighlightColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    executeCommand('hiliteColor', e.target.value);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray: File[] = Array.from(e.target.files);
      setSelectedFiles(filesArray);

      const firstFile = filesArray[0];
      if (firstFile && firstFile.size < 55000) {
        // Try reading small files as base64
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setAttachmentBase64(reader.result);
          }
        };
        reader.readAsDataURL(firstFile);
      } else {
        setAttachmentBase64(null);
      }
    } else {
      setSelectedFiles([]);
      setAttachmentBase64(null);
    }
  };

  // Send Email via EmailJS
  const handleSendEmail = async () => {
    if (!toEmail.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide a valid recipient "To Email" address.',
      });
      return;
    }

    if (!subject.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter an email subject.',
      });
      return;
    }

    const messageHtml = editorRef.current ? editorRef.current.innerHTML : '';
    const plainText = editorRef.current ? editorRef.current.innerText : '';

    if (!plainText.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a message to send.',
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    // Retrieve configured EmailJS keys or environment variables
    const serviceId =
      (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID || 'service_techlab';
    const templateId =
      (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID || 'template_techlab';
    const publicKey =
      (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY || 'default_public_key';

    const templateParams: Record<string, any> = {
      to_email: toEmail.trim(),
      to_name: lead.name,
      from_name: 'Tech Lab Academy',
      reply_to: 'info.techlabsol@gmail.com',
      subject: subject.trim(),
      message: messageHtml,
      message_html: messageHtml,
      message_text: plainText,
      cc: ccEmail.trim(),
      bcc: bccEmail.trim(),
      ...(attachmentBase64 ? { attachment: attachmentBase64 } : {}),
    };

    try {
      // Execute EmailJS send
      const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);
      console.log('EmailJS Send Response:', response);

      setStatusMessage({
        type: 'success',
        text: 'Email sent successfully via EmailJS!',
      });
      if (onSuccessNotification) {
        onSuccessNotification(`Email sent to ${toEmail}`);
      }

      // Auto close after brief display
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('EmailJS Send Error:', err);
      // Give a helpful, descriptive error message without crashing
      const errMsg =
        err?.text ||
        err?.message ||
        'Failed to connect to EmailJS. Please verify EmailJS Service ID and Public Key settings.';
      setStatusMessage({
        type: 'error',
        text: `Error sending email: ${errMsg}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSending) {
      onClose();
    }
  };

  return (
    <div
      id="email-compose-modal-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-modal-title"
    >
      <div
        id="email-compose-modal-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. HEADER: Blue gradient header bar with Send icon, bold white title & close button */}
        <div
          id="email-modal-header"
          className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-white shadow-md shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Send className="w-4 h-4 text-white" />
            </div>
            <h2 id="email-modal-title" className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
              Send Email
            </h2>
          </div>
          <button
            id="email-modal-close-btn"
            onClick={onClose}
            disabled={isSending}
            aria-label="Close popup"
            className="w-8 h-8 rounded-lg bg-black/10 hover:bg-black/25 text-white/90 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{statusMessage.text}</div>
            </div>
          )}

          {/* Quick Template Selector */}
          <div className="space-y-1">
            <label
              htmlFor="email-template-select"
              className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Quick Templates:</span>
            </label>
            <select
              id="email-template-select"
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-colors cursor-pointer"
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

          {/* 2. FROM (EMAIL ACCOUNT) */}
          <div className="space-y-1">
            <label
              htmlFor="email-from-account"
              className="block font-semibold text-slate-300 text-xs"
            >
              From (Email Account)
            </label>
            <select
              id="email-from-account"
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="default">Default config will be used (info.techlabsol@gmail.com)</option>
            </select>
            <p className="text-[11px] text-slate-500">Which email account to send from.</p>
          </div>

          {/* 3. TO EMAIL */}
          <div className="space-y-1">
            <label
              htmlFor="email-to-field"
              className="block font-semibold text-slate-300 text-xs"
            >
              To Email <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="email-to-field"
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder-slate-600 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors"
              />
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* 4. CC / BCC ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="email-cc-field"
                className="block font-semibold text-slate-300 text-xs"
              >
                CC (Optional)
              </label>
              <input
                id="email-cc-field"
                type="text"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="cc1@example.com, cc2@example.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="email-bcc-field"
                className="block font-semibold text-slate-300 text-xs"
              >
                BCC (Optional)
              </label>
              <input
                id="email-bcc-field"
                type="text"
                value={bccEmail}
                onChange={(e) => setBccEmail(e.target.value)}
                placeholder="bcc@example.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 placeholder-slate-600 rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 5. SUBJECT */}
          <div className="space-y-1">
            <label
              htmlFor="email-subject-field"
              className="block font-semibold text-slate-300 text-xs"
            >
              Subject <span className="text-rose-400">*</span>
            </label>
            <input
              id="email-subject-field"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 placeholder-slate-600 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-colors"
            />
          </div>

          {/* 6. MESSAGE WITH FORMATTING TOOLBAR */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-300 text-xs">
              Message <span className="text-rose-400">*</span>
            </label>

            {/* Formatting Toolbar */}
            <div className="bg-slate-950 border border-slate-800 rounded-t-xl p-1.5 flex flex-wrap items-center gap-1 border-b-0 text-slate-300">
              {/* Paragraph style dropdown */}
              <select
                onChange={(e) => handleParagraphStyle(e.target.value)}
                defaultValue="p"
                className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[11px] font-medium focus:outline-none cursor-pointer"
                title="Text Style"
              >
                <option value="p">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>

              <div className="h-4 w-[1px] bg-slate-800 mx-1" />

              {/* Bold */}
              <button
                type="button"
                onClick={() => executeCommand('bold')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              {/* Italic */}
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              {/* Underline */}
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              {/* Strikethrough */}
              <button
                type="button"
                onClick={() => executeCommand('strikeThrough')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-800 mx-1" />

              {/* Text Color */}
              <label
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-blue-400 transition-colors cursor-pointer relative"
                title="Text Color"
              >
                <Palette className="w-3.5 h-3.5" />
                <input
                  ref={colorPickerRef}
                  type="color"
                  defaultValue="#38bdf8"
                  onChange={handleTextColorChange}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>

              {/* Highlight Color */}
              <label
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer relative"
                title="Highlight Color"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <input
                  ref={highlightPickerRef}
                  type="color"
                  defaultValue="#fef08a"
                  onChange={handleHighlightColorChange}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>

              <div className="h-4 w-[1px] bg-slate-800 mx-1" />

              {/* Bullet List */}
              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              {/* Numbered List */}
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              {/* Link */}
              <button
                type="button"
                onClick={handleInsertLink}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Insert Link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>

              {/* Clear Formatting */}
              <button
                type="button"
                onClick={() => executeCommand('removeFormat')}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear Formatting"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editable Content Area */}
            <div
              id="email-message-editor"
              ref={editorRef}
              contentEditable
              role="textbox"
              aria-multiline="true"
              className="w-full min-h-[140px] max-h-[220px] bg-slate-950 border border-slate-800 rounded-b-xl p-3 text-xs leading-relaxed text-slate-100 focus:outline-none focus:border-blue-500 overflow-y-auto"
            />
            <p className="text-[11px] text-slate-500 pt-0.5">Use the toolbar to format your message</p>
          </div>

          {/* 7. ATTACHMENTS (OPTIONAL) */}
          <div className="space-y-1.5 pt-1">
            <label className="block font-semibold text-slate-300 text-xs">
              Attachments (Optional)
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileChange}
                className="hidden"
                id="email-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                <span>Choose Files</span>
              </button>
              <span className="text-[11px] text-slate-400 truncate max-w-xs">
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} file(s) selected: ${selectedFiles
                      .map((f) => f.name)
                      .join(', ')}`
                  : 'No file chosen'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Max 10MB per file. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF
            </p>
            {selectedFiles.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-900/40 rounded-lg p-2 flex items-start gap-1.5 text-[11px] text-amber-300">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Note: attachments require additional EmailJS configuration and may not be included in this send.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 9. FOOTER: Cancel and Send Email buttons */}
        <div
          id="email-modal-footer"
          className="bg-slate-950/90 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0"
        >
          <button
            id="email-modal-cancel-btn"
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-medium px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="email-modal-send-btn"
            type="button"
            disabled={isSending}
            onClick={handleSendEmail}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
