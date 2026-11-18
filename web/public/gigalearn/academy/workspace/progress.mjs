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
    lessonCheckScores: Object.fromEntries(Object.entries(state.lessonCheckScores || {})
      .filter(([index]) => /^\d+$/.test(index) && Number(index) < course.lessons.length)
      .map(([index, score]) => [index, validScore(score, course.guides?.[Number(index)]?.checks?.length || 8)])),
    project: readProject(state.project),
    projectGrandfathered: state.projectGrandfathered === true || Boolean(current && validDate(state.earned) && !state.project),
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
  return lessonsComplete(course, state) && state.best >= passingScore(course) && projectComplete(course, state);
}

const projectCriteria = ['Planning and purpose', 'Implementation and useful output', 'Testing and evidence', 'Safety and accessibility', 'Explanation and reflection'];
export { projectCriteria };
function readProject(project) {
  if (!project || typeof project !== 'object') return null;
  return {
    evidence: typeof project.evidence === 'string' ? project.evidence.trim().slice(0, 6000) : '',
    reflection: typeof project.reflection === 'string' ? project.reflection.trim().slice(0, 3000) : '',
    scores: Array.isArray(project.scores) && project.scores.length === 5
      ? project.scores.map(value => validScore(value, 2)) : [],
    submitted: validDate(project.submitted),
  };
}
export function projectComplete(course, state) {
  if (!course.project || state.projectGrandfathered === true) return true;
  const project = readProject(state.project);
  return Boolean(project && project.submitted && project.evidence.length >= 80 && project.reflection.length >= 40 &&
    project.scores.length === 5 && project.scores.reduce((a, b) => a + b, 0) >= 7);
}
export function lessonCheckPassed(course, state, index) {
  const checks = course.guides?.[index]?.checks;
  if (checks?.length) return (state.lessonCheckScores?.[index] || 0) >= Math.ceil(checks.length * 0.75);
  if (course.id === 'ai' && index === 0) return (state.introCheckScore || 0) >= 6;
  return true;
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
