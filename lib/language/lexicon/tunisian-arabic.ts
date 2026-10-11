// Tunisian Darija lexicon (Arabic script).
// STRONG = effectively unique to Maghrebi/Tunisian usage, enough on its own.
// WEAK   = also common in MSA or other dialects, supporting evidence only.
// Entries are normalized at load time by detect.ts (hamza, ة, ڨ, diacritics...).
export const TUNISIAN_ARABIC_STRONG = [
  "بقداش", "قداش", "قداشلي", "شنية", "شنوة", "علاش", "برشا", "برشة", "كيفاش",
  "كيفاه", "توا", "تواكة", "هكا", "هكاكة", "مازال", "مزال", "فما", "فمة", "فماش",
  "مافماش", "وقتاش", "شكون", "عسلامة", "يعطيك الصحة", "يعيشك", "عيشك", "لاباس",
  "باهي", "مريقل", "موش", "مانيش", "ماهوش", "ماهيش", "هاذي", "هاذا", "هاذم",
  "غدوة", "البارح", "العشية", "متاع", "كارطة", "يزي", "نحوس", "نخدم", "نلقى",
  "نلقا", "نستنى", "نتسنى", "نحب نعرف", "شبيك", "شنحوالك", "زادة", "هاو", "هاني",
  "راني", "راهو", "راهي", "ديما", "اللي", "نجمش", "ننجمش", "ماتحبش", "مانحبش",
  "لتوا",
] as const;

export const TUNISIAN_ARABIC_WEAK = [
  "نحب", "نجم", "شنو", "ياسر", "باش", "بش", "تحب", "تحبوا", "تحبو", "مش", "ربي",
  "لازم", "كاش", "حرفاء", "سوم", "السوم", "ملا", "ياخي", "تاع", "كي", "وين",
  "بالله", "نحكي", "شوية", "هاك", "نهار", "بالصحة", "صحة", "بالشفا",
] as const;

export const TUNISIAN_ARABIC_MARKERS = [
  ...TUNISIAN_ARABIC_STRONG,
  ...TUNISIAN_ARABIC_WEAK,
] as const;
