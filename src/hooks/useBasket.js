import { displayActionMessage } from '@/helpers/utils';
import { useDispatch, useSelector } from 'react-redux';
import { addToBasket as dispatchAddToBasket, removeFromBasket } from '@/redux/actions/basketActions';

const useBasket = () => {
  const { basket } = useSelector((state) => ({ basket: state.basket }));
  const dispatch = useDispatch();

  const isItemOnBasket = (id) => !!basket.find((item) => item.id === id || item.originalId === id);

  const addToBasket = (product) => {
    const variantId = `${product.id}-${product.selectedColor || ''}-${product.selectedSize || ''}`;
    const itemToAdd = {
        ...product,
        id: variantId,
        originalId: product.id
    };
    dispatch(dispatchAddToBasket(itemToAdd));
    displayActionMessage('Item added to basket', 'success');
    document.body.classList.add('is-basket-open');
  };

  return { basket, isItemOnBasket, addToBasket };
};

export default useBasket;
