import { useTheme } from '@/src/theme';

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface Message {
  id:        string;
  role:      'user' | 'assistant';
  text:      string;
  streaming: boolean;
}

export type Segment =
  | { kind: 'text';       content: string }
  | { kind: 'vocab';      content: string }
  | { kind: 'correction'; content: string };

export interface GrammarIssue {
  text:       string;
  suggestion: string;
  type:       'grammar' | 'vocab' | 'style';
}

export interface GrammarFeedback {
  loading:      boolean;
  issues:       GrammarIssue[];
  score:        number;        // IELTS band 1–9
  recommended?: string;        // full corrected sentence
}

export interface BubbleProps {
  message:           Message;
  showLabel:         boolean;
  t:                 ReturnType<typeof useTheme>;
  onCheckGrammar?:   () => void;
  grammarFeedback?:  GrammarFeedback;
  onSaveVocab?:      () => void;
  hasVocab?:         boolean;
  vocabSaved?:       boolean;
  onSuggestReply?:   () => void;
  suggestingReply?:  boolean;
}

export function parseSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: 'text', content: text.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ kind: 'vocab',      content: m[1] });
    if (m[2] !== undefined) segs.push({ kind: 'correction', content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ kind: 'text', content: text.slice(last) });
  return segs;
}
