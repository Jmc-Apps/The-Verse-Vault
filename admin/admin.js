const LS_ADMIN_DATA = 'bvq-admin-data-v1';
const $ = s => document.querySelector(s);
let data, pack;
async function init(){
  const local = localStorage.getItem(LS_ADMIN_DATA);
  if(local) data = JSON.parse(local);
  else data = await fetch('../data/verses.json').then(r=>r.json());
  bind(); render();
}
function save(){ localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data)); render(); }
function bind(){
  $('#appTitle').oninput = e => { data.appTitle=e.target.value; save(); };
  $('#activePack').onchange = e => { data.activePackId=e.target.value; save(); };
  $('#savePack').onclick = () => { pack.name=$('#packName').value; pack.description=$('#packDescription').value; pack.translation=$('#translation').value; save(); };
  $('#logoUpload').onchange = handleLogo;
  $('#clearLogo').onclick = () => { data.titleBarImage=''; save(); };
  $('#saveVerse').onclick = saveVerse;
  $('#newVerse').onclick = clearVerseForm;
  $('#exportJson').onclick = exportJson;
  $('#copyJson').onclick = copyJson;
  $('#resetDemo').onclick = () => { localStorage.removeItem(LS_ADMIN_DATA); location.reload(); };
}
function render(){
  pack = data.packs.find(p=>p.id===data.activePackId) || data.packs[0];
  $('#appTitle').value = data.appTitle || '';
  $('#activePack').innerHTML = data.packs.map(p=>`<option value="${p.id}" ${p.id===pack.id?'selected':''}>${p.name}</option>`).join('');
  $('#packName').value = pack.name || '';
  $('#packDescription').value = pack.description || '';
  $('#translation').value = pack.translation || '';
  $('#previewLogo').innerHTML = data.titleBarImage ? `<img class="brandImg" src="${data.titleBarImage}" alt="Title bar image preview">` : '';
  $('#verseList').innerHTML = pack.verses.map(v=>`<div class="panel"><strong>${v.reference}</strong> <span class="pill">${v.category||''}</span><p>${v.text}</p><div class="buttonRow"><button onclick="editVerse('${v.id}')">Edit</button><button class="danger" onclick="deleteVerse('${v.id}')">Delete</button></div></div>`).join('');
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
function deleteVerse(id){
  if(confirm('Delete this verse?')){ pack.verses = pack.verses.filter(v=>v.id!==id); save(); }
}
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
init();
