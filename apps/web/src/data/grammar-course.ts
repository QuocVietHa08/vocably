import type { GrammarCourseLesson, GrammarCourseLevel } from "@/types/grammar";

function lesson(
  level: GrammarCourseLevel,
  id: string,
  title: string,
  summary: string,
  tags: string[],
  focus: string,
): GrammarCourseLesson {
  return {
    id,
    level,
    title,
    summary,
    tags,
    explanation: `${title} helps you control ${focus}. Learn the form first, then notice the time, meaning, or sentence role that makes the structure necessary. In practice, type only the word or phrase that changes so you can focus on the grammar decision instead of rewriting the whole sentence.`,
    examples: [
      {
        sentence: exampleFor(id, 0),
        note: "The key form matches the meaning of the sentence.",
      },
      {
        sentence: exampleFor(id, 1),
        note: "Small changes in time or role can change the grammar choice.",
      },
    ],
    commonMistakes: mistakesFor(id),
    practicePrompts: [
      {
        prompt: practiceFor(id, 0),
        answer: answerFor(id, 0),
      },
      {
        prompt: practiceFor(id, 1),
        answer: answerFor(id, 1),
      },
    ],
  };
}

export const grammarCourse: GrammarCourseLesson[] = [
  lesson("A1", "a1-can-cannot", "Can / cannot", "Ability and permission with can.", ["modal", "ability", "permission"], "ability, permission, and simple possibility"),
  lesson("A1", "a1-be-verbs", "Be verbs: am / is / are", "Basic identity, state, and location sentences.", ["be", "subject-verb-agreement"], "subject agreement with am, is, and are"),
  lesson("A1", "a1-present-simple", "Present simple: habits and facts", "Daily routines and general truths.", ["present-simple", "habits"], "habits, routines, and facts"),
  lesson("A1", "a1-present-continuous", "Present continuous: actions happening now", "Actions in progress now or around now.", ["present-continuous", "now"], "actions happening now"),
  lesson("A1", "a1-present-simple-vs-continuous", "Present simple vs present continuous", "Habits compared with actions happening now.", ["present-simple", "present-continuous"], "the difference between routines and temporary actions"),
  lesson("A1", "a1-past-simple", "Past simple: regular and irregular verbs", "Finished actions in the past.", ["past-simple", "irregular-verbs"], "completed past events"),
  lesson("A1", "a1-basic-questions", "Basic questions: do / does / be questions", "Simple question word order.", ["questions", "auxiliaries"], "basic question formation"),
  lesson("A1", "a1-there-is-there-are", "There is / there are", "Saying something exists.", ["there-is", "there-are"], "existence with singular and plural nouns"),

  lesson("A2", "a2-countable-uncountable", "Countable and uncountable nouns", "Nouns you can count and nouns you cannot.", ["countable", "uncountable"], "noun quantity and article choice"),
  lesson("A2", "a2-how-much-how-many", "How much / how many", "Quantity questions for different noun types.", ["questions", "quantity"], "quantity questions"),
  lesson("A2", "a2-comparatives", "Comparative adjectives", "Comparing two people, things, or ideas.", ["comparatives"], "two-item comparisons"),
  lesson("A2", "a2-superlatives", "Superlative adjectives", "Talking about the highest or lowest in a group.", ["superlatives"], "group comparisons"),
  lesson("A2", "a2-going-to", "Going to for future plans", "Future plans and evidence-based predictions.", ["future", "going-to"], "future intentions"),
  lesson("A2", "a2-will", "Will for predictions and decisions", "Quick decisions, offers, and predictions.", ["future", "will"], "future decisions and predictions"),
  lesson("A2", "a2-first-conditional", "First conditional", "Real future results with if.", ["conditionals", "future"], "real future conditions"),
  lesson("A2", "a2-present-perfect-simple", "Present perfect simple", "Past actions connected to now.", ["present-perfect"], "life experience and results now"),

  lesson("B1", "b1-present-perfect-vs-past-simple", "Present perfect vs past simple", "Connected-to-now actions vs finished past time.", ["present-perfect", "past-simple"], "choosing between now-relevant and finished past actions"),
  lesson("B1", "b1-past-continuous-vs-past-simple", "Past continuous vs past simple", "Background actions and interrupting events.", ["past-continuous", "past-simple"], "past background and interruption"),
  lesson("B1", "b1-used-to", "Used to", "Past habits and states that changed.", ["used-to", "past-habits"], "past habits that are no longer true"),
  lesson("B1", "b1-modals-obligation-advice", "Modal verbs: should / must / have to", "Advice, rules, and obligations.", ["modals", "obligation"], "advice and obligation"),
  lesson("B1", "b1-second-conditional", "Second conditional", "Imaginary present or future situations.", ["conditionals"], "unreal situations"),
  lesson("B1", "b1-passive-basics", "Passive voice basics", "Focusing on the action or object.", ["passive"], "basic passive voice"),
  lesson("B1", "b1-relative-clauses", "Relative clauses", "Adding information about a noun.", ["relative-clauses"], "who, which, that, and where clauses"),
  lesson("B1", "b1-reported-speech-basics", "Reported speech basics", "Reporting what someone said.", ["reported-speech"], "reported statements and tense shifts"),

  lesson("B2", "b2-future-continuous-perfect", "Future continuous and future perfect", "Actions in progress or completed by a future time.", ["future", "advanced-tenses"], "future time relationships"),
  lesson("B2", "b2-third-conditional", "Third conditional", "Imaginary results in the past.", ["conditionals"], "past unreal conditions"),
  lesson("B2", "b2-mixed-conditionals", "Mixed conditionals", "Past causes with present results, and the reverse.", ["conditionals"], "mixed time conditionals"),
  lesson("B2", "b2-passive-advanced", "Passive voice advanced", "Passive reporting and complex passive forms.", ["passive"], "advanced passive structures"),
  lesson("B2", "b2-gerunds-infinitives", "Gerunds and infinitives", "Verb patterns after common verbs.", ["gerunds", "infinitives"], "verb pattern choice"),
  lesson("B2", "b2-participle-clauses", "Participle clauses", "Shortening clauses with -ing and -ed forms.", ["participle-clauses"], "compact clause reduction"),
  lesson("B2", "b2-inversion-emphasis", "Inversion for emphasis", "Formal emphasis after negative adverbials.", ["inversion"], "emphatic word order"),
  lesson("B2", "b2-linking-concession", "Advanced linking and concession clauses", "Although, despite, whereas, and nevertheless.", ["linking", "concession"], "contrast and concession"),

  lesson("C1", "c1-modality-speculation", "Advanced modality and speculation", "Degrees of certainty about past and present.", ["modals", "speculation"], "certainty, deduction, and probability"),
  lesson("C1", "c1-cleft-sentences", "Cleft sentences", "Emphasising one part of a sentence.", ["cleft-sentences", "emphasis"], "focus and emphasis"),
  lesson("C1", "c1-negative-adverbial-inversion", "Inversion after negative adverbials", "Formal inversion after rarely, seldom, not only, and no sooner.", ["inversion", "formal"], "formal emphatic inversion"),
  lesson("C1", "c1-nominalisation", "Nominalisation", "Turning verbs and adjectives into nouns.", ["academic", "nominalisation"], "academic density and abstraction"),
  lesson("C1", "c1-advanced-relative-reduced", "Advanced relative and reduced clauses", "Precise noun expansion and reduced forms.", ["relative-clauses", "reduced-clauses"], "advanced noun modification"),
  lesson("C1", "c1-subjunctive-formal", "Subjunctive and formal structures", "Formal recommendations and requirements.", ["subjunctive", "formal"], "formal grammar after suggest, demand, and recommend"),
  lesson("C1", "c1-hedging-academic", "Hedging and academic grammar", "Careful claims with seem, tend, likely, and may.", ["academic", "hedging"], "softening claims accurately"),
  lesson("C1", "c1-complex-sentence-control", "Complex sentence control for style and precision", "Managing clauses without losing clarity.", ["style", "complex-sentences"], "precise complex sentence structure"),
];

