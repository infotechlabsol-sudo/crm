import React, { useState, useEffect } from 'react';
import { WhatsAppFlow, FlowStep } from '../../types';
import {
  RotateCcw,
  CheckCheck,
  Sparkles,
  Smartphone,
  ChevronRight,
  Send,
  MessageSquare,
  List,
} from 'lucide-react';

interface WhatsAppChatPreviewProps {
  flow: WhatsAppFlow | {
    name: string;
    trigger: string;
    startStep: string;
    steps: Record<string, FlowStep>;
  };
  highlightStepId?: string;
  onSelectStep?: (stepId: string) => void;
}

interface SimulatedMessage {
  id: string;
  sender: 'bot' | 'user';
  stepId?: string;
  text: string;
  type?: 'text' | 'button' | 'list';
  options?: { label: string; value: string; next: string | null }[];
  saveAs?: string;
  selectedOption?: string;
  timestamp: string;
}

export const WhatsAppChatPreview: React.FC<WhatsAppChatPreviewProps> = ({
  flow,
  highlightStepId,
  onSelectStep,
}) => {
  const [history, setHistory] = useState<SimulatedMessage[]>([]);
  const [currentStepKey, setCurrentStepKey] = useState<string | null>(null);
  const [capturedVariables, setCapturedVariables] = useState<Record<string, string>>({});
  const [showListSheet, setShowListSheet] = useState<{
    stepId: string;
    title: string;
    options: { label: string; value: string; next: string | null }[];
    saveAs?: string;
  } | null>(null);

  // Initialize simulation when flow or startStep changes
  const resetSimulation = () => {
    setCapturedVariables({});
    setShowListSheet(null);
    const startKey = flow.startStep || Object.keys(flow.steps)[0];
    if (!startKey || !flow.steps[startKey]) {
      setHistory([]);
      setCurrentStepKey(null);
      return;
    }

    const firstStep = flow.steps[startKey];
    const initialMsg: SimulatedMessage = {
      id: 'msg_0_' + Date.now(),
      sender: 'bot',
      stepId: startKey,
      text: firstStep.message || '...',
      type: firstStep.type,
      options: firstStep.options,
      saveAs: firstStep.saveAs,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory([initialMsg]);
    setCurrentStepKey(startKey);
  };

  useEffect(() => {
    resetSimulation();
  }, [flow.name, flow.startStep, JSON.stringify(flow.steps)]);

  // Handle user clicking an option in the simulation
  const handleOptionClick = (
    label: string,
    value: string,
    nextStepKey: string | null,
    saveAs?: string
  ) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (saveAs) {
      setCapturedVariables((prev) => ({ ...prev, [saveAs]: label }));
    }

    // Add user response bubble
    const userMsg: SimulatedMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: label,
      timestamp: timeNow,
    };

    // If next step exists
    if (nextStepKey && flow.steps[nextStepKey]) {
      const nextStep = flow.steps[nextStepKey];
      const botMsg: SimulatedMessage = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        stepId: nextStepKey,
        text: nextStep.message || '...',
        type: nextStep.type,
        options: nextStep.options,
        saveAs: nextStep.saveAs,
        timestamp: timeNow,
      };

      setHistory((prev) => [...prev, userMsg, botMsg]);
      setCurrentStepKey(nextStepKey);
    } else {
      setHistory((prev) => [...prev, userMsg]);
      setCurrentStepKey(null);
    }

    setShowListSheet(null);
  };

  const stepKeys = Object.keys(flow.steps);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Simulator Top Header Controls */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">Interactive WhatsApp Preview</span>
        </div>
        <button
          type="button"
          onClick={resetSimulation}
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700/80 transition-all cursor-pointer font-medium"
          title="Restart Conversation Simulator"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restart</span>
        </button>
      </div>

      {/* Simulated Phone Shell */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative overflow-hidden">
        {/* WhatsApp App Bar */}
        <div className="bg-[#1f2c34] px-3.5 py-2.5 flex items-center justify-between border-b border-[#2a3942] z-10 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              TL
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-100">Tech Lab Academy</span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 text-[8px] text-slate-950 font-bold flex items-center justify-center">
                  ✓
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-medium">WhatsApp Verified Business</p>
            </div>
          </div>

          <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded font-mono">
            {stepKeys.length} steps
          </span>
        </div>

        {/* Date Divider Chip */}
        <div className="flex justify-center my-2.5 z-10">
          <span className="bg-[#182229] text-[#8696a0] text-[10px] font-medium px-2.5 py-0.5 rounded-md shadow-sm">
            TODAY
          </span>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 z-10">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">Add steps to this flow to test the live chat preview</p>
            </div>
          ) : (
            history.map((msg, index) => {
              const isLast = index === history.length - 1;
              const isHighlighted = msg.stepId && msg.stepId === highlightStepId;

              if (msg.sender === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-[#005c4b] text-white rounded-lg rounded-tr-none px-3 py-1.5 max-w-[82%] shadow-sm text-xs space-y-1">
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696a0]">
                        <span>{msg.timestamp}</span>
                        <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                      </div>
                    </div>
                  </div>
                );
              }

              // Bot message bubble
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col items-start space-y-1.5 transition-all ${
                    isHighlighted ? 'ring-2 ring-emerald-400 rounded-lg p-0.5' : ''
                  }`}
                >
                  {/* Step ID tag */}
                  {msg.stepId && (
                    <div
                      onClick={() => onSelectStep && onSelectStep(msg.stepId!)}
                      className="text-[9px] font-mono text-teal-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer hover:border-teal-500/50"
                      title="Click to jump to this step in editor"
                    >
                      <span>Step: {msg.stepId}</span>
                      {onSelectStep && <ChevronRight className="w-2.5 h-2.5" />}
                    </div>
                  )}

                  {/* WhatsApp Bot Message Container */}
                  <div className="bg-[#202c33] text-slate-100 rounded-lg rounded-tl-none p-2.5 max-w-[88%] shadow-sm text-xs space-y-2 border border-[#2a3942]">
                    <p className="leading-relaxed whitespace-pre-wrap text-slate-100 font-normal">
                      {msg.text}
                    </p>

                    <div className="flex items-center justify-end text-[9px] text-[#8696a0] pt-0.5">
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Interactive Buttons (max 3) */}
                    {msg.type === 'button' && msg.options && msg.options.length > 0 && (
                      <div className="pt-1 border-t border-[#2a3942] space-y-1.5">
                        {msg.options.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={!isLast}
                            onClick={() =>
                              handleOptionClick(opt.label, opt.value, opt.next, msg.saveAs)
                            }
                            className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                              isLast
                                ? 'bg-[#00a884] hover:bg-[#02be96] text-[#111b21] active:scale-[0.98] cursor-pointer shadow'
                                : 'bg-[#182229] text-slate-400 cursor-not-allowed border border-[#2a3942]'
                            }`}
                          >
                            <span>{opt.label || `Option ${i + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Interactive List Question (Menu button) */}
                    {msg.type === 'list' && msg.options && msg.options.length > 0 && (
                      <div className="pt-1 border-t border-[#2a3942]">
                        <button
                          type="button"
                          disabled={!isLast}
                          onClick={() =>
                            setShowListSheet({
                              stepId: msg.stepId || '',
                              title: 'Select an Option',
                              options: msg.options || [],
                              saveAs: msg.saveAs,
                            })
                          }
                          className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                            isLast
                              ? 'bg-[#00a884] hover:bg-[#02be96] text-[#111b21] cursor-pointer shadow'
                              : 'bg-[#182229] text-slate-400 cursor-not-allowed border border-[#2a3942]'
                          }`}
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>View Menu ({msg.options.length} options)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* End of Flow Note */}
          {history.length > 0 && currentStepKey === null && (
            <div className="flex justify-center my-3">
              <span className="bg-slate-900/80 border border-slate-800 text-teal-300 text-[10px] font-semibold px-3 py-1 rounded-full shadow">
                ✓ Flow Completed
              </span>
            </div>
          )}
        </div>

        {/* Captured Variables Chip Footer */}
        {Object.keys(capturedVariables).length > 0 && (
          <div className="bg-[#111b21] border-t border-[#222d34] px-3 py-1.5 z-10">
            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
              Captured Field Answers:
            </span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(capturedVariables).map(([key, val]) => (
                <span
                  key={key}
                  className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded font-mono"
                >
                  <strong>{key}:</strong> {val}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp Fake Chat Input Bar */}
        <div className="bg-[#202c33] px-3 py-2 border-t border-[#2a3942] flex items-center gap-2 z-10">
          <div className="flex-1 bg-[#2a3942] text-slate-400 text-xs px-3 py-1.5 rounded-full select-none">
            Interactive buttons trigger the responses above...
          </div>
          <div className="w-8 h-8 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shrink-0">
            <Send className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Simulated List Options Sheet Modal */}
        {showListSheet && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col justify-end z-30 animate-fadeIn">
            <div className="bg-[#1f2c34] rounded-t-2xl border-t border-[#2a3942] p-4 max-h-[70%] overflow-y-auto space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#2a3942]">
                <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <List className="w-3.5 h-3.5 text-[#00a884]" />
                  <span>{showListSheet.title}</span>
                </h5>
                <button
                  type="button"
                  onClick={() => setShowListSheet(null)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-1.5">
                {showListSheet.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      handleOptionClick(opt.label, opt.value, opt.next, showListSheet.saveAs)
                    }
                    className="w-full text-left p-2.5 rounded-lg bg-[#2a3942] hover:bg-[#00a884] hover:text-[#111b21] text-xs text-slate-200 transition-all font-medium flex items-center justify-between group cursor-pointer"
                  >
                    <span>{opt.label || `Option ${i + 1}`}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-900 font-mono">
                      {opt.next ? `-> ${opt.next}` : '-> End'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
