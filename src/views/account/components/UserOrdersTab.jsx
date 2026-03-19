import { displayDate } from "@/helpers/utils";
import { Modal } from "@/components/common";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";

const formatCurrency = (value) =>
  `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;

const getOrderTotal = (order) => {
  if (typeof order.total === "number") {
    return order.total;
  }

  const itemsTotal = Array.isArray(order.items)
    ? order.items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      )
    : 0;

  return itemsTotal + Number(order.shippingFee || 0);
};

const UserOrdersTab = () => {
  const profile = useSelector((state) => state.profile);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const orders = useMemo(() => {
    const list = Array.isArray(profile.orders) ? [...profile.orders] : [];
    list.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
    return list;
  }, [profile.orders]);

  const summary = useMemo(
    () => ({
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + getOrderTotal(order), 0),
    }),
    [orders],
  );

  if (orders.length === 0) {
    return (
      <div className="loader" style={{ minHeight: "80vh" }}>
        <h3>My Orders</h3>
        <strong>
          <span className="text-subtle">
            You don&apos;t have any orders yet.
          </span>
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
                {order.status || "PLACED"}
              </span>
            </div>
            <p className="text-subtle">
              Placed on: {order.createdAt ? displayDate(order.createdAt) : "-"}
            </p>
            <p>
              <strong>Total: {formatCurrency(getOrderTotal(order))}</strong>
            </p>

            <ul className="user-order-products">
              {(Array.isArray(order.items) ? order.items : []).map((item) => (
                <li
                  className="user-order-product"
                  key={`${order.id}-${item.id}`}
                >
                  <span>{item.name}</span>
                  <span>x{item.quantity}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

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
            <p>
              <strong>ID:</strong> {selectedOrder.id}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {selectedOrder.createdAt
                ? displayDate(selectedOrder.createdAt)
                : "-"}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`user-order-status user-order-status--${String(selectedOrder.status || "PLACED").toLowerCase()}`}
              >
                {selectedOrder.status || "PLACED"}
              </span>
            </p>
            <p>
              <strong>Payment:</strong> {selectedOrder.paymentType || "-"}
            </p>

            <div className="user-order-modal-summary">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(selectedOrder.subtotal || 0)}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>
                  {formatCurrency(selectedOrder.shippingFee || 0)}
                </strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{formatCurrency(getOrderTotal(selectedOrder))}</strong>
              </div>
            </div>

            <h4>Shipping Info</h4>
            <p>
              {selectedOrder.shipping?.fullname ||
                selectedOrder.customer?.name ||
                "-"}
            </p>
            <p>{selectedOrder.shipping?.address || "-"}</p>
            <p>
              {selectedOrder.shipping?.email ||
                selectedOrder.customer?.email ||
                "-"}
            </p>

            <h4>Items</h4>
            <ul className="user-order-modal-items">
              {(Array.isArray(selectedOrder.items)
                ? selectedOrder.items
                : []
              ).map((item) => (
                <li key={`${selectedOrder.id}-${item.id}`}>
                  <span>{item.name}</span>
                  <span>x{item.quantity}</span>
                </li>
              ))}
            </ul>

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
