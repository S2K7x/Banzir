# Brand and marketing

How Banzir looks and talks outside the app, and how the launch material is
made. Sources and dates are in `docs/research-log.md` (2026-11-12, "design,
branding and marketing").

## Brand

| | |
|---|---|
| Name | Banzir. Always written that way; no "the Banzir app". |
| One line | Your own workout app, on your own URL. |
| Promise | A training plan for your goal, guided workouts and honest progress, with your data on your device. |
| Proof points | Free and open source (MIT). No account, no subscription. 35 plans, beginner to advanced. Optional AI coach with your own key. Works offline, on phone and desktop. |
| Audience | People who train, from a first push-up to a first marathon, and like owning their tools. |
| Mark | `public/icon.svg`: a white "B" on a teal-to-petrol gradient (#19c79a to #0b3b46), rounded square. Do not recolour or stretch it. |
| Colours | Accent teal #36d6a1 on near-black #0a0f11, with soft teal and petrol glows. Goal colours (`GOAL_INFO` in `src/lib/text.ts`) appear only on app screens. |
| Type | Marketing images: Inter Display (headlines, weight 800, tight tracking) and Inter (body). The app itself uses the system font, no remote fonts. |
| Voice | Plain English, short sentences, numbers you can check. Warm, direct, never preachy. No hype words ("revolutionary", "ultimate"), no body shaming, no promises of results by a date. Every training claim traces to `docs/science/`. |

Writing rules for marketing copy
- Lead with what the person gets, then how: "A plan built for your goal",
  not "Advanced plan-matching engine".
- Say "your data stays on your device", not "privacy-first architecture".
- Be honest about limits: the AI coach is optional and needs your own key;
  fasting is not offered to under-18s or in pregnancy.
- No emoji, in the app or in posts.

## Assets (in `marketing/`)

| File | Use |
|---|---|
| `banzir-presentation.mp4` | 1920x1080, 47 s, silent with on-screen captions. README, YouTube, X, LinkedIn, Product Hunt. |
| `banzir-presentation-poster.jpg` | Thumbnail for the above. |
| `banzir-reel.mp4` | 1080x1920, 37 s. Instagram Reels, TikTok, YouTube Shorts. |
| `instagram/01-cover.jpg` to `08-get-yours.jpg` | Instagram carousel, 1080x1350 (4:5), in order. |
| `instagram/reel-cover.jpg` | 1080x1920 cover for the Reel. |
| `instagram/caption.md` | Caption, hashtags, alt text. |
| `docs/screenshots/phone`, `docs/screenshots/desktop` | Every main screen, WebP, for press and store pages. |

Everything is rendered from the real app with a demo account
(`scripts/demo.mjs`), so it can be regenerated after a design change:
`marketing/make-video.mjs` (both video formats) and `marketing/make-posts.mjs`
(carousel and Reel cover), with the app served on port 4173. See
`marketing/README.md`.

## How the material is built, and why

Video (both formats)
- The product shows in the first second and the title lands within three:
  viewers decide in the first 3-5 seconds whether to keep watching
  `[secondary: app-video guides]`.
- One idea per scene, each with a kicker, a title and one line: hook, plans,
  workouts, progress, coach, modules, themes, devices, call to action.
- Silent with captions: most social video autoplays muted.
- Real app footage: sets are ticked, the rest timer counts down and lists
  scroll, captured from the app frame by frame.
- About 47 s for the presentation; the Reel runs 22 % faster (37 s), since
  short-form guides favour around 30 s.

Instagram carousel
- 4:5 (1080x1350) on every slide; Instagram crops a carousel to the first
  slide's shape, and 4:5 is the tallest feed format.
- The cover is the hook ("Your own workout app.") with a swipe cue; the
  last slide carries the call to action and asks for a save and a share,
  which carousel guides recommend.
- One idea per slide, readable in a second or two; key text kept in the
  centre, which survives the profile grid's 3:4 crop.
- Five descriptive hashtags rather than thirty; the link goes in the bio,
  since caption links are not clickable.

Desktop layout (also a marketing point)
- Material's adaptive guidance maps compact windows to a bottom bar and
  larger ones to a navigation rail or drawer; Banzir switches to a sidebar at
  1024 px and never shows both.

## Launch checklist (open source)

1. README first: what it is, a screenshot above the fold, the one-click
   deploy, privacy in plain words. Done.
2. Make it easy to try: the deploy button and a public demo URL (deploy one
   copy and link it; not done yet).
3. Show HN: a plain title ("Show HN: Banzir, an open-source workout app you
   deploy yourself"), a first comment on how it is built (local-first,
   IndexedDB, bring-your-own-key coach, plans as data) and its limits; stay
   in the thread for the first hours.
4. Product Hunt on a different day, with the presentation video and the
   desktop screenshot.
5. Reddit communities where self-hosting and training overlap
   (r/selfhosted, r/bodyweightfitness, r/fitness): follow each one's rules
   on self-promotion; lead with the free, local-first angle.
6. Instagram: the carousel first, the Reel two or three days later.
7. Keep momentum: answer issues quickly, label good first issues, post the
   changelog with each release.
