import { FilterOutlined, PlusOutlined } from "@ant-design/icons";
import { ADD_PRODUCT } from "@/constants/routes";
import PropType from "prop-types";
import React from "react";
import { useHistory } from "react-router-dom";
import AdminSearchBar from "./AdminSearchBar";
import AdminFiltersToggle from "./AdminFiltersToggle";

const ProductsNavbar = (props) => {
  const { productsCount, totalProductsCount } = props;
  const history = useHistory();

  return (
    <div className="product-admin-header">
      <h3 className="product-admin-header-title">
        Products &nbsp; ({`${productsCount} / ${totalProductsCount}`})
      </h3>
      <AdminSearchBar />
      &nbsp;
      <AdminFiltersToggle>
        <button className="button-muted button-small" type="button">
          <FilterOutlined />
          &nbsp;More Filters
        </button>
      </AdminFiltersToggle>
      <button
        className="button button-small"
        onClick={() => history.push(ADD_PRODUCT)}
        type="button"
      >
        <PlusOutlined />
        &nbsp; Add New Product
      </button>
    </div>
  );
};

ProductsNavbar.propTypes = {
  productsCount: PropType.number.isRequired,
  totalProductsCount: PropType.number.isRequired,
};

export default ProductsNavbar;
