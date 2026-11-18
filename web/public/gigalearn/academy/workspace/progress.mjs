const revision = 2;
const validDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '';
const validScore = (value, max) => Number.isInteger(value) && value >= 0 && value <= max ? value : 0;

export const passingScore = course => Math.ceil(course.quiz.length * 0.8);

export function readProgress(course, state = {}) {
  state = state || {};
  const current = state.revision === revision;
  return {
    revision,
    recipient: typeof state.recipient === 'string' ? state.recipient.trim().slice(0, 100) : '',
    serial: readSerial(state.serial),
    introductorySerial: readSerial(state.introductorySerial),
    done: Array.isArray(state.done)
      ? [...new Set(state.done.filter(i => Number.isInteger(i) && i >= 0 && i < course.lessons.length))]
      : [],
    best: current ? validScore(state.best, course.quiz.length) : 0,
    earned: current ? validDate(state.earned) : '',
    introductoryBest: current ? validScore(state.introductoryBest, 4) : validScore(state.best, 4),
    introductoryEarned: validDate(current ? state.introductoryEarned : state.earned)
  };
}

export function lessonUnlocked(state, index) {
  return state.done.includes(index) || Array.from({ length: index }, (_, i) => i)
    .every(i => state.done.includes(i));
}

export function lessonsComplete(course, state) {
  return course.lessons.every((_, i) => state.done.includes(i));
}

export function eligibleForCertificate(course, state) {
  return lessonsComplete(course, state) && state.best >= passingScore(course);
}

const readSerial = value => typeof value === 'string' && /^GLA-[A-Z]+-[A-F0-9]{24}$/.test(value) ? value : '';

export function createCertificateSerial(courseId, random = globalThis.crypto) {
  const bytes = random.getRandomValues(new Uint8Array(12));
  return 'GLA-' + courseId.toUpperCase() + '-' +
    Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}
