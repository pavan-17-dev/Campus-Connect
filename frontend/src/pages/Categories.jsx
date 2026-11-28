import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import CategoryCard from '../components/CategoryCard';
import categories from '../data/categories';
import { getCategoryCounts } from '../services/productService';

export default function Categories() {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    getCategoryCounts().then(setCounts).catch(() => {});
  }, []);

  return (
    <>
      <PageHeader title="All Categories" subtitle="Browse products by what you need this semester." crumbs={[{ label: 'Categories' }]} />
      <div className="container py-5">
        <div className="row g-4">
          {categories.map((c) => (
            <div key={c.slug} className="col-sm-6 col-lg-4 col-xl-3">
              <CategoryCard category={c} count={counts[c.slug] || 0} variant="detailed" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
