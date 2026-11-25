import { useEffect, useState } from 'react';
import ProductGrid from './ProductGrid';
import categories from '../data/categories';
import { getRecommendations } from '../services/productService';
import { getInterests } from '../utils/activity';

/**
 * "Recommended for You" – personalised by the categories a student selects
 * or has browsed. With the backend enabled, Django + Gemini rank the results.
 */
export default function RecommendedSection() {
  const [interests, setInterests] = useState(getInterests);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getRecommendations(interests)
      .then(setItems)
      .catch(() => setError('Could not load recommendations.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [interests]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (slug) =>
    setInterests((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [slug, ...prev].slice(0, 4)));

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge-ai mb-2"><i className="bi bi-stars" />AI-powered</span>
            <h2 className="section-title mt-2">Recommended for You</h2>
            <p className="section-subtitle">
              {interests.length ? 'Based on your interests and browsing activity.' : 'Pick a few interests to personalise your picks.'}
            </p>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 mb-4" role="group" aria-label="Your interests">
          {categories.map((c) => {
            const active = interests.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                className={`btn btn-sm rounded-pill ${active ? 'btn-primary' : 'btn-outline-secondary bg-white'}`}
                onClick={() => toggle(c.slug)}
                aria-pressed={active}
              >
                <i className={`bi ${active ? 'bi-check2' : c.icon} me-1`} />{c.name}
              </button>
            );
          })}
        </div>
        <ProductGrid products={items} loading={loading} error={error} onRetry={load} emptyTitle="No recommendations yet" />
      </div>
    </section>
  );
}
