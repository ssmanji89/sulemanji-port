(() => {
  "use strict";

  const menuButton = document.querySelector("[data-menu-button]");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  const narrow = window.matchMedia("(max-width: 980px)");

  if (menuButton && mobileNav) {
    const label = menuButton.querySelector(".sr-only");
    const closeMenu = (restoreFocus = false) => {
      // Move focus before hiding a focused navigation descendant.
      if (restoreFocus || mobileNav.contains(document.activeElement)) {
        if (narrow.matches) menuButton.focus();
        else document.querySelector(".wordmark")?.focus();
      }
      menuButton.setAttribute("aria-expanded", "false");
      if (label) label.textContent = "Open navigation";
      mobileNav.hidden = true;
      document.body.classList.remove("menu-open");
    };

    menuButton.addEventListener("click", () => {
      if (menuButton.getAttribute("aria-expanded") === "true") {
        closeMenu();
      } else {
        mobileNav.hidden = false;
        menuButton.setAttribute("aria-expanded", "true");
        if (label) label.textContent = "Close navigation";
      }
    });
    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        event.preventDefault();
        closeMenu(true);
      }
    });
    window.addEventListener("resize", () => {
      if (!narrow.matches) closeMenu();
    });

    // Without these handlers the navigation stays visible on small screens.
    document.documentElement.classList.add("nav-enhanced");
    closeMenu();
  }

  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
