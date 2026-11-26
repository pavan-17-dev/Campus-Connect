// Category master data. `slug` is the value used in URLs (?category=books)
// and should match the Django `Category.slug` field once the API is live.
const categories = [
  { slug: 'books', name: 'Books', icon: 'bi-book', color: '#2563EB', description: 'Textbooks, reference guides & novels' },
  { slug: 'electronics', name: 'Electronics', icon: 'bi-laptop', color: '#7C3AED', description: 'Laptops, calculators, phones & gadgets' },
  { slug: 'stationery', name: 'Stationery', icon: 'bi-pencil', color: '#0891B2', description: 'Notebooks, drawing kits & art supplies' },
  { slug: 'clothing', name: 'Clothing', icon: 'bi-bag-heart', color: '#DB2777', description: 'Lab coats, hoodies & college merch' },
  { slug: 'accessories', name: 'College Accessories', icon: 'bi-backpack', color: '#EA580C', description: 'Backpacks, ID holders & watches' },
  { slug: 'sports', name: 'Sports Equipment', icon: 'bi-trophy', color: '#16A34A', description: 'Bats, rackets, footballs & cycles' },
  { slug: 'hostel', name: 'Hostel Essentials', icon: 'bi-house-heart', color: '#CA8A04', description: 'Lamps, kettles, mattresses & more' },
];

export const getCategory = (slug) => categories.find((c) => c.slug === slug);

export default categories;
