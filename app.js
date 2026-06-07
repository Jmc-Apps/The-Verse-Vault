const DATA_URL = './data/verses.json';
const BRANDING_URL = './data/branding.json';
function noCacheUrl(url){ return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(); }
const LS_PROGRESS = 'bvq-progress-v1';
const LS_ADMIN_DATA = 'bvq-admin-data-v1';
const DEFAULT_LOGO = new URL('./assets/default-title-logo.png', document.baseURI).href;
let effectiveLogoSrc = DEFAULT_LOGO;
let data, pack, verses = [], currentVerse, currentGame = null;
let progress = JSON.parse(localStorage.getItem(LS_PROGRESS) || '{"stars":0,"completed":{}}');
const $ = s => document.querySelector(s);
const cleanWords = text => text.replace(/[“”]/g,'"').match(/[A-Za-z’'0-9]+|[,.;:!?]/g) || [];

const STARTER_VERSES = [
  {id:'john-3-16-web', reference:'John 3:16', text:'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.', category:"God's Love"},
  {id:'psalm-23-1-web', reference:'Psalm 23:1', text:'Yahweh is my shepherd: I shall lack nothing.', category:'Trust'},
  {id:'philippians-4-13-web', reference:'Philippians 4:13', text:'I can do all things through Christ, who strengthens me.', category:'Courage'},
  {id:'genesis-1-1-web', reference:'Genesis 1:1', text:'In the beginning, God created the heavens and the earth.', category:'Creation'},
  {id:'psalm-119-105-web', reference:'Psalm 119:105', text:'Your word is a lamp to my feet, and a light for my path.', category:"God's Word"},
  {id:'proverbs-3-5-6-web', reference:'Proverbs 3:5-6', text:'Trust in Yahweh with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.', category:'Trust'},
  {id:'matthew-5-14-web', reference:'Matthew 5:14', text:'You are the light of the world. A city located on a hill can’t be hidden.', category:'Light'},
  {id:'romans-8-28-web', reference:'Romans 8:28', text:'We know that all things work together for good for those who love God, to those who are called according to his purpose.', category:'Hope'}
];
const STARTER_COLLECTION = { id:'starter-pack-protected', name:'Starter Pack', protected:true, system:true, description:'Protected starter collection of beginner-friendly memory verses.', translation:'WEB', verses: STARTER_VERSES };
function ensureStarterCollection(){
  if(!data) return;
  data.collections = data.collections || [];
  data.collections = data.collections.filter(c => c.id !== STARTER_COLLECTION.id && c.name !== 'Starter Pack');
  data.collections.unshift(JSON.parse(JSON.stringify(STARTER_COLLECTION)));
}

function save(){ localStorage.setItem(LS_PROGRESS, JSON.stringify(progress)); updateStats(); renderVerseList(); }

async function loadGlobalBranding(){
  try{
    const r = await fetch(noCacheUrl(BRANDING_URL), {cache:'no-store'});
    if(r.ok){
      const b = await r.json();
      branding = b && typeof b === 'object' ? b : {};
    }
  }catch(e){ branding = {}; }
  const onlineLogo = branding.titleBarImage || branding.logoPath || '';
  if(onlineLogo && !onlineLogo.startsWith('data:')){
    const clean = onlineLogo.replace(/^\.\//,'');
    data.titleBarImage = './' + clean + (clean.includes('?') ? '&' : '?') + 'v=' + Date.now();
  } else if(onlineLogo) {
    data.titleBarImage = onlineLogo;
  }
}
function normalizeLogoSrc(src){
  src = String(src || '').trim();
  if(!src) return DEFAULT_LOGO;
  if(src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
  src = src.replace(/^\.\//, '').replace(/^\.\.\//, '');
  const clean = src.split('?')[0].split('#')[0];
  if(clean.startsWith('assets/') || clean.startsWith('branding/')){
    return new URL('./' + clean, document.baseURI).href + '?v=' + Date.now();
  }
  return new URL(clean, document.baseURI).href;
}
function preloadLogo(src){
  return new Promise(resolve => {
    const wanted = normalizeLogoSrc(src);
    if(!wanted || wanted === DEFAULT_LOGO) return resolve(DEFAULT_LOGO);
    const img = new Image();
    img.onload = () => resolve(wanted);
    img.onerror = () => resolve(DEFAULT_LOGO);
    img.src = wanted;
  });
}
function currentLogoSrc(){
  return effectiveLogoSrc || DEFAULT_LOGO;
}

function shuffle(a){ return [...a].sort(()=>Math.random()-.5); }
async function loadData(){
  try{
    const r = await fetch(noCacheUrl(DATA_URL), {cache:'no-store'});
    if(!r.ok) throw new Error('Could not load online verses.json');
    data = await r.json();
  }
  catch(e){ data = JSON.parse(localStorage.getItem(LS_ADMIN_DATA) || 'null'); }
  if(!data) throw new Error('No verse data found.');
  data.version = '1.25';
  ensureStarterCollection();
  await loadGlobalBranding();
  try{ localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data)); }catch(e){}
  pack = data.packs.find(p=>p.id===data.activePackId) || data.packs[0];
  verses = pack.verses || [];
  setupBrand(); setupTabs(); setupCertificate(); updateStats(); selectVerse(verses[0]?.id); renderVerseList(); renderCertificate();
}
function setupBrand(){
  effectiveLogoSrc = DEFAULT_LOGO;
  $('#brandImageWrap').innerHTML = `<img class="brandImg" alt="The Verse Vault title artwork" src="${DEFAULT_LOGO}">`;
  const desired = data && data.titleBarImage ? data.titleBarImage : DEFAULT_LOGO;
  preloadLogo(desired).then(src => {
    effectiveLogoSrc = src;
    $('#brandImageWrap').innerHTML = `<img class="brandImg" alt="The Verse Vault title artwork" src="${src}">`;
    renderCertificate();
  });
}
function setupTabs(){
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));
}
function showTab(id){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.tabPage').forEach(p=>p.classList.toggle('active', p.id===id));
}
function selectVerse(id){
  currentVerse = verses.find(v=>v.id===id) || verses[0];
  if(!currentVerse) return;
  $('#gameArea').innerHTML = currentVerse ? `<p><strong>Selected verse:</strong> ${currentVerse.reference}${pack.translation ? ` (${pack.translation})` : ''}</p><p class="hint">Choose a game to begin.</p>` : '<p>Choose a verse from All Verses first.</p>';
  renderVerseList();
  renderCertificate();
}
function renderVerseList(){
  if(!$('#verseList') || !verses.length) return;
  $('#verseList').innerHTML = verses.map(v=>{
    const completeCount = ['missing','order','quiz'].filter(g => progress.completed?.[v.id+'-'+g]).length;
    return `<article class="verseCard ${currentVerse?.id===v.id?'active':''}" data-verse-id="${v.id}"><strong>${v.reference}</strong> <span class="pill">${v.category||'Verse'}</span><p>${v.text}</p><small>${completeCount}/3 games completed</small></article>`;
  }).join('');
}
function updateStats(){
  $('#stars').textContent = progress.stars || 0;
  $('#done').textContent = Object.values(progress.completed||{}).filter(Boolean).length;
}
function reward(game){
  const key = currentVerse.id+'-'+game;
  if(!progress.completed[key]) progress.stars = (progress.stars||0)+3;
  progress.completed[key]=true;
  save();
}
function loadNextVerse(game){
  if(!verses.length || !currentVerse) return;
  const currentIndex = verses.findIndex(v => v.id === currentVerse.id);
  const nextIndex = verses.length > 1 ? (currentIndex + 1) % verses.length : currentIndex;
  setTimeout(() => {
    selectVerse(verses[nextIndex]?.id);
    startGame(game);
  }, 900);
}
function setupCertificate(){
  const nameInput = $('#certificateName');
  const printBtn = $('#printCertificate');
  if(nameInput) nameInput.addEventListener('input', renderCertificate);
  if(printBtn) printBtn.addEventListener('click', printCertificate);
  const resetBtn = $('#resetProgress');
  if(resetBtn) resetBtn.addEventListener('click', resetProgress);
}
function resetProgress(){
  const ok = confirm('Reset progress? This will remove mastered verses, stars, rewards and progress on this device. It will not remove verse collections, the Starter Pack, admin settings, logo, password or backups.');
  if(!ok) return;
  progress = {stars:0, completed:{}};
  localStorage.setItem(LS_PROGRESS, JSON.stringify(progress));
  updateStats();
  renderVerseList();
  renderCertificate();
  if(currentGame) startGame(currentGame);
  alert('Progress has been reset.');
}
function longDate(){
  return new Date().toLocaleDateString(undefined, {year:'numeric', month:'long', day:'numeric'});
}
function certificateListName(){
  return (data?.certificateCollectionName || pack?.certificateName || pack?.name || 'Current Memory Verse List').trim();
}
function printCertificate(){
  renderCertificate();
  if(!allCurrentVersesMastered()){
    alert('Keep practising! Master all verses in this set to unlock your certificate.');
    return;
  }
  showTab('certificateTab');
  document.body.classList.add('printingCertificate');
  setTimeout(() => window.print(), 100);
}
window.addEventListener('afterprint', () => document.body.classList.remove('printingCertificate'));
function escapeHtml(value){
  return String(value || '').replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
}
function verseMastered(v){
  return ['missing','order','quiz'].every(g => progress.completed?.[v.id+'-'+g]);
}
function masteredCount(){
  return verses.filter(verseMastered).length;
}
function allCurrentVersesMastered(){
  return verses.length > 0 && masteredCount() === verses.length;
}
function renderCertificate(){
  const preview = $('#certificatePreview');
  if(!preview || !pack) return;
  const nameInput = $('#certificateName');
  const printBtn = $('#printCertificate');
  const total = verses.length;
  const mastered = masteredCount();
  const unlocked = allCurrentVersesMastered();
  if(nameInput) nameInput.disabled = !unlocked;
  if(printBtn) printBtn.disabled = !unlocked;
  if(!unlocked){
    preview.innerHTML = `<div class="certificateLocked">
      <h3>Certificate Locked</h3>
      <p>Keep practising! Master all verses in this set to unlock your certificate.</p>
      <strong>${mastered} of ${total} verses mastered</strong>
    </div>`;
    return;
  }
  const learner = (nameInput?.value || '').trim() || 'Learner Name';
  const logoSrc = currentLogoSrc();
  preview.innerHTML = `<div class="certificateSheet">
    <div class="certCircle certCircleTopLeft" aria-hidden="true"></div>
    <div class="certCircle certCircleTopRight" aria-hidden="true"></div>
    <div class="certCircle certCircleBottomLeft" aria-hidden="true"></div>
    <div class="certCircle certCircleBottomRight" aria-hidden="true"></div>
    <div class="certificateLogoBox"><img class="certificateLogo" src="${logoSrc}" alt="The Verse Vault logo"></div>
    <h1>Certificate of Achievement</h1>
    <p class="certLine">This certifies that</p>
    <div class="certName">${escapeHtml(learner)}</div>
    <p class="certLine">has successfully mastered the memory verses from</p>
    <div class="certCollection">${escapeHtml(certificateListName())}</div>
    <p class="certLine">Awarded on</p>
    <div class="certDate">${longDate()}</div>
    <p class="certCongrats">Congratulations on mastering God's Word!</p>
  </div>`;
}
document.addEventListener('click', e=>{
  const card = e.target.closest('[data-verse-id]');
  if(card){ selectVerse(card.dataset.verseId); showTab('playTab'); window.scrollTo({top:0,behavior:'smooth'}); }
  if(e.target.matches('[data-game]')) startGame(e.target.dataset.game);
  if(e.target.matches('[data-missing-check]')) checkMissing();
  if(e.target.matches('[data-order-check]')) checkOrder();
  if(e.target.matches('[data-quiz]')) checkQuiz(e.target.dataset.quiz);
});
function startGame(game){
  currentGame = game;
  if(game==='missing') missingGame();
  if(game==='order') orderGame();
  if(game==='quiz') quizGame();
}
function missingGame(){
  const words = cleanWords(currentVerse.text).filter(w=>/[A-Za-z]/.test(w));
  const hidden = shuffle(words).slice(0, Math.min(4, Math.max(2, Math.floor(words.length/5))));
  let html = currentVerse.text;
  hidden.forEach((w,i)=>{ html = html.replace(new RegExp('\\b'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b'), `<input class="missing inlineMissing" data-answer="${w}" aria-label="Missing word ${i+1}" placeholder="?">`); });
  $('#gameArea').innerHTML = `<h3>Finish the Verse</h3><p>Type the missing words to finish the Bible verse.</p><blockquote>${html}</blockquote><button data-missing-check>Check Answer</button><p id="feedback"></p>`;
}
function checkMissing(){
  const inputs=[...document.querySelectorAll('.missing')];
  const ok=inputs.every(i=>i.value.trim().toLowerCase()===i.dataset.answer.toLowerCase());
  $('#feedback').innerHTML = ok ? '<span class="ok">Great job! +3 stars — loading the next verse...</span>' : '<span class="bad">Try again. Check the spelling carefully.</span>';
  if(ok){ reward('missing'); loadNextVerse('missing'); }
}
function orderGame(){
  const words=cleanWords(currentVerse.text).filter(w=>/[A-Za-z0-9]/.test(w));
  $('#gameArea').innerHTML = `<h3>Verse Builder</h3><p>Build the Bible verse by tapping the words in the correct order.</p><div class="answerBox" id="answerBox"></div><div class="wordBank">${shuffle(words).map(w=>`<span class="chip">${w}</span>`).join('')}</div><button data-order-check>Check Order</button><button class="secondary" onclick="startGame('order')">Reset</button><p id="feedback"></p>`;
  document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ $('#answerBox').appendChild(c); });
}
function checkOrder(){
  const chosen=[...$('#answerBox').querySelectorAll('.chip')].map(c=>c.textContent).join(' ');
  const correct=cleanWords(currentVerse.text).filter(w=>/[A-Za-z0-9]/.test(w)).join(' ');
  const ok = chosen === correct;
  $('#feedback').innerHTML = ok ? '<span class="ok">Excellent memory! +3 stars — loading the next verse...</span>' : '<span class="bad">Not quite yet. Try the order again.</span>';
  if(ok){ reward('order'); loadNextVerse('order'); }
}
function quizGame(){
  const choices=shuffle([currentVerse, ...shuffle(verses.filter(v=>v.id!==currentVerse.id)).slice(0,3)]);
  $('#gameArea').innerHTML = `<h3>Name that Verse</h3><blockquote>${currentVerse.text}</blockquote><p>Which reference matches this verse?</p><div class="buttonRow">${choices.map(v=>`<button data-quiz="${v.id}">${v.reference}</button>`).join('')}</div><p id="feedback"></p>`;
}
function checkQuiz(id){
  const ok = id === currentVerse.id;
  $('#feedback').innerHTML = ok ? '<span class="ok">Correct! +3 stars — loading the next verse...</span>' : '<span class="bad">Not that one. Try again.</span>';
  if(ok){ reward('quiz'); loadNextVerse('quiz'); }
}
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
loadData().catch(err => $('#gameArea').innerHTML = `<p class="bad">${err.message}</p>`);
