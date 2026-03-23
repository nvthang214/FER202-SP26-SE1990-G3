import { MessageDisplay } from "@/components/common";
import { ProductShowcaseGrid } from "@/components/product";
import { useDocumentTitle, useFeaturedProducts, useScrollTop } from "@/hooks";
import bannerImg from "@/images/banner-guy.png";
import React, { useState } from "react";

const FeaturedProducts = () => {
  useDocumentTitle("Featured Products | Salinaka");
  useScrollTop();

  const { featuredProducts, fetchFeaturedProducts, isLoading, error } =
    useFeaturedProducts();

  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState("");

  return (
    <main className="content">
      <div className="featured">
        <div className="banner">
          <div className="banner-desc">
            <h1>Featured Products</h1>
          </div>
          <div className="banner-img">
            <img src={bannerImg} alt="" />
          </div>
        </div>

        <div style={{ margin: "20px 0", display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select onChange={(e) => setSortType(e.target.value)}>
            <option value="">Default</option>
            <option value="abc">Name A-Z</option>
            <option value="price-low-high">Price Low → High</option>
            <option value="price-high-low">Price High → Low</option>
          </select>
        </div>

        <div className="display">
          <div className="product-display-grid">
            {error && !isLoading ? (
              <MessageDisplay
                message={error}
                action={fetchFeaturedProducts}
                buttonLabel="Try Again"
              />
            ) : (
              <ProductShowcaseGrid
                products={featuredProducts}
                skeletonCount={6}
                search={search}
                sortType={sortType}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default FeaturedProducts;
