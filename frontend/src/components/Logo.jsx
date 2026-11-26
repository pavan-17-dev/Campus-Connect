import { Link } from 'react-router-dom';
import './Logo.css';

export default function Logo({ light = false, onClick }) {
  return (
    <Link to="/" className={`cc-logo ${light ? 'cc-logo-light' : ''}`} onClick={onClick} aria-label="Campus Connect home">
      <span className="cc-logo-mark">
        <i className="bi bi-bag-check-fill" />
      </span>
      <span className="cc-logo-text">
        Campus<span>Connect</span>
      </span>
    </Link>
  );
}
