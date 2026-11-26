import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import './Navbar.css';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { count } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user?.fullName?.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className={`cc-navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="container cc-navbar-inner" aria-label="Main navigation">
        <Logo />

        <ul className={`cc-nav-links ${open ? 'is-open' : ''}`}>
          {links.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} className={({ isActive }) => `cc-nav-link ${isActive ? 'active' : ''}`}>
                {l.label}
              </NavLink>
            </li>
          ))}
          {!isAuthenticated && (
            <li className="cc-nav-auth-mobile">
              <Link to="/login" className="btn btn-outline-primary w-100">Login</Link>
              <Link to="/register" className="btn btn-primary w-100">Register</Link>
            </li>
          )}
          <li className="cc-nav-sell-mobile">
            <Link to="/sell" className="btn btn-primary w-100"><i className="bi bi-plus-lg me-1" />Sell Item</Link>
          </li>
        </ul>

        <div className="cc-nav-actions">
          {!isAuthenticated && (
            <div className="cc-nav-auth">
              <Link to="/login" className="cc-nav-link">Login</Link>
              <span className="text-muted-cc">/</span>
              <Link to="/register" className="cc-nav-link">Register</Link>
            </div>
          )}

          <Link to="/wishlist" className="cc-icon-btn" aria-label={`Wishlist, ${count} items`}>
            <i className="bi bi-heart" />
            {count > 0 && <span className="cc-icon-badge">{count}</span>}
          </Link>

          <div className="cc-profile" ref={menuRef}>
            <button
              type="button"
              className="cc-icon-btn"
              aria-label="Profile menu"
              aria-expanded={menuOpen}
              onClick={() => (isAuthenticated ? setMenuOpen((v) => !v) : navigate('/login'))}
            >
              {isAuthenticated ? <span className="avatar avatar-sm">{initials}</span> : <i className="bi bi-person-circle" />}
            </button>
            {menuOpen && isAuthenticated && (
              <div className="cc-dropdown" role="menu">
                <div className="cc-dropdown-head">
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                </div>
                <Link to="/dashboard" className="cc-dropdown-item"><i className="bi bi-grid" />Dashboard</Link>
                <Link to="/dashboard?tab=listings" className="cc-dropdown-item"><i className="bi bi-box-seam" />My Listings</Link>
                <Link to="/messages" className="cc-dropdown-item"><i className="bi bi-chat-dots" />Messages</Link>
                <Link to="/admin" className="cc-dropdown-item"><i className="bi bi-shield-check" />Admin Panel</Link>
                <button type="button" className="cc-dropdown-item text-danger" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right" />Logout
                </button>
              </div>
            )}
          </div>

          <Link to="/sell" className="btn btn-primary cc-sell-btn">
            <i className="bi bi-plus-lg me-1" />Sell Item
          </Link>

          <button
            type="button"
            className="cc-icon-btn cc-burger"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <i className={`bi ${open ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
        </div>
      </nav>
    </header>
  );
}
