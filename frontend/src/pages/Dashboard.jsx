import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import EmptyState from '../components/EmptyState';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { getMyListings } from '../services/productService';
import { getConversations } from '../services/chatService';
import products from '../data/products';
import { formatDate, formatPrice, timeAgo } from '../utils/format';
import { handleImageError } from '../utils/image';
import './Dashboard.css';

const tabs = [
  { key: 'overview', label: 'Profile', icon: 'bi-person' },
  { key: 'listings', label: 'My Listings', icon: 'bi-box-seam' },
  { key: 'orders', label: 'My Orders', icon: 'bi-bag-check' },
  { key: 'wishlist', label: 'Wishlist', icon: 'bi-heart' },
  { key: 'messages', label: 'Messages', icon: 'bi-chat-dots' },
  { key: 'edit', label: 'Edit Profile', icon: 'bi-pencil-square' },
];

// Sample purchase history – replaced by GET /api/orders/ later.
const orders = [
  { id: 'CC-10234', product: products[1], status: 'Completed', date: '2026-11-24T18:31:00' },
  { id: 'CC-10198', product: products[10], status: 'Pending pickup', date: '2026-11-23T21:05:00' },
  { id: 'CC-10077', product: products[13], status: 'Cancelled', date: '2026-11-02T10:00:00' },
];
const statusTone = { Completed: 'success', 'Pending pickup': 'warning', Cancelled: 'secondary' };

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const active = tabs.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview';
  const { user, logout } = useAuth();
  const { items: wishlist } = useWishlist();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyListings(user), getConversations()])
      .then(([l, c]) => { setListings(l); setConvos(c); })
      .finally(() => setLoading(false));
  }, [user]);

  const go = (key) => setParams(key === 'overview' ? {} : { tab: key });
  const initials = user.fullName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const unread = convos.reduce((n, c) => n + c.unread, 0);

  const stats = [
    { label: 'Active listings', value: listings.filter((l) => l.available).length, icon: 'bi-box-seam', tone: 'primary', tab: 'listings' },
    { label: 'Orders', value: orders.length, icon: 'bi-bag-check', tone: 'success', tab: 'orders' },
    { label: 'Wishlist', value: wishlist.length, icon: 'bi-heart', tone: 'danger', tab: 'wishlist' },
    { label: 'Unread messages', value: unread, icon: 'bi-chat-dots', tone: 'warning', tab: 'messages' },
  ];

  return (
    <div className="container py-4 py-lg-5">
      <div className="row g-4">
        <div className="col-lg-3">
          <aside className="cc-dash-side">
            <div className="cc-dash-user">
              <span className="avatar avatar-lg">{initials}</span>
              <div className="min-w-0">
                <strong>{user.fullName}</strong>
                <small>{user.college}</small>
              </div>
            </div>
            <nav className="cc-dash-nav" aria-label="Dashboard">
              {tabs.map((t) => (
                <button key={t.key} type="button" className={active === t.key ? 'is-active' : ''} onClick={() => go(t.key)}>
                  <i className={`bi ${t.icon}`} />{t.label}
                  {t.key === 'messages' && unread > 0 && <span className="badge rounded-pill text-bg-danger ms-auto">{unread}</span>}
                  {t.key === 'wishlist' && wishlist.length > 0 && <span className="badge rounded-pill bg-accent text-primary-cc ms-auto">{wishlist.length}</span>}
                </button>
              ))}
              <button type="button" className="cc-dash-logout" onClick={() => { logout(); navigate('/'); }}>
                <i className="bi bi-box-arrow-right" />Logout
              </button>
            </nav>
          </aside>
        </div>

        <div className="col-lg-9">
          {active === 'overview' && (
            <>
              <div className="cc-dash-welcome">
                <div>
                  <h1>Hi, {user.fullName.split(' ')[0]} 👋</h1>
                  <p>Here&apos;s what&apos;s happening with your Campus Connect account.</p>
                </div>
                <Link to="/sell" className="btn btn-light text-primary-cc"><i className="bi bi-plus-lg me-1" />New listing</Link>
              </div>
              <div className="row g-3 mb-4">
                {stats.map((s) => (
                  <div key={s.label} className="col-6 col-xl-3">
                    <button type="button" className="cc-stat" onClick={() => go(s.tab)}>
                      <span className={`cc-stat-icon text-${s.tone} bg-${s.tone}-subtle`}><i className={`bi ${s.icon}`} /></span>
                      <strong>{loading ? '–' : s.value}</strong>
                      <small>{s.label}</small>
                    </button>
                  </div>
                ))}
              </div>
              <div className="cc-card cc-card-pad">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 m-0">Profile information</h2>
                  <button type="button" className="btn btn-sm btn-soft" onClick={() => go('edit')}><i className="bi bi-pencil me-1" />Edit</button>
                </div>
                <dl className="cc-profile-grid">
                  <div><dt>Full name</dt><dd>{user.fullName}</dd></div>
                  <div><dt>Student email</dt><dd>{user.email}</dd></div>
                  <div><dt>College</dt><dd>{user.college}</dd></div>
                  <div><dt>Student ID</dt><dd>{user.studentId}</dd></div>
                  <div><dt>Phone</dt><dd>{user.phone || <span className="text-muted-cc">Not added</span>}</dd></div>
                  <div><dt>Account status</dt><dd><span className="badge text-bg-success"><i className="bi bi-patch-check me-1" />Verified student</span></dd></div>
                </dl>
              </div>
            </>
          )}

          {active === 'listings' && (
            <Panel title="My Listings" action={<Link to="/sell" className="btn btn-primary btn-sm"><i className="bi bi-plus-lg me-1" />Add listing</Link>}>
              <ProductGrid
                products={listings}
                loading={loading}
                columns={3}
                emptyTitle="You haven't listed anything yet"
                emptyMessage="Sell books, gadgets or hostel gear you no longer need."
                emptyAction={<Link to="/sell" className="btn btn-primary">Sell your first item</Link>}
              />
            </Panel>
          )}

          {active === 'orders' && (
            <Panel title="My Orders">
              <div className="cc-card overflow-hidden">
                {orders.map((o) => (
                  <div key={o.id} className="cc-order">
                    <img src={o.product.images[0]} alt="" onError={handleImageError(o.product.name)} />
                    <div className="min-w-0 flex-grow-1">
                      <Link to={`/product/${o.product.id}`} className="fw-semibold text-dark d-block text-truncate">{o.product.name}</Link>
                      <small className="text-muted-cc">Order {o.id} · {formatDate(o.date)} · Seller: {o.product.seller.name}</small>
                    </div>
                    <strong className="d-none d-sm-block">{formatPrice(o.product.price)}</strong>
                    <span className={`badge text-bg-${statusTone[o.status]}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {active === 'wishlist' && (
            <Panel title="Wishlist" action={<Link to="/wishlist" className="btn btn-sm btn-soft">Open full wishlist</Link>}>
              <ProductGrid
                products={wishlist}
                columns={3}
                emptyTitle="Your wishlist is empty"
                emptyMessage="Tap the heart on any product to save it here."
                emptyAction={<Link to="/marketplace" className="btn btn-primary">Explore Marketplace</Link>}
              />
            </Panel>
          )}

          {active === 'messages' && (
            <Panel title="Messages" action={<Link to="/messages" className="btn btn-sm btn-primary">Open chat</Link>}>
              {convos.length === 0 && !loading ? (
                <EmptyState icon="bi-chat-dots" title="No conversations yet" message="Contact a seller from any product page." />
              ) : (
                <div className="cc-card overflow-hidden">
                  {convos.map((c) => {
                    const last = c.messages[c.messages.length - 1];
                    return (
                      <Link key={c.id} to="/messages" state={{ conversationId: c.id }} className="cc-order text-reset">
                        <span className="avatar">{c.participant.avatar}</span>
                        <div className="min-w-0 flex-grow-1">
                          <strong className="d-block">{c.participant.name}</strong>
                          <small className="text-muted-cc d-block text-truncate">{last.from === 'me' ? 'You: ' : ''}{last.text}</small>
                        </div>
                        <small className="text-muted-cc text-nowrap">{timeAgo(last.at)}</small>
                        {c.unread > 0 && <span className="badge rounded-pill text-bg-primary">{c.unread}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          {active === 'edit' && <EditProfile onDone={() => go('overview')} />}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
        <h1 className="h4 m-0">{title}</h1>
        {action}
      </div>
      {children}
    </>
  );
}

function EditProfile({ onDone }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ fullName: user.fullName, college: user.college, studentId: user.studentId, phone: user.phone || '', bio: user.bio || '' });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (values.fullName.trim().length < 3) errs.fullName = 'Name must be at least 3 characters.';
    if (!values.college.trim()) errs.college = 'College is required.';
    if (values.phone && !/^[6-9]\d{9}$/.test(values.phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateProfile(values); // PATCH /api/auth/me/ once the backend is connected
    toast('Profile updated');
    onDone();
  };

  return (
    <Panel title="Edit Profile">
      <form className="cc-card cc-card-pad" onSubmit={submit} noValidate>
        <div className="row g-3">
          <div className="col-md-6"><FormField id="ep-name" label="Full Name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} /></div>
          <div className="col-md-6"><FormField id="ep-email" label="Student Email" value={user.email} disabled hint="Email can't be changed." /></div>
          <div className="col-md-6"><FormField id="ep-college" label="College" value={values.college} onChange={set('college')} error={errors.college} /></div>
          <div className="col-md-6"><FormField id="ep-sid" label="Student ID" value={values.studentId} onChange={set('studentId')} /></div>
          <div className="col-md-6"><FormField id="ep-phone" label="Phone (optional)" type="tel" placeholder="98XXXXXXXX" value={values.phone} onChange={set('phone')} error={errors.phone} /></div>
          <div className="col-12"><FormField id="ep-bio" as="textarea" rows={3} label="Bio" placeholder="2nd year CSE · Loves books & badminton" value={values.bio} onChange={set('bio')} /></div>
        </div>
        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={onDone}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </Panel>
  );
}
