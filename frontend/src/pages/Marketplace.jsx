import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import FilterSidebar from '../components/FilterSidebar';
import ProductGrid from '../components/ProductGrid';
import categories, { getCategory } from '../data/categories';
import { getCategoryCounts, getProducts } from '../services/productService';
import { recordInterest } from '../utils/activity';
import { formatPrice } from '../utils/format';
import './Marketplace.css';

const defaultFilters = { search: '', categories: [], condition: [], minPrice: '', maxPrice: '', availability: 'all', sort: 'newest' };

// URL <-> filter state, so filtered views are shareable and back/forward works.
const fromParams = (sp) => ({
  ...defaultFilters,
  search: sp.get('search') || '',
  categories: sp.get('category') ? sp.get('category').split(',') : [],
  condition: sp.get('condition') ? sp.get('condition').split(',') : [],
  minPrice: sp.get('min') || '',
  maxPrice: sp.get('max') || '',
  availability: sp.get('availability') || 'all',
  sort: sp.get('sort') || 'newest',
});
const toParams = (f) => {
  const p = {};
  if (f.search) p.search = f.search;
  if (f.categories.length) p.category = f.categories.join(',');
  if (f.condition.length) p.condition = f.condition.join(',');
  if (f.minPrice !== '') p.min = f.minPrice;
  if (f.maxPrice !== '') p.max = f.maxPrice;
  if (f.availability !== 'all') p.availability = f.availability;
  if (f.sort !== 'newest') p.sort = f.sort;
  return p;
};

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => fromParams(searchParams), [searchParams]);
  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState({});

  useEffect(() => {
    getCategoryCounts().then(setCategoryCounts).catch(() => {});
  }, []);

  const updateFilters = useCallback(
    (partial) => setSearchParams(toParams({ ...filters, ...partial }), { replace: true }),
    [filters, setSearchParams]
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getProducts({ ...filters, page: 1 })
      .then((res) => {
        setResults(res.results);
        setCount(res.count);
        setHasMore(res.hasMore);
        setPage(1);
      })
      .catch(() => setError('Could not load products. Please check your connection.'))
      .finally(() => setLoading(false));
  }, [filters]);

  const loadMore = () => {
    setLoadingMore(true);
    getProducts({ ...filters, page: page + 1 })
      .then((res) => {
        setResults((prev) => [...prev, ...res.results.filter((p) => !prev.some((x) => x.id === p.id))]);
        setHasMore(res.hasMore);
        setPage((p) => p + 1);
      })
      .catch(() => setError('Could not load more products.'))
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    filters.categories.forEach(recordInterest);
  }, [filters.categories]);

  useEffect(() => {
    document.body.style.overflow = showFilters ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showFilters]);

  const chips = [
    ...filters.categories.map((c) => ({ key: `c-${c}`, label: getCategory(c)?.name || c, clear: () => updateFilters({ categories: filters.categories.filter((x) => x !== c) }) })),
    ...filters.condition.map((c) => ({ key: `k-${c}`, label: c, clear: () => updateFilters({ condition: filters.condition.filter((x) => x !== c) }) })),
    ...(filters.minPrice !== '' || filters.maxPrice !== ''
      ? [{ key: 'price', label: `${filters.minPrice !== '' ? formatPrice(filters.minPrice) : '₹0'} – ${filters.maxPrice !== '' ? formatPrice(filters.maxPrice) : 'Any'}`, clear: () => updateFilters({ minPrice: '', maxPrice: '' }) }]
      : []),
    ...(filters.availability !== 'all' ? [{ key: 'av', label: filters.availability === 'available' ? 'Available' : 'Sold', clear: () => updateFilters({ availability: 'all' }) }] : []),
    ...(filters.search ? [{ key: 'q', label: `“${filters.search}”`, clear: () => updateFilters({ search: '' }) }] : []),
  ];

  const singleCategory = filters.categories.length === 1 ? getCategory(filters.categories[0]) : null;
  const reset = () => setSearchParams({}, { replace: true });

  return (
    <>
      <PageHeader
        title={singleCategory ? singleCategory.name : 'Marketplace'}
        subtitle={singleCategory ? singleCategory.description : 'Discover great deals from students across campuses.'}
        crumbs={singleCategory ? [{ label: 'Marketplace', to: '/marketplace' }, { label: singleCategory.name }] : [{ label: 'Marketplace' }]}
      />

      <div className="container py-4">
        <div className="cc-market-top">
          <div className="flex-grow-1">
            <SearchBar initialValue={filters.search} onSearch={(search) => updateFilters({ search })} placeholder="Search products in the marketplace…" />
          </div>
          <button type="button" className="btn btn-outline-primary bg-white d-lg-none" onClick={() => setShowFilters(true)}>
            <i className="bi bi-funnel me-1" />Filters{chips.length ? ` (${chips.length})` : ''}
          </button>
        </div>

        <div className="cc-cat-pills" role="group" aria-label="Quick category filter">
          <button type="button" className={`cc-chip ${!filters.categories.length ? 'is-active' : ''}`} onClick={() => updateFilters({ categories: [] })}>All</button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`cc-chip ${filters.categories.includes(c.slug) ? 'is-active' : ''}`}
              onClick={() => updateFilters({ categories: filters.categories.length === 1 && filters.categories[0] === c.slug ? [] : [c.slug] })}
            >
              <i className={`bi ${c.icon} me-1`} />{c.name}
            </button>
          ))}
        </div>

        <div className="row g-4">
          <div className="col-lg-3">
            <div className={`cc-filter-drawer ${showFilters ? 'is-open' : ''}`}>
              <div className="cc-filter-drawer-head d-lg-none">
                <strong>Filters</strong>
                <button type="button" className="cc-icon-btn" onClick={() => setShowFilters(false)} aria-label="Close filters"><i className="bi bi-x-lg" /></button>
              </div>
              <FilterSidebar filters={filters} onChange={updateFilters} onReset={reset} counts={categoryCounts} />
              <div className="cc-filter-drawer-foot d-lg-none">
                <button type="button" className="btn btn-primary w-100" onClick={() => setShowFilters(false)}>
                  Show {count} result{count === 1 ? '' : 's'}
                </button>
              </div>
            </div>
            {showFilters && <div className="cc-backdrop d-lg-none" onClick={() => setShowFilters(false)} aria-hidden="true" />}
          </div>

          <div className="col-lg-9">
            <div className="cc-results-bar">
              <span className="text-muted-cc">
                {loading ? 'Searching…' : <><strong className="text-dark">{count}</strong> product{count === 1 ? '' : 's'} found</>}
              </span>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="sort" className="small text-muted-cc text-nowrap">Sort by</label>
                <select id="sort" className="form-select form-select-sm" value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value })}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="cc-active-chips">
                {chips.map((c) => (
                  <button key={c.key} type="button" className="cc-active-chip" onClick={c.clear}>
                    {c.label}<i className="bi bi-x" />
                  </button>
                ))}
                <button type="button" className="btn btn-link btn-sm" onClick={reset}>Clear all</button>
              </div>
            )}

            <ProductGrid
              products={results}
              loading={loading}
              error={error}
              onRetry={load}
              columns={3}
              skeletonCount={6}
              emptyTitle="No products match your filters"
              emptyMessage="Try removing some filters or searching for something else."
              emptyAction={<button type="button" className="btn btn-primary" onClick={reset}>Clear filters</button>}
            />

            {!loading && !error && hasMore && (
              <div className="text-center mt-4">
                <button type="button" className="btn btn-outline-primary bg-white px-4" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <><span className="spinner-border spinner-border-sm me-2" />Loading…</> : <>Load more <span className="text-muted-cc ms-1">({count - results.length} more)</span></>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
