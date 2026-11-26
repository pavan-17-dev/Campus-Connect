import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FormField, { PasswordField } from './FormField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/axios';
import { validateLogin } from '../utils/validation';

export default function LoginForm() {
  const [values, setValues] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/dashboard';

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLogin(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setServerError('');
    try {
      const user = await login(values);
      toast(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {location.state?.message && <div className="alert alert-info py-2 small"><i className="bi bi-info-circle me-2" />{location.state.message}</div>}
      {serverError && <div className="alert alert-danger py-2 small" role="alert"><i className="bi bi-exclamation-circle me-2" />{serverError}</div>}

      <FormField id="login-email" label="Email" type="email" icon="bi-envelope" placeholder="you@college.ac.in" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
      <PasswordField
        id="login-password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        value={values.password}
        onChange={set('password')}
        error={errors.password}
        extra={<Link to="/forgot-password" className="small fw-semibold mb-1">Forgot password?</Link>}
      />

      <div className="form-check mb-4">
        <input className="form-check-input" type="checkbox" id="remember" checked={values.remember} onChange={set('remember')} />
        <label className="form-check-label small" htmlFor="remember">Remember me</label>
      </div>

      <button type="submit" className="btn btn-primary btn-lg w-100" disabled={submitting}>
        {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Logging in…</> : 'Login'}
      </button>

      <p className="text-center text-muted-cc small mt-4 mb-0">
        New to Campus Connect? <Link to="/register" className="fw-semibold">Create an account</Link>
      </p>
    </form>
  );
}
