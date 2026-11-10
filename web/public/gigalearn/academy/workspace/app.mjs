import courses from './courses.mjs';
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
  const state = saved[course.id] || {};
  return {
    done: Array.isArray(state.done) ? [...new Set(state.done.filter(i => Number.isInteger(i) && i >= 0 && i < course.lessons.length))] : [],
    best: Number.isInteger(state.best) && state.best >= 0 && state.best <= course.quiz.length ? state.best : 0,
    earned: typeof state.earned === 'string' && !Number.isNaN(Date.parse(state.earned)) ? state.earned : ''
  };
}
function save(course, state) {
  if (!state.earned && state.done.length === course.lessons.length && state.best >= 3) state.earned = new Date().toISOString();
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
  const inProgress = courses.find(course => record(course).done.length && !record(course).earned);
  const stats = [['grid',courses.length,'Course tracks'],['check',completed+' / 18','Lessons complete'],['award',courses.filter(course=>record(course).earned).length,'Certificates earned']];
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
function coursePage(course) {
  const state = record(course);
  main.innerHTML = '<a class="back" href="#courses">'+icon('back')+' All courses</a>'+head(course.field,course.name,course.summary)+
    '<section class="panel"><div class="row"><strong>Course progress</strong><span id="lesson-count"></span></div><progress aria-label="Lessons complete" max="'+course.lessons.length+'"></progress><p id="course-status" class="notice" aria-live="polite"></p></section>'+
    '<h2 class="section-title">Step-by-step lessons</h2><p class="section-subtitle">Try each activity before marking its lesson complete.</p>'+
    '<div class="lesson-list">'+course.lessons.map(([title,intro,steps,activity,related],i)=>'<details class="panel"><summary>'+String(i+1).padStart(2,'0')+' · '+title+' <span data-marker="'+i+'"></span></summary>'+
    '<div class="lesson-content"><p>'+intro+'</p>'+list(steps)+'<div class="activity"><strong>Practical activity</strong>'+activity+'</div><p><strong>Related area</strong> · '+related+'</p>'+
    '<button class="btn" type="button" data-lesson="'+i+'"></button></div></details>').join('')+'</div>'+
    '<section class="panel"><h2>Course assessment</h2><p>Answer all four questions. Score at least 3 out of 4 and complete every lesson to unlock a browser-local certificate.</p>'+
    '<form id="quiz">'+course.quiz.map(([question,options],i)=>'<fieldset><legend>'+(i+1)+'. '+esc(question)+'</legend>'+
    options.map((answer,j)=>'<label class="option"><input required type="radio" name="q'+i+'" value="'+j+'">'+esc(answer)+'</label>').join('')+
    '<p class="feedback" id="feedback-'+i+'" hidden></p></fieldset>').join('')+
    '<button type="submit" class="btn primary">Check answers</button><p class="notice" id="quiz-result" role="status"></p></form></section>'+
    '<section class="panel row"><div><strong>Track worksheet</strong><p>'+course.material[0]+'</p></div><button type="button" class="btn" data-material="'+course.id+'">View material '+icon('arrow')+'</button></section>';
  function update() {
    main.querySelector('#lesson-count').textContent = state.done.length+' of '+course.lessons.length+' lessons complete';
    main.querySelector('progress').value = state.done.length;
    main.querySelectorAll('[data-lesson]').forEach(el=>{
      const complete = state.done.includes(Number(el.dataset.lesson));
      el.disabled = complete;
      el.textContent = complete ? 'Lesson complete' : 'Mark lesson complete';
      main.querySelector('[data-marker="'+el.dataset.lesson+'"]').textContent = complete ? '✓' : '';
    });
    const status = main.querySelector('#course-status');
    status.textContent = 'Best assessment score '+state.best+' / '+course.quiz.length+'. ';
    if (state.earned) {
      const link = document.createElement('a');
      link.href='#certificates';
      link.className='back';
      link.textContent='View certificate';
      status.append(link);
    }
  }
  main.querySelectorAll('[data-lesson]').forEach(el=>el.addEventListener('click',()=>{
    const index = Number(el.dataset.lesson);
    if (!state.done.includes(index)) state.done.push(index);
    save(course,state);
    update();
  }));
  main.querySelector('#quiz').addEventListener('submit',event=>{
    event.preventDefault();
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
    main.querySelector('#quiz-result').textContent = score+' / '+course.quiz.length+(score>=3?' · Passed':' · Try again');
  });
  update();
}
function overview(certificates) {
  main.innerHTML = (certificates ? head('LEARNING RECORD','Certificates','Earn a certificate by completing all three lessons and passing the assessment for a track. Certificates reflect progress recorded in this browser.') :
    head('YOUR WORKSPACE','Your progress','Pick up a track where you left off. Your progress is stored in this browser.'))+
    '<section class="grid">'+courses.map(course=>{
      const state = record(course);
      const earned = state.earned && state.done.length===course.lessons.length && state.best>=3;
      return '<article class="card '+course.color+'">'+badge(certificates?'award':course.icon,course.color)+'<h3>'+course.name+'</h3>'+
        (certificates ? '<p>'+(earned?'Certificate earned':'Complete the lessons and pass the assessment to unlock.')+'</p>'+
        (earned?'<button class="btn" data-certificate="'+course.id+'">View certificate'+icon('arrow')+'</button>':button('Open course','#course/'+course.id)) :
        '<p>'+state.done.length+' of '+course.lessons.length+' lessons · Best score '+state.best+' / '+course.quiz.length+'</p>'+
        '<progress aria-label="'+course.name+' lessons complete" max="'+course.lessons.length+'" value="'+state.done.length+'"></progress>'+
        button(state.done.length?'Continue course':'Open course','#course/'+course.id))+'</article>';
    }).join('')+'</section>';
}
function openCertificate(course) {
  const state = record(course);
  if (!state.earned || state.done.length!==course.lessons.length || state.best<3) return;
  const date = new Intl.DateTimeFormat('en-GH',{dateStyle:'long',timeZone:'Africa/Accra'}).format(new Date(state.earned));
  dialog.innerHTML = '<div class="dialog-top">'+badge('award')+'<button class="btn" type="button" aria-label="Close certificate" data-close>'+icon('close')+'</button></div>'+
    '<div class="cert-paper"><p class="eyebrow">GIGALEARN ACADEMY</p><h2 id="dialog-title">Certificate of completion</h2><h3>'+course.name+'</h3><p>All lessons completed and assessment passed.</p><p>Earned '+esc(date)+'</p></div><p class="notice">Learning record generated in this browser.</p>';
  dialog.setAttribute('aria-labelledby','dialog-title');
  dialog.showModal();
}
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
  else openCertificate(course);
});
dialog.addEventListener('click',event=>{if(event.target.closest('[data-close]')) dialog.close();});
window.addEventListener('hashchange',()=>{render();main.focus({preventScroll:true});window.scrollTo(0,0);});
render();
