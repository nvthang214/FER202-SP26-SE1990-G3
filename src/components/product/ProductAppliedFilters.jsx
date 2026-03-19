/* eslint-disable no-nested-ternary */
import { CloseCircleOutlined } from "@ant-design/icons";
import PropType from "prop-types";
import React from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { applyFilter } from "@/redux/actions/filterActions";

const ProductAppliedFilters = ({ filteredProductsCount }) => {
  const filter = useSelector((state) => state.filter, shallowEqual);
  const isFiltered =
    !!filter.keyword ||
    !!filter.brand ||
    !!filter.sortBy ||
    !!filter.minPrice ||
    !!filter.maxPrice ||
    !!filter.size ||
    !!filter.color ||
    filter.featured !== "" ||
    filter.recommended !== "" ||
    filter.stockMin !== "" ||
    filter.stockMax !== "" ||
    !!filter.dateStart ||
    !!filter.dateEnd;
  const dispatch = useDispatch();

  const onRemoveKeywordFilter = () => {
    dispatch(applyFilter({ keyword: "" }));
  };

  const onRemovePriceRangeFilter = () => {
    dispatch(applyFilter({ minPrice: 0, maxPrice: 0 }));
  };

  const onRemoveBrandFilter = () => {
    dispatch(applyFilter({ brand: "" }));
  };

  const onRemoveSortFilter = () => {
    dispatch(applyFilter({ sortBy: "" }));
  };

  const onRemoveSizeFilter = () => {
    dispatch(applyFilter({ size: "" }));
  };

  const onRemoveColorFilter = () => {
    dispatch(applyFilter({ color: "" }));
  };

  const onRemoveFeaturedFilter = () => {
    dispatch(applyFilter({ featured: "" }));
  };

  const onRemoveRecommendedFilter = () => {
    dispatch(applyFilter({ recommended: "" }));
  };

  const onRemoveStockFilter = () => {
    dispatch(applyFilter({ stockMin: "", stockMax: "" }));
  };

  const onRemoveDateFilter = () => {
    dispatch(applyFilter({ dateStart: "", dateEnd: "" }));
  };

  return !isFiltered ? null : (
    <>
      <div className="product-list-header">
        <div className="product-list-header-title">
          <h5>
            {filteredProductsCount > 0 &&
              `Found ${filteredProductsCount} ${filteredProductsCount > 1 ? "products" : "product"}`}
          </h5>
        </div>
      </div>
      <div className="product-applied-filters">
        {filter.keyword && (
          <div className="pill-wrapper">
            <span className="d-block">Keyword</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">{filter.keyword}</h5>
              <div
                className="pill-remove"
                onClick={onRemoveKeywordFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {filter.brand && (
          <div className="pill-wrapper">
            <span className="d-block">Brand</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">{filter.brand}</h5>
              <div
                className="pill-remove"
                onClick={onRemoveBrandFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {(!!filter.minPrice || !!filter.maxPrice) && (
          <div className="pill-wrapper">
            <span className="d-block">Price Range</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">
                ${filter.minPrice}- ${filter.maxPrice}
              </h5>
              <div
                className="pill-remove"
                onClick={onRemovePriceRangeFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {filter.sortBy && (
          <div className="pill-wrapper">
            <span className="d-block">Sort By</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">
                {filter.sortBy === "price-desc"
                  ? "Price High - Low"
                  : filter.sortBy === "price-asc"
                    ? "Price Low - High"
                    : filter.sortBy === "name-desc"
                      ? "Name Z - A"
                      : "Name A - Z"}
              </h5>
              <div
                className="pill-remove"
                onClick={onRemoveSortFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {filter.size && (
          <div className="pill-wrapper">
            <span className="d-block">Size</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">{filter.size}</h5>
              <div
                className="pill-remove"
                onClick={onRemoveSizeFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {filter.color && (
          <div className="pill-wrapper">
            <span className="d-block">Color</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">{filter.color}</h5>
              <div
                className="pill-remove"
                onClick={onRemoveColorFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {filter.featured !== "" && (
          <div className="pill-wrapper">
            <span className="d-block">Featured</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">
                {filter.featured ? "Featured Only" : "Not Featured"}
              </h5>
              <div
                className="pill-remove"
                onClick={onRemoveFeaturedFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {filter.recommended !== "" && (
          <div className="pill-wrapper">
            <span className="d-block">Recommended</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">
                {filter.recommended ? "Recommended Only" : "Not Recommended"}
              </h5>
              <div
                className="pill-remove"
                onClick={onRemoveRecommendedFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {(filter.stockMin !== "" || filter.stockMax !== "") && (
          <div className="pill-wrapper">
            <span className="d-block">Stock Range</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">
                {filter.stockMin !== "" ? filter.stockMin : "Any"}
                {" - "}
                {filter.stockMax !== "" ? filter.stockMax : "Any"}
              </h5>
              <div
                className="pill-remove"
                onClick={onRemoveStockFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
        {(filter.dateStart || filter.dateEnd) && (
          <div className="pill-wrapper">
            <span className="d-block">Date Added</span>
            <div className="pill padding-right-l">
              <h5 className="pill-content margin-0">
                {filter.dateStart || "Any"}
                {" - "}
                {filter.dateEnd || "Any"}
              </h5>
              <div
                className="pill-remove"
                onClick={onRemoveDateFilter}
                role="presentation"
              >
                <h5 className="margin-0 text-subtle">
                  <CloseCircleOutlined />
                </h5>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

ProductAppliedFilters.defaultProps = {
  filteredProductsCount: 0,
};

ProductAppliedFilters.propTypes = {
  filteredProductsCount: PropType.number,
};

export default ProductAppliedFilters;
