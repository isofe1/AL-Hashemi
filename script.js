const state = {
  data: null,
  activeClassIndex: 0,
  renderToken: 0,
  pendingRenderTimer: null,
};

const THUMBNAIL_ROOT_MARGIN = "300px";
const MAX_THUMBNAIL_CONCURRENCY = 3;

const thumbnailCache = new Map();
const thumbnailQueue = [];
let activeThumbnailJobs = 0;

const classListEl = document.getElementById("classList");
const classTitleEl = document.getElementById("classTitle");
const lecturesGridEl = document.getElementById("lecturesGrid");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const sidebarEl = document.getElementById("sidebar");
const sidebarToggleEl = document.getElementById("sidebarToggle");

const modalEl = document.getElementById("videoModal");
const modalVideoEl = document.getElementById("modalVideo");
const modalTitleEl = document.getElementById("modalTitle");
const closeModalEl = document.getElementById("closeModal");

const thumbnailObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const mediaEl = entry.target;
      thumbnailObserver.unobserve(mediaEl);
      enqueueThumbnailJob(mediaEl);
    });
  },
  { rootMargin: THUMBNAIL_ROOT_MARGIN }
);

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
      populateLectureCards(selected.lectures || []);
      lecturesGridEl.style.opacity = "1";
      state.pendingRenderTimer = null;
    }, 120);
    return;
  }

  populateLectureCards(selected.lectures || []);
}

function populateLectureCards(lectures) {
  resetThumbnailWork();
  lecturesGridEl.innerHTML = "";

  const fragment = document.createDocumentFragment();

  lectures.forEach((lecture, index) => {
    const card = document.createElement("article");
    card.className = "lecture-card";
    card.style.animationDelay = `${Math.min(index * 35, 350)}ms`;

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "thumbnail-wrap";

    const thumbnail = document.createElement("img");
    thumbnail.className = "thumbnail thumbnail-media";
    thumbnail.alt = lecture.title || `محاضرة ${index + 1}`;
    thumbnail.loading = "lazy";
    thumbnail.decoding = "async";
    thumbnail.fetchPriority = "low";
    thumbnail.dataset.videoUrl = lecture.url || "";
    thumbnail.dataset.renderToken = String(state.renderToken);

    const thumbnailOverlay = document.createElement("div");
    thumbnailOverlay.className = "thumbnail-overlay";
    thumbnailOverlay.setAttribute("aria-hidden", "true");

    const durationBadge = document.createElement("span");
    durationBadge.className = "duration-badge";
    durationBadge.textContent = `▶ ${lecture.duration || "--:--"}`;

    thumbWrap.append(thumbnail, thumbnailOverlay, durationBadge);

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

    thumbnailObserver.observe(thumbnail);
  });

  lecturesGridEl.appendChild(fragment);
  lecturesGridEl.classList.remove("hidden");
}

function resetThumbnailWork() {
  state.renderToken += 1;
  thumbnailObserver.disconnect();
  thumbnailQueue.length = 0;
}

function enqueueThumbnailJob(mediaEl) {
  const job = {
    mediaEl,
    videoUrl: mediaEl.dataset.videoUrl || "",
    renderToken: Number(mediaEl.dataset.renderToken || "0"),
  };

  thumbnailQueue.push(job);
  processThumbnailQueue();
}

function processThumbnailQueue() {
  while (activeThumbnailJobs < MAX_THUMBNAIL_CONCURRENCY && thumbnailQueue.length) {
    const job = thumbnailQueue.shift();
    if (!job) break;

    if (!isThumbnailJobValid(job)) {
      continue;
    }

    activeThumbnailJobs += 1;

    getThumbnailForUrl(job.videoUrl)
      .then((thumbnailDataUrl) => {
        if (!isThumbnailJobValid(job)) return;
        job.mediaEl.src = thumbnailDataUrl;
      })
      .catch(() => {
        if (!isThumbnailJobValid(job)) return;
        renderFallbackThumbnail(job.mediaEl);
      })
      .finally(() => {
        activeThumbnailJobs = Math.max(0, activeThumbnailJobs - 1);
        processThumbnailQueue();
      });
  }
}

function isThumbnailJobValid(job) {
  return job.mediaEl.isConnected && job.renderToken === state.renderToken;
}

function getThumbnailForUrl(url) {
  if (!url || url.endsWith(".m3u8")) {
    return Promise.reject(new Error("m3u8_or_invalid"));
  }

  if (!thumbnailCache.has(url)) {
    thumbnailCache.set(url, generateVideoThumbnail(url));
  }

  return thumbnailCache.get(url);
}

function generateVideoThumbnail(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.muted = true;
    video.preload = "metadata";
    video.playsInline = true;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("thumbnail_timeout"));
    }, 6000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
    };

    video.addEventListener(
      "loadedmetadata",
      () => {
        if (!isFinite(video.duration) || video.duration <= 0) {
          cleanup();
          reject(new Error("invalid_duration"));
          return;
        }

        video.currentTime = Math.min(video.duration * 0.2, Math.max(video.duration - 0.2, 0));
      },
      { once: true }
    );

    video.addEventListener(
      "seeked",
      () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) throw new Error("no_canvas_context");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          cleanup();
          reject(err);
        }
      },
      { once: true }
    );

    video.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("video_error"));
      },
      { once: true }
    );
  });
}

function renderFallbackThumbnail(mediaEl) {
  if (!mediaEl.isConnected) return;

  const fallback = document.createElement("div");
  fallback.className = "thumbnail-fallback thumbnail-media";

  const playIcon = document.createElement("div");
  playIcon.className = "fallback-play";
  fallback.appendChild(playIcon);

  mediaEl.replaceWith(fallback);
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

sidebarToggleEl.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
});

classListEl.addEventListener("click", (event) => {
  const button = event.target.closest(".class-btn");
  if (!button) return;

  const index = Number(button.dataset.classIndex);
  if (!Number.isInteger(index) || index === state.activeClassIndex) {
    sidebarEl.classList.remove("open");
    return;
  }

  state.activeClassIndex = index;
  renderSidebar();
  renderLectures(true);
  sidebarEl.classList.remove("open");
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

init();
