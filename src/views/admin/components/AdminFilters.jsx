/* eslint-disable no-nested-ternary */
import { useDidMount } from "@/hooks";
import PropType from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { applyFilter, resetFilter } from "@/redux/actions/filterActions";
import { selectMax, selectMin } from "@/selectors/selector";
import PriceRange from "@/components/common/PriceRange";

const toDateInput = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const AdminFilters = ({ closeModal }) => {
  const { filter, isLoading, products } = useSelector((state) => ({
    filter: state.filter,
    isLoading: state.app.loading,
    products: state.products.items,
  }));
  const [field, setFilter] = useState({
    brand: filter.brand,
    minPrice: filter.minPrice,
    maxPrice: filter.maxPrice,
    sortBy: filter.sortBy,
    size: filter.size,
    color: filter.color,
    featured: filter.featured,
    recommended: filter.recommended,
    stockMin: filter.stockMin,
    stockMax: filter.stockMax,
    dateStart: filter.dateStart,
    dateEnd: filter.dateEnd,
  });
  const dispatch = useDispatch();
  const didMount = useDidMount();

  const max = selectMax(products);
  const min = selectMin(products);

  const brands = useMemo(() => {
    const unique = new Set();
    products.forEach((product) => {
      if (product.brand) unique.add(product.brand);
    });
    return Array.from(unique).sort();
  }, [products]);

  const sizes = useMemo(() => {
    const unique = new Set();
    products.forEach((product) => {
      if (Array.isArray(product.sizes)) {
        product.sizes.forEach((size) => unique.add(size));
      }
    });
    return Array.from(unique).sort((a, b) => a - b);
  }, [products]);

  const colors = useMemo(() => {
    const unique = new Set();
    products.forEach((product) => {
      if (Array.isArray(product.availableColors)) {
        product.availableColors.forEach((color) => unique.add(color));
      }
    });
    return Array.from(unique).sort();
  }, [products]);

  const stockRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    let minVal = products[0].maxQuantity || 0;
    let maxVal = products[0].maxQuantity || 0;
    products.forEach((product) => {
      if (typeof product.maxQuantity === "number") {
        minVal = Math.min(minVal, product.maxQuantity);
        maxVal = Math.max(maxVal, product.maxQuantity);
      }
    });
    return { min: minVal, max: maxVal };
  }, [products]);

  const dateRange = useMemo(() => {
    if (!products.length) return { min: "", max: "" };
    let minDate = products[0].dateAdded || 0;
    let maxDate = products[0].dateAdded || 0;
    products.forEach((product) => {
      if (typeof product.dateAdded === "number") {
        minDate = Math.min(minDate, product.dateAdded);
        maxDate = Math.max(maxDate, product.dateAdded);
      }
    });
    return { min: toDateInput(minDate), max: toDateInput(maxDate) };
  }, [products]);

  useEffect(() => {
    if (didMount && closeModal) closeModal();

    setFilter(filter);
    window.scrollTo(0, 0);
  }, [filter]);

  const onPriceChange = (minVal, maxVal) => {
    setFilter({ ...field, minPrice: minVal, maxPrice: maxVal });
  };

  const onBrandFilterChange = (e) => {
    setFilter({ ...field, brand: e.target.value });
  };

  const onSortFilterChange = (e) => {
    setFilter({ ...field, sortBy: e.target.value });
  };

  const onSizeFilterChange = (e) => {
    const val = e.target.value;
    setFilter({ ...field, size: val === "" ? "" : Number(val) });
  };

  const onColorFilterChange = (e) => {
    setFilter({ ...field, color: e.target.value });
  };

  const onFeaturedFilterChange = (e) => {
    const val = e.target.value;
    setFilter({ ...field, featured: val === "" ? "" : val === "true" });
  };

  const onRecommendedFilterChange = (e) => {
    const val = e.target.value;
    setFilter({ ...field, recommended: val === "" ? "" : val === "true" });
  };

  const onStockMinChange = (e) => {
    const val = e.target.value;
    setFilter({ ...field, stockMin: val === "" ? "" : Number(val) });
  };

  const onStockMaxChange = (e) => {
    const val = e.target.value;
    setFilter({ ...field, stockMax: val === "" ? "" : Number(val) });
  };

  const onDateStartChange = (e) => {
    setFilter({ ...field, dateStart: e.target.value });
  };

  const onDateEndChange = (e) => {
    setFilter({ ...field, dateEnd: e.target.value });
  };

  const onApplyFilter = () => {
    const isChanged = Object.keys(field).some(
      (key) => field[key] !== filter[key],
    );

    if (field.minPrice > field.maxPrice) {
      return;
    }

    if (
      field.stockMin !== "" &&
      field.stockMax !== "" &&
      field.stockMin > field.stockMax
    ) {
      return;
    }

    if (field.dateStart && field.dateEnd && field.dateStart > field.dateEnd) {
      return;
    }

    if (isChanged) {
      dispatch(applyFilter(field));
    } else if (closeModal) {
      closeModal();
    }
  };

  const onResetFilter = () => {
    const filterFields = [
      "brand",
      "minPrice",
      "maxPrice",
      "sortBy",
      "size",
      "color",
      "featured",
      "recommended",
      "stockMin",
      "stockMax",
      "dateStart",
      "dateEnd",
    ];

    if (filterFields.some((key) => !!filter[key] || filter[key] === 0)) {
      dispatch(resetFilter());
    } else if (closeModal) {
      closeModal();
    }
  };

  return (
    <div className="filters">
      <div className="filters-field">
        <span>Brand</span>
        <br />
        <br />
        {products.length === 0 && isLoading ? (
          <h5 className="text-subtle">Loading Filter</h5>
        ) : (
          <select
            className="filters-brand"
            value={field.brand}
            disabled={isLoading || products.length === 0}
            onChange={onBrandFilterChange}
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="filters-field">
        <span>Sort By</span>
        <br />
        <br />
        <select
          className="filters-brand"
          value={field.sortBy}
          disabled={isLoading || products.length === 0}
          onChange={onSortFilterChange}
        >
          <option value="">None</option>
          <option value="name-asc">Name Ascending A - Z</option>
          <option value="name-desc">Name Descending Z - A</option>
          <option value="price-desc">Price High - Low</option>
          <option value="price-asc">Price Low - High</option>
        </select>
      </div>
      <div className="filters-field">
        <span>Size</span>
        <br />
        <br />
        <select
          className="filters-brand"
          value={field.size}
          disabled={isLoading || products.length === 0}
          onChange={onSizeFilterChange}
        >
          <option value="">All Sizes</option>
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <div className="filters-field">
        <span>Color</span>
        <br />
        <br />
        <select
          className="filters-brand"
          value={field.color}
          disabled={isLoading || products.length === 0}
          onChange={onColorFilterChange}
        >
          <option value="">All Colors</option>
          {colors.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>
      <div className="filters-field">
        <span>Featured</span>
        <br />
        <br />
        <select
          className="filters-brand"
          value={field.featured === "" ? "" : String(field.featured)}
          disabled={isLoading || products.length === 0}
          onChange={onFeaturedFilterChange}
        >
          <option value="">All</option>
          <option value="true">Featured Only</option>
          <option value="false">Not Featured</option>
        </select>
      </div>
      <div className="filters-field">
        <span>Recommended</span>
        <br />
        <br />
        <select
          className="filters-brand"
          value={field.recommended === "" ? "" : String(field.recommended)}
          disabled={isLoading || products.length === 0}
          onChange={onRecommendedFilterChange}
        >
          <option value="">All</option>
          <option value="true">Recommended Only</option>
          <option value="false">Not Recommended</option>
        </select>
      </div>
      <div className="filters-field">
        <span>Stock Range</span>
        <br />
        <br />
        {products.length === 0 && isLoading ? (
          <h5 className="text-subtle">Loading Filter</h5>
        ) : (
          <>
            <input
              className="filters-brand"
              min={stockRange.min}
              max={stockRange.max}
              onChange={onStockMinChange}
              placeholder="Min stock"
              type="number"
              value={field.stockMin}
            />
            <br />
            <br />
            <input
              className="filters-brand"
              min={stockRange.min}
              max={stockRange.max}
              onChange={onStockMaxChange}
              placeholder="Max stock"
              type="number"
              value={field.stockMax}
            />
          </>
        )}
      </div>
      <div className="filters-field">
        <span>Date Added</span>
        <br />
        <br />
        {products.length === 0 && isLoading ? (
          <h5 className="text-subtle">Loading Filter</h5>
        ) : (
          <>
            <input
              className="filters-brand"
              min={dateRange.min}
              max={dateRange.max}
              onChange={onDateStartChange}
              type="date"
              value={field.dateStart}
            />
            <br />
            <br />
            <input
              className="filters-brand"
              min={dateRange.min}
              max={dateRange.max}
              onChange={onDateEndChange}
              type="date"
              value={field.dateEnd}
            />
          </>
        )}
      </div>
      <div className="filters-field">
        <span>Price Range</span>
        <br />
        <br />
        {(products.length === 0 && isLoading) || max === 0 ? (
          <h5 className="text-subtle">Loading Filter</h5>
        ) : products.length === 1 ? (
          <h5 className="text-subtle">No Price Range</h5>
        ) : (
          <PriceRange
            min={min}
            max={max}
            initMin={field.minPrice}
            initMax={field.maxPrice}
            isLoading={isLoading}
            onPriceChange={onPriceChange}
            productsCount={products.length}
          />
        )}
      </div>
      <div className="filters-action">
        <button
          className="filters-button button button-small"
          disabled={isLoading || products.length === 0}
          onClick={onApplyFilter}
          type="button"
        >
          Apply filters
        </button>
        <button
          className="filters-button button button-border button-small"
          disabled={isLoading || products.length === 0}
          onClick={onResetFilter}
          type="button"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
};

AdminFilters.propTypes = {
  closeModal: PropType.func.isRequired,
};

export default AdminFilters;
