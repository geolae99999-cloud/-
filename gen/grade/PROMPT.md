You are a Korean English-education expert building grade-level word lists for a vocabulary app used by Korean students. Work only with the files named here; do not read, change or delete anything else.

INPUT: /home/claude/work/gen/grade/pool.tsv — 2,705 lines of `word<TAB>Korean meaning<TAB>source list`. The source list is where the word sits today (e1..e6 = 초1..초6 recommended 100, m1..m3 = 중1..중3, h1..h3 = 고1..고3, basic/mid/high/csat = larger theme packs). Today's grade lists are not well leveled: elementary grades barely get harder, some 중3 words are 고1 level, and 고3 contains words beyond 수능 (aberration, attenuate, ephemeral).

TASK: Produce 12 lists of exactly 100 words each — e1, e2, e3, e4, e5, e6, m1, m2, m3, h1, h2, h3 — that match how hard a word is for a Korean student in that grade, following the Korean national English curriculum (초등 3–6 학년 기본 어휘, 중학교 교과서 어휘, 고등학교 교과서·모의고사 어휘, 수능 빈출 어휘). Rules:
- Difficulty must rise steadily: every word in a grade should feel harder (or later in the curriculum) than typical words of the grade before it. 초1–초2 = very first words (animals, colors, numbers 1–10, family, body, basic food and actions). 초3–4 = 3–4학년 교과서 words. 초5–6 = 5–6학년 교과서 words that bridge to middle school. 중1–중3 = middle school textbook words in order. 고1–고2 = high-school textbook and 모의고사 words. 고3 = 수능 핵심 어휘 (hard but genuinely common on 수능; never GRE-only words).
- Choose words from the pool first. If a grade lacks enough good words in the pool, you may add well-known curriculum words that are not in the pool, with a short Korean meaning.
- No word may appear in two grades. Single words only (no phrases), except very common two-word school words that already exist in the pool (e.g. "police officer").
- Keep each meaning short and natural (1–2 senses, Korean only). Reuse the pool's meaning unless it is wrong.
- Within each grade, order the 100 words from easiest to hardest.

OUTPUT: write /home/claude/work/gen/grade/out.tsv with exactly 1,200 lines `grade<TAB>word<TAB>meaning` (grade is e1..h3), grouped by grade in order e1, e2, ..., h3. Use the Write tool, splitting into out_1.tsv (e1–e6) and out_2.tsv (m1–h3) if one file is too long; that is fine. Never use a TAB, "|" or ":" inside the word or meaning.
Finally run `cat /home/claude/work/gen/grade/out*.tsv | cut -f1 | sort | uniq -c` and `cat /home/claude/work/gen/grade/out*.tsv | cut -f2 | tr A-Z a-z | sort | uniq -d` to confirm 100 per grade and no duplicates, fix any problem, and reply with one short paragraph on how you leveled the lists.
