import PropType from 'prop-types';

const WishlistToggle = ({ children }) => {
  const onClickToggle = () => {
    if (document.body.classList.contains('is-wishlist-open')) {
      document.body.classList.remove('is-wishlist-open');
    } else {
      document.body.classList.add('is-wishlist-open');
    }
  };

  document.addEventListener('click', (e) => {
    const closest = e.target.closest('.wishlist');
    const toggle = e.target.closest('.wishlist-toggle');
    const closeToggle = e.target.closest('.basket-item-remove');

    if (!closest && document.body.classList.contains('is-wishlist-open') && !toggle && !closeToggle) {
      document.body.classList.remove('is-wishlist-open');
    }
  });

  return children({ onClickToggle });
};

WishlistToggle.propTypes = {
  children: PropType.oneOfType([
    PropType.arrayOf(PropType.node),
    PropType.func,
    PropType.node
  ]).isRequired
};

export default WishlistToggle;