export const grammarCourseById = Object.fromEntries(
  grammarCourse.map((item) => [item.id, item]),
) as Record<string, GrammarCourseLesson>;

export const grammarCourseLevels: GrammarCourseLevel[] = ["A1", "A2", "B1", "B2", "C1"];

export const grammarCourseByLevel = grammarCourseLevels.reduce(
  (acc, level) => {
    acc[level] = grammarCourse.filter((lessonItem) => lessonItem.level === level);
    return acc;
  },
  {} as Record<GrammarCourseLevel, GrammarCourseLesson[]>,
);

export function getLessonMetadataForPrompt(level?: GrammarCourseLevel) {
  return grammarCourse
    .filter((lessonItem) => !level || lessonItem.level === level)
    .map(({ id, level: lessonLevel, title, summary, tags }) => ({
      id,
      level: lessonLevel,
      title,
      summary,
      tags,
    }));
}

function exampleFor(id: string, index: number) {
  const examples: Record<string, [string, string]> = {
    "a1-can-cannot": ["I can swim.", "She cannot drive yet."],
    "a1-be-verbs": ["I am ready.", "They are at school."],
    "a1-present-simple": ["He works every day.", "Water boils at 100 degrees."],
    "a1-present-continuous": ["She is studying now.", "They are waiting outside."],
    "a1-present-simple-vs-continuous": ["I usually walk to work.", "Today I am taking the bus."],
    "a1-past-simple": ["We visited Paris last year.", "She went home early."],
    "a1-basic-questions": ["Do you like tea?", "Is she your teacher?"],
    "a1-there-is-there-are": ["There is a book on the table.", "There are three chairs."],
  };
  return (examples[id] ?? ["This structure improves clarity.", "The form changes the meaning."])[index];
}

