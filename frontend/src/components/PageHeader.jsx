import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, crumbs = [], children }) {
  return (
    <section className="page-header">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            {crumbs.map((c) =>
              c.to ? (
                <li key={c.label} className="breadcrumb-item"><Link to={c.to}>{c.label}</Link></li>
              ) : (
                <li key={c.label} className="breadcrumb-item active" aria-current="page">{c.label}</li>
              )
            )}
          </ol>
        </nav>
        <div className="d-flex justify-content-between align-items-end flex-wrap gap-3">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
