const LS_ADMIN_DATA = 'bvq-admin-data-v1';
const LS_ADMIN_PASSWORD = 'vv-admin-password-v1';
const DEFAULT_LOGO = '../assets/default-title-logo.png';
const $ = s => document.querySelector(s);
let data, pack;
function getPassword(){ return localStorage.getItem(LS_ADMIN_PASSWORD) || '0000'; }
function requireLogin(){
  $('#adminLogin').onclick = () => {
    if($('#adminPasswordInput').value === getPassword()){
      $('#loginGate').style.display='none'; $('#adminApp').style.display='block'; init();
    } else $('#loginMessage').textContent = 'Incorrect password.';
  };
  $('#adminPasswordInput').addEventListener('keydown', e=>{ if(e.key==='Enter') $('#adminLogin').click(); });
}
async function init(){
  const local = localStorage.getItem(LS_ADMIN_DATA);
  if(local) data = JSON.parse(local);
  else data = await fetch('../data/verses.json').then(r=>r.json());
  data.collections = data.collections || [];
  bind(); render();
}
function save(){ data.version='1.05'; data.collections=data.collections||[]; localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data)); render(); }
function bind(){
  $('#activePack').onchange = e => { data.activePackId=e.target.value; save(); };
  $('#savePack').onclick = () => { pack.name=$('#packName').value; pack.description=$('#packDescription').value; pack.translation=$('#translation').value; save(); };
  $('#logoUpload').onchange = handleLogo;
  $('#clearLogo').onclick = () => { data.titleBarImage=''; save(); };
  $('#restoreLogo').onclick = () => { data.titleBarImage=''; save(); };
  $('#saveVerse').onclick = saveVerse;
  $('#newVerse').onclick = clearVerseForm;
  $('#saveCollection').onclick = saveCollection;
  $('#loadCollection').onclick = loadCollection;
  $('#deleteCollection').onclick = deleteCollection;
  $('#changePassword').onclick = changePassword;
  $('#exportJson').onclick = exportJson;
  $('#copyJson').onclick = copyJson;
  $('#resetDemo').onclick = () => { localStorage.removeItem(LS_ADMIN_DATA); location.reload(); };
}
function render(){
  pack = data.packs.find(p=>p.id===data.activePackId) || data.packs[0];
  $('#activePack').innerHTML = data.packs.map(p=>`<option value="${p.id}" ${p.id===pack.id?'selected':''}>${p.name}</option>`).join('');
  $('#packName').value = pack.name || '';
  $('#packDescription').value = pack.description || '';
  $('#translation').value = pack.translation || '';
  $('#previewLogo').innerHTML = `<img class="brandImg" src="${data.titleBarImage || DEFAULT_LOGO}" alt="Title image preview">`;
  $('#verseList').innerHTML = (pack.verses||[]).map(v=>`<div class="verseCard"><strong>${v.reference}</strong> <span class="pill">${v.category||''}</span><p>${v.text}</p><div class="buttonRow"><button onclick="editVerse('${v.id}')">Edit</button><button class="danger" onclick="deleteVerse('${v.id}')">Delete</button></div></div>`).join('');
  renderCollections();
}
function renderCollections(){
  data.collections = data.collections || [];
  $('#collectionSelect').innerHTML = data.collections.length ? data.collections.map(c=>`<option value="${c.id}">${c.name} (${(c.verses||[]).length} verses)</option>`).join('') : '<option value="">No collections saved yet</option>';
  $('#collectionList').innerHTML = data.collections.map(c=>`<div class="collectionItem"><strong>${c.name}</strong><br><small>${(c.verses||[]).length} verses saved</small></div>`).join('') || '<p class="hint">No collections yet.</p>';
}
function saveCollection(){
  const name = $('#collectionName').value.trim();
  if(!name) return alert('Please enter a collection name.');
  const existing = data.collections.find(c=>c.name.toLowerCase()===name.toLowerCase());
  const collection = { id: existing?.id || ('collection-' + Date.now()), name, verses: JSON.parse(JSON.stringify(pack.verses||[])), translation: pack.translation || '' };
  if(existing) Object.assign(existing, collection); else data.collections.push(collection);
  $('#collectionName').value=''; save();
}
function loadCollection(){
  const id = $('#collectionSelect').value; const c = data.collections.find(x=>x.id===id);
  if(!c) return alert('Choose a collection first.');
  if(confirm(`Load "${c.name}" into the active pack? This replaces the current verse list.`)){
    pack.verses = JSON.parse(JSON.stringify(c.verses||[]));
    if(c.translation) pack.translation = c.translation;
    save();
  }
}
function deleteCollection(){
  const id = $('#collectionSelect').value; const c = data.collections.find(x=>x.id===id);
  if(!c) return alert('Choose a collection first.');
  if(confirm(`Delete collection "${c.name}"?`)){ data.collections = data.collections.filter(x=>x.id!==id); save(); }
}
function changePassword(){
  const current = $('#currentPassword').value;
  const next = $('#newPassword').value;
  const confirm = $('#confirmPassword').value;
  const msg = $('#securityMessage');
  if(current !== getPassword()){ msg.className='bad'; msg.textContent='Current password is incorrect.'; return; }
  if(next.length < 4){ msg.className='bad'; msg.textContent='New password must be at least 4 characters.'; return; }
  if(next !== confirm){ msg.className='bad'; msg.textContent='New passwords do not match.'; return; }
  localStorage.setItem(LS_ADMIN_PASSWORD, next);
  $('#currentPassword').value=$('#newPassword').value=$('#confirmPassword').value='';
  msg.className='ok'; msg.textContent='Password changed.';
}
function handleLogo(e){
  const file = e.target.files[0];
  if(!file) return;
  if(file.type !== 'image/png') return alert('Please choose a transparent PNG file.');
  const reader = new FileReader();
  reader.onload = () => { data.titleBarImage = reader.result; save(); };
  reader.readAsDataURL(file);
}
function saveVerse(){
  const id = $('#editingId').value || ($('#reference').value.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Date.now());
  const verse = { id, reference: $('#reference').value.trim(), category: $('#category').value.trim(), text: $('#text').value.trim() };
  if(!verse.reference || !verse.text) return alert('Please enter a reference and verse text.');
  const index = pack.verses.findIndex(v=>v.id===id);
  if(index >= 0) pack.verses[index]=verse; else pack.verses.push(verse);
  clearVerseForm(); save();
}
function editVerse(id){
  const v = pack.verses.find(x=>x.id===id); if(!v) return;
  $('#editingId').value=v.id; $('#reference').value=v.reference; $('#category').value=v.category||''; $('#text').value=v.text;
  scrollTo({top:360,behavior:'smooth'});
}
function deleteVerse(id){ if(confirm('Delete this verse?')){ pack.verses = pack.verses.filter(v=>v.id!==id); save(); } }
function clearVerseForm(){ $('#editingId').value=''; $('#reference').value=''; $('#category').value=''; $('#text').value=''; }
function exportJson(){
  const json = JSON.stringify(data,null,2);
  $('#jsonOutput').value = json;
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='verses.json'; a.click(); URL.revokeObjectURL(url);
}
async function copyJson(){
  const json = JSON.stringify(data,null,2); $('#jsonOutput').value=json;
  try{ await navigator.clipboard.writeText(json); alert('JSON copied.'); } catch(e){ alert('Copy failed. You can select the text manually.'); }
}
requireLogin();
