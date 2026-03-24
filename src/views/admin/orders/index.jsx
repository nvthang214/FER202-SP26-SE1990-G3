import { Boundary, Modal } from "@/components/common";
import { displayActionMessage, displayDate } from "@/helpers/utils";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import firebase from "@/services/firebase";
import React, { useEffect, useMemo, useState } from "react";

const formatCurrency = (value) =>
  `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;

const normalizeStatus = (status = "") => String(status).toUpperCase();
const isFinalStatus = (status = "") =>
  ["DELIVERED", "CANCELLED", "RETURNED"].includes(normalizeStatus(status));

const orderTotal = (order) => {
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

const AdminOrders = () => {
  useDocumentTitle("Orders | Salinaka Admin");
  useScrollTop();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const list = await firebase.getUsers();
      setUsers(Array.isArray(list) ? list : []);
    } catch (_) {
      setUsers([]);
      displayActionMessage("Failed to load order history", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const orders = useMemo(() => {
    const normalized = users.flatMap((user) => {
      const userOrders = Array.isArray(user.orders) ? user.orders : [];
      return userOrders.map((order) => ({
        ...order,
        userId: order.userId || user.id,
        customer: {
          id: order.customer?.id || user.id,
          name: order.customer?.name || user.fullname || "Unnamed User",
          email: order.customer?.email || user.email || "-",
        },
      }));
    });

    normalized.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );

    const keyword = searchText.trim().toLowerCase();

    return normalized.filter((order) => {
      const status = String(order.status || "PLACED").toUpperCase();
      const statusMatch = statusFilter === "ALL" || statusFilter === status;
      const keywordMatch =
        keyword === "" ||
        String(order.id || "")
          .toLowerCase()
          .includes(keyword) ||
        String(order.customer?.name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(order.customer?.email || "")
          .toLowerCase()
          .includes(keyword);

      return statusMatch && keywordMatch;
    });
  }, [users, searchText, statusFilter]);

  const updateOrderStatus = async (orderId, userId, status) => {
    try {
      const targetUser = users.find((user) => user.id === userId);
      if (!targetUser) {
        return;
      }

      const targetOrder = (
        Array.isArray(targetUser.orders) ? targetUser.orders : []
      ).find((order) => order.id === orderId);

      if (!targetOrder) {
        return;
      }

      if (isFinalStatus(targetOrder.status)) {
        displayActionMessage(
          "Delivered or cancelled orders cannot be changed anymore",
          "error",
        );
        return;
      }

      if (normalizeStatus(targetOrder.status) === normalizeStatus(status)) {
        displayActionMessage("Order is already in this status", "info");
        return;
      }

      const nextOrders = (
        Array.isArray(targetUser.orders) ? targetUser.orders : []
      ).map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
              updatedAt: new Date().toISOString(),
            }
          : order,
      );

      await firebase.updateUser(userId, { orders: nextOrders });

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                orders: nextOrders,
              }
            : user,
        ),
      );

      setSelectedOrder((prev) => {
        if (!prev || prev.id !== orderId) {
          return prev;
        }

        return {
          ...prev,
          status,
          updatedAt: new Date().toISOString(),
        };
      });

      displayActionMessage("Order status updated", "success");
    } catch (_) {
      displayActionMessage("Failed to update order status", "error");
    }
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
  };

  return (
    <Boundary>
      <div className="product-admin-header">
        <h3 className="product-admin-header-title">Orders ({orders.length})</h3>
        <div className="admin-orders-controls">
          <input
            className="search-input"
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by order, name, email..."
            type="text"
            value={searchText}
          />
          <select
            className="filters-brand"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="ALL">All status</option>
            <option value="PLACED">Placed</option>
            <option value="PROCESSING">Processing</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>
      </div>

      <div className="product-admin-items admin-orders">
        {isLoading ? (
          <div className="loader" style={{ minHeight: "60vh" }}>
            <h6>Loading orders...</h6>
          </div>
        ) : orders.length === 0 ? (
          <div className="loader" style={{ minHeight: "60vh" }}>
            <h5>No orders found.</h5>
          </div>
        ) : (
          <div className="admin-orders-list">
            {orders.map((order) => {
              const currentStatus = normalizeStatus(order.status || "PLACED");
              const isLocked = isFinalStatus(currentStatus);

              return (
                <article className="admin-orders-item" key={order.id}>
                  <div className="admin-orders-meta">
                    <p>
                      <strong>Order:</strong>{" "}
                      <button
                        className="button-link admin-order-link"
                        onClick={() => openOrderModal(order)}
                        type="button"
                      >
                        {order.id}
                      </button>
                    </p>
                    <p>
                      <strong>Customer:</strong> {order.customer?.name} (
                      {order.customer?.email})
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {order.createdAt ? displayDate(order.createdAt) : "-"}
                    </p>
                  </div>

                  <div className="admin-orders-summary">
                    <span>
                      {Array.isArray(order.items) ? order.items.length : 0}{" "}
                      products
                    </span>
                    <strong>{formatCurrency(orderTotal(order))}</strong>
                  </div>

                  <div className="admin-orders-actions">
                    <span
                      className={`admin-order-status admin-order-status--${String(order.status || "PLACED").toLowerCase()}`}
                    >
                      {order.status || "PLACED"}
                    </span>
                    <button
                      className="button button-small button-border"
                      disabled={isLocked || currentStatus === "PROCESSING"}
                      onClick={() =>
                        updateOrderStatus(order.id, order.userId, "PROCESSING")
                      }
                      type="button"
                    >
                      Mark Processing
                    </button>
                    <button
                      className="button button-small"
                      disabled={isLocked || currentStatus === "DELIVERED"}
                      onClick={() =>
                        updateOrderStatus(order.id, order.userId, "DELIVERED")
                      }
                      type="button"
                    >
                      Mark Delivered
                    </button>
                    <button
                      className="button button-small button-border"
                      disabled={isLocked || currentStatus === "CANCELLED"}
                      onClick={() =>
                        updateOrderStatus(order.id, order.userId, "CANCELLED")
                      }
                      type="button"
                    >
                      Cancel
                    </button>
                    {isLocked && (
                      <small className="admin-orders-locked-note">
                        Locked status: cannot update anymore.
                      </small>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selectedOrder}
        onRequestClose={closeOrderModal}
        overrideStyle={{
          width: 680,
          maxWidth: "92vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {selectedOrder && (
          <div className="admin-order-modal">
            <h3>Order Details</h3>
            <p>
              <strong>ID:</strong> {selectedOrder.id}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`admin-order-status admin-order-status--${String(selectedOrder.status || "PLACED").toLowerCase()}`}
              >
                {selectedOrder.status || "PLACED"}
              </span>
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {selectedOrder.createdAt
                ? displayDate(selectedOrder.createdAt)
                : "-"}
            </p>
            <p>
              <strong>Customer:</strong> {selectedOrder.customer?.name} (
              {selectedOrder.customer?.email})
            </p>
            <p>
              <strong>Payment:</strong> {selectedOrder.paymentType || "-"}
            </p>

            <div className="admin-order-modal-summary">
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
                <strong>{formatCurrency(orderTotal(selectedOrder))}</strong>
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
            <ul className="admin-order-modal-items">
              {(Array.isArray(selectedOrder.items)
                ? selectedOrder.items
                : []
              ).map((item) => (
                <li key={`${selectedOrder.id}-${item.id}`}>
                  <span>{item.name}</span>
                  <span>
                    x{item.quantity} -{" "}
                    {formatCurrency(
                      Number(item.price || 0) * Number(item.quantity || 1),
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className="modal-close-button"
              onClick={closeOrderModal}
              type="button"
            >
              <i className="fa fa-times-circle" />
            </button>
          </div>
        )}
      </Modal>
    </Boundary>
  );
};

export default AdminOrders;
