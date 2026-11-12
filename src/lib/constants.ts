/** Plain value lists, kept free of the validation library so screens can import them cheaply. */

export const GOALS = [
  'muscle',
  'strength',
  'calisthenics',
  'running',
  'fat_loss',
  'general_fitness',
  'sport',
] as const;

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const EQUIPMENT = [
  'pullup_bar',
  'rings',
  'parallettes',
  'dip_bars',
  'bands',
  'dumbbells',
  'kettlebell',
  'barbell',
  'rack',
  'bench',
  'cables',
  'machines',
  'medball',
  'box',
  'jump_rope',
  'heavy_bag',
] as const;

export const SLOTS = [
  'squat',
  'hinge',
  'push_h',
  'push_v',
  'pull_h',
  'pull_v',
  'single_leg',
  'core',
  'carry',
  'calf',
  'arm_flex',
  'arm_ext',
  'shoulder_lat',
  'shoulder_rear',
  'skill',
  'plyo',
  'cardio',
  'mobility',
  'rotation',
  'balance',
  'neck',
  'grip',
] as const;

export const MUSCLES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'cardio',
] as const;
