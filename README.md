# Banzir

Your own workout app, on your own URL.

Fork this repo, deploy it to Vercel, open it on your phone and the onboarding
builds a training plan for your goal: muscle, strength, calisthenics skills,
running, fat loss, general fitness or sport support. Everything is stored on
your device. No account, no database, nothing to configure.

**Status: early version.** Onboarding, 35 plans, a program builder, guided
workouts with timers, progression suggestions, history, ten themes, backup,
offline use and an optional AI coach (bring your own key from Claude,
OpenAI, Gemini, OpenRouter, Groq, Mistral or a local model) work today, with
optional food and body-weight tracking. Fasting and a running log are still
to come. See [`docs/product/features.md`](docs/product/features.md).

## Get your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FS2K7x%2FBanzir)

1. Click the button. Vercel copies the repo to your GitHub account and deploys it.
2. Open your new address on your phone.
3. Add it to your home screen (the app explains how). This keeps your data safe and makes it work offline.

To get updates later, open your copy on GitHub and click "Sync fork".

## Develop

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

## Documentation

- Project context and decisions: [`CLAUDE.md`](CLAUDE.md)
- Product: [`docs/product`](docs/product)
- Program schema and templates: [`docs/programs`](docs/programs)
- Training and nutrition evidence: [`docs/science`](docs/science)

Banzir gives general training guidance. It is not medical advice.

Licence: MIT.
