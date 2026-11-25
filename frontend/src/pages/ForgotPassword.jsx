import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import { requestPasswordReset } from '../services/authService';
import { EMAIL_RE } from '../utils/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return setError('Enter a valid email address.');
    setError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError('Could not send reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your student email and we'll send you a reset link.">
      {sent ? (
        <div className="text-center py-3">
          <span className="avatar avatar-lg mb-3" style={{ background: '#dcfce7', color: '#16a34a' }}><i className="bi bi-envelope-check" /></span>
          <h2 className="h5">Check your inbox</h2>
          <p className="text-muted-cc">If an account exists for <strong>{email}</strong>, you&apos;ll receive a link to reset your password.</p>
          <Link to="/login" className="btn btn-primary">Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <FormField id="fp-email" label="Student Email" type="email" icon="bi-envelope" placeholder="you@college.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <button type="submit" className="btn btn-primary btn-lg w-100" disabled={submitting}>
            {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Sending…</> : 'Send reset link'}
          </button>
          <p className="text-center small mt-4 mb-0"><Link to="/login"><i className="bi bi-arrow-left me-1" />Back to Login</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}
