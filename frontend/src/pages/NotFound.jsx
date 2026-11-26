import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  return (
    <div className="container py-5 my-lg-5">
      <EmptyState
        icon="bi-signpost-split"
        title="Page not found"
        message="The page you’re looking for doesn’t exist or has been moved."
        action={
          <div className="d-flex gap-2 justify-content-center">
            <Link to="/" className="btn btn-primary">Go home</Link>
            <Link to="/marketplace" className="btn btn-outline-primary">Browse marketplace</Link>
          </div>
        }
      />
    </div>
  );
}
