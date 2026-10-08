import React, { useState, useEffect } from 'react';
import {
  WhatsAppDripCampaign,
  DripStep,
  DripAudienceFilter,
} from '../../types';
import {
  subscribeToWhatsAppDripCampaigns,
  addWhatsAppDripCampaign,
  updateWhatsAppDripCampaign,
  toggleWhatsAppDripCampaignActive,
  deleteWhatsAppDripCampaign,
} from '../../lib/storage';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Save,
  X,
  Filter,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sparkles,
  Users,
  Search,
} from 'lucide-react';

interface WhatsAppDripCampaignsSectionProps {
  initialCampaigns?: WhatsAppDripCampaign[];
}

export const WhatsAppDripCampaignsSection: React.FC<WhatsAppDripCampaignsSectionProps> = ({
  initialCampaigns = [],
}) => {
  const [campaigns, setCampaigns] = useState<WhatsAppDripCampaign[]>(initialCampaigns);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<WhatsAppDripCampaign | null>(null);

  // Form states
  const [campaignName, setCampaignName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterClassMode, setFilterClassMode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMinScore, setFilterMinScore] = useState<number | ''>('');
  const [filterSource, setFilterSource] = useState('');
  const [steps, setSteps] = useState<DripStep[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    const unsub = subscribeToWhatsAppDripCampaigns((data) => {
      setCampaigns(data);
    });
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setEditingCampaign(null);
    setCampaignName('Video Editing 7-Day Nurture Campaign');
    setIsActive(true);
    setFilterCourse('');
    setFilterClassMode('');
    setFilterStatus('');
    setFilterMinScore('');
    setFilterSource('');
    setSteps([
      {
        day: 0,
        message: 'Namaste {{name}}! Tech Lab Academy me video editing batch ke bare me jaanane ke liye dhanyavaad. Kya aapne hamara course syllabus download kiya?',
      },
      {
        day: 2,
        message: 'Hello {{name}}! Hamare students ke latest video editing projects yahan dekhein: https://techlabacademy.com/showcase. Kya aap demo class me attend karna chahte hain?',
      },
      {
        day: 5,
        message: 'Hey {{name}}! Agle Monday se Raipur batch me limited 5 seats baaki hain. Kya aapki seat reserve karein?',
      },
    ]);
    setShowModal(true);
  };

  const openEditModal = (camp: WhatsAppDripCampaign) => {
    setEditingCampaign(camp);
    setCampaignName(camp.name);
    setIsActive(camp.active);
    setFilterCourse(camp.audienceFilter.courseInterest || '');
    setFilterClassMode(camp.audienceFilter.classMode || '');
    setFilterStatus(camp.audienceFilter.status || '');
    setFilterMinScore(camp.audienceFilter.minLeadScore ?? '');
    setFilterSource(camp.audienceFilter.source || '');
    setSteps(
      camp.steps && camp.steps.length > 0
        ? camp.steps.map((s) => ({ ...s }))
        : [{ day: 0, message: '' }]
    );
    setShowModal(true);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await toggleWhatsAppDripCampaignActive(id, !current);
    } catch (e) {
      console.error('Failed to toggle drip campaign status:', e);
      alert('Failed to update campaign status in Firestore.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete drip campaign "${name}"?`)) {
      try {
        await deleteWhatsAppDripCampaign(id);
      } catch (e) {
        console.error('Failed to delete campaign:', e);
        alert('Failed to delete campaign.');
      }
    }
  };

  const handleAddStep = () => {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
    setSteps((prev) => [...prev, { day: lastDay + 2, message: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      alert('A campaign must have at least 1 day step.');
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStep = (index: number, field: 'day' | 'message', val: any) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleInsertVariable = (stepIndex: number, placeholder: string) => {
    const current = steps[stepIndex].message;
    handleUpdateStep(stepIndex, 'message', current + (current ? ' ' : '') + placeholder);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    const validSteps = steps
      .filter((s) => s.message.trim().length > 0)
      .sort((a, b) => a.day - b.day);

    if (validSteps.length === 0) {
      alert('Please provide at least one message for a day step.');
      return;
    }

    const audienceFilter: DripAudienceFilter = {};
    if (filterCourse) audienceFilter.courseInterest = filterCourse;
    if (filterClassMode) audienceFilter.classMode = filterClassMode;
    if (filterStatus) audienceFilter.status = filterStatus;
    if (filterMinScore !== '') audienceFilter.minLeadScore = Number(filterMinScore);
    if (filterSource) audienceFilter.source = filterSource;

    setIsSubmitting(true);
    try {
      if (editingCampaign) {
        await updateWhatsAppDripCampaign(editingCampaign.id, {
          name: campaignName.trim(),
          active: isActive,
          audienceFilter,
          steps: validSteps,
        });
      } else {
        await addWhatsAppDripCampaign({
          name: campaignName.trim(),
          active: isActive,
          audienceFilter,
          steps: validSteps,
        });
      }
      setShowModal(false);
    } catch (e) {
      console.error('Failed to save drip campaign:', e);
      alert('Failed to save drip campaign to Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Automated WhatsApp Drip Campaigns</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Scheduled multi-day follow-up messaging sequences that automatically nurture interested leads based on audience filters.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-950/40 flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Drip Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCampaigns.map((camp) => {
          const stepCount = camp.steps?.length || 0;
          const maxDay =
            camp.steps && camp.steps.length > 0
              ? Math.max(...camp.steps.map((s) => s.day))
              : 0;

          return (
            <div
              key={camp.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group"
            >
              <div className="space-y-3.5">
                {/* Header & Toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-teal-300 transition-colors line-clamp-1">
                        {camp.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {stepCount} message {stepCount === 1 ? 'step' : 'steps'} over {maxDay + 1} days
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(camp.id, camp.active)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      camp.active ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                    title={camp.active ? 'Active (Click to pause)' : 'Paused (Click to activate)'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                        camp.active ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Audience Filter Tags */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Target Audience Filters:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {camp.audienceFilter.courseInterest ? (
                      <span className="bg-teal-950/80 text-teal-300 border border-teal-800/80 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Course: {camp.audienceFilter.courseInterest}
                      </span>
                    ) : null}

                    {camp.audienceFilter.classMode ? (
                      <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Mode: {camp.audienceFilter.classMode}
                      </span>
                    ) : null}

                    {camp.audienceFilter.status ? (
                      <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Status: {camp.audienceFilter.status}
                      </span>
                    ) : null}

                    {camp.audienceFilter.minLeadScore !== undefined ? (
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Min Score: {camp.audienceFilter.minLeadScore}
                      </span>
                    ) : null}

                    {!camp.audienceFilter.courseInterest &&
                      !camp.audienceFilter.classMode &&
                      !camp.audienceFilter.status &&
                      camp.audienceFilter.minLeadScore === undefined && (
                        <span className="text-slate-500 italic text-[11px]">
                          All active leads
                        </span>
                      )}
                  </div>
                </div>

                {/* Step Timeline Pills */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Scheduled Sequence:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {camp.steps?.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-2 py-1 text-[11px] text-slate-300 font-mono flex items-center gap-1"
                        title={step.message}
                      >
                        <Calendar className="w-3 h-3 text-teal-400" />
                        <span>Day {step.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(camp.id, camp.name)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-900/60 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(camp)}
                  className="text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 rounded-lg shadow flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Campaign</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredCampaigns.length === 0 && (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Clock className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No Drip Campaigns Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Create scheduled multi-day drip campaigns to nurture prospective students automatically.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Drip Campaign</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Create/Edit Drip Campaign */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{editingCampaign ? 'Edit Drip Campaign' : 'New Drip Sequence Campaign'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Video Editing Nurture (7 Days)"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>

              {/* Target Audience Filters */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-teal-400" />
                    <span>Audience Filter Criteria (Optional)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Leave blank to target all leads</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Course Interest</label>
                    <select
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">All Courses</option>
                      <option value="Video Editing">Video Editing</option>
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="Animation">Animation</option>
                      <option value="VFX">VFX</option>
                      <option value="Full Stack Development">Full Stack Development</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Class Mode</label>
                    <select
                      value={filterClassMode}
                      onChange={(e) => setFilterClassMode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">All Modes</option>
                      <option value="Offline">Offline</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Lead Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">Any Status</option>
                      <option value="New Lead">New Lead</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Demo Scheduled">Demo Scheduled</option>
                      <option value="Visited">Visited</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Minimum Lead Score</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={filterMinScore}
                      onChange={(e) =>
                        setFilterMinScore(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="e.g. 50"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Day Steps Sequence Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" />
                    <span>Drip Sequence Steps</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold px-2.5 py-1 bg-teal-950/60 border border-teal-800/80 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Day Step</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">Send on:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-teal-400 font-bold font-mono">Day</span>
                            <input
                              type="number"
                              min={0}
                              max={90}
                              value={step.day}
                              onChange={(e) =>
                                handleUpdateStep(idx, 'day', parseInt(e.target.value, 10) || 0)
                              }
                              className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                            />
                            <span className="text-[11px] text-slate-500 font-normal">
                              ({step.day === 0 ? 'Immediately upon enrollment' : `${step.day} days later`})
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 text-rose-400 hover:text-rose-300 bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="Remove Step"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Message Textarea */}
                      <div>
                        <textarea
                          rows={3}
                          value={step.message}
                          onChange={(e) => handleUpdateStep(idx, 'message', e.target.value)}
                          placeholder="Type WhatsApp message for this day..."
                          required
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 leading-relaxed font-normal"
                        />

                        {/* Quick Variable Insert Chips */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-medium">
                            Insert variable:
                          </span>
                          {['{{name}}', '{{course_interest}}', '{{phone}}', '{{batch}}'].map(
                            (v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => handleInsertVariable(idx, v)}
                                className="text-[10px] bg-slate-900 hover:bg-teal-950 text-teal-400 hover:text-teal-300 border border-slate-800 hover:border-teal-700 px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer"
                              >
                                {v}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Campaign Active
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Your backend scheduler delivers messages to matched leads
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
                  <Save className="w-4 h-4" />
                  <span>{editingCampaign ? 'Update Campaign' : 'Save Campaign'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
