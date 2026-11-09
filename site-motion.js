if ("IntersectionObserver" in window) {
  const enterAt = 0.15;
  const leaveAt = 0.06;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio <= leaveAt) {
        entry.target.classList.add("is-outside");
      } else if (entry.intersectionRatio >= enterAt) {
        entry.target.classList.remove("is-outside");
      }
    }
  }, { rootMargin: "-40px 0px -32px", threshold: [leaveAt, enterAt] });

  document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
}
