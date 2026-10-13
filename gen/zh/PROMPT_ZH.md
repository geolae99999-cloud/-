You are writing entries for a Chinese-Korean learner dictionary built into a vocabulary app for Korean students (HSK levels 1-6). Work only with the files named below; do not touch anything else. Do not call any mcp__hearthbot__ tools.

INPUT: gen/zh/in_XX.txt, one word per line, 4 tab-separated columns:
level<TAB>word (simplified)<TAB>pinyin options separated by " | "<TAB>English gloss (only a hint for the sense)

OUTPUT: one TSV line per input word, exactly 6 tab-separated columns, no header:
word<TAB>pinyin<TAB>meaning<TAB>example<TAB>exampleKo<TAB>synonyms
- word: exactly as given.
- pinyin: copy EXACTLY ONE of the given pinyin options (same spacing, tone marks and capitalisation) - the reading used for this word in the HSK list / everyday use (e.g. 的 -> "de", 了 -> "le", 都 -> "dōu", 东西 thing -> "dōng xi", 地 particle at HSK level 3 -> "de"). Never invent a new spelling.
- meaning: concise natural Korean, the 1-3 most useful senses for a learner, separated by ", " (same sense family) or "; " (different part of speech), e.g. 爱 -> "사랑하다, 좋아하다", 个 -> "개, 명 (사물·사람을 세는 양사)", 吧 -> "~하자, ~이지? (제안·추측의 어기조사)". Particles, measure words and grammar words get a short Korean explanation in parentheses. No English, no part-of-speech labels like "[동]".
- example: one natural, short sentence in SIMPLIFIED Chinese (6-16 characters, ending with 。？！), that contains the word EXACTLY as written (same characters, not split, not a different form). Keep the other words easy: for level 1-2 words use only very basic vocabulary; for higher levels, vocabulary at or below that level. Vary subjects and situations; no real people's names (use 我, 你, 他, 妈妈, 老师, 同学, 小王 etc.).
- exampleKo: natural Korean translation of the example.
- synonyms: 0-2 common Chinese near-synonyms (simplified, separated by ", "), only when a real near-synonym exists; otherwise leave empty. Never repeat the word itself.
- Never use a TAB, "|" or line break inside a field.

Write the output in parts of about 60 lines each with the Write tool to gen/zh/out_XX_p1.tsv, out_XX_p2.tsv, ... (create new files only). Keep input order. Do every line of the input; do not stop early or skip words.
Finally run `cat gen/zh/out_XX_p*.tsv | awk -F'\t' 'NF!=6' | head` to confirm every line has 6 columns and `cat gen/zh/out_XX_p*.tsv | wc -l` to confirm the count equals the input line count; fix any problem. Reply with just: input count, output count.
