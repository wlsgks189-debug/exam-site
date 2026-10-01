// ===== SUPABASE =====
const SUPABASE_URL = 'https://byopoabytpmtoknsyxgg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DSknfCBYi3gWmxadzhJX2A_nT80WHly';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_EMAIL = 'wlsgks189@gmail.com';

let currentUser = null;
let currentRole = null;
let deferredPrompt = null;

// ===== THEME =====
// 페이지가 그려지기 전에 먼저 적용해서, 라이트 테마 사용자의 깜빡임을 막는다
(function () {
  try { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark'); } catch (e) {}
})();
function applyThemeUI(t) {
  document.querySelectorAll('.theme-btn, .theme-ico').forEach(el => { el.innerHTML = svgIcon(t === 'dark' ? 'moon' : 'sun', 18); });
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.setAttribute('aria-label', t === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환');
    btn.setAttribute('title', t === 'dark' ? '다크 (눌러서 라이트로)' : '라이트 (눌러서 다크로)');
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0d1117' : '#f6f8fa');
}
function initTheme() {
  const t = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  applyThemeUI(t);
}
function toggleTheme() {
  const c = document.documentElement.getAttribute('data-theme');
  const n = c === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('theme', n);
  applyThemeUI(n);
}

// ===== PWA =====
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e; showPWABanner(); updateInstallButtons();
});
function showPWABanner() {
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  const el = document.getElementById('pwa-banner-area');
  if (!el) return;
  el.innerHTML = isIOS
    ? `<div class="pwa-banner"><div class="pwa-banner-text"><strong>📱 홈 화면에 추가하기</strong><span>Safari 공유버튼 → "홈 화면에 추가"</span></div></div>`
    : `<div class="pwa-banner"><div class="pwa-banner-text"><strong>📱 앱으로 설치하기</strong><span>홈 화면에 추가하면 앱처럼 사용 가능해요</span></div><button class="btn btn-outline btn-sm" onclick="installPWA()">설치</button></div>`;
}
async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  updateInstallButtons();
}
function updateInstallButtons() {
  document.querySelectorAll('.js-install').forEach(b => { b.style.display = deferredPrompt ? '' : 'none'; });
}

// ===== PUSH =====
async function requestPush() {
  if (!('Notification' in window)) return;
  await Notification.requestPermission();
}
function pushNotify(title, body) {
  if (Notification.permission === 'granted') new Notification(title, { body });
}

// ===== AUTH =====
// 각 페이지에서 initPage(callback) 호출
async function initPage(onReady) {
  initTheme();
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await handleUser(session.user, onReady);
  } else {
    showAuthSection();
  }
  sb.auth.onAuthStateChange(async (event, session) => {
    if (session) await handleUser(session.user, onReady);
    else showAuthSection();
  });
  showPWABanner();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

async function handleUser(user, onReady) {
  currentUser = user;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  currentRole = user.email === ADMIN_EMAIL ? 'admin' : (profile?.role || 'pending');

  // 네비 업데이트 (사이드바 / 더보기 시트의 사용자 영역)
  document.body.classList.remove('auth-mode');
  document.querySelectorAll('.js-user-email').forEach(el => { el.textContent = user.email; });
  document.querySelectorAll('.js-avatar').forEach(el => { el.textContent = (user.email || '?').charAt(0).toUpperCase(); });
  document.querySelectorAll('.js-user-badge').forEach(el => {
    el.textContent = currentRole === 'admin' ? '관리자' : '승인대기';
    el.className = 'badge js-user-badge ' + (currentRole === 'admin' ? 'badge-admin' : 'badge-pending');
  });

  // 현재 페이지 메뉴 활성 표시
  markActiveNav();

  // 관리자 전용 탭 표시
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentRole === 'admin' ? '' : 'none';
  });

  if (currentRole === 'pending') {
    hideMain();
    const pending = document.getElementById('pending-msg');
    if (pending) pending.style.display = 'block';
  } else {
    const pending = document.getElementById('pending-msg');
    if (pending) pending.style.display = 'none';
    showMain();
    if (onReady) onReady();
  }
}

function showAuthSection() {
  document.body.classList.add('auth-mode');
  closeMore();
  const auth = document.getElementById('auth-section');
  const main = document.getElementById('main-section');
  if (auth) auth.style.display = 'block';
  if (main) main.style.display = 'none';
}

function showMain() {
  const auth = document.getElementById('auth-section');
  const main = document.getElementById('main-section');
  if (auth) auth.style.display = 'none';
  if (main) main.style.display = 'block';
}

