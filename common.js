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
  document.body.classList.toggle('is-pending', currentRole === 'pending');
  if (currentRole !== 'pending') startLeaveAlert(); else stopLeaveAlert();
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
  closeMore(); closeSearch(); closeQuickAdd(); closeWorkSettings(); stopLeaveAlert();
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
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  star4: '<path d="M12 3c.6 4.8 4.2 8.4 9 9-4.8.6-8.4 4.2-9 9-.6-4.8-4.2-8.4-9-9 4.8-.6 8.4-4.2 9-9z"/>',
  asterisk: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  ext: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  building: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01M15 11h.01"/>',
  sunrise: '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  sunset: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  bellOff: '<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'
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

// ===== 외부 바로가기 (여기만 고치면 대시보드와 검색창(Ctrl K)에 같이 반영) =====
const TOOL_LINKS = [
  { id: 'gemini',  name: 'Gemini',  url: 'https://gemini.google.com/app', icon: 'star4',    alias: ['제미나이', '제미니', 'google', '구글'] },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/',          icon: 'chat',     alias: ['gpt', '챗지피티', '지피티', '챗gpt', 'openai'] },
  { id: 'claude',  name: 'Claude',  url: 'https://claude.ai/',            icon: 'asterisk', alias: ['클로드', 'anthropic'] },
  { id: 'notion',  name: 'Notion',  url: 'https://www.notion.so/',        icon: 'log',      alias: ['노션'] },
  { id: 'icqa',    name: 'ICQA',    url: 'https://www.icqa.or.kr/',       icon: 'building', alias: ['한국정보통신자격협회', '정보통신자격협회', '자격협회', '협회', '홈페이지'], full: 'ICQA 한국정보통신자격협회' }
];
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

// ===== 오버레이 공통 (열린 창 관리 / 스크롤 잠금 / 포커스 가두기) =====
const _openOverlays = [];
function $id(id) { return document.getElementById(id); }
function overlayOpen(el, focusEl, closeFn) {
  if (!el || _openOverlays.some(o => o.el === el)) return;
  _openOverlays.push({ el, ret: document.activeElement, closeFn });
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (focusEl && focusEl.focus) focusEl.focus({ preventScroll: true });   // 사용자 동작 안에서 바로 포커스 (iOS 키보드 때문)
}
function overlayClose(el) {
  const i = _openOverlays.findIndex(o => o.el === el);
  if (i < 0) return;
  const o = _openOverlays.splice(i, 1)[0];
  el.classList.remove('open');
  if (!_openOverlays.length) document.body.style.overflow = '';
  if (o.ret && o.ret.focus && document.body.contains(o.ret)) o.ret.focus({ preventScroll: true });
}

// ===== 모바일 '더보기' 시트 =====
function openMore() { const sh = $id('more-sheet'); if (sh) overlayOpen(sh, sh.querySelector('.sheet-close'), closeMore); }
function closeMore() { const sh = $id('more-sheet'); if (sh) overlayClose(sh); }

