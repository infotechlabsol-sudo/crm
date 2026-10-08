import { LeadScore } from '../types';

export interface QualificationOption {
  label: string;
  value: LeadScore;
}

export interface QualificationQuestion {
  id: string;
  number: string;
  label: string;
  options: QualificationOption[];
}

export const QUALIFICATION_QUESTIONS: QualificationQuestion[] = [
  {
    id: 'q1',
    number: 'Q1',
    label: 'Abhi kya karte ho (student/job/business)?',
    options: [
      { label: 'Clear situation', value: 'Hot' },
      { label: 'Somewhat unclear', value: 'Warm' },
      { label: 'Vague', value: 'Cold' },
    ],
  },
  {
    id: 'q2',
    number: 'Q2',
    label: 'Video editing kyu seekhni hai? Goal kya hai?',
    options: [
      { label: 'Income/job/channel jaisa clear goal', value: 'Hot' },
      { label: 'General interest, no strong goal', value: 'Warm' },
      { label: 'Bas aise hi', value: 'Cold' },
    ],
  },
  {
    id: 'q3',
    number: 'Q3',
    label: 'Pehle kuch try kiya (YouTube/institute)?',
    options: [
      { label: 'Try kiya, result nahi mila', value: 'Hot' },
      { label: 'Thoda try kiya, casually', value: 'Warm' },
      { label: 'Kabhi try nahi', value: 'Cold' },
    ],
  },
  {
    id: 'q4',
    number: 'Q4',
    label: 'Kab tak start karna chahte ho?',
    options: [
      { label: '7-15 din me', value: 'Hot' },
      { label: '1 mahine ke andar', value: 'Warm' },
      { label: 'Baad me', value: 'Cold' },
    ],
  },
  {
    id: 'q5',
    number: 'Q5',
    label: 'Laptop hai? Kaun sa?',
    options: [
      { label: 'Hai ya arrange ho jayega', value: 'Hot' },
      { label: 'Arrange karna padega, thoda time lagega', value: 'Warm' },
      { label: 'Nahi, aur plan bhi nahi', value: 'Cold' },
    ],
  },
  {
    id: 'q6',
    number: 'Q6',
    label: 'Time slot kaun sa free rahega?',
    options: [
      { label: 'Fix time bata deta hai', value: 'Hot' },
      { label: 'Roughly bata raha hai', value: 'Warm' },
      { label: 'Confirm nahi', value: 'Cold' },
    ],
  },
  {
    id: 'q7',
    number: 'Q7',
    label: 'Fees ka idea hai? Budget range?',
    options: [
      { label: 'Range batata hai', value: 'Hot' },
      { label: 'Loose idea hai', value: 'Warm' },
      { label: "Sirf 'fees kitni?' pe atka", value: 'Cold' },
    ],
  },
  {
    id: 'q8',
    number: 'Q8',
    label: 'Decision aap lenge ya ghar me puchna hai?',
    options: [
      { label: 'Khud lega', value: 'Hot' },
      { label: 'Ghar se ek baar confirm karega', value: 'Warm' },
      { label: 'Parents/friend pe depend', value: 'Cold' },
    ],
  },
  {
    id: 'q9',
    number: 'Q9',
    label: 'Kisi aur institute se baat hui?',
    options: [
      { label: 'Compare kar raha hai (aage badho)', value: 'Hot' },
      { label: 'Thoda dekh raha hai, decided nahi', value: 'Warm' },
      { label: '-', value: 'Cold' },
    ],
  },
];

export interface QualificationSummary {
  hotCount: number;
  warmCount: number;
  coldCount: number;
  unansweredCount: number;
  totalQuestions: number;
}

export function getQualificationSummary(
  answers?: Record<string, 'Hot' | 'Warm' | 'Cold' | null | undefined> | null
): QualificationSummary {
  let hotCount = 0;
  let warmCount = 0;
  let coldCount = 0;

  if (answers) {
    for (const q of QUALIFICATION_QUESTIONS) {
      const val = answers[q.id];
      if (val === 'Hot') hotCount++;
      else if (val === 'Warm') warmCount++;
      else if (val === 'Cold') coldCount++;
    }
  }

  const answeredCount = hotCount + warmCount + coldCount;
  const unansweredCount = QUALIFICATION_QUESTIONS.length - answeredCount;

  return {
    hotCount,
    warmCount,
    coldCount,
    unansweredCount,
    totalQuestions: QUALIFICATION_QUESTIONS.length,
  };
}

/**
 * Calculates overall lead score based on majority:
 * - Whichever of Hot / Warm / Cold has the most answers among answered questions.
 * - Tie-breaker rule (warmer wins):
 *    * Hot beats Warm
 *    * Warm beats Cold
 *    * Hot beats Cold
 *    * In 3-way tie: Hot wins
 * - Unanswered questions are not counted.
 * Returns null if no questions answered.
 */
export function calculateLeadScore(
  answers?: Record<string, 'Hot' | 'Warm' | 'Cold' | null | undefined> | null
): LeadScore | null {
  if (!answers) return null;

  let hot = 0;
  let warm = 0;
  let cold = 0;

  for (const q of QUALIFICATION_QUESTIONS) {
    const val = answers[q.id];
    if (val === 'Hot') hot++;
    else if (val === 'Warm') warm++;
    else if (val === 'Cold') cold++;
  }

  const totalAnswered = hot + warm + cold;
  if (totalAnswered === 0) return null;

  const maxVal = Math.max(hot, warm, cold);

  // If Hot achieves the maximum, Hot wins (unique winner or beats Warm / Cold in tie)
  if (hot === maxVal) {
    return 'Hot';
  }
  // If Hot did not achieve max, max is either Warm or Cold.
  // If Warm achieves maximum, Warm wins (unique winner or beats Cold in tie)
  if (warm === maxVal) {
    return 'Warm';
  }
  // Otherwise Cold is unique max
  return 'Cold';
}
