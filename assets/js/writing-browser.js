(() => {
  "use strict";

  const root = document.querySelector("[data-writing-browser]");
  if (!root) return;

  const allowedCategories = new Set([
    "all",
    "operations",
    "automation",
    "security",
    "research",
    "other",
  ]);
  const controls = root.querySelector("[data-writing-controls]");
  const queryInput = root.querySelector("[data-writing-query]");
  const count = root.querySelector("[data-writing-count]");
  const empty = root.querySelector("[data-writing-empty]");
  const entries = [...root.querySelectorAll("[data-writing-url]")];
  const categoryButtons = [
    ...root.querySelectorAll("[data-writing-category]"),
  ];

  const normalize = (value) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .trim();

  const readFilterState = (searchParams) => {
    const requestedCategory = (searchParams.get("category") || "all").toLowerCase();
    return {
      query: searchParams.get("q") || "",
      category: allowedCategories.has(requestedCategory)
        ? requestedCategory
        : "all",
    };
  };

  const matchesEntry = (entry, state) => {
    const categoryMatches =
      state.category === "all" || entry.dataset.category === state.category;
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    const haystack = normalize(entry.dataset.search || "");
    return categoryMatches && terms.every((term) => haystack.includes(term));
  };

  const writeUrlState = (state) => {
    const url = new URL(window.location.href);
    if (state.query) url.searchParams.set("q", state.query);
    else url.searchParams.delete("q");
    if (state.category !== "all") url.searchParams.set("category", state.category);
    else url.searchParams.delete("category");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const renderFilterState = (state) => {
    const visibleEntries = entries.filter((entry) => matchesEntry(entry, state));
    entries.forEach((entry) => {
      entry.hidden = !visibleEntries.includes(entry);
    });
    categoryButtons.forEach((button) => {
      const category = button.dataset.writingCategory;
      const total =
        category === "all"
          ? entries.length
          : entries.filter((entry) => entry.dataset.category === category).length;
      button.hidden = category !== "all" && total === 0;
      button.setAttribute(
        "aria-pressed",
        String(category === state.category),
      );
      const label = button.dataset.label || button.textContent.trim();
      button.dataset.label = label;
      button.textContent = category === "all" ? `${label} (${total})` : `${label} (${total})`;
    });
    if (queryInput.value !== state.query) queryInput.value = state.query;
    count.textContent = `${visibleEntries.length} ${visibleEntries.length === 1 ? "article" : "articles"}`;
    empty.hidden = visibleEntries.length !== 0;
    writeUrlState(state);
  };

  const initialState = readFilterState(new URLSearchParams(window.location.search));
  queryInput.addEventListener("input", () =>
    renderFilterState({ ...readFilterState(new URLSearchParams(window.location.search)), query: queryInput.value }),
  );
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const current = readFilterState(new URLSearchParams(window.location.search));
      renderFilterState({ ...current, category: button.dataset.writingCategory });
    });
  });
  root.querySelector("[data-writing-reset]").addEventListener("click", () => {
    renderFilterState({ query: "", category: "all" });
    queryInput.focus();
  });
  window.addEventListener("popstate", () =>
    renderFilterState(readFilterState(new URLSearchParams(window.location.search))),
  );

  // Bind before revealing controls; articles remain usable when JS is off.
  controls.hidden = false;
  renderFilterState(initialState);
})();
