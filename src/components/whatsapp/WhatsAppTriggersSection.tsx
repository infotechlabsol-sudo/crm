import React, { useState, useEffect } from 'react';
import { WhatsAppTrigger, WhatsAppFlow, TriggerMatchType } from '../../types';
import {
  subscribeToWhatsAppTriggers,
  subscribeToWhatsAppFlows,
  addWhatsAppTrigger,
  updateWhatsAppTrigger,
  toggleWhatsAppTriggerActive,
  deleteWhatsAppTrigger,
} from '../../lib/storage';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Radio,
  Search,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Filter,
} from 'lucide-react';

interface WhatsAppTriggersSectionProps {
  initialTriggers?: WhatsAppTrigger[];
  flows?: WhatsAppFlow[];
}

export const WhatsAppTriggersSection: React.FC<WhatsAppTriggersSectionProps> = ({
  initialTriggers = [],
  flows: initialFlows = [],
}) => {
  const [triggers, setTriggers] = useState<WhatsAppTrigger[]>(initialTriggers);
  const [flows, setFlows] = useState<WhatsAppFlow[]>(initialFlows);
  const [showModal, setShowModal] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<WhatsAppTrigger | null>(null);

  // Form states
  const [triggerName, setTriggerName] = useState('');
  const [matchType, setMatchType] = useState<TriggerMatchType>('new_lead');
  const [keyword, setKeyword] = useState('');
  const [flowId, setFlowId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    const unsubTriggers = subscribeToWhatsAppTriggers((data) => setTriggers(data));
    const unsubFlows = subscribeToWhatsAppFlows((data) => setFlows(data));

    return () => {
      unsubTriggers();
      unsubFlows();
    };
  }, []);

  const openAddModal = () => {
    setEditingTrigger(null);
    setTriggerName('Welcome & Qualification Trigger');
    setMatchType('new_lead');
    setKeyword('');
    setFlowId(flows[0]?.id || '');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (trigger: WhatsAppTrigger) => {
    setEditingTrigger(trigger);
    setTriggerName(trigger.name);
    setMatchType(trigger.matchType);
    setKeyword(trigger.keyword || '');
    setFlowId(trigger.flowId);
    setIsActive(trigger.active);
    setShowModal(true);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await toggleWhatsAppTriggerActive(id, !current);
    } catch (e) {
      console.error('Failed to toggle trigger status:', e);
      alert('Failed to update trigger status in Firestore.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete trigger "${name}"?`)) {
      try {
        await deleteWhatsAppTrigger(id);
      } catch (e) {
        console.error('Failed to delete trigger:', e);
        alert('Failed to delete trigger.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerName.trim()) {
      alert('Please enter a trigger name');
      return;
    }
    if (matchType === 'keyword' && !keyword.trim()) {
      alert('Please enter a keyword for Keyword Match');
      return;
    }
    if (!flowId) {
      alert('Please link a WhatsApp Automation Flow');
      return;
    }

    const matchedFlow = flows.find((f) => f.id === flowId);

    setIsSubmitting(true);
    try {
      if (editingTrigger) {
        await updateWhatsAppTrigger(editingTrigger.id, {
          name: triggerName.trim(),
          matchType,
          keyword: matchType === 'keyword' ? keyword.trim().toLowerCase() : undefined,
          flowId,
          flowName: matchedFlow?.name || 'Linked Flow',
          active: isActive,
        });
      } else {
        await addWhatsAppTrigger({
          name: triggerName.trim(),
          matchType,
          keyword: matchType === 'keyword' ? keyword.trim().toLowerCase() : undefined,
          flowId,
          flowName: matchedFlow?.name || 'Linked Flow',
          active: isActive,
        });
      }
      setShowModal(false);
    } catch (e) {
      console.error('Failed to save trigger:', e);
      alert('Failed to save trigger to Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTriggers = triggers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (t.keyword && t.keyword.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (t.flowName && t.flowName.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Instant Trigger Rules</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Automatically launch conversational qualification flows when new leads are registered or specific keywords are received via WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Trigger</span>
        </button>
      </div>

      {/* Triggers Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search triggers by name or keyword..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Total Rules:</span>
            <span className="text-slate-200 font-bold font-mono">{triggers.length}</span>
            <span className="text-slate-600">•</span>
            <span>Active:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {triggers.filter((t) => t.active).length}
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-bold">Trigger Name</th>
                <th className="px-5 py-3 font-bold">Match Type</th>
                <th className="px-5 py-3 font-bold">Match Criteria / Keyword</th>
                <th className="px-5 py-3 font-bold">Linked WhatsApp Flow</th>
                <th className="px-5 py-3 font-bold text-center">Status</th>
                <th className="px-5 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTriggers.map((t) => {
                const linkedFlow = flows.find((f) => f.id === t.flowId);

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-850/50 transition-colors group"
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-950 border border-teal-800/60 flex items-center justify-center text-teal-400 shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span>{t.name}</span>
                        <span className="block text-[10px] text-slate-500 font-mono font-normal">
                          {t.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>

                    {/* Match Type */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border inline-flex items-center gap-1 ${
                          t.matchType === 'new_lead'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {t.matchType === 'new_lead' ? (
                          <>
                            <Radio className="w-3 h-3 text-emerald-400" />
                            <span>New Lead Added</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3 text-cyan-400" />
                            <span>Keyword Match</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Criteria */}
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {t.matchType === 'keyword' ? (
                        <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-teal-300 font-bold">
                          "{t.keyword}"
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">
                          Any new lead ingested (Form, CSV, Webhook, CRM)
                        </span>
                      )}
                    </td>

                    {/* Linked Flow */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="font-semibold text-slate-200">
                          {linkedFlow?.name || t.flowName || 'Default Flow'}
                        </span>
                      </div>
                    </td>

                    {/* Active Toggle Switch */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(t.id, t.active)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          t.active ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                        title={t.active ? 'Click to Pause' : 'Click to Activate'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                            t.active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Trigger"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer"
                        title="Delete Trigger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTriggers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <Zap className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No Triggers Found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Create an instant trigger to auto-respond to incoming leads and messages.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create/Edit Trigger */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-400" />
                <span>{editingTrigger ? 'Edit Trigger Rule' : 'Create New Trigger Rule'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Trigger Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Trigger Name *
                </label>
                <input
                  type="text"
                  value={triggerName}
                  onChange={(e) => setTriggerName(e.target.value)}
                  placeholder="e.g. New Website Inquiry Instant Qualification"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              {/* Match Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Match Event / Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMatchType('new_lead')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      matchType === 'new_lead'
                        ? 'bg-teal-950/60 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Radio className="w-3.5 h-3.5" />
                      <span>New Lead Added</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Triggers immediately when a new student lead is registered
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMatchType('keyword')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      matchType === 'keyword'
                        ? 'bg-teal-950/60 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Search className="w-3.5 h-3.5" />
                      <span>Keyword Match</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Triggers when user messages a keyword (e.g. "demo", "fees")
                    </span>
                  </button>
                </div>
              </div>

              {/* Keyword input if matchType === 'keyword' */}
              {matchType === 'keyword' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Match Keyword *
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. demo, admission, fees, premiere"
                    required={matchType === 'keyword'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-teal-300 font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 font-bold"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Case-insensitive matching against incoming WhatsApp text messages.
                  </span>
                </div>
              )}

              {/* Linked WhatsApp Flow */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Linked WhatsApp Automation Flow *
                </label>
                <select
                  value={flowId}
                  onChange={(e) => setFlowId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="">-- Select a Flow --</option>
                  {flows.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({Object.keys(f.steps || {}).length} steps)
                    </option>
                  ))}
                </select>
                {flows.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    No flows found. Please create a flow first in the "Automation Flows" section.
                  </p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Trigger Enabled</span>
                  <span className="text-[10px] text-slate-500">
                    When active, backend executes this rule automatically
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTrigger ? 'Update Trigger' : 'Save Trigger'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
