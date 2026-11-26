import api, { USE_API } from '../api/axios';
import sampleProducts from '../data/products';

// Simulated network latency so loading states are visible with sample data.
const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

// Listings created locally while running without a backend.
const LOCAL_KEY = 'cc_local_listings';
const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
  } catch {
    return [];
  }
};
const allSample = () => [...readLocal(), ...sampleProducts];

export const PAGE_SIZE = 9;

/**
 * Applies the same filters the Django `ProductViewSet` will support via
 * query params: ?search=&category=&min_price=&max_price=&available=&ordering=&page=
 */
export const filterProducts = (list, params = {}) => {
  const { search = '', categories = [], minPrice, maxPrice, availability = 'all', sort = 'newest', condition = [] } = params;
  const q = search.trim().toLowerCase();
  let result = list.filter((p) => {
    if (q) {
      const haystack = [p.name, p.description, p.category, p.campus, ...(p.tags || [])].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (categories.length && !categories.includes(p.category)) return false;
    if (condition.length && !condition.includes(p.condition)) return false;
    if (minPrice !== '' && minPrice != null && p.price < Number(minPrice)) return false;
    if (maxPrice !== '' && maxPrice != null && p.price > Number(maxPrice)) return false;
    if (availability === 'available' && !p.available) return false;
    if (availability === 'sold' && p.available) return false;
    return true;
  });
  const sorters = {
    newest: (a, b) => new Date(b.postedAt) - new Date(a.postedAt),
    oldest: (a, b) => new Date(a.postedAt) - new Date(b.postedAt),
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
  };
  result = [...result].sort(sorters[sort] || sorters.newest);
  return result;
};

const toQuery = (params) => ({
  search: params.search || undefined,
  category: params.categories?.join(',') || undefined,
  condition: params.condition?.join(',') || undefined,
  min_price: params.minPrice || undefined,
  max_price: params.maxPrice || undefined,
  available: params.availability === 'all' ? undefined : params.availability === 'available',
  ordering: { newest: '-created_at', oldest: 'created_at', price_asc: 'price', price_desc: '-price' }[params.sort],
  page: params.page,
});

export const getProducts = async (params = {}) => {
  if (USE_API) {
    const { data } = await api.get('/products/', { params: toQuery(params) });
    return { results: data.results, count: data.count };
  }
  await delay();
  const results = filterProducts(allSample(), params);
  return { results, count: results.length };
};

export const getFeaturedProducts = async () => {
  if (USE_API) return (await api.get('/products/featured/')).data;
  await delay(350);
  return sampleProducts.filter((p) => p.featured);
};

export const getProductById = async (id) => {
  if (USE_API) return (await api.get(`/products/${id}/`)).data;
  await delay(350);
  const product = allSample().find((p) => String(p.id) === String(id));
  if (!product) throw new Error('Product not found');
  return product;
};

export const getRelatedProducts = async (product, limit = 4) => {
  if (USE_API) return (await api.get(`/products/${product.id}/related/`)).data;
  await delay(250);
  return allSample()
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(allSample().filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, limit);
};

/**
 * Recommendations are generated server-side (Django + Gemini) from the user's
 * interests and browsing history. Locally we approximate it from viewed categories.
 */
export const getRecommendations = async (interests = [], limit = 4) => {
  if (USE_API) return (await api.get('/recommendations/', { params: { limit } })).data;
  await delay(500);
  const pool = sampleProducts.filter((p) => p.available && !p.featured);
  if (!interests.length) return pool.slice(0, limit);
  const scored = pool
    .map((p) => ({ p, score: interests.indexOf(p.category) === -1 ? 0 : interests.length - interests.indexOf(p.category) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.p);
};

export const getMyListings = async (user) => {
  if (USE_API) return (await api.get('/products/mine/')).data;
  await delay(300);
  const mine = readLocal();
  return mine.length ? mine : sampleProducts.filter((p) => p.seller.id === (user?.id ?? 1)).slice(0, 4);
};

export const createProduct = async (values, user) => {
  if (USE_API) {
    const form = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (k === 'images') v.forEach((file) => form.append('images', file));
      else form.append(k, v);
    });
    const { data } = await api.post('/products/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  }
  await delay(700);
  const product = {
    id: Date.now(),
    name: values.name,
    description: values.description,
    category: values.category,
    price: Number(values.price),
    condition: values.condition,
    images: values.previews,
    location: values.location,
    campus: user?.college || 'BMS College of Engineering',
    seller: {
      id: user?.id ?? 0,
      name: user?.fullName || 'You',
      college: user?.college || 'BMS College of Engineering',
      avatar: (user?.fullName || 'You').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(),
      rating: 5,
      listings: 1,
      joined: new Date().toISOString(),
      responseTime: 'within an hour',
    },
    postedAt: new Date().toISOString(),
    available: true,
    featured: false,
    tags: [],
  };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([product, ...readLocal()].slice(0, 20)));
  } catch {
    // Storage can be full (large image previews) – the listing still "succeeds" for the demo.
  }
  return product;
};
