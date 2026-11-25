import { Link } from 'react-router-dom';
import Logo from './Logo';
import categories from '../data/categories';
import './Footer.css';

const socials = [
  { icon: 'bi-instagram', label: 'Instagram', href: 'https://instagram.com' },
  { icon: 'bi-linkedin', label: 'LinkedIn', href: 'https://linkedin.com' },
  { icon: 'bi-twitter-x', label: 'X (Twitter)', href: 'https://x.com' },
  { icon: 'bi-youtube', label: 'YouTube', href: 'https://youtube.com' },
  { icon: 'bi-github', label: 'GitHub', href: 'https://github.com' },
];

export default function Footer() {
  return (
    <footer className="cc-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-12">
            <Logo light />
            <p className="cc-footer-about">
              The trusted marketplace for students. Buy, sell and exchange books, gadgets and hostel essentials
              with verified students on your campus.
            </p>
            <div className="cc-socials">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
                  <i className={`bi ${s.icon}`} />
                </a>
              ))}
            </div>
          </div>
          <div className="col-lg-2 col-6">
            <h6>Company</h6>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/help">Help &amp; Support</Link></li>
            </ul>
          </div>
          <div className="col-lg-2 col-6">
            <h6>Legal</h6>
            <ul>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            </ul>
          </div>
          <div className="col-lg-4 col-md-12">
            <h6>Popular Categories</h6>
            <div className="cc-footer-tags">
              {categories.map((c) => (
                <Link key={c.slug} to={`/marketplace?category=${c.slug}`}>{c.name}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="cc-footer-bottom">
          <span>© {new Date().getFullYear()} Campus Connect. Made for students, by students.</span>
          <span><i className="bi bi-shield-check me-1" />Verified student community</span>
        </div>
      </div>
    </footer>
  );
}
