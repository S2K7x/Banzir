# Design and themes

## References supplied by the owner (2026-11-12)

Three mobile design shots were shared as inspiration. They are described here
instead of stored, because they are third-party work.

1. **Dark sport dashboard.** Near-black background, mint-green accent.
   - Header greeting with a progress card: ring showing percent complete and
     "10/12 workouts", decorative 3D object.
   - "Choose your sport" list: large full-width cards, each with its own vivid
     gradient (blue, purple, yellow), cut-out athlete photo and an "Explore"
     pill.
   - Detail screen: "Sets" as large image cards with title, exercise count and
     a play button; horizontally scrolling "Advice" cards.
   - Floating translucent pill tab bar with a round green "+" in the centre.
2. **Light lavender fitness app.** White cards on a soft lilac background,
   indigo accent, rounded sans-serif type.
   - Search bar, row of four square icon tiles for categories.
   - "Trending" carousel of image cards with a "Start now" button; "Featured"
     list rows with thumbnail, exercise count and duration.
   - Workout detail: instructor, duration, description, video, exercise list
     with thumbnails and durations.
   - Profile: hero photo, stat trio (weight, height, age), four metric tiles
     (heart rate, calories, training hours, sleep), weekly progress line chart
     with a period selector.
   - Solid indigo bottom tab bar with four icons.
3. **Sky-blue coaching app.** Bright, airy, frosted-glass cards over a blurred
   photo, deep-blue accent.
   - Personal greeting hero, row of four headline stats.
   - Two feature cards side by side, one of them "AI Coach".
   - Large "Start Training" primary button above a five-item tab bar with
     labels (Home, Matches, Train, Coach, Profile).
   - Analysis screen: segmented control, four ring gauges, trend area chart
     with an annotation, "AI Coach Insight" card with a short verdict and one
     recommendation, primary button "View personalised drills".

## What Banzir takes from them

- **Home ("Today")**: greeting, weekly progress ring (sessions done / planned),
  today's session card with one primary "Start" button, then small stat tiles.
- **Category cards** with per-category gradient for goals and template
  families (in onboarding and the template browser).
- **Session cards** with title, exercise count, duration, play button.
- **Stat tiles and ring gauges** for adherence, volume, records, body weight.
- **Coach insight card** on Home and after workouts: one-sentence verdict plus
  one recommendation, linking to the chat.
- **Tab bar**: Today, Program, Progress, Coach, Profile. Style (floating pill,
  solid, glass) is part of the theme.
- **Illustration instead of photos.** No stock athlete photos in the repo.
  Use gradients, abstract shapes, the muscle-map SVG from the legacy app, and
  exercise images from the public-domain exercise database.

## Token system

Two tiers, CSS custom properties, switched by `data-theme` on `<html>`.

- Primitive: colour ramps generated in OKLCH from a hue.
- Semantic (the only ones components use):
  `--bg`, `--surface`, `--surface-raised`, `--border`, `--text`,
  `--text-muted`, `--accent`, `--accent-contrast`, `--accent-soft`,
  `--success`, `--warning`, `--danger`, `--ring-track`,
  `--radius-s/m/l`, `--space-*`, `--font-body`, `--font-display`,
  `--shadow-card`, `--glass-blur`, `--tabbar-style`.

Accent: user picks a hue; the app derives accent, soft tint and contrast colour
with OKLCH and `color-mix()`. Check contrast (WCAG AA) when generating and
clamp lightness if it fails.

Apply the theme before first paint (inline script reading the stored setting),
as the legacy app does, to avoid a flash.

## Implementation (2026-11-12)

Tokens and all ten presets are in `src/styles.css`; the preset list for the
picker is `src/lib/themes.ts`. The accent is `oklch(L C H)` with the hue in
`--accent-h`, which the picker overrides inline on `<html>`. Corner style is
`data-radius` (sharp / round / pill). Density, font choice, tab-bar style and
card style are not user options yet; each theme fixes them. Goal cards and
heroes use a fixed gradient per goal (`GOAL_INFO` in `src/lib/text.ts`), the
same in every theme. Contrast of every theme/accent pair has not been
measured yet.

## Theme presets (first set)

| Name | Mode | Character | From |
|---|---|---|---|
| Midnight | Dark | Near-black, mint accent, floating pill tab bar | Reference 1 |
| Lilac | Light | White cards on lavender, indigo accent, solid tab bar | Reference 2 |
| Sky | Light | Frosted cards, deep-blue accent, large primary buttons | Reference 3 |
| System | Auto | iOS-like, follows device light/dark | Legacy app |
| Carbon | Dark | Pure black (OLED), red accent, sharp corners | New |
| Sand | Light | Warm off-white, terracotta accent, serif display | New |
| Forest | Dark | Deep green, lime accent | New |
| Sunset | Dark | Plum to orange gradients | New |
| Mono | Light/Dark | Black and white, no accent colour | New |
| High contrast | Both | Accessibility preset | New |

User-adjustable on top of any preset: accent hue, corner radius (sharp /
rounded / pill), density (compact / comfortable), font (system / rounded /
serif / mono, all system stacks), tab bar style, card style (flat / raised /
glass), reduce motion.

A theme is a small JSON object, so it can be exported, shared and imported.

## Component patterns

- One primary action per screen, at thumb height.
- Bottom sheets instead of full-page modals for quick edits.
- Workout player: big set rows, large tap targets (min 44 px), previous values
  shown inline, rest timer as a persistent bar.
- Charts: one metric per chart, period selector, annotation for records.
- Respect `prefers-reduced-motion`; keep animations under 300 ms.
- Icons: one stroke SVG set, bundled.

Sources: see `docs/research-log.md` (section "Design").
