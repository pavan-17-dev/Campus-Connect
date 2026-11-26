import Logo from './Logo';
import './AuthLayout.css';

const perks = [
  { icon: 'bi-shield-check', text: 'Verified student-only community' },
  { icon: 'bi-currency-rupee', text: 'Save up to 60% on textbooks & gadgets' },
  { icon: 'bi-geo-alt', text: 'Meet safely right on your campus' },
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <section className="cc-auth">
      <div className="container">
        <div className="cc-auth-card">
          <div className="cc-auth-side d-none d-lg-flex">
            <Logo light />
            <div>
              <h2>Join thousands of students trading smarter.</h2>
              <ul>
                {perks.map((p) => (
                  <li key={p.text}><i className={`bi ${p.icon}`} />{p.text}</li>
                ))}
              </ul>
            </div>
            <blockquote>
              “Sold my 1st-year books in two days and bought a calculator from a senior. So easy!”
              <cite>— Meera, 2nd year ECE</cite>
            </blockquote>
          </div>
          <div className="cc-auth-form">
            <h1>{title}</h1>
            <p className="text-muted-cc mb-4">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
