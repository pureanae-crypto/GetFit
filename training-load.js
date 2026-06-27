const DEFAULT_BODYWEIGHT_KG = 65;

const MUSCLE_MAPS = {
  squat: { quadriceps: 0.45, gluteal: 0.35, hamstring: 0.15, core: 0.05 },
  hinge: { hamstring: 0.35, gluteal: 0.3, 'lower-back': 0.25, traps: 0.1 },
  legExtension: { quadriceps: 1 },
  gluteIsolation: { gluteal: 0.85, hamstring: 0.15 },
  verticalPull: { lats: 0.55, biceps: 0.25, rhomboids: 0.15, 'rear-deltoids': 0.05 },
  horizontalPull: { lats: 0.35, rhomboids: 0.3, biceps: 0.2, 'rear-deltoids': 0.15 },
  press: { chest: 0.55, triceps: 0.25, 'front-deltoids': 0.2 },
  shoulderPress: { 'front-deltoids': 0.4, 'side-deltoids': 0.3, triceps: 0.25, traps: 0.05 },
  dip: { chest: 0.45, triceps: 0.35, 'front-deltoids': 0.2 },
  core: { abs: 0.8, obliques: 0.2 },
  plank: { abs: 0.55, obliques: 0.25, 'lower-back': 0.2 },
  hipThrust: { gluteal: 0.7, hamstring: 0.25, quadriceps: 0.05 },
  lunge: { quadriceps: 0.4, gluteal: 0.35, hamstring: 0.2, adductors: 0.05 }
};

export const TRAINING_LOAD_EXERCISES = [
  exercise('Barbell Squat', ['squat', 'back squat'], 'weighted', null, MUSCLE_MAPS.squat, false, ['quadriceps', 'gluteal'], ['hamstring', 'core']),
  exercise('Romanian Deadlift', ['rdl', 'barbell romanian deadlift', 'dumbbell romanian deadlift'], 'weighted', null, MUSCLE_MAPS.hinge, false, ['hamstring', 'gluteal'], ['lower-back']),
  exercise('Leg Extension', ['leg extensions'], 'weighted', null, MUSCLE_MAPS.legExtension, false, ['quadriceps'], []),
  exercise('Cable Kickback', ['single leg cable kickback', 'cable glute kickback', 'kickback'], 'weighted', null, MUSCLE_MAPS.gluteIsolation, true, ['gluteal'], ['hamstring']),
  exercise('Split Squat', ['bulgarian split squat', 'barbell bulgarian split squat', 'dumbbell bulgarian split squat'], 'weighted', null, MUSCLE_MAPS.lunge, true, ['quadriceps', 'gluteal'], ['hamstring']),
  exercise('Pull-up', ['pull up', 'pullup'], 'bodyweight', 0.95, MUSCLE_MAPS.verticalPull, false, ['lats'], ['biceps', 'rhomboids']),
  exercise('Chin-up', ['chin up', 'chinup'], 'bodyweight', 0.95, MUSCLE_MAPS.verticalPull, false, ['lats', 'biceps'], ['rhomboids']),
  exercise('Dip', ['dips'], 'bodyweight', 0.9, MUSCLE_MAPS.dip, false, ['chest', 'triceps'], ['front-deltoids']),
  exercise('Push-up', ['push up', 'pushup'], 'bodyweight', 0.65, MUSCLE_MAPS.press, false, ['chest'], ['triceps', 'front-deltoids']),
  exercise('Hanging Leg Raise', ['hanging leg raises'], 'bodyweight', 0.25, MUSCLE_MAPS.core, false, ['abs'], ['obliques']),
  exercise('Leg Raise', ['leg raises'], 'bodyweight', 0.25, MUSCLE_MAPS.core, false, ['abs'], ['obliques']),
  exercise('Plank', ['front plank'], 'bodyweight', 0.2, MUSCLE_MAPS.plank, false, ['abs'], ['obliques', 'lower-back']),
  exercise('Sit-up', ['sit up', 'situp'], 'bodyweight', 0.35, MUSCLE_MAPS.core, false, ['abs'], ['obliques']),
  exercise('Bench Press', ['barbell bench press', 'dumbbell bench press'], 'weighted', null, MUSCLE_MAPS.press, false, ['chest'], ['triceps', 'front-deltoids']),
  exercise('Shoulder Press', ['overhead press', 'dumbbell shoulder press', 'machine shoulder press'], 'weighted', null, MUSCLE_MAPS.shoulderPress, false, ['front-deltoids', 'side-deltoids'], ['triceps']),
  exercise('Lat Pulldown', ['lat pulldown', 'pulldown'], 'weighted', null, MUSCLE_MAPS.verticalPull, false, ['lats'], ['biceps']),
  exercise('Row', ['seated cable row', 'bent over row', 'barbell row', 't-bar row', 'single arm dumbbell row', 'smith machine row'], 'weighted', null, MUSCLE_MAPS.horizontalPull, false, ['lats', 'rhomboids'], ['biceps', 'rear-deltoids']),
  exercise('Hip Thrust', ['hip thrust', 'barbell hip thrust'], 'weighted', null, MUSCLE_MAPS.hipThrust, false, ['gluteal'], ['hamstring']),
  exercise('Deadlift', ['conventional deadlift', 'sumo deadlift'], 'weighted', null, MUSCLE_MAPS.hinge, false, ['lower-back', 'gluteal', 'hamstring'], ['traps']),
  exercise('Lunge', ['walking lunge', 'reverse lunge'], 'weighted', null, MUSCLE_MAPS.lunge, true, ['quadriceps', 'gluteal'], ['hamstring']),
  exercise('Bodyweight Squat', ['air squat'], 'bodyweight', 0.65, MUSCLE_MAPS.squat, false, ['quadriceps', 'gluteal'], ['hamstring', 'core'])
];

