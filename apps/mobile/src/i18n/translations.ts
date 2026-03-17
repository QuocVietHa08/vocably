/**
 * UI translations for Vocally.
 * Flashcard *content* (words, definitions, examples) stays in English —
 * this file only covers UI chrome: buttons, labels, prompts, etc.
 *
 * To add a new language: create a new file in ./locales/<code>.ts,
 * then import it here and add it to the `translations` record below.
 */

export interface Translations {
  /* ── Common ──────────────────────────────────────────── */
  back:    string;
  skip:    string;
  correct: string;
  notQuite: string;
  loading: string;

  /* ── Home screen ─────────────────────────────────────── */
  filterAll:      string;
  filterSaved:    string;
  practiceTitle:  string;
  practiceSub:    string;
  speakingBtn:    string;
  grammarBtn:     string;
  emptyFavText:   string;
  emptyFavHint:   string;
  swipeHint:      string;
  repeatOn:       string;
  cardKnow:       string;
  cardAgain:      string;
  cardFlip:       string;

  /* ── Settings ────────────────────────────────────────── */
  settingsTitle:         string;
  sectionAccount:        string;
  sectionAppearance:     string;
  appearanceLabel:       string;
  themeSystem:           string;
  themeLight:            string;
  themeDark:             string;
  sectionLanguage:       string;
  languageLabel:         string;
  sectionVoice:          string;
  voiceLabel:            string;
  sectionStudy:          string;
  targetBand:            string;
  sectionNotifications:  string;
  dailyReminders:        string;
  signOut:               string;
  upgradeTitle:          string;
  upgradeSub:            string;
  proActive:             string;
  sectionSupport:        string;
  settingsRateApp:       string;
  settingsShareApp:      string;
  settingsGetHelp:       string;
  sectionLegal:          string;
  settingsPrivacyPolicy: string;
  settingsTermsOfService:string;

  /* ── Quiz ────────────────────────────────────────────── */
  quizTitle:            string;
  choicePrompt:         string;
  writePrompt:          string;
  fillPrompt:           string;
  pronouncePrompt:      string;
  listenBtn:            string;
  listening:            string;
  tapToRecord:          string;
  stopAndCheck:         string;
  recording:            string;
  checkingPronounce:    string;
  revealBtn:            string;
  answerRevealed:       string;
  selfEvalText:         string;
  didntGetIt:           string;
  nailedIt:             string;
  practiceAgain:        string;
  backToCards:          string;
  fallbackNotice:       string;
  modeChoice:           string;
  modeWrite:            string;
  modeFill:             string;
  modePronounce:        string;
  resultOutstanding:    string;
  resultGood:           string;
  resultKeepGoing:      string;
  heardLabel:           string;
  couldNotCheck:        string;
  couldNotCheckMsg:     string;
  audioError:           string;
  audioErrorMsg:        string;
  micNeeded:            string;
  micNeededMsg:         string;

  /* ── Paywall ─────────────────────────────────────────────── */
  paywallTitle:         string;
  paywallSubtitle:      string;
  paywallBenefit1:      string;
  paywallBenefit2:      string;
  paywallBenefit3:      string;
  paywallBenefit4:      string;
  paywallBenefit5:      string;
  planYearly:           string;
  planMonthly:          string;
  planBestValue:        string;
  planBilledAnnual:     string;
  planBilledMonthly:    string;
  ctaStartFor:          string;
  ctaPerYear:           string;
  ctaPerMonth:          string;
  cancelAnytime:        string;
  restorePurchases:     string;
  termsLabel:           string;
  privacyLabel:         string;

