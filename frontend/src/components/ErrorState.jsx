export default function ErrorState({ message = 'Something went wrong while loading data.', onRetry }) {
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between flex-wrap gap-2 rounded-4" role="alert">
      <span><i className="bi bi-exclamation-triangle-fill me-2" />{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" />Try again
        </button>
      )}
    </div>
  );
}
