import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import CategoryCard from '../components/CategoryCard';
import ProductGrid from '../components/ProductGrid';
import HowItWorks from '../components/HowItWorks';
import RecommendedSection from '../components/RecommendedSection';
import categories from '../data/categories';
import { getFeaturedProducts } from '../services/productService';
import './Home.css';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getFeaturedProducts()
      .then(setFeatured)
      .catch(() => setError('Could not load featured products.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <>
      <HeroSection />

      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow"><i className="bi bi-grid-fill" />Categories</span>
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">Everything a student needs, from textbooks to hostel gear.</p>
            </div>
            <Link to="/categories" className="btn btn-soft">View all <i className="bi bi-arrow-right ms-1" /></Link>
          </div>
          <div className="cc-category-row">
            {categories.map((c) => (
              <CategoryCard key={c.slug} category={c} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow"><i className="bi bi-fire" />Trending on campus</span>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Hand-picked deals from students near you.</p>
            </div>
            <Link to="/marketplace" className="btn btn-soft">Browse marketplace <i className="bi bi-arrow-right ms-1" /></Link>
          </div>
          <ProductGrid products={featured} loading={loading} error={error} onRetry={load} columns={3} skeletonCount={6} />
        </div>
      </section>

      <HowItWorks />

      <RecommendedSection />

      <section className="section-sm pt-0">
        <div className="container">
          <div className="cc-cta-banner">
            <div>
              <h2>Got stuff you no longer need?</h2>
              <p>Turn last semester&apos;s books and gadgets into cash. Listing is free and takes under two minutes.</p>
            </div>
            <Link to="/sell" className="btn btn-light btn-lg text-primary-cc"><i className="bi bi-plus-circle me-2" />Sell Your Item</Link>
          </div>
        </div>
      </section>
    </>
  );
}
