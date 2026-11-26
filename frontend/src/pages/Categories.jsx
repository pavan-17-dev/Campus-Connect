import PageHeader from '../components/PageHeader';
import CategoryCard from '../components/CategoryCard';
import categories from '../data/categories';
import products from '../data/products';

const counts = products.reduce((a, p) => ({ ...a, [p.category]: (a[p.category] || 0) + 1 }), {});

export default function Categories() {
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
