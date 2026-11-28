/**
 * The Django API uses snake_case JSON (Django/DRF convention). These helpers
 * convert API objects into the camelCase shapes the React components use, so
 * components never need to know whether data came from the API or sample data.
 */
import { placeholderImage } from '../utils/image';

const num = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v));

export const normalizeSeller = (s = {}) => ({
  id: s.id,
  name: s.name,
  avatar: s.avatar,
  college: s.college,
  joined: s.joined,
  listings: s.listings,
  profilePicture: s.profile_picture,
});

export const normalizeProduct = (p) => {
  const categoryName = p.category_detail?.name;
  const images = (p.images || []).map((img) => img.image);
  return {
    id: p.id,
    name: p.title,
    description: p.description,
    price: num(p.price),
    originalPrice: num(p.original_price),
    category: p.category,
    categoryName,
    condition: p.condition_display,
    conditionCode: p.condition,
    status: p.status,
    available: p.is_available,
    images: images.length ? images : [placeholderImage(categoryName || p.title)],
    imageObjects: p.images || [],
    seller: normalizeSeller(p.seller),
    campus: p.campus,
    location: p.location,
    postedAt: p.created_at,
    updatedAt: p.updated_at,
    featured: p.is_featured,
    isOwner: p.is_owner,
    tags: [],
  };
};

export const normalizeUser = (u) =>
  u && {
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    username: u.username,
    phone: u.phone,
    college: u.college,
    studentId: u.student_id,
    bio: u.bio,
    role: u.role,
    isAdmin: u.is_admin,
    initials: u.initials,
    profilePicture: u.profile_picture,
    joined: u.joined,
  };

export const normalizeOrder = (o) => ({
  id: o.id,
  product: o.product && {
    id: o.product.id,
    name: o.product.title,
    image: o.product.image || placeholderImage(o.product_title),
    status: o.product.status,
    location: o.product.location,
  },
  productTitle: o.product_title,
  totalPrice: num(o.total_price),
  status: o.status,
  statusDisplay: o.status_display,
  note: o.note,
  meetingPoint: o.meeting_point,
  role: o.role,
  buyer: normalizeSeller(o.buyer),
  seller: normalizeSeller(o.seller),
  canAccept: o.can_accept,
  canReject: o.can_reject,
  canCancel: o.can_cancel,
  canComplete: o.can_complete,
  createdAt: o.created_at,
  updatedAt: o.updated_at,
});

export const normalizeMessage = (m) => ({
  id: m.id,
  from: m.is_mine ? 'me' : 'them',
  text: m.content,
  at: m.created_at,
  isRead: m.is_read,
});

export const normalizeConversation = (c) => ({
  id: c.id,
  productId: c.product?.id,
  product: c.product && {
    id: c.product.id,
    name: c.product.title,
    price: num(c.product.price),
    images: [c.product.image || placeholderImage(c.product.title)],
  },
  participant: normalizeSeller(c.participant), // online status needs WebSockets – not shown yet
  unread: c.unread_count,
  // The list endpoint only includes the latest message; the full thread is
  // fetched when the conversation is opened.
  messages: c.last_message ? [normalizeMessage(c.last_message)] : [],
  lastMessageAt: c.last_message_at,
});
