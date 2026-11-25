export default function Loader({ label = 'Loading…', fullPage = false }) {
  return (
    <div className={`d-flex flex-column align-items-center justify-content-center gap-2 text-muted-cc ${fullPage ? 'py-5 my-5' : 'py-4'}`}>
      <div className="spinner-border text-primary" role="status" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="cc-product-card cc-product-skeleton" aria-hidden="true">
      <div className="skeleton sk-media" />
      <div className="cc-product-body">
        <div className="skeleton sk-line" style={{ width: '35%' }} />
        <div className="skeleton sk-line" style={{ width: '90%' }} />
        <div className="skeleton sk-line" style={{ width: '60%' }} />
        <div className="skeleton sk-line mt-3" style={{ width: '45%', height: 20 }} />
        <div className="d-flex align-items-center gap-2 mt-3">
          <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
          <div className="skeleton sk-line mb-0" style={{ width: '50%' }} />
        </div>
      </div>
    </div>
  );
}
