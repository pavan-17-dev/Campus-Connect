import ProductCard from './ProductCard';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import { ProductCardSkeleton } from './Loader';

/**
 * Responsive grid that handles loading, error and empty states.
 * `columns` controls the desktop column count (3 or 4).
 */
export default function ProductGrid({ products = [], loading = false, error = null, onRetry, columns = 4, skeletonCount, emptyTitle = 'No products found', emptyMessage, emptyAction }) {
  const colClass = columns === 3 ? 'col-12 col-sm-6 col-xl-4' : 'col-12 col-sm-6 col-lg-4 col-xl-3';

  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (loading) {
    return (
      <div className="row g-4" aria-busy="true">
        {Array.from({ length: skeletonCount || columns }).map((_, i) => (
          <div key={i} className={colClass}><ProductCardSkeleton /></div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return <EmptyState icon="bi-search" title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  return (
    <div className="row g-4">
      {products.map((p) => (
        <div key={p.id} className={colClass}><ProductCard product={p} /></div>
      ))}
    </div>
  );
}
