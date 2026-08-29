import React, { useState, useEffect } from 'react';
import { CustomForm, FormFieldDefinition } from '../types';
import { getCustomFormById, submitPublicLeadForm } from '../lib/storage';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface PublicFormViewProps {
  formId: string;
  onExit?: () => void;
}

export const PublicFormView: React.FC<PublicFormViewProps> = ({
  formId,
  onExit,
}) => {
  const [form, setForm] = useState<CustomForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form values state
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load form details
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getCustomFormById(formId)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          setError('Form not found. The link may be invalid or expired.');
        } else {
          setForm(data);
          // Set initial defaults for dropdowns / radios if needed
          const initialVals: Record<string, any> = {};
          data.fields.forEach((field) => {
            if (field.field_type === 'dropdown' && field.options && field.options.length > 0) {
              initialVals[field.field_id] = field.options[0];
            } else if (field.field_type === 'radio' && field.options && field.options.length > 0) {
              initialVals[field.field_id] = field.options[0];
            } else if (field.field_type === 'checkbox') {
              initialVals[field.field_id] = false;
            } else {
              initialVals[field.field_id] = '';
            }
          });
          setFormValues(initialVals);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching form:', err);
        setError('Failed to load form details. Please check your internet connection.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [formId]);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    // Clear validation error if user types
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    if (!form) return false;
    const errors: Record<string, string> = {};

    form.fields.forEach((field) => {
      const val = formValues[field.field_id];
      const isBlank =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (field.field_type === 'checkbox' && field.required && !val);

      if (field.required && isBlank) {
        errors[field.field_id] = `${field.label} is required.`;
        return;
      }

      // Email format check
      if (field.field_type === 'email' && val && typeof val === 'string' && val.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          errors[field.field_id] = 'Please enter a valid email address.';
        }
      }

      // Phone format check
      if (field.field_type === 'phone' && val && typeof val === 'string' && val.trim()) {
        const cleaned = val.replace(/[^0-9+]/g, '');
        if (cleaned.length < 8) {
          errors[field.field_id] = 'Please enter a valid contact/WhatsApp number.';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPublicLeadForm(form.id, form, formValues);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Something went wrong submitting your form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    if (form) {
      const initialVals: Record<string, any> = {};
      form.fields.forEach((field) => {
        if (field.field_type === 'dropdown' && field.options && field.options.length > 0) {
          initialVals[field.field_id] = field.options[0];
        } else if (field.field_type === 'radio' && field.options && field.options.length > 0) {
          initialVals[field.field_id] = field.options[0];
        } else if (field.field_type === 'checkbox') {
          initialVals[field.field_id] = false;
        } else {
          initialVals[field.field_id] = '';
        }
      });
      setFormValues(initialVals);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white font-sans">
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 p-0.5 shadow-md shadow-teal-900/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-teal-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-white">TECH LAB</span>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">ACADEMY</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Video Editing & GenAI Training Institute</p>
            </div>
          </div>

          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Exit Preview / Back to CRM
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16 space-y-4">
            <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading registration form...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Form Not Available</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
            </div>
            <div className="pt-2">
              <a
                href="mailto:info.techlabsol@gmail.com"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 border border-slate-700 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Tech Lab Academy Support</span>
              </a>
            </div>
          </div>
        )}

        {/* Inactive Form State */}
        {!isLoading && form && !form.active && (
          <div className="bg-slate-900 border border-amber-900/50 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-400 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-white">Inquiries Currently Paused</h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you for your interest in Tech Lab Academy. This specific registration form is temporarily paused.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1 max-w-sm mx-auto">
                <p>Please reach out to our admission advisors directly:</p>
                <p className="font-semibold text-teal-400">📞 WhatsApp: +91 98765 43210</p>
                <p className="font-semibold text-slate-300">✉️ Email: info.techlabsol@gmail.com</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Confirmation State */}
        {!isLoading && form && form.active && isSubmitted && (
          <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-teal-950/80 border border-teal-500/80 text-teal-400 mx-auto flex items-center justify-center shadow-lg shadow-teal-950">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Inquiry Received</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Thank You for Registering!
              </h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                We have received your registration for <strong className="text-teal-400">{form.form_title}</strong>. Our counseling team will reach out via WhatsApp / Call with your class details and syllabus overview.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2.5 max-w-md mx-auto text-xs">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Next Steps:</span>
              </div>
              <ul className="space-y-1.5 text-slate-400 pl-5 list-disc text-[11px]">
                <li>Our senior mentor will review your learning goals.</li>
                <li>You will receive a confirmation message on WhatsApp with upcoming batch schedules.</li>
                <li>Software setup instructions & demo credentials will be shared prior to session.</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Submit Another Inquiry</span>
              </button>
            </div>
          </div>
        )}

        {/* Active Public Form */}
        {!isLoading && form && form.active && !isSubmitted && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Form Card Header Banner */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800 space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/90 text-teal-300 border border-teal-800/80 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tech Lab Academy Admission</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {form.form_title}
              </h1>

              {form.form_description && (
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  {form.form_description}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              {form.fields.map((field) => {
                const fieldError = validationErrors[field.field_id];
                const value = formValues[field.field_id] ?? '';

                return (
                  <div key={field.field_id} className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      <span>{field.label}</span>
                      {field.required && <span className="text-rose-400 ml-1">*</span>}
                    </label>

                    {/* Text input */}
                    {field.field_type === 'text' && (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                        placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                        className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                          fieldError
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-slate-800 focus:border-teal-500'
                        }`}
                      />
                    )}

                    {/* Phone input */}
                    {field.field_type === 'phone' && (
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="tel"
                          value={value}
                          onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                          placeholder={field.placeholder || '10-digit mobile number'}
                          className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                            fieldError
                              ? 'border-rose-500 focus:border-rose-400'
                              : 'border-slate-800 focus:border-teal-500'
                          }`}
                        />
                      </div>
                    )}

                    {/* Email input */}
                    {field.field_type === 'email' && (
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          value={value}
                          onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                          placeholder={field.placeholder || 'name@example.com'}
                          className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors ${
                            fieldError
                              ? 'border-rose-500 focus:border-rose-400'
                              : 'border-slate-800 focus:border-teal-500'
                          }`}
                        />
                      </div>
                    )}

                    {/* Date input */}
                    {field.field_type === 'date' && (
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="date"
                          value={value}
                          onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                          className={`w-full bg-slate-950 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none transition-colors ${
                            fieldError
                              ? 'border-rose-500 focus:border-rose-400'
                              : 'border-slate-800 focus:border-teal-500'
                          }`}
                        />
                      </div>
                    )}

                    {/* Dropdown input */}
                    {field.field_type === 'dropdown' && (
                      <select
                        value={value}
                        onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                        className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-colors ${
                          fieldError
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-slate-800 focus:border-teal-500'
                        }`}
                      >
                        {(field.options || []).map((opt, optIndex) => (
                          <option key={optIndex} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Radio input */}
                    {field.field_type === 'radio' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(field.options || []).map((opt, optIndex) => {
                          const isSelected = value === opt;
                          return (
                            <label
                              key={optIndex}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-teal-950/60 border-teal-500/80 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={field.field_id}
                                value={opt}
                                checked={isSelected}
                                onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                                className="text-teal-600 focus:ring-teal-500 bg-slate-800 border-slate-700"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Checkbox input */}
                    {field.field_type === 'checkbox' && (
                      <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => handleInputChange(field.field_id, e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-950 border-slate-800 mt-0.5"
                        />
                        <span className="text-xs text-slate-300 font-medium leading-relaxed">
                          {field.placeholder || 'Yes, I agree and want to proceed.'}
                        </span>
                      </label>
                    )}

                    {/* Textarea input */}
                    {field.field_type === 'textarea' && (
                      <textarea
                        rows={3}
                        value={value}
                        onChange={(e) => handleInputChange(field.field_id, e.target.value)}
                        placeholder={field.placeholder || 'Type here...'}
                        className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none transition-colors ${
                          fieldError
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-slate-800 focus:border-teal-500'
                        }`}
                      />
                    )}

                    {/* Validation error message */}
                    {fieldError && (
                      <p className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{fieldError}</span>
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Submit Button */}
              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-sm py-3.5 px-6 rounded-2xl shadow-xl shadow-teal-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Inquiries</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                  <span>Your privacy is protected. Tech Lab Academy never shares your contact details.</span>
                </p>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 px-4 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          © {new Date().getFullYear()} Tech Lab Academy — Professional Video Editing & VFX Institute
        </p>
        <p className="text-[11px] text-slate-600">
          Raipur Campus, Chhattisgarh | Online Live Interactive Batches Across India
        </p>
      </footer>
    </div>
  );
};
