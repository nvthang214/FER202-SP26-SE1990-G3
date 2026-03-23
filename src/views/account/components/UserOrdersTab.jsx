import { displayDate, displayActionMessage } from "@/helpers/utils";
import { Modal } from "@/components/common";
import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setProfile } from "@/redux/actions/profileActions";
import firebase from "@/services/firebase";

const formatCurrency = (value) =>
  `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;

const getOrderTotal = (order) => {
  if (typeof order.total === "number") return order.total;
  const itemsTotal = Array.isArray(order.items)
    ? order.items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      )
    : 0;
  return itemsTotal + Number(order.shippingFee || 0);
};

const STATUS_LABEL = {
  PLACED: "Placed",
  PROCESSING: "Processing",
  DELIVERED: "Delivered",
  RECEIVED: "Received",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const RETURN_REASONS = [
  "Item is damaged",
  "Wrong product received",
  "Did not match description",
  "Found cheaper elsewhere",
  "Changed mind",
  "Other",
];

const MAX_RATING = 5;

/* ── Inline star picker ─────────────────────────────── */
const StarPicker = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div
      className="star-rating star-rating--lg"
      onMouseLeave={() => setHovered(0)}
    >
      {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn${active >= star ? " star-btn--active" : ""}`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

/* ── Review form for a single product ──────────────── */
const ReviewForm = ({ productId, productName, userId, userName, onDone }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (rating === 0) { setError("Please select a star rating."); return; }
    if (!comment.trim()) { setError("Please write a comment."); return; }

    try {
      setSubmitting(true);
      // Check for duplicate before submitting
      let existing = [];
      try {
        existing = await firebase.getProductReviews(productId);
      } catch (err) {
        console.warn("Could not fetch existing reviews to check duplicates", err);
      }
      
      if (existing.some((r) => r.userId === userId)) {
        setError("You have already reviewed this product.");
        return;
      }
      const review = {
        id: firebase.generateKey(),
        userId,
        userName,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };
      await firebase.addReview(productId, review);
      displayActionMessage(`Review for "${productName}" submitted!`, "success");
      onDone(productId);
    } catch (err) {
      console.error(err);
      setError("Failed to submit review. Server error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form order-review-form" onSubmit={handleSubmit}>
      <p className="text-subtle" style={{ marginBottom: "0.5rem" }}>
        Reviewing: <strong>{productName}</strong>
      </p>
      <div className="review-form-row">
        <label className="review-form-label">Your Rating</label>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div className="review-form-row">
        <label className="review-form-label" htmlFor={`rc-${productId}`}>
          Your Comment
        </label>
        <textarea
          id={`rc-${productId}`}
          className="review-form-textarea"
          rows={3}
          maxLength={500}
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <span className="review-form-count">{comment.length}/500</span>
      </div>
      {error && <p className="review-form-error">{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="button button-small" type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
        <button
          className="button button-small button-border button-border-gray"
          type="button"
          onClick={() => onDone(null)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

/* ── Main component ─────────────────────────────────── */
const UserOrdersTab = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const profile = useSelector((state) => state.profile);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [returnOtherReason, setReturnOtherReason] = useState("");
  // productId => review object (if the user reviewed it) or null/false
  const [reviewedProducts, setReviewedProducts] = useState({});
  // productId currently showing the inline form or view
  const [activeReviewProductId, setActiveReviewProductId] = useState(null);

  const orders = useMemo(() => {
    const list = Array.isArray(profile.orders) ? [...profile.orders] : [];
    list.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
    return list;
  }, [profile.orders]);

  // Fetch reviews for items in RECEIVED orders
  useEffect(() => {
    if (!auth?.id || orders.length === 0) return;

    const receivedItems = orders
      .filter((o) => o.status === "RECEIVED")
      .flatMap((o) => Array.isArray(o.items) ? o.items : []);
    const uniqueIds = [...new Set(receivedItems.map((i) => i.id))];

    uniqueIds.forEach(async (pId) => {
      try {
        const productReviews = await firebase.getProductReviews(pId);
        const userReview = productReviews.find((r) => r.userId === auth?.id);
        if (userReview) {
          setReviewedProducts((prev) => ({ ...prev, [pId]: userReview }));
        }
      } catch {
        // ignore fetch errors
      }
    });
  }, [auth?.id, orders]);

  const summary = useMemo(
    () => ({
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + getOrderTotal(o), 0),
    }),
    [orders],
  );

  const handleConfirmReceived = async (orderId) => {
    if (!auth?.id) return;
    if (!window.confirm("Confirm that you have received this order?")) return;
    try {
      setConfirmingId(orderId);
      const nextOrders = await firebase.confirmOrderReceived(auth.id, orderId);
      dispatch(setProfile({ ...profile, orders: nextOrders }));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: "RECEIVED" }));
      }
      displayActionMessage("Order marked as received!", "success");
    } catch {
      displayActionMessage("Failed to confirm receipt.", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const openReturnReasonDialog = (orderId) => {
    if (!auth?.id) return;
    setReturnOrderId(orderId);
    setReturnReason(RETURN_REASONS[0]);
    setReturnOtherReason("");
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturnOrder = async () => {
    if (!auth?.id || !returnOrderId) return;

    let reason = returnReason;
    if (returnReason === "Other") {
      reason = returnOtherReason.trim() || "Other";
    }

    if (!reason) {
      displayActionMessage("Please select or type a reason for return.", "error");
      return;
    }

    try {
      setConfirmingId(returnOrderId);
      const nextOrders = await firebase.returnOrder(auth.id, returnOrderId, reason);
      dispatch(setProfile({ ...profile, orders: nextOrders }));
      if (selectedOrder?.id === returnOrderId) {
        setSelectedOrder((prev) => ({ ...prev, status: "RETURNED", returnReason: reason }));
      }
      setIsReturnModalOpen(false);
      displayActionMessage("Order has been returned.", "success");
    } catch {
      displayActionMessage("Failed to return order.", "error");
    } finally {
      setConfirmingId(null);
      setReturnOrderId(null);
    }
  };


  // Called when a review form finishes (submit or cancel)
  const handleReviewDone = (reviewedProductId) => {
    if (reviewedProductId) {
      // Just mark it as true for this session so the user knows it succeeded. 
      // A full refresh would load the actual review object.
      setReviewedProducts((prev) => ({ ...prev, [reviewedProductId]: { rating: 5, comment: "Thank you for your review!" } }));
    }
    setActiveReviewProductId(null);
  };

  if (orders.length === 0) {
    return (
      <div className="loader" style={{ minHeight: "80vh" }}>
        <h3>My Orders</h3>
        <strong>
          <span className="text-subtle">You don&apos;t have any orders yet.</span>
        </strong>
      </div>
    );
  }

  return (
    <div className="user-orders">
      <div className="user-orders-summary">
        <div>
          <span>Total Orders</span>
          <h4>{summary.totalOrders}</h4>
        </div>
        <div>
          <span>Total Spent</span>
          <h4>{formatCurrency(summary.totalSpent)}</h4>
        </div>
      </div>

      <div className="user-orders-list">
        {orders.map((order) => (
          <article className="user-order-item" key={order.id}>
            <div className="user-order-item-head">
              <h5>
                <button
                  className="button-link user-order-link"
                  onClick={() => setSelectedOrder(order)}
                  type="button"
                >
                  Order #{order.id}
                </button>
              </h5>
              <span
                className={`user-order-status user-order-status--${String(order.status || "PLACED").toLowerCase()}`}
              >
                {STATUS_LABEL[order.status] || order.status || "PLACED"}
              </span>
            </div>

            <p className="text-subtle">
              Placed on: {order.createdAt ? displayDate(order.createdAt) : "-"}
            </p>
            <p>
              <strong>Total: {formatCurrency(getOrderTotal(order))}</strong>
            </p>

            {/* Product list */}
            <ul className="user-order-products">
              {(Array.isArray(order.items) ? order.items : []).map((item) => {
                const alreadyReviewed = reviewedProducts[item.id];
                const isReviewing = activeReviewProductId === item.id;

                return (
                  <li className="user-order-product" key={`${order.id}-${item.id}`}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{item.name}</span>
                        <span style={{ color: "#888", marginLeft: "1rem" }}>x{item.quantity}</span>
                      </div>

                      {/* Review form or button — only for RECEIVED orders */}
                      {order.status === "RECEIVED" && (
                        <div style={{ marginTop: "0.5rem" }}>
                          {alreadyReviewed ? (
                            isReviewing ? (
                              <div className="order-review-form">
                                <p className="text-subtle" style={{ marginBottom: "0.5rem" }}>
                                  Your Review for <strong>{item.name}</strong>
                                </p>
                                <div className="review-form-row">
                                  <label className="review-form-label">Rating</label>
                                  <div className="star-rating" style={{ pointerEvents: "none" }}>
                                    {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
                                      <span key={star} style={{ color: alreadyReviewed.rating >= star ? "#e4a51f" : "#e1e1e1", fontSize: "1.2rem" }}>
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="review-form-row">
                                  <label className="review-form-label">Comment</label>
                                  <p style={{ background: "#f9f9f9", padding: "0.5rem", borderRadius: "6px", fontSize: "0.9rem" }}>
                                    {alreadyReviewed.comment}
                                  </p>
                                </div>
                                <button
                                  className="button button-border button-border-gray"
                                  type="button"
                                  onClick={() => setActiveReviewProductId(null)}
                                >
                                  Close
                                </button>
                              </div>
                            ) : (
                              <button
                                className="button button-border button-border-gray"
                                type="button"
                                style={{ marginTop: "0.25rem" }}
                                onClick={() => setActiveReviewProductId(item.id)}
                              >
                                👁 View Review
                              </button>
                            )
                          ) : isReviewing ? (
                            <ReviewForm
                              productId={item.id}
                              productName={item.name}
                              userId={auth?.id}
                              userName={profile.fullname || auth?.displayName || "Anonymous"}
                              onDone={handleReviewDone}
                            />
                          ) : (
                            <button
                              className="button button-border button-border-gray"
                              type="button"
                              style={{ marginTop: "0.25rem" }}
                              onClick={() => setActiveReviewProductId(item.id)}
                            >
                              ✎ Write a Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Confirm/return buttons */}
            {order.status !== "CANCELLED" && order.status !== "RETURNED" && (
              <button
                className="button button-border button-border-gray"
                type="button"
                disabled={confirmingId === order.id}
                onClick={() => openReturnReasonDialog(order.id)}
                style={{ marginTop: "0.75rem", marginRight: "0.5rem" }}
              >
                {confirmingId === order.id ? "Processing..." : "↩ Return Order"}
              </button>
            )}

            {order.status !== "RECEIVED" && order.status !== "RETURNED" && order.status !== "CANCELLED" && (
              <button
                className="button button-muted"
                type="button"
                disabled={confirmingId === order.id}
                onClick={() => handleConfirmReceived(order.id)}
                style={{ marginTop: "0.75rem" }}
              >
                {confirmingId === order.id ? "Confirming..." : "✓ Confirm Receipt"}
              </button>
            )}

            {order.status === "RETURNED" && (
              <button
                className="button button-small button-border button-border-gray"
                type="button"
                disabled
                style={{ marginTop: "0.75rem", cursor: "not-allowed" }}
              >
                Returned
              </button>
            )}

            {order.status === "CANCELLED" && (
              <button
                className="button button-small button-border button-border-gray"
                type="button"
                disabled
                style={{ marginTop: "0.75rem", cursor: "not-allowed" }}
              >
                Cancelled
              </button>
            )}
          </article>
        ))}
      </div>

      {/* Return reason modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onRequestClose={() => setIsReturnModalOpen(false)}
        overrideStyle={{ width: 420, maxWidth: "92vw" }}
      >
        <div style={{ padding: "1rem" }}>
          <h3>Return Order</h3>
          <p>Select the reason for returning this order:</p>
          <select
            className="filters-brand"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            style={{ width: "100%", marginBottom: "0.75rem" }}
          >
            {RETURN_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          {returnReason === "Other" && (
            <textarea
              className="review-form-textarea"
              rows={3}
              placeholder="Please describe your return reason"
              value={returnOtherReason}
              onChange={(e) => setReturnOtherReason(e.target.value)}
              style={{ width: "100%", marginBottom: "0.75rem" }}
            />
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              className="button button-border button-border-gray"
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="button"
              type="button"
              disabled={!returnOrderId || confirmingId === returnOrderId}
              onClick={handleConfirmReturnOrder}
            >
              {confirmingId === returnOrderId ? "Processing..." : "Return order"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Order detail modal */}
      <Modal
        isOpen={!!selectedOrder}
        onRequestClose={() => setSelectedOrder(null)}
        overrideStyle={{
          width: 640,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {selectedOrder && (
          <div className="user-order-modal">
            <h3>Order Details</h3>
            <p><strong>ID:</strong> {selectedOrder.id}</p>
            <p>
              <strong>Date:</strong>{" "}
              {selectedOrder.createdAt ? displayDate(selectedOrder.createdAt) : "-"}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`user-order-status user-order-status--${String(selectedOrder.status || "PLACED").toLowerCase()}`}
              >
                {STATUS_LABEL[selectedOrder.status] || selectedOrder.status || "PLACED"}
              </span>
            </p>
            {selectedOrder.status === "RETURNED" && selectedOrder.returnReason && (
              <p>
                <strong>Return reason:</strong> {selectedOrder.returnReason}
              </p>
            )}
            <p><strong>Payment:</strong> {selectedOrder.paymentType || "-"}</p>

            <div className="user-order-modal-summary">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(selectedOrder.subtotal || 0)}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>{formatCurrency(selectedOrder.shippingFee || 0)}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatCurrency(getOrderTotal(selectedOrder))}</strong>
              </div>
            </div>

            <h4>Shipping Info</h4>
            <p>{selectedOrder.shipping?.fullname || selectedOrder.customer?.name || "-"}</p>
            <p>{selectedOrder.shipping?.address || "-"}</p>
            <p>{selectedOrder.shipping?.email || selectedOrder.customer?.email || "-"}</p>

            <h4>Items</h4>
            <ul className="user-order-modal-items">
              {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map(
                (item) => (
                  <li key={`${selectedOrder.id}-${item.id}`}>
                    <span>{item.name}</span>
                    <span>x{item.quantity}</span>
                  </li>
                ),
              )}
            </ul>

            {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "RETURNED" && (
              <button
                className="button button-border button-border-gray"
                type="button"
                disabled={confirmingId === selectedOrder.id}
                onClick={() => openReturnReasonDialog(selectedOrder.id)}
                style={{ marginTop: "1rem", width: "100%" }}
              >
                {confirmingId === selectedOrder.id ? "Processing..." : "↩ Return Order"}
              </button>
            )}

            {selectedOrder.status !== "RECEIVED" &&
             selectedOrder.status !== "RETURNED" &&
             selectedOrder.status !== "CANCELLED" && (
              <button
                className="button"
                type="button"
                disabled={confirmingId === selectedOrder.id}
                onClick={() => handleConfirmReceived(selectedOrder.id)}
                style={{ marginTop: "1rem", width: "100%" }}
              >
                {confirmingId === selectedOrder.id ? "Confirming..." : "✓ Confirm Receipt"}
              </button>
            )}

            {selectedOrder.status === "RETURNED" && (
              <p style={{ marginTop: "1rem", color: "#d35400", fontWeight: 600 }}>
                ↩ This order has been returned.
              </p>
            )}

            {selectedOrder.status === "CANCELLED" && (
              <p style={{ marginTop: "1rem", color: "#9b59b6", fontWeight: 600 }}>
                ✖ This order is cancelled.
              </p>
            )}

            {selectedOrder.status === "RECEIVED" && (
              <p style={{ marginTop: "1rem", color: "#27ae60", fontWeight: 600 }}>
                ✓ Order received. You can now review the products from the order list.
              </p>
            )}

            <button
              className="modal-close-button"
              onClick={() => setSelectedOrder(null)}
              type="button"
            >
              <i className="fa fa-times-circle" />
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserOrdersTab;
