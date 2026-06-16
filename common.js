// ===== SUPABASE =====
const SUPABASE_URL = 'https://byopoabytpmtoknsyxgg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DSknfCBYi3gWmxadzhJX2A_nT80WHly';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_EMAIL = 'wlsgks189@gmail.com';

let currentUser = null;
let currentRole = null;
let deferredPrompt = null;

// ===== 네비게이션 메뉴 =====
const NAV_ITEMS = [
  { href: 'index.html',     label: '📁 자료실' },
  { href: 'upload.html',    label: '📤 업로드', adminOnly: true },
  { href: 'todo.html',      label: '✅ 할일' },
  { href: 'complaint.html', label: '📋 민원' },
];

const LOGO_SVG = `
<a href="index.html" class="nav-logo" style="display:flex;align-items:center;gap:.6rem;text-decoration:none;">
  <svg width="32" height="32" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;border-radius:8px;">
    <rect width="44" height="44" rx="10" fill="#185FA5"/>
    <rect x="7" y="8" width="30" height="20" rx="3" fill="none" stroke="#B5D4F4" stroke-width="1.5"/>
    <rect x="11" y="12" width="8" height="2" rx="1" fill="#85B7EB"/>
    <rect x="11" y="16" width="14" height="2" rx="1" fill="#85B7EB"/>
    <rect x="11" y="20" width="10" height="2" rx="1" fill="#85B7EB"/>
    <rect x="19" y="28" width="6" height="3" rx="1" fill="#B5D4F4"/>
    <rect x="14" y="31" width="16" height="1.5" rx=".75" fill="#B5D4F4"/>
  </svg>
  <div>
    <div style="font-size:1rem;font-weight:700;background:linear-gradient(135deg,#378ADD,#185FA5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.2">짱구's Desk</div>
    <div style="font-size:.65rem;color:var(--text-muted);font-weight:400;-webkit-text-fill-color:var(--text-muted)">업무 관리 허브</div>
  </div>
</a>`;

