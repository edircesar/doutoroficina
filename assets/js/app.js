// ══ API ENDPOINTS ══
const API_URL = 'api/';

// ══ AUTH & USER SYSTEM ══
let currentUser = null;
let myComplaints = [];

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.remove('show');
  
  try {
    const res = await fetch(API_URL + 'auth_login.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email, senha: pass })
    });
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    
    currentUser = data.user;
    loginSuccess(currentUser);
  } catch(e) {
    errEl.textContent = e.message || 'E-mail ou senha incorretos.';
    errEl.classList.add('show');
  }
}

async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const errEl = document.getElementById('register-error');
  errEl.classList.remove('show');
  
  try {
    const res = await fetch(API_URL + 'auth_register.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ nome: name, email, senha: pass })
    });
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    
    currentUser = data.user;
    loginSuccess(currentUser);
  } catch(e) {
    errEl.textContent = e.message || 'Erro ao criar conta.';
    errEl.classList.add('show');
  }
}

function logout() {
  fetch(API_URL + 'auth_logout.php').then(() => {
    currentUser = null;
    document.getElementById('user-dropdown')?.classList.remove('open');
    updateNavAuth();
    showPage('home');
  });
}

// ══ RECLAMAÇÕES API ══
async function submitComplaint() {
  if (!currentUser) { closeModal(); openAuth('login'); return; }
  
  const brandEl = document.getElementById('sel-brand');
  const modelEl = document.getElementById('sel-model');
  const yearEl  = document.getElementById('sel-year');
  const typeBtn = document.querySelector('.vtype-btn.active');
  
  const complaint = {
    vehicle_brand: brandEl.options[brandEl.selectedIndex]?.text || '—',
    vehicle_model: modelEl.options[modelEl.selectedIndex]?.text || '—',
    vehicle_year:  yearEl.options[yearEl.selectedIndex]?.text || '',
    vehicle_type:  typeBtn?.getAttribute('onclick')?.includes('motos') ? 'moto' : typeBtn?.getAttribute('onclick')?.includes('caminhoes') ? 'caminhao' : 'carro',
    category:  selectedCatVal || 'Outro',
    title:     document.getElementById('inp-title').value || 'Reclamação',
    text:      document.getElementById('inp-desc').value || '',
    state:     document.getElementById('sel-state').value || null,
    km:        document.getElementById('inp-km').value || null
  };
  
  try {
    const res = await fetch(API_URL + 'save_complaint.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(complaint)
    });
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    
    document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-success').classList.add('active');
  } catch(e) {
    alert(e.message || 'Erro ao salvar reclamação. Tente novamente.');
  }
}

// ══ MOCK / STUBS OVERRIDES PARA NÃO QUEBRAR O RESTO ══
async function applyFilters() {
  const status = document.getElementById('filter-status').value;
  const brand  = document.getElementById('filter-brand').value;
  const state  = document.getElementById('filter-state').value;
  let filtered = [...mockComplaints];
  if(status) filtered = filtered.filter(c => c.status === status);
  if(brand) filtered = filtered.filter(c => c.brand === brand);
  if(state) filtered = filtered.filter(c => c.tags.includes(state));
  renderComplaintsList(filtered);
}

