import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { academyCourses, courseSchema } from '../../web/lib/seo/academyCourses.mjs';
import workspaceCourses from '../../web/public/gigalearn/academy/workspace/courses.mjs';
import { AcademyCourseDirectory } from '../../web/components/seo/AcademyCourseDirectory';
import CoursePage, { generateMetadata, generateStaticParams } from '../../web/app/(marketing)/gigalearn/academy/courses/[slug]/page';

describe('public Academy discovery without client JavaScript', () => {
  it('renders six crawlable course links with matching structured data', () => {
    const html = renderToStaticMarkup(<AcademyCourseDirectory />);
    const data = JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)![1]);
    expect(data.itemListElement).toHaveLength(6);
    expect(new Set(academyCourses.map(c => c.href)).size).toBe(6);
    for (const course of academyCourses) {
      expect(html).toContain(`href="${course.href}"`);
      expect(data.itemListElement.find(e => e.item.name === course.name).item).toEqual(courseSchema(course));
    }
  });
  it('exports every public course with real curriculum content, a canonical URL and a working start path', () => {
    expect(generateStaticParams()).toHaveLength(6);
    for (const course of academyCourses) {
      const html = renderToStaticMarkup(<CoursePage params={{ slug: course.slug }} />);
      expect(html.match(/<h1[ >]/g)).toHaveLength(1);
      expect(html.match(/<li /g)).toHaveLength(10);
      expect(html).toContain(`href="${course.startHref}"`);
      const source = workspaceCourses.find(c => c.id === course.id)!;
      expect(course.lessons.map(l => l.title)).toEqual(source.lessons.map(l => l[0]));
      expect(new URL(String(generateMetadata({ params: { slug: course.slug } }).alternates?.canonical), "https://www.giga3ai.com").href).toBe(`https://www.giga3ai.com${course.href}`);
      expect(html).toContain('not an accredited qualification');
      expect(html).not.toContain('Teacher Promotion Practice');
    }
  });
  it('links awards across shared product navigation and includes course routes in sitemap generation', () => {
    const navigation = readFileSync('web/lib/seo/productLinks.ts', 'utf8');
    expect(navigation.match(/href: "\/gigasocial\/awards\/"/g)).toHaveLength(2);
    expect(readFileSync('web/scripts/generate-public-seo-sitemap.mjs', 'utf8')).toContain('...academyCourses.map(course => course.href)');
    const awards = readFileSync('web/app/(marketing)/gigasocial/awards/page.tsx', 'utf8');
    expect(awards).toContain('<JsonLd faq={awardsFaq} />');
    expect(awards).toContain('awardsFaq.map');
    expect(awards).toContain('pending confirmation');
    const workspace = readFileSync('web/public/gigalearn/academy/workspace/index.html', 'utf8');
    expect(workspace).toContain('property="og:image"');
    expect(workspace).toContain('application/ld+json');
    expect(workspace).toContain('href="/gigalearn/academy/courses/"');
    expect(readFileSync('web/scripts/generate-public-seo-sitemap.mjs', 'utf8')).toContain('"GigaSocial Awards": "gigasocial-awards"');
  });
});
