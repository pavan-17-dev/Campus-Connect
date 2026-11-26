import { useState } from 'react';

/** Labelled input with inline validation feedback. */
export default function FormField({ id, label, error, hint, icon, as = 'input', children, ...props }) {
  const Tag = as;
  const cls = as === 'select' ? 'form-select' : 'form-control';
  return (
    <div className="mb-3">
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <div className={icon ? 'cc-input-icon' : undefined}>
        {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
        <Tag id={id} className={`${cls} ${error ? 'is-invalid' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props}>
          {children}
        </Tag>
        {error && <div id={`${id}-error`} className="invalid-feedback">{error}</div>}
      </div>
      {hint && !error && <div className="form-text">{hint}</div>}
    </div>
  );
}

export function PasswordField({ id, label, error, extra, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center">
        <label htmlFor={id} className="form-label">{label}</label>
        {extra}
      </div>
      <div className="cc-input-icon cc-password">
        <i className="bi bi-lock" aria-hidden="true" />
        <input id={id} type={show ? 'text' : 'password'} className={`form-control ${error ? 'is-invalid' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props} />
        <button type="button" className="cc-password-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          <i className={`bi ${show ? 'bi-eye-slash' : 'bi-eye'}`} />
        </button>
        {error && <div id={`${id}-error`} className="invalid-feedback">{error}</div>}
      </div>
    </div>
  );
}
