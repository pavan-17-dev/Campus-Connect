// Tracks which categories a student browses so recommendations can be personalised.
// The backend version records this server-side; this keeps a local, privacy-friendly copy.
const KEY = 'cc_interests';

export const getInterests = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

export const recordInterest = (category) => {
  if (!category) return;
  const next = [category, ...getInterests().filter((c) => c !== category)].slice(0, 4);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
};
