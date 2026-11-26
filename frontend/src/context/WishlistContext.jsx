import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useToast } from './ToastContext';

const WishlistContext = createContext(null);
const KEY = 'cc_wishlist';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

/**
 * Stores full product snapshots so the wishlist page renders instantly.
 * With the API enabled this would sync with `/api/wishlist/`.
 */
export function WishlistProvider({ children }) {
  const [items, setItems] = useState(read);
  const toast = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

  const isWishlisted = useCallback((id) => items.some((p) => p.id === id), [items]);

  const toggle = useCallback(
    (product) => {
      setItems((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        toast(exists ? 'Removed from wishlist' : 'Added to wishlist', exists ? 'info' : 'success');
        return exists ? prev.filter((p) => p.id !== product.id) : [product, ...prev];
      });
    },
    [toast]
  );

  const remove = useCallback((id) => setItems((prev) => prev.filter((p) => p.id !== id)), []);

  const value = useMemo(() => ({ items, count: items.length, isWishlisted, toggle, remove }), [items, isWishlisted, toggle, remove]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