  /* ── Grammar ─────────────────────────────────────────────── */
  grammarTitle:          string;
  grammarProgressOf:     string;   // e.g. '{0} of {1} complete'
  grammarExamples:       string;
  grammarStartQuiz:      string;
  grammarQuestionOf:     string;   // e.g. 'Question {0} of {1}'
  grammarGoToPractice:   string;
  grammarNextQuestion:   string;
  grammarAiPractice:     string;
  grammarGenerating:     string;
  grammarLoadError:      string;
  grammarNoExercises:    string;
  grammarRetry:          string;
  grammarSkipComplete:   string;
  grammarExerciseOf:     string;   // e.g. 'Exercise {0} of {1}'
  grammarShowAnswer:     string;
  grammarAnswerLabel:    string;
  grammarCompleteLesson: string;
  grammarNextExercise:   string;
  grammarLessonComplete: string;
  grammarQuizScore:      string;
  grammarBackRoadmap:    string;
  grammarStepLearn:      string;
  grammarStepQuiz:       string;
  grammarStepPractice:   string;

  /* ── Onboarding ────────────────────────────────────────────── */
  onboardingGetStarted:   string;
  onboardingYourLanguage: string;
  onboardingPersonalise:  string;
  onboardingLevel:        string;
  onboardingLevelSub:     string;
  onboardingFeatures:     string;
  onboardingTryIt:        string;
  onboardingTryItSub:     string;
  onboardingTapReveal:    string;
  onboardingAmazing:      string;
  onboardingLearned:      string;   // e.g. 'You just learned {0} new words!'
  onboardingKeepGoing:    string;
  onboardingSpeaking:     string;
  onboardingSpeakingSub:  string;
  onboardingVocab:        string;
  onboardingVocabSub:     string;
  onboardingFeedback:     string;
  onboardingFeedbackSub:  string;
  onboardingNext:         string;

  // Enhanced welcome
  onboardingWelcomeSub:       string;
  onboardingWelcomeFeature1:  string;
  onboardingWelcomeFeature2:  string;
  onboardingWelcomeFeature3:  string;

  // Split proficiency (current + target)
  onboardingCurrentLevel:     string;
  onboardingCurrentLevelSub:  string;
  onboardingTargetLevel:      string;
  onboardingTargetLevelSub:   string;

  // Personal plan
  onboardingPlanTitle:        string;
  onboardingPlanStep1:        string;
  onboardingPlanStep2:        string;
  onboardingPlanStep3:        string;
  onboardingPlanStep4:        string;

  // Notifications
  onboardingNotifTitle:       string;
  onboardingNotifSub:         string;
  onboardingNotifEnable:      string;
  onboardingNotifSkip:        string;

  // Sign in
  onboardingSignInTitle:      string;
  onboardingSignInSub:        string;
  onboardingSignInGoogle:     string;
  onboardingSignInApple:      string;
  onboardingSignInSkip:       string;
  onboardingSignInTerms:      string;
  onboardingTermsOfService:   string;
  onboardingPrivacyPolicy:    string;

  // Paywall (inline onboarding)
  onboardingPaywallTitle:     string;
  onboardingPaywallSub:       string;
  onboardingPaywallSkip:      string;

  /* ── Usage limits ────────────────────────────────────────────── */
  newWordsToday:         string;
  paywallReasonWords:    string;
  paywallReasonVoice:    string;
  paywallReasonGrammar:  string;
  paywallReasonQuiz:     string;
}

/* ════════════════════════════════════════════════════════
   LANGUAGE IMPORTS
   ════════════════════════════════════════════════════════ */

import en from './locales/en';
import vi from './locales/vi';
import zh from './locales/zh';
import ja from './locales/ja';
import ko from './locales/ko';
import th from './locales/th';
import id from './locales/id';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';
import ar from './locales/ar';
import pt from './locales/pt';
import hi from './locales/hi';

/* ════════════════════════════════════════════════════════
   LOOKUP TABLE  (language code → translations)
   'other' and '' both fall back to English in useT.ts
   ════════════════════════════════════════════════════════ */

export const translations: Record<string, Translations> = {
  en, vi, zh, ja, ko, th, id, es, fr, de, ar, pt, hi,
};
