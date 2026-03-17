import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown, FadeInRight, useSharedValue, withSpring, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Check, X, Sparkles, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/src/theme';
import { F } from '@/src/theme/fonts';
import { useT } from '@/src/i18n/useT';
import { ALL_LESSONS, LEVEL_COLORS } from '@/src/data/grammar';
import type { GrammarLesson } from '@/src/data/grammar';
import { useUsageLimits } from '@/src/hooks/useUsageLimits';

/** Replace {0}, {1}, … placeholders in a translated template string */
function tFmt(template: string, ...args: (string | number)[]): string {
  return args.reduce<string>((s, arg, i) => s.replace(`{${i}}`, String(arg)), template);
}

/* ─── Config ─────────────────────────────────────────────────── */

const API_KEY       = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const COMPLETED_KEY = '@vocally/grammarCompleted';

type Step = 'learn' | 'quiz' | 'practice' | 'done';

interface PracticeItem {
  exercise:    string;
  answer:      string;
  explanation: string;
}

/* ─── Inline markdown renderer ───────────────────────────────── */

function InlineText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <Text key={i} style={{ fontFamily: F.bold }}>{part.slice(2, -2)}</Text>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <Text key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

function ExplanationBlock({ text, t }: { text: string; t: ReturnType<typeof useTheme> }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 8 }} />;
        if (line.startsWith('|')) return null;  // skip table rows
        if (line.startsWith('•') || line.startsWith('-')) {
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.muted, marginTop: 9 }} />
              <InlineText
                text={line.slice(1).trim()}
                style={{ flex: 1, fontSize: 14, lineHeight: 22, fontFamily: F.regular, color: t.fg }}
              />
            </View>
          );
        }
        return (
          <InlineText
            key={i}
            text={line}
            style={{ fontSize: 14, lineHeight: 22, fontFamily: F.regular, color: t.fg }}
          />
        );
      })}
    </View>
  );
}

/* ─── Progress bar ───────────────────────────────────────────── */

function ProgressBar({ step }: { step: Step }) {
  const t = useTheme();
  const pct = step === 'learn' ? 0.33 : step === 'quiz' ? 0.66 : 1;
  const w = useSharedValue(0.1);

  useEffect(() => {
    w.value = withTiming(pct, { duration: 400 });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: t.subtle }]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: t.accent }, barStyle]} />
    </View>
  );
}

/* ─── Step: Learn ────────────────────────────────────────────── */

function LearnStep({ lesson, t, T, onNext }: {
  lesson: GrammarLesson;
  t: ReturnType<typeof useTheme>;
  T: ReturnType<typeof useT>;
  onNext: () => void;
}) {
  const color = LEVEL_COLORS[lesson.level];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.learnContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Level badge + topic */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)} style={styles.lessonMeta}>
          <View style={[styles.levelPill, { backgroundColor: color }]}>
            <Text style={styles.levelPillText}>{lesson.level}</Text>
          </View>
          <Text style={[styles.lessonTopic, { color: t.fg }]}>{lesson.topic}</Text>
        </Animated.View>

        {/* Explanation */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <ExplanationBlock text={lesson.explanation} t={t} />
        </Animated.View>

        {/* Examples */}
        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
          <Text style={[styles.sectionLabel, { color: t.muted }]}>{T.grammarExamples}</Text>
          {lesson.examples.map((ex, i) => (
            <View key={i} style={[styles.exampleRow, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.exampleSentence, { color: t.fg }]}>{ex.sentence}</Text>
              {ex.note && (
                <Text style={[styles.exampleNote, { color: t.muted }]}>{ex.note}</Text>
              )}
            </View>
          ))}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyFooter, { borderTopColor: t.border, backgroundColor: t.bg }]}>
        <Pressable style={[styles.ctaBtn, { backgroundColor: t.fg }]} onPress={onNext}>
          <Text style={[styles.ctaBtnText, { color: t.bg }]}>{T.grammarStartQuiz}</Text>
          <ChevronRight size={18} color={t.bg} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Step: Quiz ─────────────────────────────────────────────── */