async function renderProfile() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('profile-avatar-big').textContent = initials;
  document.getElementById('profile-name-big').textContent = currentUser.name;
  document.getElementById('profile-email-big').textContent = currentUser.email;
  
  document.getElementById('profile-count').textContent = '0';
  document.getElementById('profile-votes-total').textContent = '0';
  document.getElementById('profile-resolved').textContent = '0';
  const list = document.getElementById('my-complaints-list');
  list.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;text-align:center">
      As reclamações reais da API serão listadas aqui futuramente.<br>
      <button class="btn-primary" style="margin-top:16px;font-size:13px;padding:10px 20px" onclick="requireAuth()">🚨 Fazer primeira reclamação</button>
    </div>`;
}

function toggleVote(btn, id, current) {
  if (!currentUser) { openAuth('login'); return; }
  const span = btn.querySelector('span') || btn;
  if(btn.classList.contains('voted')){
      btn.classList.remove('voted');
      span.textContent = parseInt(span.textContent) - 1;
  } else {
      btn.classList.add('voted');
      span.textContent = parseInt(span.textContent) + 1;
  }
}

window.sbGetSession = async function() {
    try {
      const res = await fetch(API_URL + 'auth_check.php');
      const data = await res.json();
      if(data.user) {
         currentUser = data.user;
         updateNavAuth();
      }
    } catch(e) {}
}

window.sbLoadComplaints = async function() {
  try {
    const r = await fetch('api/get_complaints.php');
    const d = await r.json();
    if (d.error) return [];
    
    return d.map(c => {
      let emoji = '🚗';
      if (c.tipo_veiculo === 'motos') emoji = '🏍️';
      if (c.tipo_veiculo === 'caminhoes') emoji = '🚚';
      
      let statusClass = 's-open';
      let statusLabel = 'Aberto';
      if (c.status === 'andamento') { statusClass = 's-progress'; statusLabel = 'Em análise'; }
      if (c.status === 'resolvido') { statusClass = 's-resolved'; statusLabel = 'Resolvido'; }
      
      return {
        emoji: emoji,
        brand: c.marca,
        model: `${c.modelo} ${c.ano}`,
        title: c.titulo,
        text: c.descricao,
        status: statusClass,
        statusLabel: statusLabel,
        date: new Date(c.created_at).toLocaleDateString('pt-BR'),
        tags: [c.categoria],
        votes: 0
      };
    });
  } catch(e) {
    console.error(e);
    return [];
  }
}

// ══ DADOS MOCK ══
const mockVehicles=[
  {id:'1',emoji:'🚗',brand:'Toyota',name:'Corolla',version:'2.0 XEi CVT',year:'2022',rating:4.1,count:312,badge:'Confiável',badgeClass:'badge-green',problems:['Consumo acima do esperado','Câmbio','Suspensão']},
  {id:'2',emoji:'🚗',brand:'Volkswagen',name:'Gol',version:'1.0 MPI Trendline',year:'2021',rating:3.2,count:541,badge:'Moderado',badgeClass:'badge-yellow',problems:['Motor','Elétrica','Freios']},
  {id:'3',emoji:'🚗',brand:'Hyundai',name:'HB20',version:'1.0 TGDi Platinum',year:'2023',rating:2.8,count:734,badge:'Crítico',badgeClass:'badge-red',problems:['Motor','Transmissão','Ar-condicionado']},
  {id:'4',emoji:'🏍️',brand:'Honda',name:'CG 160',version:'160 Fan ES',year:'2023',rating:4.5,count:189,badge:'Confiável',badgeClass:'badge-green',problems:['Elétrica','Freios']},
  {id:'5',emoji:'🚗',brand:'Chevrolet',name:'Onix',version:'1.0 Turbo Premier',year:'2022',rating:3.5,count:823,badge:'Moderado',badgeClass:'badge-yellow',problems:['Motor','Câmbio']},
  {id:'6',emoji:'🚗',brand:'Fiat',name:'Argo',version:'1.3 Drive GSR',year:'2023',rating:3.8,count:267,badge:'Moderado',badgeClass:'badge-yellow',problems:['Ar-condicionado','Elétrica']},
  {id:'7',emoji:'🏍️',brand:'Yamaha',name:'Fazer 250',version:'250 ABS',year:'2022',rating:4.2,count:143,badge:'Confiável',badgeClass:'badge-green',problems:['Freios']},
  {id:'8',emoji:'🚗',brand:'Jeep',name:'Compass',version:'2.0 Diesel S AT9 4x4',year:'2022',rating:2.5,count:489,badge:'Crítico',badgeClass:'badge-red',problems:['Transmissão','Elétrica','Motor']},
  {id:'9',emoji:'🚚',brand:'Volkswagen',name:'Constellation',version:'24.280 6x2',year:'2022',rating:3.4,count:198,badge:'Moderado',badgeClass:'badge-yellow',problems:['Motor','Transmissão','Suspensão']},
  {id:'10',emoji:'🚚',brand:'Mercedes-Benz',name:'Actros',version:'2651 6x4',year:'2021',rating:3.8,count:124,badge:'Moderado',badgeClass:'badge-yellow',problems:['Elétrica','Freios']},
  {id:'11',emoji:'🚚',brand:'Scania',name:'R 450',version:'A6x2 NB Highline',year:'2023',rating:4.0,count:87,badge:'Confiável',badgeClass:'badge-green',problems:['Suspensão','Freios']},
];
let mockComplaints = [];
const rankingData=[
  {pos:1,emoji:'🏍️',brand:'Honda',name:'CG 160',score:4.5},
  {pos:2,emoji:'🚗',brand:'Toyota',name:'Corolla',score:4.1},
  {pos:3,emoji:'🏍️',brand:'Yamaha',name:'Fazer 250',score:4.2},
  {pos:4,emoji:'🚗',brand:'Fiat',name:'Argo',score:3.8},
  {pos:5,emoji:'🚗',brand:'Chevrolet',name:'Onix',score:3.5},
  {pos:6,emoji:'🚗',brand:'Volkswagen',name:'Gol',score:3.2},
  {pos:7,emoji:'🚗',brand:'Hyundai',name:'HB20',score:2.8},
  {pos:8,emoji:'🚗',brand:'Jeep',name:'Compass',score:2.5},
];
const fipePrices={'1':'R$ 142.990','2':'R$ 61.490','3':'R$ 78.900','4':'R$ 18.590','5':'R$ 79.990','6':'R$ 84.290','7':'R$ 22.890','8':'R$ 212.990','9':'R$ 398.000','10':'R$ 620.000','11':'R$ 580.000'};

// ══ RENDER ══
function starsHtml(r){let s='';for(let i=1;i<=5;i++)s+=i<=Math.round(r)?'★':'☆';return s}

function getVehicleCardHtml(v) {
  const resolved = Math.round(55 + v.rating * 5);
  const trend = v.rating >= 4 ? '📈 Estável' : v.rating >= 3 ? '⚠️ +8% este mês' : '🔴 +15% este mês';
  const trendClass = v.rating >= 4 ? 'green' : v.rating >= 3 ? 'orange' : 'red';
  const barColor = v.rating >= 4 ? 'var(--green)' : v.rating >= 3 ? 'var(--yellow)' : 'var(--red)';
  const trustPct = Math.round(v.rating / 5 * 100);
  return `
  <div class="vehicle-card" onclick="showVehicleProfile('${v.id}')">
    <div class="vc-top">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="vc-emoji">${v.emoji}</span>
        <div class="vc-name">${v.name}</div>
      </div>
      <span class="vc-badge ${v.badgeClass}">${v.badge}</span>
    </div>
    <div class="vc-brand">${v.brand} · ${v.year}</div>
    <div class="vc-version">${v.version}</div>
    <div class="vc-rating"><span class="stars">${starsHtml(v.rating)}</span><span class="star-val">${v.rating.toFixed(1)}</span></div>
    <div class="vc-count">${v.count.toLocaleString('pt-BR')} reclamações</div>
    <div class="vc-divider"></div>
    <div class="vc-info-grid">
      <div class="vc-info-item">
        <span class="vc-info-label">⚠️ Mais relatado</span>
        <span class="vc-info-value red">${v.problems[0]}</span>
      </div>
      <div class="vc-info-item">
        <span class="vc-info-label">✅ Resolvidas</span>
        <span class="vc-info-value green">${resolved}%</span>
      </div>
      <div class="vc-info-item" style="grid-column:1/-1">
        <span class="vc-info-label">📈 Tendência</span>
        <span class="vc-info-value ${trendClass}">${trend}</span>
      </div>
    </div>
    <div class="vc-trust-bar">
      <div class="vc-trust-label">
        <span class="vc-trust-text">📊 Confiabilidade</span>
        <span class="vc-trust-pct">${trustPct}%</span>
      </div>
      <div class="vc-trust-bg"><div class="vc-trust-fill" style="width:${trustPct}%;background:${barColor}"></div></div>
    </div>
    <div class="vc-price">
      <span class="price-label">Tabela FIPE</span>
      <span class="price-loading" id="fipe-card-${v.id}">carregando…</span>
    </div>
  </div>`;
}

function renderVehicles(limit = 5){
  const list = limit ? mockVehicles.slice(0, limit) : mockVehicles;
  document.getElementById('vehicles-grid').innerHTML=list.map(v=>getVehicleCardHtml(v)).join('');
  mockVehicles.forEach(v=>{
    setTimeout(()=>{
      const el=document.getElementById('fipe-card-'+v.id);
      if(el){el.className='price-val';el.textContent=fipePrices[v.id]||'—'}
    },300+Math.random()*700);
  });
}

function renderComplaints(){
  document.getElementById('complaints-list').innerHTML=mockComplaints.map(c=>`
    <div class="complaint-card">
      <div class="cc-top">
        <div class="cc-vehicle">
          <span class="cc-emoji">${c.emoji}</span>
          <div><div class="cc-vname">${c.model}</div><div class="cc-vbrand">${c.brand}</div></div>
        </div>
        <div class="cc-meta">
          <span class="cc-status ${c.status}">${c.statusLabel}</span>
          <span class="cc-date">${c.date}</span>
        </div>
      </div>
      <div class="cc-title">${c.title}</div>
      <div class="cc-text">${c.text}</div>
      <div class="cc-footer">
        <div class="cc-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="cc-votes">👍 ${c.votes} acham útil</div>
      </div>
    </div>`).join('');
}

function renderRanking(){
  document.getElementById('ranking-grid').innerHTML=rankingData.map(r=>{
    const pc=r.pos<=3?`pos-${r.pos}`:'pos-o';
    const medal=r.pos<=3?['🥇','🥇','🥇'][r.pos-1]:r.pos;
    return`<div class="rank-item" onclick="showVehicleProfile('${r.pos}')">
      <span class="rank-pos ${pc}">${medal}</span>
      <div class="rank-info"><div class="rank-name">${r.emoji} ${r.name}</div><div class="rank-brand">${r.brand}</div></div>
      <div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar" style="width:${(r.score/5*100).toFixed(0)}%"></div></div></div>
      <span class="rank-score">${r.score.toFixed(1)}</span>
    </div>`;
  }).join('');
}

// ══ VEHICLE PROFILE ══
function showVehicleProfile(id){
  const v=mockVehicles.find(x=>x.id===id)||mockVehicles[0];
  showPage('vehicle');
  const probBars=v.problems.map((p,i)=>{
    const pcts=[85,62,41];const colors=['bar-red','bar-orange','bar-yellow'];
    const counts=[v.count,Math.floor(v.count*.73),Math.floor(v.count*.48)];
    return`<div class="problem-item">
      <span class="prob-name">${p}</span>
      <div class="prob-bar-wrap"><div class="prob-bar-bg"><div class="prob-bar ${colors[i]||'bar-yellow'}" style="width:${pcts[i]||30}%"></div></div></div>
      <span class="prob-count">${counts[i]}</span>
    </div>`;
  }).join('');
  const distData=[{s:5,v:12},{s:4,v:22},{s:3,v:18},{s:2,v:28},{s:1,v:20}];
  const distBars=distData.map(d=>`<div class="dist-row">
    <span class="dist-label">${d.s}★</span>
    <div class="dist-bar-bg"><div class="dist-bar" style="width:${d.v}%"></div></div>
    <span class="dist-count">${d.v}%</span>
  </div>`).join('');
  const vClass=v.rating>=4?'':'verdict-'+(v.rating>=3?'warn':'danger');
  const vIcon=v.rating>=4?'✅':v.rating>=3?'⚠️':'🚨';
  const vText=v.rating>=4
    ?`<strong>Recomendado.</strong> ${v.name} tem boa reputação entre os proprietários. Problemas são pontuais e de baixa gravidade.`
    :v.rating>=3
    ?`<strong>Atenção.</strong> ${v.name} apresenta reclamações relevantes. Exija garantia estendida.`
    :`<strong>Alerta alto.</strong> ${v.name} concentra muitas reclamações graves. Considere alternativas.`;

  document.getElementById('vehicle-profile-content').innerHTML=`
    <div class="profile-hero">
      <div class="profile-left">
        <span class="profile-emoji">${v.emoji}</span>
        <div class="profile-brand-label">${v.brand}</div>
        <div class="profile-name">${v.name}</div>
        <div class="profile-sub">${v.version} · ${v.year} · ${v.emoji==='🏍️'?'Moto':'Automóvel'}</div>
        <div class="profile-rating">
          <span class="big-stars">${starsHtml(v.rating)}</span>
          <span class="big-score">${v.rating.toFixed(1)}</span>
          <span class="profile-rcount">(${v.count.toLocaleString('pt-BR')} avaliações)</span>
        </div>
        <div class="profile-tags">
          <span class="ptag">${v.badge}</span>
          ${v.problems.map(p=>`<span class="ptag">${p}</span>`).join('')}
        </div>
      </div>
      <div class="profile-right">
        <div class="info-card">
          <div class="ic-label">💰 Tabela FIPE</div>
          <div class="ic-value">${fipePrices[id]||'R$ —'}</div>
          <div class="ic-sub">Referência maio/2025</div>
        </div>
        <div class="info-card">
          <div class="ic-label">📋 Reclamações</div>
          <div class="ic-value ic-value-red">${v.count.toLocaleString('pt-BR')}</div>
          <div class="ic-sub">68% resolvidas</div>
        </div>
        <button class="btn-primary" style="width:100%;justify-content:center" onclick="requireAuth()">🚨 Reclamar deste veículo</button>
      </div>
    </div>
    <div class="profile-grid">
      <div>
        <div class="profile-card">
          <div class="pc-title"><span class="dot"></span>Problemas mais relatados</div>
          <div class="problems-list">${probBars}</div>
        </div>
        <div class="profile-card">
          <div class="pc-title"><span class="dot"></span>Reclamações recentes</div>
          ${mockComplaints.slice(0,3).map(c=>`
            <div class="complaint-card" style="margin-bottom:10px;background:var(--bg)">
              <div class="cc-top">
                <div><div class="cc-vname">${c.title}</div><div class="cc-vbrand">${c.date}</div></div>
                <span class="cc-status ${c.status}">${c.statusLabel}</span>
              </div>
              <div class="cc-text">${c.text.slice(0,110)}…</div>
              <div class="cc-footer">
                <div class="cc-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
                <div class="cc-votes">👍 ${c.votes}</div>
              </div>
            </div>`).join('')}
        </div>
        <!-- BUSCA WEB IA -->
        <div class="web-search-card">
          <div class="web-search-header">
            <div class="web-search-title">
              🌐 Busca na internet
              <span class="web-search-badge">IA</span>
            </div>
            <button class="web-search-btn" id="ws-btn-${v.id}" onclick="searchWebComplaints('${v.brand} ${v.name}','${v.id}')">
              🔍 Buscar reclamações
            </button>
          </div>
          <div class="web-search-loading" id="ws-loading-${v.id}">
            <span class="ai-spinner"></span>
            Pesquisando reclamações de <strong>${v.brand} ${v.name}</strong> na internet…
          </div>
          <div id="ws-results-${v.id}">
            <div style="color:var(--muted);font-size:13px;text-align:center;padding:12px 0">
              Clique em "Buscar reclamações" para pesquisar na internet e combinar com os dados da plataforma.
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="profile-card">
          <div class="pc-title"><span class="dot"></span>Distribuição de notas</div>
          <div class="dist-bars">${distBars}</div>
        </div>
        <div class="profile-card">
          <div class="pc-title"><span class="dot"></span>Veredicto da comunidade</div>
          <div class="verdict ${vClass}"><span class="verdict-icon">${vIcon}</span><span class="verdict-text">${vText}</span></div>
        </div>
        <div class="profile-card">
          <div class="pc-title"><span class="dot"></span>Comparar preço na tabela FIPE</div>
          <div class="fipe-row">
            <select class="form-select" id="cmp-brand" onchange="loadCmpModels()"><option>Carregando marcas…</option></select>
            <select class="form-select" id="cmp-model" disabled onchange="loadCmpYears()"><option>Selecione a marca</option></select>
            <select class="form-select" id="cmp-year" disabled onchange="loadCmpPrice()"><option>Selecione o modelo</option></select>
          </div>
          <div class="fipe-info" id="fipe-cmp" style="margin-top:12px">
            <div>
              <div class="fipe-label">💰 Preço médio FIPE</div>
              <div class="fipe-price" id="fipe-cmp-val">—</div>
              <div class="fipe-label" id="fipe-cmp-ref" style="margin-top:2px">—</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  loadFipeBrandsInto('cmp-brand','carros');
}

