import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import HowItWorks from '../components/HowItWorks';

const values = [
  { icon: 'bi-shield-check', title: 'Trusted community', text: 'Only verified students can buy and sell, so you always know who you are dealing with.' },
  { icon: 'bi-recycle', title: 'Sustainable campus', text: 'Every reused textbook or gadget keeps waste out of landfills and money in students’ pockets.' },
  { icon: 'bi-stars', title: 'Smart discovery', text: 'Our AI assistant and recommendations help you find exactly what your course needs.' },
  { icon: 'bi-geo-alt', title: 'Hyper-local', text: 'Buy from people on your own campus and meet in minutes — no shipping, no waiting.' },
];

export default function About() {
  return (
    <>
      <PageHeader title="About Campus Connect" subtitle="A marketplace built by students, for students." crumbs={[{ label: 'About' }]} />
      <section className="section">
        <div className="container">
          <div className="row g-5 align-items-center">
            <div className="col-lg-6">
              <span className="section-eyebrow">Our mission</span>
              <h2 className="section-title">Making campus life more affordable</h2>
              <p className="text-muted-cc fs-5">
                Every semester, students spend thousands on books, calculators, lab coats and hostel gear — while seniors
                have the same items gathering dust. Campus Connect brings both sides together in a safe, simple marketplace.
              </p>
              <p className="text-muted-cc">
                We verify every account with a college email and student ID, so the person you&apos;re chatting with is a
                real student on your campus. Listings are free, and there are no commissions.
              </p>
              <Link to="/register" className="btn btn-primary btn-lg mt-2">Join your campus</Link>
            </div>
            <div className="col-lg-6">
              <div className="row g-3">
                {values.map((v) => (
                  <div key={v.title} className="col-sm-6">
                    <div className="cc-card cc-card-pad h-100">
                      <span className="avatar mb-3" style={{ borderRadius: 12 }}><i className={`bi ${v.icon}`} /></span>
                      <h3 className="h6">{v.title}</h3>
                      <p className="text-muted-cc small mb-0">{v.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <HowItWorks />
    </>
  );
}
