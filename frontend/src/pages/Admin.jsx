import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminStats, adminUsers, listingsPerMonth, recentActivities, reportedProducts } from '../data/admin';
import products from '../data/products';
import categories, { getCategory } from '../data/categories';
import { formatDate, formatPrice } from '../utils/format';
import { handleImageError } from '../utils/image';
import { useToast } from '../context/ToastContext';
import './Admin.css';

const sections = [
  { key: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
  { key: 'users', label: 'User Management', icon: 'bi-people' },
  { key: 'products', label: 'Product Management', icon: 'bi-box-seam' },
  { key: 'reports', label: 'Reports', icon: 'bi-flag' },
];

const statusTone = { Active: 'success', Pending: 'warning', Suspended: 'danger' };

export default function Admin() {
  const [section, setSection] = useState('overview');
  const [users, setUsers] = useState(adminUsers);
  const [items, setItems] = useState(products);
  const [userQuery, setUserQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const toast = useToast();

  const stats = [
    { label: 'Registered students', value: adminStats.totalStudents, icon: 'bi-people-fill', tone: 'primary', trend: '+12% this month' },
    { label: 'Total listings', value: adminStats.totalListings, icon: 'bi-box-seam-fill', tone: 'info', trend: '+8% this month' },
    { label: 'Active listings', value: adminStats.activeListings, icon: 'bi-lightning-charge-fill', tone: 'success', trend: '72% of total' },
    { label: 'Reported products', value: adminStats.reportedProducts, icon: 'bi-flag-fill', tone: 'danger', trend: '5 need review' },
  ];

  const categoryShare = useMemo(() => {
    const counts = products.reduce((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {});
    return categories.map((c) => ({ ...c, count: counts[c.slug] || 0, pct: Math.round(((counts[c.slug] || 0) / products.length) * 100) }));
  }, []);

  const maxBar = Math.max(...listingsPerMonth.map((m) => m.value));
  const filteredUsers = users.filter((u) => `${u.name} ${u.email} ${u.college}`.toLowerCase().includes(userQuery.toLowerCase()));
  const filteredItems = items.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()));

  const setUserStatus = (id, status) => {
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, status } : u)));
    toast(`User ${status.toLowerCase()}`, status === 'Suspended' ? 'danger' : 'success');
  };
  const removeProduct = (id) => {
    setItems((list) => list.filter((p) => p.id !== id));
    toast('Listing removed', 'info');
  };

  return (
    <div className="cc-admin">
      <aside className="cc-admin-side">
        <div className="cc-admin-brand"><i className="bi bi-shield-lock-fill" />Admin Console</div>
        <nav>
          {sections.map((s) => (
            <button key={s.key} type="button" className={section === s.key ? 'is-active' : ''} onClick={() => setSection(s.key)}>
              <i className={`bi ${s.icon}`} /><span>{s.label}</span>
            </button>
          ))}
        </nav>
        <Link to="/" className="cc-admin-back"><i className="bi bi-arrow-left" /><span>Back to site</span></Link>
      </aside>

      <main className="cc-admin-main">
        <header className="cc-admin-head">
          <div>
            <h1>{sections.find((s) => s.key === section).label}</h1>
            <p className="text-muted-cc m-0">Monitor and manage the Campus Connect community.</p>
          </div>
          <span className="badge-soft"><i className="bi bi-calendar3 me-1" />{formatDate(new Date().toISOString())}</span>
        </header>

        {section === 'overview' && (
          <>
            <div className="row g-3 mb-4">
              {stats.map((s) => (
                <div key={s.label} className="col-sm-6 col-xl-3">
                  <div className="cc-admin-stat">
                    <span className={`cc-stat-icon text-${s.tone} bg-${s.tone}-subtle`}><i className={`bi ${s.icon}`} /></span>
                    <div>
                      <small>{s.label}</small>
                      <strong>{s.value.toLocaleString('en-IN')}</strong>
                      <span className={`text-${s.tone === 'danger' ? 'danger' : 'success'}`}>{s.trend}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-4 mb-4">
              <div className="col-xl-8">
                <div className="cc-card cc-card-pad h-100">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="h6 m-0">New listings per month</h2>
                    <span className="small text-muted-cc">Last 6 months</span>
                  </div>
                  <div className="cc-bar-chart" role="img" aria-label={`Listings per month: ${listingsPerMonth.map((m) => `${m.month} ${m.value}`).join(', ')}`}>
                    {listingsPerMonth.map((m) => (
                      <div key={m.month} className="cc-bar-col">
                        <span className="cc-bar-value">{m.value}</span>
                        <div className="cc-bar" style={{ height: `${(m.value / maxBar) * 100}%` }} />
                        <span className="cc-bar-label">{m.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-xl-4">
                <div className="cc-card cc-card-pad h-100">
                  <h2 className="h6 mb-3">Listings by category</h2>
                  {categoryShare.map((c) => (
                    <div key={c.slug} className="mb-2">
                      <div className="d-flex justify-content-between small mb-1">
                        <span><i className={`bi ${c.icon} me-1`} style={{ color: c.color }} />{c.name}</span>
                        <span className="text-muted-cc">{c.count}</span>
                      </div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className="progress-bar" style={{ width: `${c.pct}%`, background: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="cc-card cc-card-pad">
              <h2 className="h6 mb-3">Recent activities</h2>
              <ul className="cc-activity">
                {recentActivities.map((a) => (
                  <li key={a.id}>
                    <span className={`cc-activity-icon text-${a.tone} bg-${a.tone}-subtle`}><i className={`bi ${a.icon}`} /></span>
                    <span className="flex-grow-1">{a.text}</span>
                    <small className="text-muted-cc text-nowrap">{a.time}</small>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {section === 'users' && (
          <div className="cc-card">
            <div className="cc-table-toolbar">
              <div className="cc-input-icon">
                <i className="bi bi-search" />
                <input type="search" className="form-control form-control-sm" placeholder="Search students…" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} aria-label="Search students" />
              </div>
              <span className="small text-muted-cc">{filteredUsers.length} students</span>
            </div>
            <div className="table-responsive">
              <table className="table align-middle cc-table mb-0">
                <thead>
                  <tr><th>Student</th><th>College</th><th>Listings</th><th>Status</th><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="avatar avatar-sm">{u.name.split(' ').map((s) => s[0]).join('')}</span>
                          <div><strong className="d-block small">{u.name}</strong><small className="text-muted-cc">{u.email}</small></div>
                        </div>
                      </td>
                      <td className="small">{u.college}</td>
                      <td>{u.listings}</td>
                      <td><span className={`badge text-bg-${statusTone[u.status]}`}>{u.status}</span></td>
                      <td className="text-end text-nowrap">
                        {u.status !== 'Active' && <button type="button" className="btn btn-sm btn-outline-success me-1" onClick={() => setUserStatus(u.id, 'Active')}>Activate</button>}
                        {u.status !== 'Suspended' && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setUserStatus(u.id, 'Suspended')}>Suspend</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'products' && (
          <div className="cc-card">
            <div className="cc-table-toolbar">
              <div className="cc-input-icon">
                <i className="bi bi-search" />
                <input type="search" className="form-control form-control-sm" placeholder="Search listings…" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} aria-label="Search listings" />
              </div>
              <span className="small text-muted-cc">{filteredItems.length} listings</span>
            </div>
            <div className="table-responsive">
              <table className="table align-middle cc-table mb-0">
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Price</th><th>Seller</th><th>Status</th><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {filteredItems.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img src={p.images[0]} alt="" className="cc-table-thumb" onError={handleImageError(p.name)} />
                          <Link to={`/product/${p.id}`} className="small fw-semibold text-dark cc-table-name">{p.name}</Link>
                        </div>
                      </td>
                      <td className="small">{getCategory(p.category)?.name}</td>
                      <td className="fw-semibold">{formatPrice(p.price)}</td>
                      <td className="small">{p.seller.name}</td>
                      <td><span className={`badge text-bg-${p.available ? 'success' : 'secondary'}`}>{p.available ? 'Active' : 'Sold'}</span></td>
                      <td className="text-end text-nowrap">
                        <Link to={`/product/${p.id}`} className="btn btn-sm btn-soft me-1" aria-label="View"><i className="bi bi-eye" /></Link>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeProduct(p.id)} aria-label="Remove listing"><i className="bi bi-trash3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'reports' && (
          <div className="cc-card">
            <div className="table-responsive">
              <table className="table align-middle cc-table mb-0">
                <thead>
                  <tr><th>Reported listing</th><th>Reason</th><th>Reports</th><th className="text-end">Actions</th></tr>
                </thead>
                <tbody>
                  {reportedProducts.map((r) => {
                    const p = products.find((x) => x.id === r.id);
                    return (
                      <tr key={r.id}>
                        <td><Link to={`/product/${p.id}`} className="fw-semibold small text-dark">{p.name}</Link></td>
                        <td className="small">{r.reason}</td>
                        <td><span className="badge text-bg-danger">{r.reports}</span></td>
                        <td className="text-end text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => toast('Report dismissed', 'info')}>Dismiss</button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => toast('Listing taken down', 'danger')}>Take down</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
