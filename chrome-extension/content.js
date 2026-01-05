let isDismissed = false;

function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function createOverlay() {
  if (isDismissed) return null;
  // Check if container already exists
  if (document.querySelector('.opennote-container')) return null;

  const container = document.createElement('div');
  container.className = 'opennote-container';

  // Learn Button
  const learnBtn = document.createElement('button');
  learnBtn.className = 'opennote-learn-btn';
  learnBtn.innerHTML = `
    <span>Learn</span>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  `;
  learnBtn.addEventListener('click', () => {
    const videoId = getVideoId();
    if (videoId) {
      window.open(`http://localhost:3000/learn?v=${videoId}`, '_blank');
    }
  });

  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'opennote-close-btn';
  closeBtn.title = "Dismiss";
  closeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
  closeBtn.addEventListener('click', () => {
    container.remove();
    isDismissed = true;
  });

  container.appendChild(learnBtn);
  container.appendChild(closeBtn);

  return container;
}

function injectOverlay() {
  // Only inject on watch pages
  if (window.location.pathname !== '/watch') {
    const existing = document.querySelector('.opennote-container');
    if (existing) existing.remove();
    return;
  }

  // If dismissed, don't show
  if (isDismissed) return;

  const videoId = getVideoId();
  if (!videoId) return;

  // If already exists, do nothing
  if (document.querySelector('.opennote-container')) return;

  const overlay = createOverlay();
  if (overlay) {
    document.body.appendChild(overlay);
  }
}

// Observe for page navigations (SPA)
const observer = new MutationObserver(() => {
  injectOverlay();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial injection try
injectOverlay();
