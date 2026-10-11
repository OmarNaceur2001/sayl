// Modern Standard Arabic cues. Greetings and thanks (مرحبا، أهلا، السلام عليكم،
// شكرا) are shared with Darija and deliberately NOT counted here.
export const MSA_ARABIC_STRONG = [
  "ماذا", "لماذا", "يرجى", "الرجاء", "لدي", "لديكم", "أريد", "نريد", "أستطيع",
  "أحتاج", "من فضلك", "فضلا", "الذي", "التي", "الذين", "ما هو", "ما هي", "يمكنني",
  "يمكنكم", "هل", "لأن", "ولكن", "أيضا", "ذلك", "تلك", "أرجو", "أخبرني",
] as const;

export const MSA_ARABIC_WEAK = [
  "كيف", "هذا", "هذه", "يمكن", "ممكن", "معلومات", "مساعدة", "السعر", "الأسعار",
] as const;

export const MSA_ARABIC_MARKERS = [...MSA_ARABIC_STRONG, ...MSA_ARABIC_WEAK] as const;
