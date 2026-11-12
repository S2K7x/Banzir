# Onboarding

## What the research says

- Fitness apps with a personalisation quiz use a median of about 5 question
  screens (average 6.2, n = 24 apps) `[secondary: Lazyweb 2026]`.
- The apps that retain best give the fastest route to a first completed
  workout; a vendor benchmark puts good first-workout completion at 40 %+ and
  best-in-class above 50 % `[secondary, vendor figure]`.
- Never require an account before showing value. Ask only questions whose
  answers change what the app does. Answers become variables the rest of the
  app reads.

These are vendor and blog sources; treat the numbers as directional.

## Flow

Every screen has "Skip" and a back arrow. A progress bar shows position.

| # | Screen | Input | Used for |
|---|---|---|---|
| 0 | Welcome | Name (optional), units | Greeting, kg/lb, km/mi |
| 1 | Goal | One primary goal, optional secondary | Template family |
| 2 | Experience | Beginner / intermediate / advanced, with plain descriptions | Template level, progression model |
| 3 | Where and with what | Gym, home with weights, bodyweight only, + equipment checklist | Exercise filtering and substitution |
| 4 | Schedule | Days per week (2-6), session length (20-90 min), preferred days | Split choice, volume |
| 5 | About you | Age, sex, height, weight; limits or injuries (free text + chips) | Calorie estimate, heart-rate zones, safety flags |
| 6 | Your plan | Recommended template with week preview; "See other plans"; edit days | Confirm or change |
| 7 | Make it yours | Theme preset + accent; modules (food, body weight, running, fasting). Food and body weight preselected for fat loss, body weight for muscle, running for the running goal; fasting never preselected and hidden for people it is not offered to | Appearance, tabs and Today cards shown |
| 8 | Install | "Add to Home Screen" instructions for the detected browser | Data safety |
| 9 | Ready | "Start first workout" (primary), "Explore the app" | First workout |

After the first workout: celebration screen with stats, then a card offering
the AI coach ("Add your own API key to get a coach"). Never before.

Goal options
- Build muscle
- Get stronger
- Learn calisthenics skills (then pick: handstand, planche, front lever,
  muscle-up, pull-up, pistol squat, general)
- Run (then pick: start running, 5 km, 10 km, half marathon, marathon, faster)
- Lose fat
- General fitness and health
- Get better at a sport (then pick the sport)

Experience descriptions (plain language)
- Beginner: less than about 6 months of consistent training.
- Intermediate: 6 months to 2-3 years, knows the main lifts or movements.
- Advanced: several years of structured training.

For calisthenics and running, ask one or two ability questions instead of
relying on the label (for example max strict pull-ups and push-ups; longest
recent run or a recent 5 km time). These set the starting progression level.

## Template matching

Input: goal, level, equipment, days per week, session length.
Output: ranked templates from `docs/programs/catalog.md`.

Rules
1. Filter by goal family.
2. Filter by level (allow one level easier, never harder).
3. Filter by days per week (exact, else nearest lower).
4. Check equipment; swap exercises through the substitution map; drop the
   template only if a core movement cannot be substituted.
5. Trim to session length by removing accessory slots first (each slot has a
   priority in the schema).
6. If a secondary goal exists, add its add-on block (for example two easy runs
   on top of a strength plan).

Safety screen: if the user reports chest pain, dizziness, a heart condition,
pregnancy, or recent surgery, show the "check with a health professional
first" note from `docs/science/populations-safety.md` and default to the
conservative template. Never block the user from continuing.

## Empty-state rule

Every tab must be useful on day one: the Today tab shows the first session,
History shows what will appear there, Coach shows what it can do and how to
add a key.