function QuizStep({ lesson, t, T, onComplete }: {
  lesson: GrammarLesson;
  t: ReturnType<typeof useTheme>;
  T: ReturnType<typeof useT>;
  onComplete: (score: number) => void;
}) {
  const [qIndex,   setQIndex]   = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score,    setScore]    = useState(0);

  const q          = lesson.quiz[qIndex];
  const answered   = selected !== null;
  const isCorrect  = selected === q.correctIndex;
  const totalQ     = lesson.quiz.length;

  function selectOption(idx: number) {
    if (answered) return;
    setSelected(idx);
    if (idx === q.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    const finalScore = score + (isCorrect ? 1 : 0);
    if (qIndex + 1 >= totalQ) {
      onComplete(finalScore);
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
    }
  }

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.quizContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress indicator */}
        <View style={styles.quizMeta}>
          <Text style={[styles.quizCounter, { color: t.muted }]}>
            {tFmt(T.grammarQuestionOf, qIndex + 1, totalQ)}
          </Text>
          <View style={styles.quizDots}>
            {lesson.quiz.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.quizDot,
                  {
                    backgroundColor: i < qIndex
                      ? '#22c55e'
                      : i === qIndex
                        ? t.accent
                        : t.subtle,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Question */}
        <Animated.View entering={FadeInRight.duration(250)} key={qIndex}>
          <Text style={[styles.questionText, { color: t.fg }]}>{q.question}</Text>

          {/* Options */}
          <View style={styles.optionsList}>
            {q.options.map((opt, idx) => {
              let bg    = t.surface;
              let border= t.border;
              let fg    = t.fg;

              if (answered) {
                if (idx === q.correctIndex) {
                  bg = '#22c55e18'; border = '#22c55e'; fg = '#22c55e';
                } else if (idx === selected && !isCorrect) {
                  bg = '#ef444418'; border = '#ef4444'; fg = '#ef4444';
                } else {
                  fg = t.muted;
                }
              }

              return (
                <Pressable
                  key={idx}
                  onPress={() => selectOption(idx)}
                  style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                >
                  <View style={[styles.optionLabel, {
                    backgroundColor: answered && idx === q.correctIndex
                      ? '#22c55e' : answered && idx === selected && !isCorrect
                        ? '#ef4444' : t.subtle,
                  }]}>
                    <Text style={[styles.optionLabelText, {
                      color: answered && (idx === q.correctIndex || (idx === selected && !isCorrect))
                        ? '#fff' : t.muted,
                    }]}>
                      {answered && idx === q.correctIndex
                        ? <Check size={12} color="#fff" strokeWidth={3} />
                        : answered && idx === selected && !isCorrect
                          ? <X size={12} color="#fff" strokeWidth={3} />
                          : optionLabels[idx]
                      }
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: fg }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Explanation */}
          {answered && (
            <Animated.View
              entering={FadeInDown.duration(250)}
              style={[
                styles.explanationBox,
                { backgroundColor: isCorrect ? '#22c55e14' : '#ef444414', borderColor: isCorrect ? '#22c55e40' : '#ef444440' },
              ]}
            >
              <View style={styles.explanationHeader}>
                {isCorrect
                  ? <Check size={14} color="#22c55e" strokeWidth={3} />
                  : <X size={14} color="#ef4444" strokeWidth={3} />
                }
                <Text style={[styles.explanationTitle, { color: isCorrect ? '#22c55e' : '#ef4444' }]}>
                  {isCorrect ? T.correct : T.notQuite}
                </Text>
              </View>
              <Text style={[styles.explanationText, { color: t.fg }]}>{q.explanation}</Text>
            </Animated.View>
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {answered && (
        <View style={[styles.stickyFooter, { borderTopColor: t.border, backgroundColor: t.bg }]}>
          <Pressable style={[styles.ctaBtn, { backgroundColor: t.fg }]} onPress={next}>
            <Text style={[styles.ctaBtnText, { color: t.bg }]}>
              {qIndex + 1 >= totalQ ? T.grammarGoToPractice : T.grammarNextQuestion}
            </Text>
            <ChevronRight size={18} color={t.bg} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ─── Step: AI Practice ──────────────────────────────────────── */

function PracticeStep({ lesson, t, T, onComplete }: {
  lesson: GrammarLesson;
  t: ReturnType<typeof useTheme>;
  T: ReturnType<typeof useT>;
  onComplete: () => void;
}) {
  const [items,      setItems]      = useState<PracticeItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [exIndex,    setExIndex]    = useState(0);
  const [revealed,   setRevealed]   = useState(false);

  useEffect(() => {
    fetchPractice();
  }, []);

  async function fetchPractice() {
    setLoading(true);
    setError(null);
    try {
      const systemPrompt = `You are an IELTS grammar tutor. Generate exactly 3 short practice exercises. ${lesson.aiPrompt}

Respond ONLY with a valid JSON array (no markdown fences, no extra text) in this exact format:
[
  {
    "exercise": "The sentence with a ___ blank or task description.",
    "answer": "The correct answer",
    "explanation": "Brief reason why (1–2 sentences)."
  }
]`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          messages: [{ role: 'user', content: systemPrompt }],
        }),
      });

      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content ?? '[]';
      const parsed: PracticeItem[] = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setItems(parsed.slice(0, 3));
    } catch (e) {
      setError(T.grammarLoadError);
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (exIndex + 1 >= items.length) {
      onComplete();
    } else {
      setExIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <View style={styles.practiceCenter}>
        <ActivityIndicator size="small" color={t.accent} />
        <Text style={[styles.practiceLoadingText, { color: t.muted }]}>
          {T.grammarGenerating}
        </Text>
      </View>
    );
  }

  /* ── Error state ── */
  if (error || items.length === 0) {
    return (
      <View style={styles.practiceCenter}>
        <Text style={[styles.practiceErrorText, { color: t.muted }]}>{error ?? T.grammarNoExercises}</Text>
        <Pressable style={[styles.retryBtn, { borderColor: t.border }]} onPress={fetchPractice}>
          <Text style={[styles.retryBtnText, { color: t.fg }]}>{T.grammarRetry}</Text>
        </Pressable>
        <Pressable onPress={onComplete} style={{ marginTop: 12 }}>
          <Text style={[styles.skipLink, { color: t.muted }]}>{T.grammarSkipComplete}</Text>
        </Pressable>
      </View>
    );
  }

  const item = items[exIndex];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.practiceContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise counter */}
        <View style={styles.quizMeta}>
          <Text style={[styles.quizCounter, { color: t.muted }]}>
            {tFmt(T.grammarExerciseOf, exIndex + 1, items.length)}
          </Text>
          <View style={styles.quizDots}>
            {items.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.quizDot,
                  { backgroundColor: i < exIndex ? '#22c55e' : i === exIndex ? t.accent : t.subtle },
                ]}
              />
            ))}
          </View>
        </View>

        <Animated.View entering={FadeInRight.duration(250)} key={exIndex}>
          {/* Sparkles badge */}
          <View style={styles.practiceBadge}>
            <Sparkles size={12} color={t.accent} strokeWidth={2} />
            <Text style={[styles.practiceBadgeText, { color: t.accent }]}>{T.grammarAiPractice}</Text>
          </View>

          {/* Exercise text */}
          <View style={[styles.exerciseBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.exerciseText, { color: t.fg }]}>{item.exercise}</Text>
          </View>

          {/* Reveal answer */}
          {!revealed ? (
            <Pressable
              style={[styles.revealBtn, { backgroundColor: t.subtle, borderColor: t.border }]}
              onPress={() => setRevealed(true)}
            >
              <Eye size={16} color={t.muted} strokeWidth={2} />
              <Text style={[styles.revealBtnText, { color: t.muted }]}>{T.grammarShowAnswer}</Text>
            </Pressable>
          ) : (
            <Animated.View entering={FadeInDown.duration(250)}>
              {/* Answer */}
              <View style={[styles.answerBox, { backgroundColor: '#22c55e14', borderColor: '#22c55e40' }]}>
                <View style={styles.answerHeader}>
                  <Check size={14} color="#22c55e" strokeWidth={3} />
                  <Text style={styles.answerLabel}>{T.grammarAnswerLabel}</Text>
                </View>
                <Text style={styles.answerText}>{item.answer}</Text>
              </View>

              {/* Explanation */}
              <View style={[styles.explanationBox, { backgroundColor: t.subtle, borderColor: t.border }]}>
                <Text style={[styles.explanationText, { color: t.fg }]}>{item.explanation}</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {revealed && (
        <View style={[styles.stickyFooter, { borderTopColor: t.border, backgroundColor: t.bg }]}>
          <Pressable
            style={[styles.ctaBtn, { backgroundColor: exIndex + 1 >= items.length ? t.accent : t.fg }]}
            onPress={next}
          >
            <Text style={[styles.ctaBtnText, { color: '#fff' }]}>
              {exIndex + 1 >= items.length ? T.grammarCompleteLesson : T.grammarNextExercise}
            </Text>
            {exIndex + 1 < items.length && (
              <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* ─── Completion ─────────────────────────────────────────────── */

function DoneScreen({ lesson, score, total, t, T, onBack }: {
  lesson: GrammarLesson;
  score: number;
  total: number;
  t: ReturnType<typeof useTheme>;
  T: ReturnType<typeof useT>;
  onBack: () => void;
}) {
  const color = LEVEL_COLORS[lesson.level];
  const pct   = Math.round((score / total) * 100);

  return (
    <View style={styles.doneContainer}>
      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.doneIcon}>
        <View style={[styles.doneCircle, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
          <Check size={40} color={color} strokeWidth={2.5} />
        </View>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(140).duration(400)} style={[styles.doneTitle, { color: t.fg }]}>
        {T.grammarLessonComplete}
      </Animated.Text>

      <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={[styles.doneSubtitle, { color: t.muted }]}>
        {lesson.topic}
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(260).duration(400)} style={[styles.scoreCard, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[styles.scoreLabel, { color: t.muted }]}>{T.grammarQuizScore}</Text>
        <Text style={[styles.scoreNum, { color: t.fg }]}>{score}/{total}</Text>
        <Text style={[styles.scorePct, { color: pct >= 67 ? '#22c55e' : t.accent }]}>{pct}%</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(400)} style={{ width: '100%' }}>
        <Pressable style={[styles.ctaBtn, { backgroundColor: color }]} onPress={onBack}>
          <Text style={[styles.ctaBtnText, { color: '#fff' }]}>{T.grammarBackRoadmap}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ─── Main screen ────────────────────────────────────────────── */

export default function GrammarLessonScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const t       = useTheme();
  const T       = useT();
  const router  = useRouter();
  const lesson  = ALL_LESSONS.find((l) => l.id === id);
  const { canDoGrammarLesson, incrementGrammarLessons, loaded: limitsLoaded } = useUsageLimits();

  const [step,       setStep]       = useState<Step>('learn');
  const [quizScore,  setQuizScore]  = useState(0);

  // Gate: check grammar lesson limit on mount
  useEffect(() => {
    if (!limitsLoaded) return;
    if (!canDoGrammarLesson()) {
      router.replace('/paywall?reason=grammar');
      return;
    }
    void incrementGrammarLessons();
  }, [limitsLoaded]);

  if (!lesson) return null;

  const color = LEVEL_COLORS[lesson.level];

  const stepLabels: Record<Step, string> = {
    learn:    T.grammarStepLearn,
    quiz:     T.grammarStepQuiz,
    practice: T.grammarStepPractice,
    done:     T.grammarStepPractice,
  };

  async function handleQuizComplete(score: number) {
    setQuizScore(score);
    setStep('practice');
  }

  async function handlePracticeComplete() {
    if (!lesson) return;
    // Save completion
    try {
      const raw = await AsyncStorage.getItem(COMPLETED_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(lesson.id)) {
        ids.push(lesson.id);
        await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(ids));
      }
    } catch {}
    setStep('done');
  }

  if (step === 'done') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
        <DoneScreen
          lesson={lesson}
          score={quizScore}
          total={lesson.quiz.length}
          t={t}
          T={T}
          onBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ChevronLeft size={22} color={t.fg} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: t.fg }]} numberOfLines={1}>
            {lesson.topic}
          </Text>
          <Text style={[styles.headerStep, { color: t.muted }]}>
            {stepLabels[step]}
          </Text>
        </View>

        <View style={styles.backBtn} />
      </View>

      {/* Progress bar */}
      <ProgressBar step={step} />

      {/* Step content */}
      {step === 'learn' && (
        <LearnStep lesson={lesson} t={t} T={T} onNext={() => setStep('quiz')} />
      )}
      {step === 'quiz' && (
        <QuizStep lesson={lesson} t={t} T={T} onComplete={handleQuizComplete} />
      )}
      {step === 'practice' && (
        <PracticeStep lesson={lesson} t={t} T={T} onComplete={handlePracticeComplete} />
      )}
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn:      { width: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontFamily: F.bold },
  headerStep:   { fontSize: 11, fontFamily: F.medium, marginTop: 1 },

  progressTrack: { height: 3, width: '100%' },
  progressFill:  { height: 3, borderRadius: 2 },

  /* Learn */
  learnContent: { padding: 20, paddingTop: 24 },

  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  levelPill:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  levelPillText: { color: '#fff', fontSize: 12, fontFamily: F.extrabold, letterSpacing: 0.5 },
  lessonTopic:   { fontSize: 18, fontFamily: F.bold, flex: 1 },

  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10, fontFamily: F.bold, letterSpacing: 1.2,
    marginBottom: 10,
  },
  exampleRow: {
    borderRadius: 12, borderWidth: 1,
    padding: 14, marginBottom: 8,
  },
  exampleSentence: { fontSize: 14, fontFamily: F.semibold, lineHeight: 20 },
  exampleNote:     { fontSize: 12, fontFamily: F.regular, marginTop: 4 },

  stickyFooter: {
    paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 16, paddingVertical: 15,
  },
  ctaBtnText: { fontSize: 16, fontFamily: F.bold },

  /* Quiz */
  quizContent: { padding: 20, paddingTop: 24 },
  quizMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  quizCounter: { fontSize: 12, fontFamily: F.medium },
  quizDots:    { flexDirection: 'row', gap: 5 },
  quizDot:     { width: 8, height: 8, borderRadius: 4 },

  questionText: { fontSize: 16, fontFamily: F.semibold, lineHeight: 24, marginBottom: 20 },

  optionsList: { gap: 10, marginBottom: 16 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  optionLabel: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabelText: { fontSize: 13, fontFamily: F.bold },
  optionText:      { flex: 1, fontSize: 14, fontFamily: F.regular, lineHeight: 20 },

  explanationBox: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 4,
  },
  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  explanationTitle:  { fontSize: 13, fontFamily: F.bold },
  explanationText:   { fontSize: 13, fontFamily: F.regular, lineHeight: 20 },

  /* Practice */
  practiceContent: { padding: 20, paddingTop: 24 },
  practiceCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
  },
  practiceLoadingText: { fontSize: 14, fontFamily: F.medium, marginTop: 8 },
  practiceErrorText:   { fontSize: 14, fontFamily: F.medium, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryBtnText: { fontSize: 14, fontFamily: F.medium },
  skipLink:     { fontSize: 13, fontFamily: F.medium },

  practiceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 14,
  },
  practiceBadgeText: { fontSize: 12, fontFamily: F.bold, letterSpacing: 0.5 },

  exerciseBox: {
    borderRadius: 16, borderWidth: 1,
    padding: 18, marginBottom: 16,
  },
  exerciseText: { fontSize: 16, fontFamily: F.semibold, lineHeight: 26 },

  revealBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14,
  },
  revealBtnText: { fontSize: 14, fontFamily: F.medium },

  answerBox: {
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  answerLabel:  { fontSize: 12, fontFamily: F.bold, color: '#22c55e' },
  answerText:   { fontSize: 16, fontFamily: F.bold, color: '#22c55e' },

  /* Done */
  doneContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
  },
  doneIcon:    {},
  doneCircle:  {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  doneTitle:    { fontSize: 26, fontFamily: F.extrabold },
  doneSubtitle: { fontSize: 14, fontFamily: F.regular, textAlign: 'center', lineHeight: 22 },

  scoreCard: {
    borderRadius: 16, borderWidth: 1, padding: 20,
    alignItems: 'center', gap: 4, width: '100%',
  },
  scoreLabel: { fontSize: 11, fontFamily: F.bold, letterSpacing: 0.8 },
  scoreNum:   { fontSize: 36, fontFamily: F.extrabold },
  scorePct:   { fontSize: 16, fontFamily: F.bold },
});
