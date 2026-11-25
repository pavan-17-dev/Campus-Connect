import './EmptyState.css';

export default function EmptyState({ icon = 'bi-inbox', title, message, action }) {
  return (
    <div className="cc-empty">
      <span className="cc-empty-icon"><i className={`bi ${icon}`} /></span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
