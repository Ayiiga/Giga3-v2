const revision = 2;
const validDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '';
const validScore = (value, max) => Number.isInteger(value) && value >= 0 && value <= max ? value : 0;

export const passingScore = course => Math.ceil(course.quiz.length * 0.8);

export function readProgress(course, state = {}) {
  state = state || {};
  const current = state.revision === revision;
  return {
    revision,
    done: Array.isArray(state.done)
      ? [...new Set(state.done.filter(i => Number.isInteger(i) && i >= 0 && i < course.lessons.length))]
      : [],
    best: current ? validScore(state.best, course.quiz.length) : 0,
    earned: current ? validDate(state.earned) : '',
    introductoryBest: current ? validScore(state.introductoryBest, 4) : validScore(state.best, 4),
    introductoryEarned: validDate(current ? state.introductoryEarned : state.earned)
  };
}

export function eligibleForCertificate(course, state) {
  return state.done.length === course.lessons.length && state.best >= passingScore(course);
}
