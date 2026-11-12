import { getKV, setKV } from '../db';
import { uid } from '../matcher';
import type { Chat, CoachConfig, MemoryNote } from './types';

/**
 * Coach data lives in the `kv` table, so it is included in backups (the API
 * key is stripped from backups, see backup.ts) and needs no schema migration.
 */

const CONFIG = 'coach.config';
const CHAT = 'coach.chat';
const MEMORY = 'coach.memory';

export const getConfig = () => getKV<CoachConfig>(CONFIG);
export const saveConfig = (c: CoachConfig) => setKV(CONFIG, c);
export const isReady = (c: CoachConfig | undefined): c is CoachConfig => !!c && !!c.model && (!!c.apiKey || c.provider === 'custom');

export const newChat = (promptVersion: string): Chat => ({ messages: [], cut: 0, epoch: 0, promptVersion });
export const getChat = () => getKV<Chat>(CHAT);
export const saveChat = (c: Chat) => setKV(CHAT, c);

export const MAX_NOTES = 60;
export const MAX_NOTE_LENGTH = 300;

export async function getMemory(): Promise<MemoryNote[]> {
  return (await getKV<MemoryNote[]>(MEMORY)) ?? [];
}

export async function addMemory(text: string): Promise<MemoryNote> {
  const notes = await getMemory();
  const note: MemoryNote = { id: uid('m'), text: text.trim().slice(0, MAX_NOTE_LENGTH), at: new Date().toISOString() };
  // The oldest notes give way when the list is full.
  await setKV(MEMORY, [...notes, note].slice(-MAX_NOTES));
  return note;
}

export async function removeMemory(id: string): Promise<boolean> {
  const notes = await getMemory();
  const next = notes.filter((n) => n.id !== id);
  await setKV(MEMORY, next);
  return next.length !== notes.length;
}

export const clearMemory = () => setKV(MEMORY, []);
