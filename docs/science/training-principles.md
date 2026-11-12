# Training principles

The rules every template and the progression engine follow. Confidence tags:
`[verified]` abstract or source confirmed in a session, `[secondary]` seen via
a summary, `[recall]` model knowledge not re-checked.

## 1. The big rocks

1. **Consistency beats optimisation.** The largest benefit comes from going
   from no resistance training to any resistance training (ACSM 2026 position
   stand, based on 137 systematic reviews) `[secondary]`. Templates must be
   realistic for the person's schedule before they are optimal.
2. **Progressive overload.** Over weeks, do slightly more: load, reps, sets,
   harder variation, longer hold, faster pace, or less rest.
3. **Specificity.** You improve at what you practise: strength is specific to
   load and movement, isometric strength to joint angle, endurance to
   intensity and duration, skills to the skill itself.
4. **Recovery.** Adaptation happens between sessions. Sleep 7-9 h is the
   commonly cited target; no recovery method compensates for poor sleep
   `[secondary]`.
5. **Individual response varies.** Start from the template, adjust from the
   log.

## 2. Baseline health targets (WHO 2020)

Adults: 150-300 min of moderate or 75-150 min of vigorous aerobic activity per
week, plus muscle-strengthening work for all major muscle groups on 2 or more
days `[recall, well established]`. Every general-fitness template meets this.

Steps: compared with 2,000 steps/day, 7,000 steps/day was associated with 47 %
lower all-cause mortality (Ding et al. 2025, Lancet Public Health, 57 studies;
observational) `[verified abstract]`. Earlier pooled data showed a plateau near
6,000-8,000 for people over 60 and 8,000-10,000 for younger adults (Paluch
2022) `[secondary]`. Use 7,000-10,000 as the default optional step goal.

## 3. Intensity language used in the app

| Term | Meaning |
|---|---|
| RIR | Reps in reserve: how many more good reps were possible. |
| RPE (lifting) | 10 − RIR, so RPE 8 = 2 reps left. |
| RPE (cardio) | 1-10 effort; 3-4 easy conversational, 6-7 comfortably hard, 9-10 all-out. |
| % 1RM | Percent of one-rep maximum; estimated from logged sets (Epley: weight × (1 + reps/30)) `[recall]`. |
| HR zones | Five zones from max HR (Tanaka 208 − 0.7 × age) or heart-rate reserve. |

Beginners are poor at judging RIR, so beginner templates use simple rules
("stop when the rep slows down or form changes") and fixed progressions.

## 4. Progression models by level

| Level | Model | Rule the engine applies |
|---|---|---|
| Beginner | Linear / single progression | Hit the top of the rep target on all sets with good form → add the smallest load step next session (upper body 1-2.5 kg, lower 2.5-5 kg). Miss the bottom of the range twice in a row → reduce 10 %. |
| Intermediate | Double progression | Work within a rep range (for example 8-12). Add reps until all sets reach the top, then add load and drop back to the bottom. |
| Advanced | Block or undulating periodisation with RIR targets | Planned weeks of accumulation, intensification, deload; load chosen from the RIR target. |
| Bodyweight / skills | Variation progression | Reach the hold or rep standard on all sets for 2 sessions → move to the next variation at the low end of the range. |
| Endurance | Volume then intensity | Add duration first; hold the hard-session count; see `running.md`. |

Linear and undulating periodisation produce similar strength gains when volume
is matched (Harries et al. 2015, 17 studies) `[verified abstract]`; choose the
model that fits the person, not a "best" one.

## 5. Session structure

1. Warm-up: 5-8 min. General movement, then ramp-up sets of the first lift.
   Long static stretches (over about 60 s per muscle) right before strength or
   power work slightly reduce performance; dynamic warm-ups do not
   `[secondary]`. Routine stretching does not reduce overall injury rates,
   though it may help muscle-tendon injuries `[secondary]`.
2. Skill or power work first (fresh), then heavy compound lifts, then
   accessories, then conditioning. Power work done tired becomes conditioning.
3. Cool-down is optional; flexibility work fits here or on separate days.

## 6. Rest between sets

Resting more than 60 s gives a small hypertrophy benefit over shorter rests;
beyond about 90 s there is no further appreciable difference (Singer et al.
2024, Bayesian meta-analysis) `[verified abstract]`. Defaults: 2-3 min for
heavy compounds and skill holds, 60-90 s for accessories, supersets of
non-competing muscles when time is short.

## 7. Deloads

Practice survey: lifters deload about every 5.6 ± 2.3 weeks for 6.4 ± 1.7
days `[secondary]`. The only controlled trial (Coleman et al. 2024) used a
full week off mid-programme: hypertrophy was unaffected, strength gains were
slightly lower `[verified abstract]`. That tested complete rest, not a
reduced-volume week.

App rule: suggest a lighter week (about half the sets, same load) every 4-8
weeks, or earlier when the log shows falling performance on two consecutive
sessions plus high effort or reported joint pain. Never force it.

## 8. Concurrent strength and endurance

Combining both does not reduce maximal strength or muscle growth overall;
explosive strength suffers when both are in the same session (Schumann et al.
2022) `[verified abstract]`. Running may blunt leg fibre growth slightly more
than cycling (Lundberg et al. 2022) `[secondary]`. When both are in one
session, lifting before endurance is better for lower-body strength (Eddens
2018) `[secondary]`.

App rule: separate hard runs and heavy leg days by a day when possible, or by
6 h; if in one session, lift first unless the endurance session is the
priority.

## 9. Readiness

HRV-guided adjustment does not beat a fixed plan on average but reduces the
number of non-responders (2021 meta-analysis cited in the legacy app)
`[secondary]`. The optional pre-session check (sleep, soreness, joint pain,
mood) removes one set per exercise or swaps to an easy session.

## 10. Minimum effective dose (for short-on-time users)

- Strength and size: roughly 4 weekly sets per muscle group already produces
  measurable growth (Pelland et al. meta-regression) `[secondary]`.
- A 2-day full-body routine with one hard set of 6-12 reps on multi-joint
  lifts is a legitimate time-efficient option `[recall: Iversen et al. 2021]`.
- Templates tagged "express" use this.

## Sources

- ACSM 2026 resistance training position stand: https://www.newswise.com/articles/acsm-unveils-landmark-2026-resistance-training-guidelines-first-update-in-17-years
- Ding 2025, steps: https://pubmed.ncbi.nlm.nih.gov/40713949/
- Harries 2015, periodisation: https://pubmed.ncbi.nlm.nih.gov/25268290/
- Singer 2024, rest intervals: https://www.frontiersin.org/articles/10.3389/fspor.2024.1429789/full
- Coleman 2024, deload: https://pubmed.ncbi.nlm.nih.gov/38274324/
- Schumann 2022, concurrent training: https://link.springer.com/article/10.1007/s40279-021-01587-7
- Lundberg 2022: https://pmc.ncbi.nlm.nih.gov/articles/PMC9474354/
- Eddens 2018, exercise order: https://nrl.northumbria.ac.uk/id/eprint/31702
- Static stretching meta-analysis 2012: https://www.anatomytrains.com/wp-content/uploads/manual/meta-analysis.pdf
- Stretching and injury (AAFP 2016): https://www.aafp.org/pubs/afp/issues/2016/1001/p547
- HRV-guided training 2021: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8507742/
- Sleep and performance: https://journal.aspetar.com/en/journals/volume-4-targeted-topic-post-exercise-recovery/sleep-and-sporting-performance
