import React, { useState } from 'react';
import {
  CustomForm,
  FormFieldDefinition,
  FormFieldType,
  CRMSettings,
} from '../types';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Save,
  Eye,
  Edit3,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface FormBuilderModalProps {
  initialForm?: CustomForm | null;
  settings: CRMSettings;
  onClose: () => void;
  onSave: (formData: Omit<CustomForm, 'id'>, existingId?: string) => Promise<void>;
}

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  initialForm,
  settings,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(initialForm);

  // Form Meta
  const [formName, setFormName] = useState(initialForm?.form_name || '');
  const [formTitle, setFormTitle] = useState(
    initialForm?.form_title || 'Book Your Free Demo Class'
  );
  const [formDescription, setFormDescription] = useState(
    initialForm?.form_description ||
      'Fill in your details below to schedule your demo class with Tech Lab Academy experts.'
  );
  const [active, setActive] = useState(initialForm ? initialForm.active : true);

  // Fields list
  const [fields, setFields] = useState<FormFieldDefinition[]>(() => {
    if (initialForm && initialForm.fields && initialForm.fields.length > 0) {
      return JSON.parse(JSON.stringify(initialForm.fields));
    }
    // Default starter fields
    return [
      {
        field_id: 'name',
        label: 'Full Name',
        field_type: 'text',
        required: true,
        placeholder: 'Enter your full name',
      },
      {
        field_id: 'phone',
        label: 'Phone / WhatsApp Number',
        field_type: 'phone',
        required: true,
        placeholder: '10-digit mobile number',
      },
      {
        field_id: 'email',
        label: 'Email Address',
        field_type: 'email',
        required: false,
        placeholder: 'name@example.com',
      },
      {
        field_id: 'course_interest',
        label: 'Course Interest',
        field_type: 'dropdown',
        required: true,
        options:
          settings.courses && settings.courses.length > 0
            ? [...settings.courses]
            : [
                'Full Video Editor Roadmap 365-day',
                'Premiere Pro',
                'After Effects',
                'Photoshop',
                'GenAI Tools',
              ],
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<'builder' | 'preview'>('builder');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  // Helper to generate a clean field_id from label
  const generateFieldId = (label: string): string => {
    const base = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const id = base || 'field_' + Math.random().toString(36).substring(2, 6);
    // Ensure uniqueness
    let candidate = id;
    let count = 1;
    while (fields.some((f) => f.field_id === candidate)) {
      candidate = `${id}_${count}`;
      count++;
    }
    return candidate;
  };

  // Add new blank field
  const handleAddNewField = (
    preset?: Partial<FormFieldDefinition>
  ) => {
    const label = preset?.label || 'New Field';
    const fieldId = preset?.field_id || generateFieldId(label);
    const newField: FormFieldDefinition = {
      field_id: fieldId,
      label,
      field_type: preset?.field_type || 'text',
      required: preset?.required !== undefined ? preset.required : false,
      placeholder: preset?.placeholder || '',
      options: preset?.options ? [...preset.options] : preset?.field_type === 'dropdown' || preset?.field_type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFields((prev) => [...prev, newField]);
  };

  // Quick preset additions
  const handleAddPreset = (presetType: 'name' | 'phone' | 'email' | 'course' | 'class_mode' | 'date' | 'experience' | 'custom_text') => {
    if (presetType === 'name') {
      handleAddNewField({
        field_id: 'name',
        label: 'Full Name',
        field_type: 'text',
        required: true,
        placeholder: 'Enter your full name',
      });
    } else if (presetType === 'phone') {
      handleAddNewField({
        field_id: 'phone',
        label: 'Phone / WhatsApp Number',
        field_type: 'phone',
        required: true,
        placeholder: '10-digit phone number',
      });
    } else if (presetType === 'email') {
      handleAddNewField({
        field_id: 'email',
        label: 'Email Address',
        field_type: 'email',
        required: false,
        placeholder: 'name@example.com',
      });
    } else if (presetType === 'course') {
      handleAddNewField({
        field_id: 'course_interest',
        label: 'Course of Interest',
        field_type: 'dropdown',
        required: true,
        options:
          settings.courses && settings.courses.length > 0
            ? [...settings.courses]
            : ['Premiere Pro', 'After Effects', 'Photoshop', 'Full Video Editor Roadmap 365-day'],
      });
    } else if (presetType === 'class_mode') {
      handleAddNewField({
        field_id: 'class_mode',
        label: 'Preferred Mode of Learning',
        field_type: 'radio',
        required: true,
        options: ['Offline (Raipur Campus)', 'Online Live Interactive'],
      });
    } else if (presetType === 'date') {
      handleAddNewField({
        field_id: 'preferred_date',
        label: 'Preferred Demo Date',
        field_type: 'date',
        required: false,
      });
    } else if (presetType === 'experience') {
      handleAddNewField({
        field_id: 'experience',
        label: 'Prior Editing Experience',
        field_type: 'radio',
        required: false,
        options: ['Beginner', 'Intermediate', 'Advanced'],
      });
    } else {
      handleAddNewField();
    }
  };

  // Field manipulation
  const handleUpdateField = (index: number, updates: Partial<FormFieldDefinition>) => {
    setFields((prev) => {
      const next = [...prev];
      const updated = { ...next[index], ...updates };

      // If switching to dropdown or radio, make sure options exist
      if (
        (updated.field_type === 'dropdown' || updated.field_type === 'radio') &&
        (!updated.options || updated.options.length === 0)
      ) {
        updated.options = ['Option 1', 'Option 2'];
      }

      next[index] = updated;
      return next;
    });
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    setFields((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Option management for dropdown/radio
  const handleAddOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const optionText = (newOptionInputs[field.field_id] || '').trim();
    if (!optionText) return;

    const currentOptions = field.options || [];
    if (!currentOptions.includes(optionText)) {
      handleUpdateField(fieldIndex, {
        options: [...currentOptions, optionText],
      });
    }

    setNewOptionInputs((prev) => ({ ...prev, [field.field_id]: '' }));
  };

  const handleRemoveOption = (fieldIndex: number, optionToRemove: string) => {
    const field = fields[fieldIndex];
    const currentOptions = field.options || [];
    handleUpdateField(fieldIndex, {
      options: currentOptions.filter((opt) => opt !== optionToRemove),
    });
  };

  // Handle Save
  const handleSaveForm = async () => {
    setErrorMessage('');
    if (!formName.trim()) {
      setErrorMessage('Please provide an internal Form Name (e.g., "Demo Class Signup").');
      return;
    }
    if (!formTitle.trim()) {
      setErrorMessage('Please provide a Form Title heading for visitors.');
      return;
    }
    if (fields.length === 0) {
      setErrorMessage('Please add at least one field to this form.');
      return;
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) {
        setErrorMessage(`Field #${i + 1} is missing a Label.`);
        return;
      }
      if (
        (f.field_type === 'dropdown' || f.field_type === 'radio') &&
        (!f.options || f.options.length === 0)
      ) {
        setErrorMessage(`Field "${f.label}" (${f.field_type}) requires at least one option.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          form_name: formName.trim(),
          form_title: formTitle.trim(),
          form_description: formDescription.trim(),
          fields,
          active,
          created_timestamp: initialForm?.created_timestamp || new Date().toISOString(),
          submission_count: initialForm?.submission_count || 0,
        },
        initialForm?.id
      );
      onClose();
    } catch (err: any) {
      console.error('Error saving form:', err);
      setErrorMessage(err.message || 'Failed to save form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800/80 flex items-center justify-center text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isEditing ? 'Edit Sharable Form' : 'Create New Sharable Form'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60">
                  Lead Capture
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Design custom public forms to collect student inquiries directly into your Lead Directory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="flex items-center p-1 bg-slate-800/90 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab('builder')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'builder'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Form Builder</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-950/80 border-b border-rose-800/60 text-rose-200 text-xs font-medium flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-400 hover:text-rose-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'builder' ? (
            <div className="space-y-6">
              {/* Form Settings Box */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>General Form Settings</span>
                  </h3>
                  <label className="flex items-center gap-2 text-xs text-slate-300 font-medium cursor-pointer">
                    <span>Active Status:</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-700"
                    />
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${active ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                      {active ? 'Active (Accepting Submissions)' : 'Inactive (Paused)'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Internal Form Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Demo Class Signup / Meta Summer Campaign"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Used as the "Source" for incoming leads in reports and filters.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Public Form Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Book Your Free Demo Class"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Shown as the main heading on the public form page.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Public Description / Subheading (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief explanation shown below the heading..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>One-Click Preset Fields:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddPreset('name')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Full Name (Required)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddPreset('phone')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Phone / WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddPreset('email')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Email Address</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddPreset('course')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Course Interest (Dropdown)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddPreset('class_mode')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Class Mode (Online/Offline)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddPreset('date')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Demo Date</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddPreset('experience')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-400" />
                    <span>Prior Experience (Radio)</span>
                  </button>
                </div>
              </div>

              {/* Form Fields Reorderable List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Form Fields ({fields.length})
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      (Drag/reorder fields with Up & Down arrows)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddNewField()}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-300">No fields added yet</p>
                    <p className="text-xs text-slate-500">
                      Click "Add Custom Field" or choose from the quick presets above to build your form.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      const hasOptions =
                        field.field_type === 'dropdown' || field.field_type === 'radio';

                      return (
                        <div
                          key={index}
                          className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 relative group transition-all hover:border-slate-700"
                        >
                          {/* Field top row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 text-[10px] font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-200">
                                {field.label || 'Untitled Field'}
                              </span>
                              {field.required && (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/50 border border-rose-900/60 px-1.5 py-0.2 rounded">
                                  Required
                                </span>
                              )}
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                Type: {field.field_type}
                              </span>
                            </div>

                            {/* Actions: Up, Down, Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveField(index, 'up')}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-800 transition-colors"
                                title="Move up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={index === fields.length - 1}
                                onClick={() => handleMoveField(index, 'down')}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-800 transition-colors"
                                title="Move down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveField(index)}
                                className="p-1 text-rose-400 hover:text-rose-200 rounded hover:bg-rose-950/40 transition-colors ml-1"
                                title="Delete field"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Field Configuration Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                            {/* Label */}
                            <div className="sm:col-span-1">
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Field Label <span className="text-rose-400">*</span>
                              </label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => {
                                  const newLabel = e.target.value;
                                  handleUpdateField(index, {
                                    label: newLabel,
                                    // If field_id is auto or unset, update it
                                    field_id: field.field_id || generateFieldId(newLabel),
                                  });
                                }}
                                placeholder="e.g. Full Name"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                              />
                            </div>

                            {/* Field Type */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Field Input Type
                              </label>
                              <select
                                value={field.field_type}
                                onChange={(e) =>
                                  handleUpdateField(index, {
                                    field_type: e.target.value as FormFieldType,
                                  })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                              >
                                <option value="text">Text (Single Line)</option>
                                <option value="phone">Phone Number</option>
                                <option value="email">Email Address</option>
                                <option value="dropdown">Dropdown Select</option>
                                <option value="radio">Radio Buttons (Single Choice)</option>
                                <option value="checkbox">Checkbox (Yes/No)</option>
                                <option value="textarea">Long Text (Multi-line)</option>
                                <option value="date">Date Picker</option>
                              </select>
                            </div>

                            {/* Required toggle & Placeholder */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                  Placeholder (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={field.placeholder || ''}
                                  onChange={(e) =>
                                    handleUpdateField(index, { placeholder: e.target.value })
                                  }
                                  placeholder="e.g. Enter details..."
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                                />
                              </div>

                              <div className="pt-4">
                                <label className="flex items-center gap-1.5 text-xs text-slate-300 font-medium cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) =>
                                      handleUpdateField(index, { required: e.target.checked })
                                    }
                                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-700"
                                  />
                                  <span>Required</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Dropdown / Radio Options Manager */}
                          {hasOptions && (
                            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                                  Choice Options ({field.options?.length || 0})
                                </label>
                                <span className="text-[10px] text-slate-400">
                                  Add each choice option below
                                </span>
                              </div>

                              {/* Options List */}
                              <div className="flex flex-wrap gap-1.5">
                                {(field.options || []).map((opt, optIdx) => (
                                  <span
                                    key={optIdx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium"
                                  >
                                    <span>{opt}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(index, opt)}
                                      className="text-slate-400 hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                                      title="Remove option"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>

                              {/* Add Option Input */}
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  value={newOptionInputs[field.field_id] || ''}
                                  onChange={(e) =>
                                    setNewOptionInputs((prev) => ({
                                      ...prev,
                                      [field.field_id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddOption(index);
                                    }
                                  }}
                                  placeholder="Type choice text and click Add Option..."
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddOption(index)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Choice</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Live Preview Tab */
            <div className="max-w-xl mx-auto p-6 sm:p-8 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-6">
              <div className="text-center space-y-2 border-b border-slate-800/80 pb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/60 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Public Form Live Preview</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {formTitle || 'Untitled Form'}
                </h3>
                {formDescription && (
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    {formDescription}
                  </p>
                )}
              </div>

              {/* Form Fields Simulation */}
              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div key={idx} className="space-y-1.5 text-left">
                    <label className="block text-xs font-bold text-slate-200">
                      {field.label}
                      {field.required && <span className="text-rose-400 ml-1">*</span>}
                    </label>

                    {/* Text / Phone / Email */}
                    {(field.field_type === 'text' ||
                      field.field_type === 'phone' ||
                      field.field_type === 'email') && (
                      <input
                        type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
                        disabled
                        placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 placeholder-slate-500 opacity-90"
                      />
                    )}

                    {/* Date */}
                    {field.field_type === 'date' && (
                      <input
                        type="date"
                        disabled
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 opacity-90"
                      />
                    )}

                    {/* Textarea */}
                    {field.field_type === 'textarea' && (
                      <textarea
                        rows={3}
                        disabled
                        placeholder={field.placeholder || 'Type here...'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 placeholder-slate-500 opacity-90 resize-none"
                      />
                    )}

                    {/* Dropdown */}
                    {field.field_type === 'dropdown' && (
                      <select
                        disabled
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 opacity-90"
                      >
                        <option>-- Select an option --</option>
                        {(field.options || []).map((opt, i) => (
                          <option key={i}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {/* Radio buttons */}
                    {field.field_type === 'radio' && (
                      <div className="space-y-2 pt-1">
                        {(field.options || []).map((opt, i) => (
                          <label
                            key={i}
                            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-not-allowed opacity-90"
                          >
                            <input
                              type="radio"
                              name={`preview_${field.field_id}`}
                              disabled
                              className="text-teal-600 bg-slate-800 border-slate-700"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Checkbox */}
                    {field.field_type === 'checkbox' && (
                      <label className="flex items-center gap-2 pt-1 cursor-not-allowed">
                        <input
                          type="checkbox"
                          disabled
                          className="w-4 h-4 rounded text-teal-600 bg-slate-800 border-slate-700"
                        />
                        <span className="text-xs text-slate-300">
                          {field.placeholder || 'Yes, I agree'}
                        </span>
                      </label>
                    )}
                  </div>
                ))}

                {/* Submit button preview */}
                <div className="pt-3">
                  <button
                    disabled
                    className="w-full bg-teal-600 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-teal-950/40 flex items-center justify-center gap-2 opacity-90"
                  >
                    <span>Submit Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-center text-[11px] text-slate-500 mt-2">
                    🔒 Submissions are instantly stored in the Tech Lab CRM Lead Directory.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>
              {fields.length} field{fields.length > 1 ? 's' : ''} configured
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveForm}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Form...' : isEditing ? 'Update Form' : 'Save & Publish Form'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