// ===== 공통 CSS =====
const COMMON_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
[data-theme="dark"]{--bg:#0d1117;--surface:#161b22;--surface2:#21262d;--border:#30363d;--accent:#378ADD;--accent2:#185FA5;--text:#e6edf3;--text-muted:#7d8590;--success:#4caf8a;--danger:#f05e5e;--warning:#f0a040;--shadow:rgba(0,0,0,.4);}
[data-theme="light"]{--bg:#f6f8fa;--surface:#ffffff;--surface2:#f6f8fa;--border:#d0d7de;--accent:#0969da;--accent2:#185FA5;--text:#1f2328;--text-muted:#636c76;--success:#1a7f37;--danger:#cf222e;--warning:#9a6700;--shadow:rgba(0,0,0,.1);}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Noto Sans KR',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;transition:background .3s,color .3s;}
nav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 1.5rem;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px var(--shadow);}
.nav-right{display:flex;align-items:center;gap:.6rem;}
.nav-user{font-size:.75rem;color:var(--text-muted);}
.page-nav{display:flex;background:var(--surface);border-bottom:1px solid var(--border);padding:0 1rem;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.page-nav::-webkit-scrollbar{display:none;}
.page-nav-item{padding:.85rem 1.1rem;font-size:.85rem;cursor:pointer;border:none;background:none;color:var(--text-muted);font-family:inherit;border-bottom:2px solid transparent;white-space:nowrap;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;}
.page-nav-item:hover{color:var(--text);}
.page-nav-item.active{color:var(--accent);border-bottom-color:var(--accent);}
.badge{font-size:.68rem;padding:2px 7px;border-radius:20px;font-weight:500;}
.badge-admin{background:#4f7cff22;color:var(--accent);border:1px solid var(--accent);}
.badge-pending{background:#f0a04022;color:var(--warning);border:1px solid var(--warning);}
.container{max-width:900px;margin:0 auto;padding:1.5rem 1rem;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;margin-bottom:1.2rem;box-shadow:0 2px 8px var(--shadow);}
.card h2{font-size:1.05rem;font-weight:600;margin-bottom:1.2rem;}
.form-group{margin-bottom:1rem;}
label{display:block;font-size:.8rem;color:var(--text-muted);margin-bottom:.35rem;font-weight:500;}
input,select,textarea{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.65rem .9rem;color:var(--text);font-size:16px;font-family:inherit;transition:border-color .2s;}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent);}
textarea{resize:vertical;min-height:100px;}
select option{background:var(--surface2);color:var(--text);}
.form-row{display:flex;gap:.6rem;flex-wrap:wrap;}
.form-row .form-group{flex:1;}
.btn{padding:.65rem 1.1rem;border-radius:8px;font-size:.85rem;font-weight:500;font-family:inherit;cursor:pointer;border:none;transition:all .2s;display:inline-flex;align-items:center;gap:.4rem;min-height:44px;}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;width:100%;justify-content:center;margin-top:.5rem;min-height:48px;}
.btn-primary:hover{opacity:.9;}
.btn-sm{padding:.45rem .9rem;font-size:.8rem;border-radius:6px;min-height:36px;}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text-muted);}
.btn-outline:hover{border-color:var(--accent);color:var(--accent);}
.btn-danger{background:#f05e5e18;border:1px solid var(--danger);color:var(--danger);}
.btn-success{background:#4caf8a18;border:1px solid var(--success);color:var(--success);}
.btn-share{background:#fee50018;border:1px solid #c8a800;color:#c8a800;}
.btn-copy{background:#7c5cfc18;border:1px solid var(--accent2);color:var(--accent2);}
.alert{padding:.75rem 1rem;border-radius:8px;font-size:.84rem;margin-bottom:1rem;}
.alert-error{background:#f05e5e18;border:1px solid var(--danger);color:var(--danger);}
.alert-success{background:#4caf8a18;border:1px solid var(--success);color:var(--success);}
.section-title{font-size:1.25rem;font-weight:700;margin-bottom:.3rem;}
.section-sub{font-size:.83rem;color:var(--text-muted);margin-bottom:1.2rem;}
.empty{text-align:center;padding:2rem;color:var(--text-muted);font-size:.86rem;}
.toast{position:fixed;bottom:calc(2rem + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:var(--success);color:white;padding:.7rem 1.5rem;border-radius:20px;font-size:.84rem;font-weight:500;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap;}
.toast.show{opacity:1;}
.theme-btn{background:transparent;border:1px solid var(--border);border-radius:8px;padding:.3rem .6rem;cursor:pointer;font-size:1rem;color:var(--text-muted);}
.logout-icon{display:none;}
.logout-text{display:inline;}
.pwa-banner{background:linear-gradient(135deg,#378ADD18,#185FA518);border:1px solid var(--accent);border-radius:12px;padding:1rem 1.2rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;gap:1rem;}
.pwa-banner-text strong{display:block;margin-bottom:.2rem;font-size:.86rem;}
.pwa-banner-text span{color:var(--text-muted);font-size:.76rem;}
.pending-msg{text-align:center;padding:3rem 2rem;color:var(--text-muted);}
.pending-msg .icon{font-size:3rem;margin-bottom:1rem;}
.pending-msg h3{font-size:1.1rem;color:var(--text);margin-bottom:.5rem;}
@media(max-width:600px){
  nav{padding:0 .75rem;height:56px;}
  .nav-user{display:none;}
  .nav-right{gap:.4rem;}
  .logout-text{display:none;}
  .logout-icon{display:inline;}
  .logout-btn{padding:.35rem .65rem;font-size:1rem;}
  .theme-btn{padding:.28rem .5rem;font-size:.95rem;}
  .badge{font-size:.62rem;padding:2px 5px;}
  .page-nav-item{padding:.75rem .8rem;font-size:.76rem;}
  .container{padding:.9rem .75rem;padding-bottom:calc(.9rem + env(safe-area-inset-bottom));}
  .card{padding:1rem;border-radius:10px;margin-bottom:1rem;}
  .form-row .form-group{min-width:calc(50% - .3rem);}
  .btn-sm{padding:.5rem .9rem;font-size:.8rem;min-height:36px;}
  table{font-size:.78rem;}
  td:first-child{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  th,td{padding:.6rem .6rem;}
}
@supports(padding-top:env(safe-area-inset-top)){
  nav{padding-top:max(.5rem,env(safe-area-inset-top));}
}
`;

// ===== 공통 HTML 생성 =====
function initCommonLayout(pageTitle, activePage) {
  // CSS 주입
  const style = document.createElement('style');
  style.textContent = COMMON_CSS;
  document.head.prepend(style);

  // 테마 초기화
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 네비 HTML
  document.body.innerHTML = `
    <nav>
      ${LOGO_SVG}
      <div class="nav-right">
        <button class="theme-btn" onclick="toggleTheme()" id="theme-btn">${savedTheme === 'dark' ? '🌙' : '☀️'}</button>
        <span class="nav-user" id="nav-email"></span>
        <span class="badge" id="nav-badge"></span>
        <button class="btn btn-outline btn-sm logout-btn" onclick="logout()">
          <span class="logout-text">로그아웃</span>
          <span class="logout-icon">↩</span>
        </button>
      </div>
    </nav>
    <nav class="page-nav" id="page-nav"></nav>
    <div id="app-content" style="display:none">
      <div id="pwa-banner-area" class="container" style="padding-bottom:0"></div>
      <div id="page-pending" style="display:none">
        <div class="pending-msg"><div class="icon">⏳</div><h3>승인 대기 중</h3><p>관리자가 승인하면 이용할 수 있습니다.</p></div>
      </div>
      <div id="main-content"></div>
    </div>
    <div class="toast" id="toast"></div>
  ` + document.body.innerHTML;

  document.title = `${pageTitle} — 짱구's Desk`;
}

// ===== THEME =====
function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.getElementById('theme-btn').textContent = next === 'dark' ? '🌙' : '☀️';
}

// ===== PWA =====
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; showPWABanner(); });
function showPWABanner() {
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  const el = document.getElementById('pwa-banner-area'); if (!el) return;
  el.innerHTML = isIOS
    ? `<div class="pwa-banner"><div class="pwa-banner-text"><strong>📱 홈 화면에 추가하기</strong><span>Safari 공유버튼 → "홈 화면에 추가"</span></div></div>`
    : `<div class="pwa-banner"><div class="pwa-banner-text"><strong>📱 앱으로 설치하기</strong></div><button class="btn btn-outline btn-sm" onclick="installPWA()">설치</button></div>`;
}
async function installPWA() { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }

// ===== PUSH =====
async function requestPush() { if (!('Notification' in window)) return; await Notification.requestPermission(); }
function pushNotify(title, body) { if (Notification.permission === 'granted') new Notification(title, { body }); }

// ===== AUTH =====
async function initAuth(onReady) {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await handleUser(session.user, onReady);
  else window.location.href = 'login.html';

  sb.auth.onAuthStateChange(async (event, session) => {
    if (session) await handleUser(session.user, onReady);
    else window.location.href = 'login.html';
  });
}

async function handleUser(user, onReady) {
  currentUser = user;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  currentRole = user.email === ADMIN_EMAIL ? 'admin' : (profile?.role || 'pending');

  document.getElementById('nav-email').textContent = user.email;
  const badge = document.getElementById('nav-badge');
  if (currentRole === 'admin') { badge.textContent = '관리자'; badge.className = 'badge badge-admin'; }
  else { badge.textContent = '승인대기'; badge.className = 'badge badge-pending'; }

  // 페이지 네비 렌더
  renderPageNav();
  showPWABanner();

  if (currentRole === 'pending') {
    document.getElementById('page-pending').style.display = 'block';
    document.getElementById('app-content').style.display = 'block';
  } else {
    document.getElementById('page-pending').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    if (onReady) onReady();
  }
}

function renderPageNav() {
  const nav = document.getElementById('page-nav');
  const current = window.location.pathname.split('/').pop() || 'index.html';
  nav.innerHTML = NAV_ITEMS
    .filter(item => !item.adminOnly || currentRole === 'admin')
    .map(item => `<a href="${item.href}" class="page-nav-item ${current === item.href ? 'active' : ''}">${item.label}</a>`)
    .join('');
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// ===== UTILS =====
function showAlert(elId, msg, type) {
  const el = document.getElementById(elId);
  if (el) { el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`; setTimeout(() => { if (el) el.innerHTML = ''; }, 4000); }
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function formatSize(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function toSafeName(str) {
  return str.replace(/[^a-zA-Z0-9\-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/, '');
}
function toDisplayName(filename) {
  return filename.replace(/\.zip$/i, '');
}
