You are adding MORE phrase entries (숙어) to an English-Korean learner dictionary built into a vocabulary app used in Korean schools (middle school to 수능 and TOEIC). Work only with the files named below; do not read, change or delete anything else. Do not call any mcp__hearthbot tools.

The dictionary already has the phrases listed in /home/claude/work/gen3/have_XX.txt (one per line). Read that file first.

TASK: List useful English multi-word expressions whose FIRST word starts with one of the letters LETTERS and that are NOT already in have_XX.txt (also not a trivial variant of one that is, e.g. "be interested in" vs "interested in"). Include:
- phrasal verbs (give up, look forward to, put off, carry out, come up with, ...), including their common less-obvious senses as separate standard forms only if the phrase itself differs;
- prepositional and fixed phrases (in spite of, as a result, on purpose, in charge of, by means of, ...);
- idioms, collocations and connectors that appear in Korean textbooks, 모의고사, 수능 and TOEIC (be about to, take part in, make sense, pay attention to, on behalf of, in terms of, a piece of cake, ...);
- TOEIC business expressions (be eligible for, in advance, out of stock, sign up for, ...).
Aim for every such expression a student is likely to meet that is still missing, typically 100 to 300 entries for your letters (fewer if the existing list is already thorough; never pad with rare or invented expressions). Do not include single words, full sentences, rare proverbs, offensive expressions, or near-duplicates (pick one standard form; write "be ~" forms as "be interested in"; use "one's", "A" and "B" placeholders only when needed, e.g. "make up one's mind", "prefer A to B").

OUTPUT: one TSV line per expression, exactly 6 tab-separated columns, no header, sorted alphabetically:
phrase<TAB>meaning<TAB>koreanPron<TAB>example<TAB>exampleKo<TAB>synonyms
- phrase: lowercase, single spaces, letters/apostrophes/hyphens only.
- meaning: concise natural Korean, 1-2 senses separated by ", " or "; ".
- koreanPron: leave EMPTY.
- example: one natural English sentence (6-14 words) using the phrase.
- exampleKo: natural, accurate Korean translation.
- synonyms: 1-2 English single words or short phrases with the same meaning, or empty.
- Never use a TAB, "|" or line break inside a field.

Accuracy matters more than volume: meanings and translations are shown to students as-is.

Write the output in parts of about 100 lines each with the Write tool to /home/claude/work/gen3/out_XX_p1.tsv, out_XX_p2.tsv, ... (create new files only). The Write tool may drop a trailing tab on lines whose last column is empty, so finally fix with awk so every line has 6 columns, and confirm with `cat /home/claude/work/gen3/out_XX_p*.tsv | awk -F'\t' 'NF!=6' | head`. Also confirm none of your phrases appear in have_XX.txt (e.g. with `cut -f1 ... | grep -Fxf have_XX.txt`) and delete any that do. Reply with just the number of entries written.
