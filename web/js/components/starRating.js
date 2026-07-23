export function starsHtml(rating, max = 5) {
  if (rating == null) return '';
  let s = '';
  for (let i = 1; i <= max; i++) s += i <= rating ? '★' : '☆';
  return `<span class="stars">${s}</span>`;
}

export function starPickerHtml(value) {
  let html = '<div class="star-picker">';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= (value || 0);
    html += `<span class="star-choice" data-star-value="${i}" style="cursor:pointer;font-size:26px;color:${
      filled ? 'var(--star)' : 'var(--border)'
    }">${filled ? '★' : '☆'}</span>`;
  }
  return html + '</div>';
}

/** Wires click handlers on a rendered star-picker container; onChange(value) fires and the picker re-renders itself. */
export function wireStarPicker(container, initialValue, onChange) {
  let value = initialValue || 0;
  function paint() {
    container.innerHTML = starPickerHtml(value);
    container.querySelectorAll('.star-choice').forEach((el) => {
      el.addEventListener('click', () => {
        value = Number(el.getAttribute('data-star-value'));
        paint();
        onChange(value);
      });
    });
  }
  paint();
  return () => value;
}