// ══ FIPE API ══
const FIPE='https://parallelum.com.br/fipe/api/v1';
let vehicleType='carros';
let selectedCatVal='';

async function loadBrands(type='carros'){
  vehicleType = type === 'caminhoes' ? 'caminhoes' : type;
  const s=document.getElementById('sel-brand');
  s.innerHTML='<option>Carregando...</option>';s.disabled=true;
  try{
    const r=await fetch(`${FIPE}/${type}/marcas`);
    const d=await r.json();
    s.innerHTML='<option value="">Selecione a marca</option>'+d.map(m=>`<option value="${m.codigo}">${m.nome}</option>`).join('');
    s.disabled=false;
  }catch(e){s.innerHTML='<option>Erro ao carregar</option>';s.disabled=false;}
}

async function loadModels(){
  const brand=document.getElementById('sel-brand').value;
  const ms=document.getElementById('sel-model');
  const ys=document.getElementById('sel-year');
  if(!brand){ms.disabled=true;return}
  ms.innerHTML='<option>Carregando...</option>';ms.disabled=true;
  ys.innerHTML='<option>Selecione o modelo</option>';ys.disabled=true;
  document.getElementById('fipe-info').classList.remove('show');
  try{
    const r=await fetch(`${FIPE}/${vehicleType}/marcas/${brand}/modelos`);
    const d=await r.json();
    ms.innerHTML='<option value="">Selecione o modelo</option>'+d.modelos.map(m=>`<option value="${m.codigo}">${m.nome}</option>`).join('');
    ms.disabled=false;
  }catch(e){ms.innerHTML='<option>Erro</option>';}
}

