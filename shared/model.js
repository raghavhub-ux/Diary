import { z } from "zod";
export const moods = ["Great", "Good", "Okay", "Low", "Difficult day"];
export const emotions = [
  "Happy",
  "Calm",
  "Excited",
  "Grateful",
  "Confused",
  "Frustrated",
  "Lonely",
  "Stressed",
  "Motivated",
  "Tired",
];
export const categories = [
  "Academics",
  "Coding",
  "Physical activity",
  "Sleep and routine",
  "Reading",
  "Mindfulness",
  "Relationships",
  "Emotional well-being",
];
export const day = (d = new Date()) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return day(d);
}
export const questions = {
  Daily: [
    "What happened today?",
    "How did I feel today?",
    "What made me happy today?",
    "What made me stressed, anxious, or upset?",
    "What did I learn about myself?",
    "What am I grateful for?",
    "What is one thing I could improve?",
    "What is one realistic goal for tomorrow?",
  ],
  Weekly: [
    "What went well this week?",
    "What challenges did I experience?",
    "What did I learn?",
    "Which habits helped me?",
    "What would I like to do differently next week?",
  ],
  Monthly: [
    "What am I proud of?",
    "What was difficult?",
    "What patterns did I notice?",
    "What improved in my life?",
    "What do I want to focus on next month?",
  ],
};
const short = z.string().trim().max(180),
  name = short.min(1),
  date = z.string().date(),
  mood = z.enum(moods),
  feelings = z.array(z.enum(emotions)).max(10);
export const defaults = {
  theme: "Light",
  accent: "Sage",
  font: "Serif",
  size: "18",
  mode: "Free",
  week: "Monday",
  export: "JSON",
  ai: false,
  reminders: false,
  lock: false,
};
export const preferences = z.object({
  theme: z.enum(["Light", "Dark"]),
  accent: z.enum(["Sage", "Lavender", "Clay"]),
  font: z.enum(["Serif", "Sans"]),
  size: z.enum(["16", "18", "22"]),
  mode: z.enum(["Free", "Guided"]),
  week: z.enum(["Monday", "Sunday"]),
  export: z.enum(["JSON", "TXT", "PDF"]),
  ai: z.boolean(),
  reminders: z.boolean(),
  lock: z.boolean(),
});
export const schemas = {
  journals: z.object({
    title: name,
    date,
    content: z.string().max(200000),
    mood: mood.or(z.literal("")),
    emotions: feelings,
    tags: z.array(short).max(25),
    category: short,
    duration: z.number().int().nonnegative(),
    image: z
      .string()
      .max(1500000)
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
      .nullable(),
  }),
  moods: z.object({ date, mood, emotions: feelings }),
  habits: z.object({
    name,
    schedule: z.array(z.number().int().min(0).max(6)).max(7),
    reminder: z.string().regex(/^(|([01]\d|2[0-3]):[0-5]\d)$/),
  }),
  goals: z.object({
    title: name,
    category: name,
    action: short,
    notes: z.string().max(5000),
    history: z.array(z.object({ date, text: name })).max(2000),
  }),
  reviews: z.object({
    period: z.enum(["Weekly", "Monthly"]),
    date,
    answers: z.array(z.string().max(10000)).length(5),
  }),
};
export const blankEntry = (date = day()) => ({
  date,
  title: "",
  content: "",
  mood: "",
  tags: [],
  emotions: [],
  category: "",
  image: null,
  duration: 0,
});
export function sample() {
  const journals = [
    [
      "A walk after class",
      "I left my headphones in my bag today. On the walk home I noticed the little garden outside the library.",
      "Good",
    ],
    [
      "Learning to ask for help",
      "A friend helped me trace a loop. Explaining it out loud finally made it click.",
      "Great",
    ],
    [
      "Making time for a chapter",
      "Ten quiet minutes with a book felt like enough today.",
      "Okay",
    ],
  ].map(([title, content, mood], i) => ({
    ...blankEntry(daysAgo(i + 1)),
    title,
    content: "<p>" + content + "</p>",
    mood,
    tags: [["Campus", "Coding", "Reading"][i]],
    id: "entry-" + i,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  return {
    journals,
    moods: [],
    habits: ["Read a chapter", "Walk outdoors", "Study or code"].map(
      (name, i) => ({
        id: "habit-" + i,
        name,
        schedule: [0, 1, 2, 3, 4, 5, 6],
        reminder: "",
        completions: [],
      }),
    ),
    goals: [],
    reviews: [],
  };
}
