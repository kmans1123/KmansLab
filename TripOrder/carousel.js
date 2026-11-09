document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const viewport = carousel.querySelector("[data-carousel-viewport]");
  const track = carousel.querySelector("[data-carousel-track]");
  const previousButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const countLabel = carousel.querySelector("[data-carousel-count]");
  const dots = [...carousel.querySelectorAll(".carousel-dots button")];
  const slides = track ? [...track.children] : [];
  const slideCount = slides.length;
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = lightbox?.querySelector("[data-lightbox-image]");
  const lightboxCount = lightbox?.querySelector("[data-lightbox-count]");
  const lightboxClose = lightbox?.querySelector("[data-lightbox-close]");
  const lightboxPrevious = lightbox?.querySelector("[data-lightbox-prev]");
  const lightboxNext = lightbox?.querySelector("[data-lightbox-next]");

  if (!viewport || !track || !slideCount || dots.length !== slideCount || !lightbox || !lightboxImage) return;

  const cloneForLoop = (slide) => {
    const clone = slide.cloneNode(true);
    clone.classList.remove("is-active");
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");
    return clone;
  };
  const extraCycles = 2;
  const leadingClones = Array.from({ length: extraCycles }, () => slides.map(cloneForLoop)).flat();
  const trailingClones = Array.from({ length: extraCycles }, () => slides.map(cloneForLoop)).flat();
  track.prepend(...leadingClones);
  track.append(...trailingClones);

  const allSlides = [...track.children];
  const centerOffset = extraCycles * slideCount;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = centerOffset;
  let intendedIndex = centerOffset;
  let timer = null;
  let settleTimer = null;
  let inView = true;
  let scrolling = false;
  let lightboxIndex = 0;
  let lightboxOpen = false;
  let returnFocus = null;

  function logicalIndex(index = activeIndex) {
    return ((index % slideCount) + slideCount) % slideCount;
  }

  function updateState() {
    allSlides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.toggleAttribute("inert", !isActive);
      slide.setAttribute("aria-label", `${logicalIndex(index) + 1} / ${slideCount}`);
    });
    dots.forEach((dot, index) => {
      if (index === logicalIndex()) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    if (countLabel) countLabel.textContent = `${String(logicalIndex() + 1).padStart(2, "0")} / ${String(slideCount).padStart(2, "0")}`;
  }

  function centerSlide(index, smooth = true) {
    const slide = allSlides[index];
    if (!slide) return;
    const left = slide.offsetLeft + slide.clientWidth / 2 - viewport.clientWidth / 2;
    viewport.scrollTo({
      left: Math.max(0, left),
      behavior: smooth && !motionPreference.matches ? "smooth" : "auto"
    });
  }

  function setTrackPadding() {
    const slideWidth = slides[0]?.clientWidth ?? 0;
    const sidePadding = Math.max(0, (viewport.clientWidth - slideWidth) / 2);
    track.style.paddingInline = `${sidePadding}px`;
  }

  function updateFromScroll() {
    const viewportCenter = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
    let nearestIndex = activeIndex;
    let nearestDistance = Number.POSITIVE_INFINITY;

    allSlides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    activeIndex = nearestIndex;
    updateState();
  }

  function recenterIfNeeded() {
    if (activeIndex >= slideCount && activeIndex < allSlides.length - slideCount) return;
    activeIndex = centerOffset + logicalIndex();

    intendedIndex = activeIndex;
    updateState();
    centerSlide(activeIndex, false);
  }

  function finishScrolling() {
    updateFromScroll();
    recenterIfNeeded();
    intendedIndex = activeIndex;
    scrolling = false;
    restartAutoplay();
  }

  function scheduleSettle() {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(finishScrolling, 160);
  }

  function moveTo(index, smooth = true) {
    const target = Math.max(0, Math.min(allSlides.length - 1, index));
    intendedIndex = target;
    scrolling = true;
    centerSlide(target, smooth);
    restartAutoplay();
    scheduleSettle();
  }

  function moveBy(amount) {
    let from = intendedIndex;
    if (from < slideCount || from >= allSlides.length - slideCount) {
      from = centerOffset + logicalIndex(from);
      activeIndex = from;
      intendedIndex = from;
      updateState();
      centerSlide(from, false);
    }
    moveTo(from + amount);
  }

  function canAutoplay() {
    return !motionPreference.matches && inView && !document.hidden && !scrolling && !lightboxOpen;
  }

  function restartAutoplay() {
    window.clearTimeout(timer);
    timer = null;
    if (canAutoplay()) {
      timer = window.setTimeout(() => {
        moveBy(1);
      }, 3000);
    }
  }

  function updateLightbox(index) {
    lightboxIndex = (index + slideCount) % slideCount;
    const source = slides[lightboxIndex].querySelector("img");
    lightboxImage.src = source.src;
    lightboxImage.alt = source.alt;
    if (lightboxCount) lightboxCount.textContent = `${String(lightboxIndex + 1).padStart(2, "0")} / ${String(slideCount).padStart(2, "0")}`;
  }

  function openLightbox(index, trigger) {
    lightboxOpen = true;
    returnFocus = trigger;
    activeIndex = index;
    intendedIndex = activeIndex;
    updateState();
    centerSlide(activeIndex, false);
    updateLightbox(logicalIndex(index));
    restartAutoplay();
    lightbox.showModal();
  }

  function changeLightbox(amount) {
    activeIndex += amount;
    if (activeIndex < 0 || activeIndex >= allSlides.length) activeIndex = centerOffset + logicalIndex(activeIndex);
    updateLightbox(logicalIndex());
    intendedIndex = activeIndex;
    updateState();
    centerSlide(activeIndex, false);
    recenterIfNeeded();
  }

  previousButton?.addEventListener("click", () => moveBy(-1));
  nextButton?.addEventListener("click", () => moveBy(1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => moveTo(centerOffset + index)));
  allSlides.forEach((slide, index) => {
    const openButton = slide.querySelector(".carousel-open");
    openButton?.addEventListener("click", () => openLightbox(index, openButton));
  });

  viewport.addEventListener("scroll", () => {
    scrolling = true;
    updateFromScroll();
    restartAutoplay();
    scheduleSettle();
  }, { passive: true });
  lightboxClose?.addEventListener("click", () => lightbox.close());
  lightboxPrevious?.addEventListener("click", () => changeLightbox(-1));
  lightboxNext?.addEventListener("click", () => changeLightbox(1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      changeLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      changeLightbox(1);
    }
  });
  lightbox.addEventListener("close", () => {
    lightboxOpen = false;
    restartAutoplay();
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  });

  document.addEventListener("visibilitychange", restartAutoplay);
  if (motionPreference.addEventListener) motionPreference.addEventListener("change", restartAutoplay);
  else motionPreference.addListener?.(restartAutoplay);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      restartAutoplay();
    }, { threshold: 0.15 }).observe(carousel);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      setTrackPadding();
      centerSlide(activeIndex, false);
    }).observe(viewport);
  } else {
    window.addEventListener("resize", () => {
      setTrackPadding();
      centerSlide(activeIndex, false);
    }, { passive: true });
  }

  setTrackPadding();
  updateState();
  centerSlide(activeIndex, false);
  restartAutoplay();
});