// ===== 빠른 추가 (할일) =====
const _qa = { busy: false, loadingProjects: false };
function qaTimes() {
  const out = [];
  for (let h = 9; h <= 18; h++) for (const m of ['00', '30']) { if (h === 18 && m === '30') break; out.push(`${String(h).padStart(2, '0')}:${m}`); }
  return out;
}
function ymdLocal(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function qaDateFor(when) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (when === 'tomorrow') d.setDate(d.getDate() + 1);
  else if (when === 'nextweek') d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));   // 다음 주 월요일
  return ymdLocal(d);
}
function qaWhenValue() { const r = document.querySelector('input[name="qa-when"]:checked'); return r ? r.value : 'today'; }
function qaGetDate() { const w = qaWhenValue(); return w === 'custom' ? ($id('qa-date').value || '') : qaDateFor(w); }
function qaWhen() {
  const custom = qaWhenValue() === 'custom';
  $id('qa-date').style.display = custom ? '' : 'none';
  const v = qaGetDate();
  const hint = $id('qa-date-hint');
  if (!v) { hint.textContent = ''; return; }
  const [y, m, d] = v.split('-').map(Number);
  hint.textContent = `${m}월 ${d}일 (${['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()]})`;
}
function qaError(msg, focusId) {
  const el = $id('qa-err');
  el.textContent = msg; el.classList.add('show');
  if (focusId && $id(focusId)) $id(focusId).focus();
}
function qaReset(prefill) {
  const opts = '<option value="">선택</option>' + qaTimes().map(t => `<option value="${t}">${t}</option>`).join('');
  $id('qa-start').innerHTML = opts; $id('qa-end').innerHTML = opts;
  $id('qa-text').value = prefill || '';
  document.querySelector('input[name="qa-pri"][value="medium"]').checked = true;
  // 할일 페이지에서 다른 날짜를 보는 중이면 그 날짜를 기본으로
  const pageDate = ($id('todo-date') || {}).value;
  if (pageDate && /^\d{4}-\d{2}-\d{2}$/.test(pageDate) && pageDate !== qaDateFor('today')) {
    document.querySelector('input[name="qa-when"][value="custom"]').checked = true;
    $id('qa-date').value = pageDate;
  } else {
    document.querySelector('input[name="qa-when"][value="today"]').checked = true;
    $id('qa-date').value = '';
  }
  $id('qa-project').value = '';
  $id('qa-err').classList.remove('show'); $id('qa-err').textContent = '';
  $id('qa-submit').disabled = false; $id('qa-submit').textContent = '추가';
  _qa.busy = false;
  qaWhen();
}
async function qaLoadProjects() {
  if (_qa.loadingProjects || !currentUser) return;
  _qa.loadingProjects = true;
  try {
    const { data } = await sb.from('long_projects').select('id, title, status')
      .eq('user_id', currentUser.id).in('status', ['planning', 'active']).order('title');
    const sel = $id('qa-project'); if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">없음</option>' + (data || []).map(p => `<option value="${escHtml(p.id)}">${escHtml(p.title)}</option>`).join('');
    sel.value = cur;
  } catch (e) { /* 프로젝트 목록을 못 불러와도 할일 추가는 가능 */ }
  finally { _qa.loadingProjects = false; }
}
function openQuickAdd(prefill) {
  if (!shellReady()) return;
  const el = $id('qa-overlay'); if (!el) return;
  closeSearch(); closeMore(); closeWorkSettings();
  qaReset(typeof prefill === 'string' ? prefill : '');
  overlayOpen(el, $id('qa-text'), closeQuickAdd);
  qaLoadProjects();
}
function closeQuickAdd() { const el = $id('qa-overlay'); if (el) overlayClose(el); }
function qaKey(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); qaSubmit(); }
}
async function qaSubmit() {
  if (_qa.busy) return;
  const text = $id('qa-text').value.trim();
  const date = qaGetDate();
  const start = $id('qa-start').value, end = $id('qa-end').value;
  $id('qa-err').classList.remove('show');
  if (!text) return qaError('할일 내용을 입력해 주세요', 'qa-text');
  if (!date) return qaError('날짜를 선택해 주세요', 'qa-date');
  if (start && end && end <= start) return qaError('종료 시간은 시작 시간보다 늦어야 해요', 'qa-end');
  _qa.busy = true;
  const btn = $id('qa-submit'); btn.disabled = true; btn.textContent = '저장 중...';
  let failed = false;
  try {
    const { error } = await sb.from('todos').insert({
      user_id: currentUser.id, text, date,
      priority: (document.querySelector('input[name="qa-pri"]:checked') || {}).value || 'medium',
      start_time: start || null, end_time: end || null,
      project_id: $id('qa-project').value || null,
      done: false
    });
    failed = !!error;
  } catch (e) { failed = true; }
  _qa.busy = false; btn.disabled = false; btn.textContent = '추가';
  if (failed) return qaError('저장하지 못했어요. 잠시 후 다시 시도해 주세요');
  closeQuickAdd();
  showToast('✅ 할일 추가됐어요!');
  window.dispatchEvent(new CustomEvent('todo-added', { detail: { date } }));
}

