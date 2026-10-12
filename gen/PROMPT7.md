You are checking pronunciations for an English-Korean learner dictionary. Work only with the files named below; do not read, change or delete anything else. Do not call any mcp__hearthbot tools.

INPUT: /home/claude/work/ipa/rv_N.txt — lines of: word<TAB>A<TAB>B
A and B are two candidate ARPAbet pronunciations (CMU Pronouncing Dictionary style) for the standard AMERICAN pronunciation of the word. A was written by a careful annotator; B came from an automatic guesser and is often wrong. British spellings take the American pronunciation of the same word.

For each line decide the correct pronunciation:
- If A is correct (allow normal CMU-style variation in unstressed vowels AH0/IH0), output A unchanged.
- If A has a real error (wrong vowel or consonant, wrong primary stress, missing or extra sound) output the corrected pronunciation. B may help, but do not copy B's mistakes. Example: remix (the common noun) -> R IY1 M IH0 K S.
- Each word must have exactly one primary stress (1), except a few interjections; every vowel has a stress digit. Allowed symbols only: AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW (+0/1/2) and B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH.

OUTPUT: /home/claude/work/ipa/rv_N.out.tsv — one line per input line, same order: word<TAB>final ARPAbet<TAB>flag, where flag is "=" if you kept A or "fix" if you changed it. Write with the Write tool in parts (rv_N.out_p1.tsv, rv_N.out_p2.tsv, ... about 250 lines each) and then concatenate them into rv_N.out.tsv with cat. Use only file names that include N for any helper scripts (other workers share the scratch folder). Verify with awk that the line count equals the input and every line has 3 columns. Reply with: lines, number of fixes.
