export type LeadSource =
  | 'Facebook Ads'
  | 'Instagram Ads'
  | 'Google Ads'
  | 'Walk-in'
  | 'Referral'
  | 'YouTube'
  | 'Other'
  | string;

export type CourseInterest =
  | 'Premiere Pro'
  | 'After Effects'
  | 'Photoshop'
  | 'Illustrator'
  | 'Canva'
  | 'Full Video Editor Roadmap 365-day'
  | 'GenAI Tools'
  | 'Other'
  | string;

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Demo Scheduled'
  | 'Enrolled'
  | 'Not Interested'
  | 'Lost';

export type LeadScore = 'Hot' | 'Warm' | 'Cold';

export interface LeadNote {
  id: string;
  note_text: string;
  timestamp: string; // ISO date string
  added_by: string; // e.g. "Admin" or system
  is_system?: boolean; // true for auto-generated status changes
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  course_interest: CourseInterest;
  status: LeadStatus;
  assigned_batch: string;
  lead_score: LeadScore;
  created_date: string; // ISO string
  last_contacted_date?: string; // ISO string
  next_followup_date?: string; // ISO string (YYYY-MM-DDTHH:mm)
  notes_history: LeadNote[];
  tags: string[]; // parsed tags array
  address?: string; // CHANGE 3: address (text, optional)
  converted_to_student?: boolean; // CHANGE 3: converted_to_student (boolean, default false)
  class_mode?: 'Online' | 'Offline'; // CHANGE 1: Class mode (Online/Offline)
  dob?: string; // CHANGE 2: Date of Birth (YYYY-MM-DD)
  enrolled_date?: string; // ISO string captured when lead status becomes Enrolled
  is_deleted?: boolean; // Soft delete flag
  deleted_date?: string | null; // Timestamp when lead was soft deleted
  qualification_answers?: Record<string, 'Hot' | 'Warm' | 'Cold' | null>;
  qualification_completed?: boolean;
}

export interface CourseItem {
  id: string;
  name: string;
  active: boolean;
  created_timestamp?: string;
}

export interface BatchItem {
  id: string;
  name: string;
  active: boolean;
  created_timestamp?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string; // short label e.g., "Fee Reminder", "Batch Update"
  message: string; // template text with placeholders
  created_timestamp?: string;
}

export interface EmailTemplate {
  id: string;
  name: string; // short label e.g., "Batch Update"
  subject: string; // email subject line with placeholders
  message: string; // email body HTML with rich-text formatting
  created_timestamp?: string;
}

export interface CRMSettings {
  courses: string[];
  sources: string[];
  batches: string[];
  whatsappTemplates: {
    id: string;
    title: string;
    message: string;
  }[];
}

export interface LeadFilterState {
  search: string;
  status: string; // 'ALL' or specific
  source: string; // 'ALL' or specific
  course: string; // 'ALL' or specific
  batch: string; // 'ALL' or specific
  dateRange: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  classMode?: string; // 'ALL' | 'Online' | 'Offline'
}

export type SortField = 'created_date' | 'next_followup_date' | 'status' | 'name' | 'lead_score';
export type SortOrder = 'asc' | 'desc';

export type FormFieldType =
  | 'text'
  | 'phone'
  | 'email'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'textarea'
  | 'date';

export interface FormFieldDefinition {
  field_id: string; // short unique key, e.g. "name", "phone", "course_interest", "class_mode"
  label: string; // label shown to user, e.g. "Full Name"
  field_type: FormFieldType;
  required: boolean;
  options?: string[]; // array of strings for dropdown or radio
  placeholder?: string;
  helper_text?: string;
}

export interface CustomForm {
  id: string;
  form_name: string; // internal reference e.g., "Demo Class Signup"
  form_title: string; // heading on public page, e.g., "Book Your Free Demo Class"
  form_description?: string; // subtitle or instructions
  fields: FormFieldDefinition[];
  active: boolean; // default true
  created_timestamp: string; // ISO string
  submission_count: number; // default 0
}

export interface Webhook {
  id: string;
  name: string; // e.g. "Zapier - Website Popup"
  webhook_key: string; // randomly generated unique string, used to identify and secure this webhook endpoint
  active: boolean; // default true
  created_timestamp: string; // auto ISO string
  last_received_timestamp: string | null; // nullable ISO string
  total_received: number; // default 0
}

// -------------------------------------------------------------
// WhatsApp Marketing Cloud API & Automation Types
// -------------------------------------------------------------

export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  accessToken: string;
  updatedAt?: string;
}

export type FlowTriggerType = 'new_lead' | 'keyword' | 'manual';
export type FlowStepType = 'text' | 'button' | 'list';

export interface FlowStepOption {
  id?: string;
  label: string;
  value: string;
  next: string | null; // next step key or null
}

export interface FlowStep {
  type: FlowStepType;
  message: string;
  next?: string | null; // used for type === 'text'
  saveAs?: string; // e.g. 'class_mode', 'has_editing_experience'
  options?: FlowStepOption[]; // up to 3 for 'button', up to 10 for 'list'
}

export interface WhatsAppFlow {
  id: string;
  name: string;
  trigger: FlowTriggerType;
  startStep: string;
  steps: Record<string, FlowStep>;
  created_timestamp?: string;
  updated_timestamp?: string;
}

export type TriggerMatchType = 'new_lead' | 'keyword';

export interface WhatsAppTrigger {
  id: string;
  name: string;
  matchType: TriggerMatchType;
  keyword?: string; // required if matchType === 'keyword'
  flowId: string; // linked flow id from whatsapp_flows
  flowName?: string;
  active: boolean;
  created_timestamp?: string;
}

export interface DripStep {
  day: number; // integer days offset e.g. 0, 1, 3, 7
  message: string;
}

export interface DripAudienceFilter {
  courseInterest?: string;
  course_interest?: string;
  classMode?: string;
  class_mode?: string;
  status?: string;
  minLeadScore?: number;
  lead_score?: string | number;
  source?: string;
  has_device?: string;
  [key: string]: any;
}

export interface WhatsAppDripCampaign {
  id: string;
  name: string;
  audienceFilter: DripAudienceFilter;
  active: boolean;
  steps: DripStep[];
  created_timestamp?: string;
  updated_timestamp?: string;
}

export type WAMessageDirection = 'incoming' | 'outgoing';
export type WAMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WAMessage {
  id: string;
  phone: string; // Normalized digits
  direction: WAMessageDirection;
  message?: string;
  text?: string;
  timestamp: string; // ISO date string
  status?: WAMessageStatus;
  flowId?: string;
  stepId?: string;
  leadName?: string;
  rawPayload?: any;
}

export type FollowUpSortOption =
  | 'DATE_ASC'
  | 'DATE_DESC'
  | 'CLASS_ONLINE_FIRST'
  | 'CLASS_OFFLINE_FIRST'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'SCORE_HOT_FIRST'
  | 'STATUS';



