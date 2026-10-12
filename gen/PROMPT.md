You are writing entries for an English-Korean learner dictionary built into a vocabulary app for Korean students (elementary to 수능). Work only with the files named below; do not touch anything else.

INPUT: /home/claude/work/gen/in_XX.txt
- If a line is "word<TAB>meaning", the Korean meaning is fixed: copy it exactly as the meaning column, and write the example to match that sense.
- If a line is just "word", first decide whether to KEEP it. SKIP (write nothing for it) if it is: a proper noun or name (people, places, brands, nationalities are OK only if commonly taught, e.g. "Korean", "American" may be kept), profanity/slang/vulgar, an abbreviation, a non-English word, an irregular inflected form of another word (was, were, said, went, took, men, women, children, better, best...), or useless for learners. Otherwise write a meaning yourself.

OUTPUT: one TSV line per kept word, exactly 6 tab-separated columns, no header:
word<TAB>meaning<TAB>koreanPron<TAB>example<TAB>exampleKo<TAB>synonyms
- word: as given (keep case).
- meaning: concise Korean, the 1-3 most useful senses, separated by ", " (same sense family) or "; " (different part of speech), e.g. "받아들이다, 수락하다" or "기록; 기록하다". No part-of-speech labels, no English.
- koreanPron: Korean hangul approximation of American pronunciation as in Korean vocab books, stressed syllable not marked, e.g. accept -> 억셉트, water -> 워터, vegetable -> 베지터블.
- example: one natural, short English sentence (6-12 words) a Korean student would understand, using the word in the given sense. Vary subjects and contexts; no names of real people.
- exampleKo: natural Korean translation of that sentence.
- synonyms: 1-3 English synonyms separated by ", "; leave empty if none fits (function words, numbers, colors, days).
- Never use a TAB, "|" or line break inside a field.

Write the output in parts of about 100 lines each with the Write tool to /home/claude/work/gen/out_XX_p1.tsv, out_XX_p2.tsv, ... (create new files only). Keep input order. Do every line of the input; do not stop early. Finally run `cat /home/claude/work/gen/out_XX_p*.tsv | awk -F'\t' 'NF!=6' | head` to confirm every line has 6 columns, fix any bad lines, and reply with just: kept count, skipped count.
