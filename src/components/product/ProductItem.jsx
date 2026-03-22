import { CheckOutlined } from "@ant-design/icons";
import { ImageLoader } from "@/components/common";
import { displayMoney } from "@/helpers/utils";
import PropType from "prop-types";
import React from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { useHistory } from "react-router-dom";

const ProductItem = ({ product, isItemOnBasket, addToBasket }) => {
  const history = useHistory();
  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const fullStars = Math.round(avgRating);

  const onClickItem = () => {
    if (!product) return;

    if (product.id) {
      history.push(`/product/${product.id}`);
    }
  };

  const itemOnBasket = isItemOnBasket ? isItemOnBasket(product.id) : false;

  const handleAddToBasket = () => {
    if (addToBasket)
      addToBasket({ ...product, selectedSize: product.sizes[0] });
  };

  return (
    <SkeletonTheme color="#e1e1e1" highlightColor="#f2f2f2">
      <div className={`product-card ${!product.id ? "product-loading" : ""}`}>
        <div
          className="product-card-content"
          onClick={onClickItem}
          role="presentation"
        >
          <div className="product-card-img-wrapper">
            {product.image ? (
              <ImageLoader
                alt={product.name}
                className="product-card-img"
                src={product.image}
              />
            ) : (
              <Skeleton width="100%" height="90%" />
            )}
          </div>
          <div className="product-details">
            <h5 className="product-card-name text-overflow-ellipsis margin-auto">
              {product.name || <Skeleton width={80} />}
            </h5>
            <p className="product-card-brand">
              {product.brand || <Skeleton width={60} />}
            </p>
            <h4 className="product-card-price">
              {product.price ? (
                displayMoney(product.price)
              ) : (
                <Skeleton width={40} />
              )}
            </h4>
            {product.id && (
              <div className="product-card-rating">
                <span className="product-card-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      style={{
                        color: s <= fullStars ? "#f5a623" : "#e1e1e1",
                        fontSize: "1.1rem",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </span>
                <span className="product-card-rating-count">
                  {reviews.length > 0 ? `(${reviews.length})` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
        {product.id && (
          <button
            className="product-card-button button-small button button-block"
            onClick={handleAddToBasket}
            type="button"
          >
            Add to basket
          </button>
        )}
      </div>
    </SkeletonTheme>
  );
};

ProductItem.defaultProps = {
  isItemOnBasket: undefined,
  addToBasket: undefined,
};

ProductItem.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  product: PropType.object.isRequired,
  isItemOnBasket: PropType.func,
  addToBasket: PropType.func,
};

export default ProductItem;
