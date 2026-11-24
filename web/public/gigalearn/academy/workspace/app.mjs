import aiGuides, { aiTools, promptParts } from './ai-lesson-guides.mjs?v=114';
import { createCertificateImage } from './certificate-image.mjs?v=112';
import courses from './courses.mjs?v=114';
import aiExamples from './ai-examples.mjs?v=114';
import { createCertificateSerial, eligibleForCertificate, lessonUnlocked, lessonsComplete, passingScore, readProgress, projectComplete, projectCriteria, lessonCheckPassed } from './progress.mjs?v=114';
// Older cached workspace documents may still point to the unversioned stylesheet.
const legacyStylesheet = document.querySelector('link[rel="stylesheet"][href="style.css"]');
if (legacyStylesheet) legacyStylesheet.href = 'style.css?v=125';

const main = document.querySelector('main');
const dialog = document.querySelector('#detail');
const paths = {
  cap:'M2 9l10-5 10 5-10 5-10-5zm4 2v5c3 3 9 3 12 0v-5m4-2v6',
  grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  book:'M12 6c-3-3-6-3-10-2v14c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 2zm0 0v14',
  chart:'M3 3v18h18M7 16v-4m5 4V8m5 8V5',
  award:'M12 2a7 7 0 1 0 0 14 7 7 0 1 0 0-14zm-4 13-2 7 6-3 6 3-2-7',
  external:'M13 4h7v7m0-7-9 9m7 1v6H4V6h6',
  arrow:'M4 12h15m-6-6 6 6-6 6', back:'M20 12H5m6-6-6 6 6 6',
  spark:'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z',
  web:'M3 4h18v16H3zm0 5h18m-10 3-3 2 3 2m3-4 3 2-3 2',
  phone:'M7 2h10v20H7zm4 16h2',
  robot:'M5 8h14v11H5zm7 0V4m-3 9h.01m6 0h.01M9 16h6M2 11v5m20-5v5',
  chip:'M6 6h12v12H6zm4 4h4v4h-4zm-1-8v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',
  search:'M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14zm5 12 5 5',
  check:'M4 12l5 5L20 6', lock:'M5 10h14v11H5zm3 0V7a4 4 0 1 1 8 0v3',
  close:'m5 5 14 14M19 5 5 19'
};
const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const badge = (symbol, color='purple') => '<span class="badge '+color+'">'+icon(symbol)+'</span>';
const key = 'gigalearn-academy-progress-v1';
let saved = {};
let storageAvailable = true;
try {
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  if (data && typeof data === 'object' && !Array.isArray(data)) saved = data;
} catch {
  // Corrupt or unavailable storage must not prevent opening lessons.
}
function record(course) {
  return readProgress(course, saved[course.id]);
}
function save(course, state) {
  if (!state.earned && eligibleForCertificate(course,state)) state.earned = new Date().toISOString();
  saved[course.id] = state;
  try { localStorage.setItem(key, JSON.stringify(saved)); }
  catch { storageAvailable = false; }
  document.querySelector('footer span:last-child').textContent = storageAvailable
    ? 'Progress is saved in this browser.' : 'Storage is unavailable. Progress lasts until you reload.';
}
const list = entries => '<ol>'+entries.map(entry => '<li>'+esc(entry)+'</li>').join('')+'</ol>';
const button = (label, href, primary=false) => '<a class="btn'+(primary?' primary':'')+'" href="'+href+'">'+label+icon('arrow')+'</a>';
const head = (label,title,desc) => '<div class="pagehead"><p class="eyebrow">'+label+'</p><h1>'+title+'</h1><p>'+desc+'</p></div>';
const art = '<svg class="hero-art" viewBox="0 0 400 320" aria-hidden="true"><g fill="none" stroke="#b58bf1" stroke-opacity=".42"><circle cx="244" cy="163" r="140"/><circle cx="244" cy="163" r="110"/><circle cx="244" cy="163" r="78"/><ellipse cx="244" cy="163" rx="172" ry="60" transform="rotate(-33 244 163)"/><path d="M244 8v306M91 163h306" stroke-dasharray="3 7"/></g><g transform="translate(244 163) rotate(-10)"><rect x="-54" y="-53" width="108" height="106" rx="22" fill="#a278e2" fill-opacity=".27" stroke="#e0c7ff" stroke-opacity=".65"/><path d="M-35 -11 0 -29 35 -11 0 7-35-11Zm12 7v18q23 21 46 0V-4m12-7v21" stroke="#f0dcff" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/></g><g fill="#dfc2ff"><circle cx="359" cy="81" r="5"/><circle cx="107" cy="224" r="4"/><circle cx="306" cy="258" r="4"/><path d="M156 59v16m-8-8h16M338 199v18m-9-9h18" stroke="#e6ceff" stroke-width="2"/></g></svg>';
function catalog(materials=false) {
  const completed = courses.reduce((sum, course) => sum + record(course).done.length, 0);
  const totalLessons = courses.reduce((sum, course) => sum + course.lessons.length, 0);
  const inProgress = courses.find(course => record(course).done.length && !record(course).earned);
  const stats = [['grid',courses.length,'Course tracks'],['check',completed+' / '+totalLessons,'Lessons complete'],['award',courses.reduce((count,course)=>{const state=record(course);return count+Number(Boolean(state.earned))+Number(Boolean(state.introductoryEarned));},0),'Certificates earned']];
  main.innerHTML = (materials ? head('RESOURCE LIBRARY','Learning materials','View every resource for free. Download and print access is reserved for verified Giga3 Hub subscribers.') :
    '<section class="hero"><div class="hero-text"><p class="eyebrow">GIGA3 HUB / LEARNING WORKSPACE</p><h1>GigaLearn Academy</h1><p>Build practical skills in six focused tracks. Learn step by step, put it into practice, and track your progress.</p>'+
    button(inProgress?'Continue learning':'Browse courses',inProgress?'#course/'+inProgress.id:'#courses',false).replace('class="btn"', 'class="btn" id="hero-action"')+
    '</div>'+art+'</section><section class="stats" aria-label="Your academy at a glance">'+stats.map(([i,v,l])=>'<div class="stat">'+badge(i)+'<div><strong>'+v+'</strong><small>'+l+'</small></div></div>').join('')+
    '</section><h2 class="section-title">Explore courses</h2><p class="section-subtitle">Choose a track and work at your own pace.</p>')+
    '<div class="filters"><label class="search">'+icon('search')+'<input type="search" aria-label="Search '+(materials?'learning materials':'courses')+'" placeholder="Search '+(materials?'materials':'courses')+'…"></label>'+
    '<select aria-label="Filter by track"><option value="">All tracks</option>'+courses.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></div>'+
    '<p class="count" aria-live="polite"></p><section class="grid" aria-label="'+(materials?'Learning materials':'Course tracks')+'"></section>';
  const search = main.querySelector('input');
  const filter = main.querySelector('select');
  const grid = main.querySelector('.grid');
  function update() {
    const terms = search.value.trim().toLowerCase().split(/\s+/);
    const found = courses.filter(c => (!filter.value || c.id===filter.value) &&
      terms.every(term => (materials ? [c.name,...c.material].flat().join(' ') : [c.name,c.field,c.summary,...c.lessons.map(l=>l[0])].join(' ')).toLowerCase().includes(term)));
    const noun = materials ? 'material' : 'course';
    main.querySelector('.count').textContent = found.length+' '+noun+(found.length===1?'':'s');
    grid.innerHTML = found.map(c=>'<article class="card '+c.color+'">'+badge(c.icon,c.color)+
      '<p class="eyebrow">'+(materials?c.name.toUpperCase():c.field)+'</p><h3>'+(materials?c.material[0]:c.name)+'</h3><p>'+(materials?c.material[1]+' · Free to view':c.summary)+'</p>'+
      '<div class="meta">'+(materials?'Subscriber download and print':c.lessons.length+' lessons · '+(record(c).done.length?record(c).done.length+' completed':'1 assessment'))+'</div>'+
      (materials?'<button class="btn" type="button" data-material="'+c.id+'">View material'+icon('arrow')+'</button>':button('Open course','#course/'+c.id))+'</article>').join('') ||
      '<p>No '+noun+'s match. Try another search or track.</p>';
  }
  search.addEventListener('input',update);
  filter.addEventListener('change',update);
  if (!materials && !inProgress) main.querySelector('#hero-action').addEventListener('click',event=>{
    event.preventDefault();
    search.focus();
  });
  update();
}
const workspacePath = '/gigalearn/academy/workspace/';
function sessionToken() {
  try { return localStorage.getItem('giga3_session_token')?.trim(); }
  catch { return null; }
}
function materialRequest(action, token, course) {
  return fetch('/api/academy-material', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, course: course.id }),
    signal: AbortSignal.timeout(12000)
  });
}
function setExportStatus(panel, enabled, message, link) {
  for (const button of panel.querySelectorAll('[data-export]')) button.disabled = !enabled;
  panel.querySelector('.notice').textContent = message;
  const action = panel.querySelector('[data-access-link]');
  action.hidden = !link;
  if (link) {
    action.href = link[0];
    action.textContent = link[1];
  }
}
const signIn = ['/chat/login/', 'Sign in to Giga3 Hub'];
const plans = ['/pricing/', 'View Giga3 Hub plans'];
function setExportFailure(panel, status) {
  if (status === 401) setExportStatus(panel, false, 'Sign in to verify your subscription.', signIn);
  else if (status === 403) setExportStatus(panel, false, 'An active Giga3 Hub subscription is required to download or print.', plans);
  else {
    setExportStatus(panel, false, 'Subscription verification is temporarily unavailable.');
    panel.querySelector('[data-retry]').hidden = false;
  }
}
async function verifyMaterialAccess(panel, course) {
  panel.querySelector('[data-retry]').hidden = true;
  const token = sessionToken();
  if (!token) return setExportFailure(panel, 401);
  setExportStatus(panel, false, 'Checking your Giga3 Hub subscription…');
  try {
    const response = await materialRequest('access', token, course);
    if (response.status !== 204) return setExportFailure(panel, response.status);
    if (token !== sessionToken()) return setExportFailure(panel, 401);
    setExportStatus(panel, true, 'Your subscription includes downloads and printing.');
  } catch { setExportFailure(panel); }
}
async function exportMaterial(panel, course, action) {
  const token = sessionToken();
  if (!token) return setExportFailure(panel, 401);
  setExportStatus(panel, false, 'Preparing your worksheet…');
  try {
    const response = await materialRequest(action, token, course);
    if (!response.ok || response.status !== 200) return setExportFailure(panel, response.status);
    const worksheet = await response.text();
    if (!panel.isConnected || !dialog.open) return;
    if (token !== sessionToken()) return setExportFailure(panel, 401);
    if (action === 'print') {
      const printable = document.querySelector('#print-material');
      printable.textContent = worksheet;
      document.body.classList.add('print-authorized-material');
      try { window.print(); }
      finally {
        document.body.classList.remove('print-authorized-material');
        printable.textContent = '';
      }
    } else {
      const href = URL.createObjectURL(new Blob([worksheet], {type: 'text/plain;charset=utf-8'}));
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = 'gigalearn-'+course.id+'-worksheet.txt';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(href), 30000);
    }
    setExportStatus(panel, true, 'Your subscription includes downloads and printing.');
  } catch { setExportFailure(panel); }
}
function openMaterial(course) {
  const [title,type,entries] = course.material;
  dialog.innerHTML = '<div class="dialog-top">'+badge(course.icon,course.color)+'<button class="btn" type="button" aria-label="Close material" data-close>'+icon('close')+'</button></div>'+
    '<div class="material"><p class="eyebrow">'+course.name+' · '+type+'</p><h2 id="dialog-title">'+title+'</h2>'+list(entries)+'</div>'+
    '<div class="material-actions"><div class="row"><button class="btn" data-export="download" disabled>Download '+icon('lock')+'</button><button class="btn" data-export="print" disabled>Print '+icon('lock')+'</button></div>'+
    '<p class="notice" role="status"></p><a class="btn" data-access-link hidden></a> <button class="btn" data-retry hidden>Retry verification</button></div>';
  dialog.setAttribute('aria-labelledby','dialog-title');
  dialog.showModal();
  const panel = dialog.querySelector('.material-actions');
  panel.querySelector('[data-access-link]').addEventListener('click', event=>{
    if (event.currentTarget.getAttribute('href') === signIn[0]) {
      try { sessionStorage.setItem('giga3_post_login_next', workspacePath+'?view=materials'); }
      catch { /* Sign-in still works without the return destination. */ }
    }
  });
  panel.querySelector('[data-retry]').addEventListener('click',()=>verifyMaterialAccess(panel,course));
  panel.querySelectorAll('[data-export]').forEach(button=>{
    button.addEventListener('click',()=>exportMaterial(panel,course,button.dataset.export));
  });
  verifyMaterialAccess(panel,course);
}
function aiGuideMarkup(index) {
  const guide = aiGuides[index];
  const objectives = '<section class="lesson-intro"><h3>Learning objectives</h3><p>'+esc(guide.duration)+'</p>'+list(guide.objectives)+'</section>';
  const explanation = guide.sections.map(([heading,body])=>'<section class="lesson-reading"><h3>'+esc(heading)+'</h3><p>'+esc(body)+'</p></section>').join('');
  if (index !== 0) return objectives + explanation;
  const tools = '<section class="lesson-tools"><h3>Choose and try an AI tool</h3>'+aiTools.map(tool=>
    '<article><h4>'+esc(tool.name)+'</h4><p>'+esc(tool.use)+'</p><blockquote>'+esc(tool.example)+'</blockquote><a class="back" href="'+esc(tool.href)+'" target="_blank" rel="noopener noreferrer">Open '+esc(tool.name)+'</a></article>').join('')+'</section>';
  const lab = '<section class="prompt-lab"><h3>Build and improve your prompt</h3><p>Use the CLEAR checklist to write a prompt you can test. These fields prepare your instructions. Copy the result into an approved AI assistant.</p>'+
    promptParts.map(([label,example],i)=>'<label for="prompt-part-'+i+'">'+esc(label)+'<textarea id="prompt-part-'+i+'" data-prompt-part="'+i+'" rows="2" placeholder="'+esc(example)+'"></textarea></label>').join('')+
    '<p id="prompt-lab-count" role="status">0 of 5 prompt parts filled</p><label for="prompt-preview">Your combined prompt<textarea id="prompt-preview" rows="7" readonly></textarea></label>'+
    '<button class="btn" type="button" id="copy-prompt">Copy prompt</button><p id="prompt-copy-status" role="status"></p>'+
    '<p>After testing, check accuracy, learner level, task coverage, format and feedback. Score each from 0 to 2. Revise your weakest instruction and test again.</p></section>';
  const check = '<section class="lesson-check"><h3>Lesson 1 knowledge check</h3><p>Answer all eight questions. Each choice reveals feedback. Score at least 6 out of 8 to complete this lesson.</p>'+
    guide.checks.map(([question,options],i)=>'<fieldset><legend>'+esc(question)+'</legend>'+options.map((answer,j)=>
      '<label class="option"><input type="radio" name="intro-check-'+i+'" value="'+j+'" data-intro-check="'+i+'">'+esc(answer)+'</label>').join('')+
      '<p class="feedback" id="intro-feedback-'+i+'" hidden></p></fieldset>').join('')+
    '<p id="intro-check-score" role="status"></p></section>';
  return objectives + explanation + tools + lab + check;
}

