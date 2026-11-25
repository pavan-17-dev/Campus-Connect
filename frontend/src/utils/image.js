// Fallback image used when a remote product photo fails to load.
export const placeholderImage = (label = 'Campus Connect') => {
  const text = String(label).slice(0, 28).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DBEAFE"/><stop offset="1" stop-color="#EFF6FF"/></linearGradient></defs>
    <rect width="800" height="600" fill="url(#g)"/>
    <g fill="none" stroke="#2563EB" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".55" transform="translate(340 210)">
      <path d="M10 40h100l-10 90a12 12 0 0 1-12 10H32a12 12 0 0 1-12-10z"/><path d="M38 40V28a22 22 0 0 1 44 0v12"/>
    </g>
    <text x="400" y="420" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600" fill="#1E293B" opacity=".7">${text}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const handleImageError = (label) => (event) => {
  const el = event.currentTarget;
  if (el.dataset.fallback) return;
  el.dataset.fallback = '1';
  el.src = placeholderImage(label);
};
