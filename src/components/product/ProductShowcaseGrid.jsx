/* eslint-disable react/forbid-prop-types */
import { FeaturedProduct } from "@/components/product";
import PropType from "prop-types";
import React from "react";

const ProductShowcase = ({ products, skeletonCount, search, sortType }) => {
  let filteredProducts = [...products];

  // Filter theo tên
  if (search) {
    filteredProducts = filteredProducts.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Sort
  if (sortType === "abc") {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sortType === "price-low-high") {
    filteredProducts.sort((a, b) => a.price - b.price);
  }

  if (sortType === "price-high-low") {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  return (
    <div className="product-display-grid">
      {filteredProducts.length === 0
        ? new Array(skeletonCount)
            .fill({})
            .map((product, index) => (
              <FeaturedProduct
                key={`product-skeleton ${index}`}
                product={product}
              />
            ))
        : filteredProducts.map((product) => (
            <FeaturedProduct key={product.id} product={product} />
          ))}
    </div>
  );
};

ProductShowcase.defaultProps = {
  skeletonCount: 4,
  search: "",
  sortType: "",
};

ProductShowcase.propTypes = {
  products: PropType.array.isRequired,
  skeletonCount: PropType.number,
  search: PropType.string,
  sortType: PropType.string,
};

export default ProductShowcase;
