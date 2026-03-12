export type GrammarLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface QuizQuestion {
  question:     string;
  options:      string[];
  correctIndex: number;
  explanation:  string;
}

export interface GrammarLesson {
  id:          string;
  level:       GrammarLevel;
  topic:       string;
  summary:     string;             // one-line description shown on card
  explanation: string;             // markdown-like lesson body
  examples:    { sentence: string; note?: string }[];
  quiz:        QuizQuestion[];
  aiPrompt:    string;             // instructions for GPT to generate practice sentences
}

/* ─────────────────────────────────────────────────────────────────
   A2 — Foundation
───────────────────────────────────────────────────────────────── */

const a2: GrammarLesson[] = [
  {
    id: 'a2-present-tenses',
    level: 'A2',
    topic: 'Simple Present vs Present Continuous',
    summary: 'Habits vs actions happening right now',
    explanation: `**Simple Present** is used for habits, routines, and facts that are generally true.

Use it with frequency adverbs like *always*, *usually*, *often*, *sometimes*, *never*.

**Present Continuous** is used for actions happening right now or temporary situations around the present time.

Form it with: *am/is/are + verb-ing*

Key signal words:
• Simple Present → every day, usually, always, never, on Mondays
• Present Continuous → now, at the moment, currently, today`,
    examples: [
      { sentence: 'She studies English every morning.', note: 'Simple Present — regular habit' },
      { sentence: 'She is studying English right now.', note: 'Present Continuous — happening now' },
      { sentence: 'Water boils at 100°C.', note: 'Simple Present — permanent fact' },
      { sentence: 'I am working on a project this week.', note: 'Present Continuous — temporary situation' },
    ],
    quiz: [
      {
        question: 'Which sentence is correct for a daily routine?',
        options: [
          'He is drinking coffee every morning.',
          'He drinks coffee every morning.',
          'He drink coffee every morning.',
          'He was drinking coffee every morning.',
        ],
        correctIndex: 1,
        explanation: 'Simple Present ("drinks") is used for regular habits and routines.',
      },
      {
        question: 'Which sentence describes something happening right now?',
        options: [
          'They watch a film.',
          'They watched a film.',
          'They are watching a film.',
          'They watch films usually.',
        ],
        correctIndex: 2,
        explanation: '"are watching" (Present Continuous) describes an action in progress at this moment.',
      },
      {
        question: 'Fill in: She _____ in London at the moment, but she usually _____ in Paris.',
        options: [
          'lives / is living',
          'is living / lives',
          'live / living',
          'is living / is living',
        ],
        correctIndex: 1,
        explanation: '"is living" for a temporary situation now; "lives" for the normal/usual state.',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank sentences that test the difference between Simple Present and Present Continuous. Use clear signal words. Format: provide the sentence with a blank (___), state the verb to use, and the correct answer.',
  },
  {
    id: 'a2-articles',
    level: 'A2',
    topic: 'Articles: a, an, the',
    summary: 'When to use a, an, and the',
    explanation: `Articles tell us whether a noun is specific or general.

**A / An** (indefinite articles) — use when introducing something for the first time, or when it is one of many.
• **A** before consonant sounds: *a book, a university*
• **An** before vowel sounds: *an apple, an hour*

**The** (definite article) — use when both speaker and listener know which specific thing is meant, or when referring to something already mentioned.

**No article** — use with plural nouns in general statements, and most proper nouns.`,
    examples: [
      { sentence: 'I saw a dog in the park.', note: 'First mention: "a dog". Known place: "the park".' },
      { sentence: 'The dog was very friendly.', note: 'Second mention — now specific.' },
      { sentence: 'She is an engineer.', note: '"an" before vowel sound "e".' },
      { sentence: 'Dogs are loyal animals.', note: 'General statement — no article.' },
    ],
    quiz: [
      {
        question: 'Choose the correct option: "I need ___ umbrella."',
        options: ['a', 'an', 'the', 'no article'],
        correctIndex: 1,
        explanation: '"umbrella" starts with a vowel sound, so we use "an".',
      },
      {
        question: 'Which is correct: "She plays ___ piano every evening."',
        options: ['a', 'an', 'the', 'no article'],
        correctIndex: 2,
        explanation: 'We use "the" with musical instruments in this fixed expression.',
      },
      {
        question: '"___ Mount Everest is ___ highest mountain in the world."',
        options: ['The / a', 'A / the', 'The / the', '— / the'],
        correctIndex: 3,
        explanation: 'Proper nouns like Mount Everest take no article. Superlatives use "the".',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank sentences testing article usage (a, an, the, or no article). Make them IELTS-relevant topics. Provide the sentence with blank, and the correct answer with a brief reason.',
  },
  {
    id: 'a2-countable',
    level: 'A2',
    topic: 'Countable & Uncountable Nouns',
    summary: 'Some/any, much/many, a lot of',
    explanation: `**Countable nouns** can be singular or plural: *book → books, idea → ideas*
Use: **a/an**, **many**, **few**, **a number of**

**Uncountable nouns** have no plural form: *water, advice, information, furniture, money, time*
Use: **much**, **little**, **a great deal of**

**Some / Any**
• **Some** — in positive sentences and offers/requests
• **Any** — in negative sentences and questions

**A lot of / Lots of** — work with both countable and uncountable nouns.`,
    examples: [
      { sentence: 'There are many books on the shelf.', note: 'Countable → many' },
      { sentence: 'There is not much time left.', note: 'Uncountable → much' },
      { sentence: 'Can I give you some advice?', note: 'Uncountable — "advices" is wrong' },
      { sentence: 'Do you have any questions?', note: '"any" in a question' },
    ],
    quiz: [
      {
        question: '"She gave me ___ useful information."',
        options: ['many', 'a few', 'some', 'several'],
        correctIndex: 2,
        explanation: '"Information" is uncountable; "some" works with uncountable nouns.',
      },
      {
        question: '"There isn\'t ___ traffic today."',
        options: ['many', 'much', 'a few', 'several'],
        correctIndex: 1,
        explanation: '"Traffic" is uncountable, so use "much" (not "many").',
      },
      {
        question: 'Which sentence is INCORRECT?',
        options: [
          'I have a lot of homework.',
          'She gave me two advices.',
          'We need some more water.',
          'There are a few problems.',
        ],
        correctIndex: 1,
        explanation: '"Advice" is uncountable and has no plural. Say "two pieces of advice".',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank sentences about countable/uncountable nouns using much, many, some, any, few, little. Use everyday topics. Provide the sentence, correct answer, and a one-line explanation.',
  },
  {
    id: 'a2-questions',
    level: 'A2',
    topic: 'WH Questions & Question Forms',
    summary: 'Forming questions correctly in English',
    explanation: `Forming questions in English requires an **auxiliary verb** before the subject.

**Yes/No questions:** Auxiliary + Subject + Verb?
• *Do you like coffee?* / *Is she a teacher?* / *Have they arrived?*

**WH Questions:** WH word + Auxiliary + Subject + Verb?
• *Where do you live?* / *What is she doing?* / *Why did he leave?*

**Subject questions** — when the WH word IS the subject, no auxiliary is needed:
• *Who called you?* (NOT: Who did call you?)
• *What happened?* (NOT: What did happen?)

**Indirect questions** — used in formal/polite contexts — keep normal word order (no inversion):
• *Can you tell me where the station is?* (NOT: where is the station)`,
    examples: [
      { sentence: 'What time does the train leave?', note: 'WH + auxiliary (does) + subject (the train)' },
      { sentence: 'Who wrote this letter?', note: 'Subject question — "who" is the subject, no auxiliary' },
      { sentence: 'Could you tell me how long the course lasts?', note: 'Indirect question — normal word order' },
      { sentence: 'How many people attended the conference?', note: 'WH + noun phrase as subject' },
    ],
    quiz: [
      {
        question: 'Which question is correctly formed?',
        options: [
          'Where does she lives?',
          'Where does she live?',
          'Where she does live?',
          'Where live she?',
        ],
        correctIndex: 1,
        explanation: 'WH + auxiliary (does) + subject (she) + base verb (live). No -s on the main verb after auxiliary.',
      },
      {
        question: '"___ won the first prize?" "Maria did."',
        options: [
          'Who did win',
          'Who won',
          'Who did',
          'Whom won',
        ],
        correctIndex: 1,
        explanation: '"Who" is the subject here (it performed the action), so no auxiliary is needed — subject question.',
      },
      {
        question: 'Choose the correct indirect question: "I\'d like to know ___."',
        options: [
          'where is the nearest hospital',
          'where the nearest hospital is',
          'where does the nearest hospital is',
          'where is it the nearest hospital',
        ],
        correctIndex: 1,
        explanation: 'Indirect questions use normal statement word order: subject + verb (not inverted).',
      },
    ],
    aiPrompt: 'Generate 3 exercises on English question formation. Include one direct WH question, one subject question, and one indirect question. Ask students to rewrite statements as questions or identify the error. Provide correct answers and explanations.',
  },
  {
    id: 'a2-future',
    level: 'A2',
    topic: 'Future: Will vs Going To',
    summary: 'Predictions, decisions, and plans',
    explanation: `English has several ways to talk about the future. The two most common are **will** and **going to**.

**Will** is used for:
• Spontaneous decisions (made at the moment of speaking): *I'll answer that.*
• Predictions based on opinion/belief (no evidence): *I think it will rain tomorrow.*
• Offers, promises, requests: *I'll help you with that.*

**Going to** is used for:
• Intentions and plans already decided: *I'm going to study abroad next year.*
• Predictions based on present evidence: *Look at those clouds — it's going to rain.*

**Present Continuous** can also express confirmed, scheduled future plans:
• *We're meeting the client on Monday.* (diary/calendar event)

💡 The key difference: **will** = decision NOW, **going to** = decision BEFORE now.`,
    examples: [
      { sentence: '"The phone is ringing." "I\'ll get it!"', note: 'Spontaneous decision → will' },
      { sentence: 'She\'s going to start a new job next month.', note: 'Pre-made plan → going to' },
      { sentence: 'He\'s going to fall — look at the ice!', note: 'Evidence-based prediction → going to' },
      { sentence: 'I think renewable energy will replace fossil fuels.', note: 'Opinion-based prediction → will' },
    ],
    quiz: [
      {
        question: 'A: "We have no milk." B: "Don\'t worry, ___ get some."',
        options: [
          'I\'m going to',
          'I will',
          'I am',
          'I would',
        ],
        correctIndex: 1,
        explanation: 'The decision is made RIGHT NOW in response to the problem → will (spontaneous decision).',
      },
      {
        question: 'She\'s already booked flights. "___ visit Japan next spring."',
        options: [
          'She will',
          'She is going to',
          'She visits',
          'She would',
        ],
        correctIndex: 1,
        explanation: 'A plan already decided before speaking → going to.',
      },
      {
        question: '"Look at that car — it ___ crash!"',
        options: [
          'will',
          'is going to',
          'would',
          'is about will',
        ],
        correctIndex: 1,
        explanation: 'Clear present evidence of what is about to happen → going to.',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank or error-correction exercises testing will vs going to. Include a spontaneous decision context, a pre-planned intention, and an evidence-based prediction. Provide correct answers and brief explanations.',
  },
];

/* ─────────────────────────────────────────────────────────────────
   B1 — Intermediate
───────────────────────────────────────────────────────────────── */

const b1: GrammarLesson[] = [
  {
    id: 'b1-past-perfect',
    level: 'B1',
    topic: 'Past Simple vs Present Perfect',
    summary: 'Completed past vs relevance to now',
    explanation: `**Past Simple** — a completed action at a specific time in the past.
Always used with: *yesterday, last year, in 2010, ago, when I was young*

**Present Perfect** — a past action with a connection to the present, or an experience without a specific time.
Formed with: **have/has + past participle**

Key signal words:
• Present Perfect → *just, already, yet, ever, never, recently, since, for*
• Past Simple → *yesterday, last week, in [year], ago*

❗ If you mention a specific past time, use Past Simple — not Present Perfect.`,
    examples: [
      { sentence: 'I visited Tokyo in 2019.', note: 'Specific time → Past Simple' },
      { sentence: 'I have visited Tokyo.', note: 'No specific time, life experience → Present Perfect' },
      { sentence: 'She has just finished her essay.', note: '"just" → Present Perfect' },
      { sentence: 'He finished his essay an hour ago.', note: '"ago" → Past Simple' },
    ],
    quiz: [
      {
        question: '"I ___ my keys. I can\'t find them anywhere." (just / lose)',
        options: [
          'lost my keys just',
          'have just lost my keys',
          'just lost my keys',
          'had just lost my keys',
        ],
        correctIndex: 1,
        explanation: '"just" + a situation relevant to now → Present Perfect: "have just lost".',
      },
      {
        question: '"___ you ever ___ sushi?" "Yes, I ___ it last year in Japan."',
        options: [
          'Did / eat / have eaten',
          'Have / eaten / ate',
          'Did / ate / have eaten',
          'Have / eat / ate',
        ],
        correctIndex: 1,
        explanation: 'Ever + life experience → Present Perfect. Specific past time (last year) → Past Simple.',
      },
      {
        question: 'Which sentence is INCORRECT?',
        options: [
          'She has already seen that film.',
          'We have moved to a new flat last month.',
          'Have you spoken to him yet?',
          'They have known each other for years.',
        ],
        correctIndex: 1,
        explanation: '"last month" is a specific past time, so use Past Simple: "We moved to a new flat last month."',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank sentences testing Past Simple vs Present Perfect. Include time signal words like "just", "ago", "already", "last year", "ever". Provide the verb in brackets, the correct tense form, and explanation.',
  },
  {
    id: 'b1-conditionals',
    level: 'B1',
    topic: 'Conditionals: Type 1 & 2',
    summary: 'Real and hypothetical conditions',
    explanation: `**First Conditional** — real/likely situations in the future.
Structure: **If + Present Simple, will + base verb**
Used for: realistic possibilities, warnings, promises.

**Second Conditional** — unreal/imaginary situations in the present or future.
Structure: **If + Past Simple, would + base verb**
Used for: hypothetical or unlikely situations, advice (If I were you…).

⚠️ In Second Conditional, use **"were"** for all subjects (not "was") in formal writing:
*If I were taller… / If she were here…*`,
    examples: [
      { sentence: 'If it rains tomorrow, I will stay at home.', note: 'Type 1 — likely future scenario' },
      { sentence: 'If I won the lottery, I would travel the world.', note: 'Type 2 — imaginary/unlikely' },
      { sentence: 'If I were you, I would apologise.', note: 'Type 2 — advice, "were" for all subjects' },
      { sentence: 'If she studies hard, she will pass the exam.', note: 'Type 1 — realistic condition' },
    ],
    quiz: [
      {
        question: '"If I ___ more time, I ___ learn a new instrument." (have / will learn or had / would learn)',
        options: [
          'have / will learn',
          'had / would learn',
          'have / would learn',
          'had / will learn',
        ],
        correctIndex: 1,
        explanation: 'This is hypothetical (the person doesn\'t have time), so Type 2: "had / would learn".',
      },
      {
        question: '"If you ___ your passport, you ___ board the plane."',
        options: [
          'forgot / wouldn\'t',
          'forget / won\'t',
          'will forget / won\'t',
          'would forget / wouldn\'t',
        ],
        correctIndex: 1,
        explanation: 'Real possibility (Type 1): "If + Present Simple, will + base verb".',
      },
      {
        question: 'Which is the more natural way to give advice?',
        options: [
          'If I am you, I will see a doctor.',
          'If I were you, I would see a doctor.',
          'If I was you, I see a doctor.',
          'If I be you, I would see a doctor.',
        ],
        correctIndex: 1,
        explanation: 'Type 2 with "were" (not "was") is the standard form for advice.',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank sentences testing First and Second Conditionals. Mix likely future scenarios and hypothetical ones. Provide the verbs in brackets, correct answers, and short explanations.',
  },
  {
    id: 'b1-passive',
    level: 'B1',
    topic: 'Passive Voice',
    summary: 'Focus on the action, not the doer',
    explanation: `Use the **Passive Voice** when:
• The agent (doer) is unknown, unimportant, or obvious
• You want to focus on the action or result rather than who did it
• It is common in academic/formal writing

**Structure: be + past participle**

| Tense | Active | Passive |
|---|---|---|
| Present Simple | They make cars here. | Cars are made here. |
| Past Simple | Someone stole my bag. | My bag was stolen. |
| Present Perfect | They have built a new bridge. | A new bridge has been built. |
| Future | They will announce the results. | The results will be announced. |

To mention the agent, add **by**: *The letter was written by the CEO.*`,
    examples: [
      { sentence: 'The report is written by the manager every week.', note: 'Present Simple passive' },
      { sentence: 'The building was designed in 1920.', note: 'Past Simple passive — agent unknown/unimportant' },
      { sentence: 'A decision has been made.', note: 'Present Perfect passive' },
      { sentence: 'The results will be published tomorrow.', note: 'Future passive' },
    ],
    quiz: [
      {
        question: 'Change to passive: "Scientists discovered a new species."',
        options: [
          'A new species discovered by scientists.',
          'A new species was discovered by scientists.',
          'A new species is discovered by scientists.',
          'A new species were discovered by scientists.',
        ],
        correctIndex: 1,
        explanation: 'Past Simple passive: was/were + past participle. "species" is singular → "was discovered".',
      },
      {
        question: '"The exam results ___ tomorrow." (announce — future passive)',
        options: [
          'are announced',
          'will announce',
          'will be announced',
          'are being announced',
        ],
        correctIndex: 2,
        explanation: 'Future passive: will + be + past participle → "will be announced".',
      },
      {
        question: 'Which passive sentence is INCORRECT?',
        options: [
          'The windows were cleaned this morning.',
          'The cake has been eaten.',
          'The letter was wrote by her.',
          'English is spoken in over 50 countries.',
        ],
        correctIndex: 2,
        explanation: '"wrote" is the past tense, not the past participle. Correct form: "was written".',
      },
    ],
    aiPrompt: 'Generate 3 exercises about passive voice (Present Simple, Past Simple, and one other tense). Either ask to transform an active sentence to passive, or fill in a passive structure. Provide correct answers and brief explanations.',
  },
  {
    id: 'b1-modals',
    level: 'B1',
    topic: 'Modal Verbs: Ability, Obligation & Advice',
    summary: 'Can, must, should, have to, need to',
    explanation: `**Ability**
• **Can / Could** — present/past ability: *She can speak three languages. He could swim at age 5.*
• **Be able to** — used in all tenses: *I will be able to attend.*

**Obligation / Necessity**
• **Must** — strong internal obligation (speaker's opinion): *You must register before midnight.*
• **Have to** — external obligation (rule/law): *You have to wear a seatbelt.*
• **Mustn't** — prohibition (NOT allowed): *You mustn't use your phone here.*
• **Don't have to** — no obligation (it's optional): *You don't have to come.*

**Advice & Recommendation**
• **Should / Ought to** — advice, recommendation: *You should drink more water.*
• **Had better** — strong advice (warning of consequences): *You'd better hurry or you'll miss the bus.*

⚠️ **Must ≠ Have to** in negation: *mustn't* = forbidden; *don't have to* = not necessary.`,
    examples: [
      { sentence: 'Passengers must fasten their seatbelts during takeoff.', note: 'Strong obligation / rule' },
      { sentence: 'You don\'t have to pay — it\'s free.', note: 'No obligation (but you can if you want)' },
      { sentence: 'You mustn\'t park here — it\'s a fire lane.', note: 'Prohibition' },
      { sentence: 'You should get more sleep if you\'re tired.', note: 'Advice' },
    ],
    quiz: [
      {
        question: '"The ticket is free — you ___ pay."',
        options: ['mustn\'t', 'don\'t have to', 'shouldn\'t', 'can\'t'],
        correctIndex: 1,
        explanation: '"Don\'t have to" = not necessary/optional. "Mustn\'t" = forbidden — very different meaning!',
      },
      {
        question: 'Which sentence gives a warning/strong advice?',
        options: [
          'You should see a doctor.',
          'You must see a doctor.',
          'You\'d better see a doctor or it will get worse.',
          'You can see a doctor.',
        ],
        correctIndex: 2,
        explanation: '"Had better + base verb" implies a warning: bad consequences if you don\'t follow the advice.',
      },
      {
        question: '"In most countries, drivers ___ stop at a red light."',
        options: ['should', 'must', 'have to', 'can'],
        correctIndex: 2,
        explanation: '"Have to" is used for external rules/laws (traffic law here), not just personal obligation.',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank exercises on modal verbs (must/have to/mustn\'t/don\'t have to/should/had better). Create clear contexts — one about a rule, one about advice, one testing the must vs have to contrast. Provide correct answers and explanations.',
  },
  {
    id: 'b1-reported',
    level: 'B1',
    topic: 'Reported Speech',
    summary: 'Say vs tell, tense backshift, reporting questions',
    explanation: `**Reported speech** (indirect speech) is used when we tell someone what another person said, without using their exact words.

**Say vs Tell**
• **Say** — no object needed: *She said (that) she was tired.*
• **Tell** — must have an object (person): *She told me (that) she was tired.*

**Tense backshift** — when reporting past speech, tenses shift back:
| Direct | Reported |
|---|---|
| is/are → | was/were |
| will → | would |
| can → | could |
| have/has done → | had done |
| Past Simple → | Past Perfect |

**Reporting questions:**
• Yes/No questions: *if/whether + statement word order*
  *"Are you coming?" → He asked if I was coming.*
• WH questions: *WH word + statement word order*
  *"Where do you live?" → She asked where I lived.*

⚠️ In reported questions, there is NO auxiliary do/does/did, and NO question mark.`,
    examples: [
      { sentence: '"I\'m exhausted." → She said (that) she was exhausted.', note: 'Tense shifts: am → was' },
      { sentence: '"Will you help?" → He asked if I would help.', note: 'Yes/No question → if + statement order' },
      { sentence: '"Where did you go?" → She asked where I had gone.', note: 'WH question + tense backshift' },
      { sentence: 'He told the class that the exam had been cancelled.', note: '"tell" requires object (the class)' },
    ],
    quiz: [
      {
        question: '"I will call you tomorrow." → She said that she ___ call me the next day.',
        options: ['will', 'would', 'can', 'could'],
        correctIndex: 1,
        explanation: '"Will" backshifts to "would" in reported speech.',
      },
      {
        question: '"Are you a student?" → He asked me ___ a student.',
        options: [
          'if I am',
          'whether I was',
          'if was I',
          'that I was',
        ],
        correctIndex: 1,
        explanation: 'Yes/No question reported with "whether/if" + normal word order + backshifted tense.',
      },
      {
        question: 'Which sentence correctly uses "tell"?',
        options: [
          'She told that she needed help.',
          'She told to me she needed help.',
          'She told me she needed help.',
          'She said me she needed help.',
        ],
        correctIndex: 2,
        explanation: '"Tell" always needs a direct object (me, him, them, the class, etc.). "Said me" is incorrect.',
      },
    ],
    aiPrompt: 'Generate 3 reported speech exercises. Ask students to convert direct speech to reported speech. Include one statement, one yes/no question, and one WH question. Include tense backshift and any necessary pronoun/time expression changes. Provide correct answers and explanations.',
  },
];

/* ─────────────────────────────────────────────────────────────────
   B2 — Upper Intermediate
───────────────────────────────────────────────────────────────── */

const b2: GrammarLesson[] = [
  {
    id: 'b2-conditionals-3',
    level: 'B2',
    topic: 'Type 3 & Mixed Conditionals',
    summary: 'Past regrets and mixed time frames',
    explanation: `**Third Conditional** — imagining a different past (regrets, hypothetical past outcomes).
Structure: **If + Past Perfect, would have + past participle**

**Mixed Conditional** — a past condition with a present result, or vice versa.
• Past → Present: *If + Past Perfect, would + base verb*
  (If that event hadn't happened in the past → different situation now)
• Present → Past: *If + Past Simple, would have + past participle*
  (If a present fact were different → past would have been different)`,
    examples: [
      { sentence: 'If she had studied harder, she would have passed the exam.', note: 'Type 3 — imagined different past' },
      { sentence: 'If I hadn\'t missed that flight, I would be in Paris now.', note: 'Mixed — past event, present result' },
      { sentence: 'If he were more confident, he would have spoken at the conference.', note: 'Mixed — present trait, past result' },
      { sentence: 'We wouldn\'t have got lost if we had brought a map.', note: 'Type 3 — inverted word order' },
    ],
    quiz: [
      {
        question: '"If they ___ the warning, the accident ___ ." (heed / not happen)',
        options: [
          'heeded / wouldn\'t happen',
          'had heeded / wouldn\'t have happened',
          'have heeded / won\'t happen',
          'heeded / wouldn\'t have happened',
        ],
        correctIndex: 1,
        explanation: 'Type 3: If + Past Perfect, would have + past participle.',
      },
      {
        question: '"If I ___ a better memory, I ___ forgotten your birthday." (have / not)',
        options: [
          'had / wouldn\'t have',
          'had had / wouldn\'t have',
          'have / won\'t have',
          'had / wouldn\'t',
        ],
        correctIndex: 1,
        explanation: 'Mixed conditional: present state (bad memory) → past result. If + Past Perfect, would have + pp.',
      },
      {
        question: 'Identify the mixed conditional: present → past direction',
        options: [
          'If she had left earlier, she wouldn\'t be late now.',
          'If he were more organised, he would have submitted on time.',
          'If they had invested wisely, they would be rich today.',
          'If I hadn\'t eaten so much, I would feel better.',
        ],
        correctIndex: 1,
        explanation: 'Present state (not organised) → past result (didn\'t submit). This is present→past mixed conditional.',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank exercises on Third Conditional and Mixed Conditionals. Mix regret scenarios and mixed time frames. Provide verbs in brackets, correct answers, and explanations distinguishing the type used.',
  },
  {
    id: 'b2-relative-clauses',
    level: 'B2',
    topic: 'Relative Clauses',
    summary: 'Defining and non-defining relative clauses',
    explanation: `Relative clauses give more information about a noun.

**Defining relative clauses** — essential information (no commas)
*The student who works hardest will succeed.*

**Non-defining relative clauses** — extra information, not essential (use commas)
*My sister, who lives in London, is a doctor.*

**Relative pronouns:**
• **who** — people
• **which** — things
• **that** — people or things (defining clauses only)
• **whose** — possession
• **where** — places
• **when** — times

⚠️ You can omit the pronoun in defining clauses when it is the object:
*The book (that) I read was fascinating.*`,
    examples: [
      { sentence: 'The woman who called you is my professor.', note: 'Defining — essential information' },
      { sentence: 'My father, who is 65, still runs marathons.', note: 'Non-defining — extra info, use commas' },
      { sentence: 'The city where I grew up has changed a lot.', note: '"where" for places' },
      { sentence: 'That\'s the student whose essay won first prize.', note: '"whose" for possession' },
    ],
    quiz: [
      {
        question: '"The research ___ was published last year has changed the field."',
        options: ['who', 'which', 'whose', 'where'],
        correctIndex: 1,
        explanation: '"which" is used for things (the research). "who" is for people.',
      },
      {
        question: 'Which sentence uses a non-defining relative clause correctly?',
        options: [
          'The company which I work for is expanding.',
          'Oxford, which was founded in 1096, is one of the oldest universities.',
          'The man that lives next door is a pilot.',
          'I liked the film which we watched last night.',
        ],
        correctIndex: 1,
        explanation: 'Non-defining clauses use commas and give extra (non-essential) information about a unique noun.',
      },
      {
        question: '"2008 was the year ___ the financial crisis began."',
        options: ['which', 'who', 'when', 'where'],
        correctIndex: 2,
        explanation: '"when" is used with time expressions like "the year", "the day", "the time".',
      },
    ],
    aiPrompt: 'Generate 3 exercises on defining and non-defining relative clauses. Ask students to combine two sentences using the correct relative pronoun, or fill in the missing pronoun. Include "who", "which", "whose", "where", "when". Provide correct answers and explanations.',
  },
  {
    id: 'b2-modals-speculation',
    level: 'B2',
    topic: 'Modal Verbs for Deduction',
    summary: 'Must, can\'t, might, could for certainty',
    explanation: `Use modals to express how certain you are about a situation.

**About the present:**
• **must + base verb** — almost certain it's true (*He must be tired — he's worked 12 hours.*)
• **can't + base verb** — almost certain it's false (*She can't be home — her car isn't here.*)
• **might/could/may + base verb** — possible but uncertain (*It might be him at the door.*)

**About the past:**
• **must have + past participle** — almost certain it happened
• **can't have + past participle** — almost certain it didn't happen
• **might/could have + past participle** — possibly happened

⚠️ Never say *"must to"* or *"can't to"* — modals are followed directly by the base verb.`,
    examples: [
      { sentence: 'He must be exhausted after that journey.', note: 'Present deduction — very likely true' },
      { sentence: 'That can\'t be right — I checked twice.', note: 'Present deduction — almost certainly false' },
      { sentence: 'She might have missed the train.', note: 'Past speculation — possible' },
      { sentence: 'They must have left already — the lights are off.', note: 'Past deduction — very likely' },
    ],
    quiz: [
      {
        question: '"The lights are on and I can hear music. Someone ___ be home."',
        options: ['can\'t', 'must', 'couldn\'t', 'wouldn\'t'],
        correctIndex: 1,
        explanation: 'Strong evidence something is true → "must be".',
      },
      {
        question: '"He ___ have eaten all that food — it was meant for ten people!"',
        options: ['must', 'might', 'can\'t', 'could'],
        correctIndex: 2,
        explanation: 'Almost impossible → "can\'t have + past participle".',
      },
      {
        question: '"I\'m not sure where Ana is. She ___ have gone to the library or the gym."',
        options: ['must', 'can\'t', 'could', 'shouldn\'t'],
        correctIndex: 2,
        explanation: 'Uncertainty about past action → "could have + past participle".',
      },
    ],
    aiPrompt: 'Generate 3 fill-in-the-blank exercises on modal verbs for deduction (must, can\'t, might/could + base verb or have + past participle). Create scenarios with context clues. Provide the correct modal form and explanation of the certainty level expressed.',
  },
  {
    id: 'b2-wish',
    level: 'B2',
    topic: 'Wish & If Only',
    summary: 'Expressing regrets and hypothetical desires',
    explanation: `**Wish** and **If only** express desires and regrets about things that are contrary to reality. The tense after *wish/if only* follows the same logic as conditionals.

**Wish + Past Simple** — about the present (something is not true now, but you want it to be):
• *I wish I had more time.* (= I don't have time now)
• *If only she lived closer!* (= She lives far away)

**Wish + Past Perfect** — about the past (regret about something that happened):
• *I wish I had studied harder.* (= I didn't study hard enough)
• *If only he hadn't left so early.* (= He left too early)

**Wish + Would** — expressing annoyance or wanting someone to change their behaviour:
• *I wish you would stop interrupting!* (= You keep interrupting and I'm frustrated)
• *I wish it would stop raining.* (= impatience about the rain)

⚠️ Never use *wish + would* to talk about yourself: ✗ *I wish I would be taller.*`,
    examples: [
      { sentence: 'I wish I could speak Japanese fluently.', note: 'Wish + Past Simple — present ability I don\'t have' },
      { sentence: 'If only we had booked the tickets earlier!', note: 'Wish + Past Perfect — past regret' },
      { sentence: 'I wish my neighbour would turn the music down.', note: 'Wish + would — annoyance at someone\'s behaviour' },
      { sentence: 'She wishes she had chosen a different career path.', note: 'Regret about a past decision' },
    ],
    quiz: [
      {
        question: '"I hate living in this tiny flat." → I wish I ___ in a bigger place.',
        options: ['live', 'lived', 'had lived', 'would live'],
        correctIndex: 1,
        explanation: 'Wish + Past Simple for a present situation you want to be different.',
      },
      {
        question: '"She regrets not applying for the scholarship." → She wishes she ___ for it.',
        options: [
          'applied',
          'had applied',
          'would apply',
          'applies',
        ],
        correctIndex: 1,
        explanation: 'Past regret (the opportunity is gone) → Wish + Past Perfect.',
      },
      {
        question: '"He keeps interrupting." → I wish he ___ interrupting.',
        options: [
          'stopped',
          'had stopped',
          'would stop',
          'stops',
        ],
        correctIndex: 2,
        explanation: 'Annoyance at someone\'s current behaviour → Wish + would + base verb.',
      },
    ],
    aiPrompt: 'Generate 3 wish/if only exercises. Cover one present wish (wish + past simple), one past regret (wish + past perfect), and one annoyance (wish + would). Give context situations and ask students to complete the wish sentence. Provide correct answers and explanations.',
  },
  {
    id: 'b2-participles',
    level: 'B2',
    topic: 'Participle Clauses',
    summary: '-ing and -ed clauses to add information concisely',
    explanation: `**Participle clauses** are reduced relative or adverbial clauses that make writing more concise and sophisticated — common in IELTS Writing Task 1 and 2.

**Present participle (-ing)** — for active meaning (the noun is doing the action):
• *The man standing by the window is my professor.* (= who is standing)
• *Having finished her work, she went home.* (= After she had finished)

**Past participle (-ed)** — for passive meaning (the noun receives the action):
• *The report written by the committee was rejected.* (= which was written)
• *Exhausted by the journey, he fell asleep immediately.* (= Because he was exhausted)

**Time/Reason clauses with -ing:**
• *Walking along the river, she spotted a rare bird.* (while walking)
• *Not knowing the answer, he stayed silent.* (because he didn't know)

**Having + past participle** — shows one action completed before another:
• *Having saved enough money, they finally moved abroad.*`,
    examples: [
      { sentence: 'The data collected in 2023 shows a clear trend.', note: 'Past participle clause = which was collected' },
      { sentence: 'Having completed the survey, researchers analysed the results.', note: 'Having + pp = after completing' },
      { sentence: 'Feeling anxious, she decided to take a walk.', note: 'Present participle = because/as she felt' },
      { sentence: 'The policy introduced last year has had mixed results.', note: 'Past participlepost-noun modifier' },
    ],
    quiz: [
      {
        question: 'Reduce: "Because she had not eaten all day, she felt faint."',
        options: [
          'Not eating all day, she felt faint.',
          'Not having eaten all day, she felt faint.',
          'Having not eaten all day, she felt faint.',
          'Not been eating all day, she felt faint.',
        ],
        correctIndex: 1,
        explanation: '"Not having + past participle" expresses a reason completed before the main action.',
      },
      {
        question: '"The results ___ in this table suggest a positive correlation."',
        options: [
          'showing',
          'shown',
          'have shown',
          'shows',
        ],
        correctIndex: 1,
        explanation: 'Passive meaning (results are shown/displayed) → past participle clause.',
      },
      {
        question: 'Which sentence uses a participle clause correctly?',
        options: [
          'Running to the station, my bag was dropped.',
          'Running to the station, I dropped my bag.',
          'Running to the station, the bag dropped by me.',
          'Running to the station, it was dropped.',
        ],
        correctIndex: 1,
        explanation: 'The subject of the participle clause must match the subject of the main clause ("I" ran and "I" dropped).',
      },
    ],
    aiPrompt: 'Generate 3 participle clause exercises. Ask students to reduce a full clause to a participle clause (active -ing or passive -ed), or identify the error in a dangling participle. Cover academic writing contexts. Provide correct answers and explanations.',
  },
];

/* ─────────────────────────────────────────────────────────────────
   C1 — Advanced
───────────────────────────────────────────────────────────────── */

const c1: GrammarLesson[] = [
  {
    id: 'c1-inversion',
    level: 'C1',
    topic: 'Inversion for Emphasis',
    summary: 'Fronting negatives and adverbials for effect',
    explanation: `**Inversion** means placing the auxiliary verb before the subject for emphasis or formality. It is common in academic writing, formal speeches, and IELTS Writing Task 2.

**Negative adverbials at the start of a clause:**
• *Never have I seen such dedication.*
• *Rarely does she make a mistake.*
• *Not only did they win, but they also broke the record.*
• *Hardly had we arrived when it started to rain.*

**"Only" + adverbial at the start:**
• *Only after the meeting did we realise the truth.*
• *Only when prices rise do consumers complain.*

**"So/Such" at the start:**
• *So difficult was the exam that half the students failed.*
• *Such was the pressure that she quit.*

The structure after the inverted auxiliary mirrors a question form: *Rarely does he + base verb.*`,
    examples: [
      { sentence: 'Never before had the city experienced such flooding.', note: '"Never" fronted → inversion' },
      { sentence: 'Not only is she talented, but she is also hardworking.', note: '"Not only" → inversion in both clauses' },
      { sentence: 'Only by working together can we solve this problem.', note: '"Only by" + inversion' },
      { sentence: 'So convincing was his argument that no one disagreed.', note: '"So + adj" fronted → inversion' },
    ],
    quiz: [
      {
        question: 'Rewrite with inversion: "We had hardly started when the power cut out."',
        options: [
          'Hardly we had started when the power cut out.',
          'Hardly had we started when the power cut out.',
          'Hardly we started when the power cut out.',
          'Hardly started had we when the power cut out.',
        ],
        correctIndex: 1,
        explanation: 'Inversion: "Hardly + auxiliary (had) + subject (we) + past participle".',
      },
      {
        question: '"___ does the government address the root causes of poverty."',
        options: [
          'Rarely',
          'Rarely it',
          'It rarely',
          'That rarely',
        ],
        correctIndex: 0,
        explanation: '"Rarely" at the start triggers inversion: Rarely + does + subject. (The subject follows the auxiliary.)',
      },
      {
        question: '"Not only ___ the deadline, but she ___ praised for her work."',
        options: [
          'she met / was also',
          'did she meet / was also',
          'she did meet / also was',
          'met she / was also',
        ],
        correctIndex: 1,
        explanation: '"Not only" triggers inversion: did + subject + base verb. The second clause also inverts: "was she also praised".',
      },
    ],
    aiPrompt: 'Generate 3 inversion exercises for advanced learners. Either ask to rewrite a normal sentence using inversion with a given negative adverbial (Never, Rarely, Not only, Hardly, Only when), or fill in the inverted structure. Provide correct answers and note which type of inversion is used.',
  },
  {
    id: 'c1-cleft',
    level: 'C1',
    topic: 'Cleft Sentences',
    summary: 'It is… that / What… is for focus and emphasis',
    explanation: `**Cleft sentences** split a simple sentence into two clauses to highlight specific information.

**It-cleft:** *It + be + [focus] + that/who + rest of sentence*
• Normal: *The government introduced the policy.*
• Cleft: *It was the government that introduced the policy.* (focus on who)
• Cleft: *It was the policy that the government introduced.* (focus on what)

**Wh-cleft (pseudo-cleft):** *What + clause + be + [focus]*
• Normal: *I need your support.*
• Wh-cleft: *What I need is your support.*
• Can be reversed: *Your support is what I need.*

**All-cleft:** *All + clause + be + [focus]* — suggests something is the only thing
• *All I want is a good night's sleep.*`,
    examples: [
      { sentence: 'It was in 1969 that humans first landed on the moon.', note: 'It-cleft focusing on time' },
      { sentence: 'It is climate change that poses the greatest threat.', note: 'It-cleft focusing on subject' },
      { sentence: 'What surprised everyone was the speed of the recovery.', note: 'Wh-cleft — subject focus' },
      { sentence: 'All the research shows is a correlation, not causation.', note: 'All-cleft — limiting focus' },
    ],
    quiz: [
      {
        question: 'Transform using an it-cleft to focus on "the high cost": "The high cost put people off."',
        options: [
          'It was the high cost which put people off.',
          'It was the high cost that put people off.',
          'The high cost, it was that put people off.',
          'What put people off it was the high cost.',
        ],
        correctIndex: 1,
        explanation: 'It-cleft: It + was + [focus: the high cost] + that + rest. "that" is preferred over "which" in clefts.',
      },
      {
        question: '"___ the delegates found most challenging ___ the sheer volume of data."',
        options: [
          'It / was',
          'What / was',
          'That / were',
          'All / is',
        ],
        correctIndex: 1,
        explanation: 'Wh-cleft: What + clause + was + [focus]. "What the delegates found most challenging was..."',
      },
      {
        question: 'Which cleft sentence sounds most natural?',
        options: [
          'It is why that she left.',
          'What she did was to resign immediately.',
          'It was to resign immediately that she did.',
          'All what matters is the outcome.',
        ],
        correctIndex: 1,
        explanation: 'Wh-cleft with "to + infinitive" after "was" is natural. "It is why/that" without a clear noun focus is awkward.',
      },
    ],
    aiPrompt: 'Generate 3 cleft sentence exercises. Ask students to rewrite sentences using it-clefts or wh-clefts to focus on a specified element (subject, object, time, reason). Provide the original sentence, the element to focus on, the correct cleft form, and a brief explanation.',
  },
  {
    id: 'c1-advanced-passive',
    level: 'C1',
    topic: 'Advanced Passive Structures',
    summary: 'Reporting passives, have/get something done',
    explanation: `**Reporting verbs in passive** — used to present information impersonally (very common in academic writing):
• *It is believed/claimed/argued/reported that + clause*
• *[Subject] is believed/claimed/reported + to + infinitive*
  — *It is believed that the vaccine is effective.*
  — *The vaccine is believed to be effective.*

**Passive with infinitive for different times:**
• Present: *He is thought to be living abroad.*
• Past: *She is reported to have left the company.*
• Perfect: *They are known to have committed fraud.*

**Have/get something done** — use when someone else performs the action for you:
• *I had my car repaired.* (someone repaired it for me)
• *She is getting her hair cut tomorrow.*
• Can also imply an unwanted event: *He had his wallet stolen.*`,
    examples: [
      { sentence: 'It is widely accepted that exercise improves mental health.', note: 'Reporting passive — impersonal' },
      { sentence: 'The suspect is alleged to have fled the country.', note: 'Passive + perfect infinitive for past action' },
      { sentence: 'We need to have this document translated.', note: '"Have something done" — commissioned action' },
      { sentence: 'She had her phone stolen on the train.', note: '"Have something done" — unwanted event' },
    ],
    quiz: [
      {
        question: 'Rewrite impersonally: "People say that the economy is recovering."',
        options: [
          'It says that the economy is recovering.',
          'It is said that the economy is recovering.',
          'People are said the economy is recovering.',
          'The economy says to be recovering.',
        ],
        correctIndex: 1,
        explanation: 'Reporting passive: "It is said/believed/thought + that clause".',
      },
      {
        question: '"The ancient temple ___ to ___ built over 2,000 years ago."',
        options: [
          'believed / be',
          'is believed / have been',
          'believes / have been',
          'is believing / be',
        ],
        correctIndex: 1,
        explanation: 'Past action from present perspective: "is believed to have been + past participle".',
      },
      {
        question: '"I must ___ my laptop ___ before the presentation."',
        options: [
          'fix / fixing',
          'have / fix',
          'have / fixed',
          'get / fix',
        ],
        correctIndex: 2,
        explanation: '"Have something done": have + object + past participle. "have my laptop fixed".',
      },
    ],
    aiPrompt: 'Generate 3 exercises on advanced passive structures: reporting passives (It is believed/said/reported that... or Subject + is believed/reported + to + infinitive) and "have/get something done". Provide context sentences, ask students to rewrite or fill in, and give correct answers with explanations.',
  },
  {
    id: 'c1-discourse',
    level: 'C1',
    topic: 'Discourse Markers & Cohesion',
    summary: 'Linking ideas with precision and flow',
    explanation: `Discourse markers signal the logical relationship between ideas. Precise use is key to a Band 7+ writing score.

**Adding / Reinforcing**
*Furthermore, Moreover, In addition, What is more, Not only … but also*

**Contrasting / Conceding**
*However, Nevertheless, Nonetheless, While, Whereas, Despite + noun/gerund, Although + clause, Even though, In spite of*

**Cause & Effect**
*Consequently, Therefore, As a result, Hence, Thus, This leads to, Owing to, Due to*

**Exemplifying**
*For instance, For example, To illustrate, Such as, Namely*

**Summarising / Concluding**
*In conclusion, To summarise, On balance, Overall, In short, All things considered*

**Nuance rules:**
• *Despite / In spite of* + noun/gerund (NOT a clause)
• *Although / Even though / While* + clause
• *However* can start a sentence (followed by comma); *but* cannot start a formal sentence
• Avoid overusing *Firstly / Secondly* — use *A primary concern… / A further issue…* for variety`,
    examples: [
      { sentence: 'Despite the initial investment, solar energy is cost-effective in the long run.', note: 'Despite + noun phrase' },
      { sentence: 'Although prices have risen, demand remains strong.', note: 'Although + full clause' },
      { sentence: 'Consequently, governments are under pressure to act.', note: 'Showing result of previous point' },
      { sentence: 'While urban areas benefit from better transport, rural communities are often overlooked.', note: 'Contrast: while = whereas' },
    ],
    quiz: [
      {
        question: '"___ the high cost, many people still prefer private healthcare."',
        options: ['Although', 'Despite', 'However', 'Even though'],
        correctIndex: 1,
        explanation: '"Despite" + noun phrase. "Although/Even though" need a full clause (subject + verb).',
      },
      {
        question: 'Which pair shows CONTRAST?',
        options: [
          'Furthermore / Moreover',
          'Therefore / Consequently',
          'Whereas / Nevertheless',
          'For instance / Namely',
        ],
        correctIndex: 2,
        explanation: '"Whereas" = direct contrast between two things. "Nevertheless" = unexpected contrast/concession.',
      },
      {
        question: 'Which is most appropriate for a formal IELTS conclusion?',
        options: [
          'So, I think governments should act.',
          'In conclusion, governments must take immediate steps to address this issue.',
          'Anyway, it\'s clear something needs to change.',
          'To end, we need to think more about this.',
        ],
        correctIndex: 1,
        explanation: '"In conclusion" + clear stance is appropriate for IELTS academic writing. Informal markers like "So" and "Anyway" must be avoided.',
      },
    ],
    aiPrompt: 'Generate 3 exercises on discourse markers for IELTS writing. Test the difference between "despite/although", "however/although", and choosing the right cause-and-effect or contrast marker. Provide context sentences, ask for the correct marker, and give explanations noting any grammatical constraints.',
  },
  {
    id: 'c1-nominalisation',
    level: 'C1',
    topic: 'Nominalisation',
    summary: 'Converting verbs and adjectives into nouns for academic style',
    explanation: `**Nominalisation** is the process of converting verbs, adjectives, or other word classes into nouns. It is a hallmark of formal, academic, and IELTS Band 8 writing.

**Why use it?**
• Creates a formal, impersonal tone
• Allows complex ideas to be expressed concisely as noun phrases
• Enables easier use of passives, discourse markers, and hedging

**Common conversions:**
| Verb/Adj | Noun Form |
|---|---|
| analyse | analysis |
| develop | development |
| significant | significance |
| reduce | reduction |
| differ | difference |
| implement | implementation |
| achieve | achievement |

**Technique:** Turn the verb or adjective into the subject or object of the sentence.

*Informal:* Because the government invested heavily, the economy grew rapidly.
*Formal:* Heavy government investment led to rapid economic growth.

*Informal:* When the temperature increases, the ice melts faster.
*Formal:* An increase in temperature results in faster ice melting.`,
    examples: [
      { sentence: 'The introduction of new technology has transformed communication.', note: 'introduce → introduction' },
      { sentence: 'The significance of early education cannot be overstated.', note: 'significant → significance' },
      { sentence: 'A reduction in carbon emissions is urgently required.', note: 'reduce → reduction' },
      { sentence: 'Government intervention led to the stabilisation of prices.', note: 'stabilise → stabilisation' },
    ],
    quiz: [
      {
        question: 'Nominalise: "Researchers discovered that the drug was effective."',
        options: [
          'The researchers\' discovery shown the drug\'s effectiveness.',
          'The discovery of the drug\'s effectiveness was made by researchers.',
          'Researchers made the effective discovery of a drug.',
          'The drug was discovered to be effective by researchers.',
        ],
        correctIndex: 1,
        explanation: '"Discovery" (from discover) + "effectiveness" (from effective) creates a formal nominalized sentence.',
      },
      {
        question: 'Which sentence uses nominalisation most effectively?',
        options: [
          'It is clear that the population is ageing and this is important.',
          'Population ageing has significant demographic and economic implications.',
          'The population is getting older and this matters a lot.',
          'Because people are ageing, we face problems.',
        ],
        correctIndex: 1,
        explanation: '"Population ageing" nominalises a clause; "implications" nominalises a verb. This creates a concise, formal noun phrase as subject.',
      },
      {
        question: 'Convert: "The government failed to implement the policy effectively."',
        options: [
          'The government\'s failure in effectively implementing the policy…',
          'The effective implementation failed by the government…',
          'Failure of effective government implementation of policy…',
          'The government failed at policy implementation effectiveness…',
        ],
        correctIndex: 0,
        explanation: '"The government\'s failure in + gerund" correctly nominalises "failed" while preserving meaning and using "implementing" as a gerund.',
      },
    ],
    aiPrompt: 'Generate 3 nominalisation exercises for IELTS Writing Band 8+. Ask students to rewrite informal/verb-heavy sentences using nominalisation (noun forms). Target academic IELTS topics (environment, education, technology). Provide the nominalized version and explain which words were converted and why.',
  },
];

/* ─────────────────────────────────────────────────────────────────
   C2 — Mastery (IELTS Band 8.5–9.0)
───────────────────────────────────────────────────────────────── */

const c2: GrammarLesson[] = [
  {
    id: 'c2-hedging',
    level: 'C2',
    topic: 'Hedging & Academic Modality',
    summary: 'Expressing caution and nuance in academic writing',
    explanation: `**Hedging** is the use of cautious, tentative language to present claims accurately — a requirement for Band 8.5–9 IELTS writing and academic English.

**Why hedge?**
Academic writing avoids overgeneralisation. Hedged language signals intellectual honesty and awareness of limitations.

**Hedging verbs (reporting)**
*appear, seem, suggest, indicate, imply, tend to*
• *The data suggest(s) a correlation between…*

**Modal hedges**
*may, might, could, would*
• *This could have significant implications for…*
• *It might be argued that…*

**Adverbial hedges**
*arguably, generally, typically, largely, to some extent, in many cases, relatively*
• *Access to education is arguably the most important factor.*

**Noun/Adjective hedges**
*a tendency, a degree of, evidence, an indication, possible, likely, apparent*
• *There is some evidence to suggest that…*

**Boosters (the opposite — use sparingly in IELTS)**
*clearly, undoubtedly, certainly, it is obvious that*
— Avoid overusing these in argument writing; they can appear dogmatic.`,
    examples: [
      { sentence: 'The findings suggest that sleep deprivation may impair cognitive function.', note: 'Double hedge: suggest + may' },
      { sentence: 'It could be argued that economic growth does not always reduce inequality.', note: 'Hedged argument opener' },
      { sentence: 'To some extent, urban migration can be attributed to lack of rural opportunities.', note: 'Adverbial hedge + modal' },
      { sentence: 'There appears to be a growing consensus that climate action is urgent.', note: '"Appear to be" = soft hedge' },
    ],
    quiz: [
      {
        question: 'Which sentence is most appropriately hedged for IELTS academic writing?',
        options: [
          'Technology is obviously the cause of declining attention spans.',
          'Technology clearly destroys concentration completely.',
          'Technology may contribute to shorter attention spans in certain contexts.',
          'Technology definitely affects attention all the time.',
        ],
        correctIndex: 2,
        explanation: '"May contribute" and "in certain contexts" hedge the claim appropriately — avoiding overgeneralisation.',
      },
      {
        question: '"___ be argued that urban sprawl exacerbates social inequality."',
        options: ['It must', 'It can', 'It could', 'It would'],
        correctIndex: 2,
        explanation: '"It could be argued" is the standard hedged academic phrase for introducing a claim or counter-claim.',
      },
      {
        question: 'Identify the most problematic sentence for academic writing:',
        options: [
          'Research indicates that diet may influence mental health.',
          'There is some evidence that exercise benefits cognitive function.',
          'It is undeniably true that everyone must exercise daily.',
          'Studies tend to support the view that stress reduces productivity.',
        ],
        correctIndex: 2,
        explanation: '"Undeniably" + absolute claim ("everyone must") is dogmatic and overgeneralised — inappropriate in academic writing.',
      },
    ],
    aiPrompt: 'Generate 3 hedging exercises for IELTS Band 8.5–9 academic writing. Ask students to rewrite overconfident/boosted claims using appropriate hedging (modal verbs, hedging verbs, adverbial hedges). Use academic topics. Provide the hedged version and identify which devices were used.',
  },
  {
    id: 'c2-concession',
    level: 'C2',
    topic: 'Concession & Counter-argument Structures',
    summary: 'Acknowledging opposing views with sophistication',
    explanation: `At Band 8–9, effective concession distinguishes strong arguments from weak ones. Writers must acknowledge the merit of opposing views before refuting or qualifying them.

**Concession structures:**
• *While it is true that X, Y nevertheless remains the case.*
• *Admittedly, [concession]. However, [refutation/qualification].*
• *One might argue that X; however, this overlooks the fact that Y.*
• *There is some merit in the view that X. That said, the evidence points to Y.*
• *Granted, X may be the case in certain circumstances, yet…*

**Refutation phrases:**
• *this overlooks / fails to account for*
• *the evidence, however, suggests otherwise*
• *upon closer examination, it becomes clear that*
• *this argument loses force when one considers*

**Concessive clauses (contrast + unexpected result):**
• *Much as I respect this view, the data do not support it.*
• *Useful as this approach may be, it has significant limitations.*
• *Try as they might, governments have struggled to contain the spread.*
(Structure: Adj/Adv/V + as + subject + verb)`,
    examples: [
      { sentence: 'While it is true that technology creates jobs, it also displaces a significant number of workers.', note: 'Balanced concession' },
      { sentence: 'Admittedly, nuclear energy produces minimal emissions. That said, waste disposal remains a serious concern.', note: '"Admittedly… That said" structure' },
      { sentence: 'Useful as renewable energy is, current infrastructure cannot yet support full dependence on it.', note: 'Fronted adjective concessive clause' },
      { sentence: 'One might argue that free trade benefits all parties; however, this fails to account for asymmetric power dynamics.', note: '"One might argue… however" — academic refutation' },
    ],
    quiz: [
      {
        question: '"___ this policy reduces short-term costs, it may create long-term dependency."',
        options: ['Despite', 'Although', 'However', 'Therefore'],
        correctIndex: 1,
        explanation: '"Although" + full clause introduces a genuine concession. "Despite" needs a noun phrase, not a clause.',
      },
      {
        question: 'Which sentence structure best demonstrates sophisticated concession?',
        options: [
          'Some people think it\'s bad, but others think it\'s good.',
          'It is bad. However, it is also good sometimes.',
          'Compelling as the argument for globalisation may be, its social costs are frequently underestimated.',
          'Globalisation is good and bad at the same time.',
        ],
        correctIndex: 2,
        explanation: 'Fronted adjectival concession ("Compelling as…") + precise vocabulary = C2/Band 8+ sophistication.',
      },
      {
        question: 'Complete: "Admittedly, urbanisation drives economic growth. ___, rural communities often bear a disproportionate burden."',
        options: ['Therefore', 'Similarly', 'That said', 'For example'],
        correctIndex: 2,
        explanation: '"That said" signals an unexpected qualification after a concession — a natural C2-level transition.',
      },
    ],
    aiPrompt: 'Generate 3 concession and counter-argument exercises for IELTS Band 8.5–9 writing. Ask students to write a concession + refutation structure, or complete a partially-written balanced argument sentence. Use topics like globalisation, technology, or education. Provide model answers using sophisticated structures like "While it is true that…", "Admittedly… That said", or "Useful as X is, Y".',
  },
  {
    id: 'c2-complex-noun-phrases',
    level: 'C2',
    topic: 'Complex Noun Phrases & Post-modification',
    summary: 'Dense, precise noun phrases for high-band academic writing',
    explanation: `Academic English at Band 8–9 is characterised by lexically dense **noun phrases** rather than long chains of clauses. Post-modifiers pack information into a noun phrase.

**Types of post-modification:**
1. **Prepositional phrase**: *the impact of globalisation on developing economies*
2. **Relative clause**: *a strategy that prioritises sustainable development*
3. **Participle clause (-ed / -ing)**: *policies designed to reduce inequality* / *data suggesting a correlation*
4. **Infinitive clause**: *the need to address structural unemployment*
5. **Appositive**: *the CEO, a proponent of radical reform, resigned yesterday*
6. **Embedded noun clause**: *evidence that climate change is accelerating*

**Pre-modification** (before the noun):
*a rapidly expanding, resource-intensive, export-led economy*
Multiple pre-modifiers are stacked: adjective → noun adjunct → noun.

**Density tip:** Replace verb-heavy structures with noun phrases:
✗ *Because the government intervened, prices became stable.*
✓ *Government intervention resulted in price stabilisation.*`,
    examples: [
      { sentence: 'The widespread adoption of renewable energy technologies in emerging markets represents a significant shift.', note: 'Pre-modified + post-modified noun phrase as subject' },
      { sentence: 'There is growing evidence that income inequality undermines social cohesion.', note: 'Pre-modifier + embedded noun clause' },
      { sentence: 'The strategies developed to mitigate urban poverty have yielded mixed results.', note: 'Post-modified by -ed clause + infinitive' },
      { sentence: 'The assumption that economic growth automatically reduces poverty has been challenged.', note: 'Embedded noun clause post-modifying "assumption"' },
    ],
    quiz: [
      {
        question: 'Which noun phrase is most complex and suitable for Band 9 writing?',
        options: [
          'The thing about the problem',
          'The problem',
          'The long-term structural challenges posed by demographic ageing in high-income economies',
          'A very big and complicated economic problem caused by people getting older',
        ],
        correctIndex: 2,
        explanation: 'Pre-modifiers (long-term, structural) + post-modification (posed by… in…) creates the lexical density expected at Band 9.',
      },
      {
        question: 'Expand: "Policies have been ineffective." → Which version shows best post-modification?',
        options: [
          'Policies, which have been implemented, have not worked very well for most people.',
          'The policies implemented to address income inequality have proven largely ineffective.',
          'Policies are not working and they are implemented but they fail.',
          'Policies that exist have been ineffective in their aims.',
        ],
        correctIndex: 1,
        explanation: '"Policies implemented to address income inequality" uses -ed clause + infinitive — precise and dense.',
      },
      {
        question: '"There is compelling ___ that early intervention ___ long-term educational outcomes."',
        options: [
          'proof / improves',
          'evidence / significantly improves',
          'fact / can improve',
          'idea / makes better',
        ],
        correctIndex: 1,
        explanation: '"Compelling evidence that + noun clause" is the standard academic structure. "Significantly improves" is precise and formal.',
      },
    ],
    aiPrompt: 'Generate 3 exercises on complex noun phrases for IELTS Band 8.5–9 writing. Ask students to expand a bare noun into a complex noun phrase using post-modifiers (relative clause, participial clause, prepositional phrase, or embedded clause), or to identify which sentence contains the more academically dense noun phrase. Use academic topics. Provide model answers.',
  },
  {
    id: 'c2-subjunctive-formal',
    level: 'C2',
    topic: 'Subjunctive & Formal Structures',
    summary: 'Mandative subjunctive, it-constructions, and formal registers',
    explanation: `The **subjunctive mood** and related formal structures are rare in everyday speech but important for Band 8–9 IELTS writing and formal academic English.

**Mandative subjunctive** — used after verbs/adjectives of recommendation, demand, suggestion, requirement:
*recommend/suggest/insist/demand/request/require + that + subject + base verb (no inflection)*
• *The committee recommended that the policy be reviewed.* (NOT: should be / is)
• *It is essential that every candidate submit their documents.* (NOT: submits)
• *We suggest that he attend the seminar.*

**Formal it-constructions:**
• *It is imperative that + subjunctive*
• *It is vital/crucial/necessary that + subjunctive*
• *It is proposed/suggested that + subjunctive*

**Were-subjunctive (formulaic):**
• *Were this to happen, the consequences would be severe.* (= If this happened)
• *Were the government to act now, significant harm could be averted.*

**Should-inversion (formal conditional):**
• *Should this situation continue, intervention will be necessary.* (= If this situation continues)
• *Should any issues arise, please contact us.* `,
    examples: [
      { sentence: 'The report recommended that the board reconsider its position.', note: 'Mandative subjunctive — "reconsider" (base form, not reconsiders)' },
      { sentence: 'It is imperative that all stakeholders be consulted.', note: 'Formal it-construction + subjunctive (be, not are)' },
      { sentence: 'Were the proposal accepted, implementation would begin immediately.', note: 'Were-subjunctive = conditional inversion' },
      { sentence: 'Should demand increase, production capacity will need to be expanded.', note: 'Should-inversion = formal conditional' },
    ],
    quiz: [
      {
        question: '"The panel insisted that the decision ___ postponed."',
        options: ['is', 'was', 'be', 'will be'],
        correctIndex: 2,
        explanation: 'Mandative subjunctive: after "insist/recommend/suggest + that", use the base form — "be" (not "is", "was", or "will be").',
      },
      {
        question: 'Rewrite formally: "If the economy weakens, companies may cut jobs."',
        options: [
          'Would the economy weaken, companies may cut jobs.',
          'Were the economy to weaken, companies might cut jobs.',
          'If the economy will weaken, companies can cut jobs.',
          'Should the economy has weakened, companies might cut jobs.',
        ],
        correctIndex: 1,
        explanation: '"Were + subject + to + infinitive" is the formal were-subjunctive conditional inversion.',
      },
      {
        question: '"It is vital that every participant ___ the terms before signing."',
        options: ['understands', 'understand', 'will understand', 'is understanding'],
        correctIndex: 1,
        explanation: 'Formal it-construction with subjunctive: "It is vital that + subject + base verb" (understand, not understands).',
      },
    ],
    aiPrompt: 'Generate 3 exercises on formal subjunctive and formal conditional structures for IELTS Band 8.5–9. Cover mandative subjunctive (recommend/insist + that + base form), formal it-constructions (it is imperative that), and were/should inversion. Provide context sentences, ask for transformation or error correction, and give detailed explanations.',
  },
  {
    id: 'c2-register-precision',
    level: 'C2',
    topic: 'Register, Precision & Lexical Sophistication',
    summary: 'Precise vocabulary, collocations, and avoiding informal language',
    explanation: `At Band 8–9, **lexical resource** is assessed on accuracy, range, and appropriacy. This lesson covers the strategies that separate Band 8 from Band 9 writing.

**Avoid informal/vague vocabulary:**
| Informal | Formal/Precise |
|---|---|
| a lot of / lots of | a significant number of / considerable |
| get | obtain, acquire, receive, gain |
| big / huge | substantial, considerable, significant |
| show | demonstrate, indicate, reveal, illustrate |
| say | argue, contend, assert, maintain, claim |
| good / bad | beneficial, advantageous / detrimental, adverse |
| think | contend, argue, hypothesise, maintain |

**Precise collocations (noun + verb):**
*concerns arise / emerge, issues persist, challenges remain, trends continue*
*evidence supports / contradicts, data suggests / indicates / reveals*
*implications are far-reaching / significant / profound*

**Avoid repetition** — paraphrase rather than repeat key words.

**Avoid empty phrases:**
✗ *In today's modern society* / *Since the dawn of time*
✗ *It is a well-known fact that*
✗ *People all over the world*
✓ Use specific, substantiated language instead.`,
    examples: [
      { sentence: 'The data reveal a marked decline in biodiversity across tropical ecosystems.', note: '"reveal" + "marked decline" — precise collocation' },
      { sentence: 'This policy has had far-reaching implications for low-income households.', note: '"far-reaching implications" — high-band collocation' },
      { sentence: 'Proponents of this view contend that market forces alone cannot address systemic inequality.', note: '"contend" replaces "think/say"; "proponents" = formal word for "supporters"' },
      { sentence: 'The adverse effects of air pollution on respiratory health are well-documented.', note: '"adverse effects" + "well-documented" — academic precision' },
    ],
    quiz: [
      {
        question: 'Choose the most precise, academic replacement for: "A lot of studies say exercise is good for you."',
        options: [
          'Many studies show exercise is good.',
          'A considerable body of research indicates that regular physical activity yields significant health benefits.',
          'Lots of scientists think exercise helps people.',
          'Research says exercise is very good for humans everywhere.',
        ],
        correctIndex: 1,
        explanation: '"Considerable body of research" + "indicates" + "yields significant health benefits" = precise collocation, formal register, specific vocabulary — Band 9.',
      },
      {
        question: 'Which phrase should be AVOIDED in IELTS Band 9 writing?',
        options: [
          'The implications of this trend are far-reaching.',
          'Evidence suggests a correlation between the two variables.',
          'In today\'s modern society, technology plays a vital role.',
          'This phenomenon has been extensively documented in the literature.',
        ],
        correctIndex: 2,
        explanation: '"In today\'s modern society" is a clichéd, vague opener. Band 9 writing avoids empty phrases and uses specific, substantiated language instead.',
      },
      {
        question: 'Replace the vague collocation: "The results ___ (showed) that the intervention was helpful."',
        options: [
          'said',
          'demonstrated',
          'told',
          'got',
        ],
        correctIndex: 1,
        explanation: '"Demonstrated" is the most precise and formal academic verb here. "Revealed" or "indicated" would also be acceptable.',
      },
    ],
    aiPrompt: 'Generate 3 exercises on register and lexical precision for IELTS Band 8.5–9. Ask students to: (1) replace informal/vague vocabulary with precise academic equivalents, (2) identify and correct clichéd or inappropriate language, and (3) improve a sentence using better collocations. Provide model answers and note the specific Band 9 features used.',
  },
];

/* ─── Export ──────────────────────────────────────────────────── */

export const ALL_LESSONS: GrammarLesson[] = [...a2, ...b1, ...b2, ...c1, ...c2];

export const LESSONS_BY_LEVEL: Record<GrammarLevel, GrammarLesson[]> = {
  A2: a2,
  B1: b1,
  B2: b2,
  C1: c1,
  C2: c2,
};

export const LEVEL_COLORS: Record<GrammarLevel, string> = {
  A2: '#3b82f6',   // blue
  B1: '#10b981',   // emerald
  B2: '#f59e0b',   // amber
  C1: '#f4511e',   // orange (app accent)
  C2: '#8b5cf6',   // violet
};

export const LEVEL_DESCRIPTIONS: Record<GrammarLevel, string> = {
  A2: 'Elementary — IELTS Band 4–5',
  B1: 'Intermediate — IELTS Band 5–6',
  B2: 'Upper Intermediate — IELTS Band 6.5–7',
  C1: 'Advanced — IELTS Band 7.5–8',
  C2: 'Mastery — IELTS Band 8.5–9',
};
