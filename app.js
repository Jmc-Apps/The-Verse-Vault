const DATA_URL = './data/verses.json';
const LS_PROGRESS = 'bvq-progress-v1';
const LS_ADMIN_DATA = 'bvq-admin-data-v1';
const DEFAULT_LOGO = './assets/default-title-logo.png';
let data, pack, verses = [], currentVerse;
let progress = JSON.parse(localStorage.getItem(LS_PROGRESS) || '{"stars":0,"completed":{}}');
const $ = s => document.querySelector(s);
const cleanWords = text => text.replace(/[“”]/g,'"').match(/[A-Za-z’'0-9]+|[,.;:!?]/g) || [];
function save(){ localStorage.setItem(LS_PROGRESS, JSON.stringify(progress)); updateStats(); renderVerseList(); }
function shuffle(a){ return [...a].sort(()=>Math.random()-.5); }
async function loadData(){
  try{ const r = await fetch(DATA_URL,{cache:'no-store'}); data = await r.json(); }
  catch(e){ data = JSON.parse(localStorage.getItem(LS_ADMIN_DATA) || 'null'); }
  const admin = JSON.parse(localStorage.getItem(LS_ADMIN_DATA) || 'null');
  if(admin) data = admin;
  if(!data) throw new Error('No verse data found.');
  pack = data.packs.find(p=>p.id===data.activePackId) || data.packs[0];
  verses = pack.verses || [];
  setupBrand(); setupTabs(); updateStats(); selectVerse(verses[0]?.id); renderVerseList();
}
function setupBrand(){
  $('#packName').textContent = pack.name || 'Verse Pack';
  const src = data.titleBarImage || DEFAULT_LOGO;
  $('#brandImageWrap').innerHTML = `<img class="brandImg" alt="The Verse Vault title artwork" src="${src}">`;
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
  $('#verseText').textContent = currentVerse.text;
  $('#verseReference').textContent = currentVerse.reference + (pack.translation ? ` (${pack.translation})` : '');
  $('#verseCategory').textContent = currentVerse.category || 'Memory Verse';
  $('#gameArea').innerHTML = '<p>Choose a game to begin.</p>';
  renderVerseList();
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
document.addEventListener('click', e=>{
  const card = e.target.closest('[data-verse-id]');
  if(card){ selectVerse(card.dataset.verseId); showTab('playTab'); window.scrollTo({top:0,behavior:'smooth'}); }
  if(e.target.matches('[data-game]')) startGame(e.target.dataset.game);
  if(e.target.matches('[data-missing-check]')) checkMissing();
  if(e.target.matches('[data-order-check]')) checkOrder();
  if(e.target.matches('[data-quiz]')) checkQuiz(e.target.dataset.quiz);
});
function startGame(game){
  if(game==='missing') missingGame();
  if(game==='order') orderGame();
  if(game==='quiz') quizGame();
}
function missingGame(){
  const words = cleanWords(currentVerse.text).filter(w=>/[A-Za-z]/.test(w));
  const hidden = shuffle(words).slice(0, Math.min(4, Math.max(2, Math.floor(words.length/5))));
  let html = currentVerse.text;
  hidden.forEach((w,i)=>{ html = html.replace(new RegExp('\\b'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b'), `<input class="missing" data-answer="${w}" placeholder="word ${i+1}">`); });
  $('#gameArea').innerHTML = `<h3>Missing Words</h3><p>Type the missing words.</p><blockquote>${html}</blockquote><button data-missing-check>Check Answer</button><p id="feedback"></p>`;
}
function checkMissing(){
  const inputs=[...document.querySelectorAll('.missing')];
  const ok=inputs.every(i=>i.value.trim().toLowerCase()===i.dataset.answer.toLowerCase());
  $('#feedback').innerHTML = ok ? '<span class="ok">Great job! +3 stars</span>' : '<span class="bad">Try again. Check the spelling carefully.</span>';
  if(ok) reward('missing');
}
function orderGame(){
  const words=cleanWords(currentVerse.text).filter(w=>/[A-Za-z0-9]/.test(w));
  $('#gameArea').innerHTML = `<h3>Word Order</h3><p>Tap the words in the correct order.</p><div class="answerBox" id="answerBox"></div><div class="wordBank">${shuffle(words).map(w=>`<span class="chip">${w}</span>`).join('')}</div><button data-order-check>Check Order</button><button class="secondary" onclick="startGame('order')">Reset</button><p id="feedback"></p>`;
  document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ $('#answerBox').appendChild(c); });
}
function checkOrder(){
  const chosen=[...$('#answerBox').querySelectorAll('.chip')].map(c=>c.textContent).join(' ');
  const correct=cleanWords(currentVerse.text).filter(w=>/[A-Za-z0-9]/.test(w)).join(' ');
  const ok = chosen === correct;
  $('#feedback').innerHTML = ok ? '<span class="ok">Excellent memory! +3 stars</span>' : '<span class="bad">Not quite yet. Try the order again.</span>';
  if(ok) reward('order');
}
function quizGame(){
  const choices=shuffle([currentVerse, ...shuffle(verses.filter(v=>v.id!==currentVerse.id)).slice(0,3)]);
  $('#gameArea').innerHTML = `<h3>Reference Quiz</h3><blockquote>${currentVerse.text}</blockquote><p>Which reference matches this verse?</p><div class="buttonRow">${choices.map(v=>`<button data-quiz="${v.id}">${v.reference}</button>`).join('')}</div><p id="feedback"></p>`;
}
function checkQuiz(id){
  const ok = id === currentVerse.id;
  $('#feedback').innerHTML = ok ? '<span class="ok">Correct! +3 stars</span>' : '<span class="bad">Not that one. Try again.</span>';
  if(ok) reward('quiz');
}
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
loadData().catch(err => $('#gameArea').innerHTML = `<p class="bad">${err.message}</p>`);