export const unmappedExercises = [];

const mappingByName = new Map();
TRAINING_LOAD_EXERCISES.forEach(item => {
  [item.canonicalName, ...item.aliases].forEach(name => mappingByName.set(normalizeName(name), item));
});

function exercise(canonicalName, aliases, type, bodyweightFactor, muscleMap, unilateral, primaryMuscles, secondaryMuscles) {
  return { canonicalName, aliases, type, bodyweightFactor, muscleMap, unilateral, primaryMuscles, secondaryMuscles };
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[-_/]/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseSets(exerciseData) {
  if (Array.isArray(exerciseData?.sets)) {
    return exerciseData.sets.map(set => ({
      weight: Number(set.weight) || 0,
      reps: Number.parseInt(set.reps, 10) || 0,
      sets: Number(set.sets) || 1,
      side: set.side || set.limb || null
    })).filter(set => set.reps > 0 || set.weight > 0);
  }
  const count = Number.parseInt(exerciseData?.sets, 10) || 0;
  const reps = Number.parseInt(exerciseData?.reps, 10) || 0;
  const weight = Number(exerciseData?.weight) || 0;
  return count && reps ? [{ weight, reps, sets: count, side: null }] : [];
}

function inferFallbackMapping(exerciseData) {
  const name = normalizeName(exerciseData?.name);
  const dbMuscles = Array.isArray(exerciseData?.muscles) ? exerciseData.muscles : [];
  const weightedByData = parseSets(exerciseData).some(set => set.weight > 0);
  let type = weightedByData ? 'weighted' : 'bodyweight';
  let bodyweightFactor = weightedByData ? null : 0.4;
  let muscleMap = dbMuscles.length ? evenMap(dbMuscles) : { abs: 1 };
  let primaryMuscles = dbMuscles.slice(0, 2);
  let secondaryMuscles = dbMuscles.slice(2);
  let unilateral = /\b(single|one arm|one leg|split|lunge|kickback|step up)\b/.test(name);

  if (/\b(treadmill|elliptical|rower|rowing machine|stair|stepper|bike|cycle|cardio)\b/.test(name) || exerciseData?.cardio) {
    type = 'cardio';
    bodyweightFactor = null;
    muscleMap = {};
    primaryMuscles = [];
    secondaryMuscles = [];
  } else if (/\b(push up|pull up|chin up|dip|plank|sit up|crunch|leg raise|squat)\b/.test(name) && !weightedByData) {
    type = 'bodyweight';
    bodyweightFactor = /\bplank\b/.test(name) ? 0.2 : 0.5;
  } else if (/\b(row|press|curl|extension|pulldown|deadlift|thrust|raise|machine|cable|barbell|dumbbell)\b/.test(name)) {
    type = 'weighted';
    bodyweightFactor = null;
  }

  return {
    canonicalName: exerciseData?.name || 'Unmapped exercise',
    aliases: [],
    type,
    bodyweightFactor,
    muscleMap,
    unilateral,
    primaryMuscles,
    secondaryMuscles,
    inferred: true
  };
}

function evenMap(muscles) {
  const unique = [...new Set(muscles.filter(Boolean))];
  if (!unique.length) return {};
  const share = 1 / unique.length;
  return unique.reduce((acc, muscle) => ({ ...acc, [muscle]: share }), {});
}

function trackUnmapped(exerciseData, fallback) {
  const name = exerciseData?.name || 'Unnamed exercise';
  if (!unmappedExercises.some(item => normalizeName(item.name) === normalizeName(name))) {
    unmappedExercises.push({
      name,
      inferredType: fallback.type,
      suggestedPrimaryMuscles: fallback.primaryMuscles,
      suggestedSecondaryMuscles: fallback.secondaryMuscles
    });
    console.warn('[TrainingLoadEngine] Unmapped exercise inferred for review:', name, fallback);
  }
}

export function resolveExerciseMapping(exerciseData) {
  const mapped = mappingByName.get(normalizeName(exerciseData?.name));
  if (mapped) return mapped;
  const fallback = inferFallbackMapping(exerciseData);
  if (fallback.type !== 'cardio') trackUnmapped(exerciseData, fallback);
  return fallback;
}

export function calculateExerciseTrainingLoad(exerciseData, options = {}) {
  const mapping = resolveExerciseMapping(exerciseData);
  if (mapping.type === 'cardio') {
    const cardio = calculateCardioEffort(exerciseData, mapping);
    if (exerciseData?.conditioning === true) {
      cardio.muscleLoad = distributeLoad(cardio.cardioEffort, evenMap(exerciseData.muscles || []));
    }
    return cardio;
  }

  const bodyweightKg = Number(options.bodyweightKg) || DEFAULT_BODYWEIGHT_KG;
  const sets = parseSets(exerciseData);
  const load = sets.reduce((sum, set) => {
    const bodyweightLoad = mapping.bodyweightFactor ? bodyweightKg * mapping.bodyweightFactor : 0;
    return sum + (set.weight + bodyweightLoad) * set.reps * set.sets;
  }, 0);
  const muscleLoad = distributeLoad(load, mapping.muscleMap);

  return {
    kind: 'strength',
    exerciseName: exerciseData?.name || mapping.canonicalName,
    canonicalName: mapping.canonicalName,
    type: mapping.type,
    unilateral: Boolean(mapping.unilateral),
    load,
    muscleLoad,
    primaryMuscles: mapping.primaryMuscles,
    secondaryMuscles: mapping.secondaryMuscles,
    mapped: !mapping.inferred
  };
}

function distributeLoad(load, muscleMap) {
  return Object.entries(muscleMap || {}).reduce((acc, [muscle, share]) => {
    acc[muscle] = load * (Number(share) || 0);
    return acc;
  }, {});
}

function calculateCardioEffort(exerciseData, mapping) {
  const duration = Number(exerciseData.time) || Number(exerciseData.duration) || 0;
  const intensity = Number(exerciseData.level) || Number(exerciseData.speed) || Number(exerciseData.elevation) || 1;
  return {
    kind: 'cardio',
    exerciseName: exerciseData?.name || mapping.canonicalName,
    canonicalName: mapping.canonicalName,
    type: 'cardio',
    duration,
    intensity,
    cardioEffort: duration * Math.max(1, intensity),
    load: 0,
    muscleLoad: {},
    primaryMuscles: [],
    secondaryMuscles: [],
    mapped: !mapping.inferred
  };
}

export function calculateSessionTrainingLoad(session, options = {}) {
  const exercises = session?.exercises || [];
  return exercises.reduce((acc, exerciseData) => {
    const result = calculateExerciseTrainingLoad(exerciseData, options);
    if (result.kind === 'cardio') {
      acc.cardioEffort += result.cardioEffort;
      acc.cardio.push(result);
      Object.entries(result.muscleLoad).forEach(([muscle, value]) => {
        acc.muscleLoad[muscle] = (acc.muscleLoad[muscle] || 0) + value;
      });
      return acc;
    }
    acc.totalLoad += result.load;
    Object.entries(result.muscleLoad).forEach(([muscle, value]) => {
      acc.muscleLoad[muscle] = (acc.muscleLoad[muscle] || 0) + value;
    });
    acc.strength.push(result);
    return acc;
  }, { totalLoad: 0, muscleLoad: {}, cardioEffort: 0, strength: [], cardio: [] });
}
