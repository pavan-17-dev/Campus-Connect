import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import categories from '../data/categories';
import './SearchBar.css';

/**
 * Reusable search input.
 * - In "navigate" mode (default) it routes to /marketplace?search=…
 * - Pass `onSearch` to handle the query in place (e.g. on the marketplace page).
 */
export default function SearchBar({ initialValue = '', onSearch, size = 'md', withCategory = false, placeholder }) {
  const [query, setQuery] = useState(initialValue);
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (onSearch) return onSearch(q);
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (category) params.set('category', category);
    navigate(`/marketplace${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <form className={`cc-search cc-search-${size}`} onSubmit={submit} role="search">
      <i className="bi bi-search cc-search-icon" aria-hidden="true" />
      <input
        type="search"
        className="cc-search-input"
        placeholder={placeholder || 'Search books, calculators, laptops…'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (onSearch && e.target.value === '') onSearch('');
        }}
        aria-label="Search products"
      />
      {withCategory && (
        <select className="cc-search-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      )}
      <button type="submit" className="btn btn-primary cc-search-btn">
        <span className="d-none d-sm-inline">Search</span>
        <i className="bi bi-arrow-right d-sm-none" />
      </button>
    </form>
  );
}
