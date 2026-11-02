// The automatic checker: every star's first name, company and words go through it before they are stored.
// It runs on the server, so it cannot be skipped. Word lists catch the obvious; an AI judge for relevance
// and disguised insults can be added later as a second step (see README).

export type Field = "name" | "org" | "word";
export type Reason = "noContact" | "notKind" | "unclear" | "notName" | "notOrg" | "tooLong";
export type Entry = { name: string; org: string; word: string };

export const LIMITS: Record<Field, number> = { name: 24, org: 40, word: 32 };

// lower case, no accents, and the usual digit and symbol stand-ins turned back into letters
const fold = (w: string) =>
  w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[0134578@$€!|]/g, (c) => ({ 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "€": "e", "!": "i", "|": "i" } as Record<string, string>)[c]);

// matched inside words, so only stems that never occur in ordinary words
const STEMS = ["fuck", "shit", "cunt", "bitch", "nigg", "fagg", "whore", "slut", "hitler", "wank",
  "connard", "connass", "salope", "encul", "bougnoul", "pedophil", "pedofil"];
// matched as whole words: insults, crude or sexual words, and politics, in English and French
const WORDS = new Set(["nazi", "nazis", "porn", "porno", "retard", "retarded", "batard", "batards", "negro", "pd", "fdp",
  "ntm", "tg", "kys", "stfu", "wtf", "pute", "putain", "nique", "niquer", "dick", "cock", "rape",
  "viol", "bite", "chatte", "couille", "couilles", "merde", "cul", "con", "conne", "abruti", "abrutie", "idiot", "idiote", "stupid",
  "dumb", "loser", "ugly", "moche", "nul", "nulle", "suck", "sucks", "crap", "sex", "sexy", "xxx", "nude", "nudes", "hentai",
  "trash", "poubelle", "caca", "cringe", "boring", "worst", "pire", "naze", "bouffon", "debile",
  "trump", "macron", "melenchon", "bardella", "zemmour", "lepen", "putin", "biden", "maga", "election", "elections", "vote", "votez"]);
const FAMOUS = new Set(["elon", "musk", "trump", "macron", "obama", "biden", "putin", "zuckerberg", "bezos", "hitler", "staline",
  "stalin", "melenchon", "zemmour", "bardella", "lepen", "kardashian", "mbappe"]);
const KEYBOARD = ["qwert", "asdf", "zxcv", "azert", "qsdf", "wxcv", "hjkl", "uiop", "sdfg", "dfgh"];
const CONTACT = /https?:|www\.|\.(com|net|org|fr|io|gg|xyz|ru|me|ly|co|app|dev|tv|uk)\b|@|\+?\d[\d .-]{6,}\d|\d{5,}/i;

function unkind(v: string) {
  const f = fold(v), squashed = f.replace(/[^a-z]/g, "");
  return STEMS.some((x) => squashed.includes(x)) || f.split(/[^a-z]+/).some((x) => WORDS.has(x));
}

function gibberish(v: string) {
  const f = fold(v), letters = f.replace(/[^a-z]/g, "");
  return /(.)\1{3,}/.test(f)                                        // aaaa, !!!!
    || KEYBOARD.some((k) => letters.includes(k))                     // keyboard mashing
    || /[bcdfghjklmnpqrstvwxz]{6,}/.test(letters)                   // six consonants in a row
    || f.split(/[^a-z]+/).some((x) => x.length >= 6 && !/[aeiouy]/.test(x))
    || !/[\p{L}\p{Extended_Pictographic}]/u.test(v);                // nothing but symbols
}

// Collapse whitespace and trim each field; anything that is not a string becomes "".
export function tidy(raw: Record<string, unknown>): Entry {
  const one = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
  return { name: one(raw.name), org: one(raw.org), word: one(raw.word) };
}

// null when the entry can go in the sky, otherwise the field to fix and why
export function check(entry: Entry): [Field, Reason] | null {
  for (const field of ["name", "org", "word"] as const) {
    const v = entry[field];
    if (!v) continue;
    if ([...v].length > LIMITS[field]) return [field, "tooLong"];
    if (CONTACT.test(v)) return [field, "noContact"];
    if (unkind(v) || /[<>{}[\]\\]/.test(v)) return [field, "notKind"];
    if (gibberish(v)) return [field, "unclear"];
  }
  if (entry.name) {
    const parts = entry.name.split(/[ -]+/).filter(Boolean);
    if (!/^[\p{L}' -]+$/u.test(entry.name) || parts.length > 2 || parts.some((x) => FAMOUS.has(fold(x)))) return ["name", "notName"];
  }
  if (entry.org && (!/\p{L}.*\p{L}/u.test(entry.org) || entry.org.split(" ").length > 6)) return ["org", "notOrg"];
  return null;
}
