import api, { USE_API } from '../api/axios';
import { normalizeOrder } from '../api/normalize';
import sampleProducts from '../data/products';

/**
 * Orders = a buyer's request to buy a listing, completed by meeting on campus
 * (no online payment). Lifecycle: pending → accepted → completed, or
 * rejected / cancelled. The backend enforces who may do what.
 */
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const unpage = (data) => (Array.isArray(data) ? data : data.results);

// ---- Sample-data mode (no backend) --------------------------------------- //
const KEY = 'cc_sample_orders';
const sampleOrder = (id, product, role, status, daysAgo) => ({
  id,
  product: { id: product.id, name: product.name, image: product.images[0], status: product.available ? 'available' : 'sold', location: product.location },
  productTitle: product.name,
  totalPrice: product.price,
  status,
  statusDisplay: status[0].toUpperCase() + status.slice(1),
  note: '',
  meetingPoint: product.location,
  role,
  buyer: role === 'buyer' ? { name: 'You' } : { id: 9, name: 'Meera Joshi', avatar: 'MJ' },
  seller: role === 'buyer' ? product.seller : { name: 'You' },
  canAccept: role === 'seller' && status === 'pending',
  canReject: role === 'seller' && status === 'pending',
  canCancel: role === 'buyer' && ['pending', 'accepted'].includes(status),
  canComplete: role === 'seller' && status === 'accepted',
  createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
});
const readSample = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return [
    sampleOrder(10234, sampleProducts[1], 'buyer', 'completed', 1),
    sampleOrder(10198, sampleProducts[10], 'buyer', 'accepted', 2),
    sampleOrder(10301, sampleProducts[0], 'seller', 'pending', 0),
  ];
};
const writeSample = (orders) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {
    /* ignore */
  }
};
const transitions = {
  accept: { from: ['pending'], to: 'accepted' },
  reject: { from: ['pending'], to: 'rejected' },
  cancel: { from: ['pending', 'accepted'], to: 'cancelled' },
  complete: { from: ['accepted'], to: 'completed' },
};
const refreshFlags = (o) => ({
  ...o,
  statusDisplay: o.status[0].toUpperCase() + o.status.slice(1),
  canAccept: o.role === 'seller' && o.status === 'pending',
  canReject: o.role === 'seller' && o.status === 'pending',
  canCancel: o.role === 'buyer' && ['pending', 'accepted'].includes(o.status),
  canComplete: o.role === 'seller' && o.status === 'accepted',
});

// ---- Public API ---------------------------------------------------------- //
/** POST /api/orders/ */
export const placeOrder = async (product, note = '') => {
  if (USE_API) return normalizeOrder((await api.post('/orders/', { product: product.id, note })).data);
  await delay();
  const orders = readSample();
  if (orders.some((o) => o.product?.id === product.id && o.role === 'buyer' && ['pending', 'accepted'].includes(o.status))) {
    throw new Error('You already have an active order for this product.');
  }
  const order = { ...sampleOrder(Date.now(), product, 'buyer', 'pending', 0), note };
  writeSample([order, ...orders]);
  return order;
};

/** GET /api/orders/my-orders/ */
export const getMyOrders = async () => {
  if (USE_API) return unpage((await api.get('/orders/my-orders/', { params: { page_size: 50 } })).data).map(normalizeOrder);
  await delay();
  return readSample().filter((o) => o.role === 'buyer');
};

/** GET /api/orders/seller-orders/ */
export const getSellerOrders = async () => {
  if (USE_API) return unpage((await api.get('/orders/seller-orders/', { params: { page_size: 50 } })).data).map(normalizeOrder);
  await delay();
  return readSample().filter((o) => o.role === 'seller');
};

/** POST /api/orders/<id>/{accept|reject|cancel|complete}/ */
export const updateOrder = async (orderId, action) => {
  if (USE_API) return normalizeOrder((await api.post(`/orders/${orderId}/${action}/`)).data);
  await delay(250);
  const rule = transitions[action];
  let updated;
  const orders = readSample().map((o) => {
    if (o.id !== orderId) return o;
    if (!rule.from.includes(o.status)) throw new Error(`This order is ${o.status} and can no longer be changed this way.`);
    updated = refreshFlags({ ...o, status: rule.to });
    return updated;
  });
  writeSample(orders);
  return updated;
};