async function loadYears(){
  const brand=document.getElementById('sel-brand').value;
  const model=document.getElementById('sel-model').value;
  const ys=document.getElementById('sel-year');
  if(!model){ys.disabled=true;return}
  ys.innerHTML='<option>Carregando...</option>';ys.disabled=true;
  document.getElementById('fipe-info').classList.remove('show');
  try{
    const r=await fetch(`${FIPE}/${vehicleType}/marcas/${brand}/modelos/${model}/anos`);
    const d=await r.json();
    ys.innerHTML='<option value="">Selecione o ano</option>'+d.map(a=>`<option value="${a.codigo}">${a.nome}</option>`).join('');
    ys.disabled=false;
  }catch(e){ys.innerHTML='<option>Erro</option>';}
}

async function loadFipePrice(){
  const b=document.getElementById('sel-brand').value;
  const m=document.getElementById('sel-model').value;
  const y=document.getElementById('sel-year').value;
  if(!y)return;
  document.getElementById('fipe-info').classList.remove('show');
  document.getElementById('fipe-price-val').textContent='Carregando…';
  try{
    const r=await fetch(`${FIPE}/${vehicleType}/marcas/${b}/modelos/${m}/anos/${y}`);
    const d=await r.json();
    document.getElementById('fipe-price-val').textContent=d.Valor||'—';
    document.getElementById('fipe-ref').textContent='Ref: '+(d.MesReferencia||'—');
    document.getElementById('fipe-info').classList.add('show');
  }catch(e){}
}

async function loadFipeBrandsInto(selId,type){
  const s=document.getElementById(selId);if(!s)return;
  try{
    const r=await fetch(`${FIPE}/${type}/marcas`);
    const d=await r.json();
    s.innerHTML='<option value="">Selecione a marca</option>'+d.map(m=>`<option value="${m.codigo}">${m.nome}</option>`).join('');
    s.disabled=false;
  }catch(e){}
}

async function loadCmpModels(){
  const b=document.getElementById('cmp-brand')?.value;
  const ms=document.getElementById('cmp-model');
  const ys=document.getElementById('cmp-year');
  if(!b||!ms)return;
  ms.innerHTML='<option>Carregando...</option>';ms.disabled=true;ys.disabled=true;
  try{
    const r=await fetch(`${FIPE}/carros/marcas/${b}/modelos`);
    const d=await r.json();
    ms.innerHTML='<option value="">Selecione o modelo</option>'+d.modelos.map(m=>`<option value="${m.codigo}">${m.nome}</option>`).join('');
    ms.disabled=false;
  }catch(e){}
}

async function loadCmpYears(){
  const b=document.getElementById('cmp-brand')?.value;
  const m=document.getElementById('cmp-model')?.value;
  const ys=document.getElementById('cmp-year');
  if(!m||!ys)return;
  ys.innerHTML='<option>Carregando...</option>';ys.disabled=true;
  try{
    const r=await fetch(`${FIPE}/carros/marcas/${b}/modelos/${m}/anos`);
    const d=await r.json();
    ys.innerHTML='<option value="">Selecione o ano</option>'+d.map(a=>`<option value="${a.codigo}">${a.nome}</option>`).join('');
    ys.disabled=false;
  }catch(e){}
}

async function loadCmpPrice(){
  const b=document.getElementById('cmp-brand')?.value;
  const m=document.getElementById('cmp-model')?.value;
  const y=document.getElementById('cmp-year')?.value;
  if(!y)return;
  try{
    const r=await fetch(`${FIPE}/carros/marcas/${b}/modelos/${m}/anos/${y}`);
    const d=await r.json();
    document.getElementById('fipe-cmp-val').textContent=d.Valor||'—';
    document.getElementById('fipe-cmp-ref').textContent='Ref: '+(d.MesReferencia||'—');
    document.getElementById('fipe-cmp').classList.add('show');
  }catch(e){}
}

// ══ MODAL ══
let currentStep=0,selectedRating=0;
function openModal(){
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow='hidden';
  goStep(0);loadBrands('carros');
}
function closeModal(){
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow='';
}
document.getElementById('modal').addEventListener('click',function(e){if(e.target===this)closeModal()});

function goStep(n){
  document.querySelectorAll('.modal-step').forEach((s,i)=>s.classList.toggle('active',i===n));
  for(let i=0;i<3;i++)document.getElementById('dot'+i).classList.toggle('done',i<=n);
  currentStep=n;
  if(n===2)updateSummary();
}

