import { useDidMount } from "@/hooks";
import { useEffect, useState } from "react";
import firebase from "@/services/firebase";

const useRecommendedProducts = (itemsCount) => {
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const didMount = useDidMount(true);

  const fetchRecommendedProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const items = await firebase.getRecommendedProducts(itemsCount);

      if (items.length === 0) {
        if (didMount) {
          setError("No recommended products found.");
          setLoading(false);
        }
      } else {
        if (didMount) {
          setRecommendedProducts(items);
          setLoading(false);
        }
      }
    } catch (e) {
      if (didMount) {
        setError("Failed to fetch recommended products");
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (recommendedProducts.length === 0 && didMount) {
      fetchRecommendedProducts();
    }
  }, []);

  return {
    recommendedProducts,
    fetchRecommendedProducts,
    isLoading,
    error,
  };
};

export default useRecommendedProducts;
