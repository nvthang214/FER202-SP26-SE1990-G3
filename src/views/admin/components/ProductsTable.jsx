/* eslint-disable react/forbid-prop-types */
import PropType from "prop-types";
import React from "react";
import { ProductItem } from ".";

const ProductsTable = ({
  filteredProducts,
  currentPage,
  pageSize,
  onPageChange,
}) => {
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedProducts = filteredProducts.slice(
    startIndex,
    startIndex + pageSize,
  );

  const buildPageRange = () => {
    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let startPage = Math.max(1, safePage - half);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i,
    );
  };

  const pageRange = totalPages > 1 ? buildPageRange() : [];

  return (
    <div>
      {filteredProducts.length > 0 && (
        <div className="grid grid-product grid-count-6">
          <div className="grid-col" />
          <div className="grid-col">
            <h5>Name</h5>
          </div>
          <div className="grid-col">
            <h5>Brand</h5>
          </div>
          <div className="grid-col">
            <h5>Price</h5>
          </div>
          <div className="grid-col">
            <h5>Date Added</h5>
          </div>
          <div className="grid-col">
            <h5>Qty</h5>
          </div>
        </div>
      )}
      {filteredProducts.length === 0
        ? new Array(10).fill({}).map((product, index) => (
            <ProductItem
              // eslint-disable-next-line react/no-array-index-key
              key={`product-skeleton ${index}`}
              product={product}
            />
          ))
        : pagedProducts.map((product) => (
            <ProductItem key={product.id} product={product} />
          ))}
      {filteredProducts.length > 0 && totalPages > 1 && (
        <div className="admin-pagination">
          <button
            className="button button-small button-border admin-pagination-button"
            disabled={safePage === 1}
            onClick={() => onPageChange(safePage - 1)}
            type="button"
          >
            Prev
          </button>
          {pageRange.map((page) => (
            <button
              className={`button button-small admin-pagination-button ${page === safePage ? "admin-pagination-button--active" : "button-border"}`}
              key={`page-${page}`}
              onClick={() => onPageChange(page)}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            className="button button-small button-border admin-pagination-button"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(safePage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

ProductsTable.propTypes = {
  filteredProducts: PropType.array.isRequired,
  currentPage: PropType.number.isRequired,
  pageSize: PropType.number.isRequired,
  onPageChange: PropType.func.isRequired,
};

export default ProductsTable;
