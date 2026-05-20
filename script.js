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
  const data = sourceCards.map((card) => card.outerHTML);
  const total = data.length;

  let autoTimer = null;
  let isAnimating = false;
  let index = 0;
  let itemsToClone = 1;
  let resizeTimer = null;

  function cardsPerView() {
    if (window.innerWidth <= 767) return 1;
    if (window.innerWidth <= 1100) return 2;
    return 3;
  }

  function rebuildTrack() {
    itemsToClone = cardsPerView();
    const prepend = data.slice(-itemsToClone);
    const append = data.slice(0, itemsToClone);
    track.innerHTML = [...prepend, ...data, ...append].join("");
    index = itemsToClone;
    track.style.transition = "none";
    moveTo(index);
    requestAnimationFrame(() => {
      track.style.transition = `transform 0.55s var(--easing)`;
    });
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
    return ((index - itemsToClone) % total + total) % total;
  }

  function updateCounter() {
    current.textContent = String(normalizedIndex() + 1);
  }

  function jumpIfNeeded() {
    if (index >= total + itemsToClone) {
      index = itemsToClone;
      track.style.transition = "none";
      moveTo(index);
      requestAnimationFrame(() => {
        track.style.transition = `transform 0.55s var(--easing)`;
      });
    }

    if (index < itemsToClone) {
      index = total + itemsToClone - 1;
      track.style.transition = "none";
      moveTo(index);
      requestAnimationFrame(() => {
        track.style.transition = `transform 0.55s var(--easing)`;
      });
    }
  }

  function slideTo(nextIndex) {
    if (isAnimating) return;
    isAnimating = true;
    index = nextIndex;
    moveTo(index);
    updateCounter();
  }

  function goNext() {
    slideTo(index + 1);
  }

  function goPrev() {
    slideTo(index - 1);
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

  track.addEventListener("transitionend", () => {
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

    const previousLogical = normalizedIndex();
    rebuildTrack();
    index = itemsToClone + previousLogical;
    track.style.transition = "none";
    moveTo(index);
    requestAnimationFrame(() => {
      track.style.transition = `transform 0.55s var(--easing)`;
    });
    updateCounter();

    resizeTimer = window.setTimeout(() => {
      document.body.classList.remove("is-resizing");
    }, 120);
  });

  rebuildTrack();
  startAuto();
}

setupRevealAnimations();
setupStageSlider();
setupParticipantsSlider();