// ===== 통합 검색 (Ctrl K) =====
const SEARCH_KINDS = ['todo', 'complaint', 'worklog', 'notice', 'bookmark', 'file'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function safeHttp(u) { try { const x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:'; } catch (e) { return false; } }
const KIND_INFO = {
  todo:      { label: '할일',      icon: 'todo',     url: r => 'todo.html' + (DATE_RE.test(r.ref_date || '') ? '?date=' + r.ref_date : '') },
  complaint: { label: '민원 이력', icon: 'inbox',    url: () => 'complaint_history.html' },
  worklog:   { label: '업무 일지', icon: 'log',      url: () => 'worklog.html' },
  notice:    { label: '공지사항',  icon: 'notice',   url: () => 'notice.html' },
  bookmark:  { label: '북마크',    icon: 'bookmark', url: r => (safeHttp(r.snippet) ? r.snippet : 'bookmark.html') },
  file:      { label: '자료실',    icon: 'folder',   url: () => 'index.html' }
};
const _s = { items: [], active: 0, seq: 0, timer: null, loading: false, error: false, remote: [] };

function hlText(text, q) {
  text = String(text == null ? '' : text);
  if (!q) return escHtml(text);
  const lower = text.toLowerCase(), ql = q.toLowerCase();
  let out = '', i = 0, idx;
  while ((idx = lower.indexOf(ql, i)) !== -1) {
    out += escHtml(text.slice(i, idx)) + '<mark>' + escHtml(text.slice(idx, idx + q.length)) + '</mark>';
    i = idx + q.length;
  }
  return out + escHtml(text.slice(i));
}
function searchQuery() { const i = $id('search-input'); return i ? i.value.trim() : ''; }
function searchBuild() {
  const q = searchQuery(), ql = q.toLowerCase();
  const isAdmin = currentRole === 'admin';
  const cur = currentFile();
  const nav = MENU
    .filter(m => (!m.admin || isAdmin) && (!q || m.label.toLowerCase().includes(ql) || (m.short || '').toLowerCase().includes(ql)))
    .map(m => ({ group: '이동', icon: m.icon, title: m.label, sub: m.href === cur ? '현재 페이지' : '', run: () => { closeSearch(); if (m.href !== cur) location.href = m.href; } }));
  const acts = [{ group: '작업', icon: 'plus', title: q ? `새 할일 추가: ${q}` : '새 할일 추가', kbd: q ? '' : 'N', run: () => { closeSearch(); openQuickAdd(q); } }];
  if (!q || /테마|다크|라이트|theme|dark|light/i.test(q)) {
    acts.push({ group: '작업', icon: document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon', title: '테마 전환', run: () => { toggleTheme(); closeSearch(); } });
  }
  const links = !q ? [] : TOOL_LINKS
    .filter(t => ((t.full || t.name) + ' ' + t.alias.join(' ')).toLowerCase().includes(ql))
    .map(t => ({ group: '바로가기', icon: t.icon, title: t.full || t.name, sub: t.url.replace(/^https?:\/\//, '').replace(/\/.*$/, ''), ext: true,
                 run: () => { closeSearch(); window.open(t.url, '_blank', 'noopener'); } }));
  if (!q || /퇴근|알림|근무|출근|설정/.test(q)) acts.push({ group: '작업', icon: 'bell', title: '퇴근 알림 설정', run: () => { closeSearch(); openWorkSettings(); } });
  const remote = SEARCH_KINDS.flatMap(k => _s.remote
    .filter(r => r && r.kind === k)
    .sort((a, b) => String(b.ref_date || '').localeCompare(String(a.ref_date || '')))
    .slice(0, 8)
    .map(r => {
      const info = KIND_INFO[k];
      const parts = k === 'bookmark' || k === 'file' ? [r.snippet] : [r.ref_date !== r.title ? r.ref_date : '', r.snippet];
      const url = info.url(r);
      const ext = k === 'bookmark' && safeHttp(r.snippet);
      return {
        group: info.label, icon: info.icon, hl: true, ext,
        title: r.title || '(제목 없음)', sub: parts.filter(Boolean).join(' · '),
        run: () => { closeSearch(); if (ext) window.open(url, '_blank', 'noopener'); else location.href = url; }
      };
    }));
  return { q, items: q ? [...nav, ...links, ...remote, ...acts] : [...acts, ...nav] };
}
function searchRender() {
  const list = $id('search-list'); if (!list) return;
  const { q, items } = searchBuild();
  _s.items = items;
  if (_s.active >= items.length) _s.active = Math.max(0, items.length - 1);
  let html = '', prev = '';
  items.forEach((it, i) => {
    if (it.group !== prev) { html += `<div class="palette-group" role="presentation">${escHtml(it.group)}</div>`; prev = it.group; }
    html += `<div class="palette-item${i === _s.active ? ' active' : ''}" role="option" id="so-${i}" data-i="${i}" aria-selected="${i === _s.active}">
      <span class="pi-ico">${svgIcon(it.icon, 16)}</span>
      <div class="pi-main"><div class="pi-title">${it.hl ? hlText(it.title, q) : escHtml(it.title)}</div>${it.sub ? `<div class="pi-sub">${it.hl ? hlText(it.sub, q) : escHtml(it.sub)}</div>` : ''}</div>
      ${it.kbd ? `<kbd>${escHtml(it.kbd)}</kbd>` : ''}${it.ext ? '<span class="pi-ext" title="새 탭에서 열기">↗</span>' : ''}
    </div>`;
  });
  const hasRemote = _s.remote.length > 0;
  let status = '';
  if (q && _s.loading) status = '검색 중...';
  else if (q && _s.error) status = '검색 기능을 불러오지 못했어요. 페이지 이동은 그대로 쓸 수 있어요.';
  else if (q && !hasRemote && !items.some(it => it.group !== '작업')) status = `'${q}'에 맞는 항목이 없어요`;   // 이동/바로가기 결과가 있으면 안내 안 함
  if (status) html += `<div class="palette-status">${escHtml(status)}</div>`;
  list.innerHTML = html;
  const input = $id('search-input');
  if (input) { if (items.length) input.setAttribute('aria-activedescendant', 'so-' + _s.active); else input.removeAttribute('aria-activedescendant'); }
  const live = $id('search-live');
  if (live) live.textContent = q && !_s.loading ? `결과 ${_s.remote.length}건` : '';
}
function searchActiveUpdate(scroll) {
  const list = $id('search-list'); if (!list) return;
  list.querySelectorAll('.palette-item').forEach(el => {
    const on = +el.dataset.i === _s.active;
    el.classList.toggle('active', on); el.setAttribute('aria-selected', on);
    if (on && scroll) el.scrollIntoView({ block: 'nearest' });
  });
  const input = $id('search-input'); if (input) input.setAttribute('aria-activedescendant', 'so-' + _s.active);
}
function searchRemote(q) {
  const my = ++_s.seq;
  if (!q) { _s.remote = []; _s.loading = false; _s.error = false; searchRender(); return; }
  _s.loading = true; searchRender();
  Promise.resolve(sb.rpc('global_search', { q: q.replace(/[\\%_]/g, '\\$&') })).then(res => {
    if (my !== _s.seq) return;                // 더 새로운 검색이 이미 시작됨
    _s.loading = false; _s.error = !!(res && res.error);
    _s.remote = res && !res.error && Array.isArray(res.data) ? res.data : [];
    searchRender();
  }).catch(() => {
    if (my !== _s.seq) return;
    _s.loading = false; _s.error = true; _s.remote = []; searchRender();
  });
}
function onSearchInput() {
  _s.active = 0; _s.remote = []; _s.error = false;
  const q = searchQuery();
  clearTimeout(_s.timer);
  _s.loading = !!q;
  searchRender();
  _s.timer = setTimeout(() => searchRemote(q), 220);
}
function searchKey(e) {
  if (e.isComposing || e.keyCode === 229) return;
  const n = _s.items.length;
  if (e.key === 'ArrowDown') { e.preventDefault(); if (n) { _s.active = (_s.active + 1) % n; searchActiveUpdate(true); } }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) { _s.active = (_s.active - 1 + n) % n; searchActiveUpdate(true); } }
  else if (e.key === 'Enter') { e.preventDefault(); const it = _s.items[_s.active]; if (it) it.run(); }
}
function openSearch() {
  if (!shellReady()) return;
  const el = $id('search-overlay'); if (!el) return;
  closeQuickAdd(); closeMore(); closeWorkSettings();
  $id('search-input').value = '';
  _s.active = 0; _s.remote = []; _s.loading = false; _s.error = false; _s.seq++;
  searchRender();
  overlayOpen(el, $id('search-input'), closeSearch);
}
function closeSearch() {
  clearTimeout(_s.timer); _s.seq++;
  const el = $id('search-overlay'); if (el) overlayClose(el);
}

// ===== 근무 시간 / 퇴근 알림 =====
// 설정은 이 기기(브라우저)에만 저장됨. 기본값: 출근 08:00, 퇴근 17:00 (수요일 16:00), 5분 전 알림
const WORK_KEY = 'icqa_work_v1', WORK_FIRED_KEY = 'icqa_leave_fired', WORK_SKIP_KEY = 'icqa_leave_skip';
const WORK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const WORK_DEFAULT = { enabled: true, start: '08:00', notifyBefore: 5, leave: ['', '17:00', '17:00', '16:00', '17:00', '17:00', ''] };   // leave[요일(0=일)]
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function pad2(n) { return String(n).padStart(2, '0'); }
function hm(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장 불가 환경이면 기본값으로 동작 */ } }
function workLoad() {
  let s = null; try { s = JSON.parse(lsGet(WORK_KEY) || 'null'); } catch (e) { s = null; }
  const cfg = { enabled: WORK_DEFAULT.enabled, start: WORK_DEFAULT.start, notifyBefore: WORK_DEFAULT.notifyBefore, leave: WORK_DEFAULT.leave.slice() };
  if (s && typeof s === 'object') {
    if (typeof s.enabled === 'boolean') cfg.enabled = s.enabled;
    if (TIME_RE.test(s.start || '')) cfg.start = s.start;
    if (Number.isInteger(s.notifyBefore) && s.notifyBefore >= 1 && s.notifyBefore <= 120) cfg.notifyBefore = s.notifyBefore;
    if (Array.isArray(s.leave)) for (let i = 0; i < 7; i++) { const v = s.leave[i]; if (v === '' || TIME_RE.test(v || '')) cfg.leave[i] = v; }
  }
  return cfg;
}
function workSave(cfg) { lsSet(WORK_KEY, JSON.stringify(cfg)); window.dispatchEvent(new CustomEvent('work-changed')); }
function atTime(base, hhmm) { const [h, m] = hhmm.split(':').map(Number); return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0); }
function fmtMinsLeft(m) { const h = Math.floor(m / 60), r = m % 60; if (h > 0 && r > 0) return `${h}시간 ${r}분`; if (h > 0) return `${h}시간`; return `${r}분`; }

// 지금 상태: rest(쉬는 날) / before(출근 전) / working / soon(알림 구간) / after(퇴근 후)
function workInfo(now) {
  now = now || new Date();
  const cfg = workLoad(), dow = now.getDay(), leaveStr = cfg.leave[dow];
  const out = { cfg, dow, state: 'rest', leaveAt: null, startAt: null, notifyAt: null, minsLeft: null, skipped: lsGet(WORK_SKIP_KEY) === ymdLocal(now) };
  if (!leaveStr) return out;
  out.leaveAt = atTime(now, leaveStr);
  out.startAt = atTime(now, cfg.start);
  out.notifyAt = new Date(out.leaveAt.getTime() - cfg.notifyBefore * 60000);
  if (now >= out.leaveAt) out.state = 'after';
  else if (now >= out.notifyAt) out.state = 'soon';
  else if (now < out.startAt) out.state = 'before';
  else out.state = 'working';
  out.minsLeft = Math.max(0, Math.ceil((out.leaveAt - now) / 60000));
  return out;
}

// ----- 알림 보내기 -----
function leavePermission() { return ('Notification' in window) ? Notification.permission : 'unsupported'; }
async function leaveAskPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'default') { try { return await Notification.requestPermission(); } catch (e) { return Notification.permission; } }
  return Notification.permission;
}
// 안드로이드 크롬은 new Notification() 이 막혀 있어서 서비스워커로 띄움
async function systemNotify(title, body) {
  if (leavePermission() !== 'granted') return false;
  const opts = { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'leave-alert', renotify: true, requireInteraction: true, vibrate: [200, 100, 200], data: { url: '/dashboard.html' } };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))]);
      if (reg && reg.showNotification) { await reg.showNotification(title, opts); return true; }
    }
  } catch (e) { /* 아래 방법으로 시도 */ }
  try { new Notification(title, opts); return true; } catch (e) { return false; }
}
function leaveToast(title, lines) {
  const old = $id('leave-toast'); if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'leave-toast'; el.className = 'leave-toast'; el.setAttribute('role', 'alert');
  const ic = document.createElement('span'); ic.className = 'lt-ico'; ic.innerHTML = svgIcon('bell', 20);
  const tx = document.createElement('div'); tx.className = 'lt-text';
  const t = document.createElement('strong'); t.textContent = title; tx.appendChild(t);
  lines.forEach(l => { const d = document.createElement('div'); d.textContent = l; tx.appendChild(d); });
  const act = document.createElement('div'); act.className = 'lt-actions';
  const go = document.createElement('a'); go.href = 'todo.html'; go.className = 'btn btn-outline btn-sm'; go.textContent = '할일 보기';
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-primary btn-sm'; ok.textContent = '확인'; ok.onclick = () => el.remove();
  act.appendChild(go); act.appendChild(ok);
  el.appendChild(ic); el.appendChild(tx); el.appendChild(act);
  document.body.appendChild(el);
}
let _titleBase = null;
function flashTitle(msg) {                                   // 탭이 가려져 있으면 탭 제목으로도 알림
  if (!document.hidden) return;
  if (_titleBase === null) _titleBase = document.title;
  document.title = '⏰ ' + msg;
  const restore = () => { if (!document.hidden) { if (_titleBase !== null) document.title = _titleBase; _titleBase = null; document.removeEventListener('visibilitychange', restore); } };
  document.addEventListener('visibilitychange', restore);
}
async function leaveRemainingTodos(now) {                   // 오늘 남은 할일 수 (못 가져오면 생략)
  try {
    const q = sb.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id).eq('date', ymdLocal(now)).eq('done', false);
    const res = await Promise.race([Promise.resolve(q), new Promise(r => setTimeout(() => r(null), 2500))]);
    return res && !res.error && typeof res.count === 'number' ? res.count : null;
  } catch (e) { return null; }
}
async function leaveNotify(info, now, isTest) {
  const mins = isTest ? info.cfg.notifyBefore : info.minsLeft;
  const leaveStr = info.leaveAt ? hm(info.leaveAt) : '';
  const remain = isTest ? null : await leaveRemainingTodos(now);
  const title = (isTest ? '[테스트] ' : '') + `퇴근 ${mins}분 전이에요`;
  const lines = [`${leaveStr || '--:--'} 퇴근 · 하던 일을 정리해 볼까요?`];
  if (remain > 0) lines.push(`오늘 할일 ${remain}개가 남아 있어요`);
  else if (remain === 0) lines.push('오늘 할일을 모두 끝냈어요');
  leaveToast(title, lines);
  flashTitle(title);
  await systemNotify(title, lines.join('\n'));
}

