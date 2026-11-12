import type { Equipment, Exercise, Item, Level, LogType, Muscle, Prescription, Slot } from '../lib/schema';

/**
 * Curated core library: every exercise the built-in templates use, plus the
 * substitutes the matcher needs for each movement slot and equipment set.
 * The full public-domain dataset (yuhonas/free-exercise-db) is planned as a
 * lazily loaded extension for the program builder.
 */

type Opts = {
  eq?: Equipment[];
  sec?: Muscle[];
  lvl?: Level;
  log?: LogType;
  uni?: boolean;
  cue?: string;
  ladder?: [string, number];
  range?: [number, number];
};

function ex(id: string, name: string, slot: Slot, primary: Muscle[], o: Opts = {}): Exercise {
  const eq = o.eq ?? [];
  const weighted = eq.some((e) => ['dumbbells', 'kettlebell', 'barbell', 'cables', 'machines'].includes(e));
  return {
    id,
    name,
    slot,
    primary,
    secondary: o.sec ?? [],
    equipment: eq,
    level: o.lvl ?? 'beginner',
    logType: o.log ?? (weighted ? 'weight_reps' : 'reps'),
    unilateral: o.uni,
    cue: o.cue,
    range: o.range,
    ladder: o.ladder?.[0],
    step: o.ladder?.[1],
  };
}

const LEGS: Muscle[] = ['quads', 'glutes'];