function selectVehicleType(btn,type){
  document.querySelectorAll('.vtype-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadBrands(type);
  const ms=document.getElementById('sel-model');
  const ys=document.getElementById('sel-year');
  ms.innerHTML='<option>Selecione a marca</option>';ms.disabled=true;
  ys.innerHTML='<option>Selecione o modelo</option>';ys.disabled=true;
  document.getElementById('fipe-info').classList.remove('show');
}

function selectCat(btn,cat){
  document.querySelectorAll('#step1 .category-grid .cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');selectedCatVal=cat;
}

function setRating(n){
  selectedRating=n;
  document.querySelectorAll('.star-btn').forEach((b,i)=>b.classList.toggle('active',i<n));
}

function updateSummary(){
  const be=document.getElementById('sel-brand');
  const me=document.getElementById('sel-model');
  const ye=document.getElementById('sel-year');
  const bText=be.options[be.selectedIndex]?.text||'—';
  const mText=me.options[me.selectedIndex]?.text||'—';
  const yText=ye.options[ye.selectedIndex]?.text||'—';
  const title=document.getElementById('inp-title').value||'—';
  document.getElementById('confirm-summary').innerHTML=`
    <div style="font-family:var(--font);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;font-weight:700">Resumo da reclamação</div>
    <div style="display:flex;flex-direction:column;gap:7px;font-size:13.5px">
      <div><span style="color:var(--muted);font-weight:600">Veículo:</span> <strong style="color:var(--navy)">${bText} ${mText} ${yText}</strong></div>
      <div><span style="color:var(--muted);font-weight:600">Categoria:</span> <strong style="color:var(--navy)">${selectedCatVal||'—'}</strong></div>
      <div><span style="color:var(--muted);font-weight:600">Título:</span> <strong style="color:var(--navy)">${title}</strong></div>
      <div><span style="color:var(--muted);font-weight:600">Nota:</span> <strong>${'⭐'.repeat(selectedRating)||'—'}</strong></div>
    </div>`;
}

function submitComplaint(){
  document.querySelectorAll('.modal-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('step-success').classList.add('active');
}

// ══ BUSCA WEB COM IA ══
async function searchWebComplaints(vehicle, id) {
  const btn = document.getElementById(`ws-btn-${id}`);
  const loading = document.getElementById(`ws-loading-${id}`);
  const results = document.getElementById(`ws-results-${id}`);

  btn.disabled = true;
  btn.innerHTML = `<span class="ai-spinner"></span> Buscando…`;
  loading.classList.add('show');
  results.innerHTML = '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `Você é um assistente especializado em buscar reclamações e problemas de veículos no Brasil.
Ao receber um modelo de veículo, busque na internet reclamações, problemas comuns e relatos de proprietários.
Responda APENAS em JSON válido, sem markdown, sem texto extra, com esta estrutura:
{
  "summary": "Resumo geral em 2-3 frases sobre os principais problemas encontrados",
  "results": [
    {
      "title": "Título do problema encontrado",
      "text": "Descrição do problema em 1-2 frases",
      "source": "Nome da fonte (ex: Reclame Aqui, Fórum do Carro, etc)",
      "tags": ["tag1", "tag2"]
    }
  ]
}
Retorne entre 3 e 5 resultados relevantes. Foque em problemas reais e recentes.`,
        messages: [{
          role: 'user',
          content: `Busque reclamações e problemas relatados por proprietários do ${vehicle} no Brasil. Inclua problemas mecânicos, elétricos, de atendimento e garantia.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content.map(i => i.text || '').filter(Boolean).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    loading.classList.remove('show');
    btn.disabled = false;
    btn.innerHTML = '🔄 Atualizar busca';

    let html = '';

    // Resumo da IA
    if (parsed.summary) {
      html += `<div class="web-summary">
        <div class="web-summary-label">🤖 Resumo da IA</div>
        <div class="web-summary-text">${parsed.summary}</div>
      </div>`;
    }

    // Resultados da plataforma (mock) + web
    const platformComplaints = [...mockComplaints, ...myComplaints].slice(0, 2);
    const allResults = [
      ...platformComplaints.map(c => ({ ...c, isPlatform: true })),
    ];

    // Cards da plataforma
    allResults.forEach(c => {
      html += `<div class="web-result-item">
        <div class="web-result-header">
          <div class="web-result-title">${c.title}</div>
          <span class="web-result-source source-platform">✅ Doutor Oficina</span>
        </div>
        <div class="web-result-text">${c.text.slice(0, 120)}…</div>
        <div class="web-result-footer">
          ${c.tags.map(t => `<span class="web-result-tag">${t}</span>`).join('')}
        </div>
      </div>`;
    });

    // Cards da web
    html += '<div class="web-search-results">';
    parsed.results.forEach(r => {
      html += `<div class="web-result-item">
        <div class="web-result-header">
          <div class="web-result-title">${r.title}</div>
          <span class="web-result-source source-web">🌐 ${r.source}</span>
        </div>
        <div class="web-result-text">${r.text}</div>
        <div class="web-result-footer">
          ${(r.tags || []).map(t => `<span class="web-result-tag">${t}</span>`).join('')}
        </div>
      </div>`;
    });
    html += '</div>';

    results.innerHTML = html;

  } catch (e) {
    loading.classList.remove('show');
    btn.disabled = false;
    btn.innerHTML = '🔍 Buscar reclamações';
    results.innerHTML = `<div style="color:var(--red);font-size:13px;padding:8px 0">
      Erro ao buscar. Verifique sua conexão e tente novamente.
    </div>`;
  }
}

// ══ ROUTING ══
function showPage(page){
  ['home','vehicle','profile','compare','all-vehicles','all-complaints','full-ranking'].forEach(p=>{
    const el=document.getElementById('page-'+p);
    if(el) el.style.display=p===page?'block':'none';
  });
  window.scrollTo({top:0,behavior:'smooth'});
  if(page==='profile') renderProfile();
  if(page==='compare') initCompare();
  if(page==='all-vehicles') renderAllVehicles();
  if(page==='all-complaints') renderAllComplaints();
  if(page==='full-ranking') renderFullRanking();
}

function checkLoginAndShowAllVehicles() {
  if (!currentUser) {
    openAuth('login');
  } else {
    showPage('all-vehicles');
  }
}

function renderAllVehicles() {
  const grid = document.getElementById('all-vehicles-grid');
  if (!grid) return;
  grid.innerHTML = mockVehicles.map(v => getVehicleCardHtml(v)).join('');
  
  mockVehicles.forEach(v => {
    setTimeout(() => {
      const el = document.getElementById('fipe-card-' + v.id);
      if (el) { el.className = 'price-val'; el.textContent = fipePrices[v.id] || '—' }
    }, 300 + Math.random() * 700);
  });
}

function checkLoginAndShowAllComplaints() {
  if (!currentUser) {
    openAuth('login');
  } else {
    showPage('all-complaints');
  }
}

function renderAllComplaints() {
  renderComplaintsList([...mockComplaints, ...myComplaints], null, 'all-complaints-list');
}

function checkLoginAndShowFullRanking() {
  if (!currentUser) {
    openAuth('login');
  } else {
    showPage('full-ranking');
  }
}

function renderFullRanking() {
  const grid = document.getElementById('all-ranking-grid');
  if (!grid) return;
  grid.innerHTML = rankingData.map(r => {
    const pc = r.pos <= 3 ? `pos-${r.pos}` : 'pos-o';
    const medal = r.pos <= 3 ? ['🥇', '🥈', '🥉'][r.pos - 1] : r.pos;
    return `<div class="rank-item" onclick="showVehicleProfile('${r.pos}')">
      <span class="rank-pos ${pc}">${medal}</span>
      <div class="rank-info"><div class="rank-name">${r.emoji} ${r.name}</div><div class="rank-brand">${r.brand}</div></div>
      <div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar" style="width:${(r.score / 5 * 100).toFixed(0)}%"></div></div></div>
      <span class="rank-score">${r.score.toFixed(1)}</span>
    </div>`;
  }).join('');
}

// ══ SEARCH BAR ══
const suggestions = [
  'HB20','Onix','Corolla','Gol','Compass','Argo','CG 160','Fazer 250',
  'Kwid','Pulse','Tracker','T-Cross','Renegade','Creta','City','Fit',
  'Civic','Yaris','Hilux','S10','Strada','Toro'
];

function switchSearchTab(btn, tab) {
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.search-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('stab-' + tab).classList.add('active');
  if (tab === 'fipe') sbLoadBrands();
}

function renderSuggestions(val) {
  const box = document.getElementById('search-suggestions');
  if (!val || val.length < 1) {
    const top = suggestions.slice(0, 10);
    box.innerHTML = top.map(s =>
      `<span class="sug-tag" onclick="document.getElementById('search-free-input').value='${s}';renderSuggestions('${s}')">${s}</span>`
    ).join('');
    return;
  }
  const filtered = suggestions.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0, 8);
  box.innerHTML = filtered.map(s =>
    `<span class="sug-tag" onclick="document.getElementById('search-free-input').value='${s}';renderSuggestions('${s}')">${s}</span>`
  ).join('');
}

