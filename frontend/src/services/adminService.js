import api, { USE_API } from '../api/axios';
import { normalizeProduct } from '../api/normalize';
import { adminStats, adminUsers, listingsPerMonth, recentActivities, reportedProducts } from '../data/admin';
import categories from '../data/categories';
import sampleProducts from '../data/products';
import { timeAgo } from '../utils/format';

/** Administrator endpoints – the backend rejects non-admin users with 403. */
const unpage = (data) => (Array.isArray(data) ? data : data.results);
const activityStyle = {
  user: { icon: 'bi-person-plus', tone: 'primary' },
  product: { icon: 'bi-box-seam', tone: 'success' },
  order: { icon: 'bi-bag-check', tone: 'info' },
  report: { icon: 'bi-flag', tone: 'danger' },
};

/** GET /api/admin/stats/ */
export const getDashboard = async () => {
  if (!USE_API) {
    const counts = sampleProducts.reduce((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {});
    return {
      stats: adminStats,
      listingsPerMonth,
      activities: recentActivities,
      categoryCounts: categories.map((c) => ({ slug: c.slug, name: c.name, count: counts[c.slug] || 0 })),
    };
  }
  const { data } = await api.get('/admin/stats/');
  return {
    stats: {
      totalStudents: data.total_students,
      totalListings: data.total_listings,
      activeListings: data.active_listings,
      reportedProducts: data.reported_products,
    },
    listingsPerMonth: data.listings_per_month.map((m) => ({ month: m.month.split(' ')[0], value: m.value })),
    activities: data.recent_activity.map((a, i) => ({ id: i, text: a.text, time: timeAgo(a.at), ...activityStyle[a.type] })),
    categoryCounts: data.listings_by_category,
  };
};

/** GET /api/auth/users/ */
export const getUsers = async () => {
  if (!USE_API) return adminUsers;
  return unpage((await api.get('/auth/users/', { params: { page_size: 100 } })).data).map((u) => ({
    id: u.id,
    name: u.full_name,
    email: u.email,
    college: u.college,
    listings: u.listings,
    status: u.is_active ? 'Active' : 'Suspended',
  }));
};

/** PATCH /api/auth/users/<id>/ */
export const setUserActive = async (id, active) => {
  if (USE_API) await api.patch(`/auth/users/${id}/`, { is_active: active });
};

export const getListings = async () => {
  if (!USE_API) return sampleProducts;
  return (await api.get('/products/', { params: { page_size: 100 } })).data.results.map(normalizeProduct);
};

/** DELETE /api/products/<id>/ – administrators may remove any listing. */
export const removeListing = async (id) => {
  if (USE_API) await api.delete(`/products/${id}/`);
};

/** GET /api/admin/reports/?is_resolved=false – grouped by product. */
export const getReports = async () => {
  if (!USE_API) {
    return reportedProducts.map((r) => ({
      ids: [],
      productId: r.id,
      productTitle: sampleProducts.find((p) => p.id === r.id)?.name,
      reason: r.reason,
      reports: r.reports,
    }));
  }
  const rows = unpage((await api.get('/admin/reports/', { params: { is_resolved: false, page_size: 100 } })).data);
  const grouped = {};
  rows.forEach((r) => {
    const g = (grouped[r.product] ||= { ids: [], productId: r.product, productTitle: r.product_title, reason: r.reason_display, reports: 0 });
    g.ids.push(r.id);
    g.reports += 1;
  });
  return Object.values(grouped);
};

/** PATCH /api/admin/reports/<id>/ {is_resolved: true} */
export const resolveReports = async (ids) => {
  if (USE_API) await Promise.all(ids.map((id) => api.patch(`/admin/reports/${id}/`, { is_resolved: true })));
};
