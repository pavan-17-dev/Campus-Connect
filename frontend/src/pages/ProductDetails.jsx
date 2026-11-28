import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import WishlistButton from '../components/WishlistButton';
import ProductGrid from '../components/ProductGrid';
import EmptyState from '../components/EmptyState';
import Loader from '../components/Loader';
import { getCategory } from '../data/categories';
import { getProductById, getRelatedProducts, reportProduct } from '../services/productService';
import { startConversation } from '../services/chatService';
import { placeOrder } from '../services/orderService';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { recordInterest } from '../utils/activity';
import { discountPercent, formatDate, formatPrice, timeAgo } from '../utils/format';
import { handleImageError } from '../utils/image';
import './ProductDetails.css';

const conditionTone = { New: 'success', 'Like New': 'primary', Good: 'info', Used: 'warning' };

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [status, setStatus] = useState('loading');
  const [ordering, setOrdering] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setActiveImg(0);
    getProductById(id)
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
        setStatus('ready');
        recordInterest(p.category);
        return getRelatedProducts(p).then((r) => !cancelled && setRelated(r));
      })
      .catch(() => !cancelled && setStatus('notfound'));
    return () => { cancelled = true; };
  }, [id]);

  if (status === 'loading') return <Loader label="Loading product…" fullPage />;

  if (status === 'notfound') {
    return (
      <div className="container py-5">
        <EmptyState
          icon="bi-box-seam"
          title="Product not found"
          message="This listing may have been removed or sold."
          action={<Link to="/marketplace" className="btn btn-primary">Back to Marketplace</Link>}
        />
      </div>
    );
  }

  const category = getCategory(product.category);
  const discount = discountPercent(product.price, product.originalPrice);
  // The API tells us directly (is_owner); in sample-data mode compare ids.
  const isOwner = product.isOwner ?? (isAuthenticated && product.seller.id === user?.id);
  const requireLogin = (message) => navigate('/login', { state: { from: `/product/${product.id}`, message } });

  const contactSeller = async () => {
    if (!isAuthenticated) return requireLogin('Log in to chat with the seller.');
    try {
      const convo = await startConversation(product.id);
      navigate('/messages', { state: { conversationId: convo?.id, product, seller: product.seller } });
    } catch (err) {
      toast(getErrorMessage(err, 'Could not start a conversation. Try again.'), 'danger');
    }
  };

  // Places a "request to buy". The seller accepts it, then both meet on campus.
  const requestToBuy = async () => {
    if (!isAuthenticated) return requireLogin('Log in to request this item.');
    setOrdering(true);
    try {
      await placeOrder(product);
      setOrderPlaced(true);
      toast('Request sent! The seller will accept or decline it.');
    } catch (err) {
      toast(getErrorMessage(err, 'Could not place the order.'), 'danger');
    } finally {
      setOrdering(false);
    }
  };

  const report = async () => {
    if (!isAuthenticated) return requireLogin('Log in to report a listing.');
    try {
      await reportProduct(product.id, 'misleading');
      toast('Thanks — our team will review this listing.', 'info');
    } catch (err) {
      toast(getErrorMessage(err, 'Could not send the report.'), 'danger');
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard', 'info');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <div className="container pt-4">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb small">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/marketplace">Marketplace</Link></li>
            <li className="breadcrumb-item"><Link to={`/marketplace?category=${product.category}`}>{category?.name}</Link></li>
            <li className="breadcrumb-item active text-truncate" aria-current="page" style={{ maxWidth: 260 }}>{product.name}</li>
          </ol>
        </nav>
      </div>

      <section className="container pb-5">
        <div className="cc-detail-layout">
          <div className="cc-area-gallery">
            <div className="cc-gallery">
              <div className="cc-gallery-main">
                <img src={product.images[activeImg]} alt={product.name} onError={handleImageError(category?.name)} />
                {!product.available && <span className="cc-sold-ribbon">SOLD</span>}
                {product.images.length > 1 && (
                  <>
                    <button type="button" className="cc-gallery-nav prev" aria-label="Previous image" onClick={() => setActiveImg((i) => (i - 1 + product.images.length) % product.images.length)}><i className="bi bi-chevron-left" /></button>
                    <button type="button" className="cc-gallery-nav next" aria-label="Next image" onClick={() => setActiveImg((i) => (i + 1) % product.images.length)}><i className="bi bi-chevron-right" /></button>
                  </>
                )}
              </div>
              <div className="cc-gallery-thumbs">
                {product.images.map((src, i) => (
                  <button key={src + i} type="button" className={i === activeImg ? 'is-active' : ''} onClick={() => setActiveImg(i)} aria-label={`View image ${i + 1}`}>
                    <img src={src} alt="" onError={handleImageError(category?.name)} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="cc-area-desc">
            <div className="cc-card cc-card-pad">
              <h2 className="h5 mb-3">Description</h2>
              <p className="cc-description">{product.description}</p>
              <h3 className="h6 mt-4 mb-3">Details</h3>
              <dl className="cc-spec">
                <div><dt>Category</dt><dd><Link to={`/marketplace?category=${product.category}`}><i className={`bi ${category?.icon} me-1`} />{category?.name}</Link></dd></div>
                <div><dt>Condition</dt><dd><span className={`badge text-bg-${conditionTone[product.condition] || 'secondary'}`}>{product.condition}</span></dd></div>
                <div><dt>Campus</dt><dd>{product.campus}</dd></div>
                <div><dt>Pickup location</dt><dd>{product.location}</dd></div>
                <div><dt>Posted on</dt><dd>{formatDate(product.postedAt)}</dd></div>
                <div><dt>Availability</dt><dd>{product.available ? <span className="text-success fw-semibold">In stock</span> : <span className="text-danger fw-semibold">Sold</span>}</dd></div>
              </dl>
            </div>
          </div>

          <div className="cc-area-aside">
            <div className="cc-detail-aside">
              <div className="cc-card cc-card-pad">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <span className="badge-soft"><i className={`bi ${category?.icon} me-1`} />{category?.name}</span>
                  <button type="button" className="cc-icon-btn" onClick={share} aria-label="Share listing"><i className="bi bi-share" /></button>
                </div>
                <h1 className="cc-detail-title">{product.name}</h1>
                <div className="cc-detail-price">
                  <strong>{formatPrice(product.price)}</strong>
                  {product.originalPrice > product.price && (
                    <>
                      <s>{formatPrice(product.originalPrice)}</s>
                      <span className="badge text-bg-success">{discount}% off</span>
                    </>
                  )}
                </div>
                <div className="cc-detail-meta">
                  <span><i className="bi bi-patch-check" />{product.condition}</span>
                  <span><i className="bi bi-geo-alt" />{product.location}</span>
                  <span><i className="bi bi-clock" />Posted {timeAgo(product.postedAt)}</span>
                </div>

                {isOwner ? (
                  <div className="d-grid gap-2 mt-4">
                    <div className="alert alert-info mb-0 small"><i className="bi bi-info-circle me-2" />This is your listing.</div>
                    <button type="button" className="btn btn-outline-primary" onClick={() => navigate('/dashboard?tab=listings')}>Manage my listings</button>
                  </div>
                ) : (
                  <div className="d-grid gap-2 mt-4">
                    <button type="button" className="btn btn-primary btn-lg" onClick={requestToBuy} disabled={!product.available || ordering || orderPlaced}>
                      {ordering ? <><span className="spinner-border spinner-border-sm me-2" />Sending request…</>
                        : orderPlaced ? <><i className="bi bi-check2-circle me-2" />Request sent</>
                        : product.available ? <><i className="bi bi-bag-check me-2" />Request to Buy</>
                        : product.status === 'reserved' ? 'Reserved' : 'Item sold'}
                    </button>
                    <button type="button" className="btn btn-outline-primary btn-lg" onClick={contactSeller}>
                      <i className="bi bi-chat-dots me-2" />Contact Seller
                    </button>
                    <WishlistButton product={product} variant="button" />
                  </div>
                )}
                {orderPlaced && (
                  <p className="small text-muted-cc mt-2 mb-0">Track it in <a href="/dashboard?tab=orders" onClick={(e) => { e.preventDefault(); navigate('/dashboard?tab=orders'); }}>My Orders</a>. Payment is made in person at pickup.</p>
                )}

                <div className="cc-safety">
                  <i className="bi bi-shield-check" />
                  <span>Meet in a public place on campus and check the item before paying.</span>
                </div>
              </div>

              <div className="cc-card cc-card-pad mt-3">
                <h2 className="h6 text-muted-cc text-uppercase small fw-bold mb-3">Seller information</h2>
                <div className="d-flex align-items-center gap-3">
                  <span className="avatar avatar-lg">{product.seller.avatar}</span>
                  <div>
                    <strong className="d-block">{product.seller.name} <i className="bi bi-patch-check-fill text-primary-cc" title="Verified student" /></strong>
                    <span className="small text-muted-cc d-block">{product.seller.college}</span>
                    <span className="small">
                      {product.seller.rating && <><i className="bi bi-star-fill text-warning me-1" />{product.seller.rating} · </>}
                      {product.seller.listings} listing{product.seller.listings === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="cc-seller-stats">
                  <div><span>Member since</span><strong>{new Date(product.seller.joined).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</strong></div>
                  <div><span>Campus</span><strong>{product.campus}</strong></div>
                </div>
                {!isOwner && <button type="button" className="btn btn-link btn-sm text-danger p-0 mt-2" onClick={report}>
                  <i className="bi bi-flag me-1" />Report this listing
                </button>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-sm pt-0">
          <div className="container">
            <div className="section-head">
              <div>
                <h2 className="section-title">Related Products</h2>
                <p className="section-subtitle">More items you might be interested in.</p>
              </div>
              <Link to={`/marketplace?category=${product.category}`} className="btn btn-soft">See all in {category?.name}</Link>
            </div>
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </>
  );
}
