import { displayActionMessage } from '@/helpers/utils';
import { useState, useEffect } from 'react';

const useWishlist = () => {
  const [wishlist, setWishlist] = useState([]);

  const loadWishlist = () => {
    const saved = localStorage.getItem('salinaka_wishlist');
    if (saved) {
      setWishlist(JSON.parse(saved));
    }
  };

  useEffect(() => {
    loadWishlist();
    window.addEventListener('wishlist_updated', loadWishlist);
    return () => window.removeEventListener('wishlist_updated', loadWishlist);
  }, []);

  const saveWishlist = (newWishlist) => {
    setWishlist(newWishlist);
    localStorage.setItem('salinaka_wishlist', JSON.stringify(newWishlist));
    window.dispatchEvent(new Event('wishlist_updated'));
  };

  const isItemOnWishlist = (id) => !!wishlist.find((item) => item.id === id);

  const toggleWishlist = (product) => {
    if (isItemOnWishlist(product.id)) {
      saveWishlist(wishlist.filter(item => item.id !== product.id));
      displayActionMessage('Item removed from wishlist', 'info');
    } else {
      saveWishlist([...wishlist, product]);
      displayActionMessage('Item added to wishlist', 'success');
    }
  };

  const removeWishlist = (id) => {
    saveWishlist(wishlist.filter(item => item.id !== id));
  };

  return { wishlist, isItemOnWishlist, toggleWishlist, removeWishlist };
};

export default useWishlist;
