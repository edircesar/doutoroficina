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
  
  const myComplaintsList = mockComplaints.filter(c => c.userId == currentUser.id);
  
  document.getElementById('profile-count').textContent = myComplaintsList.length;
  
  const totalVotes = myComplaintsList.reduce((sum, c) => sum + (c.votes || 0), 0);
  document.getElementById('profile-votes-total').textContent = totalVotes;
  
  const resolvedCount = myComplaintsList.filter(c => c.status === 's-resolved').length;
  document.getElementById('profile-resolved').textContent = resolvedCount;
  
  if (myComplaintsList.length === 0) {
    const list = document.getElementById('my-complaints-list');
    list.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;text-align:center">
        Você ainda não fez nenhuma reclamação.<br>
        <button class="btn-primary" style="margin-top:16px;font-size:13px;padding:10px 20px" onclick="requireAuth()">🚨 Fazer primeira reclamação</button>
      </div>`;
  } else {
    renderComplaintsList(myComplaintsList, 0, 'my-complaints-list');
  }
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
        votes: 0,
        userId: c.usuario_id
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
  document.getElementById('ranking-grid').innerHTML=rankingData.slice(0, 6).map(r=>{
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
  ['home','vehicle','profile','compare','all-vehicles','all-complaints','full-ranking','empresa-dashboard','admin-empresas'].forEach(p=>{
    const el=document.getElementById('page-'+p);
    if(el) el.style.display=p===page?'block':'none';
  });
  window.scrollTo({top:0,behavior:'smooth'});
  if(page==='profile') renderProfile();
  if(page==='compare') initCompare();
  if(page==='all-vehicles') renderAllVehicles();
  if(page==='all-complaints') renderAllComplaints();
  if(page==='full-ranking') renderFullRanking();
  if(page==='empresa-dashboard') renderEmpresaDashboard();
  if(page==='admin-empresas') loadAdminEmpresas();
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
  fetch(API_URL + 'auth_logout.php').then(() => {
    updateNavAuth();
    showPage('home');
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('open');
  });
}

function updateNavAuth() {
  const area = document.getElementById('nav-auth-area');
  
  if (currentEmpresa) {
    const initials = currentEmpresa.nome_fantasia.slice(0,2).toUpperCase();
    area.innerHTML = `
      <div class="nav-user">
        <span class="nav-user-name" style="color:var(--green);font-weight:700">🏢 ${currentEmpresa.nome_fantasia.split(' ')[0]}</span>
        <div class="nav-avatar" onclick="toggleDropdown()" style="background:linear-gradient(135deg,var(--green),#00d9a0);">${initials}</div>
        <div class="user-dropdown" id="user-dropdown">
          <button class="udrop-item" onclick="showPage('empresa-dashboard')">📊 Meu Painel</button>
          <div class="udrop-divider"></div>
          <button class="udrop-item" onclick="doEmpresaLogout()">🚪 Sair</button>
        </div>
      </div>`;
  } else if (currentUser) {
    const initials = currentUser.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    area.innerHTML = `
      <div class="nav-user">
        <span class="nav-user-name">${currentUser.name.split(' ')[0]}</span>
        <div class="nav-avatar" onclick="toggleDropdown()">${initials}</div>
        <div class="user-dropdown" id="user-dropdown">
          <button class="udrop-item" onclick="showPage('profile')">👤 Meu perfil</button>
          <button class="udrop-item" onclick="showPage('compare')">⚖️ Comparar veículos</button>
          ${currentUser.is_admin ? `
            <div class="udrop-divider"></div>
            <button class="udrop-item" onclick="showPage('admin-empresas')" style="color:var(--red);font-weight:700">🛡️ Painel Admin</button>
          ` : ''}
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
  const mine = mockComplaints.filter(c => c.userId == currentUser.id);
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

// ══════════════════════════════════════════
// MÓDULO DE VERIFICAÇÃO DE EMPRESAS (JS)
// ══════════════════════════════════════════

let currentEmpresa = null;
let empCsrfToken = '';
let cnpjLookupTimeout = null;

// ── TOAST NOTIFICATIONS ──
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'toastOut .3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 5000);
}

// ── INPUT MASKS ──
function maskCnpj(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 14) v = v.slice(0, 14);
  v = v.replace(/(\d{2})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  el.value = v;
}

function maskPhone(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 6) v = v.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/, '($1) $2');
  el.value = v;
}

