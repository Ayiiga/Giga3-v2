// Public discovery uses the same curriculum as the learning workspace.
import courses from '../../public/gigalearn/academy/workspace/courses.mjs';
const slugs = {
  ai: 'ai-machine-learning', web: 'website-pwa-development',
  mobile: 'mobile-app-development', robotics: 'robotics-intelligent-systems',
  digital: 'other-digital-technologies', teaching: 'teacher-lesson-studio-basics',
};
export const academyCourses = courses.map(course => ({
  id: course.id, slug: slugs[course.id], name: course.name,
  summary: course.summary, project: course.project,
  href: `/gigalearn/academy/courses/${slugs[course.id]}/`,
  startHref: `/gigalearn/academy/workspace/?view=course/${course.id}`,
  lessons: course.lessons.map(lesson => ({ title: String(lesson[0]), summary: String(lesson[1]), activity: String(lesson[3]) })),
}));
export function courseSchema(course, origin = 'https://www.giga3ai.com') {
  return {
    '@type': 'Course', name: course.name, description: course.summary,
    url: origin + course.href,
    provider: { '@type': 'Organization', name: 'GigaLearn Academy', url: origin + '/gigalearn/academy/' },
  };
}
