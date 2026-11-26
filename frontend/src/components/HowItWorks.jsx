import './HowItWorks.css';

const steps = [
  { icon: 'bi-person-badge', title: 'Register with your student account', text: 'Sign up using your college email and student ID so everyone you meet is a verified student.' },
  { icon: 'bi-grid-3x3-gap', title: 'Browse products or list your own', text: 'Search by category, price or campus, or post your own item with photos in under two minutes.' },
  { icon: 'bi-chat-heart', title: 'Connect & complete the deal', text: 'Chat with the buyer or seller, meet at a safe spot on campus and complete your transaction.' },
];

export default function HowItWorks() {
  return (
    <section className="section bg-white" id="how-it-works">
      <div className="container">
        <div className="text-center mb-5">
          <span className="section-eyebrow"><i className="bi bi-lightning-charge-fill" />Simple &amp; quick</span>
          <h2 className="section-title">How Campus Connect Works</h2>
          <p className="section-subtitle">Three easy steps to start buying and selling on your campus.</p>
        </div>
        <div className="row g-4">
          {steps.map((s, i) => (
            <div className="col-md-4" key={s.title}>
              <div className="cc-step">
                <span className="cc-step-num">{i + 1}</span>
                <span className="cc-step-icon"><i className={`bi ${s.icon}`} /></span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