export const EXERCISES: Exercise[] = [
  // ----- Squat -----
  ex('sit_to_stand', 'Sit to stand', 'squat', LEGS, { cue: 'From a chair: stand up quickly, sit down slowly. Use your hands only if you need to.', ladder: ['squat', 0] }),
  ex('wall_sit', 'Wall sit', 'squat', ['quads'], { log: 'hold', cue: 'Back flat on the wall, thighs as close to level as is comfortable. Good for sore knees and tendons.' }),
  ex('bw_squat', 'Bodyweight squat', 'squat', LEGS, { cue: 'Sit between your hips, knees track over toes.', ladder: ['squat', 1] }),
  ex('goblet_squat', 'Goblet squat', 'squat', LEGS, { eq: ['dumbbells'], sec: ['core'], cue: 'Hold the weight at your chest, elbows inside the knees.' }),
  ex('back_squat', 'Back squat', 'squat', LEGS, { eq: ['barbell', 'rack'], sec: ['hamstrings', 'core'], cue: 'Brace, break at hips and knees together, drive up through mid-foot.' }),
  ex('front_squat', 'Front squat', 'squat', LEGS, { eq: ['barbell', 'rack'], sec: ['core'], lvl: 'intermediate', cue: 'Elbows high, torso upright.' }),
  ex('leg_press', 'Leg press', 'squat', LEGS, { eq: ['machines'], cue: 'Lower until knees are well bent without your hips lifting.' }),
  ex('assisted_pistol', 'Assisted pistol squat', 'squat', LEGS, { lvl: 'intermediate', uni: true, cue: 'Hold a support, lower slowly on one leg.', range: [4, 8], ladder: ['squat', 4] }),
  ex('pistol_squat', 'Pistol squat', 'squat', LEGS, { lvl: 'advanced', uni: true, cue: 'Free leg forward, stay balanced over mid-foot.', ladder: ['squat', 5] }),

  // ----- Single leg -----
  ex('split_squat', 'Split squat', 'single_leg', LEGS, { uni: true, cue: 'Drop the back knee straight down, front foot flat.', ladder: ['squat', 2] }),
  ex('bw_bulgarian', 'Bulgarian split squat', 'single_leg', LEGS, { uni: true, lvl: 'intermediate', cue: 'Rear foot on a chair or bench, lower under control.', ladder: ['squat', 3] }),
  ex('db_split_squat', 'Dumbbell split squat', 'single_leg', LEGS, { eq: ['dumbbells'], uni: true, cue: 'Dumbbells at your sides, torso tall.' }),
  ex('db_bulgarian', 'Dumbbell Bulgarian split squat', 'single_leg', LEGS, { eq: ['dumbbells'], uni: true, lvl: 'intermediate', cue: 'Rear foot elevated, 3 seconds down.' }),
  ex('reverse_lunge', 'Reverse lunge', 'single_leg', LEGS, { uni: true, cue: 'Step back, lower, push through the front foot.' }),
  ex('step_up', 'Step-up', 'single_leg', LEGS, { uni: true, cue: 'Push through the top foot, do not bounce off the floor.' }),

  // ----- Hinge -----
  ex('glute_bridge', 'Glute bridge', 'hinge', ['glutes'], { sec: ['hamstrings'], cue: 'Squeeze at the top, ribs down.', ladder: ['bridge', 1] }),
  ex('single_leg_bridge', 'Single-leg glute bridge', 'hinge', ['glutes'], { sec: ['hamstrings'], uni: true, cue: 'Keep hips level.', ladder: ['bridge', 2] }),
  ex('single_leg_rdl', 'Single-leg Romanian deadlift', 'hinge', ['hamstrings', 'glutes'], { uni: true, lvl: 'intermediate', cue: 'Hips square, reach the free leg back.', ladder: ['bridge', 3] }),
  ex('nordic_curl', 'Nordic curl', 'hinge', ['hamstrings'], { lvl: 'advanced', cue: 'Anchor your feet, lower as slowly as you can.', range: [3, 6], ladder: ['bridge', 4] }),
  ex('db_rdl', 'Dumbbell Romanian deadlift', 'hinge', ['hamstrings', 'glutes'], { eq: ['dumbbells'], sec: ['back'], cue: 'Push hips back, soft knees, flat back.' }),
  ex('barbell_rdl', 'Romanian deadlift', 'hinge', ['hamstrings', 'glutes'], { eq: ['barbell'], sec: ['back'], cue: 'Bar stays close to the legs, hips back.' }),
  ex('deadlift', 'Deadlift', 'hinge', ['hamstrings', 'glutes', 'back'], { eq: ['barbell'], sec: ['forearms', 'core'], cue: 'Brace, push the floor away, bar close.' }),
  ex('db_hip_thrust', 'Dumbbell hip thrust', 'hinge', ['glutes'], { eq: ['dumbbells', 'bench'], sec: ['hamstrings'], cue: 'Shoulders on the bench, pause at the top.' }),
  ex('hip_thrust', 'Barbell hip thrust', 'hinge', ['glutes'], { eq: ['barbell', 'bench'], sec: ['hamstrings'], cue: 'Chin tucked, full lockout.' }),
  ex('leg_curl', 'Leg curl', 'hinge', ['hamstrings'], { eq: ['machines'], cue: 'Control the way back.' }),
  ex('leg_extension', 'Leg extension', 'squat', ['quads'], { eq: ['machines'], cue: 'Pause at the top.' }),

  // ----- Horizontal push -----
  ex('wall_pushup', 'Wall push-up', 'push_h', ['chest'], { sec: ['triceps', 'shoulders'], cue: 'Hands on a wall at shoulder height, body straight, chest to the wall.', ladder: ['pushup', 0] }),
  ex('incline_pushup', 'Incline push-up', 'push_h', ['chest'], { sec: ['triceps', 'shoulders'], cue: 'Hands on a table or bench, body in one line.', ladder: ['pushup', 1] }),
  ex('knee_pushup', 'Knee push-up', 'push_h', ['chest'], { sec: ['triceps', 'shoulders'], cue: 'Straight line from knees to head.', ladder: ['pushup', 2] }),
  ex('pushup', 'Push-up', 'push_h', ['chest'], { sec: ['triceps', 'shoulders', 'core'], cue: 'Elbows about 45 degrees, chest to the floor.', ladder: ['pushup', 3] }),
  ex('diamond_pushup', 'Diamond push-up', 'push_h', ['chest', 'triceps'], { sec: ['shoulders'], lvl: 'intermediate', cue: 'Hands together under the chest.', ladder: ['pushup', 4] }),
  ex('decline_pushup', 'Decline push-up', 'push_h', ['chest'], { sec: ['shoulders', 'triceps'], lvl: 'intermediate', cue: 'Feet on a chair, stay rigid.', ladder: ['pushup', 5] }),
  ex('archer_pushup', 'Archer push-up', 'push_h', ['chest'], { sec: ['triceps', 'shoulders'], lvl: 'advanced', uni: true, cue: 'Shift your weight over one arm.', ladder: ['pushup', 6] }),
  ex('pseudo_planche_pushup', 'Pseudo planche push-up', 'push_h', ['chest', 'shoulders'], { sec: ['triceps', 'core'], lvl: 'intermediate', cue: 'Hands by the hips, lean forward as far as you can control, protract at the top.', ladder: ['pushup', 7] }),
  ex('bench_press', 'Bench press', 'push_h', ['chest'], { eq: ['barbell', 'bench', 'rack'], sec: ['triceps', 'shoulders'], cue: 'Shoulder blades back, bar to mid-chest.' }),
  ex('db_bench_press', 'Dumbbell bench press', 'push_h', ['chest'], { eq: ['dumbbells', 'bench'], sec: ['triceps', 'shoulders'], cue: 'Lower until the elbows pass the bench line.' }),
  ex('db_floor_press', 'Dumbbell floor press', 'push_h', ['chest'], { eq: ['dumbbells'], sec: ['triceps'], cue: 'Upper arms touch the floor, then press.' }),
  ex('incline_db_press', 'Incline dumbbell press', 'push_h', ['chest', 'shoulders'], { eq: ['dumbbells', 'bench'], sec: ['triceps'], cue: 'Bench at about 30 degrees.' }),
  ex('chest_press', 'Machine chest press', 'push_h', ['chest'], { eq: ['machines'], sec: ['triceps', 'shoulders'] }),
  ex('bench_dip', 'Bench dip', 'push_h', ['triceps'], { sec: ['chest', 'shoulders'], cue: 'Shoulders down, do not sink too deep.', ladder: ['dip', 1] }),
  ex('dip_negative', 'Dip negative', 'push_h', ['chest', 'triceps'], { eq: ['dip_bars'], sec: ['shoulders'], cue: 'Jump to the top, lower for 5 seconds.', range: [3, 5], ladder: ['dip', 2] }),
  ex('dip', 'Dip', 'push_h', ['chest', 'triceps'], { eq: ['dip_bars'], sec: ['shoulders'], lvl: 'intermediate', cue: 'Lean slightly forward, shoulders below elbows.', ladder: ['dip', 3] }),
  ex('ring_dip', 'Ring dip', 'push_h', ['chest', 'triceps'], { eq: ['rings'], sec: ['shoulders', 'core'], lvl: 'advanced', cue: 'Turn the rings out at the top.', ladder: ['dip', 4] }),

  // ----- Vertical push -----
  ex('pike_pushup', 'Pike push-up', 'push_v', ['shoulders'], { sec: ['triceps'], cue: 'Hips high, head moves forward of the hands.', ladder: ['hspu', 1] }),
  ex('elevated_pike_pushup', 'Feet-elevated pike push-up', 'push_v', ['shoulders'], { sec: ['triceps'], lvl: 'intermediate', cue: 'Feet on a chair, torso close to vertical.', ladder: ['hspu', 2] }),
  ex('wall_hspu_negative', 'Wall handstand push-up negative', 'push_v', ['shoulders'], { sec: ['triceps'], lvl: 'advanced', cue: 'Lower for 3 to 5 seconds, never drop.', range: [3, 5], ladder: ['hspu', 3] }),
  ex('wall_hspu', 'Wall handstand push-up', 'push_v', ['shoulders'], { sec: ['triceps'], lvl: 'advanced', cue: 'Full range, no kipping.', ladder: ['hspu', 4] }),
  ex('db_shoulder_press', 'Dumbbell shoulder press', 'push_v', ['shoulders'], { eq: ['dumbbells'], sec: ['triceps'], cue: 'Ribs down, press straight up.' }),
  ex('overhead_press', 'Overhead press', 'push_v', ['shoulders'], { eq: ['barbell'], sec: ['triceps', 'core'], cue: 'Squeeze glutes, bar over mid-foot at the top.' }),
  ex('machine_shoulder_press', 'Machine shoulder press', 'push_v', ['shoulders'], { eq: ['machines'], sec: ['triceps'] }),
  ex('band_shoulder_press', 'Band shoulder press', 'push_v', ['shoulders'], { eq: ['bands'], sec: ['triceps'], cue: 'Stand on the band, press overhead.' }),

  // ----- Horizontal pull -----
  ex('table_row', 'Table or towel row', 'pull_h', ['back'], { sec: ['biceps'], cue: 'Pull your chest to a sturdy table edge, or row a towel looped around a door handle.', ladder: ['row', 1] }),
  ex('inverted_row', 'Inverted row', 'pull_h', ['back'], { eq: ['pullup_bar'], sec: ['biceps', 'shoulders'], cue: 'Body straight, chest to the bar, pause.', ladder: ['row', 2] }),
  ex('ring_row', 'Ring row', 'pull_h', ['back'], { eq: ['rings'], sec: ['biceps', 'shoulders'], cue: 'Squeeze shoulder blades, pause at the top.', ladder: ['row', 2] }),
  ex('band_row', 'Band row', 'pull_h', ['back'], { eq: ['bands'], sec: ['biceps'], cue: 'Anchor the band, pull elbows past your ribs.' }),
  ex('db_row', 'One-arm dumbbell row', 'pull_h', ['back'], { eq: ['dumbbells'], sec: ['biceps'], uni: true, cue: 'Pull the elbow to the hip, no twisting.' }),
  ex('barbell_row', 'Barbell row', 'pull_h', ['back'], { eq: ['barbell'], sec: ['biceps', 'hamstrings'], cue: 'Flat back, bar to the lower ribs.' }),
  ex('cable_row', 'Seated cable row', 'pull_h', ['back'], { eq: ['cables'], sec: ['biceps'], cue: 'Sit tall, pull to the stomach.' }),

  // ----- Vertical pull -----
  ex('dead_hang', 'Dead hang', 'pull_v', ['forearms', 'back'], { eq: ['pullup_bar'], log: 'hold', cue: 'Shoulders active, ribs down.', ladder: ['pullup', 1] }),
  ex('scap_pull', 'Scapular pull', 'pull_v', ['back'], { eq: ['pullup_bar'], cue: 'Arms straight, pull the shoulders down.', range: [8, 12], ladder: ['pullup', 2] }),
  ex('pullup_negative', 'Pull-up negative', 'pull_v', ['back', 'biceps'], { eq: ['pullup_bar'], cue: 'Jump to the top, lower for 5 seconds.', range: [3, 5], ladder: ['pullup', 3] }),
  ex('band_pullup', 'Band-assisted pull-up', 'pull_v', ['back', 'biceps'], { eq: ['pullup_bar', 'bands'], cue: 'Chin over the bar, full hang at the bottom.', ladder: ['pullup', 4] }),
  ex('pullup', 'Pull-up', 'pull_v', ['back', 'biceps'], { eq: ['pullup_bar'], sec: ['forearms', 'core'], lvl: 'intermediate', cue: 'Start from a dead hang, chin clearly over the bar.', ladder: ['pullup', 5] }),
  ex('chest_to_bar', 'Chest-to-bar pull-up', 'pull_v', ['back', 'biceps'], { eq: ['pullup_bar'], lvl: 'advanced', cue: 'Pull high, elbows to the hips.', ladder: ['pullup', 6] }),
  ex('lat_pulldown', 'Lat pull-down', 'pull_v', ['back'], { eq: ['cables'], sec: ['biceps'], cue: 'Pull the bar to the upper chest.' }),
  ex('band_pulldown', 'Band pull-down', 'pull_v', ['back'], { eq: ['bands'], sec: ['biceps'], cue: 'Anchor the band high, pull elbows to your sides.' }),

  ex('lateral_lunge', 'Lateral lunge', 'single_leg', ['quads', 'glutes'], { sec: ['hamstrings'], uni: true, cue: 'Step wide, sit back into one hip, keep the other leg straight.' }),
  ex('db_fly', 'Dumbbell fly', 'push_h', ['chest'], { eq: ['dumbbells', 'bench'], cue: 'Slight bend in the elbows, open wide for a deep stretch.' }),
  ex('landmine_press', 'Landmine press', 'push_v', ['shoulders', 'chest'], { eq: ['barbell'], sec: ['triceps', 'core'], uni: true, cue: 'One end of the bar in a corner. Press up and forward from the shoulder.' }),
  ex('bent_knee_calf_raise', 'Bent-knee calf raise', 'calf', ['calves'], { cue: 'Knees bent about 30 degrees: works the deeper calf muscle runners rely on.' }),

  // ----- Core -----
  ex('plank', 'Plank', 'core', ['core'], { log: 'hold', cue: 'Squeeze glutes, do not let the hips sag.' }),
  ex('side_plank', 'Side plank', 'core', ['core'], { log: 'hold', uni: true, cue: 'Hips high, body in one line.' }),
  ex('dead_bug', 'Dead bug', 'core', ['core'], { cue: 'Lower back stays on the floor.' }),
  ex('hollow_hold', 'Hollow hold', 'core', ['core'], { log: 'hold', lvl: 'intermediate', cue: 'Lower back pressed down, arms by the ears.' }),
  ex('hanging_knee_raise', 'Hanging knee raise', 'core', ['core'], { eq: ['pullup_bar'], lvl: 'intermediate', cue: 'No swinging, curl the pelvis up.' }),
  ex('lying_leg_raise', 'Lying leg raise', 'core', ['core'], { cue: 'Lower slowly, back stays flat.' }),
  ex('cable_crunch', 'Cable crunch', 'core', ['core'], { eq: ['cables'] }),
  ex('tuck_lsit', 'Tuck L-sit', 'core', ['core'], { log: 'hold', cue: 'Hands by the hips, push down, lift the feet with knees bent.', ladder: ['lsit', 1] }),
  ex('lsit', 'L-sit', 'core', ['core'], { sec: ['quads'], lvl: 'intermediate', log: 'hold', cue: 'Legs straight and level, shoulders pushed down.', ladder: ['lsit', 2] }),
  ex('dragon_flag', 'Dragon flag', 'core', ['core'], { lvl: 'advanced', cue: 'Hold something behind your head. Lower as one straight line; bend the knees to make it easier.' }),

  ex('pallof_press', 'Pallof press', 'core', ['core'], { eq: ['bands'], uni: true, cue: 'Band anchored to your side. Press it straight out and do not let it turn you.' }),
  ex('copenhagen_plank', 'Copenhagen plank', 'core', ['core'], { log: 'hold', uni: true, cue: 'Side plank with the top leg on a bench or sofa. Bend the knee on the bench to make it easier.' }),

  // ----- Rotation, balance, neck, grip -----
  ex('medball_rot_throw', 'Medicine ball rotational throw', 'rotation', ['core'], { eq: ['medball'], sec: ['shoulders', 'glutes'], uni: true, cue: 'Turn from the back hip and throw into a wall as hard as you can. Reset each rep.' }),
  ex('medball_slam', 'Medicine ball slam', 'rotation', ['core'], { eq: ['medball'], sec: ['back', 'shoulders'], cue: 'Reach tall, then slam the ball down with your whole body.' }),
  ex('cable_woodchop', 'Cable woodchop', 'rotation', ['core'], { eq: ['cables'], sec: ['shoulders'], uni: true, cue: 'Turn through the hips and upper back, arms stay long.' }),
  ex('band_woodchop', 'Band woodchop', 'rotation', ['core'], { eq: ['bands'], sec: ['shoulders'], uni: true, cue: 'Turn through the hips and upper back, arms stay long.' }),
  ex('single_leg_balance', 'Single-leg balance', 'balance', ['calves'], { sec: ['core'], log: 'hold', uni: true, cue: 'Stand on one leg near a support. Harder: close your eyes or stand on a cushion.' }),
  ex('tandem_stance', 'Heel-to-toe stand', 'balance', ['core'], { log: 'hold', cue: 'One foot directly in front of the other, near a wall or chair for safety.' }),
  ex('neck_isometric', 'Neck isometric holds', 'neck', ['shoulders'], { log: 'hold', cue: 'Press your head into your hand forwards, backwards and to each side without moving. Moderate effort only.' }),
  ex('db_wrist_extension', 'Wrist extension', 'grip', ['forearms'], { eq: ['dumbbells'], cue: 'Forearm on your thigh, palm down. Lift and lower the back of the hand slowly.' }),
  ex('db_wrist_curl', 'Wrist curl', 'grip', ['forearms'], { eq: ['dumbbells'], cue: 'Forearm on your thigh, palm up. Curl the weight with the wrist only.' }),

  // ----- Carry / calves / arms / shoulders -----
  ex('farmer_carry', 'Farmer carry', 'carry', ['forearms', 'core'], { eq: ['dumbbells'], log: 'time', cue: 'Walk tall, shoulders back.' }),
  ex('calf_raise', 'Calf raise', 'calf', ['calves'], { cue: 'Full stretch at the bottom, pause at the top.' }),
  ex('db_calf_raise', 'Dumbbell calf raise', 'calf', ['calves'], { eq: ['dumbbells'], cue: 'Stand on a step for more range.' }),
  ex('machine_calf_raise', 'Machine calf raise', 'calf', ['calves'], { eq: ['machines'] }),
  ex('db_curl', 'Dumbbell curl', 'arm_flex', ['biceps'], { eq: ['dumbbells'], cue: 'Elbows still, no swinging.' }),
  ex('barbell_curl', 'Barbell curl', 'arm_flex', ['biceps'], { eq: ['barbell'] }),
  ex('incline_db_curl', 'Incline dumbbell curl', 'arm_flex', ['biceps'], { eq: ['dumbbells', 'bench'], cue: 'Let the arms hang back for a full stretch.' }),
  ex('band_curl', 'Band curl', 'arm_flex', ['biceps'], { eq: ['bands'] }),
  ex('triceps_pushdown', 'Triceps push-down', 'arm_ext', ['triceps'], { eq: ['cables'], cue: 'Elbows pinned to your sides.' }),
  ex('db_overhead_triceps', 'Overhead dumbbell triceps extension', 'arm_ext', ['triceps'], { eq: ['dumbbells'], cue: 'Elbows point up, full stretch.' }),
  ex('band_pushdown', 'Band push-down', 'arm_ext', ['triceps'], { eq: ['bands'] }),
  ex('db_lateral_raise', 'Lateral raise', 'shoulder_lat', ['shoulders'], { eq: ['dumbbells'], cue: 'Lead with the elbows, stop at shoulder height.' }),
  ex('band_lateral_raise', 'Band lateral raise', 'shoulder_lat', ['shoulders'], { eq: ['bands'] }),
  ex('db_rear_delt_fly', 'Rear delt fly', 'shoulder_rear', ['shoulders'], { eq: ['dumbbells'], sec: ['back'], cue: 'Hinge forward, lift out to the sides.' }),
  ex('face_pull', 'Face pull', 'shoulder_rear', ['shoulders'], { eq: ['cables'], sec: ['back'], cue: 'Pull to the forehead, thumbs back.' }),
  ex('band_pull_apart', 'Band pull-apart', 'shoulder_rear', ['shoulders'], { eq: ['bands'], sec: ['back'] }),
  ex('band_external_rotation', 'Band external rotation', 'shoulder_rear', ['shoulders'], { eq: ['bands'], cue: 'Elbow at your side, rotate the forearm outwards.' }),
  ex('prone_ytw', 'Prone Y-T-W', 'shoulder_rear', ['shoulders'], { sec: ['back'], cue: 'Lie face down, lift arms in Y, T and W shapes.' }),

  // ----- Skill: handstand -----
  ex('wall_plank', 'Wall plank', 'skill', ['shoulders'], { sec: ['core'], log: 'hold', cue: 'Feet on the wall at hip height, arms locked, push the floor away.', ladder: ['handstand', 1] }),
  ex('wall_handstand', 'Chest-to-wall handstand', 'skill', ['shoulders'], { sec: ['core'], lvl: 'intermediate', log: 'hold', cue: 'Walk the feet up the wall, push tall through the shoulders, ribs in.', ladder: ['handstand', 2] }),
  ex('freestanding_handstand', 'Freestanding handstand', 'skill', ['shoulders'], { sec: ['core'], lvl: 'advanced', log: 'hold', cue: 'Grip the floor with your fingers to stop falling over.', ladder: ['handstand', 3] }),
  ex('wall_kickup', 'Wall kick-up', 'skill', ['shoulders'], { sec: ['core'], cue: 'Back to the wall. Kick up gently, touch the wall with your heels, come down under control.' }),
  ex('wall_shoulder_taps', 'Wall handstand shoulder taps', 'skill', ['shoulders'], { sec: ['core'], lvl: 'intermediate', cue: 'Chest to the wall. Shift your weight and lift one hand briefly.' }),
  ex('handstand_practice', 'Handstand practice', 'skill', ['shoulders'], { sec: ['core'], log: 'time', cue: 'Wall or freestanding drills while you are fresh. Stop before your form goes.' }),

  // ----- Skill: planche -----
  ex('planche_lean', 'Planche lean', 'skill', ['shoulders'], { sec: ['chest', 'core'], log: 'hold', cue: 'Arms locked, shoulders well ahead of the wrists, round the upper back.', ladder: ['planche', 1] }),
  ex('frog_stand', 'Frog stand', 'skill', ['shoulders'], { sec: ['core'], log: 'hold', cue: 'Knees on the elbows, lean forward until the feet leave the floor.', ladder: ['planche', 2] }),
  ex('tuck_planche', 'Tuck planche', 'skill', ['shoulders'], { sec: ['chest', 'core'], lvl: 'intermediate', log: 'hold', cue: 'Arms locked, knees to the chest, hips level with the shoulders.', ladder: ['planche', 3] }),
  ex('adv_tuck_planche', 'Advanced tuck planche', 'skill', ['shoulders'], { sec: ['chest', 'core'], lvl: 'advanced', log: 'hold', cue: 'Flat back, hips as high as the shoulders.', ladder: ['planche', 4] }),
  ex('straddle_planche', 'Straddle planche', 'skill', ['shoulders'], { sec: ['chest', 'core'], lvl: 'advanced', log: 'hold', cue: 'Legs wide and straight, body level.', ladder: ['planche', 5] }),
  ex('full_planche', 'Full planche', 'skill', ['shoulders'], { sec: ['chest', 'core'], lvl: 'advanced', log: 'hold', cue: 'Legs together, body in one line.', ladder: ['planche', 6] }),
  ex('scap_pushup', 'Scapular push-up', 'skill', ['shoulders'], { sec: ['chest'], cue: 'Arms straight. Let the chest sink between the shoulders, then push the floor away.' }),

  // ----- Skill: front lever -----
  ex('tuck_front_lever', 'Tuck front lever', 'skill', ['back'], { eq: ['pullup_bar'], sec: ['core'], lvl: 'intermediate', log: 'hold', cue: 'Arms straight, pull the shoulders down, hips level with the shoulders.', ladder: ['frontlever', 1] }),
  ex('adv_tuck_front_lever', 'Advanced tuck front lever', 'skill', ['back'], { eq: ['pullup_bar'], sec: ['core'], lvl: 'advanced', log: 'hold', cue: 'Flat back, thighs at right angles to the body.', ladder: ['frontlever', 2] }),
  ex('one_leg_front_lever', 'One-leg front lever', 'skill', ['back'], { eq: ['pullup_bar'], sec: ['core'], lvl: 'advanced', log: 'hold', cue: 'One leg straight, one tucked. Swap legs each set.', ladder: ['frontlever', 3] }),
  ex('straddle_front_lever', 'Straddle front lever', 'skill', ['back'], { eq: ['pullup_bar'], sec: ['core'], lvl: 'advanced', log: 'hold', cue: 'Legs wide and straight, body level.', ladder: ['frontlever', 4] }),
  ex('front_lever', 'Front lever', 'skill', ['back'], { eq: ['pullup_bar'], sec: ['core'], lvl: 'advanced', log: 'hold', cue: 'Legs together, body in one line.', ladder: ['frontlever', 5] }),
  ex('fl_raise', 'Tuck front lever raise', 'skill', ['back'], { eq: ['pullup_bar'], sec: ['core'], lvl: 'intermediate', cue: 'From a hang, raise the hips to horizontal with straight arms, then lower slowly.' }),
  ex('tuck_fl_row', 'Tuck front lever row', 'pull_h', ['back'], { eq: ['pullup_bar'], sec: ['biceps', 'core'], lvl: 'advanced', cue: 'Hold the tuck lever and row the bar to your hips.' }),
  ex('skin_the_cat', 'Skin the cat', 'skill', ['shoulders', 'back'], { eq: ['pullup_bar'], sec: ['core'], lvl: 'intermediate', cue: 'Slow and controlled both ways. Stop if the shoulders or elbows hurt.' }),

  // ----- Skill: muscle-up -----
  ex('false_grip_hang', 'False-grip hang', 'skill', ['forearms'], { eq: ['pullup_bar'], sec: ['back'], lvl: 'intermediate', log: 'hold', cue: 'Wrist over the bar or ring, hang with the shoulders active.' }),
  ex('muscleup_transition', 'Muscle-up transition drill', 'skill', ['back', 'triceps'], { eq: ['pullup_bar'], sec: ['chest'], lvl: 'intermediate', cue: 'Low bar or feet on the floor. Pull high, roll the wrists over, press out.' }),
  ex('muscleup_negative', 'Muscle-up negative', 'skill', ['back', 'triceps'], { eq: ['pullup_bar'], sec: ['chest', 'biceps'], lvl: 'advanced', cue: 'Start on top. Lower through the dip and the transition for 5 to 7 seconds.', range: [2, 4], ladder: ['muscleup', 1] }),
  ex('muscle_up', 'Muscle-up', 'skill', ['back', 'triceps'], { eq: ['pullup_bar'], sec: ['chest', 'biceps'], lvl: 'advanced', cue: 'Strict: no kip. Quality reps only, never to failure.', ladder: ['muscleup', 2] }),

  // ----- Power -----
  ex('pogo_jumps', 'Pogo jumps', 'plyo', ['calves'], { cue: 'Quick, stiff ankle bounces.' }),
  ex('squat_jump', 'Squat jump', 'plyo', LEGS, { cue: 'Land softly, reset before each jump.' }),
  ex('broad_jump', 'Broad jump', 'plyo', LEGS, { lvl: 'intermediate', cue: 'Swing the arms, stick the landing.' }),

  ex('box_jump', 'Box jump', 'plyo', LEGS, { eq: ['box'], cue: 'Jump up, land softly, step down. Height is not the point.' }),
  ex('lateral_bound', 'Lateral bound', 'plyo', LEGS, { uni: true, cue: 'Push sideways off one leg, land on the other and hold the landing for a second.' }),
  ex('a_skip', 'A-skips', 'plyo', ['calves'], { sec: ['quads'], cue: 'Skip with a high knee and a quick, springy foot strike.' }),

  // ----- Cardio and timed work -----
  ex('run_walk', 'Run / walk', 'cardio', ['cardio'], { log: 'time', cue: 'Run at a pace where you could still talk.' }),
  ex('easy_run', 'Easy run', 'cardio', ['cardio'], { log: 'time', cue: 'Conversational pace.' }),
  ex('brisk_walk', 'Brisk walk', 'cardio', ['cardio'], { log: 'time', cue: 'Fast enough to warm up, easy enough to talk.' }),
  ex('hard_intervals', 'Intervals', 'cardio', ['cardio'], { log: 'time', cue: 'Any mode: run, bike, rower, rope or stairs.' }),
  ex('warmup_general', 'General warm-up', 'mobility', [], { log: 'time', cue: 'Easy movement, joint circles, a few light reps of the first exercise.' }),
  ex('warmup_wrists', 'Wrist and shoulder prep', 'mobility', [], { log: 'time', cue: 'Wrist circles and stretches, shoulder circles, scapular push-ups.' }),
  ex('cooldown_walk', 'Cool-down walk', 'mobility', [], { log: 'time', cue: 'Walk until your breathing settles.' }),
  ex('easy_cardio', 'Easy cardio', 'cardio', ['cardio'], { log: 'time', cue: 'Run, cycle, row, swim or walk briskly at a pace where you can still talk.' }),
  ex('long_run', 'Long run', 'cardio', ['cardio'], { log: 'time', cue: 'Easy, conversational pace the whole way. Slow down on hills.' }),
  ex('tempo_run', 'Tempo run', 'cardio', ['cardio'], { log: 'time', cue: 'Comfortably hard: you can say a few words, not hold a conversation.' }),
  ex('run_intervals', 'Running intervals', 'cardio', ['cardio'], { log: 'time', cue: 'Hard but repeatable: the last repetition should look like the first.' }),
  ex('race_pace_run', 'Race-pace running', 'cardio', ['cardio'], { log: 'time', cue: 'The pace you plan to hold in your race. Controlled, not a sprint.' }),
  ex('time_trial', 'Time trial or race', 'cardio', ['cardio'], { log: 'time', cue: 'Warm up well, then run the distance as evenly as you can. Note your time.' }),
  ex('sprints', 'Sprints', 'cardio', ['cardio'], { log: 'time', cue: 'Accelerate hard over 20 to 30 m, then walk back. Full recovery each time.' }),
  ex('jump_rope_rounds', 'Jump rope', 'cardio', ['cardio'], { eq: ['jump_rope'], log: 'time', cue: 'Light, quick bounces on the balls of the feet.' }),
  ex('shadow_boxing', 'Shadow boxing', 'cardio', ['cardio'], { log: 'time', cue: 'Move and punch at round pace: hands up, breathe out on each punch.' }),
  ex('bag_rounds', 'Bag rounds', 'cardio', ['cardio'], { eq: ['heavy_bag'], log: 'time', cue: 'Work in combinations and keep moving. Hands up between punches.' }),
  ex('court_shuffles', 'Court movement drills', 'cardio', ['cardio'], { log: 'time', cue: 'Split step, shuffle, sprint and recover, like a point.' }),
  ex('hip_9090', '90/90 hip switch', 'mobility', [], { log: 'hold', cue: 'Sit with both knees bent at right angles and rotate slowly from side to side.' }),
  ex('couch_stretch', 'Couch stretch', 'mobility', [], { log: 'hold', uni: true, cue: 'Back knee on a cushion, foot up against a wall or sofa, squeeze the glute.' }),
  ex('thoracic_rotation', 'Open book rotation', 'mobility', [], { log: 'hold', uni: true, cue: 'Lie on your side, knees bent, open the top arm and look after it.' }),
  ex('wall_slides', 'Wall slides', 'mobility', [], { log: 'time', cue: 'Back and arms on the wall, slide the arms up without arching your back.' }),
  ex('ankle_rocks', 'Ankle rocks', 'mobility', [], { log: 'time', cue: 'Half kneeling, drive the front knee over the toes with the heel down.' }),
  ex('hamstring_stretch', 'Hamstring stretch', 'mobility', [], { log: 'hold', uni: true, cue: 'Heel on a low step, hinge forward with a flat back until you feel a stretch.' }),
  ex('wrist_care', 'Wrist stretch and strengthening', 'mobility', [], { log: 'time', cue: 'Gentle wrist stretches both ways, then light wrist curls or fist push-up holds.' }),
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const e = byId.get(id);
  if (!e) throw new Error(`Unknown exercise: ${id}`);
  return e;
}

export function findExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

/** Exercises of a ladder in ascending difficulty. */
export function ladderSteps(ladder: string): Exercise[] {
  return EXERCISES.filter((e) => e.ladder === ladder).sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
}

/** The prescription as it should be done: some drills carry their own rep range. */
export function rx(item: Item): Prescription {
  const p = item.prescription;
  const ex = byId.get(item.exerciseId);
  return p.mode === 'reps' && ex?.range ? { ...p, reps: ex.range } : p;
}