// ----- 스케줄러: 로그인한 모든 페이지에서 15초마다 확인 -----
let _leaveTimer = null;
function startLeaveAlert() {
  if (_leaveTimer) return;
  leaveCheck();
  _leaveTimer = setInterval(leaveCheck, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) leaveCheck(); });   // 절전/탭 복귀 때 바로 확인
  window.addEventListener('focus', leaveCheck);
}
function stopLeaveAlert() { clearInterval(_leaveTimer); _leaveTimer = null; }
async function leaveCheck() {
  if (!shellReady()) return;
  const now = new Date(), info = workInfo(now);
  if (!info.cfg.enabled || info.skipped || info.state !== 'soon') return;   // 알림 구간(퇴근 N분 전 ~ 퇴근 시각)에서만
  const today = ymdLocal(now);
  const fire = async () => {
    if (lsGet(WORK_FIRED_KEY) === today) return;                           // 하루에 한 번만
    lsSet(WORK_FIRED_KEY, today);
    await leaveNotify(info, now, false);
  };
  if (navigator.locks && navigator.locks.request) await navigator.locks.request('icqa-leave-alert', fire);   // 탭을 여러 개 열어도 한 번만
  else await fire();
}
function toggleLeaveSkip() {
  const today = ymdLocal(new Date());
  if (lsGet(WORK_SKIP_KEY) === today) lsSet(WORK_SKIP_KEY, ''); else lsSet(WORK_SKIP_KEY, today);
  window.dispatchEvent(new CustomEvent('work-changed'));
}
async function toggleLeaveAlert() {
  const cfg = workLoad();
  cfg.enabled = !cfg.enabled;
  if (cfg.enabled) {                                                       // 켤 때 브라우저 알림 권한 요청 (클릭 직후라 가능)
    const p = await leaveAskPermission();
    if (p === 'denied') showToast('브라우저 알림이 차단돼 있어요. 화면 안 알림만 나와요');
    else if (p === 'unsupported') showToast('이 브라우저는 시스템 알림을 못 써요. 화면 안 알림만 나와요');
  }
  workSave(cfg);
}

