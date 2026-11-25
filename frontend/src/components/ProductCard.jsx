import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton';
import { getCategory } from '../data/categories';
import { discountPercent, formatPrice, timeAgo } from '../utils/format';
import { handleImageError } from '../utils/image';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const category = getCategory(product.category);
  const discount = discountPercent(product.price, product.originalPrice);
  const url = `/product/${product.id}`;

  return (
    <article className={`cc-product-card ${product.available ? '' : 'is-sold'}`}>
      <Link to={url} className="cc-product-media" aria-label={product.name}>
        <img
          src={product.images?.[0]}
          alt={product.name}
          loading="lazy"
          onError={handleImageError(category?.name || product.name)}
        />
        <div className="cc-product-badges">
          {!product.available && <span className="badge bg-dark">Sold</span>}
          {product.available && discount >= 40 && <span className="badge bg-success">{discount}% off</span>}
          <span className="badge cc-badge-condition">{product.condition}</span>
        </div>
      </Link>
      <WishlistButton product={product} className="cc-product-wish" />

      <div className="cc-product-body">
        <span className="cc-product-category">
          <i className={`bi ${category?.icon || 'bi-tag'}`} />
          {category?.name || product.category}
        </span>
        <h3 className="cc-product-name">
          <Link to={url}>{product.name}</Link>
        </h3>
        <div className="cc-product-price">
          <strong>{formatPrice(product.price)}</strong>
          {product.originalPrice > product.price && <s>{formatPrice(product.originalPrice)}</s>}
        </div>

        <div className="cc-product-seller">
          <span className="avatar avatar-sm">{product.seller.avatar}</span>
          <div className="min-w-0">
            <span className="cc-seller-name">{product.seller.name}</span>
            <span className="cc-seller-campus"><i className="bi bi-geo-alt" />{product.campus}</span>
          </div>
        </div>

        <div className="cc-product-footer">
          <small className="text-muted-cc"><i className="bi bi-clock me-1" />{timeAgo(product.postedAt)}</small>
          <Link to={url} className="btn btn-sm btn-soft">View Details</Link>
        </div>
      </div>
    </article>
  );
}
