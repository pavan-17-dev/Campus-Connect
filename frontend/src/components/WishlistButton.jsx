import { useWishlist } from '../context/WishlistContext';
import './WishlistButton.css';

export default function WishlistButton({ product, variant = 'icon', className = '' }) {
  const { isWishlisted, toggle } = useWishlist();
  const active = isWishlisted(product.id);

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  };

  if (variant === 'button') {
    return (
      <button type="button" className={`btn ${active ? 'btn-soft' : 'btn-outline-primary'} ${className}`} onClick={onClick} aria-pressed={active}>
        <i className={`bi ${active ? 'bi-heart-fill text-danger' : 'bi-heart'} me-2`} />
        {active ? 'Saved to Wishlist' : 'Add to Wishlist'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`cc-wish-btn ${active ? 'is-active' : ''} ${className}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      title={active ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <i className={`bi ${active ? 'bi-heart-fill' : 'bi-heart'}`} />
    </button>
  );
}