function doFreeSearch() {
  const val = document.getElementById('search-free-input').value.trim();
  if (!val) return;
  const found = mockVehicles.find(v =>
    v.name.toLowerCase().includes(val.toLowerCase()) ||
    v.brand.toLowerCase().includes(val.toLowerCase())
  );
  if (found) showVehicleProfile(found.id);
  else alert('Nenhum resultado encontrado para "' + val + '".\nEm breve mais modelos serão indexados!');
}

// Inicializa sugestões padrão
setTimeout(() => renderSuggestions(''), 300);

// ── FIPE SEARCH BAR ──
async function sbLoadBrands() {
  const type = document.getElementById('sb-type').value;
  const bSel = document.getElementById('sb-brand');
  const mSel = document.getElementById('sb-model');
  const ySel = document.getElementById('sb-year');
  bSel.innerHTML = '<option>Carregando…</option>'; bSel.disabled = true;
  mSel.innerHTML = '<option>Selecione a marca</option>'; mSel.disabled = true;
  ySel.innerHTML = '<option>Selecione o modelo</option>'; ySel.disabled = true;
  document.getElementById('sb-fipe-result').classList.remove('show');
  try {
    const r = await fetch(`${FIPE}/${type}/marcas`);
    const d = await r.json();
    bSel.innerHTML = '<option value="">Selecione a marca</option>' +
      d.map(m => `<option value="${m.codigo}">${m.nome}</option>`).join('');
    bSel.disabled = false;
  } catch(e) { bSel.innerHTML = '<option>Erro ao carregar</option>'; }
}

async function sbLoadModels() {
  const type = document.getElementById('sb-type').value;
  const brand = document.getElementById('sb-brand').value;
  const mSel = document.getElementById('sb-model');
  const ySel = document.getElementById('sb-year');
  if (!brand) return;
  mSel.innerHTML = '<option>Carregando…</option>'; mSel.disabled = true;
  ySel.innerHTML = '<option>Selecione o modelo</option>'; ySel.disabled = true;
  document.getElementById('sb-fipe-result').classList.remove('show');
  try {
    const r = await fetch(`${FIPE}/${type}/marcas/${brand}/modelos`);
    const d = await r.json();
    mSel.innerHTML = '<option value="">Selecione o modelo</option>' +
      d.modelos.map(m => `<option value="${m.codigo}">${m.nome}</option>`).join('');
    mSel.disabled = false;
  } catch(e) { mSel.innerHTML = '<option>Erro</option>'; }
}

async function sbLoadYears() {
  const type = document.getElementById('sb-type').value;
  const brand = document.getElementById('sb-brand').value;
  const model = document.getElementById('sb-model').value;
  const ySel = document.getElementById('sb-year');
  if (!model) return;
  ySel.innerHTML = '<option>Carregando…</option>'; ySel.disabled = true;
  document.getElementById('sb-fipe-result').classList.remove('show');
  try {
    const r = await fetch(`${FIPE}/${type}/marcas/${brand}/modelos/${model}/anos`);
    const d = await r.json();
    ySel.innerHTML = '<option value="">Selecione o ano</option>' +
      d.map(a => `<option value="${a.codigo}">${a.nome}</option>`).join('');
    ySel.disabled = false;
  } catch(e) { ySel.innerHTML = '<option>Erro</option>'; }
}

async function sbShowPrice() {
  const type = document.getElementById('sb-type').value;
  const brand = document.getElementById('sb-brand').value;
  const model = document.getElementById('sb-model').value;
  const year = document.getElementById('sb-year').value;
  if (!year) return;
  const res = document.getElementById('sb-fipe-result');
  res.innerHTML = '<span style="color:var(--muted);font-size:13px">Carregando…</span>';
  res.classList.add('show');
  try {
    const r = await fetch(`${FIPE}/${type}/marcas/${brand}/modelos/${model}/anos/${year}`);
    const d = await r.json();
    const brandTxt = document.getElementById('sb-brand').options[document.getElementById('sb-brand').selectedIndex]?.text || '';
    const modelTxt = document.getElementById('sb-model').options[document.getElementById('sb-model').selectedIndex]?.text || '';
    res.innerHTML = `
      <div class="sbr-item"><span class="sbr-label">Veículo</span><span class="sbr-value">${brandTxt} ${modelTxt}</span></div>
      <div class="sbr-item"><span class="sbr-label">Ano</span><span class="sbr-value">${d.AnoModelo}</span></div>
      <div class="sbr-item"><span class="sbr-label">Combustível</span><span class="sbr-value">${d.Combustivel||'—'}</span></div>
      <div class="sbr-item"><span class="sbr-label">💰 Preço FIPE</span><span class="sbr-value sbr-green">${d.Valor}</span></div>
      <div class="sbr-item"><span class="sbr-label">Referência</span><span class="sbr-value" style="font-size:13px;color:var(--muted)">${d.MesReferencia}</span></div>
    `;
  } catch(e) { res.innerHTML = '<span style="color:var(--red)">Erro ao buscar</span>'; }
}

function doFipeSearch() {
  const brand = document.getElementById('sb-brand').value;
  const model = document.getElementById('sb-model').value;
  if (!brand || !model) { alert('Selecione ao menos a marca e o modelo.'); return; }
  const modelTxt = document.getElementById('sb-model').options[document.getElementById('sb-model').selectedIndex]?.text || '';
  const found = mockVehicles.find(v => v.name.toLowerCase().includes(modelTxt.split(' ')[0].toLowerCase()));
  if (found) showVehicleProfile(found.id);
  else sbShowPrice();
}

// ══ AUTH SYSTEM ══
let users = JSON.parse(localStorage.getItem('do_users') || '[]');
let votedIds = JSON.parse(localStorage.getItem('do_voted') || '[]');

function saveData() {
  localStorage.setItem('do_users', JSON.stringify(users));
  localStorage.setItem('do_complaints', JSON.stringify(myComplaints));
  localStorage.setItem('do_voted', JSON.stringify(votedIds));
}

