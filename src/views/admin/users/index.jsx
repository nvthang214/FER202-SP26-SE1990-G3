import { SearchOutlined } from "@ant-design/icons";
import { Boundary, MessageDisplay } from "@/components/common";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import { displayActionMessage, displayDate } from "@/helpers/utils";
import defaultAvatar from "@/images/defaultAvatar.jpg";
import firebase from "@/services/firebase";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

const isAdminRole = (role = "") => {
  const normalizedRole = String(role).toUpperCase();
  return normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN";
};

const Users = () => {
  useDocumentTitle("User List | Salinaka Admin");
  useScrollTop();

  const auth = useSelector((state) => state.auth);
  const profile = useSelector((state) => state.profile);
  const [users, setUsers] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updatingRoleId, setUpdatingRoleId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await firebase.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      displayActionMessage("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return users.filter((user) => {
      const normalizedRole = String(user.role || "USER").toUpperCase();
      const matchKeyword =
        keyword === "" ||
        (user.fullname && user.fullname.toLowerCase().includes(keyword)) ||
        (user.email && user.email.toLowerCase().includes(keyword)) ||
        (user.id && String(user.id).toLowerCase().includes(keyword));
      const matchRole =
        roleFilter === ""
          ? true
          : roleFilter === "ADMIN"
            ? isAdminRole(normalizedRole)
            : normalizedRole === roleFilter;
      return matchKeyword && matchRole;
    });
  }, [users, searchText, roleFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const buildPageRange = () => {
    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let startPage = Math.max(1, safePage - half);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i,
    );
  };

  const pageRange = totalPages > 1 ? buildPageRange() : [];

  const onDeleteUser = async (userId) => {
    if (userId === auth?.id) {
      displayActionMessage("You cannot delete your own account", "error");
      return;
    }

    if (!window.confirm("Delete this user?")) {
      return;
    }

    try {
      await firebase.deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      displayActionMessage("User deleted", "success");
    } catch (e) {
      displayActionMessage("Failed to delete user", "error");
    }
  };

  const onToggleRole = async (user) => {
    const currentRole = (user.role || "USER").toUpperCase();
    const nextRole = isAdminRole(currentRole) ? "USER" : "ADMIN";
    const isSuperAdmin =
      auth?.role === "SUPER_ADMIN" || auth?.id === "admin-001";

    if (user.id === auth?.id) {
      displayActionMessage("You cannot change your own role", "error");
      return;
    }

    if (currentRole === "SUPER_ADMIN" && !isSuperAdmin) {
      displayActionMessage(
        "Only SUPER_ADMIN can change SUPER_ADMIN role",
        "error",
      );
      return;
    }

    if (isAdminRole(currentRole) && nextRole === "USER" && !isSuperAdmin) {
      displayActionMessage("Only SUPER_ADMIN can demote admin users", "error");
      return;
    }

    if (!window.confirm(`Change role to ${nextRole} for this user?`)) {
      return;
    }

    try {
      setUpdatingRoleId(user.id);
      const nextRoleHistory = [
        {
          changedAt: new Date().toISOString(),
          changedBy: {
            id: auth?.id || "",
            email: profile?.email || "",
            name: profile?.fullname || "",
            role: auth?.role || "",
          },
          previousRole: currentRole,
          nextRole,
        },
        ...(Array.isArray(user.roleHistory) ? user.roleHistory : []),
      ];

      await firebase.updateUser(user.id, {
        role: nextRole,
        roleHistory: nextRoleHistory,
      });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role: nextRole,
                roleHistory: nextRoleHistory,
              }
            : item,
        ),
      );
      displayActionMessage("User role updated", "success");
    } catch (e) {
      displayActionMessage("Failed to update role", "error");
    } finally {
      setUpdatingRoleId("");
    }
  };

  return (
    <Boundary>
      <div className="product-admin-header">
        <h3 className="product-admin-header-title">
          Users &nbsp;({filteredUsers.length} / {users.length})
        </h3>
        <div className="admin-users-controls">
          <div className="searchbar">
            <SearchOutlined className="searchbar-icon" />
            <input
              className="search-input searchbar-input"
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search users..."
              type="text"
              value={searchText}
            />
          </div>
          <div className="admin-role-tabs" role="tablist">
            <button
              className={`button button-small ${roleFilter === "" ? "" : "button-border"}`}
              onClick={() => setRoleFilter("")}
              type="button"
            >
              All
            </button>
            <button
              className={`button button-small ${roleFilter === "ADMIN" ? "" : "button-border"}`}
              onClick={() => setRoleFilter("ADMIN")}
              type="button"
            >
              Admin
            </button>
            <button
              className={`button button-small ${roleFilter === "USER" ? "" : "button-border"}`}
              onClick={() => setRoleFilter("USER")}
              type="button"
            >
              User
            </button>
          </div>
        </div>
      </div>
      <div className="product-admin-items">
        {isLoading && users.length === 0 ? (
          <div className="loader" style={{ minHeight: "60vh" }}>
            <h6>Loading users...</h6>
          </div>
        ) : (
          <>
            {filteredUsers.length === 0 ? (
              <MessageDisplay message="No users found." />
            ) : (
              <div>
                <div className="grid grid-count-5 admin-users-header">
                  <div className="grid-col">User</div>
                  <div className="grid-col">Email</div>
                  <div className="grid-col">Role</div>
                  <div className="grid-col">Date Joined</div>
                  <div className="grid-col">Action</div>
                </div>
                {pagedUsers.map((user) => (
                  <div className="item admin-user-item" key={user.id}>
                    <div className="grid grid-count-5">
                      <div className="grid-col admin-user-cell">
                        <img
                          alt={user.fullname || user.email}
                          className="admin-user-avatar"
                          src={user.avatar || defaultAvatar}
                        />
                        <span className="text-overflow-ellipsis">
                          {user.fullname || "Unnamed User"}
                        </span>
                      </div>
                      <div className="grid-col text-overflow-ellipsis">
                        {user.email || "-"}
                      </div>
                      <div className="grid-col">
                        <span
                          className={`admin-user-role admin-user-role--${String(
                            user.role || "USER",
                          ).toLowerCase()}`}
                        >
                          {user.role || "USER"}
                        </span>
                        {Array.isArray(user.roleHistory) &&
                          user.roleHistory.length > 0 && (
                            <small className="admin-role-history-note">
                              Updated:{" "}
                              {displayDate(user.roleHistory[0].changedAt)}
                            </small>
                          )}
                      </div>
                      <div className="grid-col">
                        {user.dateJoined ? displayDate(user.dateJoined) : "-"}
                      </div>
                      <div className="grid-col">
                        <div className="admin-user-actions">
                          <button
                            className="button button-border button-small"
                            disabled={
                              user.id === auth?.id || updatingRoleId === user.id
                            }
                            onClick={() => onToggleRole(user)}
                            type="button"
                          >
                            {isAdminRole(user.role) ? "Set User" : "Set Admin"}
                          </button>
                          <button
                            className="button button-border button-small"
                            disabled={
                              user.id === auth?.id || updatingRoleId === user.id
                            }
                            onClick={() => onDeleteUser(user.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="admin-pagination">
                    <button
                      className="button button-small button-border admin-pagination-button"
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage(safePage - 1)}
                      type="button"
                    >
                      Prev
                    </button>
                    {pageRange.map((page) => (
                      <button
                        className={`button button-small admin-pagination-button ${page === safePage ? "admin-pagination-button--active" : "button-border"}`}
                        key={`page-${page}`}
                        onClick={() => setCurrentPage(page)}
                        type="button"
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="button button-small button-border admin-pagination-button"
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage(safePage + 1)}
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Boundary>
  );
};

export default Users;
