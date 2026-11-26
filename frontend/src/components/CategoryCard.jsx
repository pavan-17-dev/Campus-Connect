import { Link } from 'react-router-dom';
import './CategoryCard.css';

export default function CategoryCard({ category, count, variant = 'compact' }) {
  return (
    <Link
      to={`/marketplace?category=${category.slug}`}
      className={`cc-category-card cc-category-${variant}`}
      style={{ '--cat-color': category.color }}
    >
      <span className="cc-category-icon"><i className={`bi ${category.icon}`} /></span>
      <span className="cc-category-name">{category.name}</span>
      {variant === 'detailed' && <span className="cc-category-desc">{category.description}</span>}
      {count != null && <span className="cc-category-count">{count} item{count === 1 ? '' : 's'}</span>}
    </Link>
  );
}