function practiceFor(id: string, index: number) {
  const prompts: Record<string, [string, string]> = {
    "a1-can-cannot": ["I ____ speak Spanish. (ability)", "She ____ come today. (negative ability)"],
    "a1-be-verbs": ["They ____ from Vietnam.", "I ____ tired."],
    "a1-present-simple": ["He ____ coffee every morning. (drink)", "The shop ____ at 9. (open)"],
    "a1-present-continuous": ["She ____ now. (study)", "They ____ dinner at the moment. (cook)"],
  };
  return (prompts[id] ?? [`Type the best grammar phrase for ${id}.`, `Correct the grammar phrase for ${id}.`])[index];
}

function answerFor(id: string, index: number) {
  const answers: Record<string, [string, string]> = {
    "a1-can-cannot": ["can", "cannot"],
    "a1-be-verbs": ["are", "am"],
    "a1-present-simple": ["drinks", "opens"],
    "a1-present-continuous": ["is studying", "are cooking"],
  };
  return (answers[id] ?? ["correct phrase", "correct phrase"])[index];
}

function mistakesFor(id: string) {
  if (id.includes("question")) return ["Forgetting the auxiliary verb.", "Using statement word order in a question."];
  if (id.includes("conditional")) return ["Using will in the if-clause.", "Mixing real and unreal time meanings."];
  if (id.includes("passive")) return ["Forgetting the verb be.", "Using the wrong past participle."];
  if (id.includes("perfect")) return ["Using a finished past time with present perfect.", "Confusing result now with a finished event."];
  if (id.includes("continuous")) return ["Forgetting be before verb-ing.", "Using continuous forms for permanent facts."];
  return ["Using the right words in the wrong order.", "Changing more of the sentence than necessary."];
}
