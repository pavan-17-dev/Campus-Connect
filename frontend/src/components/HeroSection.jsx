import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import { handleImageError } from '../utils/image';
import './HeroSection.css';

const popular = ['Calculator', 'Laptop', 'Lab coat', 'Drawing kit', 'Cycle'];
const HERO_IMG = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=75';

export default function HeroSection() {
  return (
    <section className="cc-hero">
      <div className="container">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <span className="section-eyebrow"><i className="bi bi-mortarboard-fill" />Built for college students</span>
            <h1 className="cc-hero-title">
              Your Campus.<br />
              <span>Your Marketplace.</span>
            </h1>
            <p className="cc-hero-sub">Buy, sell and exchange products with students on your campus.</p>

            <SearchBar size="lg" withCategory />

            <div className="cc-hero-popular">
              <span>Popular:</span>
              {popular.map((p) => (
                <Link key={p} to={`/marketplace?search=${encodeURIComponent(p)}`}>{p}</Link>
              ))}
            </div>

            <div className="cc-hero-ctas">
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                <i className="bi bi-compass me-2" />Explore Marketplace
              </Link>
              <Link to="/sell" className="btn btn-outline-primary btn-lg bg-white">
                <i className="bi bi-tag me-2" />Sell Your Item
              </Link>
            </div>

            <div className="cc-hero-stats">
              <div><strong>2.8K+</strong><span>Students</span></div>
              <div><strong>1.2K+</strong><span>Listings</span></div>
              <div><strong>15+</strong><span>Campuses</span></div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="cc-hero-visual">
              <img
                src={HERO_IMG}
                alt="Students collaborating on campus"
                className="cc-hero-img"
                onError={handleImageError('Campus Connect')}
              />
              <div className="cc-hero-float cc-hero-float-1">
                <span className="cc-float-icon bg-accent text-primary-cc"><i className="bi bi-book" /></span>
                <div>
                  <small>Just listed</small>
                  <strong>Engineering Maths – ₹450</strong>
                </div>
              </div>
              <div className="cc-hero-float cc-hero-float-2">
                <span className="cc-float-icon cc-float-green"><i className="bi bi-shield-check" /></span>
                <div>
                  <small>Verified</small>
                  <strong>Student-only community</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
