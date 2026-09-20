/**
 * Shared content + constants for the Primary 6 Reading Skills course.
 * Lesson text, video, quiz, assignment and worksheet live in the database;
 * the interactive reading activities for the published weeks live here.
 */

export const P6_READING_SLUG = "p6-reading";

/** 12-week syllabus — certificates unlock only when every lesson is completed. */
export const P6_READING_TOTAL_LESSONS = 12;

export const READING_INTRO =
  "Good readers do more than pronounce words. They think about what they are reading, ask questions, look for important information, make connections and check whether they understand the text.";

export interface StrategyItem {
  title: string;
  body: string;
}

export const READER_STRATEGIES: StrategyItem[] = [
  { title: "1. Think before reading", body: "Good readers look at the title and think about what the text might be about." },
  {
    title: "2. Ask questions",
    body: "Good readers ask questions such as: What is happening? Why did this happen? What might happen next?",
  },
  { title: "3. Look for important information", body: "Good readers identify the main idea and the details that support it." },
  {
    title: "4. Use clues",
    body: "When a reader finds an unfamiliar word or idea, they look at the surrounding words and sentences for clues.",
  },
  {
    title: "5. Make connections",
    body: "Good readers connect what they are reading to things they already know or have experienced.",
  },
  {
    title: "6. Check their understanding",
    body: 'Readers ask themselves: "Do I understand what I just read?" If they do not understand, they reread the section.',
  },
];

export const BEFORE_YOU_READ = {
  title: "The New School Library",
  prompts: [
    "What do I think the story will be about?",
    "Who might be involved?",
    "What might happen in a school library?",
  ],
  note: "A prediction is an educated guess based on clues.",
};

export const READING_PASSAGE = {
  title: "The New School Library",
  paragraphs: [
    "When Chinedu entered his school's new library, he was surprised by how different it looked from the old room.",
    "There were shelves filled with storybooks, science books and atlases. Near the window, there was a quiet reading area with comfortable chairs. A large noticeboard displayed recommendations from students.",
    "Chinedu picked up a book about animals in Africa. At first, he wanted to return it because some of the words were unfamiliar. Instead, he read the sentences around the difficult words and used the pictures to help him understand.",
    "After reading several pages, Chinedu discovered that the book was easier to understand than he had expected.",
    "Before leaving the library, he wrote the title of the book in his notebook so that he could continue reading it the next day.",
  ],
};

export interface ActivityQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export const COMPREHENSION_QUESTIONS: ActivityQuestion[] = [
  {
    question: "Why was Chinedu surprised when he entered the library?",
    options: [
      "The library was closed.",
      "The library looked very different from the old room.",
      "There were no books.",
      "His teacher was waiting for him.",
    ],
    correctIndex: 1,
  },
  {
    question: "What did Chinedu do when he found unfamiliar words?",
    options: [
      "He immediately stopped reading.",
      "He asked everyone to leave.",
      "He used surrounding sentences and pictures for clues.",
      "He threw the book away.",
    ],
    correctIndex: 2,
  },
  {
    question: "What is the main idea of the passage?",
    options: [
      "Chinedu dislikes libraries.",
      "Chinedu learns how to use the new library and overcome difficulty while reading.",
      "Chinedu wants to become a librarian.",
      "The school needs more chairs.",
    ],
    correctIndex: 1,
  },
];

export const VOCABULARY_QUESTIONS: ActivityQuestion[] = [
  {
    question: 'What does "unfamiliar" mean in the passage?',
    options: ["Very beautiful", "Not known or recognised", "Very easy", "Very loud"],
    correctIndex: 1,
    explanation:
      "The surrounding sentence helps us understand that Chinedu did not know some of the words.",
  },
];

export const STOP_THINK_CHECK: StrategyItem[] = [
  { title: "STOP", body: "Pause when something is difficult or important." },
  { title: "THINK", body: "Ask yourself what the text means." },
  { title: "CHECK", body: "Ask yourself whether your answer makes sense." },
];

export const REREAD_NOTE =
  "If you are confused, go back and read the sentence again. That is not failing. Good readers reread.";

/** Child-friendly meanings for the Week 1 vocabulary list stored on the lesson. */
export const READING_VOCABULARY: Record<string, string> = {
  Prediction: "An educated guess about what will happen, based on clues in the text.",
  "Main idea": "The most important point the whole passage is about.",
  Detail: "A smaller piece of information that supports the main idea.",
  "Context clue": "A nearby word, sentence or picture that helps you work out a difficult word.",
  Unfamiliar: "Not known or recognised — something you have not met before.",
  Reread: "To read a part again so that you understand it better.",
  Maintain: "To take care of something so that it stays in good condition.",
};

export const WEEK_TWO_INTRO =
  "The main idea is the most important point the writer wants the reader to understand. Supporting details are the facts, examples, descriptions or information that help explain the main idea.";

export const WEEK_TWO_PASSAGE = {
  title: "The School Garden",
  paragraphs: [
    "Behind the classrooms at Greenfield Primary School was a small garden that students helped to maintain. Every Monday afternoon, different groups of students watered the plants, removed weeds, and checked the vegetables.",
    "At first, the garden contained only a few plants. Over time, the students learned how to care for tomatoes, peppers, carrots, and leafy vegetables. Their science teacher often used the garden to teach them about plants, soil, insects, and the importance of caring for the environment.",
    "The students were proud of the garden because their work had turned an empty space into a useful learning area. They also enjoyed sharing some of the vegetables with the school kitchen.",
  ],
};

export const WEEK_TWO_COMPREHENSION: ActivityQuestion[] = [
  {
    question: "What is the passage mainly about?",
    options: ["How students prepare food", "How students care for and learn from a school garden", "Why students dislike gardening", "How teachers decorate classrooms"],
    correctIndex: 1,
  },
  {
    question: "Which detail supports the main idea?",
    options: ["Students watered plants and removed weeds.", "The classrooms were painted.", "Students played football after school.", "The school bought new desks."],
    correctIndex: 0,
  },
  {
    question: "Why did the science teacher use the garden?",
    options: ["To give students a place to play", "To teach students about plants, soil, insects, and the environment", "To store school equipment", "To prepare students for sports"],
    correctIndex: 1,
  },
  {
    question: "Which sentence best summarizes the passage?",
    options: ["Students learned to care for a garden that became a useful learning space.", "Students spent all their time outside.", "The school built a large farm.", "Teachers did all the gardening."],
    correctIndex: 0,
  },
];

export const MAIN_IDEA_CHECK = [
  "What is this passage mostly about?",
  "Which idea appears throughout the passage?",
  "Which details support that idea?",
  "Can I explain the passage in one sentence?",
];

export const MAIN_IDEA_STATEMENTS = [
  { text: "Students care for a school garden that helps them learn.", answer: "main" as const },
  { text: "Students water the plants every Monday afternoon.", answer: "detail" as const },
  { text: "The garden helps students learn about plants and the environment.", answer: "main" as const },
  { text: "The garden contains tomatoes, peppers, carrots and leafy vegetables.", answer: "detail" as const },
  { text: "Students share some vegetables with the school kitchen.", answer: "detail" as const },
];

export const WEEK_TWO_VOCABULARY: ActivityQuestion[] = [
  {
    question: 'What does "maintain" mean in the sentence, "Students helped to maintain the garden"?',
    options: ["To leave it alone", "To take care of it so it stays in good condition", "To remove everything", "To hide it from others"],
    correctIndex: 1,
    explanation: "The students watered, weeded and checked the plants. These actions helped keep the garden in good condition.",
  },
];
