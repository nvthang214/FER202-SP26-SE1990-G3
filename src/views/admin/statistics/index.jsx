import { Boundary } from "@/components/common";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import firebase from "@/services/firebase";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

const formatCurrency = (value) =>
  `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");

const normalizeRole = (role = "") => String(role).toUpperCase();

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

const AdminStatistics = () => {
  useDocumentTitle("Statistics | Salinaka Admin");
  useScrollTop();

  const products = useSelector((state) => state.products.items || []);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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

  const productStats = useMemo(() => {
    const totalProducts = products.length;
    const featuredProducts = products.filter(
      (product) => product.isFeatured,
    ).length;
    const recommendedProducts = products.filter(
      (product) => product.isRecommended,
    ).length;
    const avgPrice =
      totalProducts > 0
        ? products.reduce(
            (sum, product) => sum + Number(product.price || 0),
            0,
          ) / totalProducts
        : 0;

    const estimatedStockUnits = products.reduce(
      (sum, product) => sum + Number(product.maxQuantity || 0),
      0,
    );

    const estimatedInventoryValue = products.reduce(
      (sum, product) =>
        sum + Number(product.price || 0) * Number(product.maxQuantity || 0),
      0,
    );

    const topBrands = products.reduce((acc, product) => {
      const key = product.brand || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topBrandEntries = Object.entries(topBrands)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      totalProducts,
      featuredProducts,
      recommendedProducts,
      avgPrice,
      estimatedStockUnits,
      estimatedInventoryValue,
      topBrandEntries,
    };
  }, [products]);

  const userStats = useMemo(() => {
    const totalUsers = users.length;
    const adminUsers = users.filter(
      (user) => normalizeRole(user.role) === "ADMIN",
    ).length;
    const customerUsers = users.filter(
      (user) => normalizeRole(user.role) !== "ADMIN",
    ).length;

    const activeBaskets = users.filter(
      (user) => Array.isArray(user.basket) && user.basket.length > 0,
    ).length;

    const totalBasketItems = users.reduce((sum, user) => {
      if (!Array.isArray(user.basket)) {
        return sum;
      }

      return (
        sum +
        user.basket.reduce(
          (basketSum, item) => basketSum + Number(item.quantity || 1),
          0,
        )
      );
    }, 0);

    const estimatedBasketValue = users.reduce((sum, user) => {
      if (!Array.isArray(user.basket)) {
        return sum;
      }

      return (
        sum +
        user.basket.reduce(
          (basketSum, item) =>
            basketSum + Number(item.price || 0) * Number(item.quantity || 1),
          0,
        )
      );
    }, 0);

    return {
      totalUsers,
      adminUsers,
      customerUsers,
      activeBaskets,
      totalBasketItems,
      estimatedBasketValue,
    };
  }, [users]);

  const orderStats = useMemo(() => {
    const orders = users.flatMap((user) =>
      (Array.isArray(user.orders) ? user.orders : []).map((order) => ({
        ...order,
        userId: order.userId || user.id,
      })),
    );

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0,
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const placedOrders = orders.filter(
      (order) => String(order.status || "PLACED").toUpperCase() === "PLACED",
    ).length;
    const processingOrders = orders.filter(
      (order) => String(order.status || "").toUpperCase() === "PROCESSING",
    ).length;
    const deliveredOrders = orders.filter(
      (order) => String(order.status || "").toUpperCase() === "DELIVERED",
    ).length;
    const cancelledOrders = orders.filter(
      (order) => String(order.status || "").toUpperCase() === "CANCELLED",
    ).length;

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      placedOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
    };
  }, [users]);

  return (
    <Boundary>
      <div className="product-admin-header">
        <h3 className="product-admin-header-title">Admin Statistics</h3>
        {isLoadingUsers && (
          <span className="admin-stats-loading">Updating users...</span>
        )}
      </div>

      <div className="product-admin-items admin-stats">
        <section className="admin-stats-grid">
          <article className="admin-stats-card">
            <h4>Total Products</h4>
            <p>{formatNumber(productStats.totalProducts)}</p>
            <span>
              {formatNumber(productStats.estimatedStockUnits)} stock units
            </span>
          </article>

          <article className="admin-stats-card">
            <h4>Featured Products</h4>
            <p>{formatNumber(productStats.featuredProducts)}</p>
            <span>
              Recommended: {formatNumber(productStats.recommendedProducts)}
            </span>
          </article>

          <article className="admin-stats-card">
            <h4>Average Product Price</h4>
            <p>{formatCurrency(productStats.avgPrice)}</p>
            <span>Estimated inventory value</span>
          </article>

          <article className="admin-stats-card admin-stats-card--accent">
            <h4>Inventory Value</h4>
            <p>{formatCurrency(productStats.estimatedInventoryValue)}</p>
            <span>Price x max quantity</span>
          </article>

          <article className="admin-stats-card">
            <h4>Total Users</h4>
            <p>{formatNumber(userStats.totalUsers)}</p>
            <span>
              Admin: {formatNumber(userStats.adminUsers)} | User:{" "}
              {formatNumber(userStats.customerUsers)}
            </span>
          </article>

          <article className="admin-stats-card admin-stats-card--accent">
            <h4>Total Orders</h4>
            <p>{formatNumber(orderStats.totalOrders)}</p>
            <span>Revenue: {formatCurrency(orderStats.totalRevenue)}</span>
          </article>

          <article className="admin-stats-card">
            <h4>Average Order Value</h4>
            <p>{formatCurrency(orderStats.averageOrderValue)}</p>
            <span>Delivered: {formatNumber(orderStats.deliveredOrders)}</span>
          </article>

          <article className="admin-stats-card admin-stats-card--accent">
            <h4>Basket Snapshot</h4>
            <p>{formatNumber(userStats.totalBasketItems)} items</p>
            <span>{formatCurrency(userStats.estimatedBasketValue)}</span>
          </article>
        </section>

        <section className="admin-stats-panels">
          <article className="admin-stats-panel">
            <h4>Top Brands</h4>
            {productStats.topBrandEntries.length === 0 ? (
              <p className="admin-stats-empty">No product data yet.</p>
            ) : (
              <ul className="admin-stats-brand-list">
                {productStats.topBrandEntries.map(([brand, count]) => {
                  const ratio =
                    productStats.totalProducts > 0
                      ? Math.max(
                          6,
                          Math.round(
                            (count / productStats.totalProducts) * 100,
                          ),
                        )
                      : 0;

                  return (
                    <li className="admin-stats-brand-item" key={brand}>
                      <div>
                        <strong>{brand}</strong>
                        <span>{formatNumber(count)} products</span>
                      </div>
                      <div className="admin-stats-brand-meter">
                        <i style={{ width: `${ratio}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="admin-stats-panel">
            <h4>Customer Activity</h4>
            <div className="admin-stats-kv">
              <span>Users with active baskets</span>
              <strong>{formatNumber(userStats.activeBaskets)}</strong>
            </div>
            <div className="admin-stats-kv">
              <span>Total cart items</span>
              <strong>{formatNumber(userStats.totalBasketItems)}</strong>
            </div>
            <div className="admin-stats-kv">
              <span>Estimated cart value</span>
              <strong>{formatCurrency(userStats.estimatedBasketValue)}</strong>
            </div>
          </article>

          <article className="admin-stats-panel">
            <h4>Order Activity</h4>
            <div className="admin-stats-kv">
              <span>Placed</span>
              <strong>{formatNumber(orderStats.placedOrders)}</strong>
            </div>
            <div className="admin-stats-kv">
              <span>Processing</span>
              <strong>{formatNumber(orderStats.processingOrders)}</strong>
            </div>
            <div className="admin-stats-kv">
              <span>Delivered</span>
              <strong>{formatNumber(orderStats.deliveredOrders)}</strong>
            </div>
            <div className="admin-stats-kv">
              <span>Cancelled</span>
              <strong>{formatNumber(orderStats.cancelledOrders)}</strong>
            </div>
          </article>
        </section>
      </div>
    </Boundary>
  );
};

export default AdminStatistics;
