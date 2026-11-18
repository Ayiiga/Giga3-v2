const revision = 2;
const validDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '';
const validScore = (value, max) => Number.isInteger(value) && value >= 0 && value <= max ? value : 0;

export const passingScore = course => Math.ceil(course.quiz.length * 0.8);

export function readProgress(course, state = {}) {
  state = state || {};
  const current = state.revision === revision;
  return {
    revision,
    introCheckScore: validScore(state.introCheckScore, 8),
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

const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeSerial(value) {
  let encoded = '';
  for (let index = 0; index < 12; index++) {
    encoded = alphabet[Number(value & 31n)] + encoded;
    value >>= 5n;
  }
  return encoded;
}

function readSerial(value) {
  if (typeof value !== 'string') return '';
  if (/^GLA-[A-Z]+-[0-9A-HJKMNP-TV-Z]{12}$/.test(value)) return value;
  const legacy = /^(GLA-[A-Z]+-)([A-F0-9]{15})[A-F0-9]{9}$/.exec(value);
  return legacy ? legacy[1] + encodeSerial(BigInt('0x' + legacy[2])) : '';
}

export function createCertificateSerial(courseId, random = globalThis.crypto) {
  const bytes = random.getRandomValues(new Uint8Array(8));
  const entropy = bytes.reduce((value, byte) => (value << 8n) | BigInt(byte), 0n);
  return 'GLA-' + courseId.toUpperCase() + '-' + encodeSerial(entropy);
}
