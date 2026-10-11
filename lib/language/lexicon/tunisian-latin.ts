// Tunisian Latin/Arabizi lexicon.
// STRONG = not a French/English word and specific to Maghrebi/Tunisian usage.
// WEAK   = shared with other dialects/pan-Arabic expressions; needs 2+ hits.
// Words that are also plain English/French (win, bara, taw, mela, haw, ani...)
// were removed: they flagged "I want to win" as Darija.
// Digit-based Arabizi tokens (3andkom, 7ajti, n7eb, 9adech) are handled
// generically in detect.ts, so they do not need to be listed here.
export const TUNISIAN_LATIN_STRONG = [
  "chnowa", "chnoua", "chneya", "chniya", "chnia", "chnahwelek", "chnawlek",
  "kifech", "kifach", "barcha", "barsha", "tawa", "tawwa", "famma", "fama",
  "fammach", "mafamach", "ma famech", "behi", "behya", "yezzi", "yizzi", "mouch",
  "mouchi", "manich", "chkoun", "chkon", "aslema", "labes", "labess", "mrigel",
  "mriguel", "mrigla", "ghodwa", "ghadwa", "sbeh", "mta3", "mte3", "mta3i",
  "mte3i", "mta3ek", "mte3ek", "mta3na", "mte3na", "mta3kom", "mte3kom",
  "hedha", "hedhi", "hedhouma", "soum", "chhal", "ya3tik essa7a", "yaatik essa7a",
  "wallahi", "elli", "ma najemch", "ma najjemch",
] as const;

export const TUNISIAN_LATIN_WEAK = [
  "yalla", "wallah", "walah", "inchallah", "inshallah", "inchalah", "saha",
  "mela", "yaser", "yasser", "bech", "bch", "hakka", "rani", "rahou", "rahi",
  "rahia", "chouf", "choufli", "labes 3lik",
] as const;

export const TUNISIAN_LATIN_MARKERS = [
  ...TUNISIAN_LATIN_STRONG,
  ...TUNISIAN_LATIN_WEAK,
] as const;
