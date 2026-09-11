(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     Theme (light / dark)
     The initial value is applied by an inline script in <head> so the page
     never paints the wrong palette; this only handles switching.
     ---------------------------------------------------------------------- */

  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme, persist) {
    root.setAttribute("data-theme", theme);

    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1212" : "#069494");

    if (persist) {
      try {
        localStorage.setItem("ee-theme", theme);
      } catch (e) {
        /* storage unavailable — the choice just won't survive a reload */
      }
    }
  }

  applyTheme(currentTheme(), false);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }

  // Follow the OS only while the visitor hasn't made an explicit choice.
  systemDark.addEventListener("change", function (event) {
    var stored = null;
    try {
      stored = localStorage.getItem("ee-theme");
    } catch (e) {
      /* ignore */
    }
    if (!stored) applyTheme(event.matches ? "dark" : "light", false);
  });

  /* ----------------------------------------------------------------------
     Sticky header state + scroll progress
     ---------------------------------------------------------------------- */

  var header = document.getElementById("siteHeader");
  var progress = document.getElementById("scrollProgress");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;

    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
    }

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );

  onScroll();

  /* ----------------------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------------------- */

  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("mainNav");

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation menu");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a, .nav-cta")) closeNav();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (event.target.closest("#mainNav") || event.target.closest("#navToggle")) return;
      closeNav();
    });
  }

  /* ----------------------------------------------------------------------
     Scroll reveal
     ---------------------------------------------------------------------- */

  var revealItems = document.querySelectorAll("[data-reveal]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    // Stagger children inside a group so grids cascade instead of popping at once.
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, index) {
        if (child.hasAttribute("data-reveal")) {
          child.style.transitionDelay = Math.min(index * 60, 420) + "ms";
        }
      });
    });

    // threshold 0 so an element reveals the moment any part of it enters the
    // viewport — a threshold high enough to need a fraction of the element
    // visible can be skipped entirely during fast or jumped scrolling.
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "120px 0px 40px 0px", threshold: 0 }
    );

    revealItems.forEach(function (el) {
      revealObserver.observe(el);
    });

    // Safety net: anything still hidden once the user has scrolled past it is
    // revealed outright, so no section can be stranded invisible.
    window.addEventListener(
      "scroll",
      function sweep() {
        var pending = document.querySelectorAll("[data-reveal]:not(.is-visible)");
        pending.forEach(function (el) {
          if (el.getBoundingClientRect().top < window.innerHeight) {
            el.classList.add("is-visible");
            revealObserver.unobserve(el);
          }
        });
        if (!pending.length) window.removeEventListener("scroll", sweep);
      },
      { passive: true }
    );
  }

  /* ----------------------------------------------------------------------
     Active nav link
     ---------------------------------------------------------------------- */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a[href^="#"]'));
  var sections = navLinks
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  /* ----------------------------------------------------------------------
     Count-up figures in the trust bar
     ---------------------------------------------------------------------- */

  var figures = document.querySelectorAll("[data-count]");

  if (figures.length && !reduceMotion && "IntersectionObserver" in window) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var el = entry.target;
          countObserver.unobserve(el);

          var target = parseInt(el.getAttribute("data-count"), 10) || 0;
          var suffix = el.getAttribute("data-suffix") || "";
          var duration = 1100;
          var start = 0;

          function step(now) {
            if (!start) start = now;
            var t = Math.min((now - start) / duration, 1);
            // easeOutCubic
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (t < 1) window.requestAnimationFrame(step);
          }

          window.requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 }
    );

    figures.forEach(function (el) {
      countObserver.observe(el);
    });
  }
})();
