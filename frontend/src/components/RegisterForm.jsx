import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField, { PasswordField } from './FormField';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage, getFieldErrors } from '../api/axios';
import { campuses } from '../data/products';
import { passwordStrength, validateRegister } from '../utils/validation';

const initial = { fullName: '', email: '', college: '', studentId: '', password: '', confirmPassword: '', terms: false };

export default function RegisterForm() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateRegister(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`reg-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    setServerError('');
    try {
      await register(values);
      toast('Account created! Please log in.');
      navigate('/login', { state: { message: 'Registration successful. Log in with your student email.' } });
    } catch (err) {
      // Show the server's field errors (e.g. "email already exists") under each input.
      setErrors(getFieldErrors(err, { full_name: 'fullName', student_id: 'studentId', confirm_password: 'confirmPassword' }));
      setServerError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const strength = values.password ? passwordStrength(values.password) : null;

  return (
    <form onSubmit={submit} noValidate>
      {serverError && <div className="alert alert-danger py-2 small" role="alert">{serverError}</div>}

      <FormField id="reg-fullName" label="Full Name" icon="bi-person" placeholder="e.g. Aarav Sharma" autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} />
      <FormField id="reg-email" label="Student Email" type="email" icon="bi-envelope" placeholder="name@college.ac.in" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} hint="Use your official college email for verification." />

      <div className="row g-3">
        <div className="col-sm-7">
          <FormField id="reg-college" label="College Name" icon="bi-building" placeholder="Your college" list="college-options" value={values.college} onChange={set('college')} error={errors.college} />
          <datalist id="college-options">
            {campuses.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="col-sm-5">
          <FormField id="reg-studentId" label="Student ID" icon="bi-person-vcard" placeholder="1BM25CS001" value={values.studentId} onChange={set('studentId')} error={errors.studentId} />
        </div>
      </div>

      <PasswordField id="reg-password" label="Password" placeholder="At least 8 characters" autoComplete="new-password" value={values.password} onChange={set('password')} error={errors.password} />
      {strength && (
        <div className="mb-3 mt-n2">
          <div className="progress" style={{ height: 5 }}>
            <div className={`progress-bar bg-${strength.tone}`} style={{ width: `${strength.pct}%` }} />
          </div>
          <small className={`text-${strength.tone}`}>Password strength: {strength.label}</small>
        </div>
      )}
      <PasswordField id="reg-confirmPassword" label="Confirm Password" placeholder="Re-enter password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />

      <div className="form-check mb-4">
        <input className={`form-check-input ${errors.terms ? 'is-invalid' : ''}`} type="checkbox" id="reg-terms" checked={values.terms} onChange={set('terms')} />
        <label className="form-check-label small" htmlFor="reg-terms">
          I agree to the <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>
        </label>
        {errors.terms && <div className="invalid-feedback">{errors.terms}</div>}
      </div>

      <button type="submit" className="btn btn-primary btn-lg w-100" disabled={submitting}>
        {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Creating account…</> : 'Register'}
      </button>

      <p className="text-center text-muted-cc small mt-4 mb-0">
        Already have an account? <Link to="/login" className="fw-semibold">Login</Link>
      </p>
    </form>
  );
}
