import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import { useToast } from '../context/ToastContext';
import { EMAIL_RE } from '../utils/validation';

const faqs = [
  { q: 'Who can use Campus Connect?', a: 'Any student with a valid college email and student ID can register, buy and sell.' },
  { q: 'Does Campus Connect charge any fees?', a: 'No. Listing items and contacting sellers is completely free.' },
  { q: 'How do payments work?', a: 'Buyers and sellers agree on payment (cash or UPI) when they meet. Always inspect the item before paying.' },
  { q: 'How do I report a suspicious listing?', a: 'Open the product page and click “Report this listing”. Our team reviews reports within 24 hours.' },
  { q: 'Can I edit or remove my listing?', a: 'Yes — go to Dashboard → My Listings to manage your products.' },
];

const legal = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['Information we collect', 'Your name, college email, college name and student ID for verification, plus the listings and messages you create.'],
      ['How we use it', 'To verify that users are students, show your listings, enable buyer–seller messaging and personalise recommendations.'],
      ['AI features', 'Questions you send to the AI assistant are processed by our server and Google Gemini to generate replies. We never share your password or contact details with AI providers.'],
      ['Your choices', 'You can edit your profile, delete listings or request account deletion at any time from your dashboard or by contacting support.'],
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    sections: [
      ['Eligibility', 'You must be a currently enrolled student and register with accurate information.'],
      ['Listings', 'Only list items you own. Prohibited items include weapons, alcohol, drugs, counterfeit goods and exam materials.'],
      ['Transactions', 'Campus Connect connects students; the sale itself is between buyer and seller. Meet in safe public spaces on campus.'],
      ['Conduct', 'Harassment, spam and fraud lead to immediate suspension.'],
    ],
  },
};

export default function InfoPage({ type }) {
  if (type === 'help') return <Help />;
  if (type === 'contact') return <Contact />;
  const page = legal[type];
  return (
    <>
      <PageHeader title={page.title} subtitle="Last updated: November 2026" crumbs={[{ label: page.title }]} />
      <div className="container py-5" style={{ maxWidth: 820 }}>
        <div className="cc-card cc-card-pad">
          {page.sections.map(([h, t]) => (
            <section key={h} className="mb-4">
              <h2 className="h5">{h}</h2>
              <p className="text-muted-cc mb-0">{t}</p>
            </section>
          ))}
          <p className="small text-muted-cc mb-0">Questions? <Link to="/contact">Contact us</Link>.</p>
        </div>
      </div>
    </>
  );
}

function Help() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <PageHeader title="Help & Support" subtitle="Answers to common questions." crumbs={[{ label: 'Help & Support' }]} />
      <div className="container py-5" style={{ maxWidth: 820 }}>
        <div className="d-flex flex-column gap-2">
          {faqs.map((f, i) => (
            <div key={f.q} className="cc-card">
              <button type="button" className="btn w-100 text-start d-flex justify-content-between align-items-center p-3" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span className="fw-semibold">{f.q}</span>
                <i className={`bi ${open === i ? 'bi-dash' : 'bi-plus'} fs-5 text-primary-cc`} />
              </button>
              {open === i && <p className="px-3 pb-3 mb-0 text-muted-cc">{f.a}</p>}
            </div>
          ))}
        </div>
        <p className="text-center mt-4 text-muted-cc">Still need help? <Link to="/contact">Contact our support team</Link> or ask the AI assistant.</p>
      </div>
    </>
  );
}

function Contact() {
  const toast = useToast();
  const [values, setValues] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!values.name.trim()) errs.name = 'Name is required.';
    if (!EMAIL_RE.test(values.email)) errs.email = 'Enter a valid email.';
    if (values.message.trim().length < 10) errs.message = 'Message must be at least 10 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    toast("Message sent! We'll reply within 24 hours.");
    setValues({ name: '', email: '', message: '' });
  };
  return (
    <>
      <PageHeader title="Contact Us" subtitle="We usually reply within 24 hours." crumbs={[{ label: 'Contact' }]} />
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-4">
            {[
              ['bi-envelope', 'Email', 'support@campusconnect.in'],
              ['bi-geo-alt', 'Office', 'Bengaluru, Karnataka'],
              ['bi-clock', 'Hours', 'Mon – Sat, 9 AM – 7 PM'],
            ].map(([icon, label, val]) => (
              <div key={label} className="cc-card cc-card-pad d-flex gap-3 align-items-center mb-3">
                <span className="avatar" style={{ borderRadius: 12 }}><i className={`bi ${icon}`} /></span>
                <div><small className="text-muted-cc d-block">{label}</small><strong>{val}</strong></div>
              </div>
            ))}
          </div>
          <div className="col-lg-8">
            <form className="cc-card cc-card-pad" onSubmit={submit} noValidate>
              <div className="row g-3">
                <div className="col-md-6"><FormField id="ct-name" label="Your name" value={values.name} onChange={set('name')} error={errors.name} /></div>
                <div className="col-md-6"><FormField id="ct-email" label="Email" type="email" value={values.email} onChange={set('email')} error={errors.email} /></div>
              </div>
              <FormField id="ct-msg" as="textarea" rows={5} label="Message" value={values.message} onChange={set('message')} error={errors.message} />
              <button type="submit" className="btn btn-primary">Send message</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
