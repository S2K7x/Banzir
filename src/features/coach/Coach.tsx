import { Icon } from '../../ui/kit';

/** Placeholder for the AI coach (roadmap phase 5). Design: docs/product/ai-coach.md. */
export function Coach() {
  return (
    <div className="screen">
      <h1 className="h1">Coach</h1>
      <div className="card accent stack">
        <div className="row">
          <Icon name="spark" />
          <b className="grow">An AI coach is on the way</b>
        </div>
        <p className="small">
          You will be able to connect your own API key (OpenAI, Claude, Gemini, OpenRouter or a local model) and chat with a coach that reads your training log, remembers what matters about you, and proposes changes to your plan for you to accept or decline.
        </p>
      </div>
      <div className="card stack">
        <b>What already works without it</b>
        <div className="list">
          {[
            ['bolt', 'Load and rep suggestions', 'Each exercise tells you what to aim for, based on your last sessions.'],
            ['up', 'Automatic progression', 'Bodyweight exercises move up a ladder of harder variations when you are ready.'],
            ['timer', 'Lighter weeks', 'After several hard weeks the app suggests a week with half the sets.'],
            ['swap', 'Plan matching', 'Plans are ranked for your goal, level, schedule and equipment, and you can switch any time.'],
          ].map(([icon, title, text]) => (
            <div key={title}>
              <span style={{ color: 'var(--accent)' }}>
                <Icon name={icon} size={20} />
              </span>
              <span className="grow">
                <b>{title}</b>
                <span className="muted small" style={{ display: 'block' }}>
                  {text}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
