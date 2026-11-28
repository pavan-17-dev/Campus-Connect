import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ProductForm from '../components/ProductForm';
import { createProduct } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage, getFieldErrors } from '../api/axios';

export default function SellProduct() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [created, setCreated] = useState(null);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const product = await createProduct(values, user);
      setCreated(product);
      toast('Your listing is live! 🎉');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not publish your listing.'));
      setFieldErrors(getFieldErrors(err, { title: 'name', uploaded_images: 'images' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Sell an Item" subtitle="List your product in a few simple steps — it's free." crumbs={[{ label: 'Sell Item' }]} />
      <div className="container py-4">
        {created ? (
          <div className="cc-card cc-card-pad text-center py-5 mx-auto" style={{ maxWidth: 560 }}>
            <span className="avatar avatar-lg mb-3" style={{ background: '#dcfce7', color: '#16a34a' }}><i className="bi bi-check-lg" /></span>
            <h2 className="h4">Listing published!</h2>
            <p className="text-muted-cc">“{created.name}” is now visible to students in the marketplace.</p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/product/${created.id}`)}>View listing</button>
              <button type="button" className="btn btn-outline-primary" onClick={() => setCreated(null)}>List another item</button>
              <Link to="/dashboard?tab=listings" className="btn btn-link">My listings</Link>
            </div>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2" />{error}</div>}
            <ProductForm onSubmit={handleSubmit} submitting={submitting} serverErrors={fieldErrors} defaultLocation="" />
          </>
        )}
      </div>
    </>
  );
}
