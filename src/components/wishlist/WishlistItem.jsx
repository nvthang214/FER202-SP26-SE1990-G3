import { CloseOutlined } from '@ant-design/icons';
import { ImageLoader } from '@/components/common';
import { displayMoney } from '@/helpers/utils';
import PropType from 'prop-types';
import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '@/hooks';

const WishlistItem = ({ product }) => {
  const { removeWishlist } = useWishlist();

  return (
    <div className="basket-item">
      <div className="basket-item-wrapper">
        <div className="basket-item-img-wrapper">
          <ImageLoader alt={product.name} className="basket-item-img" src={product.image} />
        </div>
        <div className="basket-item-details">
          <Link to={`/product/${product.id}`} onClick={() => document.body.classList.remove('is-wishlist-open')}>
            <h4 className="underline basket-item-name">{product.name}</h4>
          </Link>
          <div className="basket-item-specs">
            <div>
              <span className="spec-title">Brand</span>
              <h5 className="my-0">{product.brand || 'Apparel'}</h5>
            </div>
          </div>
        </div>
        <div className="basket-item-price">
          <h4 className="my-0">{displayMoney(product.price)}</h4>
        </div>
        <button
          className="basket-item-remove button button-border button-border-gray button-small"
          onClick={() => removeWishlist(product.id)}
          type="button"
        >
          <CloseOutlined />
        </button>
      </div>
    </div>
  );
};

WishlistItem.propTypes = {
  product: PropType.shape({
    id: PropType.string,
    name: PropType.string,
    brand: PropType.string,
    price: PropType.number,
    image: PropType.string
  }).isRequired
};

export default WishlistItem;
