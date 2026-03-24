import { Boundary } from "@/components/common";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import firebase from "@/services/firebase";
import React, { useEffect, useMemo, useState } from "react";

const formatCurrency = (value) =>
  `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;
const THUMB_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Crect width='72' height='72' rx='10' fill='%23f3f4f6'/%3E%3Cpath d='M18 46l11-12 8 8 7-7 10 11H18z' fill='%239ca3af'/%3E%3Ccircle cx='27' cy='26' r='5' fill='%23cbd5e1'/%3E%3C/svg%3E";
const TIME_PRESET_OPTIONS = [
  { key: "7D", label: "7d" },
  { key: "30D", label: "30d" },
  { key: "90D", label: "90d" },
  { key: "THIS_MONTH", label: "This month" },
  { key: "ALL", label: "All" },
  { key: "CUSTOM", label: "Custom" },
];
const STATUS_FILTER_OPTIONS = ["ALL", "PLACED", "PROCESSING", "DELIVERED", "CANCELLED"];

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");
const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

const toDateMs = (value, isEnd = false) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${isEnd ? "23:59:59.999" : "00:00:00"}`);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
};

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatSeriesLabel = (key) => {
  if (key.length === 7) {
    const [year, month] = key.split("-");
    return `${month}/${year}`;
  }

  const [year, month, day] = key.split("-");
  return `${day}/${month}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("vi-VN");
};

const getSeriesKey = (time, useMonthlyBucket) => {
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  if (useMonthlyBucket) {
    return `${year}-${month}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateGrowth = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 1 : 0;
  }

  return (current - previous) / previous;
};

const getOrderCreatedAtMs = (order) => {
  const source = order.createdAt || order.updatedAt;
  if (!source) {
    return null;
  }

  const time = new Date(source).getTime();
  return Number.isNaN(time) ? null : time;
};

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

const getStatusKey = (status = "") => String(status || "PLACED").toUpperCase();

