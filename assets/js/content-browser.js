(() => {
  "use strict";
  const root = document.querySelector('[data-content-browser]');
  if (!root) return;
  const form = root.querySelector('[data-content-filters]');
  const query = root.querySelector('[data-content-query]');
  const topics = Array.from(root.querySelectorAll('[data-content-topic]'));
  const items = Array.from(root.querySelectorAll('[data-content-item]'));
  const count = root.querySelector('[data-content-count]');
  const empty = root.querySelector('[data-content-empty]');
  if (!form || !query || !count || !empty || items.length === 0) return;

  const update = () => {
    const term = query.value.trim().toLocaleLowerCase();
    const selected = topics.filter((input) => input.checked).map((input) => input.value);
    let visible = 0;
    items.forEach((item) => {
      const topicIds = (item.dataset.topics || '').split(/\s+/).filter(Boolean);
      const textMatches = !term || (item.dataset.search || '').includes(term);
      const topicMatches = selected.length === 0 || selected.some((id) => topicIds.includes(id));
      item.hidden = !(textMatches && topicMatches);
      if (!item.hidden) visible += 1;
    });
    count.textContent = `${visible} ${visible === 1 ? 'entry' : 'entries'}`;
    empty.hidden = visible !== 0;
  };

  form.hidden = false;
  query.addEventListener('input', update);
  topics.forEach((input) => input.addEventListener('change', update));
  form.addEventListener('reset', () => requestAnimationFrame(update));
  update();
})();