// ── MODAL OPEN/CLOSE ──
function openEmpresaModal() {
  if (currentEmpresa) {
    showPage('empresa-dashboard');
    return;
  }
  document.getElementById('empresa-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Get CSRF token
  fetch('api/empresa_check.php').then(r => r.json()).then(d => {
    if (d.csrf_token) empCsrfToken = d.csrf_token;
    if (d.empresa) {
      currentEmpresa = d.empresa;
      closeEmpresaModal();
      showPage('empresa-dashboard');
    }
  }).catch(() => {});
}

function closeEmpresaModal() {
  document.getElementById('empresa-modal').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('empresa-modal').addEventListener('click', function(e) {
  if (e.target === this) closeEmpresaModal();
});

function switchEmpTab(tab) {
  document.getElementById('emp-tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('emp-tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('emp-panel-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('emp-panel-register').style.display = tab === 'register' ? 'block' : 'none';
  // Clear errors
  document.getElementById('emp-login-error').classList.remove('show');
  document.getElementById('emp-register-error').classList.remove('show');
}

// ── MULTI-STEP NAVIGATION ──
function empNextStep(step) {
  // Validate current step before advancing
  if (step > 0 && !validateEmpStep(step - 1)) return;
  
  document.querySelectorAll('.emp-step').forEach(s => s.classList.remove('active'));
  document.getElementById('emp-step-' + step).classList.add('active');
  for (let i = 0; i < 3; i++) {
    const dot = document.getElementById('emp-dot-' + i);
    dot.classList.toggle('done', i < step);
    dot.classList.toggle('active', i === step);
  }
}

function validateEmpStep(step) {
  const errEl = document.getElementById('emp-register-error');
  errEl.classList.remove('show');
  
  if (step === 0) {
    const cnpj = document.getElementById('emp-cnpj').value.replace(/\D/g, '');
    const razao = document.getElementById('emp-razao').value.trim();
    const fantasia = document.getElementById('emp-fantasia').value.trim();
    const email = document.getElementById('emp-email').value.trim();
    const tel = document.getElementById('emp-telefone').value.replace(/\D/g, '');
    const senha = document.getElementById('emp-senha').value;
    const senhaC = document.getElementById('emp-senha-confirm').value;
    
    if (cnpj.length !== 14) { errEl.textContent = 'CNPJ inválido.'; errEl.classList.add('show'); return false; }
    if (!razao) { errEl.textContent = 'Razão social é obrigatória.'; errEl.classList.add('show'); return false; }
    if (!fantasia) { errEl.textContent = 'Nome fantasia é obrigatório.'; errEl.classList.add('show'); return false; }
    if (!email || !email.includes('@')) { errEl.textContent = 'Email inválido.'; errEl.classList.add('show'); return false; }
    if (tel.length < 10) { errEl.textContent = 'Telefone inválido.'; errEl.classList.add('show'); return false; }
    if (senha.length < 8) { errEl.textContent = 'Senha deve ter no mínimo 8 caracteres.'; errEl.classList.add('show'); return false; }
    if (senha !== senhaC) { errEl.textContent = 'As senhas não conferem.'; errEl.classList.add('show'); return false; }
    
    // Check generic email warning
    const genericDomains = ['gmail.com','hotmail.com','outlook.com','yahoo.com','yahoo.com.br','hotmail.com.br','live.com','uol.com.br','bol.com.br','terra.com.br','ig.com.br'];
    const domain = email.split('@')[1]?.toLowerCase();
    const warn = document.getElementById('emp-email-warning');
    warn.classList.toggle('show', genericDomains.includes(domain));
  }
  
  if (step === 1) {
    const nome = document.getElementById('emp-resp-nome').value.trim();
    const cargo = document.getElementById('emp-resp-cargo').value.trim();
    if (!nome) { errEl.textContent = 'Nome do responsável é obrigatório.'; errEl.classList.add('show'); return false; }
    if (!cargo) { errEl.textContent = 'Cargo é obrigatório.'; errEl.classList.add('show'); return false; }
  }
  
  return true;
}

// ── CNPJ LOOKUP ──
function onCnpjBlur() {
  const cnpj = document.getElementById('emp-cnpj').value.replace(/\D/g, '');
  if (cnpj.length !== 14) return;
  
  clearTimeout(cnpjLookupTimeout);
  cnpjLookupTimeout = setTimeout(() => {
    const resultEl = document.getElementById('cnpj-result');
    const gridEl = document.getElementById('cnpj-result-grid');
    const errEl = document.getElementById('err-cnpj');
    
    resultEl.classList.remove('show');
    errEl.classList.remove('show');
    errEl.textContent = '';
    
    fetch(`api/cnpj_consulta.php?cnpj=${cnpj}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const data = d.data;
          // Auto-fill fields
          document.getElementById('emp-razao').value = data.razao_social || '';
          document.getElementById('emp-fantasia').value = data.nome_fantasia || '';
          
          gridEl.innerHTML = `
            <div class="cnpj-result-item"><span class="cnpj-result-label">Razão Social</span><span class="cnpj-result-value">${data.razao_social}</span></div>
            <div class="cnpj-result-item"><span class="cnpj-result-label">Situação</span><span class="cnpj-result-value" style="color:var(--green)">${data.situacao}</span></div>
            <div class="cnpj-result-item"><span class="cnpj-result-label">CNAE</span><span class="cnpj-result-value">${data.cnae}</span></div>
            <div class="cnpj-result-item"><span class="cnpj-result-label">Abertura</span><span class="cnpj-result-value">${data.data_abertura} (${data.idade_anos} anos)</span></div>
            <div class="cnpj-result-item"><span class="cnpj-result-label">Cidade</span><span class="cnpj-result-value">${data.endereco.municipio}/${data.endereco.uf}</span></div>
          `;
          resultEl.classList.add('show');
        } else {
          errEl.textContent = d.error || 'CNPJ inválido.';
          errEl.classList.add('show');
        }
      })
      .catch(() => {
        errEl.textContent = 'Erro ao consultar CNPJ.';
        errEl.classList.add('show');
      });
  }, 500);
}

// ── FILE UPLOAD HANDLER ──
function handleFileSelect(input, zoneId) {
  const zone = document.getElementById(zoneId);
  const nameEl = document.getElementById(zoneId + '-name');
  const file = input.files[0];
  
  if (file) {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('Arquivo excede 5MB.', 'error');
      input.value = '';
      zone.classList.remove('has-file');
      return;
    }
    zone.classList.add('has-file');
    nameEl.textContent = file.name;
  } else {
    zone.classList.remove('has-file');
  }
}

// ── EMPRESA REGISTER SUBMIT ──
async function submitEmpresaRegister() {
  if (!validateEmpStep(2)) return;
  
  // Check files
  const fileCnpj = document.querySelector('#uz-cnpj input[type=file]').files[0];
  const fileDoc = document.querySelector('#uz-doc input[type=file]').files[0];
  const fileSelfie = document.querySelector('#uz-selfie input[type=file]').files[0];
  
  if (!fileCnpj || !fileDoc || !fileSelfie) {
    showToast('Envie todos os 3 documentos obrigatórios.', 'error');
    return;
  }
  
  const btn = document.getElementById('emp-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="emp-spinner"></span> Cadastrando...';
  
  const formData = new FormData();
  formData.append('csrf_token', empCsrfToken);
  formData.append('razao_social', document.getElementById('emp-razao').value.trim());
  formData.append('nome_fantasia', document.getElementById('emp-fantasia').value.trim());
  formData.append('cnpj', document.getElementById('emp-cnpj').value);
  formData.append('email', document.getElementById('emp-email').value.trim());
  formData.append('telefone', document.getElementById('emp-telefone').value);
  formData.append('senha', document.getElementById('emp-senha').value);
  formData.append('senha_confirm', document.getElementById('emp-senha-confirm').value);
  formData.append('site', document.getElementById('emp-site').value.trim());
  formData.append('responsavel_nome', document.getElementById('emp-resp-nome').value.trim());
  formData.append('responsavel_cargo', document.getElementById('emp-resp-cargo').value.trim());
  formData.append('doc_cnpj', fileCnpj);
  formData.append('doc_responsavel', fileDoc);
  formData.append('doc_selfie', fileSelfie);
  
  try {
    const res = await fetch('api/empresa_register.php', { method: 'POST', body: formData });
    const data = await res.json();
    
    if (data.success) {
      document.querySelectorAll('.emp-step').forEach(s => s.classList.remove('active'));
      document.getElementById('emp-step-success').classList.add('active');
      showToast('Empresa cadastrada com sucesso!', 'success');
    } else {
      const errEl = document.getElementById('emp-register-error');
      let msg = data.error || 'Erro ao cadastrar.';
      if (data.validation_errors) {
        msg += '\n' + Object.values(data.validation_errors).join('\n');
      }
      errEl.textContent = msg;
      errEl.classList.add('show');
      showToast(data.error || 'Erro no cadastro.', 'error');
    }
  } catch (e) {
    showToast('Erro de conexão. Tente novamente.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✅ Cadastrar Empresa';
  }
}

// ── EMPRESA LOGIN ──
async function doEmpresaLogin() {
  const cnpj = document.getElementById('emp-login-cnpj').value;
  const senha = document.getElementById('emp-login-senha').value;
  const errEl = document.getElementById('emp-login-error');
  errEl.classList.remove('show');
  
  if (!cnpj || !senha) {
    errEl.textContent = 'Preencha CNPJ e senha.';
    errEl.classList.add('show');
    return;
  }
  
  const btn = document.getElementById('emp-login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="emp-spinner"></span> Entrando...';
  
  try {
    const res = await fetch('api/empresa_login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj, senha, csrf_token: empCsrfToken })
    });
    const data = await res.json();
    
    if (data.success) {
      currentEmpresa = data.data.empresa;
      empCsrfToken = data.data.csrf_token || empCsrfToken;
      closeEmpresaModal();
      updateNavAuth();
      showPage('empresa-dashboard');
      showToast(`Bem-vindo, ${currentEmpresa.nome_fantasia}!`, 'success');
    } else {
      errEl.textContent = data.error || 'Erro ao fazer login.';
      errEl.classList.add('show');
    }
  } catch (e) {
    errEl.textContent = 'Erro de conexão.';
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔑 Entrar como Empresa';
  }
}

// ── EMPRESA LOGOUT ──
async function doEmpresaLogout() {
  await fetch('api/empresa_logout.php', { method: 'POST' });
  currentEmpresa = null;
  updateNavAuth();
  showPage('home');
  showToast('Logout realizado.', 'info');
}

// ── EMPRESA DASHBOARD ──
async function renderEmpresaDashboard() {
  if (!currentEmpresa) {
    // Try to restore session
    try {
      const res = await fetch('api/empresa_check.php');
      const data = await res.json();
      if (data.success && data.empresa) {
        currentEmpresa = data.empresa;
        empCsrfToken = data.csrf_token || '';
        updateNavAuth();
      } else {
        showPage('home');
        openEmpresaModal();
        return;
      }
    } catch (e) { showPage('home'); return; }
  }
  
  const e = currentEmpresa;
  document.getElementById('emp-dash-name').textContent = e.nome_fantasia;
  document.getElementById('emp-dash-cnpj').textContent = e.cnpj;
  document.getElementById('emp-dash-score').textContent = e.score_confianca;
  document.getElementById('emp-dash-score-val').textContent = e.score_confianca + '/100';
  document.getElementById('emp-dash-score-bar').style.width = e.score_confianca + '%';
  
  // Score bar color
  const scoreColor = e.score_confianca >= 80 ? 'var(--green)' : e.score_confianca >= 60 ? '#00a878' : e.score_confianca >= 40 ? 'var(--yellow)' : 'var(--red)';
  document.getElementById('emp-dash-score-bar').style.background = scoreColor;
  document.getElementById('emp-dash-score-val').style.color = scoreColor;
  
  // Status badge
  const statusEl = document.getElementById('emp-dash-status');
  statusEl.textContent = e.status_verificacao.replace('_', ' ');
  statusEl.className = 'status-badge status-' + e.status_verificacao;
  
  // Selo
  const seloEl = document.getElementById('emp-dash-selo');
  seloEl.innerHTML = e.selo_verificado
    ? '<span class="selo-verificado"><span class="selo-verificado-icon">✅</span> Empresa Verificada</span>'
    : '';
  
  // Verification timeline
  const steps = [
    { key: 'PENDENTE', label: 'Cadastro realizado', icon: '📝' },
    { key: 'CNPJ_VALIDADO', label: 'CNPJ validado via API', icon: '🔍' },
    { key: 'DOCUMENTOS_ENVIADOS', label: 'Documentos enviados', icon: '📄' },
    { key: 'VERIFICADA', label: 'Empresa verificada', icon: '✅' }
  ];
  const statusOrder = ['PENDENTE','CNPJ_VALIDADO','DOCUMENTOS_ENVIADOS','VERIFICADA'];
  const currentIdx = statusOrder.indexOf(e.status_verificacao);
  
  let timelineHtml = '<div style="display:flex;flex-direction:column;gap:12px">';
  steps.forEach((s, i) => {
    const done = i <= currentIdx && e.status_verificacao !== 'REJEITADA';
    const active = i === currentIdx;
    timelineHtml += `<div style="display:flex;align-items:center;gap:12px;opacity:${done ? 1 : 0.4}">
      <span style="font-size:20px">${done ? '✅' : '⏳'}</span>
      <span style="font-family:var(--font);font-weight:${active ? 800 : 600};font-size:14px;color:${done ? 'var(--navy)' : 'var(--muted)'}">${s.label}</span>
    </div>`;
  });
  
  if (e.status_verificacao === 'REJEITADA') {
    timelineHtml += `<div style="display:flex;align-items:center;gap:12px"><span style="font-size:20px">❌</span><span style="font-family:var(--font);font-weight:800;font-size:14px;color:var(--red)">Empresa rejeitada</span></div>`;
  }
  
  timelineHtml += '</div>';
  document.getElementById('emp-dash-timeline').innerHTML = timelineHtml;
}

// ── ADMIN PANEL ──
let adminCurrentFilter = '';

async function loadAdminEmpresas(status = '') {
  adminCurrentFilter = status;
  const tbody = document.getElementById('admin-empresas-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px"><span class="ai-spinner"></span> Carregando...</td></tr>';
  
  // Update filter buttons
  document.querySelectorAll('.admin-filter-btn').forEach(b => b.classList.remove('active'));
  event.target?.classList.add('active');
  
  try {
    const url = `api/admin_empresas_list.php?status=${status}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.success) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red);padding:40px">Acesso negado ou erro.</td></tr>';
      return;
    }
    
    const empresas = data.data.empresas;
    if (!empresas.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px">Nenhuma empresa encontrada.</td></tr>';
      return;
    }
    
    tbody.innerHTML = empresas.map(e => `
      <tr>
        <td>
          <div class="emp-name">${e.nome_fantasia}</div>
          <div style="font-size:11px;color:var(--muted)">${e.razao_social}</div>
        </td>
        <td><span class="emp-cnpj">${e.cnpj}</span></td>
        <td><span class="status-badge status-${e.status_verificacao}">${e.status_verificacao.replace('_',' ')}</span></td>
        <td><strong style="color:${e.score_confianca >= 60 ? 'var(--green)' : 'var(--yellow)'}">${e.score_confianca}</strong></td>
        <td style="font-size:12px;color:var(--muted)">${new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
        <td>
          <button class="admin-action-btn admin-btn-view" onclick="openReviewModal(${e.id})">📋 Ver</button>
          ${e.status_verificacao !== 'VERIFICADA' && e.status_verificacao !== 'REJEITADA' ? `
            <button class="admin-action-btn admin-btn-approve" onclick="adminAction(${e.id},'aprovar')">✅</button>
            <button class="admin-action-btn admin-btn-reject" onclick="adminAction(${e.id},'rejeitar')">❌</button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red);padding:40px">Erro ao carregar.</td></tr>';
  }
}

function filterAdminEmpresas(status) {
  loadAdminEmpresas(status);
}

// ── ADMIN ACTIONS ──
async function adminAction(empresaId, acao) {
  let motivo = '';
  if (acao === 'rejeitar') {
    motivo = prompt('Informe o motivo da rejeição:');
    if (!motivo) return;
  }
  
  if (!confirm(`Deseja ${acao} esta empresa?`)) return;
  
  try {
    const res = await fetch('api/admin_empresa_action.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa_id: empresaId, acao, motivo })
    });
    const data = await res.json();
    
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminEmpresas(adminCurrentFilter);
    } else {
      showToast(data.error || 'Erro.', 'error');
    }
  } catch (e) {
    showToast('Erro de conexão.', 'error');
  }
}

// ── REVIEW MODAL ──
async function openReviewModal(empresaId) {
  document.getElementById('review-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  const body = document.getElementById('review-modal-body');
  body.innerHTML = '<div style="text-align:center;padding:40px"><span class="ai-spinner"></span> Carregando...</div>';
  
  try {
    const res = await fetch(`api/admin_empresa_logs.php?empresa_id=${empresaId}`);
    const data = await res.json();
    
    if (!data.success) {
      body.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px">Erro ao carregar dados.</div>';
      return;
    }
    
    const { empresa, logs, documentos } = data.data;
    document.getElementById('review-empresa-name').textContent = empresa.nome_fantasia + ' — ' + empresa.cnpj;
    
    let html = '';
    
    // Documentos
    html += '<div class="review-section"><div class="review-section-title">📄 Documentos Enviados</div>';
    if (documentos.length) {
      html += '<div class="review-doc-grid">';
      const docIcons = { cnpj_card: '📄', documento_responsavel: '🪪', selfie: '🤳' };
      const docLabels = { cnpj_card: 'Cartão CNPJ', documento_responsavel: 'Documento', selfie: 'Selfie' };
      documentos.forEach(d => {
        html += `<a href="${d.arquivo}" target="_blank" class="review-doc-card">
          <span class="review-doc-icon">${docIcons[d.tipo_documento] || '📎'}</span>
          <div class="review-doc-type">${docLabels[d.tipo_documento] || d.tipo_documento}</div>
        </a>`;
      });
      html += '</div>';
    } else {
      html += '<div style="color:var(--muted);font-size:13px">Nenhum documento enviado.</div>';
    }
    html += '</div>';
    
    // Logs
    html += '<div class="review-section"><div class="review-section-title">📋 Histórico de Verificação</div>';
    if (logs.length) {
      logs.forEach(l => {
        html += `<div class="review-log-item">
          <span class="review-log-date">${new Date(l.created_at).toLocaleDateString('pt-BR')}</span>
          <span class="review-log-action">${l.acao}</span>
          <span class="review-log-detail">${l.detalhes || ''}${l.admin_nome ? ' (Admin: ' + l.admin_nome + ')' : ''}</span>
        </div>`;
      });
    } else {
      html += '<div style="color:var(--muted);font-size:13px">Sem histórico.</div>';
    }
    html += '</div>';
    
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = '<div style="color:var(--red);text-align:center;padding:20px">Erro de conexão.</div>';
  }
}

function closeReviewModal() {
  document.getElementById('review-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('review-modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeReviewModal();
});

// ── CHECK EMPRESA SESSION ON LOAD ──
async function checkEmpresaSession() {
  try {
    const res = await fetch('api/empresa_check.php');
    const data = await res.json();
    if (data.success && data.empresa) {
      currentEmpresa = data.empresa;
      empCsrfToken = data.csrf_token || '';
      updateNavAuth();
    }
  } catch (e) {}
}

// ══ INIT ══
renderVehicles();
renderRanking();
initCompare();

// Inicializa sessão e carrega dados
(async () => {
  await sbGetSession();
  await checkEmpresaSession();
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

// ── SWITCH ADMIN TAB ──
function switchAdminTab(tab) {
  const compSec = document.getElementById('admin-companies-section');
  const userSec = document.getElementById('admin-users-section');
  const compBtn = document.getElementById('admin-tab-companies-btn');
  const userBtn = document.getElementById('admin-tab-users-btn');
  
  if (tab === 'companies') {
    compSec.style.display = 'block';
    userSec.style.display = 'none';
    compBtn.classList.add('active');
    userBtn.classList.remove('active');
    loadAdminEmpresas();
  } else {
    compSec.style.display = 'none';
    userSec.style.display = 'block';
    compBtn.classList.remove('active');
    userBtn.classList.add('active');
    loadAdminUsers();
  }
}

// ── ADMIN LOAD USERS ──
async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  const countEl = document.getElementById('admin-users-count');
  
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px"><span class="ai-spinner"></span> Carregando usuários...</td></tr>';
  countEl.textContent = 'Total: carregando...';
  
  try {
    const res = await fetch('api/admin_users_list.php');
    const data = await res.json();
    
    if (!data.success) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red);padding:40px">Erro de permissão ou conexão.</td></tr>';
      return;
    }
    
    const users = data.data.users;
    countEl.textContent = `Total: ${data.data.total}`;
    
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px">Nenhum usuário cadastrado.</td></tr>';
      return;
    }
    
    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td>
          <span style="font-weight:700; color:var(--navy);">${u.nome}</span>
          ${u.is_admin ? '<span class="status-badge status-VERIFICADA" style="padding:2px 8px; font-size:9px; margin-left:6px;">ADMIN</span>' : ''}
        </td>
        <td><span style="color:var(--text2); font-family:monospace;">${u.email}</span></td>
        <td>
          <span class="status-badge ${u.status === 'ativo' ? 'status-VERIFICADA' : 'status-PENDENTE'}" style="padding:4px 10px; font-size:10px;">
            ${u.status.toUpperCase()}
          </span>
        </td>
        <td><strong>${u.creditos}</strong></td>
        <td style="font-size:12px; color:var(--muted);">${new Date(u.created_at).toLocaleDateString('pt-BR')} ${new Date(u.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red);padding:40px">Erro ao carregar lista de usuários.</td></tr>';
  }
}
