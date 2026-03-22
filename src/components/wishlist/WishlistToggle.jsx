// WishlistToggle.jsx
import { useEffect } from "react";
import PropType from "prop-types";

const WishlistToggle = ({ children }) => {
  const onClickToggle = () => {
    document.body.classList.toggle("is-wishlist-open");
  };

  useEffect(() => {
    const handler = (e) => {
      const closest = e.target.closest(".wishlist");
      const toggle = e.target.closest(".wishlist-toggle");
      const closeToggle = e.target.closest(".wishlist-item-remove");

      if (!closest && !toggle && !closeToggle) {
        document.body.classList.remove("is-wishlist-open");
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return children({ onClickToggle });
};
export default WishlistToggle;
