import { WishlistItem, WishlistToggle } from '@/components/wishlist';
import { Boundary } from '@/components/common';
import { useWishlist } from '@/hooks';
import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { ACCOUNT } from '@/constants/routes';

const Wishlist = () => {
  const { wishlist, setWishlist } = useWishlist();
  const history = useHistory();
  const { pathname } = useLocation();

  const onClearWishlist = () => {
    if (wishlist.length !== 0) {
      setWishlist([]);
      localStorage.setItem('salinaka_wishlist', JSON.stringify([]));
      window.dispatchEvent(new Event('wishlist_updated'));
    }
  };

  const onViewList = () => {
    document.body.classList.remove('is-wishlist-open');
    history.push(ACCOUNT);
  };

  return (
    <Boundary>
      <div className="basket wishlist">
        <div className="basket-list">
          <div className="basket-header">
            <h3 className="basket-header-title">
              My Wishlist &nbsp;
              <span>
                ({` ${wishlist.length} ${wishlist.length > 1 ? 'items' : 'item'}`})
              </span>
            </h3>
            <WishlistToggle>
              {({ onClickToggle }) => (
                <span
                  className="basket-toggle wishlist-toggle button button-border button-border-gray button-small"
                  onClick={onClickToggle}
                  role="presentation"
                >
                  Close
                </span>
              )}
            </WishlistToggle>
            <button
              className="basket-clear button button-border button-border-gray button-small"
              disabled={wishlist.length === 0}
              onClick={onClearWishlist}
              type="button"
            >
              <span>Clear</span>
            </button>
          </div>
          {wishlist.length <= 0 && (
            <div className="basket-empty">
              <h5 className="basket-empty-msg">Your wishlist is empty</h5>
            </div>
          )}
          {wishlist.map((product, i) => (
            <WishlistItem key={`${product.id}_${i}`} product={product} />
          ))}
        </div>
        <div className="basket-checkout">
          <button
            className="basket-checkout-button button"
            disabled={wishlist.length === 0}
            onClick={onViewList}
            type="button"
          >
            View Full Wishlist
          </button>
        </div>
      </div>
    </Boundary>
  );
};

export default Wishlist;
