import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { useWishlist } from '../context/WishlistContext';
import { getCategory } from '../data/categories';
import { formatPrice } from '../utils/format';
import { handleImageError } from '../utils/image';
import './Wishlist.css';

export default function Wishlist() {
  const { items, remove } = useWishlist();
  const total = items.reduce((sum, p) => sum + p.price, 0);

  return (
    <>
      <PageHeader title="My Wishlist" subtitle={`${items.length} saved item${items.length === 1 ? '' : 's'}`} crumbs={[{ label: 'Wishlist' }]}>
        {items.length > 0 && <span className="badge bg-light text-dark fs-6 fw-semibold">Total value: {formatPrice(total)}</span>}
      </PageHeader>
      <div className="container py-4 py-lg-5">
        {items.length === 0 ? (
          <EmptyState
            icon="bi-heart"
            title="Your wishlist is empty"
            message="Save products you love by tapping the heart icon. They'll show up here so you can come back later."
            action={<Link to="/marketplace" className="btn btn-primary"><i className="bi bi-compass me-2" />Explore Marketplace</Link>}
          />
        ) : (
          <div className="row g-4">
            {items.map((p) => (
              <div key={p.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                <article className="cc-wish-card">
                  <Link to={`/product/${p.id}`} className="cc-wish-media">
                    <img src={p.images[0]} alt={p.name} loading="lazy" onError={handleImageError(getCategory(p.category)?.name)} />
                    {!p.available && <span className="badge bg-dark">Sold</span>}
                  </Link>
                  <div className="cc-wish-body">
                    <small className="text-primary-cc fw-semibold">{getCategory(p.category)?.name}</small>
                    <h3><Link to={`/product/${p.id}`}>{p.name}</Link></h3>
                    <strong>{formatPrice(p.price)}</strong>
                    <div className="cc-wish-actions">
                      <Link to={`/product/${p.id}`} className="btn btn-primary btn-sm flex-grow-1">View Product</Link>
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => remove(p.id)} aria-label={`Remove ${p.name} from wishlist`}>
                        <i className="bi bi-trash3 me-1" />Remove
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