function practicalGuideMarkup(course, index, state) {
  const guide = course.guides?.[index];
  if (!guide) return '';
  const checks = guide.checks || [];
  const pass = Math.ceil(checks.length * 0.75);
  const resources = index === 0 ? '<section class="lesson-reading"><h3>Course reference library</h3><ul>' + course.sources.map(([name, url]) =>
    '<li><a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(name)+'</a></li>').join('')+'</ul></section>' : '';
  let starter = '';
  if (course.id === 'web' && index === 0) starter = '<section class="project-starter"><h3>Build My Study Hub</h3><p>Download all starter files, make your own changes and run the tests described above. Try the button in the preview below; open the project separately for PWA testing.</p>'+
    '<a class="btn primary" href="projects/study-hub.zip" download>Download Study Hub starter (ZIP)</a> '+
    '<a class="btn" href="projects/study-hub/index.html" target="_blank" rel="noopener">Open working example</a>'+
    '<div class="study-hub-preview" aria-label="Interactive My Study Hub example"><h3>Welcome to My Study Hub!</h3><p>Learn, practise and grow your skills.</p><button class="btn primary" type="button" id="study-hub-preview-start">Start Learning</button><p id="study-hub-preview-message" aria-live="polite"></p></div>'+
    ['index.html','manifest.webmanifest','sw.js','README.txt'].map(file=>'<details class="source-example"><summary>Read '+esc(file)+'</summary><pre><code data-source="projects/study-hub/'+file+'">Loading source…</code></pre></details>').join('')+'</section>';
  if (course.id === 'robotics' && index === 0) starter = '<section class="project-starter"><h3>Try a soil-alert simulation</h3><p>Use the slider and missing-input control, then record normal, boundary and fault behaviour. The scale is fictional; real hardware needs calibration.</p><a class="btn" href="projects/soil-alert.html" target="_blank" rel="noopener">Open simulator</a> <a class="btn primary" href="projects/soil-alert.html" download>Download simulator source</a><div class="soil-preview"><p>This example uses a fictional 0–100 moisture scale. Alert on below 30, off above 40, retain previous state between thresholds.</p><label for="soil-moisture">Simulated moisture: <span id="soil-reading">50</span> / 100</label><input id="soil-moisture" type="range" min="0" max="100" value="50"><label><input id="soil-fault" type="checkbox"> Simulate missing input</label><p id="soil-status" role="status">Alert OFF — continue observing.</p></div></section>';
  if (course.id === 'mobile' && index === 1) starter = '<section class="project-starter"><h3>Compose revision-app starter</h3><p>Create and run an Android Studio Empty Activity project first. Add this file to your generated source package, retain your package declaration, then call RevisionApp() inside MaterialTheme in the activity’s setContent block. It is a starter composable, not an installable APK.</p><a class="btn primary" href="projects/RevisionApp.kt" download>Download RevisionApp.kt</a><details class="source-example"><summary>Read the Kotlin source</summary><pre><code data-source="projects/RevisionApp.kt">Loading source…</code></pre></details></section>';
  return '<section class="lesson-intro"><h3>Learning objectives</h3><p>'+esc(guide.duration)+'</p>'+list(guide.objectives)+'</section>'+
    guide.sections.map(([title, body])=>'<section class="lesson-reading"><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p></section>').join('')+starter+resources+
    '<section class="lesson-check" data-check-group="'+index+'"><h3>Lesson '+(index+1)+' knowledge check</h3><p>Answer every question. Score at least '+pass+' out of '+checks.length+' before completing this lesson. You can review the explanation and try again.</p>'+
    checks.map(([question, options], i)=>'<fieldset><legend>'+esc(question)+'</legend>'+options.map((answer,j)=>'<label class="option"><input type="radio" name="lesson-'+index+'-check-'+i+'" value="'+j+'" data-lesson-check="'+index+'" data-question="'+i+'">'+esc(answer)+'</label>').join('')+
    '<p class="feedback" id="lesson-feedback-'+index+'-'+i+'" hidden></p></fieldset>').join('')+
    '<p data-check-status="'+index+'" role="status">'+(state.lessonCheckScores[index] ? 'Saved best: '+state.lessonCheckScores[index]+' / '+checks.length : '')+'</p></section>';
}
function projectMarkup(course, state) {
  if (!course.project) return '';
  const project = state.project || {};
  const criteria = course.id === 'teaching'
    ? ['Clear objectives', 'Appropriate teaching activities', 'Learner participation', 'Assessment and feedback', 'Differentiation and clarity']
    : projectCriteria;
  return '<section class="panel final-project"><h2>Final practical project</h2><p>'+esc(course.project)+'</p>'+
    '<p>This is a browser-local, self-assessed portfolio submission. It is not an instructor review or independent verification of your work. Do not enter passwords, private learner records or confidential links.</p>'+
    '<p id="project-lock" class="notice" role="status">Complete all lessons to submit your project.</p>'+
    '<form id="project-form" hidden><label for="project-evidence">Evidence: describe what you built, include a shareable project/source URL where applicable, and record your test results (at least 80 characters).</label>'+
    '<textarea id="project-evidence" name="evidence" required minlength="80" maxlength="6000" rows="6">'+esc(project.evidence || '')+'</textarea>'+
    '<fieldset><legend>Self-assessment rubric — 0: missing, 1: partial, 2: demonstrated. Minimum 7 / 10.</legend>'+
    criteria.map((criterion, i)=>'<label for="project-score-'+i+'">'+esc(criterion)+'<select id="project-score-'+i+'" name="score'+i+'" required><option value="">Choose a score</option>'+[0,1,2].map(score=>'<option value="'+score+'"'+(project.scores?.[i]===score?' selected':'')+'>'+score+'</option>').join('')+'</select></label>').join('')+'</fieldset>'+
    '<label for="project-reflection">Reflection: explain a difficulty, a correction and your next improvement (at least 40 characters).</label><textarea id="project-reflection" name="reflection" required minlength="40" maxlength="3000" rows="4">'+esc(project.reflection || '')+'</textarea>'+
    '<button class="btn primary" type="submit">Save project submission</button><p id="project-status" class="notice" role="status">'+(projectComplete(course,state)?'Project requirement satisfied. '+(state.projectGrandfathered?'Your existing earned certificate is preserved.':'Self-assessment saved in this browser.'):'Complete the evidence and rubric to unlock the final assessment.')+'</p></form></section>';
}

function coursePage(course) {
  const state = record(course);
  const pass = passingScore(course);
  main.innerHTML = '<a class="back" href="#courses">'+icon('back')+' All courses</a>'+head(course.field,course.name,course.summary)+
    '<section class="panel"><div class="row"><strong>Course progress</strong><span id="lesson-count"></span></div><progress aria-label="Lessons complete" max="'+course.lessons.length+'"></progress><p id="course-status" class="notice" aria-live="polite"></p></section>'+
    '<h2 class="section-title">Step-by-step lessons</h2><p class="section-subtitle">Complete each practical activity in order to unlock the next lesson.</p>'+
    '<div class="lesson-list">'+course.lessons.map(([title,intro,steps,activity,related],i)=> {
      const example = course.id === 'ai' ? aiExamples[i] : null;
      return '<details class="panel lesson '+course.color+'" data-step="'+i+'"><summary><span class="lesson-number">'+String(i+1).padStart(2,'0')+'</span>'+
        '<span class="lesson-title">'+esc(title)+'</span><span class="lesson-state" data-marker="'+i+'"></span></summary>'+
        '<div class="lesson-content">'+(course.id === 'ai' ? aiGuideMarkup(i) : practicalGuideMarkup(course,i,state))+'<section class="lesson-intro"><h3>What you’ll learn</h3><p>'+esc(intro)+'</p></section>'+
        '<section class="lesson-steps"><h3>Follow the steps</h3>'+list(steps)+'</section>'+
        (example ? '<section class="worked-example"><p class="lesson-label">Worked example</p><h3>'+esc(example[0])+'</h3><p>'+esc(example[1])+'</p></section>' : '')+
        '<section class="activity"><h3>Try it yourself</h3><p>'+esc(activity)+'</p>'+
        (example ? '<p><strong>What to produce</strong> '+esc(example[2])+'</p>' : '')+'</section>'+
        '<div class="row lesson-footer"><p>'+esc(related)+'</p><button class="btn primary" type="button" data-lesson="'+i+'"></button></div></div></details>';
    }).join('')+'</div>'+
    projectMarkup(course,state)+'<section class="panel"><h2>Course assessment</h2><p>Answer all '+course.quiz.length+' questions. Score at least '+pass+' out of '+course.quiz.length+' and complete every lesson'+(course.project?' and submit your practical project':'')+' to unlock a browser-local certificate.</p>'+
    '<p id="quiz-lock" class="notice" role="status">Complete all lessons'+(course.project?' and submit your practical project':'')+' to unlock the assessment.</p>'+
    '<form id="quiz" hidden>'+course.quiz.map(([question,options],i)=>'<fieldset><legend>'+(i+1)+'. '+esc(question)+'</legend>'+
    options.map((answer,j)=>'<label class="option"><input required type="radio" name="q'+i+'" value="'+j+'">'+esc(answer)+'</label>').join('')+
    '<p class="feedback" id="feedback-'+i+'" hidden></p></fieldset>').join('')+
    '<button type="submit" class="btn primary">Check answers</button><p class="notice" id="quiz-result" role="status"></p></form></section>'+
    '<section class="panel row"><div><strong>Track worksheet</strong><p>'+course.material[0]+'</p></div><button type="button" class="btn" data-material="'+course.id+'">View material '+icon('arrow')+'</button></section>';
  function update() {
    main.querySelector('#lesson-count').textContent = state.done.length+' of '+course.lessons.length+' lessons complete';
    main.querySelector('progress').value = state.done.length;
    main.querySelectorAll('[data-lesson]').forEach(el=>{
      const index = Number(el.dataset.lesson);
      const complete = state.done.includes(index);
      const unlocked = lessonUnlocked(state,index);
      const details = el.closest('details');
      if (!unlocked) details.open = false;
      details.querySelector('.lesson-content').hidden = !unlocked;
      details.querySelector('summary').setAttribute('aria-disabled', String(!unlocked));
      const needsIntroCheck = !lessonCheckPassed(course,state,index);
      el.disabled = complete || !unlocked || needsIntroCheck;
      el.title = needsIntroCheck && !complete ? 'Pass the lesson knowledge check before marking this lesson complete.' : '';
      el.textContent = complete ? 'Lesson complete' : 'Mark lesson complete';
      main.querySelector('[data-marker="'+el.dataset.lesson+'"]').textContent = complete ? 'Completed' : unlocked ? 'Ready' : 'Locked';
    });
    const lessonsReady = lessonsComplete(course,state);
    const projectForm = main.querySelector('#project-form');
    if (projectForm) { projectForm.hidden = !lessonsReady; main.querySelector('#project-lock').hidden = lessonsReady; }
    const ready = lessonsReady && projectComplete(course,state);
    main.querySelector('#quiz').hidden = !ready;
    main.querySelector('#quiz-lock').hidden = ready;
    const status = main.querySelector('#course-status');
    status.textContent = 'Best assessment score '+state.best+' / '+course.quiz.length+'. ';
    if (state.introductoryBest) status.append('Original assessment score '+state.introductoryBest+' / 4. ');
    if (state.earned || state.introductoryEarned) {
      const link = document.createElement('a');
      link.href='#certificates';
      link.className='back';
      link.textContent='View certificate';
      status.append(link);
    }
  }
  if (course.id === 'ai') {
    const parts = Array.from(main.querySelectorAll('[data-prompt-part]'));
    const preview = main.querySelector('#prompt-preview');
    for (const input of parts) input.addEventListener('input',()=>{
      preview.value = parts.map((part,i)=>part.value.trim() ? promptParts[i][0]+': '+part.value.trim() : '').filter(Boolean).join('\n');
      main.querySelector('#prompt-lab-count').textContent = parts.filter(part=>part.value.trim()).length+' of 5 prompt parts filled';
    });
    main.querySelector('#copy-prompt').addEventListener('click',async()=>{
      const status = main.querySelector('#prompt-copy-status');
      if (!preview.value.trim()) { status.textContent = 'Fill in your prompt parts first.'; return; }
      try { await navigator.clipboard.writeText(preview.value); status.textContent = 'Prompt copied. Test it in your chosen assistant.'; }
      catch { preview.focus(); preview.select(); status.textContent = 'Select and copy the prompt from the box.'; }
    });
    for (const input of main.querySelectorAll('[data-intro-check]')) input.addEventListener('change',()=>{
      const index = Number(input.dataset.introCheck);
      const question = aiGuides[0].checks[index];
      const feedback = main.querySelector('#intro-feedback-'+index);
      feedback.textContent = (Number(input.value) === question[2] ? 'Correct. ' : 'Review this answer. ')+question[3];
      feedback.hidden = false;
      const selected = Array.from(main.querySelectorAll('[data-intro-check]:checked'));
      const score = selected.filter(answer=>Number(answer.value)===aiGuides[0].checks[Number(answer.dataset.introCheck)][2]).length;
      main.querySelector('#intro-check-score').textContent = score+' / 8 correct · '+selected.length+' of 8 answered';
      if (selected.length === 8) {
        state.introCheckScore = Math.max(state.introCheckScore || 0,score);
        save(course,state);
        update();
      }
    });
  }
  main.querySelector('#study-hub-preview-start')?.addEventListener('click',()=>{
    main.querySelector('#study-hub-preview-message').textContent='Brilliant! Your web development journey has begun.';
  });
  const moisture=main.querySelector('#soil-moisture');
  if (moisture) {
    let alertOn=false;
    const updateSoil=()=>{
      const reading=Number(moisture.value);
      main.querySelector('#soil-reading').textContent=String(reading);
      const status=main.querySelector('#soil-status');
      if (main.querySelector('#soil-fault').checked || !Number.isFinite(reading) || reading<0 || reading>100) {
        alertOn=false;
        status.textContent='Fault: sensor input unavailable or invalid. Output off.';
        return;
      }
      if (reading<30) alertOn=true;
      else if (reading>40) alertOn=false;
      status.textContent=alertOn ? 'Dry alert ON — check whether watering is needed.' : 'Alert OFF — continue observing.';
    };
    moisture.addEventListener('input',updateSoil);
    main.querySelector('#soil-fault').addEventListener('change',updateSoil);
  }
  for (const source of main.querySelectorAll('[data-source]')) {
    // Paths are created from the fixed starter-file list above, never user input.
    fetch(source.dataset.source).then(response=>{
      if (!response.ok) throw new Error('Source unavailable');
      return response.text();
    }).then(text=>{ if (source.isConnected) source.textContent=text; })
      .catch(()=>{ if (source.isConnected) source.textContent='Source could not load. Download the starter file or retry the page.'; });
  }
  for (const input of main.querySelectorAll('[data-lesson-check]')) input.addEventListener('change',()=>{
    const index = Number(input.dataset.lessonCheck);
    if (!lessonUnlocked(state,index)) return;
    const questions = course.guides[index].checks;
    const questionIndex = Number(input.dataset.question);
    const question = questions[questionIndex];
    const feedback = main.querySelector('#lesson-feedback-'+index+'-'+questionIndex);
    feedback.textContent = (Number(input.value) === question[2] ? 'Correct. ' : 'Incorrect. ')+question[3];
    feedback.hidden = false;
    const selected = Array.from(main.querySelectorAll('[data-lesson-check="'+index+'"]:checked'));
    const score = selected.filter(answer=>Number(answer.value) === questions[Number(answer.dataset.question)][2]).length;
    main.querySelector('[data-check-status="'+index+'"]').textContent = score+' / '+questions.length+' correct · '+selected.length+' of '+questions.length+' answered';
    if (selected.length === questions.length) {
      state.lessonCheckScores[index] = Math.max(state.lessonCheckScores[index] || 0,score);
      save(course,state);
      update();
    }
  });
  main.querySelector('#project-form')?.addEventListener('submit',event=>{
    event.preventDefault();
    if (!lessonsComplete(course,state)) return;
    const form = new FormData(event.currentTarget);
    const scores = projectCriteria.map((_,i)=>form.has('score'+i) && /^[012]$/.test(String(form.get('score'+i))) ? Number(form.get('score'+i)) : -1);
    const project = { evidence:String(form.get('evidence') || '').trim(), reflection:String(form.get('reflection') || '').trim(), scores, submitted:new Date().toISOString() };
    const status = main.querySelector('#project-status');
    if (project.evidence.length < 80 || project.reflection.length < 40 || scores.some(score=>score<0) || scores.reduce((a,b)=>a+b,0)<7) {
      status.textContent='Provide the evidence and reflection, score all five areas, and reach at least 7 / 10. Improve your work before raising its score.';
      return;
    }
    state.project = project;
    save(course,state);
    status.textContent='Project submitted: '+scores.reduce((a,b)=>a+b,0)+' / 10 self-assessed. '+(storageAvailable?'Saved in this browser.':'Storage is unavailable; keep your own copy.');
    update();
  });
  for (const input of main.querySelectorAll('#quiz input[type="radio"]')) input.addEventListener('change',()=>{
    const index = Number(input.name.slice(1));
    const question = course.quiz[index];
    const feedback = main.querySelector('#feedback-'+index);
    feedback.textContent = (Number(input.value) === question[2] ? 'Correct. ' : 'Incorrect. ')+question[3];
    feedback.hidden = false;
  });
  main.querySelectorAll('[data-step] summary').forEach(summary=>{
    summary.addEventListener('click', event=>{
      if (!lessonUnlocked(state, Number(summary.parentElement.dataset.step))) event.preventDefault();
    });
  });
  main.querySelectorAll('[data-lesson]').forEach(el=>el.addEventListener('click',()=>{
    const index = Number(el.dataset.lesson);
    if (!lessonUnlocked(state,index) || state.done.includes(index)) return;
    if (!lessonCheckPassed(course,state,index)) return;
    state.done.push(index);
    save(course,state);
    update();
  }));
  main.querySelector('#quiz').addEventListener('submit',event=>{
    event.preventDefault();
    if (!lessonsComplete(course,state) || !projectComplete(course,state)) return;
    const form = new FormData(event.currentTarget);
    if (course.quiz.some((_,i)=>!form.has('q'+i))) return;
    let score = 0;
    course.quiz.forEach((item,i)=>{
      const correct = Number(form.get('q'+i))===item[2];
      if (correct) score++;
      const feedback = main.querySelector('#feedback-'+i);
      feedback.textContent = (correct?'Correct. ':'Review this answer. ')+item[3];
      feedback.hidden = false;
    });
    state.best = Math.max(state.best,score);
    save(course,state);
    update();
    main.querySelector('#quiz-result').textContent = score+' / '+course.quiz.length+(score>=pass?' · Passed':' · Try again');
  });
  update();
}
function overview(certificates) {
  main.innerHTML = (certificates ? head('LEARNING RECORD','Certificates','Earn a certificate by completing every lesson, submitting the required practical project and passing the assessment for a track. Certificates reflect progress recorded in this browser.') :
    head('YOUR WORKSPACE','Your progress','Pick up a track where you left off. Your progress is stored in this browser.'))+
    '<section class="grid">'+courses.map(course=>{
      const state = record(course);
      const earned = state.earned && eligibleForCertificate(course,state);
      return '<article class="card '+course.color+'">'+badge(certificates?'award':course.icon,course.color)+'<h3>'+course.name+'</h3>'+
        (certificates ? '<p>'+(earned?'Certificate earned':'Complete the lessons and pass the assessment to unlock.')+'</p>'+
        (earned?'<button class="btn" data-certificate="'+course.id+'">View certificate'+icon('arrow')+'</button>':button('Open course','#course/'+course.id))+
        (state.introductoryEarned?'<button class="btn" data-certificate="'+course.id+'" data-introductory>View original certificate'+icon('arrow')+'</button>':'') :
        '<p>'+state.done.length+' of '+course.lessons.length+' lessons · Best score '+state.best+' / '+course.quiz.length+'</p>'+
        '<progress aria-label="'+course.name+' lessons complete" max="'+course.lessons.length+'" value="'+state.done.length+'"></progress>'+
        button(state.done.length?'Continue course':'Open course','#course/'+course.id))+'</article>';
    }).join('')+'</section>';
}
function openCertificate(course, introductory) {
  const state = record(course);
  const earned = introductory ? state.introductoryEarned : state.earned;
  if (!earned || (!introductory && !eligibleForCertificate(course,state))) return;
  const date = new Intl.DateTimeFormat('en-GH',{dateStyle:'long',timeZone:'Africa/Accra'}).format(new Date(earned));
  dialog.classList.remove('certificate-dialog');
  const serialField = introductory ? 'introductorySerial' : 'serial';
  const chrome = '<div class="dialog-top">'+badge('award')+'<button class="btn" type="button" aria-label="Close certificate" data-close>'+icon('close')+'</button></div>';
  function showCertificate() {
    dialog.classList.add('certificate-dialog');
    if (course.id === 'ai' && !introductory &&
        state.recipient.trim().toLowerCase() === 'ayiiga benard issaka') {
      dialog.innerHTML = chrome +
        '<h2 id="dialog-title" class="certificate-image-title">Artificial Intelligence certificate</h2>'+
        '<a class="btn primary certificate-download" href="ai-certificate-original.png" download="GigaLearn-AI-Certificate.png">Download certificate (PNG)</a>'+
        '<img class="certificate-original" src="ai-certificate-original.png" width="1536" height="1024" '+
        'alt="Certificate of completion in Artificial Intelligence awarded to Ayiiga Benard Issaka, issued 18 November 2026">';
      return;
    }

    const imageUrl = createCertificateImage({
      recipient: state.recipient,
      course: course.name,
      date,
      serial: state[serialField],
      completion: introductory ? 'Introductory course completed' : course.lessons.length + ' lessons completed and assessment passed',
    });
    dialog.innerHTML = chrome +
      '<h2 id="dialog-title" class="certificate-image-title">'+esc(course.name)+' certificate</h2>'+
      '<a class="btn primary certificate-download" href="'+imageUrl+'" download="GigaLearn-'+course.id+'-Certificate.png">Download certificate (PNG)</a>'+
      '<img class="certificate-original" src="'+imageUrl+'" width="1536" height="1024" '+
      'alt="'+esc(course.name+' certificate awarded to '+state.recipient+', issued '+date+', serial '+state[serialField])+'">';

  }
  if (state.recipient && state[serialField]) {
    showCertificate();
  } else {
    dialog.innerHTML = chrome+'<h2 id="dialog-title">Personalise your certificate</h2>'+
      '<form id="certificate-name"><label for="recipient">Full name as it should appear on the certificate</label>'+
      '<input id="recipient" name="recipient" autocomplete="name" maxlength="100" required value="'+esc(state.recipient)+'">'+
      '<button class="btn primary" type="submit">Create certificate</button></form>';
    dialog.querySelector('#certificate-name').addEventListener('submit',event=>{
      event.preventDefault();
      const input = dialog.querySelector('#recipient');
      const name = input.value.trim();
      if (!name) {
        input.setCustomValidity('Enter your name.');
        input.reportValidity();
        return;
      }
      state.recipient = name;
      state[serialField] ||= createCertificateSerial(course.id);
      save(course,state);
      showCertificate();
      dialog.querySelector('[data-close]').focus();
    });
    dialog.querySelector('#recipient').addEventListener('input',event=>event.target.setCustomValidity(''));
  }
  dialog.setAttribute('aria-labelledby','dialog-title');
  dialog.showModal();
}
dialog.addEventListener('close',()=>dialog.classList.remove('certificate-dialog'));
function render() {
  if (dialog.open) dialog.close();
  const [route,id] = (location.hash.slice(1) || new URLSearchParams(location.search).get('view') || '').split('/');
  const course = route==='course' ? courses.find(item=>item.id===id) : null;
  const tab = ['materials','progress','certificates'].includes(route) ? route : 'courses';
  document.querySelectorAll('[data-nav]').forEach(link=>{
    if (link.dataset.nav===tab) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#crumb').textContent = tab[0].toUpperCase()+tab.slice(1);
  if (course) coursePage(course);
  else if (tab==='courses' || tab==='materials') catalog(tab==='materials');
  else overview(tab==='certificates');
}
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus();});
main.addEventListener('click',event=>{
  const trigger = event.target.closest('[data-material],[data-certificate]');
  if (!trigger) return;
  const course = courses.find(c=>c.id===(trigger.dataset.material || trigger.dataset.certificate));
  if (!course) return;
  if (trigger.dataset.material) openMaterial(course);
  else openCertificate(course,trigger.hasAttribute('data-introductory'));
});
dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]')) dialog.close();});
window.addEventListener('hashchange',()=>{render();main.focus({preventScroll:true});window.scrollTo(0,0);});
render();
