const DATA_URL = './data/verses.json';
const LS_PROGRESS = 'bvq-progress-v1';
const LS_ADMIN_DATA = 'bvq-admin-data-v1';
let data, pack, verses = [], currentVerse;
let progress = JSON.parse(localStorage.getItem(LS_PROGRESS) || '{"stars":0,"completed":{}}');
const $ = s => document.querySelector(s);
const cleanWords = text => text.replace(/[“”]/g,'"').match(/[A-Za-z’'0-9]+|[,.;:!?]/g) || [];
function save(){ localStorage.setItem(LS_PROGRESS, JSON.stringify(progress)); updateStats(); }
function shuffle(a){ return [...a].sort(()=>Math.random()-.5); }
async function loadData(){
  try{ const r = await fetch(DATA_URL,{cache:'no-store'}); data = await r.json(); }
  catch(e){ data = JSON.parse(localStorage.getItem(LS_ADMIN_DATA) || 'null'); }
  const admin = JSON.parse(localStorage.getItem(LS_ADMIN_DATA) || 'null');
  if(admin) data = admin;
  if(!data) throw new Error('No verse data found.');
  pack = data.packs.find(p=>p.id===data.activePackId) || data.packs[0];
  verses = pack.verses;
  setupBrand(); setupSelect(); updateStats();
}
function setupBrand(){
  $('#appTitle').textContent = data.appTitle || 'The Verse Vault';
  $('#packName').textContent = pack.name;
  if(data.titleBarImage){ $('#brandImageWrap').innerHTML = `<img class="brandImg" alt="Title artwork" src="${data.titleBarImage}">`; }
}
function setupSelect(){
  $('#verseSelect').innerHTML = verses.map(v=>`<option value="${v.id}">${v.reference} - ${v.category||''}</option>`).join('');
  $('#verseSelect').addEventListener('change',()=>selectVerse($('#verseSelect').value));
  selectVerse(verses[0]?.id);
}
function selectVerse(id){
  currentVerse = verses.find(v=>v.id===id) || verses[0];
  if(!currentVerse) return;
  $('#verseText').textContent = currentVerse.text;
  $('#verseReference').textContent = currentVerse.reference + (pack.translation ? ` (${pack.translation})` : '');
  $('#verseCategory').textContent = currentVerse.category || 'Memory Verse';
  $('#gameArea').innerHTML = '<p>Choose a game to begin.</p>';
}
function updateStats(){
  $('#stars').textContent = progress.stars || 0;
  $('#done').textContent = Object.values(progress.completed||{}).filter(Boolean).length;
}
function reward(game){
  progress.stars = (progress.stars||0)+3;
  progress.completed[currentVerse.id+'-'+game]=true;
  save();
}
document.addEventListener('click', e=>{
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
  document.querySelectorAll('.chip').forEach(chip=>chip.onclick=()=>{ $('#answerBox').appendChild(chip); });
}
function checkOrder(){
  const chosen=[...$('#answerBox').querySelectorAll('.chip')].map(x=>x.textContent).join(' ');
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
