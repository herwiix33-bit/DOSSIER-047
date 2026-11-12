/* DOSSIER 047 v2 — client Supabase. Les opérations sensibles passent par Edge Function game-api. */
const { createClient } = supabase;
const cfg = window.D047_CONFIG || {};
const client = createClient(cfg.supabaseUrl, cfg.publishableKey);
const $ = s => document.querySelector(s);
const app = $('#app');
let teamToken = localStorage.getItem('d047_team_token') || '';
let teamId = localStorage.getItem('d047_team_id') || '';
let currentTeam = null, currentClue = null, poller = null, scanner = null, adminTabName='overview';
const api = async (action, payload={}) => {
  const {data:{session}} = await client.auth.getSession();
  const headers = {'Content-Type':'application/json','apikey':cfg.publishableKey};
  if(session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  if(teamToken) headers['x-team-token'] = teamToken;
  const res = await fetch(`${cfg.supabaseUrl}/functions/v1/game-api`, {method:'POST',headers,body:JSON.stringify({action,...payload})});
  const json = await res.json().catch(()=>({error:'Réponse serveur illisible'}));
  if(!res.ok || json.error) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
};
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const THEMES = { usa:{label:'USA',icon:'🇺🇸',prefix:'QR'}, cinema:{label:'Cinéma',icon:'🎬',prefix:'CIN'}, royaute:{label:'Royauté',icon:'👑',prefix:'ROY'} };
const themeLabel = key => `${THEMES[key]?.icon||'🎭'} ${THEMES[key]?.label||key||'Non défini'}`;
const fmt = sec => `${String(Math.floor(Math.max(0,sec)/60)).padStart(2,'0')}:${String(Math.max(0,sec)%60).padStart(2,'0')}`;
function modal(html){$('#modal-content').innerHTML=html;$('#modal').showModal()}
function err(e){modal(`<h2>Impossible de continuer</h2><p class="notice">${esc(e.message)}</p><button class="btn" onclick="document.querySelector('#modal').close()">Fermer</button>`)}
function goHome(){history.replaceState({},'',location.pathname);renderHome()}
async function route(){
 const code=new URLSearchParams(location.search).get('code');
 if(location.hash==='#admin') return adminGate();
 if(code) return openScannedClue(code.toUpperCase());
 if(teamToken){try{const r=await api('team-state');currentTeam=r.team;return renderTeam(r)}catch{localStorage.removeItem('d047_team_token');localStorage.removeItem('d047_team_id');teamToken='';teamId=''}}
 renderHome();
}
function renderHome(){
 app.innerHTML=`<section class="hero"><div><div class="eyebrow">DOSSIER D’ENQUÊTE · ACCÈS PUBLIC</div><h1>DOSSIER<br><span style="color:var(--red2)">047</span></h1><p>Un dossier confidentiel a disparu. Des preuves ont été disséminées sur le terrain. Votre équipe dispose de 30 minutes pour reconstituer les faits, identifier le responsable et ouvrir le coffre.</p><div class="actions"><button class="btn primary" id="join">Créer / rejoindre une équipe</button><button class="btn ghost" id="rules">Consulter les règles</button></div></div><div class="stamp">TOP SECRET<small>UNITÉ 047 · PIÈCE À CONVICTION</small></div></section><div class="grid"><div class="panel"><div class="eyebrow">Votre mission</div><h2>6 indices. 1 vérité.</h2><p class="muted small">Scannez les QR Codes sur le terrain. Chaque preuve vous rapproche du coffre.</p></div><div class="panel"><div class="eyebrow">Temps imparti</div><div class="timer">30:00</div><p class="muted small">Le temps démarre à l'enregistrement de votre équipe.</p></div></div><div class="section-head"><div><div class="eyebrow">ORGANISATION</div><h2>Centre de contrôle</h2></div></div><button class="btn ghost" id="admin-link">Accès organisateur →</button>`;
 $('#join').onclick=joinForm;$('#admin-link').onclick=()=>location.hash='admin';
 $('#rules').onclick=()=>modal(`<h2>Consignes aux enquêteurs</h2><ul class="muted"><li>Restez dans les zones autorisées.</li><li>Ne déplacez pas les indices.</li><li>Un téléphone par équipe est conseillé.</li><li>Le chronomètre démarre à l'enregistrement.</li><li>Aucun indice ne doit être placé dans un endroit dangereux.</li></ul>`);
}
function joinForm(){modal(`<div class="eyebrow">ENREGISTREMENT</div><h2>Créer votre équipe</h2><div class="field"><label for="team-name">Nom de l'équipe</label><input id="team-name" maxlength="24" placeholder="Les Inspecteurs"></div><fieldset class="theme-field"><legend>Choisissez votre thème <span class="required">(obligatoire)</span></legend><div class="theme-options"><label class="theme-option"><input type="radio" name="team-theme" value="usa"><span class="theme-icon">🇺🇸</span><strong>USA</strong><small>Voyage & mystères</small></label><label class="theme-option"><input type="radio" name="team-theme" value="cinema"><span class="theme-icon">🎬</span><strong>Cinéma</strong><small>Films & personnages</small></label><label class="theme-option"><input type="radio" name="team-theme" value="royaute"><span class="theme-icon">👑</span><strong>Royauté</strong><small>Rois & châteaux</small></label></div></fieldset><div class="field"><label for="session-code">Code de partie</label><input id="session-code" value="047-2026" maxlength="24"></div><button class="btn primary" id="create-team">Enregistrer l'équipe</button><p class="muted small">Conservez ce téléphone pendant toute la mission. Le code d'équipe est enregistré sur cet appareil.</p>`);
 $('#create-team').onclick=async()=>{try{const name=$('#team-name').value.trim(),sessionCode=$('#session-code').value.trim(),selected=document.querySelector('input[name="team-theme"]:checked');if(!name)throw new Error("Saisissez un nom d'équipe.");if(!selected)throw new Error('Choisissez un thème avant de continuer.');const r=await api('create-team',{team_name:name,session_code:sessionCode,theme:selected.value});teamToken=r.team_token;teamId=r.team.id;localStorage.setItem('d047_team_token',teamToken);localStorage.setItem('d047_team_id',teamId);$('#modal').close();await route()}catch(e){err(e)}};
 $('#modal-content').querySelectorAll('input[name="team-theme"]').forEach(input=>input.addEventListener('change',()=>{document.querySelectorAll('.theme-option').forEach(card=>card.classList.toggle('selected',card.querySelector('input').checked))}));
}
async function renderTeam(state){
 const t=state.team, progress=state.progress||[], total=state.total_clues||6;
 const solved=progress.filter(x=>x.solved_at).length, left=Math.max(0,state.remaining_seconds||0);
 app.innerHTML=`<section class="hero"><div><div class="eyebrow">MISSION ACTIVE · ${esc(t.team_name)} · ${esc(themeLabel(t.theme))}</div><h1>ENQUÊTE<br><span style="color:var(--red2)">EN COURS</span></h1><p>Votre équipe est enregistrée. Retrouvez les indices sur le terrain et reconstituez l'affaire.</p></div><div class="panel"><div class="eyebrow">TEMPS RESTANT</div><div class="timer" id="clock">${fmt(left)}</div><div class="progress"><span style="width:${Math.round(solved/Math.max(1,total)*100)}%"></span></div><p class="muted small">${solved} preuve(s) validée(s) sur ${total}</p></div></section><div class="section-head"><div><div class="eyebrow">TABLEAU DE PREUVES</div><h2>Votre progression</h2></div><button class="btn ghost" id="change-team">Changer d'équipe</button></div><div class="grid">${state.clues.map(c=>{const p=progress.find(x=>x.clue_code===c.code);return `<article class="clue-card"><div class="row"><div><span class="pill">${p?.solved_at?'VALIDÉ':p?.scanned_at?'CONSULTÉ':'À DÉCOUVRIR'}</span><h3>${esc(c.title)}</h3><p class="muted small">${esc(c.code)} · ${esc(c.media_type)}</p></div><b>${p?.solved_at?'✓':c.order_index}</b></div></article>`}).join('')}</div><div class="actions"><button class="btn primary" id="scan">Scanner un QR Code</button><button class="btn ghost" id="home">Accueil</button></div><p class="muted small">Le suivi est synchronisé avec le centre de contrôle. L'actualisation se fait automatiquement.</p>`;
 $('#change-team').onclick=()=>{if(confirm('Changer d’équipe sur cet appareil ?')){localStorage.removeItem('d047_team_token');localStorage.removeItem('d047_team_id');teamToken='';teamId='';clearInterval(poller);renderHome()}};
 $('#home').onclick=goHome;$('#scan').onclick=startScanner;
 clearInterval(poller);poller=setInterval(async()=>{try{const s=await api('team-state');currentTeam=s.team;const c=$('#clock');if(c)c.textContent=fmt(s.remaining_seconds)}catch(e){console.warn(e)}},5000);
}
async function startScanner(){
 modal(`<div class="eyebrow">LECTURE DES PREUVES</div><h2>Scanner un QR Code</h2><div id="qr-reader"></div><p class="muted small">Autorisez l'accès à la caméra. Le scanner nécessite HTTPS.</p><button class="btn ghost" id="stop-scan">Fermer le scanner</button>`);
 $('#stop-scan').onclick=()=>{if(scanner){scanner.stop().catch(()=>{});scanner=null}$('#modal').close()};
 try{scanner=new Html5Qrcode('qr-reader');await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:240,height:240}},async decoded=>{const u=new URL(decoded);const code=u.searchParams.get('code');if(code){await scanner.stop();scanner=null;$('#modal').close();await openScannedClue(code.toUpperCase())}},()=>{})}catch(e){modal(`<h2>Caméra indisponible</h2><p class="notice">${esc(e.message)}. Vérifiez les autorisations du navigateur et utilisez HTTPS.</p>`)}
}
async function openScannedClue(code){
 try{const r=await api('scan-clue',{code});currentClue=r.clue;renderClue(r)}catch(e){err(e)}
}
function mediaMarkup(c){
 if(!c.media_url)return `<p class="notice">Aucun média n'a encore été ajouté à cet indice.</p>`;
 const u=esc(c.media_url);
 if(c.media_type==='image')return `<img class="media" src="${u}" alt="Preuve photographique">`;
 if(c.media_type==='audio')return `<audio class="audio-player" controls src="${u}">Votre navigateur ne lit pas cet audio.</audio>`;
 if(c.media_type==='video')return `<video class="media" controls playsinline src="${u}">Votre navigateur ne lit pas cette vidéo.</video>`;
 if(c.media_type==='map')return `<p><a href="${u}" target="_blank" rel="noopener">Ouvrir la localisation / carte ↗</a></p>`;
 return '';
}
function renderClue(r){
 const c=r.clue;
 app.innerHTML=`<div class="section-head"><div><div class="eyebrow">PIÈCE À CONVICTION · ${esc(c.code)}</div><h1 style="font-size:clamp(42px,7vw,72px)">${esc(c.title)}</h1></div><span class="pill">${r.progress?.solved_at?'VALIDÉ':'NOUVEL INDICE'}</span></div><div class="panel"><p>${esc(c.description||'')}</p>${mediaMarkup(c)}${c.map_url?`<p><a href="${esc(c.map_url)}" target="_blank" rel="noopener">Ouvrir la carte ↗</a></p>`:''}<div class="field"><label>Votre réponse</label><input id="answer" autocomplete="off" placeholder="Saisir votre réponse"></div><button class="btn primary" id="submit-answer">Valider la réponse</button><button class="btn ghost" id="hint">Demander un indice</button><div id="feedback"></div></div><div class="actions"><button class="btn ghost" id="back-team">Retour à ma progression</button></div>`;
 $('#submit-answer').onclick=async()=>{try{const a=$('#answer').value.trim();if(!a)throw new Error('Saisissez une réponse.');const x=await api('submit-answer',{code:c.code,answer:a});$('#feedback').innerHTML=x.correct?'<p class="notice">✓ Bonne réponse ! Preuve validée.</p>':'<p class="notice">Ce n’est pas la bonne réponse. Continuez vos recherches.</p>'}catch(e){$('#feedback').innerHTML=`<p class="notice">${esc(e.message)}</p>`}};
 $('#hint').onclick=async()=>{try{const x=await api('request-hint',{code:c.code});$('#feedback').innerHTML=`<p class="notice">Indice : ${esc(x.hint||'Aucun indice supplémentaire configuré.')}</p>`}catch(e){$('#feedback').textContent=e.message}};
 $('#back-team').onclick=route;
}
async function adminGate(){
 const {data:{session}}=await client.auth.getSession();
 if(!session){app.innerHTML=`<div class="panel" style="max-width:520px;margin:auto"><div class="eyebrow">ACCÈS ORGANISATEUR</div><h1 style="font-size:54px">CENTRE DE<br>CONTRÔLE</h1><p class="muted">Connectez-vous avec le compte administrateur créé dans Supabase Authentication.</p><div class="field"><label>Adresse e-mail</label><input id="admin-email" type="email" autocomplete="username"></div><div class="field"><label>Mot de passe</label><input id="admin-password" type="password" autocomplete="current-password"></div><button class="btn primary" id="admin-login">Se connecter</button><p class="muted small">Le compte doit avoir été autorisé dans la table admin_users.</p></div>`;
 $('#admin-login').onclick=async()=>{try{const {error}=await client.auth.signInWithPassword({email:$('#admin-email').value,password:$('#admin-password').value});if(error)throw error;await adminGate()}catch(e){err(e)}};return}
 try{await api('admin-dashboard');adminPanel()}catch(e){app.innerHTML=`<div class="panel"><h2>Accès non autorisé</h2><p class="notice">${esc(e.message)}</p><p class="muted small">Connectez le compte Auth à la table admin_users avec le script SQL du guide.</p><button class="btn" id="logout">Déconnexion</button></div>`;$('#logout').onclick=async()=>{await client.auth.signOut();adminGate()}}
}
async function adminPanel(){
 app.innerHTML=`<div class="section-head"><div><div class="eyebrow">UNITÉ DES AFFAIRES CLASSÉES</div><h1 style="font-size:58px">CENTRE DE CONTRÔLE</h1></div><button class="btn ghost" id="logout">Déconnexion</button></div><nav class="admin-nav"><button class="btn active" data-tab="overview">Vue d'ensemble</button><button class="btn" data-tab="teams">Équipes</button><button class="btn" data-tab="clues">Énigmes & médias</button><button class="btn" data-tab="qr">QR Codes</button><button class="btn" data-tab="settings">Partie</button></nav><div id="admin-content"><p class="muted">Chargement…</p></div>`;
 $('#logout').onclick=async()=>{await client.auth.signOut();location.hash='';renderHome()};
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{adminTabName=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));loadAdminTab()});
 await loadAdminTab();clearInterval(poller);poller=setInterval(()=>loadAdminTab().catch(console.warn),5000);
}
async function loadAdminTab(){
 const el=$('#admin-content');if(!el)return;
 const data=await api('admin-dashboard');
 if(adminTabName==='overview'){
 const teams=data.teams||[];
 el.innerHTML=`<div class="grid grid-3"><div class="panel"><div class="eyebrow">ÉQUIPES</div><div class="timer">${teams.length}/4</div></div><div class="panel"><div class="eyebrow">EN COURS</div><div class="timer">${teams.filter(t=>t.status==='En cours').length}</div></div><div class="panel"><div class="eyebrow">TERMINÉES</div><div class="timer">${teams.filter(t=>t.status==='Terminée').length}</div></div></div><div class="section-head"><div><div class="eyebrow">SUIVI SYNCHRONISÉ · ACTUALISATION 5 S</div><h2>Progression des équipes</h2></div><button class="btn" id="refresh">Actualiser</button></div>${teams.length?`<div class="team-list">${teams.map(t=>`<article class="panel"><div class="team-admin-head"><div><span class="eyebrow">${esc(themeLabel(t.theme))} · ${esc(t.team_color||'ÉQUIPE')}</span><h3>${esc(t.team_name)}</h3></div><span class="pill">${esc(t.status)}</span></div><div class="stats"><div><span class="muted small">Progression</span><b>${t.solved}/${t.total_clues} (${t.percent}%)</b></div><div><span class="muted small">Temps restant</span><b>${fmt(t.remaining_seconds)}</b></div><div><span class="muted small">Scans</span><b>${t.scanned}</b></div></div><div class="progress"><span style="width:${t.percent}%"></span></div><p class="muted small">Indices validés : ${esc(t.solved_codes||'Aucun')}</p></article>`).join('')}</div>`:'<div class="empty">Aucune équipe inscrite pour le moment.</div>'}<p class="muted small">Les données proviennent de Supabase. Le tableau se rafraîchit automatiquement toutes les cinq secondes.</p>`;
 $('#refresh').onclick=loadAdminTab;
 }else if(adminTabName==='teams'){
 const teams=data.teams||[];
 el.innerHTML=`<div class="section-head"><div><div class="eyebrow">INSCRIPTIONS ET SUIVI</div><h2>Gestion des équipes</h2></div><button class="btn" id="refresh-teams">Actualiser</button></div><p class="notice">Les joueurs créent leur équipe depuis la page d'accueil du site avec le code de partie <b>047-2026</b>. Chaque inscription apparaît ici automatiquement. Maximum actuel : 4 équipes.</p><div class="grid grid-3"><div class="panel"><div class="eyebrow">INSCRITES</div><div class="timer">${teams.length}/4</div></div><div class="panel"><div class="eyebrow">EN COURS</div><div class="timer">${teams.filter(t=>t.status==='En cours').length}</div></div><div class="panel"><div class="eyebrow">TERMINÉES / TEMPS ÉCOULÉ</div><div class="timer">${teams.filter(t=>t.status!=='En cours').length}</div></div></div>${teams.length?`<div class="team-list">${teams.map(t=>`<article class="panel"><div class="team-admin-head"><div><span class="eyebrow">${esc(themeLabel(t.theme))} · ${esc(t.team_color||'ÉQUIPE')} · ${esc(t.id.slice(0,8))}</span><h3>${esc(t.team_name)}</h3></div><span class="pill">${esc(t.status)}</span></div><div class="stats"><div><span class="muted small">Énigmes validées</span><b>${t.solved}/${t.total_clues}</b></div><div><span class="muted small">Temps restant</span><b>${fmt(t.remaining_seconds)}</b></div><div><span class="muted small">QR consultés</span><b>${t.scanned}</b></div></div><div class="progress"><span style="width:${t.percent}%"></span></div><p class="muted small">Réponses validées : ${esc(t.solved_codes||'Aucune pour le moment')}</p><p class="muted small">Inscription : ${t.started_at?new Date(t.started_at).toLocaleString('fr-FR'):'—'}</p>${t.status==='Terminée'?'':'<div class="actions"><button class="btn danger" data-finish-team="'+esc(t.id)+'">Terminer cette équipe</button></div>'}</article>`).join('')}</div>`:'<div class="empty">Aucune équipe inscrite pour le moment.<br>Les équipes apparaîtront ici dès leur inscription depuis un téléphone.</div>'}<p class="muted small">Actualisation automatique toutes les cinq secondes. Les données sont centralisées dans Supabase.</p>`;
 $('#refresh-teams').onclick=loadAdminTab;
 el.querySelectorAll('[data-finish-team]').forEach(b=>b.onclick=async()=>{if(!confirm('Terminer cette équipe ? Son chronomètre sera arrêté.'))return;try{await api('admin-finish-team',{team_id:b.dataset.finishTeam});await loadAdminTab()}catch(e){err(e)}});
 }else if(adminTabName==='clues'){
 el.innerHTML=`<div class="section-head"><div><div class="eyebrow">CONTENUS DU PARCOURS</div><h2>Énigmes & médias</h2></div></div>${data.clues.map(c=>`<article class="panel" style="margin-bottom:12px"><div class="row"><div><span class="pill">${esc(c.code)}</span><h3>${esc(c.title)}</h3></div><button class="btn" data-edit="${esc(c.code)}">Modifier</button></div><p class="muted small">${esc(c.media_type)} · ${c.is_active?'Actif':'Désactivé'} · ${esc(c.media_url||'Aucun média')}</p></article>`).join('')}`;
 el.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editClue(data.clues.find(c=>c.code===b.dataset.edit)));
 }else if(adminTabName==='qr'){
 el.innerHTML=`<div class="section-head"><div><div class="eyebrow">CODES INDIVIDUELS PERMANENTS</div><h2>QR Codes du parcours</h2></div><div class="actions"><button class="btn primary" id="add-qr">+ Ajouter un QR Code</button><button class="btn" id="print-qr">Imprimer les QR Codes</button></div></div><p class="notice">18 codes répartis par thème. Les codes déjà imprimés conservent leur adresse. Modifiez leur contenu sans changer leur identifiant.</p><div class="field"><label>Filtrer par thème</label><select id="qr-theme-filter"><option value="all">Tous les thèmes</option><option value="usa">🇺🇸 USA</option><option value="cinema">🎬 Cinéma</option><option value="royaute">👑 Royauté</option></select></div><div class="qr-grid" id="qr-grid">${data.clues.map(c=>`<div class="qr-card"><div class="eyebrow">${esc(themeLabel(c.theme))}</div><h3>${esc(c.code)} — ${esc(c.title)}</h3><div class="qr-image" id="qr-${esc(c.code)}"></div><div class="qr-target"></div><div class="qr-admin-status">${c.is_active?'ACTIF':'DÉSACTIVÉ'}</div></div>`).join('')}</div>`;
 data.clues.forEach(c=>{const box=$('#qr-'+c.code);if(box){const target=location.origin+location.pathname+'?code='+encodeURIComponent(c.code);const img=document.createElement('img');img.width=150;img.height=150;img.alt='QR Code '+c.code;img.loading='lazy';img.referrerPolicy='no-referrer';img.src='https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data='+encodeURIComponent(target);img.onerror=()=>{box.innerHTML='<span class="muted small">QR indisponible — vérifiez la connexion Internet</span>'};box.replaceChildren(img);box.parentElement.querySelector('.qr-target').textContent=target}})
 $('#print-qr').onclick=()=>window.print();
 $('#add-qr').onclick=()=>addClueForm(data.clues);
 $('#qr-theme-filter').onchange=()=>{const v=$('#qr-theme-filter').value;el.querySelectorAll('.qr-card').forEach((card,i)=>card.style.display=v==='all'||data.clues[i].theme===v?'':'none')};
 }else{
 el.innerHTML=`<div class="panel"><div class="eyebrow">SESSION</div><h2>${esc(data.session?.name||'DOSSIER 047')}</h2><p class="muted">Code de partie : <b>${esc(data.session?.session_code||'')}</b> · État : <b>${esc(data.session?.status||'')}</b></p><div class="actions"><button class="btn primary" id="start-game">Démarrer la partie</button><button class="btn danger" id="finish-game">Terminer la partie</button></div><p class="notice">Les chronomètres des équipes commencent lors de leur inscription. Pour une session collective, démarrez la partie avant de laisser les équipes s'inscrire.</p></div>`;
 $('#start-game').onclick=async()=>{try{await api('admin-session',{status:'running'});await loadAdminTab()}catch(e){err(e)}};
 $('#finish-game').onclick=async()=>{try{await api('admin-session',{status:'finished'});await loadAdminTab()}catch(e){err(e)}};
 }
}
function nextClueCode(clues,theme){
 const prefix=THEMES[theme]?.prefix||'QR';
 const used=new Set((clues||[]).map(c=>String(c.code).toUpperCase()));
 let n=1;while(used.has(`${prefix}${String(n).padStart(2,'0')}`))n++;
 return `${prefix}${String(n).padStart(2,'0')}`;
}
function addClueForm(clues){
 modal(`<div class="eyebrow">NOUVELLE PIÈCE À CONVICTION</div><h2>Ajouter un QR Code</h2>
 <div class="field"><label>Thème</label><select id="new-theme"><option value="usa">🇺🇸 USA</option><option value="cinema">🎬 Cinéma</option><option value="royaute">👑 Royauté</option></select></div>
 <p class="notice">Le code permanent est généré automatiquement. Son adresse ne changera plus après impression.</p>
 <div class="field"><label>Code permanent</label><input id="new-code" readonly></div>
 <div class="field"><label>Titre</label><input id="new-title" maxlength="100" placeholder="Titre de la nouvelle énigme"></div>
 <div class="field"><label>Texte / consigne</label><textarea id="new-desc" placeholder="Contenu présenté aux joueurs"></textarea></div>
 <div class="field"><label>Type de média</label><select id="new-type">${['text','image','audio','video','map'].map(x=>`<option value="${x}">${x}</option>`).join('')}</select></div>
 <div class="field"><label>URL publique du média (facultatif)</label><input id="new-url" placeholder="https://..."></div>
 <div class="field"><label>Réponse attendue</label><input id="new-answer" placeholder="Réponse exacte"></div>
 <div class="field"><label>Indice supplémentaire</label><textarea id="new-hint"></textarea></div>
 <label><input id="new-active" type="checkbox" checked> Indice actif</label>
 <div class="actions"><button class="btn primary" id="create-clue">Créer le QR Code</button></div>`);
 const updateCode=()=>$('#new-code').value=nextClueCode(clues,$('#new-theme').value);
 $('#new-theme').onchange=updateCode;updateCode();
 $('#create-clue').onclick=async()=>{try{const title=$('#new-title').value.trim();if(!title)throw new Error('Saisissez un titre pour cette énigme.');await api('admin-create-clue',{theme:$('#new-theme').value,code:$('#new-code').value,title,description:$('#new-desc').value,media_type:$('#new-type').value,media_url:$('#new-url').value,answer:$('#new-answer').value,hint:$('#new-hint').value,is_active:$('#new-active').checked});$('#modal').close();await loadAdminTab()}catch(e){err(e)}};
}
function editClue(c){
 modal(`<div class="eyebrow">ÉDITION · ${esc(c.code)}</div><h2>${esc(c.title)}</h2><p class="notice">Thème : ${esc(themeLabel(c.theme))} · Code permanent : ${esc(c.code)}</p><div class="field"><label>Titre</label><input id="cl-title" value="${esc(c.title)}"></div><div class="field"><label>Texte / consigne</label><textarea id="cl-desc">${esc(c.description||'')}</textarea></div><div class="field"><label>Type de média</label><select id="cl-type">${['text','image','audio','video','map'].map(x=>`<option ${c.media_type===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>URL publique du média</label><input id="cl-url" value="${esc(c.media_url||'')}" placeholder="https://..."></div><div class="field"><label>URL de carte (facultatif)</label><input id="cl-map" value="${esc(c.map_url||'')}"></div><div class="field"><label>Réponse attendue (gardée côté serveur)</label><input id="cl-answer" type="password" placeholder="Nouvelle réponse ou laisser vide"></div><div class="field"><label>Indice supplémentaire</label><textarea id="cl-hint">${esc(c.hint||'')}</textarea></div><label><input id="cl-active" type="checkbox" ${c.is_active?'checked':''}> Indice actif</label><div class="actions"><button class="btn primary" id="save-clue">Enregistrer</button></div>`);
 $('#save-clue').onclick=async()=>{try{await api('admin-save-clue',{code:c.code,title:$('#cl-title').value,description:$('#cl-desc').value,media_type:$('#cl-type').value,media_url:$('#cl-url').value,map_url:$('#cl-map').value,answer:$('#cl-answer').value,hint:$('#cl-hint').value,is_active:$('#cl-active').checked});$('#modal').close();await loadAdminTab()}catch(e){err(e)}};
}
window.addEventListener('hashchange',route);
route().catch(err);
