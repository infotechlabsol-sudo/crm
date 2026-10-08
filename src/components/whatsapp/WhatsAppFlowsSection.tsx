import React, { useState, useEffect } from 'react';
import {
  WhatsAppFlow,
  FlowStep,
  FlowStepType,
  FlowTriggerType,
  FlowStepOption,
} from '../../types';
import {
  subscribeToWhatsAppFlows,
  addWhatsAppFlow,
  updateWhatsAppFlow,
  deleteWhatsAppFlow,
  DEFAULT_SAMPLE_FLOW,
} from '../../lib/storage';
import { WhatsAppChatPreview } from './WhatsAppChatPreview';
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Play,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  CheckCircle2,
  CornerDownRight,
  Copy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Radio,
  List,
  Flame,
} from 'lucide-react';

interface WhatsAppFlowsSectionProps {
  initialFlows?: WhatsAppFlow[];
}

interface EditableStep {
  key: string;
  type: FlowStepType;
  message: string;
  next: string | null;
  saveAs: string;
  options: { label: string; value: string; next: string | null }[];
}

export const WhatsAppFlowsSection: React.FC<WhatsAppFlowsSectionProps> = ({
  initialFlows = [],
}) => {
  const [flows, setFlows] = useState<WhatsAppFlow[]>(initialFlows);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Editor Form State
  const [flowName, setFlowName] = useState('');
  const [triggerType, setTriggerType] = useState<FlowTriggerType>('new_lead');
  const [startStepKey, setStartStepKey] = useState('welcome');
  const [stepsList, setStepsList] = useState<EditableStep[]>([]);
  const [activePreviewStep, setActivePreviewStep] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subscribe to real-time flows
  useEffect(() => {
    const unsub = subscribeToWhatsAppFlows((data) => {
      setFlows(data);
    });
    return () => unsub();
  }, []);

  // Convert a flow to editor state
  const openFlowEditor = (flow: WhatsAppFlow) => {
    setEditingFlowId(flow.id);
    setIsCreatingNew(false);
    setFlowName(flow.name);
    setTriggerType(flow.trigger);
    setStartStepKey(flow.startStep || Object.keys(flow.steps)[0] || 'welcome');

    const list: EditableStep[] = Object.entries(flow.steps || {}).map(([key, step]) => ({
      key,
      type: step.type || 'text',
      message: step.message || '',
      next: step.next ?? null,
      saveAs: step.saveAs || '',
      options: Array.isArray(step.options)
        ? step.options.map((o) => ({
            label: o.label || '',
            value: o.value || o.label || '',
            next: o.next ?? null,
          }))
        : [],
    }));

    if (list.length === 0) {
      list.push({
        key: 'welcome',
        type: 'text',
        message: 'Namaste! Tech Lab Academy me interest ke liye dhanyavaad 🙏',
        next: null,
        saveAs: '',
        options: [],
      });
    }

    setStepsList(list);
    setErrorMsg(null);
  };

  // Open blank new flow
  const handleOpenNewFlow = () => {
    setEditingFlowId(null);
    setIsCreatingNew(true);
    setFlowName('New Lead Qualification Flow');
    setTriggerType('new_lead');
    setStartStepKey('welcome');
    setStepsList([
      {
        key: 'welcome',
        type: 'text',
        message: 'Namaste! Tech Lab Academy me interest ke liye dhanyavaad 🙏',
        next: 'q1',
        saveAs: '',
        options: [],
      },
      {
        key: 'q1',
        type: 'button',
        message: 'Kya aap pehle se video editing karte hain?',
        next: null,
        saveAs: 'has_editing_experience',
        options: [
          { label: 'Haan', value: 'editing_yes', next: 'q2' },
          { label: 'Nahi', value: 'editing_no', next: 'q2' },
        ],
      },
      {
        key: 'q2',
        type: 'button',
        message: 'Aap kis mode me class karna chahte hain?',
        next: null,
        saveAs: 'class_mode',
        options: [
          { label: 'Offline Raipur', value: 'Offline', next: 'end' },
          { label: 'Online Live', value: 'Online', next: 'end' },
        ],
      },
      {
        key: 'end',
        type: 'text',
        message: 'Dhanyavaad! Hamari admission team aapse jald contact karegi.',
        next: null,
        saveAs: '',
        options: [],
      },
    ]);
    setErrorMsg(null);
  };

  const closeEditor = () => {
    setEditingFlowId(null);
    setIsCreatingNew(false);
    setErrorMsg(null);
  };

  // Step List Modifiers
  const handleAddStep = () => {
    const nextIndex = stepsList.length + 1;
    const newKey = `step_${nextIndex}`;
    setStepsList((prev) => [
      ...prev,
      {
        key: newKey,
        type: 'text',
        message: 'Aapka agla sawal ya message yahan likhein...',
        next: null,
        saveAs: '',
        options: [],
      },
    ]);
  };

  const handleDeleteStep = (index: number) => {
    if (stepsList.length <= 1) {
      alert('A flow must have at least 1 step.');
      return;
    }
    const removedKey = stepsList[index].key;
    const updated = stepsList.filter((_, i) => i !== index);
    setStepsList(updated);
    if (startStepKey === removedKey && updated.length > 0) {
      setStartStepKey(updated[0].key);
    }
  };

  const handleDuplicateStep = (index: number) => {
    const src = stepsList[index];
    const newKey = `${src.key}_copy`;
    const newStep: EditableStep = {
      ...src,
      key: newKey,
      options: src.options.map((o) => ({ ...o })),
    };
    const updated = [...stepsList];
    updated.splice(index + 1, 0, newStep);
    setStepsList(updated);
  };

  const handleUpdateStep = (index: number, updates: Partial<EditableStep>) => {
    setStepsList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleAddOption = (stepIndex: number) => {
    const step = stepsList[stepIndex];
    if (step.type === 'button' && step.options.length >= 3) {
      alert('WhatsApp allows max 3 buttons. Use "List Question" for up to 10 options.');
      return;
    }
    if (step.type === 'list' && step.options.length >= 10) {
      alert('WhatsApp allows max 10 options in a List message.');
      return;
    }

    const optIndex = step.options.length + 1;
    const newOpt = {
      label: `Option ${optIndex}`,
      value: `option_${optIndex}`,
      next: null,
    };
    handleUpdateStep(stepIndex, {
      options: [...step.options, newOpt],
    });
  };

  const handleUpdateOption = (
    stepIndex: number,
    optIndex: number,
    field: string,
    val: string | null
  ) => {
    const step = stepsList[stepIndex];
    const newOpts = [...step.options];
    newOpts[optIndex] = { ...newOpts[optIndex], [field]: val };
    handleUpdateStep(stepIndex, { options: newOpts });
  };

  const handleRemoveOption = (stepIndex: number, optIndex: number) => {
    const step = stepsList[stepIndex];
    const newOpts = step.options.filter((_, i) => i !== optIndex);
    handleUpdateStep(stepIndex, { options: newOpts });
  };

  // Convert editor state to Firestore document structure
  const buildFlowDocument = () => {
    if (!flowName.trim()) {
      throw new Error('Please enter a Flow Name.');
    }

    // Ensure unique step keys
    const keys = stepsList.map((s) => s.key.trim());
    const duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate step IDs found: ${duplicates.join(', ')}. Each step ID must be unique.`);
    }

    const stepsObj: Record<string, FlowStep> = {};
    stepsList.forEach((s) => {
      const cleanKey = s.key.trim() || 'step';
      if (s.type === 'text') {
        stepsObj[cleanKey] = {
          type: 'text',
          message: s.message.trim(),
          next: s.next || null,
        };
      } else if (s.type === 'button') {
        stepsObj[cleanKey] = {
          type: 'button',
          message: s.message.trim(),
          saveAs: s.saveAs.trim() || undefined,
          options: s.options.map((o) => ({
            label: o.label.trim(),
            value: o.value.trim() || o.label.trim(),
            next: o.next || null,
          })),
        };
      } else if (s.type === 'list') {
        stepsObj[cleanKey] = {
          type: 'list',
          message: s.message.trim(),
          saveAs: s.saveAs.trim() || undefined,
          options: s.options.map((o) => ({
            label: o.label.trim(),
            value: o.value.trim() || o.label.trim(),
            next: o.next || null,
          })),
        };
      }
    });

    const start = stepsList.some((s) => s.key === startStepKey)
      ? startStepKey
      : stepsList[0]?.key || 'welcome';

    return {
      name: flowName.trim(),
      trigger: triggerType,
      startStep: start,
      steps: stepsObj,
    };
  };

  const handleSaveFlow = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      const flowData = buildFlowDocument();

      if (isCreatingNew || !editingFlowId) {
        await addWhatsAppFlow(flowData);
      } else {
        await updateWhatsAppFlow(editingFlowId, flowData);
      }

      closeEditor();
    } catch (err: any) {
      console.error('Error saving flow:', err);
      setErrorMsg(err.message || 'Failed to save flow.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFlow = async (flowId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the flow "${name}"?`)) {
      try {
        await deleteWhatsAppFlow(flowId);
        if (editingFlowId === flowId) {
          closeEditor();
        }
      } catch (e) {
        console.error('Failed to delete flow:', e);
        alert('Failed to delete flow.');
      }
    }
  };

  // Compile live preview object for side simulator
  const livePreviewFlow = {
    name: flowName || 'Live Preview Flow',
    trigger: triggerType,
    startStep: startStepKey,
    steps: stepsList.reduce((acc, s) => {
      acc[s.key] = {
        type: s.type,
        message: s.message,
        next: s.next,
        saveAs: s.saveAs,
        options: s.options,
      };
      return acc;
    }, {} as Record<string, FlowStep>),
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls (if in list view) */}
      {!editingFlowId && !isCreatingNew && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-teal-400" />
              <span>Interactive Chatbot Automation Flows</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Build sequential question-and-answer trees with interactive buttons and lead variable capture for WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenNewFlow}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Flow</span>
          </button>
        </div>
      )}

      {/* 1. LIST VIEW OF FLOWS */}
      {!editingFlowId && !isCreatingNew && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {flows.map((flow) => {
            const stepCount = Object.keys(flow.steps || {}).length;
            const startStep = flow.startStep && flow.steps?.[flow.startStep];

            return (
              <div
                key={flow.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-teal-400 shrink-0">
                        <GitBranch className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-teal-300 transition-colors line-clamp-1">
                          {flow.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {flow.id.slice(0, 10)}...
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        flow.trigger === 'new_lead'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : flow.trigger === 'keyword'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {flow.trigger === 'new_lead'
                        ? 'New Lead'
                        : flow.trigger === 'keyword'
                        ? 'Keyword'
                        : 'Manual'}
                    </span>
                  </div>

                  {/* Flow Summary Details */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Total Steps:</span>
                      <strong className="text-slate-200 font-mono">{stepCount} steps</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Start Step:</span>
                      <strong className="text-teal-400 font-mono">{flow.startStep || 'welcome'}</strong>
                    </div>
                    {startStep && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-2 pt-1 border-t border-slate-800/60">
                        "{startStep.message}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteFlow(flow.id, flow.name)}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-900/60 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openFlowEditor(flow)}
                    className="text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 px-3.5 py-1.5 rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Flow</span>
                  </button>
                </div>
              </div>
            );
          })}

          {flows.length === 0 && (
            <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <GitBranch className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-200">No WhatsApp Flows Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create automated WhatsApp conversational trees with interactive buttons to qualify leads 24x7.
              </p>
              <button
                type="button"
                onClick={handleOpenNewFlow}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Flow</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. FLOW EDITOR (Sequential Step Builder + Live Interactive Preview) */}
      {(editingFlowId || isCreatingNew) && (
        <div className="space-y-6">
          {/* Editor Action Top Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Back to Flows"
              >
                <X className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{isCreatingNew ? 'Create New WhatsApp Flow' : `Editing: ${flowName}`}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Configure flow details on the left, live test simulated interactions on the right.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={closeEditor}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveFlow}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Flow...' : 'Save Flow'}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3.5 text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Editor 2-Column Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form & Sequential Steps List (7 Cols) */}
            <div className="xl:col-span-7 space-y-5">
              {/* Flow Meta Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Flow Settings
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  {/* Flow Name */}
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Flow Name *
                    </label>
                    <input
                      type="text"
                      value={flowName}
                      onChange={(e) => setFlowName(e.target.value)}
                      placeholder="e.g. New Lead Qualification"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 font-medium"
                    />
                  </div>

                  {/* Trigger Type */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Trigger *
                    </label>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value as FlowTriggerType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
                    >
                      <option value="new_lead">New Lead</option>
                      <option value="keyword">Keyword Match</option>
                      <option value="manual">Manual / API</option>
                    </select>
                  </div>

                  {/* Start Step */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Starting Step *
                    </label>
                    <select
                      value={startStepKey}
                      onChange={(e) => setStartStepKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-teal-300 focus:outline-none focus:border-teal-500 font-mono font-bold"
                    >
                      {stepsList.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.key} ({s.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sequential Steps Container */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    <span>Sequential Steps ({stepsList.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Form-based steps executed in order or branching via buttons
                  </span>
                </div>

                {stepsList.map((step, sIndex) => {
                  const isStart = step.key === startStepKey;

                  return (
                    <div
                      key={sIndex}
                      className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all space-y-4 ${
                        activePreviewStep === step.key
                          ? 'border-teal-500/80 ring-1 ring-teal-500/50'
                          : isStart
                          ? 'border-emerald-800/80 bg-slate-900/95'
                          : 'border-slate-800'
                      }`}
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-teal-400 font-bold text-xs flex items-center justify-center font-mono">
                            {sIndex + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] font-mono text-slate-400">Step ID:</label>
                            <input
                              type="text"
                              value={step.key}
                              onChange={(e) => handleUpdateStep(sIndex, { key: e.target.value.replace(/\s+/g, '_') })}
                              className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-teal-300 font-mono font-bold w-28 focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          {isStart && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              START STEP
                            </span>
                          )}
                        </div>

                        {/* Step Card Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateStep(sIndex)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate Step"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(sIndex)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/50 hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer"
                            title="Delete Step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Step Type Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-300">Step Type:</span>
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateStep(sIndex, { type: 'text' })}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              step.type === 'text'
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Text Message</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateStep(sIndex, {
                                type: 'button',
                                options:
                                  step.options.length > 0
                                    ? step.options.slice(0, 3)
                                    : [
                                        { label: 'Yes', value: 'yes', next: null },
                                        { label: 'No', value: 'no', next: null },
                                      ],
                              });
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              step.type === 'button'
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Radio className="w-3 h-3" />
                            <span>Button Question (Max 3)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateStep(sIndex, {
                                type: 'list',
                                options:
                                  step.options.length > 0
                                    ? step.options
                                    : [
                                        { label: 'Option A', value: 'opt_a', next: null },
                                        { label: 'Option B', value: 'opt_b', next: null },
                                      ],
                              });
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              step.type === 'list'
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <List className="w-3 h-3" />
                            <span>List Question (Max 10)</span>
                          </button>
                        </div>
                      </div>

                      {/* Message Text Input */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Message Body (Sent to User) *
                        </label>
                        <textarea
                          rows={3}
                          value={step.message}
                          onChange={(e) => handleUpdateStep(sIndex, { message: e.target.value })}
                          placeholder="Type your WhatsApp message here. E.g. Namaste! Tech Lab Academy me aapka swagat hai..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 resize-y leading-relaxed font-normal"
                        />
                      </div>

                      {/* If Text Message: Next Step picker */}
                      {step.type === 'text' && (
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <CornerDownRight className="w-3.5 h-3.5 text-teal-400" />
                            <span>Next Step After Message:</span>
                          </span>
                          <select
                            value={step.next || ''}
                            onChange={(e) =>
                              handleUpdateStep(sIndex, { next: e.target.value ? e.target.value : null })
                            }
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-teal-300 font-mono font-semibold focus:outline-none focus:border-teal-500"
                          >
                            <option value="">-- End of Flow (None) --</option>
                            {stepsList
                              .filter((s) => s.key !== step.key)
                              .map((s) => (
                                <option key={s.key} value={s.key}>
                                  {`→ Jump to ${s.key} (${s.type})`}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {/* If Button or List Question: saveAs + Options List */}
                      {(step.type === 'button' || step.type === 'list') && (
                        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                          {/* saveAs Field */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                            <div>
                              <label className="block text-xs font-bold text-slate-200">
                                Save Answer to CRM Lead Field:
                              </label>
                              <span className="text-[11px] text-slate-400">
                                Selected value will be captured in Lead document (e.g. <code className="text-teal-400 font-mono">has_editing_experience</code>, <code className="text-teal-400 font-mono">class_mode</code>)
                              </span>
                            </div>
                            <input
                              type="text"
                              value={step.saveAs}
                              onChange={(e) => handleUpdateStep(sIndex, { saveAs: e.target.value.replace(/\s+/g, '_') })}
                              placeholder="e.g. class_mode"
                              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-teal-300 font-mono font-bold w-full sm:w-52 focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          {/* Options Warning for WhatsApp Limits */}
                          {step.type === 'button' && step.options.length >= 3 && (
                            <div className="bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                              <span>
                                WhatsApp allows max 3 buttons per message. Use <strong>List Question</strong> for more options.
                              </span>
                            </div>
                          )}

                          {/* Options Editor Rows */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300">
                                {step.type === 'button' ? 'Buttons (Max 3)' : 'List Items (Max 10)'}
                              </span>
                              <button
                                type="button"
                                disabled={
                                  (step.type === 'button' && step.options.length >= 3) ||
                                  (step.type === 'list' && step.options.length >= 10)
                                }
                                onClick={() => handleAddOption(sIndex)}
                                className="text-xs text-teal-400 hover:text-teal-300 font-semibold px-2 py-1 bg-teal-950/60 border border-teal-800/80 rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Option</span>
                              </button>
                            </div>

                            {step.options.map((opt, oIndex) => (
                              <div
                                key={oIndex}
                                className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                              >
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={opt.label}
                                    onChange={(e) =>
                                      handleUpdateOption(sIndex, oIndex, 'label', e.target.value)
                                    }
                                    placeholder="Option Label (e.g. Yes / No / Premiere Pro)"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-teal-500"
                                  />
                                </div>

                                <div className="w-full sm:w-36">
                                  <input
                                    type="text"
                                    value={opt.value}
                                    onChange={(e) =>
                                      handleUpdateOption(sIndex, oIndex, 'value', e.target.value)
                                    }
                                    placeholder="Value"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-teal-500"
                                  />
                                </div>

                                <div className="w-full sm:w-44 flex items-center gap-1.5">
                                  <select
                                    value={opt.next || ''}
                                    onChange={(e) =>
                                      handleUpdateOption(
                                        sIndex,
                                        oIndex,
                                        'next',
                                        e.target.value ? e.target.value : null
                                      )
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-teal-300 font-mono font-semibold focus:outline-none focus:border-teal-500"
                                  >
                                    <option value="">-- End of Flow --</option>
                                    {stepsList
                                      .filter((s) => s.key !== step.key)
                                      .map((s) => (
                                        <option key={s.key} value={s.key}>
                                          {`→ ${s.key}`}
                                        </option>
                                      ))}
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(sIndex, oIndex)}
                                    className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title="Remove Option"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Step Button */}
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="w-full py-3 border-2 border-dashed border-slate-800 hover:border-teal-500/50 rounded-2xl text-xs font-bold text-teal-400 hover:text-teal-300 bg-slate-900/50 hover:bg-slate-900 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Next Step</span>
                </button>
              </div>
            </div>

            {/* Right Column: Interactive WhatsApp Chat Simulator (5 Cols Sticky) */}
            <div className="xl:col-span-5 sticky top-6">
              <WhatsAppChatPreview
                flow={livePreviewFlow}
                highlightStepId={activePreviewStep}
                onSelectStep={(stepId) => setActivePreviewStep(stepId)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
