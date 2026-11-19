// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import courses from '../../web/public/gigalearn/academy/workspace/courses.mjs';
import aiGuides, { aiTools, promptParts } from '../../web/public/gigalearn/academy/workspace/ai-lesson-guides.mjs';
import aiExamples from '../../web/public/gigalearn/academy/workspace/ai-examples.mjs';
import * as progress from '../../web/public/gigalearn/academy/workspace/progress.mjs';
import { getAcademyProjectTrack } from '../../web/lib/gigalearn/academy/projectTracks';
import { listBuiltinAcademyCourses } from '../../web/lib/gigalearn/academy/courseCatalog';

const root = resolve(__dirname, '../../web/public/gigalearn/academy/workspace');
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');
const key = 'gigalearn-academy-progress-v1';
const source = read('app.mjs').replace(/^import .*;\n/gm, '')
  .replace("window.addEventListener('hashchange',()=>{render();main.focus({preventScroll:true});window.scrollTo(0,0);});", '');
const names = ['aiGuides', 'aiTools', 'promptParts', 'createCertificateImage', 'courses', 'aiExamples', ...Object.keys(progress)];
const values = [aiGuides, aiTools, promptParts, ()=>'data:image/png;base64,preview', courses, aiExamples, ...Object.values(progress)];
function mount(id: string) {
  document.body.innerHTML = read('index.html').replace(/<link[^>]*>/g, '').replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
  window.history.replaceState(null, '', `/?view=course/${id}`);
  new Function(...names, source)(...values);
}
function clickCheck(course: any, lessonIndex: number, correct = true) {
  for (const [i, question] of course.guides[lessonIndex].checks.entries()) {
    const answer = correct ? question[2] : (question[2] + 1) % question[1].length;
    const input = document.querySelector<HTMLInputElement>(`input[name="lesson-${lessonIndex}-check-${i}"][value="${answer}"]`)!;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
function submitProject(scores = [2, 2, 1, 1, 1]) {
  document.querySelector<HTMLTextAreaElement>('#project-evidence')!.value = 'I built and tested a complete project, recorded the expected and actual results and retained source files and an accessible demonstration for review.';
  document.querySelector<HTMLTextAreaElement>('#project-reflection')!.value = 'I corrected a confusing control after testing and will improve the explanation and repeat the same test to verify the result.';
  scores.forEach((score, i)=>{ document.querySelector<HTMLSelectElement>(`#project-score-${i}`)!.value=String(score); });
  document.querySelector('#project-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
beforeEach(()=>{
  (window as any).happyDOM.settings.disableCSSFileLoading = true;
  (window as any).happyDOM.settings.disableIframePageLoading = true;
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async()=>new Response('starter source')));
});
afterEach(()=>{ vi.unstubAllGlobals(); document.body.innerHTML=''; });

describe('practical Academy learning journeys', ()=>{
  it('makes the requested digital and teaching tracks discoverable alongside the four developer tracks', ()=>{
    const catalogue = listBuiltinAcademyCourses();
    for (const [slug, id] of [['teacher-lesson-studio-basics','teaching'],['other-digital-technologies','digital']]) {
      expect(catalogue.some(course=>course.slug===slug)).toBe(true);
      expect(getAcademyProjectTrack(slug)?.href).toContain(`course/${id}`);
    }
    expect(catalogue.some(course=>course.category==='Exam prep')).toBe(false);
  });
  it.each(['web','mobile','robotics','digital','teaching'])('%s requires passing each lesson check, then a project, then the final quiz', id=>{
    const course = courses.find(course=>course.id===id)!;
    mount(id);
    const second = document.querySelector<HTMLDetailsElement>('[data-step="1"]')!;
    expect(second.querySelector<HTMLElement>('.lesson-content')!.hidden).toBe(true);
    const firstButton = document.querySelector<HTMLButtonElement>('[data-lesson="0"]')!;
    expect(firstButton.disabled).toBe(true);
    clickCheck(course, 0, false);
    expect(document.querySelector('#lesson-feedback-0-0')!.textContent).toContain('Incorrect.');
    expect(firstButton.disabled).toBe(true);
    clickCheck(course, 0);
    expect(document.querySelector('#lesson-feedback-0-0')!.textContent).toContain('Correct.');
    expect(firstButton.disabled).toBe(false);
    firstButton.click();
    expect(second.querySelector<HTMLElement>('.lesson-content')!.hidden).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('[data-lesson="1"]')!.disabled).toBe(true);
    // Saved scores and sequence survive a reload.
    mount(id);
    expect(document.querySelector<HTMLButtonElement>('[data-lesson="0"]')!.textContent).toBe('Lesson complete');
    for (let i=1;i<course.lessons.length;i++) {
      clickCheck(course,i);
      document.querySelector<HTMLButtonElement>(`[data-lesson="${i}"]`)!.click();
    }
    expect(document.querySelector<HTMLFormElement>('#project-form')!.hidden).toBe(false);
    expect(document.querySelector<HTMLFormElement>('#quiz')!.hidden).toBe(true);
    submitProject([1,1,1,1,1]);
    expect(document.querySelector<HTMLFormElement>('#quiz')!.hidden).toBe(true);
    submitProject();
    expect(document.querySelector<HTMLFormElement>('#quiz')!.hidden).toBe(false);
    for (const [i, question] of course.quiz.entries()) {
      const input = document.querySelector<HTMLInputElement>(`input[name="q${i}"][value="${question[2]}"]`)!;
      input.checked=true;
      input.dispatchEvent(new Event('change', {bubbles:true}));
      expect(document.querySelector(`#feedback-${i}`)!.textContent).toContain('Correct.');
    }
    document.querySelector('#quiz')!.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
    const saved = JSON.parse(localStorage.getItem(key)!)[id];
    expect(saved.best).toBe(10);
    expect(saved.earned).toBeTruthy();
    expect(progress.eligibleForCertificate(course, progress.readProgress(course,saved))).toBe(true);
    mount(id);
    expect(document.querySelector<HTMLFormElement>('#quiz')!.hidden).toBe(false);
    expect(document.querySelector('#project-status')!.textContent).toContain('Self-assessment saved');
    expect(document.querySelector('a[href="#certificates"]')).toBeTruthy();
  });
  it('does not mark a lesson complete through a synthetic click before passing its check', ()=>{
    mount('web');
    document.querySelector('[data-lesson="0"]')!.dispatchEvent(new Event('click', {bubbles:true}));
    expect(localStorage.getItem(key)).toBeNull();
  });
  it('preserves previously earned certificate eligibility without fabricating a new project submission', ()=>{
    const course=courses.find(course=>course.id==='mobile')!;
    const old={revision:2,done:course.lessons.map((_,i)=>i),best:8,earned:'2026-11-18T10:00:00.000Z'};
    const migrated=progress.readProgress(course,old);
    expect(migrated.project).toBeNull();
    expect(migrated.projectGrandfathered).toBe(true);
    expect(progress.eligibleForCertificate(course,migrated)).toBe(true);
    expect(progress.readProgress(course,migrated)).toEqual(migrated);
  });
  it('demonstrates hysteresis and safe fault behaviour in the robotics lab', ()=>{
    mount('robotics');
    const slider=document.querySelector<HTMLInputElement>('#soil-moisture')!;
    const set=(value:number)=>{slider.value=String(value);slider.dispatchEvent(new Event('input'));};
    const status=()=>document.querySelector('#soil-status')!.textContent;
    set(29); expect(status()).toContain('alert ON');
    set(35); expect(status()).toContain('alert ON');
    set(41); expect(status()).toContain('Alert OFF');
    set(35); expect(status()).toContain('Alert OFF');
    const fault=document.querySelector<HTMLInputElement>('#soil-fault')!;
    fault.checked=true; fault.dispatchEvent(new Event('change'));
    expect(status()).toContain('Fault:');
    expect(status()).toContain('Output off');
  });
  it('provides actual HTML, manifest, worker and correctly sized icons for the starter download', ()=>{
    expect(read('projects/study-hub/index.html')).toContain('name="robots" content="noindex,follow"');
    expect(read('projects/soil-alert.html')).toContain('name="robots" content="noindex,follow"');
    for (const page of ['projects/study-hub/index.html', 'projects/soil-alert.html']) {
      expect(read(page)).toMatch(/<meta name="description" content="[^"]+"/);
      expect(read(page)).toMatch(/<link rel="canonical" href="https:\/\/www\.giga3ai\.com\/gigalearn\/academy\/workspace\/projects\/[^"]+"/);
    }
    const manifest=JSON.parse(read('projects/study-hub/manifest.webmanifest'));
    for(const icon of manifest.icons) {
      const bytes=readFileSync(resolve(root,'projects/study-hub',icon.src));
      const size=Number(icon.sizes.split('x')[0]);
      expect(bytes.readUInt32BE(16)).toBe(size);
      expect(bytes.readUInt32BE(20)).toBe(size);
    }
    mount('web');
    expect(document.querySelector('a[download][href="projects/study-hub.zip"]')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
    document.querySelector<HTMLButtonElement>('#study-hub-preview-start')!.click();
    expect(document.querySelector('#study-hub-preview-message')!.textContent).toContain('journey has begun');
    expect(read('projects/study-hub/sw.js')).toContain("key.startsWith('gigalearn-study-hub-')");
    expect(read('projects/study-hub/README.txt')).toContain('localhost');
  });
});
