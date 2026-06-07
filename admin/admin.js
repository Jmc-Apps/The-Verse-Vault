const LS_ADMIN_DATA = 'bvq-admin-data-v1';
const LS_ADMIN_PASSWORD = 'vv-admin-password-v1';
const DEFAULT_LOGO = '../assets/default-title-logo.png';
const $ = s => document.querySelector(s);
let data, pack;

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
  data.collections = data.collections || [];
  data.collections = data.collections.filter(c => c.id !== STARTER_COLLECTION.id && c.name !== 'Starter Pack');
  data.collections.unshift(JSON.parse(JSON.stringify(STARTER_COLLECTION)));
}
function isProtectedCollection(c){ return !!(c && (c.protected || c.system || c.id === STARTER_COLLECTION.id)); }

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
  ensureStarterCollection();
  bind(); render();
}
function save(){ ensureStarterCollection(); data.version='1.08'; data.collections=data.collections||[]; localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data)); render(); }
function bind(){
  if($('#activePack')) $('#activePack').onchange = e => { data.activePackId=e.target.value; save(); };
  if($('#savePack')) $('#savePack').onclick = () => { pack.name=$('#packName').value; pack.description=$('#packDescription').value; pack.translation=$('#translation').value; save(); };
  $('#logoUpload').onchange = handleLogo;
  $('#clearLogo').onclick = () => { data.titleBarImage=''; save(); };
  $('#restoreLogo').onclick = () => { data.titleBarImage=''; save(); };
  $('#saveVerse').onclick = saveVerse;
  $('#newVerse').onclick = clearVerseForm;
  $('#saveCollection').onclick = saveCollection;
  $('#loadCollection').onclick = loadCollection;
  $('#deleteCollection').onclick = deleteCollection;
  $('#duplicateCollection').onclick = duplicateCollection;
  $('#changePassword').onclick = changePassword;
  $('#exportJson').onclick = exportJson;
  $('#copyJson').onclick = copyJson;
  if($('#restoreBackup')) $('#restoreBackup').onclick = restoreBackup;
  $('#resetDemo').onclick = () => { localStorage.removeItem(LS_ADMIN_DATA); location.reload(); };
}
function render(){
  pack = data.packs.find(p=>p.id===data.activePackId) || data.packs[0];
  if($('#activePack')) $('#activePack').innerHTML = data.packs.map(p=>`<option value="${p.id}" ${p.id===pack.id?'selected':''}>${p.name}</option>`).join('');
  if($('#packName')) $('#packName').value = pack.name || '';
  if($('#packDescription')) $('#packDescription').value = pack.description || '';
  if($('#translation')) $('#translation').value = pack.translation || '';
  $('#previewLogo').innerHTML = `<img class="brandImg" src="${data.titleBarImage || DEFAULT_LOGO}" alt="Title image preview">`;
  $('#verseList').innerHTML = (pack.verses||[]).map(v=>`<div class="verseCard"><strong>${v.reference}</strong> <span class="pill">${v.category||''}</span><p>${v.text}</p><div class="buttonRow"><button onclick="editVerse('${v.id}')">Edit</button><button class="danger" onclick="deleteVerse('${v.id}')">Delete</button></div></div>`).join('');
  renderCollections();
}
function renderCollections(){
  ensureStarterCollection();
  $('#collectionSelect').innerHTML = data.collections.length ? data.collections.map(c=>`<option value="${c.id}">${isProtectedCollection(c) ? '🔒 ' : ''}${c.name} (${(c.verses||[]).length} verses)</option>`).join('') : '<option value="">No collections saved yet</option>';
  $('#collectionList').innerHTML = data.collections.map(c=>`<div class="collectionItem ${isProtectedCollection(c)?'protectedCollection':''}"><strong>${isProtectedCollection(c) ? '🔒 ' : ''}${c.name}</strong><br><small>${(c.verses||[]).length} verses saved${isProtectedCollection(c)?' • protected system collection':''}</small></div>`).join('') || '<p class="hint">No collections yet.</p>';
}
function saveCollection(){
  const name = $('#collectionName').value.trim();
  if(!name) return alert('Please enter a collection name.');
  const existing = data.collections.find(c=>c.name.toLowerCase()===name.toLowerCase());
  if(isProtectedCollection(existing)) return alert('The Starter Pack is protected and cannot be renamed or overwritten. Use Duplicate Collection first, then edit the copy.');
  const collection = { id: existing?.id || ('collection-' + Date.now()), name, protected:false, verses: JSON.parse(JSON.stringify(pack.verses||[])), translation: pack.translation || '' };
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
  if(isProtectedCollection(c)) return alert('The Starter Pack is protected and cannot be deleted.');
  if(confirm(`Delete collection "${c.name}"?`)){ data.collections = data.collections.filter(x=>x.id!==id); save(); }
}
function duplicateCollection(){
  const id = $('#collectionSelect').value; const c = data.collections.find(x=>x.id===id);
  if(!c) return alert('Choose a collection first.');
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = 'collection-' + Date.now();
  copy.name = isProtectedCollection(c) ? 'Starter Pack Copy' : `${c.name} Copy`;
  copy.protected = false;
  copy.system = false;
  data.collections.push(copy);
  save();
  alert(`Created "${copy.name}".`);
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
function backupFileName(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `VerseVault_Backup_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.json`;
}
function exportJson(){
  data.version = '1.08';
  const json = JSON.stringify(data,null,2);
  $('#jsonOutput').value = json;
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=backupFileName(); a.click(); URL.revokeObjectURL(url);
}
function validateBackup(obj){
  if(!obj || typeof obj !== 'object') throw new Error('The selected file is not a valid Verse Vault backup.');
  if(!Array.isArray(obj.packs)) throw new Error('Backup is missing verse pack data.');
  if(!obj.packs.some(p => Array.isArray(p.verses))) throw new Error('Backup does not contain any verses.');
  return true;
}
function restoreBackup(){
  const input = $('#restoreFile');
  const msg = $('#restoreMessage');
  if(!input || !input.files || !input.files[0]) return alert('Choose a JSON backup file first.');
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const restored = JSON.parse(reader.result);
      validateBackup(restored);
      if(!confirm('Restoring a backup will replace the current verses and collections on this device. Continue?')) return;
      const currentPassword = localStorage.getItem(LS_ADMIN_PASSWORD);
      data = restored;
      data.version = '1.08';
      data.collections = data.collections || [];
      ensureStarterCollection();
      localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data));
      if(currentPassword) localStorage.setItem(LS_ADMIN_PASSWORD, currentPassword);
      msg.className='ok'; msg.textContent='Backup restored successfully.';
      render();
    }catch(err){
      msg.className='bad'; msg.textContent=err.message || 'Restore failed.';
      alert(msg.textContent);
    }
  };
  reader.readAsText(input.files[0]);
}
async function copyJson(){
  const json = JSON.stringify(data,null,2); $('#jsonOutput').value=json;
  try{ await navigator.clipboard.writeText(json); alert('JSON copied.'); } catch(e){ alert('Copy failed. You can select the text manually.'); }
}
requireLogin();