// ----- 설정 창 -----
const WK_ORDER = [1, 2, 3, 4, 5, 6, 0];   // 월~일
function wkPermUi() {
  const p = leavePermission(), el = $id('wk-perm'), btn = $id('wk-perm-btn');
  if (!el || !btn) return;
  btn.style.display = p === 'default' ? '' : 'none';
  el.textContent = {
    granted: '브라우저 알림이 허용돼 있어요. 탭이 백그라운드에 있어도 알림이 떠요.',
    default: '브라우저 알림을 허용하면 다른 창을 보고 있을 때도 알림이 떠요.',
    denied: '브라우저에서 알림이 차단돼 있어요. 주소창 왼쪽 자물쇠 → 알림 → 허용으로 바꾸면 돼요. 그 전에는 화면 안 알림만 나와요.',
    unsupported: '이 브라우저에서는 시스템 알림을 쓸 수 없어요. (아이폰은 홈 화면에 추가한 앱에서만 가능) 화면 안 알림은 그대로 나와요.'
  }[p];
}
function wkFill() {
  const cfg = workLoad();
  $id('wk-enabled').checked = cfg.enabled;
  $id('wk-start').value = cfg.start;
  $id('wk-before').value = String(cfg.notifyBefore);
  if (!$id('wk-before').value) { $id('wk-before').insertAdjacentHTML('beforeend', `<option value="${cfg.notifyBefore}">${cfg.notifyBefore}분 전</option>`); $id('wk-before').value = String(cfg.notifyBefore); }
  WK_ORDER.forEach(d => { $id('wk-leave-' + d).value = cfg.leave[d] || ''; });
  $id('wk-err').classList.remove('show'); $id('wk-err').textContent = '';
  wkPermUi();
}
function openWorkSettings() {
  if (!shellReady()) return;
  const el = $id('work-overlay'); if (!el) return;
  closeSearch(); closeMore(); closeQuickAdd();
  wkFill();
  overlayOpen(el, $id('wk-enabled'), closeWorkSettings);
}
function closeWorkSettings() { const el = $id('work-overlay'); if (el) overlayClose(el); }
async function wkAsk() { await leaveAskPermission(); wkPermUi(); }
function wkRead() {
  const cfg = { enabled: $id('wk-enabled').checked, start: $id('wk-start').value, notifyBefore: parseInt($id('wk-before').value, 10), leave: ['', '', '', '', '', '', ''] };
  WK_ORDER.forEach(d => { cfg.leave[d] = $id('wk-leave-' + d).value || ''; });
  return cfg;
}
function wkSave() {
  const cfg = wkRead(), err = $id('wk-err');
  const fail = (m, id) => { err.textContent = m; err.classList.add('show'); if (id && $id(id)) $id(id).focus(); };
  err.classList.remove('show');
  if (!TIME_RE.test(cfg.start)) return fail('출근 시각을 입력해 주세요', 'wk-start');
  for (const d of WK_ORDER) {
    const v = cfg.leave[d];
    if (v && v <= cfg.start) return fail(`${WORK_DAYS[d]}요일 퇴근 시각은 출근(${cfg.start})보다 늦어야 해요`, 'wk-leave-' + d);
  }
  workSave(cfg);
  const now = new Date(), inf = workInfo(now);                              // 알림 시각을 더 늦게 바꾼 경우, 오늘 알림을 다시 받을 수 있게
  if (lsGet(WORK_FIRED_KEY) === ymdLocal(now) && inf.notifyAt && now < inf.notifyAt) lsSet(WORK_FIRED_KEY, '');
  closeWorkSettings();
  showToast('✅ 근무 시간을 저장했어요');
}
async function wkTest() {
  const cfg = wkRead();
  if (cfg.enabled) await leaveAskPermission();
  wkPermUi();
  const now = new Date(), inf = workInfo(now);
  inf.cfg = Object.assign({}, inf.cfg, { notifyBefore: Number.isInteger(cfg.notifyBefore) ? cfg.notifyBefore : 5 });
  if (!inf.leaveAt) inf.leaveAt = atTime(now, '17:00');
  await leaveNotify(inf, now, true);
}

