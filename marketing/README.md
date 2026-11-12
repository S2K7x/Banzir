# Marketing material

Made from the real app with a demo account. Brand rules, copy guidelines and
the launch checklist are in [`docs/product/brand.md`](../docs/product/brand.md).

| File | Format | Use |
|---|---|---|
| [`banzir-presentation.mp4`](banzir-presentation.mp4) | 1920x1080, 47 s, H.264, silent with captions | README, YouTube, X, LinkedIn, Product Hunt |
| [`banzir-presentation-poster.jpg`](banzir-presentation-poster.jpg) | 1920x1080 | Video thumbnail |
| [`banzir-reel.mp4`](banzir-reel.mp4) | 1080x1920, 37 s | Instagram Reels, TikTok, YouTube Shorts |
| [`instagram/`](instagram) | 8 slides, 1080x1350 | Instagram carousel, in file order |
| [`instagram/reel-cover.jpg`](instagram/reel-cover.jpg) | 1080x1920 | Reel cover |
| [`instagram/caption.md`](instagram/caption.md) | Text | Caption, hashtags, alt text |

## Regenerate

After a design change, serve a build and run the scripts:

```bash
npm run build
```

```bash
npx vite preview --port 4173 &
```

```bash
node marketing/make-video.mjs --format landscape
```

```bash
node marketing/make-video.mjs --format portrait
```

```bash
node marketing/make-posts.mjs
```

Needs ffmpeg with libx264 for the videos, and the Inter and Inter Display
fonts installed for the titles. Screenshots of every screen:
`node scripts/screenshots.mjs --device phone|tablet|desktop [--theme name]`.

The people, numbers and conversation in the material are invented demo data
(`scripts/demo.mjs`).
