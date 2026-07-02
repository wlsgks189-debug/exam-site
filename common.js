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
function initTheme() {
  const t = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = t === 'dark' ? '🌙' : '☀️';
}
function toggleTheme() {
  const c = document.documentElement.getAttribute('data-theme');
  const n = c === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('theme', n);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = n === 'dark' ? '🌙' : '☀️';
}

// ===== PWA =====
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e; showPWABanner();
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

  // 네비 업데이트
  const emailEl = document.getElementById('nav-email');
  const badgeEl = document.getElementById('nav-badge');
  if (emailEl) emailEl.textContent = user.email;
  if (badgeEl) {
    badgeEl.textContent = currentRole === 'admin' ? '관리자' : '승인대기';
    badgeEl.className = currentRole === 'admin' ? 'badge badge-admin' : 'badge badge-pending';
  }

  // 탭 활성화 표시
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.page-tab').forEach(tab => {
    const href = tab.getAttribute('href');
    tab.classList.toggle('active', href === current || (current === '' && href === 'index.html'));
  });

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
  const emailEl = document.getElementById('nav-email');
  const badgeEl = document.getElementById('nav-badge');
  if (emailEl) emailEl.textContent = '';
  if (badgeEl) badgeEl.textContent = '';
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

// ===== 공통 NAV HTML =====
const NAV_HTML = `
<nav>
  <a href="index.html" style="display:flex;align-items:center;gap:.6rem;text-decoration:none;">
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
      <div style="font-size:.65rem;color:var(--text-muted);-webkit-text-fill-color:var(--text-muted)">업무 관리 허브</div>
    </div>
  </a>
  <div class="nav-right">
    <button class="theme-btn" onclick="toggleTheme()" id="theme-btn">🌙</button>
    <span class="nav-user" id="nav-email"></span>
    <span class="badge" id="nav-badge"></span>
    <button class="btn btn-outline btn-sm logout-btn" onclick="logout()">
      <span class="logout-text">로그아웃</span>
      <span class="logout-icon">↩</span>
    </button>
  </div>
</nav>
<div class="page-tabs">
  <a href="dashboard.html" class="page-tab">🏠 홈</a>
  <a href="index.html" class="page-tab">📁 자료실</a>
  <a href="upload.html" class="page-tab admin-only">📤 업로드</a>
  <a href="todo.html" class="page-tab">✅ 할일</a>
  <a href="project.html" class="page-tab">🚀 장기프로젝트</a>
  <a href="complaint.html" class="page-tab">📋 1:1 문의</a>
  <a href="complaint_history.html" class="page-tab">📨 민원 이력</a>
  <a href="worklog.html" class="page-tab">📝 업무 일지</a>
  <a href="bookmark.html" class="page-tab">🔖 북마크</a>
  <a href="notice.html" class="page-tab">📣 공지사항</a>
  <a href="delivery.html" class="page-tab admin-only">📦 택배 발송</a>
</div>
`;

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
  // nav + tabs 삽입
  const navDiv = document.createElement('div');
  navDiv.innerHTML = NAV_HTML;
  document.body.prepend(navDiv);

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
