// BasketToggle.jsx
import { useEffect } from "react";
import PropType from "prop-types";

const BasketToggle = ({ children }) => {
  const onClickToggle = () => {
    document.body.classList.toggle("is-basket-open");
  };

  useEffect(() => {
    const handler = (e) => {
      const closest = e.target.closest(".basket");
      const toggle = e.target.closest(".basket-toggle");
      const closeToggle = e.target.closest(".basket-item-remove");

      if (!closest && !toggle && !closeToggle) {
        document.body.classList.remove("is-basket-open");
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler); // ✅ cleanup
  }, []);

  return children({ onClickToggle });
};

export default BasketToggle;