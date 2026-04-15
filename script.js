let player; 
let currentVideoUrl = ""; 

const state = {
  data: null,
  activeClassIndex: 0,
  pendingRenderTimer: null,
};

const CHAPTER_GRADIENTS = [
  "linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, #000 100%)",
  "linear-gradient(135deg, rgba(94, 92, 230, 0.25) 0%, #000 100%)",
  "linear-gradient(135deg, rgba(100, 210, 255, 0.2) 0%, #000 100%)",
  "linear-gradient(135deg, rgba(48, 209, 88, 0.2) 0%, #000 100%)",
  "linear-gradient(135deg, rgba(255, 159, 10, 0.2) 0%, #000 100%)",
  "linear-gradient(135deg, rgba(191, 94, 230, 0.2) 0%, #000 100%)",
  "linear-gradient(135deg, rgba(142, 142, 147, 0.3) 0%, #000 100%)",
  "linear-gradient(135deg, rgba(255, 55, 95, 0.2) 0%, #000 100%)"
];

const classListEl = document.getElementById("classList");
const classTitleEl = document.getElementById("classTitle");
const lecturesGridEl = document.getElementById("lecturesGrid");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const sidebarEl = document.getElementById("sidebar");
const sidebarToggleEl = document.getElementById("sidebarToggle");
const layoutEl = document.getElementById("layout");
const modalEl = document.getElementById("videoModal");
const modalTitleEl = document.getElementById("modalTitle");
const closeModalEl = document.getElementById("closeModal");
const continueBanner = document.getElementById("continueWatchingBanner");
const continueText = document.getElementById("continueText");

async function init() {
  try {
    showLoading();
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("failed to fetch");
    const data = await res.json();
    state.data = data?.classes ? data : { classes: [] };
    if (!state.data.classes.length) { showError("لا توجد بيانات محاضرات حالياً."); return; }
    renderSidebar();
    renderLectures();
    hideLoading();
    checkContinueWatching(); 
  } catch (e) { console.error(e); showError(); }
}

function renderSidebar() {
  classListEl.innerHTML = "";
  const fragment = document.createDocumentFragment();
  state.data.classes.forEach((classItem, index) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `class-btn ${index === state.activeClassIndex ? "active" : ""}`;
    btn.dataset.classIndex = String(index);
    btn.innerHTML = `<span class="icon-dot" aria-hidden="true"></span><span>${classItem.name}</span>`;
    li.appendChild(btn);
    fragment.appendChild(li);
  });
  classListEl.appendChild(fragment);
}

function renderLectures(animated = false) {
  const selected = state.data.classes[state.activeClassIndex];
  classTitleEl.textContent = selected.name;
  if (state.pendingRenderTimer) { clearTimeout(state.pendingRenderTimer); state.pendingRenderTimer = null; }
  if (animated) {
    lecturesGridEl.style.opacity = "0";
    state.pendingRenderTimer = setTimeout(() => {
      populateLectureCards(selected);
      lecturesGridEl.style.opacity = "1";
      state.pendingRenderTimer = null;
    }, 120);
    return;
  }
  populateLectureCards(selected);
}

