const state = {
  data: null,
  activeClassIndex: 0,
  pendingRenderTimer: null,
};

// مصفوفة تدرجات لونية هادئة وراقية جداً (Apple & Glassmorphism Style)
const CHAPTER_GRADIENTS = [
  "linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, #000 100%)",   // أزرق ملكي خافت
  "linear-gradient(135deg, rgba(94, 92, 230, 0.25) 0%, #000 100%)",    // نيلي هادئ
  "linear-gradient(135deg, rgba(100, 210, 255, 0.2) 0%, #000 100%)",   // سماوي جليدي
  "linear-gradient(135deg, rgba(48, 209, 88, 0.2) 0%, #000 100%)",     // أخضر زمردي ناعم
  "linear-gradient(135deg, rgba(255, 159, 10, 0.2) 0%, #000 100%)",    // برتقالي دافئ (خريف)
  "linear-gradient(135deg, rgba(191, 94, 230, 0.2) 0%, #000 100%)",    // بنفسجي لافندر
  "linear-gradient(135deg, rgba(142, 142, 147, 0.3) 0%, #000 100%)",   // رمادي صخري راقٍ
  "linear-gradient(135deg, rgba(255, 55, 95, 0.2) 0%, #000 100%)"      // وردي ترابي
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
const modalVideoEl = document.getElementById("modalVideo");
const modalTitleEl = document.getElementById("modalTitle");
const closeModalEl = document.getElementById("closeModal");

async function init() {
  try {
    showLoading();
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("failed to fetch");

    const data = await res.json();
    state.data = data?.classes ? data : { classes: [] };

    if (!state.data.classes.length) {
      showError("لا توجد بيانات محاضرات حالياً.");
      return;
    }

    renderSidebar();
    renderLectures();
    hideLoading();
  } catch (e) {
    console.error(e);
    showError();
  }
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
    btn.innerHTML = `
      <span class="icon-dot" aria-hidden="true"></span>
      <span>${classItem.name}</span>
    `;

    li.appendChild(btn);
    fragment.appendChild(li);
  });

  classListEl.appendChild(fragment);
}

function renderLectures(animated = false) {
  const selected = state.data.classes[state.activeClassIndex];
  classTitleEl.textContent = selected.name;

  if (state.pendingRenderTimer) {
    clearTimeout(state.pendingRenderTimer);
    state.pendingRenderTimer = null;
  }

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
      mediaElement.alt = lecture.title || `محاضرة ${index + 1}`;
      mediaElement.loading = "lazy";
      mediaElement.src = lecture.coverImage || selectedClass.coverImage;
      mediaElement.onerror = () => renderFallbackCover(thumbWrap, mediaElement, selectedClass.name, state.activeClassIndex);
    } else {
      mediaElement = renderFallbackCover(null, null, selectedClass.name, state.activeClassIndex, lecture.title);
    }

    const thumbnailOverlay = document.createElement("div");
    thumbnailOverlay.className = "thumbnail-overlay";
    thumbnailOverlay.setAttribute("aria-hidden", "true");

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
    watchBtn.type = "button";
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

  // إضافة عنوان المحاضرة
  const titleLabel = document.createElement("div");
  titleLabel.className = "fallback-lecture-title";
  titleLabel.textContent = lectureTitle || "";
  
  fallback.append(chapterLabel, titleLabel);

  if (container && oldElement && oldElement.parentNode === container) {
    container.replaceChild(fallback, oldElement);
  }
  return fallback;
}

function openVideoModal(lecture) {
  modalTitleEl.textContent = lecture.title || "مشاهدة المحاضرة";
  modalVideoEl.src = lecture.url;
  modalEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeVideoModal() {
  modalVideoEl.pause();
  modalVideoEl.removeAttribute("src");
  modalVideoEl.load();
  modalEl.classList.add("hidden");
  document.body.style.overflow = "";
}

function showLoading() {
  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
  lecturesGridEl.classList.add("hidden");
}

function hideLoading() {
  loadingEl.classList.add("hidden");
}

function showError(message) {
  loadingEl.classList.add("hidden");
  lecturesGridEl.classList.add("hidden");
  errorEl.classList.remove("hidden");
  if (message) errorEl.textContent = message;
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function setSidebarCollapsed(collapsed) {
  sidebarEl.classList.toggle("is-collapsed", collapsed);
  layoutEl.classList.toggle("sidebar-collapsed", collapsed);
  sidebarToggleEl.setAttribute("aria-expanded", String(!collapsed));

  // هذا الجزء الجديد الخاص بحل مشكلة "تسرب السكرول"
  if (window.innerWidth <= 900) { // نطبق القفل فقط في الموبايل والتابلت
    if (!collapsed) {
      // إذا انفتحت القائمة: نقفل سكرول الصفحة الرئيسية
      document.body.style.overflow = "hidden";
    } else {
      // إذا انسدت القائمة: نرجع السكرول طبيعي
      document.body.style.overflow = "";
    }
  } else {
    // نضمن إن السكرول شغال دائماً على الكمبيوتر
    document.body.style.overflow = "";
  }
}

function syncSidebarForViewport() {
  setSidebarCollapsed(isMobileViewport());
}

sidebarToggleEl.addEventListener("click", () => {
  const isCollapsed = sidebarEl.classList.contains("is-collapsed");
  setSidebarCollapsed(!isCollapsed);
});

classListEl.addEventListener("click", (event) => {
  const button = event.target.closest(".class-btn");
  if (!button) return;

  const index = Number(button.dataset.classIndex);
  if (!Number.isInteger(index) || index === state.activeClassIndex) {
    if (isMobileViewport()) setSidebarCollapsed(true);
    return;
  }

  state.activeClassIndex = index;
  renderSidebar();
  renderLectures(true);
  if (isMobileViewport()) setSidebarCollapsed(true);
});

lecturesGridEl.addEventListener("click", (event) => {
  const button = event.target.closest(".watch-btn");
  if (!button || !state.data) return;

  const selected = state.data.classes[state.activeClassIndex];
  if (!selected) return;

  const lectureIndex = Number(button.dataset.lectureIndex);
  const lecture = selected.lectures?.[lectureIndex];
  if (!lecture) return;

  openVideoModal(lecture);
});

layoutEl.addEventListener("click", (event) => {
  if (isMobileViewport() && !sidebarEl.classList.contains("is-collapsed")) {
    if (!event.target.closest('.sidebar')) {
      setSidebarCollapsed(true);
    }
  }
});

modalEl.addEventListener("click", (event) => {
  if (event.target.dataset.close === "true") {
    closeVideoModal();
  }
});

closeModalEl.addEventListener("click", closeVideoModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalEl.classList.contains("hidden")) {
    closeVideoModal();
  }
});

const mobileMediaQuery = window.matchMedia("(max-width: 900px)");
syncSidebarForViewport();
mobileMediaQuery.addEventListener("change", syncSidebarForViewport);

init();
