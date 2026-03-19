/* eslint-disable react/jsx-props-no-spreading */
import { Boundary } from "@/components/common";
import { AppliedFilters, ProductList } from "@/components/product";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { withRouter } from "react-router-dom";
import { selectFilter } from "@/selectors/selector";
import { applyFilter } from "@/redux/actions/filterActions";
import { ProductsNavbar } from "../components";
import ProductsTable from "../components/ProductsTable";

const Products = () => {
  useDocumentTitle("Product List | Salinaka Admin");
  useScrollTop();

  const store = useSelector((state) => ({
    filteredProducts: selectFilter(state.products.items, state.filter),
    requestStatus: state.app.requestStatus,
    isLoading: state.app.loading,
    products: state.products,
    filter: state.filter,
  }));
  const dispatch = useDispatch();
  const initialFilter = useRef({ ...store.filter });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(
    () => () => {
      dispatch(applyFilter(initialFilter.current));
    },
    [dispatch],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [store.filter]);

  useEffect(() => {
    const totalPages = Math.ceil(store.filteredProducts.length / pageSize) || 1;
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, pageSize, store.filteredProducts.length]);

  return (
    <Boundary>
      <ProductsNavbar
        productsCount={store.products.items.length}
        totalProductsCount={store.products.total}
      />
      <div className="product-admin-items">
        <ProductList {...store} showMore={false}>
          <AppliedFilters filter={store.filter} />
          <ProductsTable
            filteredProducts={store.filteredProducts}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </ProductList>
      </div>
    </Boundary>
  );
};

export default withRouter(Products);
