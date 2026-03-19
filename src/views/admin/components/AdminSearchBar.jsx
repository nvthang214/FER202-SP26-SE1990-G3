import { SearchOutlined } from "@ant-design/icons";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { applyFilter } from "@/redux/actions/filterActions";

const AdminSearchBar = () => {
  const dispatch = useDispatch();
  const { keyword, isLoading } = useSelector((state) => ({
    keyword: state.filter.keyword,
    isLoading: state.app.loading,
  }));

  const onSearchChange = (e) => {
    const val = e.target.value.trimStart();
    dispatch(applyFilter({ keyword: val }));
  };

  return (
    <div className="searchbar">
      <SearchOutlined className="searchbar-icon" />
      <input
        className="search-input searchbar-input"
        onChange={onSearchChange}
        placeholder="Search product..."
        readOnly={isLoading}
        type="text"
        value={keyword}
      />
    </div>
  );
};

export default AdminSearchBar;