function hideMain() {
  const main = document.getElementById('main-section');
  if (main) main.style.display = 'none';
}

// ===== AUTH FORMS =====
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'signup' && i === 1)));
  const loginEl = document.getElementById('tab-login');
  const signupEl = document.getElementById('tab-signup');
  if (loginEl) loginEl.style.display = tab === 'login' ? 'block' : 'none';
  if (signupEl) signupEl.style.display = tab === 'signup' ? 'block' : 'none';
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) alertEl.innerHTML = '';
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const pw = document.getElementById('login-pw').value;
  const { error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) showAlert('auth-alert', error.message, 'error');
}

async function doSignup() {
  const email = document.getElementById('signup-email').value;
  const pw = document.getElementById('signup-pw').value;
  const { error } = await sb.auth.signUp({ email, password: pw });
  if (error) showAlert('auth-alert', error.message, 'error');
  else showAlert('auth-alert', '가입 완료! 로그인해 주세요.', 'success');
}

async function logout() {
  await sb.auth.signOut();
  showAuthSection();
  document.querySelectorAll('.js-user-email, .js-user-badge, .js-avatar').forEach(el => { el.textContent = ''; });
}

// ===== UTILS =====
function showAlert(elId, msg, type) {
  const el = document.getElementById(elId);
  if (el) {
    el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ''; }, 4000);
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
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

// ===== ICONS (선 아이콘) =====
const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  todo: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  project: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 8 2a6 6 0 0 0 4-1v12a6 6 0 0 1-4 1c-3 0-5-2-8-2a6 6 0 0 0-4 1"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  log: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  notice: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  box: '<path d="m7.5 4.3 9 5.2M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'
};
function svgIcon(name, size) {
  size = size || 18;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;
}
// 사용자가 입력한 글자를 화면에 넣을 때 사용 (HTML 로 해석되지 않게)
function escHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ===== 메뉴 정의 (여기 한 곳만 고치면 사이드바 / 하단 탭 / 더보기 모두 바뀜) =====
const MENU = [
  { href: 'dashboard.html',         icon: 'home',     label: '홈',            group: '업무' },
  { href: 'todo.html',              icon: 'todo',     label: '할일',          group: '업무' },
  { href: 'project.html',           icon: 'project',  label: '장기프로젝트',  short: '프로젝트', group: '업무' },
  { href: 'index.html',             icon: 'folder',   label: '자료실',        group: '자료' },
  { href: 'upload.html',            icon: 'upload',   label: '업로드',        group: '자료', admin: true },
  { href: 'delivery.html',          icon: 'box',      label: '택배 발송',     group: '자료', admin: true },
  { href: 'bookmark.html',          icon: 'bookmark', label: '북마크',        group: '자료' },
  { href: 'complaint.html',         icon: 'chat',     label: '1:1 문의 답변', group: '기록' },
  { href: 'complaint_history.html', icon: 'inbox',    label: '민원 이력',     group: '기록' },
  { href: 'worklog.html',           icon: 'log',      label: '업무 일지',     group: '기록' },
  { href: 'notice.html',            icon: 'notice',   label: '공지사항',      group: '기록' }
];
const NAV_GROUPS = ['업무', '자료', '기록'];
const TAB_ORDER = ['dashboard.html', 'todo.html', 'index.html', 'project.html'];  // 모바일 하단 탭 (+ 더보기)

function logoSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;border-radius:${Math.round(size * 0.23)}px" aria-hidden="true">
    <rect width="44" height="44" rx="10" fill="#185FA5"/>
    <rect x="7" y="8" width="30" height="20" rx="3" fill="none" stroke="#B5D4F4" stroke-width="1.5"/>
    <rect x="11" y="12" width="8" height="2" rx="1" fill="#85B7EB"/>
    <rect x="11" y="16" width="14" height="2" rx="1" fill="#85B7EB"/>
    <rect x="11" y="20" width="10" height="2" rx="1" fill="#85B7EB"/>
    <rect x="19" y="28" width="6" height="3" rx="1" fill="#B5D4F4"/>
    <rect x="14" y="31" width="16" height="1.5" rx=".75" fill="#B5D4F4"/>
  </svg>`;
}

function currentFile() {
  let f = location.pathname.split('/').pop() || 'index.html';
  if (f && !f.includes('.')) f += '.html';
  return f;
}

function markActiveNav() {
  const file = currentFile();
  let tabHit = false;
  document.querySelectorAll('[data-nav]').forEach(el => {
    const on = el.getAttribute('data-nav') === file;
    el.classList.toggle('active', on);
    if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    if (on && el.classList.contains('tab-item')) tabHit = true;
  });
  const more = document.getElementById('tab-more');
  if (more) more.classList.toggle('active', !tabHit);
}

// ===== 모바일 '더보기' 시트 =====
let _moreReturnFocus = null;
function openMore() {
  const sh = document.getElementById('more-sheet');
  if (!sh) return;
  _moreReturnFocus = document.activeElement;
  sh.classList.add('open');
  document.body.style.overflow = 'hidden';
  const btn = sh.querySelector('.sheet-close');
  if (btn) btn.focus();
}
function closeMore() {
  const sh = document.getElementById('more-sheet');
  if (!sh || !sh.classList.contains('open')) return;
  sh.classList.remove('open');
  document.body.style.overflow = '';
  if (_moreReturnFocus && _moreReturnFocus.focus) _moreReturnFocus.focus();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMore(); });

// ===== 앱 셸: PC 사이드바 / 태블릿 아이콘 레일 / 모바일 상단바 + 하단 탭바 =====
function renderShell() {
  if (document.getElementById('app-shell')) return;
  document.body.classList.add('has-shell', 'auth-mode');   // 로그인 확인 전까지는 숨김

  const sideGroups = NAV_GROUPS.map(g => `
    <div class="side-group">${g}</div>
    ${MENU.filter(m => m.group === g).map(m => `
    <a href="${m.href}" class="nav-link${m.admin ? ' admin-only' : ''}" data-nav="${m.href}" title="${m.label}">${svgIcon(m.icon, 18)}<span class="nav-label">${m.label}</span></a>`).join('')}`).join('');

  const tabItems = TAB_ORDER.map(h => MENU.find(m => m.href === h)).map(m => `
    <a href="${m.href}" class="tab-item" data-nav="${m.href}">${svgIcon(m.icon, 22)}<span>${m.short || m.label}</span></a>`).join('');

  const tiles = MENU.map(m => `
    <a href="${m.href}" class="menu-tile${m.admin ? ' admin-only' : ''}" data-nav="${m.href}"><span class="tile-ico">${svgIcon(m.icon, 18)}</span><span>${m.label}</span></a>`).join('');

  const userBlock = `
    <div class="avatar js-avatar" aria-hidden="true"></div>
    <div class="side-user-info"><div class="js-user-email"></div><span class="badge js-user-badge"></span></div>`;

  const wrap = document.createElement('div');
  wrap.id = 'app-shell';
  wrap.innerHTML = `
  <aside class="sidebar" id="app-sidebar">
    <a class="brand" href="dashboard.html" aria-label="짱구's Desk 홈">${logoSvg(32)}<span class="brand-text">짱구's Desk</span></a>
    <nav class="side-nav" aria-label="주 메뉴">${sideGroups}</nav>
    <div class="side-user">
      <div class="side-user-top">${userBlock}</div>
      <div class="side-user-actions">
        <button type="button" class="icon-btn theme-btn" onclick="toggleTheme()"></button>
        <button type="button" class="icon-btn" onclick="logout()" aria-label="로그아웃" title="로그아웃">${svgIcon('logout', 18)}</button>
      </div>
    </div>
  </aside>

  <header class="topbar">
    <a class="brand" href="dashboard.html" aria-label="짱구's Desk 홈">${logoSvg(28)}<span class="brand-text">짱구's Desk</span></a>
    <div class="topbar-actions">
      <button type="button" class="icon-btn theme-btn" onclick="toggleTheme()"></button>
    </div>
  </header>

  <nav class="tabbar" aria-label="하단 메뉴">
    ${tabItems}
    <button type="button" class="tab-item" id="tab-more" onclick="openMore()" aria-haspopup="dialog">${svgIcon('grid', 22)}<span>더보기</span></button>
  </nav>

  <div class="sheet-overlay" id="more-sheet" onclick="if(event.target===this)closeMore()">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="more-title">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <h2 id="more-title">전체 메뉴</h2>
        <button type="button" class="icon-btn sheet-close" onclick="closeMore()" aria-label="닫기">${svgIcon('close', 18)}</button>
      </div>
      <div class="menu-tiles">${tiles}</div>
      <div class="sheet-user">${userBlock}</div>
      <div class="sheet-actions">
        <button type="button" class="btn btn-outline" onclick="toggleTheme()"><span class="theme-ico"></span>테마 전환</button>
        <button type="button" class="btn btn-outline js-install" style="display:none" onclick="installPWA()">${svgIcon('download', 18)}앱으로 설치</button>
        <button type="button" class="btn btn-danger" onclick="logout()">${svgIcon('logout', 18)}로그아웃</button>
      </div>
    </div>
  </div>`;
  document.body.prepend(wrap);

  // head 보강: 노치 대응 + 아이콘
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp && !/viewport-fit/.test(vp.content)) vp.content += ', viewport-fit=cover';
  const addLink = (rel, href, type) => {
    if (document.querySelector(`link[rel="${rel}"]`)) return;
    const l = document.createElement('link'); l.rel = rel; l.href = href; if (type) l.type = type;
    document.head.appendChild(l);
  };
  addLink('icon', '/icons/icon-192.png', 'image/png');
  addLink('apple-touch-icon', '/icons/apple-touch-icon.png');

  initTheme();
  markActiveNav();
  updateInstallButtons();
}

// ===== 공통 AUTH HTML =====
const AUTH_HTML = `
<div id="auth-section" style="display:none">
  <div style="max-width:420px;margin:3rem auto;padding:0 1rem;">
    <div style="text-align:center;margin-bottom:1.5rem;">
      <svg width="60" height="60" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" style="border-radius:14px;">
        <rect width="44" height="44" rx="10" fill="#185FA5"/>
        <rect x="7" y="8" width="30" height="20" rx="3" fill="none" stroke="#B5D4F4" stroke-width="1.5"/>
        <rect x="11" y="12" width="8" height="2" rx="1" fill="#85B7EB"/>
        <rect x="11" y="16" width="14" height="2" rx="1" fill="#85B7EB"/>
        <rect x="11" y="20" width="10" height="2" rx="1" fill="#85B7EB"/>
        <rect x="19" y="28" width="6" height="3" rx="1" fill="#B5D4F4"/>
        <rect x="14" y="31" width="16" height="1.5" rx=".75" fill="#B5D4F4"/>
      </svg>
      <div style="font-size:1.4rem;font-weight:700;margin-top:.7rem;background:linear-gradient(135deg,#378ADD,#185FA5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">짱구's Desk</div>
      <div style="font-size:.83rem;color:var(--text-muted);margin-top:.3rem;">업무 관리 허브에 오신걸 환영해요 👋</div>
    </div>
    <div class="card">
      <div class="auth-tabs">
        <button class="auth-tab active" onclick="switchAuthTab('login')">로그인</button>
        <button class="auth-tab" onclick="switchAuthTab('signup')">회원가입</button>
      </div>
      <div id="auth-alert"></div>
      <div id="tab-login">
        <div class="form-group"><label>이메일</label><input type="email" id="login-email" placeholder="example@email.com"></div>
        <div class="form-group"><label>비밀번호</label><input type="password" id="login-pw" onkeydown="if(event.key==='Enter')doLogin()"></div>
        <button class="btn btn-primary" onclick="doLogin()">로그인</button>
      </div>
      <div id="tab-signup" style="display:none">
        <div class="form-group"><label>이메일</label><input type="email" id="signup-email"></div>
        <div class="form-group"><label>비밀번호</label><input type="password" id="signup-pw" placeholder="6자 이상"></div>
        <button class="btn btn-primary" onclick="doSignup()">회원가입</button>
      </div>
    </div>
  </div>
</div>
<div id="pending-msg" class="pending-msg" style="display:none">
  <div class="icon">⏳</div><h3>승인 대기 중</h3><p>관리자가 승인하면 이용할 수 있습니다.</p>
</div>
`;

// body 맨 앞에 nav + auth 삽입 (HTML 건드리지 않고 prepend 사용)
document.addEventListener('DOMContentLoaded', () => {
  // 사이드바 / 상단바 / 하단 탭바 삽입
  renderShell();

  // auth 섹션 삽입 (main-section 앞에)
  const mainSection = document.getElementById('main-section');
  if (mainSection) {
    const authDiv = document.createElement('div');
    authDiv.innerHTML = AUTH_HTML;
    document.body.insertBefore(authDiv, mainSection);
  }

  // toast 추가
  if (!document.getElementById('toast')) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  // pwa banner 추가
  if (!document.getElementById('pwa-banner-area')) {
    const banner = document.createElement('div');
    banner.id = 'pwa-banner-area';
    banner.className = 'container';
    banner.style.paddingBottom = '0';
    if (mainSection) mainSection.prepend(banner);
  }
});
