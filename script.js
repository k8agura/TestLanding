const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setupRevealAnimations() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;

  if (prefersReducedMotion) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  function reveal(item) {
    if (item.classList.contains("is-visible")) return;

    const effect = item.dataset.reveal;
    const fromTransform = effect === "left" ? "translateX(-28px)" : effect === "scale" ? "scale(0.96)" : "translateY(24px)";

    item.classList.add("is-visible");
    item.animate(
      [
        { opacity: 1, transform: fromTransform },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 700,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      }
    );
  }

  const isInInitialViewport = (item) => {
    const rect = item.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  items.forEach((item) => {
    if (isInInitialViewport(item)) {
      item.classList.add("is-visible");
      return;
    }

    observer.observe(item);
  });
}

function setupStageSlider() {
  const track = document.getElementById("stagesTrack");
  const prev = document.getElementById("stagesPrev");
  const next = document.getElementById("stagesNext");
  const dotsWrap = document.getElementById("stagesDots");

  if (!track || !prev || !next || !dotsWrap) return;

  const totalSlides = 5;
  let currentSlide = 0;

  const dots = Array.from({ length: totalSlides }, (_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Перейти к слайду ${index + 1}`);
    dot.addEventListener("click", () => {
      currentSlide = index;
      update();
    });
    dotsWrap.append(dot);
    return dot;
  });

  const isMobile = () => window.innerWidth <= 767;

  function update() {
    if (isMobile()) {
      const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stages-gap")) || 20;
      const slideWidth = track.parentElement.getBoundingClientRect().width;
      track.style.transform = `translateX(-${currentSlide * (slideWidth + gap)}px)`;
    } else {
      track.style.transform = "";
      currentSlide = 0;
    }

    prev.disabled = !isMobile() || currentSlide === 0;
    next.disabled = !isMobile() || currentSlide === totalSlides - 1;
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === currentSlide));
  }

  prev.addEventListener("click", () => {
    if (currentSlide > 0) {
      currentSlide -= 1;
      update();
    }
  });

  next.addEventListener("click", () => {
    if (currentSlide < totalSlides - 1) {
      currentSlide += 1;
      update();
    }
  });

  window.addEventListener("resize", update, { passive: true });
  update();
}

function setupParticipantsSlider() {
  const viewport = document.querySelector(".participants__viewport");
  const track = document.getElementById("participantsTrack");
  const prev = document.getElementById("participantsPrev");
  const next = document.getElementById("participantsNext");
  const current = document.getElementById("participantsCurrent");

  if (!viewport || !track || !prev || !next || !current) return;

  const sourceCards = Array.from(track.children);
  const participantImages = sourceCards.flatMap((card) => Array.from(card.querySelectorAll("img")));

  participantImages.forEach((image) => {
    image.loading = "eager";
    image.decoding = "sync";
    image.draggable = false;

    const preload = new Image();
    preload.src = image.currentSrc || image.src;
    preload.decode?.().catch(() => {});
  });

  const data = sourceCards.map((card) => card.outerHTML);
  const total = data.length;

  let autoTimer = null;
  let isAnimating = false;
  let index = 0;
  let currentPerView = 1;
  let itemsToClone = 1;
  let resizeTimer = null;
  let pointerStart = null;

  function restoreTransition() {
    requestAnimationFrame(() => {
      track.style.transition = `transform 0.55s var(--easing)`;
    });
  }

  function moveInstantly(targetIndex) {
    track.style.transition = "none";
    moveTo(targetIndex);
    track.offsetHeight;
    restoreTransition();
  }

  function cardsPerView() {
    if (window.innerWidth <= 767) return 1;
    if (window.innerWidth <= 1100) return 2;
    return 3;
  }

  function normalize(value) {
    return ((value % total) + total) % total;
  }

  function rebuildTrack(logicalIndex = 0) {
    currentPerView = cardsPerView();
    itemsToClone = currentPerView;
    const prepend = data.slice(-itemsToClone);
    const append = data.slice(0, itemsToClone);
    track.innerHTML = [...prepend, ...data, ...append].join("");
    index = itemsToClone + normalize(logicalIndex);
    moveInstantly(index);
    updateCounter();
  }

  function cardStep() {
    const firstCard = track.querySelector(".participant-card");
    if (!firstCard) return viewport.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--card-gap")) || 20;
    return firstCard.getBoundingClientRect().width + gap;
  }

  function moveTo(targetIndex) {
    track.style.transform = `translateX(-${cardStep() * targetIndex}px)`;
  }

  function normalizedIndex() {
    return normalize(index - itemsToClone);
  }

  function activeGroupStart() {
    return Math.floor(normalizedIndex() / currentPerView) * currentPerView;
  }

  function updateCounter() {
    const lastVisibleCard = Math.min(activeGroupStart() + currentPerView, total);
    current.textContent = String(lastVisibleCard);
  }

  function jumpIfNeeded() {
    let nextIndex = index;

    if (index >= total + itemsToClone) {
      nextIndex = index - total;
    }

    if (index < itemsToClone) {
      nextIndex = index + total;
    }

    if (nextIndex !== index) {
      index = nextIndex;
      moveInstantly(index);
    }
  }

  function slideTo(nextIndex) {
    if (isAnimating) return;
    isAnimating = true;
    index = nextIndex;
    moveTo(index);
  }

  function goNext() {
    slideTo(index + currentPerView);
  }

  function goPrev() {
    slideTo(index - currentPerView);
  }

  function startAuto() {
    if (prefersReducedMotion || document.hidden) return;
    stopAuto();
    autoTimer = window.setInterval(goNext, 4000);
  }

  function stopAuto() {
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || event.propertyName !== "transform") return;

    isAnimating = false;
    jumpIfNeeded();
    updateCounter();
  });

  prev.addEventListener("click", () => {
    stopAuto();
    goPrev();
    startAuto();
  });

  next.addEventListener("click", () => {
    stopAuto();
    goNext();
    startAuto();
  });

  viewport.addEventListener("mouseenter", stopAuto);
  viewport.addEventListener("mouseleave", startAuto);
  viewport.addEventListener("focusin", stopAuto);
  viewport.addEventListener("focusout", startAuto);

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    pointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    viewport.setPointerCapture?.(event.pointerId);
    stopAuto();
  });

  viewport.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (isHorizontalSwipe) {
      event.preventDefault();
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    pointerStart = null;
    startAuto();
  });

  viewport.addEventListener("pointercancel", () => {
    pointerStart = null;
    startAuto();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAuto();
    } else {
      startAuto();
    }
  });

  window.addEventListener("resize", () => {
    document.body.classList.add("is-resizing");
    window.clearTimeout(resizeTimer);

    resizeTimer = window.setTimeout(() => {
      const previousLogical = normalizedIndex();
      const nextPerView = cardsPerView();

      if (nextPerView !== currentPerView) {
        rebuildTrack(previousLogical);
      } else {
        moveInstantly(index);
        updateCounter();
      }

      document.body.classList.remove("is-resizing");
    }, 120);
  });

  rebuildTrack();
  startAuto();
}

setupRevealAnimations();
setupStageSlider();
setupParticipantsSlider();