// ===== 단축키 =====
function shellReady() { return !!currentUser && !!currentRole && currentRole !== 'pending' && !document.body.classList.contains('auth-mode'); }
function isTypingTarget(t) { return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _openOverlays.length) {            // 가장 위에 열린 창부터 닫기
    e.preventDefault();
    const top = _openOverlays[_openOverlays.length - 1];
    if (top.closeFn) top.closeFn(); else overlayClose(top.el);
    return;
  }
  if (e.key === 'Tab' && _openOverlays.length) {               // 창 안에서만 Tab 이동
    const top = _openOverlays[_openOverlays.length - 1].el;
    const f = [...top.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
      .filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!top.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (e.isComposing || e.keyCode === 229) return;
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === 'KeyK') {   // Ctrl/⌘ + K
    if (!shellReady()) return;
    e.preventDefault();
    const s = $id('search-overlay');
    if (s && s.classList.contains('open')) closeSearch(); else openSearch();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || _openOverlays.length || isTypingTarget(e.target)) return;
  if (!shellReady()) return;
  if (e.code === 'Slash' && !e.shiftKey) { e.preventDefault(); openSearch(); }       // /
  else if (e.code === 'KeyN' && !e.shiftKey) { e.preventDefault(); openQuickAdd(); } // N
});

