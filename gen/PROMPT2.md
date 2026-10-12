You are writing entries for an English-Korean learner dictionary built into a vocabulary app for Korean students (elementary school to 수능 and beyond). Work only with the files named below; do not read, change or delete anything else.

INPUT: /home/claude/work/gen/in_XX.txt — one lowercase English word per line, ordered by how common the word is.

For each word, first decide whether to KEEP it. SKIP it (write nothing) if it is:
- a proper noun or name: people, first names, surnames, places, companies, brands, teams, products (keep ordinary words that are also used as names, such as bill, rose, mark, will; skip country, city and people names);
- profanity, sexual slang or vulgar words;
- an abbreviation, a fragment or a non-English word (mr, st, de, al, re, non, ok, etc.);
- an inflected form whose only use is as a form of another word (things, going, wanted, tried, better as good's comparative). If the word ALSO has its own meaning (found = 설립하다, saw = 톱, felt = 펠트, being = 존재), KEEP it and add the inflection as the last sense, e.g. "설립하다; find의 과거형".
Otherwise KEEP it, even if it is advanced or technical: learners may look it up.

OUTPUT: one TSV line per kept word, exactly 6 tab-separated columns, no header:
word<TAB>meaning<TAB>koreanPron<TAB>example<TAB>exampleKo<TAB>synonyms
- word: as given.
- meaning: concise Korean, the 1-3 most useful senses, separated by ", " (same sense family) or "; " (different part of speech), e.g. "받아들이다, 수락하다" or "기록; 기록하다". No part-of-speech labels, no English, no parentheses unless needed to disambiguate.
- koreanPron: Korean hangul approximation of American pronunciation as written in Korean vocab books, e.g. accept -> 억셉트, water -> 워터, vegetable -> 베지터블.
- example: one natural, short English sentence (6-12 words) a Korean student would understand, using the word in its first sense. Vary subjects and contexts; no names of real people.
- exampleKo: natural Korean translation of that sentence.
- synonyms: 1-3 common English single-word synonyms (or near-synonyms) separated by ", ", most useful first. Prefer everyday words a student is likely to know or want to learn. Leave empty only when nothing fits (function words, numbers, very specific technical terms).
- Never use a TAB, "|" or line break inside a field.

Write the output in parts of about 100 lines each with the Write tool to /home/claude/work/gen/out_XX_p1.tsv, out_XX_p2.tsv, ... (create new files only). Keep input order. Handle every line of the input; do not stop early or summarize. Finally run `cat /home/claude/work/gen/out_XX_p*.tsv | awk -F'\t' 'NF!=6' | head` to confirm every line has 6 columns, fix any bad lines, and reply with just: kept count, skipped count.
