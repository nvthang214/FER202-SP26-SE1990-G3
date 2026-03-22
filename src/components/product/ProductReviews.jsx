import firebase from '@/services/firebase';
import { displayActionMessage, displayDate } from '@/helpers/utils';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

const MAX_RATING = 5;

const StarRating = ({ value, size = 'md' }) => (
  <div className={`star-rating star-rating--${size} star-rating--readonly`}>
    {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((star) => (
      <button
        key={star}
        type="button"
        className={`star-btn${value >= star ? ' star-btn--active' : ''}`}
        disabled
        aria-label={`${star} star`}
      >
        ★
      </button>
    ))}
  </div>
);

const ReviewAvatar = ({ name }) => {
  const letter = (name || '?')[0].toUpperCase();
  const colors = ['#6c63ff', '#e05c97', '#27ae60', '#e67e22', '#2980b9', '#8e44ad'];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div className="review-avatar" style={{ background: color }}>
      {letter}
    </div>
  );
};

const ProductReviews = ({ productId }) => {
  const auth = useSelector((state) => state.auth);
  const profile = useSelector((state) => state.profile);

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await firebase.getProductReviews(productId);
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const ratingCounts = Array.from({ length: MAX_RATING }, (_, i) => {
    const star = MAX_RATING - i;
    return {
      star,
      count: reviews.filter((r) => r.rating === star).length,
    };
  });

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      setIsDeleting(reviewId);
      const next = await firebase.deleteReview(productId, reviewId);
      setReviews(next);
      displayActionMessage('Review deleted.', 'success');
    } catch {
      displayActionMessage('Failed to delete review.', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <section className="product-reviews">
      <h2 className="product-reviews-title">Customer Reviews</h2>

      {/* Summary */}
      <div className="reviews-summary">
        <div className="reviews-summary-score">
          <span className="reviews-summary-avg">
            {reviews.length > 0 ? avgRating.toFixed(1) : '—'}
          </span>
          <StarRating value={Math.round(avgRating)} size="lg" />
          <span className="reviews-summary-count">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        <div className="reviews-summary-bars">
          {ratingCounts.map(({ star, count }) => {
            const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
            return (
              <div className="reviews-bar-row" key={star}>
                <span className="reviews-bar-label">{star} ★</span>
                <div className="reviews-bar-track">
                  <div className="reviews-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="reviews-bar-pct">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="reviews-divider" />

      {/* List */}
      <div className="reviews-list">
        {isLoading ? (
          <p className="reviews-empty">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="reviews-empty">No reviews yet.</p>
        ) : (
          reviews.map((review) => {
            const isOwner = auth?.id && review.userId === auth.id;
            const isAdmin = profile?.role === 'ADMIN';
            const canDelete = isOwner || isAdmin;

            return (
              <article className="review-item" key={review.id}>
                <div className="review-item-header">
                  <ReviewAvatar name={review.userName} />
                  <div className="review-item-meta">
                    <strong className="review-item-name">{review.userName}</strong>
                    <span className="review-item-date">
                      {review.createdAt ? displayDate(review.createdAt) : ''}
                    </span>
                  </div>
                  <StarRating value={review.rating} size="sm" />
                </div>
                <p className="review-item-comment">{review.comment}</p>
                {canDelete && (
                  <button
                    className="review-delete-btn"
                    type="button"
                    disabled={isDeleting === review.id}
                    onClick={() => handleDelete(review.id)}
                  >
                    {isDeleting === review.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export default ProductReviews;
