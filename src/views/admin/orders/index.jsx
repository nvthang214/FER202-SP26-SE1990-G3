import { Boundary, Modal } from "@/components/common";
import { displayActionMessage, displayDate } from "@/helpers/utils";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import firebase from "@/services/firebase";
import React, { useEffect, useMemo, useState } from "react";

const formatCurrency = (value) =>
  `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;
const THUMB_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Crect width='72' height='72' rx='10' fill='%23f3f4f6'/%3E%3Cpath d='M18 46l11-12 8 8 7-7 10 11H18z' fill='%239ca3af'/%3E%3Ccircle cx='27' cy='26' r='5' fill='%23cbd5e1'/%3E%3C/svg%3E";
const STATUS_OPTIONS = ["ALL", "PLACED", "PROCESSING", "DELIVERED", "CANCELLED"];
const TIME_OPTIONS = ["TODAY", "7D", "30D", "ALL"];
const SORT_OPTIONS = ["NEWEST", "OLDEST", "HIGHEST"];

const normalizeStatus = (status = "") => String(status).toUpperCase();
const isFinalStatus = (status = "") =>
  ["DELIVERED", "CANCELLED"].includes(normalizeStatus(status));

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

const orderItems = (order) =>
  Array.isArray(order.items) ? order.items : [];

const orderItemCount = (order) =>
  orderItems(order).reduce((sum, item) => sum + Number(item.quantity || 1), 0);

const getTimeFilterStartMs = (timeFilter) => {
  const now = new Date();

  if (timeFilter === "TODAY") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  if (timeFilter === "7D" || timeFilter === "30D") {
    const days = Number(timeFilter.replace("D", ""));
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    return start.getTime();
  }

  return null;
};

const getOrderTime = (order) =>
  new Date(order.createdAt || order.updatedAt || 0).getTime();

const isOptionValid = (value, options) => options.includes(String(value || "").toUpperCase());

const isDefaultFilterState = ({ searchText, sortBy, statusFilter, timeFilter }) =>
  searchText.trim() === "" &&
  sortBy === "NEWEST" &&
  statusFilter === "ALL" &&
  timeFilter === "30D";

const AdminOrders = () => {
  useDocumentTitle("Orders | Salinaka Admin");
  useScrollTop();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("30D");
  const [sortBy, setSortBy] = useState("NEWEST");
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const nextStatus = params.get("status");
    const nextTime = params.get("time");
    const nextSort = params.get("sort");
    const nextSearch = params.get("q");

    if (isOptionValid(nextStatus, STATUS_OPTIONS)) {
      setStatusFilter(String(nextStatus).toUpperCase());
    }

    if (isOptionValid(nextTime, TIME_OPTIONS)) {
      setTimeFilter(String(nextTime).toUpperCase());
    }

    if (isOptionValid(nextSort, SORT_OPTIONS)) {
      setSortBy(String(nextSort).toUpperCase());
    }

    if (typeof nextSearch === "string") {
      setSearchText(nextSearch);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set("status", statusFilter);
    params.set("time", timeFilter);
    params.set("sort", sortBy);

    if (searchText.trim()) {
      params.set("q", searchText.trim());
    } else {
      params.delete("q");
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash || ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [searchText, sortBy, statusFilter, timeFilter]);

  const { orders, statusCounts } = useMemo(() => {
    const normalized = users.flatMap((user) => {
      const userOrders = Array.isArray(user.orders) ? user.orders : [];
      return userOrders.map((order) => ({
        ...order,
        userId: order.userId || user.id,
        orderDateMs: getOrderTime(order),
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
    const startTimeMs = getTimeFilterStartMs(timeFilter);

    const baseFiltered = normalized.filter((order) => {
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

      const timeMatch =
        startTimeMs === null ||
        (typeof order.orderDateMs === "number" &&
          !Number.isNaN(order.orderDateMs) &&
          order.orderDateMs >= startTimeMs);

      return keywordMatch && timeMatch;
    });

    const counts = baseFiltered.reduce(
      (acc, order) => {
        const status = String(order.status || "PLACED").toUpperCase();
        acc.ALL += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {
        ALL: 0,
        PLACED: 0,
        PROCESSING: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      },
    );

    const filteredOrders = baseFiltered.filter((order) => {
      const status = String(order.status || "PLACED").toUpperCase();
      const statusMatch = statusFilter === "ALL" || statusFilter === status;
      return statusMatch;
    });

    filteredOrders.sort((a, b) => {
      if (sortBy === "OLDEST") {
        return a.orderDateMs - b.orderDateMs;
      }

      if (sortBy === "HIGHEST") {
        return orderTotal(b) - orderTotal(a);
      }

      return b.orderDateMs - a.orderDateMs;
    });

    return {
      orders: filteredOrders,
      statusCounts: counts,
    };
  }, [users, searchText, sortBy, statusFilter, timeFilter]);

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

  const resetFilters = () => {
    setSearchText("");
    setSortBy("NEWEST");
    setStatusFilter("ALL");
    setTimeFilter("30D");
  };

  const canResetFilters = !isDefaultFilterState({
    searchText,
    sortBy,
    statusFilter,
    timeFilter,
  });

  return (
    <Boundary>
      <div className="product-admin-header">
        <h3 className="product-admin-header-title">Orders ({orders.length})</h3>
        <div className="admin-orders-controls admin-orders-controls--top">
          <div className="admin-orders-time-tabs">
            {[
              { key: "TODAY", label: "Today" },
              { key: "7D", label: "Last 7d" },
              { key: "30D", label: "Last 30d" },
              { key: "ALL", label: "All time" },
            ].map((item) => (
              <button
                className={`admin-orders-tab ${timeFilter === item.key ? "admin-orders-tab--active" : ""}`}
                key={item.key}
                onClick={() => setTimeFilter(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            className="search-input"
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by order, name, email..."
            type="text"
            value={searchText}
          />
          <button
            className="button button-small button-border"
            disabled={!canResetFilters}
            onClick={resetFilters}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="admin-orders-status-row">
        <div className="admin-orders-controls admin-orders-controls--status">
          {STATUS_OPTIONS.map((status) => (
            <button
              className={`admin-orders-tab ${statusFilter === status ? "admin-orders-tab--active" : ""}`}
              key={status}
              onClick={() => setStatusFilter(status)}
              type="button"
            >
              {status === "ALL"
                ? "All"
                : `${status.charAt(0)}${status.slice(1).toLowerCase()}`} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>

        <div className="admin-orders-sort-group" role="group" aria-label="Sort orders">
          {[
            { key: "NEWEST", label: "New" },
            { key: "OLDEST", label: "Old" },
            { key: "HIGHEST", label: "Value" },
          ].map((option) => (
            <button
              className={`admin-orders-sort-btn ${sortBy === option.key ? "admin-orders-sort-btn--active" : ""}`}
              key={option.key}
              onClick={() => setSortBy(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
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
              const items = orderItems(order);
              const firstItem = items[0] || {};

              return (
                <article className="admin-orders-item" key={order.id}>
                  <div className="admin-orders-main">
                    <img
                      alt={firstItem.name || "Order item"}
                      className="admin-orders-thumb"
                      src={firstItem.image || THUMB_PLACEHOLDER}
                    />

                    <div className="admin-orders-meta">
                      <div className="admin-orders-title-row">
                        <button
                          className="button-link admin-order-link"
                          onClick={() => openOrderModal(order)}
                          type="button"
                        >
                          {order.id}
                        </button>
                        <span
                          className={`admin-order-status admin-order-status--${String(order.status || "PLACED").toLowerCase()}`}
                        >
                          {order.status || "PLACED"}
                        </span>
                      </div>

                      <p>
                        <strong>{order.customer?.name}</strong> • {order.customer?.email}
                      </p>
                      <p>
                        {order.createdAt ? displayDate(order.createdAt) : "-"} • {order.paymentType || "-"}
                      </p>
                      <p>
                        {firstItem.name || "Order item"}
                        {items.length > 1 ? ` +${items.length - 1} more` : ""}
                      </p>
                    </div>

                    <div className="admin-orders-summary">
                      <span>{orderItemCount(order)} items</span>
                      <strong>{formatCurrency(orderTotal(order))}</strong>
                    </div>
                  </div>

                  <div className="admin-orders-actions">
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
                  <img
                    alt={item.name || "Order item"}
                    className="admin-order-modal-item-thumb"
                    src={item.image || THUMB_PLACEHOLDER}
                  />
                  <div className="admin-order-modal-item-content">
                    <span>{item.name}</span>
                    <small>
                      Qty: {Number(item.quantity || 1)} • Unit: {formatCurrency(Number(item.price || 0))}
                    </small>
                  </div>
                  <span>
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