// 빠른 추가 / 검색 창 HTML
function extraOverlaysHtml() {
  const radio = (name, v, label, checked, onchange) =>
    `<label><input type="radio" name="${name}" value="${v}"${checked ? ' checked' : ''}${onchange ? ` onchange="${onchange}"` : ''}><span>${label}</span></label>`;
  return `
  <button type="button" class="fab" onclick="openQuickAdd()" aria-label="빠른 추가">${svgIcon('plus', 26)}</button>

  <div class="sheet-overlay center-md" id="qa-overlay" onclick="if(event.target===this)closeQuickAdd()">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="qa-title">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <h2 id="qa-title">빠른 추가</h2>
        <button type="button" class="icon-btn sheet-close" onclick="closeQuickAdd()" aria-label="닫기">${svgIcon('close', 18)}</button>
      </div>
      <div class="qa-field"><label class="qa-label" for="qa-text">할일 내용</label>
        <textarea id="qa-text" rows="2" placeholder="무엇을 해야 하나요?" onkeydown="qaKey(event)"></textarea></div>
      <div class="qa-field"><span class="qa-label" id="qa-pri-l">우선순위</span>
        <div class="seg pri" role="radiogroup" aria-labelledby="qa-pri-l">
          ${radio('qa-pri', 'high', '높음')}${radio('qa-pri', 'medium', '보통', true)}${radio('qa-pri', 'low', '낮음')}
        </div></div>
      <div class="qa-field"><span class="qa-label" id="qa-when-l">날짜</span>
        <div class="chips" role="radiogroup" aria-labelledby="qa-when-l">
          ${radio('qa-when', 'today', '오늘', true, 'qaWhen()')}${radio('qa-when', 'tomorrow', '내일', false, 'qaWhen()')}${radio('qa-when', 'nextweek', '다음 주', false, 'qaWhen()')}${radio('qa-when', 'custom', '직접', false, 'qaWhen()')}
        </div>
        <input type="date" id="qa-date" style="display:none;margin-top:.5rem" aria-label="날짜 직접 선택" onchange="qaWhen()">
        <div class="qa-hint" id="qa-date-hint" aria-live="polite"></div></div>
      <div class="qa-row qa-field">
        <div><label class="qa-label" for="qa-start">시작 시간</label><select id="qa-start"></select></div>
        <div><label class="qa-label" for="qa-end">종료 시간</label><select id="qa-end"></select></div>
      </div>
      <div class="qa-field"><label class="qa-label" for="qa-project">연결 프로젝트 (선택)</label>
        <select id="qa-project"><option value="">없음</option></select></div>
      <div class="qa-err" id="qa-err" role="alert"></div>
      <div class="qa-actions">
        <button type="button" class="btn btn-outline" onclick="closeQuickAdd()">취소</button>
        <button type="button" class="btn btn-primary" id="qa-submit" onclick="qaSubmit()">추가</button>
      </div>
    </div>
  </div>


  <div class="sheet-overlay center-md" id="work-overlay" onclick="if(event.target===this)closeWorkSettings()">
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="wk-title">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <h2 id="wk-title">퇴근 알림 설정</h2>
        <button type="button" class="icon-btn sheet-close" onclick="closeWorkSettings()" aria-label="닫기">${svgIcon('close', 18)}</button>
      </div>
      <label class="wk-switch"><input type="checkbox" id="wk-enabled"><span>퇴근 알림 사용</span></label>
      <div class="qa-hint wk-perm" id="wk-perm" aria-live="polite"></div>
      <button type="button" class="btn btn-outline btn-sm" id="wk-perm-btn" onclick="wkAsk()" style="display:none;margin-bottom:.9rem">브라우저 알림 허용하기</button>
      <div class="qa-row qa-field">
        <div><label class="qa-label" for="wk-start">출근 시각</label><input type="time" id="wk-start"></div>
        <div><label class="qa-label" for="wk-before">알림 시점</label>
          <select id="wk-before"><option value="5">5분 전</option><option value="10">10분 전</option><option value="15">15분 전</option><option value="30">30분 전</option></select></div>
      </div>
      <div class="qa-field"><span class="qa-label">요일별 퇴근 시각 (비워두면 쉬는 날)</span>
        <div class="wk-days"><label class="wk-day"><span>월</span><input type="time" id="wk-leave-1" aria-label="월요일 퇴근 시각"></label><label class="wk-day"><span>화</span><input type="time" id="wk-leave-2" aria-label="화요일 퇴근 시각"></label><label class="wk-day"><span>수</span><input type="time" id="wk-leave-3" aria-label="수요일 퇴근 시각"></label><label class="wk-day"><span>목</span><input type="time" id="wk-leave-4" aria-label="목요일 퇴근 시각"></label><label class="wk-day"><span>금</span><input type="time" id="wk-leave-5" aria-label="금요일 퇴근 시각"></label><label class="wk-day"><span>토</span><input type="time" id="wk-leave-6" aria-label="토요일 퇴근 시각"></label><label class="wk-day"><span>일</span><input type="time" id="wk-leave-0" aria-label="일요일 퇴근 시각"></label></div></div>
      <div class="qa-hint">설정은 이 기기의 브라우저에만 저장돼요. 공휴일·연차는 자동으로 구분하지 않으니, 그날은 화면의 &quot;오늘은 끄기&quot;를 눌러 주세요.</div>
      <div class="qa-err" id="wk-err" role="alert"></div>
      <div class="qa-actions">
        <button type="button" class="btn btn-outline" onclick="wkTest()">테스트 알림</button>
        <button type="button" class="btn btn-outline" onclick="closeWorkSettings()">취소</button>
        <button type="button" class="btn btn-primary" onclick="wkSave()">저장</button>
      </div>
    </div>
  </div>

  <div class="palette-overlay" id="search-overlay" onclick="if(event.target===this)closeSearch()">
    <div class="palette" role="dialog" aria-modal="true" aria-label="검색">
      <div class="palette-input">
        ${svgIcon('search', 18)}
        <input id="search-input" type="text" role="combobox" aria-expanded="true" aria-controls="search-list" aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" placeholder="검색하거나 페이지로 이동" aria-label="검색어" oninput="onSearchInput()" onkeydown="searchKey(event)">
        <kbd class="palette-esc">Esc</kbd>
        <button type="button" class="icon-btn palette-close" onclick="closeSearch()" aria-label="검색 닫기">${svgIcon('close', 18)}</button>
      </div>
      <div class="palette-list" id="search-list" role="listbox" aria-label="검색 결과"></div>
      <div class="sr-only" id="search-live" aria-live="polite"></div>
      <div class="palette-foot"><span>↑↓ 이동</span><span>Enter 열기</span><span>Esc 닫기</span></div>
    </div>
  </div>`;
}
function bindShellExtras() {
  const mac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
  document.querySelectorAll('.js-kbd-search').forEach(k => { k.textContent = mac ? '⌘K' : 'Ctrl K'; });
  const list = $id('search-list');
  if (list) {
    list.addEventListener('click', e => {
      const el = e.target.closest('.palette-item');
      if (el && _s.items[+el.dataset.i]) _s.items[+el.dataset.i].run();
    });
    list.addEventListener('mousemove', e => {
      const el = e.target.closest('.palette-item');
      if (el && +el.dataset.i !== _s.active) { _s.active = +el.dataset.i; searchActiveUpdate(false); }
    });
  }
}

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

  const sideActions = `
    <div class="side-actions">
      <button type="button" class="side-btn primary" onclick="openQuickAdd()" title="빠른 추가 (N)">${svgIcon('plus', 18)}<span class="nav-label">빠른 추가</span><kbd class="nav-label">N</kbd></button>
      <button type="button" class="side-btn" onclick="openSearch()" title="검색 (Ctrl K)">${svgIcon('search', 18)}<span class="nav-label">검색</span><kbd class="nav-label js-kbd-search">Ctrl K</kbd></button>
    </div>`;

  const userBlock = `
    <div class="avatar js-avatar" aria-hidden="true"></div>
    <div class="side-user-info"><div class="js-user-email"></div><span class="badge js-user-badge"></span></div>`;

  const wrap = document.createElement('div');
  wrap.id = 'app-shell';
  wrap.innerHTML = `
  <aside class="sidebar" id="app-sidebar">
    <a class="brand" href="dashboard.html" aria-label="짱구's Desk 홈">${logoSvg(32)}<span class="brand-text">짱구's Desk</span></a>
    ${sideActions}
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
      <button type="button" class="icon-btn js-search-btn" onclick="openSearch()" aria-label="검색">${svgIcon('search', 18)}</button>
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
  </div>
  ${extraOverlaysHtml()}`;
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
  bindShellExtras();
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