function openAuth(tab='login') {
  switchAuth(tab);
  document.getElementById('auth-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Copia logo para o modal
  const srcImg = document.querySelector('header img');
  const wrap = document.getElementById('auth-logo-wrap');
  if (srcImg && wrap) wrap.innerHTML = `<img src="${srcImg.src}" style="height:65px;width:auto;" alt="Doutor Oficina"/>`;
}
function closeAuth() {
  document.getElementById('auth-modal').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('auth-modal').addEventListener('click', function(e) {
  if (e.target === this) closeAuth();
});

function switchAuth(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('register-error').classList.remove('show');
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  
  try {
    const r = await fetch('api/auth_login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: pass })
    });
    const d = await r.json();
    
    if (d.error) {
      document.getElementById('login-error').textContent = d.error;
      document.getElementById('login-error').classList.add('show');
      return;
    }
    
    loginSuccess(d.user);
  } catch(e) {
    console.error(e);
  }
}

async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  
  if (!name || !email || pass.length < 6) {
    document.getElementById('register-error').textContent = 'Preencha todos os campos (senha mín. 6 caracteres).';
    document.getElementById('register-error').classList.add('show');
    return;
  }
  
  try {
    const r = await fetch('api/auth_register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: name, email, senha: pass })
    });
    const d = await r.json();
    
    if (d.error) {
      document.getElementById('register-error').textContent = d.error;
      document.getElementById('register-error').classList.add('show');
      return;
    }
    
    alert(d.message);
    closeAuth();
  } catch(e) {
    console.error(e);
  }
}

function doSocialLogin(provider) {
  alert('Login social com ' + provider + ' ainda não configurado.');
}

function showForgotPanel() {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-forgot').classList.add('active');
}

async function doForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  const errBox = document.getElementById('forgot-error');
  const sucBox = document.getElementById('forgot-success');
  
  errBox.style.display = 'none';
  sucBox.style.display = 'none';
  
  if (!email) {
    errBox.textContent = 'Preencha o e-mail.';
    errBox.style.display = 'block';
    return;
  }
  
  try {
    const r = await fetch('api/auth_forgot.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const d = await r.json();
    
    sucBox.textContent = d.message;
    sucBox.style.display = 'block';
  } catch(e) {
    console.error(e);
  }
}

async function doReset() {
  const pass = document.getElementById('reset-pass').value;
  const errBox = document.getElementById('reset-error');
  
  errBox.style.display = 'none';
  
  if (pass.length < 6) {
    errBox.textContent = 'Senha deve ter no mínimo 6 caracteres.';
    errBox.style.display = 'block';
    return;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('reset_token');
  
  try {
    const r = await fetch('api/auth_reset.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, senha: pass })
    });
    const d = await r.json();
    
    if (d.error) {
      errBox.textContent = d.error;
      errBox.style.display = 'block';
      return;
    }
    
    alert(d.message);
    window.location.href = './';
  } catch(e) {
    console.error(e);
  }
}

function loginSuccess(user) {
  currentUser = user;
  closeAuth();
  updateNavAuth();
  // Se tinha pendente uma reclamação, abre o modal
  if (pendingComplaint) { pendingComplaint = false; openModal(); }
}

function logout() {
  currentUser = null;
  updateNavAuth();
  showPage('home');
  document.getElementById('user-dropdown').classList.remove('open');
}

function updateNavAuth() {
  const area = document.getElementById('nav-auth-area');
  if (currentUser) {
    const initials = currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    area.innerHTML = `
      <div class="nav-user">
        <span class="nav-user-name">${currentUser.name.split(' ')[0]}</span>
        <div class="nav-avatar" onclick="toggleDropdown()">${initials}</div>
        <div class="user-dropdown" id="user-dropdown">
          <button class="udrop-item" onclick="showPage('profile')">👤 Meu perfil</button>
          <button class="udrop-item" onclick="showPage('compare')">⚖️ Comparar veículos</button>
          <div class="udrop-divider"></div>
          <button class="udrop-item" onclick="requireAuth()">🚨 Nova reclamação</button>
          <div class="udrop-divider"></div>
          <button class="udrop-item" onclick="logout()">🚪 Sair</button>
        </div>
      </div>`;
  } else {
    area.innerHTML = `
      <a class="nav-link" href="#" onclick="openAuth('login')">Entrar</a>
      <button class="btn-nav-reclamar" onclick="requireAuth()">+ Reclamar</button>`;
  }
}

function toggleDropdown() {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const dd = document.getElementById('user-dropdown');
  if (dd && !dd.closest('.nav-user')?.contains(e.target)) dd.classList.remove('open');
});

// Verifica se usuário logou, senão pede login antes de reclamar
let pendingComplaint = false;
function requireAuth() {
  if (currentUser) { openModal(); }
  else { pendingComplaint = true; openAuth('login'); }
}

