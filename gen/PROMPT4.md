You are writing entries for an English-Korean learner dictionary built into a vocabulary app for Korean students (elementary school to 수능 and TOEIC). Work only with the files named below; do not read, change or delete anything else. Do not call any mcp__hearthbot tools.

INPUT: /home/claude/work/gen2/in_XX.txt — one lowercase English word per line. Every word looks like an inflected form (-ing, -ed, -en, -s, -er, -est, -ly). The dictionary already has the base words, and the app already maps plain inflections to their base word. Your job is to find the forms that deserve their OWN entry because learners meet them with their own meaning.

KEEP a word (write a line) only if it has an established meaning of its own that a learner would look up, such as:
- participial adjectives: interesting, interested, boring, confused, disappointed, retired, advanced, experienced, qualified, limited, skilled, detailed, dedicated, determined, organized, educated, balanced, written (written test), spoken, missing, leading, outstanding, promising, existing;
- -ing nouns: building, meeting, feeling, painting, beginning, setting, belongings, surroundings, savings, earnings, findings;
- plural nouns with their own sense: glasses (안경), goods, manners, arms (무기), customs (세관), means, savings, clothes, contents, headquarters, belongings;
- prepositions, conjunctions or adverbs from verb forms: according (according to), including, regarding, concerning, considering, provided, given;
- -ly adverbs or other real words that are not names: unsurprisingly, proactively, optimally.
SKIP (write nothing) if it is:
- only an ordinary inflection of another word with no separate learner meaning (going, things, wanted, called, asked, years, bigger, fastest, women, seen);
- a proper noun or name (people, places, teams, brands: stephen, sweden, manchester, kelly, italy), profanity or vulgar slang, a misspelling (definately, realy), or internet slang (prolly).
When in doubt about a participial adjective that a student would see in textbooks or 수능 passages, KEEP it.

OUTPUT: one TSV line per kept word, exactly 6 tab-separated columns, no header:
word<TAB>meaning<TAB>koreanPron<TAB>example<TAB>exampleKo<TAB>synonyms
- word: as given.
- meaning: concise natural Korean, the 1-3 most useful senses of the word itself, separated by ", " (same sense family) or "; " (different part of speech). Put the adjective or noun meaning first, then the inflection note last, e.g. interested -> "관심 있는, 흥미를 느끼는; interest의 과거·과거분사", building -> "건물; build의 -ing형", glasses -> "안경; glass의 복수형". No part-of-speech labels, no English, no parentheses unless needed to disambiguate.
- koreanPron: Korean hangul approximation of American pronunciation as written in Korean vocab books, e.g. interesting -> 인터레스팅, retired -> 리타이어드.
- example: one natural, short English sentence (6-12 words) that a Korean student would understand and that uses the word in its FIRST (own) sense, with the word appearing exactly in the given form. Vary subjects and contexts; no names of real people.
- exampleKo: natural, accurate Korean translation of that sentence.
- synonyms: 1-3 common English single-word synonyms for the first sense, separated by ", ", most useful first. Leave empty only when nothing fits.
- Never use a TAB, "|" or line break inside a field.

Accuracy matters more than volume: the meanings and translations will be shown to students as-is. Double-check each meaning matches the example.

Write the output in parts of about 100 lines each with the Write tool to /home/claude/work/gen2/out_XX_p1.tsv, out_XX_p2.tsv, ... (create new files only). Keep input order. Handle every line of the input; do not stop early or summarize. Finally run `cat /home/claude/work/gen2/out_XX_p*.tsv | awk -F'\t' 'NF!=6' | head` to confirm every line has 6 columns (the Write tool may drop a trailing empty column; fix with awk so NF is 6), fix any bad lines, and reply with just: kept count, skipped count.