function populateLectureCards(selectedClass) {
  const lectures = selectedClass.lectures || [];
  lecturesGridEl.innerHTML = "";
  const fragment = document.createDocumentFragment();
  lectures.forEach((lecture, index) => {
    const card = document.createElement("article");
    card.className = "lecture-card";
    card.style.animationDelay = `${Math.min(index * 35, 350)}ms`;
    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumbnail-wrap";
    let mediaElement;
    if (selectedClass.coverImage || lecture.coverImage) {
      mediaElement = document.createElement("img");
      mediaElement.className = "thumbnail thumbnail-media";
      mediaElement.src = lecture.coverImage || selectedClass.coverImage;
      mediaElement.onerror = () => renderFallbackCover(thumbWrap, mediaElement, selectedClass.name, state.activeClassIndex);
    } else {
      mediaElement = renderFallbackCover(null, null, selectedClass.name, state.activeClassIndex, lecture.title);
    }
    const thumbnailOverlay = document.createElement("div");
    thumbnailOverlay.className = "thumbnail-overlay";
    const durationBadge = document.createElement("span");
    durationBadge.className = "duration-badge";
    durationBadge.textContent = `▶ ${lecture.duration || "--:--"}`;
    thumbWrap.append(mediaElement, thumbnailOverlay, durationBadge);
    const body = document.createElement("div");
    body.className = "lecture-body";
    const title = document.createElement("h3");
    title.className = "lecture-title";
    title.textContent = lecture.title || `محاضرة ${index + 1}`;
    const watchBtn = document.createElement("button");
    watchBtn.className = "watch-btn";
    watchBtn.textContent = "مشاهدة";
    watchBtn.dataset.lectureIndex = String(index);
    body.append(title, watchBtn);
    card.append(thumbWrap, body);
    fragment.appendChild(card);
  });
  lecturesGridEl.appendChild(fragment);
  lecturesGridEl.classList.remove("hidden");
}

function renderFallbackCover(container, oldElement, chapterName, classIndex, lectureTitle) {
  const fallback = document.createElement("div");
  fallback.className = "thumbnail-fallback thumbnail-media";
  fallback.style.background = CHAPTER_GRADIENTS[classIndex % CHAPTER_GRADIENTS.length];
  const chapterLabel = document.createElement("div");
  chapterLabel.className = "fallback-chapter-name";
  chapterLabel.textContent = chapterName;
  const titleLabel = document.createElement("div");
  titleLabel.className = "fallback-lecture-title";
  titleLabel.textContent = lectureTitle || "";
  fallback.append(chapterLabel, titleLabel);
  if (container && oldElement && oldElement.parentNode === container) container.replaceChild(fallback, oldElement);
  return fallback;
}

function getMimeType(url) {
  if (url.endsWith('.webm')) return 'video/webm';
  if (url.endsWith('.ogg')) return 'video/ogg';
  if (url.endsWith('.m3u8')) return 'application/x-mpegURL';
  return 'video/mp4';
}

function openVideoModal(lecture) {
  modalTitleEl.textContent = lecture.title || "مشاهدة المحاضرة";
  currentVideoUrl = lecture.url; 
  player.source = { type: 'video', title: lecture.title, sources: [{ src: lecture.url, type: getMimeType(lecture.url) }] };
  modalEl.classList.remove("hidden");
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none"; 
  const savedTime = localStorage.getItem('vid_progress_' + currentVideoUrl);
  setTimeout(() => {
    if (savedTime && parseFloat(savedTime) > 30) player.currentTime = parseFloat(savedTime);
    player.play();
  }, 300);
}

function closeVideoModal() {
  player.stop();
  modalEl.classList.add("hidden");
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.touchAction = ""; 
}

function showLoading() { loadingEl.classList.remove("hidden"); errorEl.classList.add("hidden"); lecturesGridEl.classList.add("hidden"); }
function hideLoading() { loadingEl.classList.add("hidden"); }
function showError(message) { loadingEl.classList.add("hidden"); lecturesGridEl.classList.add("hidden"); errorEl.classList.remove("hidden"); if (message) errorEl.textContent = message; }
function isMobileViewport() { return window.matchMedia("(max-width: 900px)").matches; }

function setSidebarCollapsed(collapsed) {
  sidebarEl.classList.toggle("is-collapsed", collapsed);
  layoutEl.classList.toggle("sidebar-collapsed", collapsed);
  if (window.innerWidth <= 900) { document.documentElement.style.overflow = collapsed ? "" : "hidden"; document.body.style.overflow = collapsed ? "" : "hidden"; }
}

sidebarToggleEl.addEventListener("click", () => setSidebarCollapsed(!sidebarEl.classList.contains("is-collapsed")));

classListEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".class-btn");
  if (!btn) return;
  const idx = Number(btn.dataset.classIndex);
  if (idx === state.activeClassIndex) { if (isMobileViewport()) setSidebarCollapsed(true); return; }
  state.activeClassIndex = idx;
  renderSidebar();
  renderLectures(true);
  if (isMobileViewport()) setSidebarCollapsed(true);
});

lecturesGridEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".watch-btn");
  if (!btn || !state.data) return;
  const selected = state.data.classes[state.activeClassIndex];
  const lecture = selected.lectures?.[Number(btn.dataset.lectureIndex)];
  if (lecture) {
    localStorage.setItem('hashemi_last_watched', JSON.stringify({ lecture, chapterName: selected.name, classIndex: state.activeClassIndex }));
    if(continueBanner) { continueBanner.classList.remove('show'); setTimeout(() => continueBanner.classList.add('hidden'), 400); }
    openVideoModal(lecture);
  }
});

layoutEl.addEventListener("click", (e) => { if (isMobileViewport() && !sidebarEl.classList.contains("is-collapsed") && !e.target.closest('.sidebar')) setSidebarCollapsed(true); });
modalEl.addEventListener("click", (e) => { if (e.target.dataset.close === "true") closeVideoModal(); });
closeModalEl.addEventListener("click", closeVideoModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeVideoModal(); });

function checkContinueWatching() {
  if(!continueBanner) return;
  const savedDataStr = localStorage.getItem('hashemi_last_watched');
  if (savedDataStr) {
    const data = JSON.parse(savedDataStr);
    const savedTime = localStorage.getItem('vid_progress_' + data.lecture.url);
    if (savedTime && parseFloat(savedTime) > 30) {
      continueText.textContent = `${data.chapterName} - ${data.lecture.title}`;
      continueBanner.classList.remove("hidden");
      setTimeout(() => continueBanner.classList.add("show"), 500);
      continueBanner.onclick = (e) => {
        if(e.target.closest('#closeBannerBtn')) { continueBanner.classList.remove('show'); setTimeout(() => continueBanner.classList.add('hidden'), 400); return; }
        state.activeClassIndex = data.classIndex;
        renderSidebar();
        renderLectures();
        if (isMobileViewport()) setSidebarCollapsed(true);
        openVideoModal(data.lecture);
        continueBanner.classList.remove('show');
        setTimeout(() => continueBanner.classList.add('hidden'), 400);
      };
    }
  }
}

// --- نظام القائمة الذكي (للمستخدم الجديد والقديم) ---
const mobileMediaQuery = window.matchMedia("(max-width: 900px)");
const hasVisited = localStorage.getItem('hashemi_visited_v1');

if (!hasVisited) {
  // مستخدم جديد أول مرة يدخل الموقع: القائمة تظهر له (مفتوحة)
  setSidebarCollapsed(false);
  localStorage.setItem('hashemi_visited_v1', 'true');
} else {
  // مستخدم قديم (سوى ريفريش): القائمة تكون مغلقة إذا موبايل، ومفتوحة إذا كمبيوتر
  setSidebarCollapsed(isMobileViewport());
}

// تفاعل الشاشة في حال تدوير الموبايل
mobileMediaQuery.addEventListener("change", () => {
  setSidebarCollapsed(isMobileViewport());
});

init();

document.addEventListener('DOMContentLoaded', () => {
  player = new Plyr('#player', {
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
    settings: ['quality', 'speed'],
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] }
  });
  player.on('timeupdate', () => { if (currentVideoUrl && player.currentTime > 30) localStorage.setItem('vid_progress_' + currentVideoUrl, player.currentTime); });
  player.on('ended', () => { if (currentVideoUrl) { localStorage.removeItem('vid_progress_' + currentVideoUrl); localStorage.removeItem('hashemi_last_watched'); } });
  const videoWrapper = document.querySelector('.plyr');
  if (videoWrapper) {
    videoWrapper.addEventListener('dblclick', (e) => {
      e.stopImmediatePropagation(); e.preventDefault();
      const rect = videoWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x > rect.width / 2) player.forward(10); else player.rewind(10);
    }, true);
  }
});