// ══ PERFIL ══
function renderProfile() {
  if (!currentUser) return;
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('profile-avatar-big').textContent = initials;
  document.getElementById('profile-name-big').textContent = currentUser.name;
  document.getElementById('profile-email-big').textContent = currentUser.email;
  const mine = myComplaints.filter(c => c.userId === currentUser.id);
  document.getElementById('profile-count').textContent = mine.length;
  document.getElementById('profile-votes-total').textContent = mine.reduce((s,c)=>s+c.votes,0);
  document.getElementById('profile-resolved').textContent = mine.filter(c=>c.status==='s-resolved').length;
  const list = document.getElementById('my-complaints-list');
  if (!mine.length) {
    list.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;text-align:center">
      Você ainda não fez nenhuma reclamação.<br>
      <button class="btn-primary" style="margin-top:16px;font-size:13px;padding:10px 20px" onclick="requireAuth()">🚨 Fazer primeira reclamação</button>
    </div>`; return;
  }
  list.innerHTML = mine.map(c => `
    <div class="complaint-card">
      <div class="cc-top">
        <div class="cc-vehicle">
          <span class="cc-emoji">${c.emoji}</span>
          <div><div class="cc-vname">${c.model}</div><div class="cc-vbrand">${c.brand} · ${c.year}</div></div>
        </div>
        <span class="cc-status ${c.status}">${c.statusLabel}</span>
      </div>
      <div class="cc-title">${c.title}</div>
      <div class="cc-text">${c.text}</div>
      <div class="cc-footer">
        <div class="cc-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="cc-votes">👍 ${c.votes}</div>
      </div>
    </div>`).join('');
}

// ══ FILTROS ══
function applyFilters() {
  const status = document.getElementById('filter-status').value;
  const brand = document.getElementById('filter-brand').value;
  const state = document.getElementById('filter-state').value;
  let filtered = [...mockComplaints, ...myComplaints];
  if (status) filtered = filtered.filter(c => c.status === status);
  if (brand) filtered = filtered.filter(c => c.brand === brand);
  if (state) filtered = filtered.filter(c => c.tags.includes(state));
  renderComplaintsList(filtered);
}
function clearFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-brand').value = '';
  document.getElementById('filter-state').value = '';
  renderComplaintsList(mockComplaints);
}

function renderComplaintsList(list, limit = 3, targetId = 'complaints-list') {
  const displayList = limit ? list.slice(0, limit) : list;
  const el = document.getElementById(targetId);
  if (!el) return;
  el.innerHTML = displayList.map((c,i) => `
    <div class="complaint-card">
      <div class="cc-top">
        <div class="cc-vehicle">
          <span class="cc-emoji">${c.emoji}</span>
          <div><div class="cc-vname">${c.model}</div><div class="cc-vbrand">${c.brand}</div></div>
        </div>
        <div class="cc-meta">
          <span class="cc-status ${c.status}">${c.statusLabel}</span>
          <span class="cc-date">${c.date}</span>
        </div>
      </div>
      <div class="cc-title">${c.title}</div>
      <div class="cc-text">${c.text}</div>
      <div class="cc-footer">
        <div class="cc-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <button class="vote-btn ${votedIds.includes(c.id||i)?'voted':''}" onclick="toggleVote(this,'${c.id||i}',${c.votes})">
          👍 <span>${c.votes}</span>
        </button>
      </div>
    </div>`).join('');
}

// ══ VOTOS ══
function toggleVote(btn, id, current) {
  if (!currentUser) { openAuth('login'); return; }
  const span = btn.querySelector('span');
  if (votedIds.includes(id)) {
    votedIds = votedIds.filter(v => v !== id);
    btn.classList.remove('voted');
    span.textContent = parseInt(span.textContent) - 1;
  } else {
    votedIds.push(id);
    btn.classList.add('voted');
    span.textContent = parseInt(span.textContent) + 1;
  }
  saveData();
}

// ══ COMPARADOR ══
function initCompare() {
  const opts = mockVehicles.map(v => `<option value="${v.id}">${v.emoji} ${v.brand} ${v.name} (${v.year})</option>`).join('');
  document.getElementById('cmp-v1').innerHTML = '<option value="">Selecione…</option>' + opts;
  document.getElementById('cmp-v2').innerHTML = '<option value="">Selecione…</option>' + opts;
}

function renderComparison() {
  const id1 = document.getElementById('cmp-v1').value;
  const id2 = document.getElementById('cmp-v2').value;
  const res = document.getElementById('compare-result');
  if (!id1 || !id2 || id1 === id2) {
    res.innerHTML = id1 === id2 && id1 ? `<div style="color:var(--red);font-family:var(--font);font-weight:700;padding:16px;text-align:center">Selecione dois veículos diferentes.</div>` : '';
    return;
  }
  const v1 = mockVehicles.find(v => v.id === id1);
  const v2 = mockVehicles.find(v => v.id === id2);
  const winner = v1.rating >= v2.rating ? v1 : v2;

  function ratingClass(v) { return v >= 4 ? 'good' : v >= 3 ? 'mid' : 'bad'; }
  function countClass(a, b, val) { return val === Math.min(a,b) ? 'good' : 'bad'; }

  res.innerHTML = `
    <div class="compare-grid">
      ${[v1,v2].map(v => `
        <div class="compare-card">
          <div class="cmp-header">
            <span class="cmp-emoji">${v.emoji}</span>
            <div><div class="cmp-title">${v.brand} ${v.name}</div><div class="cmp-sub">${v.version} · ${v.year}</div></div>
          </div>
          <div class="cmp-row"><span class="cmp-key">Nota geral</span><span class="cmp-val ${ratingClass(v.rating)}">${starsHtml(v.rating)} ${v.rating.toFixed(1)}</span></div>
          <div class="cmp-row"><span class="cmp-key">Reclamações</span><span class="cmp-val ${countClass(v1.count,v2.count,v.count)}">${v.count.toLocaleString('pt-BR')}</span></div>
          <div class="cmp-row"><span class="cmp-key">Confiabilidade</span><span class="cmp-val ${ratingClass(v.rating)}">${v.badge}</span></div>
          <div class="cmp-row"><span class="cmp-key">Preço FIPE</span><span class="cmp-val good">${fipePrices[v.id]||'—'}</span></div>
          <div class="cmp-row"><span class="cmp-key">Problemas top</span><span class="cmp-val" style="font-size:12px;text-align:right">${v.problems.slice(0,2).join(', ')}</span></div>
          ${v.id === winner.id ? `<div class="cmp-winner">✅ Melhor avaliado entre os dois</div>` : ''}
        </div>`).join('')}
    </div>`;
}

// ══ OVERRIDE submitComplaint para salvar ══
async function submitComplaint() {
  if (!currentUser) { closeModal(); openAuth('login'); return; }
  
  const brandEl = document.getElementById('sel-brand');
  const modelEl = document.getElementById('sel-model');
  const yearEl  = document.getElementById('sel-year');
  const typeBtn = document.querySelector('.vtype-btn.active');
  
  const complaint = {
    brand: brandEl.options[brandEl.selectedIndex]?.text || '—',
    model: modelEl.options[modelEl.selectedIndex]?.text || '—',
    year:  yearEl.options[yearEl.selectedIndex]?.text || '',
    vehicle_type:  typeBtn?.getAttribute('onclick')?.includes('motos') ? 'moto' : typeBtn?.getAttribute('onclick')?.includes('caminhoes') ? 'caminhao' : 'carro',
    category:  selectedCatVal || 'Outro',
    title:     document.getElementById('inp-title').value || 'Reclamação',
    text:      document.getElementById('inp-desc').value || '',
    state:     document.getElementById('sel-state').value || null,
    km:        document.getElementById('inp-km').value || null
  };
  
  try {
    const res = await fetch(API_URL + 'save_complaint.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(complaint)
    });
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    
    // Recarrega reclamações da API
    mockComplaints = await sbLoadComplaints();
    // Atualiza a lista na página inicial
    renderComplaintsList(mockComplaints);
    
    document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-success').classList.add('active');
  } catch(e) {
    alert(e.message || 'Erro ao salvar reclamação. Tente novamente.');
  }
}

// ══ INIT ══
renderVehicles();
renderRanking();
initCompare();

// Inicializa sessão e carrega dados
(async () => {
  await sbGetSession();
  mockComplaints = await sbLoadComplaints();
  renderComplaintsList(mockComplaints);
})();

// Verifica parâmetros na URL (Ativação e Recuperação)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('verified')) {
  alert('Conta ativada com sucesso! Você já pode fazer login.');
  window.location.href = './'; // Limpa a URL
}
if (urlParams.has('reset_token')) {
  document.getElementById('auth-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-reset').classList.add('active');
  document.getElementById('auth-modal-title').textContent = 'Redefinir Senha';
}
// ══ QUILL EDITOR INIT ══
let quill;
document.addEventListener("DOMContentLoaded", function() {
  if (document.getElementById('inp-desc-container')) {
    quill = new Quill('#inp-desc-container', {
      theme: 'snow',
      placeholder: 'Detalhe o problema: quando ocorre, se levou à oficina, quais foram os custos…',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['clean']
        ]
      }
    });
    
    quill.on('text-change', function() {
      document.getElementById('inp-desc').value = quill.root.innerHTML;
    });
  }
});
