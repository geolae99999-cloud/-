You are writing pronunciations for an English-Korean learner dictionary. Work only with the files named below; do not read, change or delete anything else. Do not call any mcp__hearthbot tools.

INPUT: /home/claude/work/ipa/in_XX.txt — one English word per line (some are British spellings, compounds, technical or newer words).

OUTPUT: for EVERY input word, one line: word<TAB>ARPAbet
- ARPAbet exactly in CMU Pronouncing Dictionary style for the standard AMERICAN pronunciation: phonemes separated by single spaces, every vowel with a stress digit (1 primary, 2 secondary, 0 unstressed). Use only these symbols: AA AE AH AO AW AY EH ER EY IH IY OW OY UH UW (vowels, each + 0/1/2) and B CH D DH F G HH JH K L M N NG P R S SH T TH V W Y Z ZH.
- Examples: colour -> K AH1 L ER0; organise -> AO1 R G AH0 N AY2 Z; motorway -> M OW1 T ER0 W EY2; relatable -> R IH0 L EY1 T AH0 B AH0 L; stasis -> S T EY1 S IH0 S; chorea -> K AO0 R IY1 AH0; theatre -> TH IY1 AH0 T ER0.
- British spellings get the American pronunciation of the same word (aluminium is the exception: give its own pronunciation AE2 L Y UW0 M IH1 N IY0 AH0 M).
- If a word has several pronunciations, give the most common American one only.
- Keep input order; one output line per input line; never skip.

Write the output with the Write tool to /home/claude/work/ipa/out_XX.tsv (in parts out_XX_p1.tsv, out_XX_p2.tsv, ... of about 250 lines if needed). Finally verify with awk that the number of output lines equals the number of input lines and every line has 2 tab-separated columns, fix problems, and reply with just the line count.
