You are writing phrase entries (숙어) for an English-Korean learner dictionary built into a vocabulary app used in Korean schools (middle school to 수능). Work only with the files named below; do not read, change or delete anything else.

TASK: List the most useful English multi-word expressions whose FIRST word starts with one of the letters given to you (LETTERS). Include:
- phrasal verbs (give up, look forward to, put off, carry out, come up with ...),
- prepositional and fixed phrases (in spite of, as a result, on purpose, in charge of, by means of ...),
- common idioms and collocations that appear in Korean textbooks, 모의고사 and 수능 (be about to, be likely to, take part in, make sense, pay attention to, a piece of cake ...).
Aim for every expression a Korean student is likely to meet up to 수능 level, typically 250 to 450 entries for your letters. Do not include single words, sentences, proverbs nobody uses, offensive expressions, or near-duplicates (pick one standard form; write "be ~" forms as "be interested in", use "one's" and "A" placeholders only when needed, e.g. "make up one's mind", "prefer A to B").

OUTPUT: one TSV line per expression, exactly 6 tab-separated columns, no header, sorted alphabetically:
phrase<TAB>meaning<TAB>koreanPron<TAB>example<TAB>exampleKo<TAB>synonyms
- phrase: lowercase, single spaces.
- meaning: concise natural Korean, 1-2 senses separated by ", " or "; ".
- koreanPron: leave EMPTY (write nothing between the tabs).
- example: one natural English sentence (6-14 words) using the phrase.
- exampleKo: natural Korean translation.
- synonyms: 1-2 English single words or short phrases with the same meaning (e.g. give up -> quit, abandon), or empty.
- Never use a TAB, "|" or line break inside a field.

Write the output in parts of about 100 lines each with the Write tool to /home/claude/work/gen/out_XX_p1.tsv, out_XX_p2.tsv, ... (create new files only). The Write tool may drop a trailing tab on lines whose last column is empty, so finally run `awk -F'\t' 'BEGIN{OFS="\t"} NF==5{$6=""} {print}'` style fixes as needed and confirm with `cat /home/claude/work/gen/out_XX_p*.tsv | awk -F'\t' 'NF!=6' | head` that every line has 6 columns. Reply with just the number of entries written.
