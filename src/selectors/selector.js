/* eslint-disable no-plusplus */
/* eslint-disable no-else-return */
export const selectFilter = (products, filter) => {
  if (!products || products.length === 0) return [];

  const toDateMs = (value, isEnd) => {
    if (!value) return null;
    const date = new Date(`${value}T${isEnd ? "23:59:59.999" : "00:00:00"}`);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
  };

  const keyword = (filter.keyword || "").trim().toLowerCase();
  const hasKeyword = keyword.length > 0;
  const startDateMs = toDateMs(filter.dateStart, false);
  const endDateMs = toDateMs(filter.dateEnd, true);
  const stockMin = filter.stockMin === "" ? null : Number(filter.stockMin);
  const stockMax = filter.stockMax === "" ? null : Number(filter.stockMax);

  return products
    .filter((product) => {
      const isInRange = filter.maxPrice
        ? product.price >= filter.minPrice && product.price <= filter.maxPrice
        : true;
      const matchKeyword = !hasKeyword
        ? true
        : (product.name && product.name.toLowerCase().includes(keyword)) ||
          (product.name_lower && product.name_lower.includes(keyword)) ||
          (product.brand && product.brand.toLowerCase().includes(keyword)) ||
          (product.description &&
            product.description.toLowerCase().includes(keyword)) ||
          (product.keywords &&
            product.keywords.some((item) =>
              item.toLowerCase().includes(keyword),
            ));
      const matchBrand = filter.brand
        ? product.brand &&
          product.brand.toLowerCase().includes(filter.brand.toLowerCase())
        : true;
      const matchSize = filter.size
        ? Array.isArray(product.sizes) && product.sizes.includes(filter.size)
        : true;
      const matchColor = filter.color
        ? Array.isArray(product.availableColors) &&
          product.availableColors.includes(filter.color)
        : true;
      const matchFeatured =
        filter.featured === "" ? true : product.isFeatured === filter.featured;
      const matchRecommended =
        filter.recommended === ""
          ? true
          : product.isRecommended === filter.recommended;
      const matchStock =
        stockMin === null && stockMax === null
          ? true
          : typeof product.maxQuantity === "number" &&
            (stockMin === null || product.maxQuantity >= stockMin) &&
            (stockMax === null || product.maxQuantity <= stockMax);
      const matchDate =
        startDateMs === null && endDateMs === null
          ? true
          : typeof product.dateAdded === "number" &&
            (startDateMs === null || product.dateAdded >= startDateMs) &&
            (endDateMs === null || product.dateAdded <= endDateMs);

      return (
        matchKeyword &&
        matchBrand &&
        matchSize &&
        matchColor &&
        matchFeatured &&
        matchRecommended &&
        matchStock &&
        matchDate &&
        isInRange
      );
    })
    .sort((a, b) => {
      if (filter.sortBy === "name-desc") {
        return a.name < b.name ? 1 : -1;
      } else if (filter.sortBy === "name-asc") {
        return a.name > b.name ? 1 : -1;
      } else if (filter.sortBy === "price-desc") {
        return a.price < b.price ? 1 : -1;
      }

      return a.price > b.price ? 1 : -1;
    });
};

// Select product with highest price
export const selectMax = (products) => {
  if (!products || products.length === 0) return 0;

  let high = products[0];

  for (let i = 0; i < products.length; i++) {
    if (products[i].price > high.price) {
      high = products[i];
    }
  }

  return Math.floor(high.price);
};

// Select product with lowest price
export const selectMin = (products) => {
  if (!products || products.length === 0) return 0;
  let low = products[0];

  for (let i = 0; i < products.length; i++) {
    if (products[i].price < low.price) {
      low = products[i];
    }
  }

  return Math.floor(low.price);
};
