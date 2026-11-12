# Nutrition, fat loss and weight gain

Confidence tags as in `training-principles.md`. The nutrition module is
optional; these rules drive its targets and the coach's advice.

## Energy

1. Estimate resting metabolic rate with Mifflin-St Jeor. It is the most
   reliable general equation and lands within 10 % of measured values for most
   people, but individual error can be large and accuracy drops with obesity
   `[verified abstract]`.
   - Men: 10 × kg + 6.25 × cm − 5 × age + 5
   - Women: 10 × kg + 6.25 × cm − 5 × age − 161 `[recall]`
2. Multiply by a physical activity level (PAL = total energy / basal energy).
   FAO/WHO/UNU 2001 ranges: sedentary or light 1.40-1.69, active or moderately
   active 1.70-1.99, vigorous 2.00-2.39 `[secondary: FAO report via search]`.
   The common 1.2 / 1.375 / 1.55 / 1.725 multipliers have no traceable source,
   so the app uses 1.45, 1.6, 1.75, 1.95 and 2.2 with plain descriptions of
   the whole day (training included).
3. **Correct from reality.** Compare the 7-day average body weight with the
   previous 7 days; if the trend is off target, move calories by about 150
   kcal, at most every two weeks (the legacy app's rule).

Why the correction matters: the "7,700 kcal per kg" rule (3,500 kcal per
pound) comes from 1930s data and overestimates weight loss. Early loss is
largely glycogen, protein and water; the measured energy content of weight
change was about 4,860 kcal/kg at week 4 and 6,570 kcal/kg at week 24 in the
CALERIE study, and energy expenditure adapts as weight changes (Hall and
colleagues) `[verified abstracts]`. The app uses 7,700 kcal/kg only to turn a
target pace into a starting deficit, then lets the weight trend decide.

Weighing: adding self-weighing to a weight-loss programme may help; daily
and weekly weighing did not differ in trials (Madigan et al. 2015,
meta-analysis) `[verified abstract]`. The app suggests weighing a few
mornings a week and trusts only 7-day averages (at least 3 weigh-ins).

Food logging: more frequent logging goes with more weight loss in cohorts and
reviews, but perfect logging is not required; logging at least two eating
occasions a day was the best marker of adherence in one study; engagement
falls over weeks `[secondary: reviews and cohorts, observational]`. The app
keeps logging fast (recents, favourites, search) and never scolds.

## Goals

| Goal | Energy target | Rate target |
|---|---|---|
| Fat loss | About 15-25 % below maintenance | 0.5-1 % of body weight per week to maximise muscle retention (Helms, Aragon, Fitschen 2014, written for lean bodybuilders) `[verified abstract]`; slower when already lean |
| Recomposition | Maintenance | Stable weight, improving performance; realistic for beginners, returners and people with more body fat |
| Lean gain | About 5-10 % above maintenance | Roughly 0.25-0.5 % of body weight per week for novices, slower for advanced `[recall: Slater 2019, not verified]` |

Evidence notes
- Larger surpluses mainly add fat: in trained lifters, a 15 % surplus did not
  build more muscle than 5 % over 8 weeks and faster weight gain mostly
  increased fat (Helms et al. 2023; small sample) `[verified abstract]`.
- Lifting during a deficit is the main protector of lean mass, together with
  protein `[secondary]`.
- Diet breaks: a trial in resistance-trained women found no body-composition
  or metabolic advantage over continuous dieting; the benefit is mainly
  psychological `[verified: PMC10170537]`. Offer them as an adherence tool.
- Intervals and steady cardio give the same fat loss: no difference for any
  body-fat outcome across 31 studies (Keating et al. 2017), and a trivial
  difference with high certainty in a 2021 meta-analysis (Steele et al.)
  `[verified abstracts]`. One 2019 analysis claiming an interval advantage is
  disputed. Short-term cardio alone produces little fat loss either way, so
  pick what the person will keep doing and manage food intake.
- Daily movement matters: non-exercise activity differs hugely between people
  `[secondary]`; a step goal is the simplest lever.

Safety floor: the app never suggests targets below about 1,200 kcal/day for
women or 1,500 for men, nor losses faster than 1 % per week, and shows a
"talk to a professional" note for BMI under 18.5, for minors, and during
pregnancy `[app policy, conservative]`.

## Protein

- Gains in fat-free mass with resistance training plateau at about 1.6 g/kg/day
  on average; the upper confidence bound is about 2.2 (Morton et al. 2018, 49
  studies, 1,863 participants) `[verified abstract; 2.2 bound recall]`.
- ISSN range for active people: 1.4-2.0 g/kg/day; for women athletes 1.4-2.2
  `[secondary]`.
- In a deficit, lean trained people may need more: 2.3-3.1 g per kg of lean
  body mass (not total weight), with fat at 15-30 % of calories and
  carbohydrate as the remainder (Helms et al. 2014) `[verified abstract]`.
- Per meal: about 0.4-0.55 g/kg across 3-4 meals (Schoenfeld & Aragon 2018)
  `[secondary]`. Timing around training matters little.

App default: 1.6 g/kg (maintenance/gain), 2.0 g/kg (fat loss), user-adjustable
up to 2.4. For people with obesity, base it on a reference weight (height in cm
− 100) to avoid inflated targets `[app heuristic]`.

## Fat and carbohydrate

- Fat: at least about 0.6-1.0 g/kg/day `[recall]`.
- Carbohydrate fills the rest. Guideline bands by training load: 3-5 g/kg
  light, 5-7 g/kg moderate (about 1 h/day), 6-10 g/kg high, 8-12 g/kg very
  high (Burke, Hawley, Wong, Jeukendrup 2011, as reproduced in later tables)
  `[secondary]`. Sources adapt the bands slightly differently.
- During long exercise: 30-60 g/h in a 6-8 % solution `[secondary: ISSN]`.

## Hydration

About 30-40 ml/kg/day as a starting point plus sweat losses; pale-yellow urine
as the practical check `[recall]`.

## Supplements (evidence tiers)

| Supplement | Dose | Evidence |
|---|---|---|
| Creatine monohydrate | 3-5 g/day, every day; an optional loading phase of about 20 g/day (0.3 g/kg) for 5-7 days only fills stores faster | Strong (ISSN 2017) `[secondary]` |
| Caffeine | 3-6 mg/kg (dose `[recall]`), most often taken 60 min before (`[secondary]`); avoid late in the day | Strong (ISSN 2021) |
| Protein powder | To reach the protein target | Convenience |
| Vitamin D | Only if deficient / low sun; ideally after a blood test | Conditional |
| Omega-3 | 1-2 g EPA+DHA or oily fish twice a week | Moderate |
| Not worth it | BCAAs, glutamine, fat burners, test boosters | — |

The app lists these as information, never as a prescription.

## Low energy availability (REDs)

The IOC 2023 consensus describes Relative Energy Deficiency in Sport in both
women and men: prolonged or severe low energy availability leads to hormonal
and menstrual disturbance, poor bone health and stress fractures, gut
symptoms, impaired metabolism, more illness and worse performance; risk rises
with very high training volumes, pressure for leanness, and weight-category
sports `[verified abstract]`.

Coach and app warning signs to react to: missed periods, repeated stress
injuries, persistent fatigue, falling performance despite training, constant
cold, very fast weight loss, obsessive food restriction. Response: stop
recommending deficits, suggest eating more and seeing a professional.

## Intermittent fasting (optional module)

Time-restricted eating with resistance training preserves muscle but gives no
extra benefit over the same intake eaten normally `[secondary, cited in legacy
app]`. Very short eating windows make protein targets harder. Offer it as a
preference tool, default window 10-12 h.

Evidence added 2026-11-12
- Liu et al. 2022 (NEJM), 139 adults with obesity, all on the same calorie
  restriction for 12 months, with or without an 8:00-16:00 eating window:
  -8.0 vs -6.3 kg, difference -1.8 kg (95 % CI -4.0 to 0.4, not significant);
  body fat, lean mass and risk factors followed the same pattern. Calorie
  restriction explained most of the effect `[secondary: summaries of the
  trial]`.
- Lowe et al. 2020 (TREAT, JAMA Internal Medicine), 16:8 for 12 weeks without
  other advice: no more weight loss than three regular meals; a small extra
  loss of appendicular lean mass in the subgroup measured, possibly from
  lower protein intake; critics note the difference was within measurement
  error `[secondary]`.
- Meta-analysis in women with overweight (13 trials, 612 people, searched to
  August 2024): more weight loss than an unchanged diet, but not more than
  calorie restriction; adherence and safety were good `[secondary: abstract
  via search]`.
- A 2024 conference abstract (NHANES, 20,078 adults) linked an eating window
  under 8 hours with higher cardiovascular death (HR 1.91). It is
  observational, from two 24-hour recalls, not peer reviewed, and open to
  reverse causation; the authors said it shows no cause `[secondary]`. The app
  does not cite it as a risk, but it is one more reason not to push very
  short windows.

App rules
- Fasting is opt-in, never preselected, and never suggested by the coach as
  a fat-loss method on its own.
- Default 12:12 (08:00-20:00) overnight fast; presets 12:12, 14:10 and 16:8;
  a note when any window is under 8 hours (protein meals, no extra benefit).
- Not offered under 18, during pregnancy or after birth, or with BMI under
  18.5; a standing caution for eating-disorder history and for insulin or
  other glucose-lowering medicines (see `populations-safety.md`).
- The log rejects fasts over 72 hours as almost certainly a typing mistake.

## Women

Protein and carbohydrate needs apply across the cycle (ISSN 2023)
`[secondary]`. Cycle phase has at most a trivial effect on strength
performance and the evidence quality is low (McNulty et al. 2020; Colenso-
Semple et al. 2023) `[verified abstract]`. The app does not phase-program by
default; it lets users log symptoms and adjust by feel.

## Sources

- Energy content of weight change (Hall et al.): https://pmc.ncbi.nlm.nih.gov/articles/PMC4035446 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC3859816
- FAO/WHO/UNU human energy requirements (PAL): https://www.fao.org/4/y5686e/y5686e08.htm
- Self-weighing meta-analysis (Madigan 2015): https://pubmed.ncbi.nlm.nih.gov/26293454/
- Dietary self-monitoring adherence: https://pubmed.ncbi.nlm.nih.gov/30115555/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC6856872
- Mifflin-St Jeor accuracy: https://www.andeal.org/topic.cfm?cat=1291 ; https://link.springer.com/article/10.1186/s13690-025-01727-9
- Morton et al. 2018: https://pubmed.ncbi.nlm.nih.gov/28698222/
- Helms et al. 2023, surplus size: https://openrepository.aut.ac.nz/items/de93156f-23a9-492a-8a85-438233a7e6bf
- Helms, Aragon, Fitschen 2014: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4033492/
- Keating et al. 2017, intervals vs continuous: https://read.qxmd.com/read/28513103
- Steele et al. 2021, intervals vs continuous: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8619923/
- Burke et al. 2011 carbohydrate targets (table reproduced): https://pmc.ncbi.nlm.nih.gov/articles/PMC6950062/table/nutrients-11-03017-t002
- Slater et al. 2019: https://www.frontiersin.org/articles/10.3389/fnut.2019.00131/text
- Diet breaks trial: https://pmc.ncbi.nlm.nih.gov/articles/PMC10170537
- Protein per meal: https://pmc.ncbi.nlm.nih.gov/articles/PMC5828430/
- ISSN female athlete position stand 2023: https://pubmed.ncbi.nlm.nih.gov/37221858/
- ISSN caffeine 2021: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7777221/
- ISSN creatine 2017: https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0173-z
- IOC REDs consensus 2023: https://pubmed.ncbi.nlm.nih.gov/37752011/
- Liu et al. 2022, TRE with calorie restriction (summary): https://medicaldialogues.in/diet-nutrition/news/calorie-restricted-diet-added-to-time-restriction-fails-to-boost-weight-loss-nejm-91790
- Lowe et al. 2020, TREAT: https://pubmed.ncbi.nlm.nih.gov/32986097/
- TRE in women, meta-analysis 2025: https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1664412/full
- 2024 AHA abstract and expert response: https://cms.ahs.uic.edu/inside-ahs/wp-content/uploads/sites/12/2024/04/Collective-Reponse-to-AHA-press-release-on-TRE.pdf
- Intermittent fasting + resistance training meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC11434652/
- McNulty et al. 2020 (menstrual cycle): https://springerlink.bibliotecabuap.elogim.com/content/pdf/10.1007/s40279-020-01319-3.pdf
- Colenso-Semple et al. 2023: https://frontiersin.org/articles/10.3389/fspor.2023.1054542/full
