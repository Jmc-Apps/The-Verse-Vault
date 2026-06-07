const LS_ADMIN_DATA = 'bvq-admin-data-v1';
const LS_ADMIN_PASSWORD = 'vv-admin-password-v1';
const LS_GITHUB_SETTINGS = 'vv-github-settings-v1';
const LS_PENDING_LOGO = 'vv-pending-logo-v1';
const DEFAULT_LOGO = '../assets/default-title-logo.png';
const $ = s => document.querySelector(s);
let data, pack, pendingLogoDataUrl='';

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
  else data = await fetch('../data/verses.json?v=' + Date.now(), {cache:'no-store'}).then(r=>r.json());
  data.collections = data.collections || [];
  ensureStarterCollection();
  await loadAdminGlobalBranding();
  bind(); render();
}
function save(){ ensureStarterCollection(); data.version='1.22'; data.collections=data.collections||[]; localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data)); render(); }
function bind(){
  if($('#activePack')) $('#activePack').onchange = e => { data.activePackId=e.target.value; save(); };
  if($('#savePack')) $('#savePack').onclick = () => { pack.name=$('#packName').value; pack.description=$('#packDescription').value; pack.translation=$('#translation').value; save(); };
  if($('#saveCertificateName')) $('#saveCertificateName').onclick = () => { data.certificateCollectionName = $('#certificateCollectionName').value.trim(); save(); alert('Certificate name saved.'); };
  if($('#chooseLogo')) $('#chooseLogo').onclick = () => $('#logoUpload').click();
  $('#logoUpload').onchange = handleLogo;
  if($('#saveBrandingGithub')) $('#saveBrandingGithub').onclick = saveBrandingToGithub;
  $('#clearLogo').onclick = () => { data.titleBarImage=''; pendingLogoDataUrl=''; localStorage.removeItem(LS_PENDING_LOGO); save(); setBrandingMessage('Custom local preview removed. Use Restore Default Logo or save a new logo to GitHub for global changes.', true); };
  if($('#restoreLogo')) $('#restoreLogo').onclick = restoreDefaultLogoGlobal;
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
  if($('#saveGithubSettings')) $('#saveGithubSettings').onclick = saveGithubSettings;
  if($('#clearGithubSettings')) $('#clearGithubSettings').onclick = clearGithubSettings;
  if($('#loadGithubJson')) $('#loadGithubJson').onclick = loadGithubJson;
  if($('#saveGithubJson')) $('#saveGithubJson').onclick = saveGithubJson;
  $('#resetDemo').onclick = () => { localStorage.removeItem(LS_ADMIN_DATA); location.reload(); };
}
function normalizeAdminLogoSrc(src){
  src = String(src || '').trim();
  if(!src) return DEFAULT_LOGO;
  if(src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
  src = src.replace(/^\.\//, '').replace(/^\.\.\//, '');
  if(src.startsWith('admin/')) src = src.slice(6);
  if(src.startsWith('assets/') || src.startsWith('branding/')) return '../' + src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
  return src;
}
async function loadAdminGlobalBranding(){
  try{
    const r = await fetch('../data/branding.json?v=' + Date.now(), {cache:'no-store'});
    if(r.ok){
      const b = await r.json();
      const globalLogo = b.titleBarImage || b.logoPath || '';
      if(globalLogo) data.titleBarImage = globalLogo;
    }
  }catch(e){}
}
function currentAdminLogoSrc(){
  const src = pendingLogoDataUrl || localStorage.getItem(LS_PENDING_LOGO) || data.titleBarImage;
  if(!src) return '../assets/default-title-logo.png?v=' + Date.now();
  return normalizeAdminLogoSrc(src);
}
function refreshBrandingPreview(){
  const src = currentAdminLogoSrc();
  const html = `<img class="brandImg" src="${src}" alt="Current title logo preview" onerror="this.onerror=null;this.src='../assets/default-title-logo.png';">`;
  if($('#previewLogo')) $('#previewLogo').innerHTML = html;
  if($('#brandingLogoPreview')) $('#brandingLogoPreview').innerHTML = html;
}
function render(){
  pack = data.packs.find(p=>p.id===data.activePackId) || data.packs[0];
  if($('#activePack')) $('#activePack').innerHTML = data.packs.map(p=>`<option value="${p.id}" ${p.id===pack.id?'selected':''}>${p.name}</option>`).join('');
  if($('#packName')) $('#packName').value = pack.name || '';
  if($('#packDescription')) $('#packDescription').value = pack.description || '';
  if($('#translation')) $('#translation').value = pack.translation || '';
  if($('#certificateCollectionName')) $('#certificateCollectionName').value = data.certificateCollectionName || pack.certificateName || pack.name || '';
  renderGithubSettings();
  refreshBrandingPreview();
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
  reader.onload = () => {
    pendingLogoDataUrl = reader.result;
    localStorage.setItem(LS_PENDING_LOGO, pendingLogoDataUrl);
    data.titleBarImage = pendingLogoDataUrl;
    save();
    setBrandingMessage('Logo selected and previewed locally. Use Save Branding to GitHub to make it appear on other browsers.', true);
  };
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
  data.version = '1.22';
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
      data.version = '1.22';
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

function getGithubSettings(){
  try{ return JSON.parse(localStorage.getItem(LS_GITHUB_SETTINGS) || '{}'); }catch(e){ return {}; }
}
function setGithubMessage(text, good=false){
  const msg = $('#githubMessage');
  if(!msg) return;
  msg.className = good ? 'ok' : 'bad';
  msg.textContent = text || '';
}
function renderGithubSettings(){
  if(!$('#githubOwner')) return;
  const cfg = getGithubSettings();
  $('#githubOwner').value = cfg.owner || '';
  $('#githubRepo').value = cfg.repo || '';
  $('#githubBranch').value = cfg.branch || 'main';
  $('#githubPath').value = cfg.path || 'data/verses.json';
  $('#githubToken').value = cfg.token || '';
}
function readGithubForm(){
  return {
    owner: $('#githubOwner').value.trim(),
    repo: $('#githubRepo').value.trim(),
    branch: ($('#githubBranch').value.trim() || 'main'),
    path: ($('#githubPath').value.trim() || 'data/verses.json'),
    token: $('#githubToken').value.trim()
  };
}
function validateGithubConfig(cfg){
  if(!cfg.owner || !cfg.repo || !cfg.path || !cfg.branch) throw new Error('Enter GitHub owner, repository, branch and file path.');
  if(!cfg.token) throw new Error('Enter a GitHub token with Contents read/write permission.');
}

function setBrandingMessage(message, ok=false){
  const el = $('#brandingMessage');
  if(el){ el.textContent = message || ''; el.className = ok ? 'ok' : 'bad'; }
}
function githubContentUrl(cfg, path){
  return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${String(path).split('/').map(encodeURIComponent).join('/')}`;
}
async function githubGetContents(cfg, path, allowMissing=false){
  const url = githubContentUrl(cfg, path) + `?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, {headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${cfg.token}`,'X-GitHub-Api-Version':'2022-11-28'}});
  const json = await res.json().catch(()=>({}));
  if(!res.ok){
    if(allowMissing && res.status === 404) return null;
    throw new Error(json.message || `GitHub request failed for ${path}.`);
  }
  return json;
}
async function githubPutText(cfg, path, text, message){
  const current = await githubGetContents(cfg, path, true);
  const body = { message, content: encodeBase64Unicode(text), branch: cfg.branch };
  if(current && current.sha) body.sha = current.sha;
  const res = await fetch(githubContentUrl(cfg, path), {method:'PUT', headers:{'Accept':'application/vnd.github+json','Content-Type':'application/json','Authorization':`Bearer ${cfg.token}`,'X-GitHub-Api-Version':'2022-11-28'}, body: JSON.stringify(body)});
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.message || `GitHub save failed for ${path}.`);
  return json;
}
function dataUrlToBase64(dataUrl){
  const match = String(dataUrl || '').match(/^data:image\/png;base64,(.+)$/);
  if(!match) throw new Error('Please choose a PNG logo image first.');
  return match[1];
}
async function githubPutBase64(cfg, path, base64Content, message){
  const current = await githubGetContents(cfg, path, true);
  const body = { message, content: base64Content, branch: cfg.branch };
  if(current && current.sha) body.sha = current.sha;
  const res = await fetch(githubContentUrl(cfg, path), {method:'PUT', headers:{'Accept':'application/vnd.github+json','Content-Type':'application/json','Authorization':`Bearer ${cfg.token}`,'X-GitHub-Api-Version':'2022-11-28'}, body: JSON.stringify(body)});
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.message || `GitHub save failed for ${path}.`);
  return json;
}
async function saveBrandingToGithub(){
  const cfg = readGithubForm();
  try{
    validateGithubConfig(cfg);
    const logoData = pendingLogoDataUrl || localStorage.getItem(LS_PENDING_LOGO) || (String(data.titleBarImage||'').startsWith('data:image/png;base64,') ? data.titleBarImage : '');
    if(!logoData) throw new Error('Choose a PNG logo image first.');
    if(!confirm('Save this logo to GitHub so all browsers use it?')) return;
    setBrandingMessage('Uploading logo to GitHub...', true);
    const logoPath = 'branding/logo.png';
    await githubPutBase64(cfg, logoPath, dataUrlToBase64(logoData), 'Update Verse Vault global logo');
    const branding = { titleBarImage: logoPath, logoPath, updatedAt: new Date().toISOString() };
    await githubPutText(cfg, 'data/branding.json', JSON.stringify(branding, null, 2), 'Update Verse Vault global branding');
    data.titleBarImage = logoPath + '?v=' + Date.now();
    localStorage.removeItem(LS_PENDING_LOGO);
    pendingLogoDataUrl = '';
    localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data));
    render();
    setBrandingMessage('Branding saved to GitHub. Other browsers will use this logo after they load the app again.', true);
  }catch(err){ setBrandingMessage(err.message || 'Branding save failed.'); }
}

async function restoreDefaultLogoGlobal(){
  const cfg = readGithubForm();
  pendingLogoDataUrl = '';
  localStorage.removeItem(LS_PENDING_LOGO);
  data.titleBarImage = '';
  localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data));
  render();
  try{
    validateGithubConfig(cfg);
    if(!confirm('Restore the original Verse Vault title logo globally for all browsers?')) return;
    setBrandingMessage('Restoring original logo globally...', true);
    const branding = { titleBarImage: 'assets/default-title-logo.png', logoPath: 'assets/default-title-logo.png', updatedAt: new Date().toISOString(), restoredDefault: true };
    await githubPutText(cfg, 'data/branding.json', JSON.stringify(branding, null, 2), 'Restore Verse Vault default global branding');
    data.titleBarImage = 'assets/default-title-logo.png?v=' + Date.now();
    localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data));
    render();
    setBrandingMessage('Original title logo restored globally. Other browsers will use it after they load the app again.', true);
  }catch(err){
    setBrandingMessage('Original title logo restored on this device. To restore it globally, enter GitHub settings and try again. ' + (err.message || ''), false);
  }
}

function saveGithubSettings(){
  const cfg = readGithubForm();
  try{ validateGithubConfig(cfg); }catch(err){ setGithubMessage(err.message); return; }
  localStorage.setItem(LS_GITHUB_SETTINGS, JSON.stringify(cfg));
  setGithubMessage('GitHub settings saved on this device only.', true);
}
function clearGithubSettings(){
  if(!confirm('Clear saved GitHub settings and token from this device?')) return;
  localStorage.removeItem(LS_GITHUB_SETTINGS);
  renderGithubSettings();
  setGithubMessage('GitHub settings cleared.', true);
}
async function githubFetchContents(cfg){
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, {headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${cfg.token}`,'X-GitHub-Api-Version':'2022-11-28'}});
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.message || 'GitHub request failed.');
  return json;
}
function decodeBase64Unicode(value){
  const bin = atob(String(value || '').replace(/\n/g,''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function encodeBase64Unicode(value){
  const bytes = new TextEncoder().encode(value);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}
async function loadGithubJson(){
  const cfg = readGithubForm();
  try{
    validateGithubConfig(cfg);
    setGithubMessage('Loading online verses.json from GitHub...');
    const file = await githubFetchContents(cfg);
    const restored = JSON.parse(decodeBase64Unicode(file.content));
    validateBackup(restored);
    if(!confirm('Load the online GitHub verses.json into this Admin app? This replaces the current local admin data on this device.')) return;
    data = restored;
    data.version = '1.22';
    data.collections = data.collections || [];
    ensureStarterCollection();
    localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data));
    localStorage.setItem(LS_GITHUB_SETTINGS, JSON.stringify(cfg));
    setGithubMessage('Online verses.json loaded successfully.', true);
    render();
  }catch(err){ setGithubMessage(err.message || 'GitHub load failed.'); }
}
async function saveGithubJson(){
  const cfg = readGithubForm();
  try{
    validateGithubConfig(cfg);
    if(!confirm('Save the current Admin verses and collections to GitHub as data/verses.json?')) return;
    setGithubMessage('Checking current online file...');
    ensureStarterCollection();
    data.version = '1.22';
    const current = await githubFetchContents(cfg);
    const content = JSON.stringify(data, null, 2);
    const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path.split('/').map(encodeURIComponent).join('/')}`;
    const body = {
      message: `Update Verse Vault verses.json from Admin v1.22`,
      content: encodeBase64Unicode(content),
      sha: current.sha,
      branch: cfg.branch
    };
    const res = await fetch(url, {method:'PUT', headers:{'Accept':'application/vnd.github+json','Content-Type':'application/json','Authorization':`Bearer ${cfg.token}`,'X-GitHub-Api-Version':'2022-11-28'}, body: JSON.stringify(body)});
    const json = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(json.message || 'GitHub save failed.');
    localStorage.setItem(LS_ADMIN_DATA, JSON.stringify(data));
    localStorage.setItem(LS_GITHUB_SETTINGS, JSON.stringify(cfg));
    $('#jsonOutput').value = content;
    setGithubMessage('Saved online to GitHub. GitHub Pages may take a short moment to show the update.', true);
  }catch(err){ setGithubMessage(err.message || 'GitHub save failed.'); }
}

requireLogin();
