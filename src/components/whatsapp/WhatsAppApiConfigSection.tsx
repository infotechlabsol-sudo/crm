import React, { useState, useEffect } from 'react';
import { WhatsAppConfig } from '../../types';
import {
  saveWhatsAppConfig,
  subscribeToWhatsAppConfig,
} from '../../lib/storage';
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Save,
  Check,
  Eye,
  EyeOff,
  Edit3,
  HelpCircle,
  ExternalLink,
  Server,
  Radio,
  CheckCircle2,
  Copy,
} from 'lucide-react';

interface WhatsAppApiConfigSectionProps {
  initialConfig?: WhatsAppConfig | null;
}

export const WhatsAppApiConfigSection: React.FC<WhatsAppApiConfigSectionProps> = ({
  initialConfig,
}) => {
  const [config, setConfig] = useState<WhatsAppConfig | null>(initialConfig || null);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToWhatsAppConfig((data) => {
      if (data) {
        setConfig(data);
        setPhoneNumberId(data.phoneNumberId || '');
        setBusinessAccountId(data.businessAccountId || '');
        setWebhookVerifyToken(data.webhookVerifyToken || '');
        setAccessToken(data.accessToken || '');
        if (data.accessToken) {
          setIsEditingToken(false);
        } else {
          setIsEditingToken(true);
        }
      } else {
        setIsEditingToken(true);
      }
    });

    return () => unsub();
  }, []);

  const isConfigured = Boolean(
    phoneNumberId.trim() &&
    businessAccountId.trim() &&
    webhookVerifyToken.trim() &&
    accessToken.trim()
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveWhatsAppConfig({
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        webhookVerifyToken: webhookVerifyToken.trim(),
        accessToken: accessToken.trim(),
      });
      setSaveSuccess(true);
      setIsEditingToken(false);
      setShowToken(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save WhatsApp config:', err);
      alert('Failed to save configuration to Firestore. Please check your network.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const maskToken = (token: string) => {
    if (!token) return '';
    if (token.length <= 8) return '••••••••';
    const last4 = token.slice(-4);
    return `••••••••••••••••••••••••••••••••••••••••${last4}`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${
              isConfigured
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}
          >
            {isConfigured ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Meta WhatsApp Cloud API Connection
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  isConfigured
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isConfigured ? 'Ready & Configured' : 'Setup Required'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Credentials stored in Firestore <code className="text-teal-400 font-mono text-[11px] bg-slate-950 px-1 py-0.5 rounded border border-slate-800">settings/whatsapp_config</code> for your 24x7 Node.js backend.
            </p>
          </div>
        </div>

        {config?.updatedAt && (
          <div className="text-right text-xs text-slate-400 shrink-0">
            <span className="text-slate-500">Last updated:</span>{' '}
            <span className="text-slate-300 font-medium">
              {new Date(config.updatedAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Main Settings Form & Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-400" />
              <span>API Credentials & Webhook Token</span>
            </h4>
            <span className="text-[11px] text-slate-400">Meta Graph API v20.0+</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Phone Number ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Phone Number ID</span>
                <span className="text-[11px] text-slate-400 font-normal">From WhatsApp App Dashboard</span>
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="e.g. 109847291847291"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>

            {/* WhatsApp Business Account ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>WhatsApp Business Account (WABA) ID</span>
                <span className="text-[11px] text-slate-400 font-normal">WABA Account ID</span>
              </label>
              <input
                type="text"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                placeholder="e.g. 293847192847192"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>

            {/* Webhook Verify Token */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Webhook Verify Token</span>
                <span className="text-[11px] text-slate-400 font-normal">Shared secret for webhook verification</span>
              </label>
              <input
                type="text"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                placeholder="e.g. techlab_wa_secret_token_2026"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Permanent / System User Access Token</span>
                <span className="text-[11px] text-slate-400 font-normal">Meta Cloud API Token</span>
              </label>

              {!isEditingToken && config?.accessToken ? (
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                  <span className="text-xs font-mono text-slate-300 flex-1 truncate select-none">
                    {maskToken(config.accessToken)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingToken(true)}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold px-2.5 py-1 bg-teal-950/60 border border-teal-800/80 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Token</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAABw..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                    title={showToken ? 'Hide Token' : 'Show Token'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                For security, tokens are masked upon saving. Only the last 4 characters remain identifiable.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved to Firestore successfully!</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Writes with <code className="text-teal-400 font-mono">{'{ merge: true }'}</code>
                </span>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Credentials</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Integration Architecture & Backend Instructions (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Backend Architecture</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              This admin panel does not call Meta WhatsApp API directly from the browser. It writes configurations and messages to Firestore, which your external 24x7 Node.js daemon handles:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">1. Instant Triggers & Flows</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Triggered whenever a new lead is added or a keyword matches in incoming messages.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">2. Scheduled Drip Campaigns</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your external cron job queries <code className="text-teal-300 font-mono text-[10px]">whatsapp_drip_campaigns</code> and delivers Day X steps.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">3. Real-time Inbox Synchronization</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    External webhook writes incoming messages to <code className="text-teal-300 font-mono text-[10px]">wa_messages</code>, and outgoing replies are dispatched immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Meta Dev Console Reference */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
                <span>Meta App Setup Guide</span>
              </span>
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
              >
                <span>Meta Developers</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              In your Meta for Developers App under WhatsApp &gt; API Setup, configure your permanent System User token with permissions: <code className="text-teal-400 font-mono">whatsapp_business_messaging</code> and <code className="text-teal-400 font-mono">whatsapp_business_management</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