const AdminStatistics = () => {
  useDocumentTitle("Statistics | Salinaka Admin");
  useScrollTop();

  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timePreset, setTimePreset] = useState("30D");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const now = new Date();

    if (timePreset === "ALL") {
      setStartDate("");
      setEndDate("");
      return;
    }

    if (timePreset === "THIS_MONTH") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toInputDate(monthStart));
      setEndDate(toInputDate(now));
      return;
    }

    if (timePreset === "7D" || timePreset === "30D" || timePreset === "90D") {
      const days = Number(timePreset.replace("D", ""));
      const start = new Date(now);
      start.setDate(start.getDate() - (days - 1));
      setStartDate(toInputDate(start));
      setEndDate(toInputDate(now));
    }
  }, [timePreset]);

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const allUsers = await firebase.getUsers();

        if (mounted) {
          setUsers(Array.isArray(allUsers) ? allUsers : []);
        }
      } catch (_) {
        if (mounted) {
          setUsers([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  const orderStats = useMemo(() => {
    const orders = users.flatMap((user) =>
      (Array.isArray(user.orders) ? user.orders : []).map((order) => ({
        ...order,
        userId: order.userId || user.id,
        orderDateMs: getOrderCreatedAtMs(order),
      })),
    );

    const startDateMs = toDateMs(startDate, false);
    const endDateMs = toDateMs(endDate, true);
    const hasTimeFilter = startDateMs !== null || endDateMs !== null;

    const validOrders = orders.filter((order) => typeof order.orderDateMs === "number");

    const timeFilteredOrders = validOrders.filter((order) => {
      if (!hasTimeFilter) {
        return true;
      }

      return (
        (startDateMs === null || order.orderDateMs >= startDateMs) &&
        (endDateMs === null || order.orderDateMs <= endDateMs)
      );
    });

    const statusCounts = timeFilteredOrders.reduce(
      (acc, order) => {
        const status = getStatusKey(order.status);
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

    const filteredOrders =
      statusFilter === "ALL"
        ? timeFilteredOrders
        : timeFilteredOrders.filter(
            (order) => getStatusKey(order.status) === statusFilter,
          );

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const placedOrders = filteredOrders.filter((order) => getStatusKey(order.status) === "PLACED").length;
    const processingOrders = filteredOrders.filter((order) => getStatusKey(order.status) === "PROCESSING").length;
    const deliveredOrders = filteredOrders.filter((order) => getStatusKey(order.status) === "DELIVERED").length;
    const cancelledOrders = filteredOrders.filter((order) => getStatusKey(order.status) === "CANCELLED").length;

    const pendingFulfillment = placedOrders + processingOrders;
    const deliveredRate = totalOrders > 0 ? deliveredOrders / totalOrders : 0;
    const cancelledRate = totalOrders > 0 ? cancelledOrders / totalOrders : 0;

    const customerMap = filteredOrders.reduce((acc, order) => {
      const key =
        order.userId || order.customer?.id || order.customer?.email || order.id;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          name: order.customer?.name || "Unknown Customer",
          email: order.customer?.email || "-",
          orders: 0,
          total: 0,
        };
      }

      acc[key].orders += 1;
      acc[key].total += getOrderTotal(order);
      return acc;
    }, {});

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const uniqueCustomers = Object.keys(customerMap).length;
    const revenuePerCustomer =
      uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    const repeatCustomers = Object.values(customerMap).filter(
      (customer) => customer.orders >= 2,
    ).length;

    const productMap = filteredOrders.reduce((acc, order) => {
      const items = Array.isArray(order.items) ? order.items : [];

      items.forEach((item) => {
        const key = item.id || item.name;
        if (!key) {
          return;
        }

        if (!acc[key]) {
          acc[key] = {
            id: key,
            name: item.name || "Unknown Product",
            image: item.image || "",
            quantity: 0,
            revenue: 0,
          };
        }

        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.price || 0);
        acc[key].quantity += quantity;
        acc[key].revenue += quantity * unitPrice;
      });

      return acc;
    }, {});

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    const recentOrders = [...filteredOrders]
      .sort((a, b) => b.orderDateMs - a.orderDateMs)
      .slice(0, 6)
      .map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const firstItem = items[0] || {};

        return {
          id: order.id || `${order.userId}-${order.orderDateMs}`,
          createdAt: order.createdAt || order.updatedAt,
          status: getStatusKey(order.status),
          total: getOrderTotal(order),
          customerName: order.customer?.name || "Unknown Customer",
          itemCount: items.reduce(
            (sum, item) => sum + Number(item.quantity || 1),
            0,
          ),
          image: firstItem.image || "",
          firstItemName: firstItem.name || "Order item",
        };
      });

    const rangeStartMs =
      startDateMs ??
      (filteredOrders.length > 0
        ? Math.min(...filteredOrders.map((order) => order.orderDateMs))
        : null);
    const rangeEndMs =
      endDateMs ??
      (filteredOrders.length > 0
        ? Math.max(...filteredOrders.map((order) => order.orderDateMs))
        : null);

    const spanDays =
      rangeStartMs !== null && rangeEndMs !== null
        ? Math.max(
            1,
            Math.ceil((rangeEndMs - rangeStartMs + 1) / (1000 * 60 * 60 * 24)),
          )
        : 0;
    const useMonthlyBucket = spanDays > 120;

    const seriesMap = filteredOrders.reduce((acc, order) => {
      const key = getSeriesKey(order.orderDateMs, useMonthlyBucket);

      if (!acc[key]) {
        acc[key] = {
          key,
          label: formatSeriesLabel(key),
          orders: 0,
          revenue: 0,
        };
      }

      acc[key].orders += 1;
      acc[key].revenue += getOrderTotal(order);
      return acc;
    }, {});

    const series = Object.keys(seriesMap)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => seriesMap[key]);

    const maxSeriesRevenue =
      series.length > 0
        ? Math.max(...series.map((point) => point.revenue), 1)
        : 1;

    const bestRevenueBucket =
      series.length > 0
        ? [...series].sort((a, b) => b.revenue - a.revenue)[0]
        : null;

    const bestOrderBucket =
      series.length > 0 ? [...series].sort((a, b) => b.orders - a.orders)[0] : null;

    let revenueGrowth = null;
    let orderGrowth = null;

    if (startDateMs !== null && endDateMs !== null) {
      const rangeMs = endDateMs - startDateMs + 1;
      const previousStart = startDateMs - rangeMs;
      const previousEnd = startDateMs - 1;
      const previousOrders = validOrders.filter(
        (order) =>
          order.orderDateMs >= previousStart && order.orderDateMs <= previousEnd,
      );

      const previousRevenue = previousOrders.reduce(
        (sum, order) => sum + getOrderTotal(order),
        0,
      );

      revenueGrowth = calculateGrowth(totalRevenue, previousRevenue);
      orderGrowth = calculateGrowth(totalOrders, previousOrders.length);
    }

    return {
      totalOrders,
      totalOrdersAllTime: validOrders.length,
      totalRevenue,
      averageOrderValue,
      placedOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      pendingFulfillment,
      deliveredRate,
      cancelledRate,
      repeatCustomers,
      uniqueCustomers,
      revenuePerCustomer,
      statusCounts,
      topProducts,
      topCustomers,
      recentOrders,
      series,
      maxSeriesRevenue,
      revenueGrowth,
      orderGrowth,
    };
  }, [users, startDate, endDate, statusFilter]);

  const chartLinePoints = useMemo(() => {
    const width = 720;
    const height = 220;
    const left = 28;
    const right = 10;
    const top = 12;
    const bottom = 24;

    if (orderStats.series.length === 0) {
      return [];
    }

    if (orderStats.series.length === 1) {
      const y = top + (height - top - bottom) * 0.5;
      return [{ x: width * 0.5, y, label: orderStats.series[0].label }];
    }

    return orderStats.series.map((point, index) => {
      const x =
        left +
        (index * (width - left - right)) / (orderStats.series.length - 1);
      const normalized = point.revenue / orderStats.maxSeriesRevenue;
      const y = top + (1 - normalized) * (height - top - bottom);

      return {
        x,
        y,
        label: point.label,
      };
    });
  }, [orderStats.maxSeriesRevenue, orderStats.series]);

  const chartPolyline = chartLinePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const xTickStep =
    orderStats.series.length > 8
      ? Math.ceil(orderStats.series.length / 8)
      : 1;

  return (
    <Boundary>
      <div className="product-admin-header">
        <h3 className="product-admin-header-title">Admin Statistics</h3>
      </div>

      <div className="admin-stats-filter-row">
        <div className="admin-stats-status-tabs">
          {STATUS_FILTER_OPTIONS.map((status) => (
            <button
              className={`admin-stats-status-tab ${statusFilter === status ? "admin-stats-status-tab--active" : ""}`}
              key={status}
              onClick={() => setStatusFilter(status)}
              type="button"
            >
              {status === "ALL"
                ? "All"
                : `${status.charAt(0)}${status.slice(1).toLowerCase()}`} ({orderStats.statusCounts?.[status] || 0})
            </button>
          ))}
        </div>

        <div className="admin-stats-time-side">
          <div className="admin-stats-controls">
            <div className="admin-stats-presets">
              {TIME_PRESET_OPTIONS.map((option) => (
                <button
                  className={`admin-stats-preset ${timePreset === option.key ? "admin-stats-preset--active" : ""}`}
                  key={option.key}
                  onClick={() => setTimePreset(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="admin-stats-date-range">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setTimePreset("CUSTOM");
                  setStartDate(e.target.value);
                }}
              />
              <span className="admin-stats-controls-separator">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setTimePreset("CUSTOM");
                  setEndDate(e.target.value);
                }}
              />
              <button
                className="button button-border button-small"
                onClick={() => setTimePreset("ALL")}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>

          {isLoadingUsers && (
            <span className="admin-stats-loading">Updating users...</span>
          )}
        </div>
      </div>

      <div className="product-admin-items admin-stats">
        <section className="admin-stats-grid">
          <article className="admin-stats-card admin-stats-card--accent">
            <h4>Orders In Range</h4>
            <p>{formatNumber(orderStats.totalOrders)}</p>
            <span>All-time orders: {formatNumber(orderStats.totalOrdersAllTime)}</span>
          </article>

          <article className="admin-stats-card admin-stats-card--accent">
            <h4>Revenue In Range</h4>
            <p>{formatCurrency(orderStats.totalRevenue)}</p>
            <span>
              Growth: {" "}
              {orderStats.revenueGrowth === null
                ? "-"
                : formatPercent(orderStats.revenueGrowth)}
            </span>
          </article>

          <article className="admin-stats-card">
            <h4>Average Order Value</h4>
            <p>{formatCurrency(orderStats.averageOrderValue)}</p>
            <span>
              Order growth: {" "}
              {orderStats.orderGrowth === null
                ? "-"
                : formatPercent(orderStats.orderGrowth)}
            </span>
          </article>

          <article className="admin-stats-card">
            <h4>Pending Fulfillment</h4>
            <p>{formatNumber(orderStats.pendingFulfillment)}</p>
            <span>Placed + Processing orders</span>
          </article>

          <article className="admin-stats-card admin-stats-card--accent">
            <h4>Delivery Success Rate</h4>
            <p>{formatPercent(orderStats.deliveredRate)}</p>
            <span>Delivered: {formatNumber(orderStats.deliveredOrders)}</span>
          </article>

          <article className="admin-stats-card">
            <h4>Cancellation Rate</h4>
            <p>{formatPercent(orderStats.cancelledRate)}</p>
            <span>Cancelled: {formatNumber(orderStats.cancelledOrders)}</span>
          </article>

          <article className="admin-stats-card">
            <h4>Repeat Customers</h4>
            <p>{formatNumber(orderStats.repeatCustomers)}</p>
            <span>Customers with 2+ orders in selected period</span>
          </article>

          <article className="admin-stats-card admin-stats-card--accent">
            <h4>Unique Customers</h4>
            <p>{formatNumber(orderStats.uniqueCustomers)}</p>
            <span>Revenue / customer: {formatCurrency(orderStats.revenuePerCustomer)}</span>
          </article>
        </section>

        <section className="admin-stats-panels">
          <article className="admin-stats-panel admin-stats-panel--wide">
            <h4>Revenue Trend</h4>
            {orderStats.series.length === 0 ? (
              <p className="admin-stats-empty">No order activity in selected range.</p>
            ) : (
              <div className="admin-stats-trend">
                <svg viewBox="0 0 720 220" preserveAspectRatio="none">
                  <polyline className="admin-stats-trend-line" points={chartPolyline} />
                  {chartLinePoints.map((point) => (
                    <circle
                      className="admin-stats-trend-point"
                      cx={point.x}
                      cy={point.y}
                      key={`${point.x}-${point.y}`}
                      r="3"
                    />
                  ))}
                </svg>
                <div className="admin-stats-trend-labels">
                  {orderStats.series.map((point, index) =>
                    index % xTickStep === 0 || index === orderStats.series.length - 1 ? (
                      <span key={point.key}>{point.label}</span>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </article>

          <article className="admin-stats-panel">
            <h4>Recent Orders</h4>
            {orderStats.recentOrders.length === 0 ? (
              <p className="admin-stats-empty">No orders in selected range.</p>
            ) : (
              <ul className="admin-stats-orders-list">
                {orderStats.recentOrders.map((order) => (
                  <li className="admin-stats-orders-item" key={order.id}>
                    <img
                      alt={order.firstItemName}
                      className="admin-stats-orders-thumb"
                      src={order.image || THUMB_PLACEHOLDER}
                    />
                    <div className="admin-stats-orders-content">
                      <div className="admin-stats-orders-head">
                        <strong>{order.customerName}</strong>
                        <span className={`admin-stats-orders-badge admin-stats-orders-badge--${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </div>
                      <span>
                        {order.firstItemName} • {formatNumber(order.itemCount)} items • {formatDateTime(order.createdAt)}
                      </span>
                    </div>
                    <span className="admin-stats-orders-total">{formatCurrency(order.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="admin-stats-panel">
            <h4>Top Selling Products</h4>
            {orderStats.topProducts.length === 0 ? (
              <p className="admin-stats-empty">No sold products in selected range.</p>
            ) : (
              <ul className="admin-stats-list">
                {orderStats.topProducts.map((product) => (
                  <li className="admin-stats-list-item" key={product.id}>
                    <img
                      alt={product.name}
                      className="admin-stats-product-thumb"
                      src={product.image || THUMB_PLACEHOLDER}
                    />
                    <div>
                      <strong>{product.name}</strong>
                      <span>{formatNumber(product.quantity)} units</span>
                    </div>
                    <span>{formatCurrency(product.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="admin-stats-panel">
            <h4>Top Customers</h4>
            {orderStats.topCustomers.length === 0 ? (
              <p className="admin-stats-empty">No customer data in selected range.</p>
            ) : (
              <ul className="admin-stats-list">
                {orderStats.topCustomers.map((customer) => (
                  <li className="admin-stats-list-item" key={customer.id}>
                    <div>
                      <strong>{customer.name}</strong>
                      <span>
                        {customer.email} | {formatNumber(customer.orders)} orders
                      </span>
                    </div>
                    <span>{formatCurrency(customer.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </div>
    </Boundary>
  );
};

export default AdminStatistics;
