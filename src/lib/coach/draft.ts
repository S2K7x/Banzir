/** Lets other screens hand the coach a question to edit and send. Kept tiny so it does not pull the coach code in. */
export const COACH_DRAFT_KEY = 'banzir.coachDraft';
export const COACH_CONFIG_KEY = 'coach.config';

export function setCoachDraft(text: string) {
  try {
    sessionStorage.setItem(COACH_DRAFT_KEY, text);
  } catch {
    /* storage unavailable */
  }
}
