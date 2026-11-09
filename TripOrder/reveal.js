if ("IntersectionObserver" in window) {
  const visibleFraction = 0.2;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const classes = entry.target.classList;

      // Reset only after the whole element has left the viewport.
      if (!entry.isIntersecting) {
        classes.remove("has-entered");
        classes.add("awaiting-entry");
      } else if (entry.intersectionRatio >= visibleFraction && classes.contains("awaiting-entry")) {
        classes.replace("awaiting-entry", "has-entered");
      }
    }
  }, { threshold: [0, visibleFraction] });

  document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
}
