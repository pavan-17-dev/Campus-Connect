import categories from '../data/categories';
import { conditions } from '../data/products';
import { formatPrice } from '../utils/format';
import './FilterSidebar.css';

export const PRICE_MAX = 35000;

const pricePresets = [
  { label: 'Under ₹500', min: '', max: 500 },
  { label: '₹500 – ₹2,000', min: 500, max: 2000 },
  { label: '₹2,000 – ₹10,000', min: 2000, max: 10000 },
  { label: 'Above ₹10,000', min: 10000, max: '' },
];

/**
 * Controlled filter panel. `filters` holds the current values and
 * `onChange(partial)` merges updates in the parent page.
 */
export default function FilterSidebar({ filters, onChange, onReset, counts = {} }) {
  const toggleIn = (key, value) => {
    const list = filters[key];
    onChange({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  };

  return (
    <aside className="cc-filters" aria-label="Product filters">
      <div className="cc-filters-head">
        <h2><i className="bi bi-sliders me-2" />Filters</h2>
        <button type="button" className="btn btn-link btn-sm p-0" onClick={onReset}>Reset all</button>
      </div>

      <div className="cc-filter-group">
        <h3>Category</h3>
        {categories.map((c) => (
          <label key={c.slug} className="cc-filter-check">
            <input type="checkbox" className="form-check-input" checked={filters.categories.includes(c.slug)} onChange={() => toggleIn('categories', c.slug)} />
            <span>{c.name}</span>
            {counts[c.slug] != null && <small>{counts[c.slug]}</small>}
          </label>
        ))}
      </div>

      <div className="cc-filter-group">
        <h3>Price range</h3>
        <div className="d-flex gap-2 align-items-center mb-2">
          <input type="number" min="0" className="form-control form-control-sm" placeholder="Min ₹" value={filters.minPrice} onChange={(e) => onChange({ minPrice: e.target.value })} aria-label="Minimum price" />
          <span className="text-muted-cc">–</span>
          <input type="number" min="0" className="form-control form-control-sm" placeholder="Max ₹" value={filters.maxPrice} onChange={(e) => onChange({ maxPrice: e.target.value })} aria-label="Maximum price" />
        </div>
        <input
          type="range"
          className="form-range"
          min="0"
          max={PRICE_MAX}
          step="500"
          value={filters.maxPrice === '' ? PRICE_MAX : filters.maxPrice}
          onChange={(e) => onChange({ maxPrice: Number(e.target.value) >= PRICE_MAX ? '' : e.target.value })}
          aria-label="Maximum price slider"
        />
        <div className="d-flex justify-content-between small text-muted-cc mb-2">
          <span>{formatPrice(filters.minPrice || 0)}</span>
          <span>{filters.maxPrice === '' ? `${formatPrice(PRICE_MAX)}+` : formatPrice(filters.maxPrice)}</span>
        </div>
        <div className="d-flex flex-wrap gap-1">
          {pricePresets.map((p) => {
            const active = String(filters.minPrice) === String(p.min) && String(filters.maxPrice) === String(p.max);
            return (
              <button key={p.label} type="button" className={`cc-chip ${active ? 'is-active' : ''}`} onClick={() => onChange({ minPrice: p.min, maxPrice: p.max })}>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cc-filter-group">
        <h3>Availability</h3>
        {[
          ['all', 'All items'],
          ['available', 'Available only'],
          ['sold', 'Sold out'],
        ].map(([value, label]) => (
          <label key={value} className="cc-filter-check">
            <input type="radio" name="availability" className="form-check-input" checked={filters.availability === value} onChange={() => onChange({ availability: value })} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="cc-filter-group">
        <h3>Condition</h3>
        {conditions.map((c) => (
          <label key={c} className="cc-filter-check">
            <input type="checkbox" className="form-check-input" checked={filters.condition.includes(c)} onChange={() => toggleIn('condition', c)} />
            <span>{c}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}
