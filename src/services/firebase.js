const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const AUTH_STORAGE_KEY = "salinaka_auth_user";

const toAuthError = (code, message) => ({ code, message });

class JsonServerService {
  constructor() {
    this.authListeners = new Set();
    this.auth = {
      currentUser: null,
      onAuthStateChanged: (callback) => {
        this.authListeners.add(callback);
        this.restoreSession().finally(() => callback(this.auth.currentUser));

        return () => this.authListeners.delete(callback);
      },
    };
  }

  request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Request failed.");
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };

  createAuthUser = (user) => ({
    uid: user.id,
    email: user.email,
    displayName: user.fullname || "User",
    photoURL: user.avatar || "",
    metadata: {
      creationTime: user.dateJoined || new Date().toISOString(),
    },
    providerData: [{ providerId: user.provider || "password" }],
  });

  notifyAuthListeners = () => {
    this.authListeners.forEach((listener) => listener(this.auth.currentUser));
  };

  persistSession = (userId) => {
    if (userId) {
      localStorage.setItem(AUTH_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  restoreSession = async () => {
    const userId = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!userId) {
      return;
    }

    try {
      const user = await this.request(`/users/${userId}`);
      this.auth.currentUser = this.createAuthUser(user);
    } catch (_) {
      this.persistSession(null);
      this.auth.currentUser = null;
    }
  };

  fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      if (typeof file === "string") {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result || "");
      reader.onerror = () => reject(new Error("Failed to process image file."));
      reader.readAsDataURL(file);
    });

  // AUTH ACTIONS ------------

  createAccount = async (email, password) => {
    const existingUsers = await this.request(
      `/users?email=${encodeURIComponent(email)}`,
    );

    if (existingUsers.length > 0) {
      throw toAuthError(
        "auth/email-already-in-use",
        "Email is already in use.",
      );
    }

    const id = this.generateKey();
    const user = await this.request("/users", {
      method: "POST",
      body: JSON.stringify({
        id,
        email,
        password,
        provider: "password",
        basket: [],
        role: "USER",
        dateJoined: new Date().toISOString(),
      }),
    });

    const authUser = this.createAuthUser(user);
    this.auth.currentUser = authUser;
    this.persistSession(authUser.uid);
    this.notifyAuthListeners();

    return { user: authUser };
  };

  signIn = async (email, password) => {
    const users = await this.request(
      `/users?email=${encodeURIComponent(email)}`,
    );
    const user = users[0];

    if (!user) {
      throw toAuthError("auth/user-not-found", "Incorrect email or password");
    }

    if (user.password !== password) {
      throw toAuthError("auth/wrong-password", "Incorrect email or password");
    }

    const authUser = this.createAuthUser(user);
    this.auth.currentUser = authUser;
    this.persistSession(authUser.uid);
    this.notifyAuthListeners();

    return { user: authUser };
  };

  socialSignIn = async (providerId, fallbackName) => {
    const id = this.generateKey();
    const randomEmail = `${fallbackName.toLowerCase()}-${id}@salinaka.local`;

    const user = {
      id,
      email: randomEmail,
      fullname: `${fallbackName} User`,
      avatar: "",
      provider: providerId,
      basket: [],
      role: "USER",
      dateJoined: new Date().toISOString(),
    };

    const authUser = this.createAuthUser(user);
    this.auth.currentUser = authUser;
    this.persistSession(authUser.uid);
    this.notifyAuthListeners();

    return { user: authUser };
  };

  signInWithGoogle = async (googleUser = null) => {
    if (googleUser && googleUser.email) {
      const existingUsers = await this.request(
        `/users?email=${encodeURIComponent(googleUser.email)}`,
      );

      let authUser;
      if (existingUsers.length > 0) {
        authUser = this.createAuthUser(existingUsers[0]);
      } else {
        const id = this.generateKey();
        const user = await this.request("/users", {
          method: "POST",
          body: JSON.stringify({
            id,
            email: googleUser.email,
            fullname: googleUser.fullname || "Google User",
            avatar: googleUser.avatar || "",
            provider: "google.com",
            basket: [],
            role: "USER",
            dateJoined: new Date().toISOString(),
          }),
        });
        authUser = this.createAuthUser(user);
      }

      this.auth.currentUser = authUser;
      this.persistSession(authUser.uid);
      this.notifyAuthListeners();
      return { user: authUser };
    }

    return this.socialSignIn("google.com", "Google");
  };

  signInWithFacebook = () => this.socialSignIn("facebook.com", "Facebook");

  signInWithGithub = () => this.socialSignIn("github.com", "Github");

  signOut = async () => {
    this.auth.currentUser = null;
    this.persistSession(null);
    this.notifyAuthListeners();
  };

  passwordReset = async () => null;

  addUser = async (id, user) => {
    try {
      const existing = await this.request(`/users/${id}`);

      return this.request(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...existing,
          ...user,
          id,
          provider: existing.provider || "password",
        }),
      });
    } catch (_) {
      return this.request("/users", {
        method: "POST",
        body: JSON.stringify({
          id,
          ...user,
          provider:
            user.provider ||
            this.auth.currentUser?.providerData?.[0]?.providerId ||
            "password",
        }),
      });
    }
  };

  getUser = async (id) => {
    try {
      const user = await this.request(`/users/${id}`);

      return {
        data: () => {
          const { password, ...profile } = user;
          return profile;
        },
      };
    } catch (_) {
      return { data: () => undefined };
    }
  };

  passwordUpdate = async (password) => {
    if (!this.auth.currentUser) {
      throw toAuthError("auth/user-not-found", "User not found.");
    }

    return this.request(`/users/${this.auth.currentUser.uid}`, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    });
  };

  reauthenticate = async (currentPassword) => {
    if (!this.auth.currentUser) {
      throw toAuthError("auth/user-not-found", "User not found.");
    }

    const user = await this.request(`/users/${this.auth.currentUser.uid}`);

    if (user.password !== currentPassword) {
      throw toAuthError("auth/wrong-password", "Wrong password");
    }

    return user;
  };

  changePassword = async (currentPassword, newPassword) => {
    await this.reauthenticate(currentPassword);
    await this.passwordUpdate(newPassword);

    return "Password updated successfully!";
  };

  updateEmail = async (currentPassword, newEmail) => {
    if (!this.auth.currentUser) {
      throw toAuthError("auth/user-not-found", "User not found.");
    }

    await this.reauthenticate(currentPassword);
    const duplicatedUsers = await this.request(
      `/users?email=${encodeURIComponent(newEmail)}`,
    );
    const isEmailTaken = duplicatedUsers.some(
      (user) => user.id !== this.auth.currentUser.uid,
    );

    if (isEmailTaken) {
      throw toAuthError(
        "auth/email-already-in-use",
        "Email is already in use.",
      );
    }

    await this.request(`/users/${this.auth.currentUser.uid}`, {
      method: "PATCH",
      body: JSON.stringify({ email: newEmail }),
    });

    this.auth.currentUser = {
      ...this.auth.currentUser,
      email: newEmail,
    };
    this.notifyAuthListeners();

    return "Email Successfully updated";
  };

  updateProfile = (id, updates) =>
    this.request(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

  onAuthStateChanged = () =>
    new Promise((resolve, reject) => {
      if (this.auth.currentUser) {
        resolve(this.auth.currentUser);
        return;
      }

      reject(new Error("Auth State Changed failed"));
    });

  saveBasketItems = (items, userId) =>
    this.request(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ basket: items }),
    });

  setAuthPersistence = async () => null;

  // USER ACTIONS --------------

  getUsers = async () => {
    const users = await this.request("/users");
    return users.map(({ password, ...rest }) => rest);
  };

  updateUser = (id, updates) =>
    this.request(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

  deleteUser = (id) =>
    this.request(`/users/${id}`, {
      method: "DELETE",
    });

  // PRODUCT ACTIONS --------------

  getSingleProduct = async (id) => {
    try {
      const product = await this.request(`/products/${id}`);

      if (product?.isDeleted) {
        return null;
      }

      return product;
    } catch (_) {
      return null;
    }
  };

  getProducts = async (lastRefKey) => {
    const products = await this.request("/products");
    const activeProducts = products.filter((product) => !product.isDeleted);
    const sortedProducts = [...activeProducts].sort((a, b) =>
      String(a.id).localeCompare(String(b.id)),
    );
    const limit = 12;

    if (lastRefKey) {
      const startIndex = sortedProducts.findIndex(
        (item) => item.id === lastRefKey,
      );
      const nextProducts = sortedProducts.slice(
        startIndex + 1,
        startIndex + 1 + limit,
      );

      return {
        products: nextProducts,
        lastKey: nextProducts.length
          ? nextProducts[nextProducts.length - 1].id
          : null,
      };
    }

    const firstProducts = sortedProducts.slice(0, limit);

    return {
      products: firstProducts,
      lastKey: firstProducts.length
        ? firstProducts[firstProducts.length - 1].id
        : null,
      total: sortedProducts.length,
    };
  };

  searchProducts = async (searchKey) => {
    const q = searchKey.trim().toLowerCase();
    if (!q) return { products: [], lastKey: null, total: 0 };

    const tokens = q.split(/\s+/).filter(Boolean);
    const allProducts = (await this.request("/products")).filter(
      (product) => !product.isDeleted,
    );

    const scoreProduct = (product) => {
      const name = (product.name_lower || product.name || "").toLowerCase();
      const brand = (product.brand || "").toLowerCase();
      const desc = (product.description || "").toLowerCase();
      const kws = (product.keywords || []).map((k) => String(k).toLowerCase());
      const nameWords = name.split(/\s+/);
      const brandWords = brand.split(/\s+/);

      let score = 0;

      for (const token of tokens) {
        if (name === q) {
          score += 200;
          continue;
        }
        if (brand === q) {
          score += 150;
          continue;
        }

        if (nameWords.includes(token)) {
          score += 80;
          continue;
        }
        if (brandWords.includes(token)) {
          score += 60;
          continue;
        }

        if (name.startsWith(q)) score += 100;
        else if (name.startsWith(token)) score += 50;

        if (name.includes(token)) score += 40;
        if (brand.includes(token)) score += 30;
        if (kws.includes(token)) score += 25;
        if (kws.some((k) => k.includes(token))) score += 15;
        if (desc.includes(token)) score += 10;
      }

      return score;
    };

    const scored = allProducts
      .map((p) => ({ product: p, score: scoreProduct(p) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    const matchedProducts = scored.map(({ product }) => product);

    return {
      products: matchedProducts,
      lastKey: matchedProducts.length
        ? matchedProducts[matchedProducts.length - 1].id
        : null,
      total: matchedProducts.length,
    };
  };

  getFeaturedProducts = async (itemsCount = 12) => {
    const products = await this.request("/products");
    return products
      .filter((product) => product.isFeatured && !product.isDeleted)
      .slice(0, itemsCount);
  };

  getRecommendedProducts = async (itemsCount = 12) => {
    const products = await this.request("/products");
    const recommendedProducts = products.filter(
      (product) => product.isRecommended && !product.isDeleted,
    );

    // Shuffle array and return random products
    const shuffled = recommendedProducts.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, itemsCount);
  };

  addProduct = (id, product) =>
    this.request("/products", {
      method: "POST",
      body: JSON.stringify({
        id,
        ...product,
        isDeleted: false,
        deletedAt: null,
      }),
    });

  generateKey = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.round(Math.random() * 10000)}`;
  };

  storeImage = async (id, folder, imageFile) => {
    const _folder = folder;
    const _id = id;
    void _folder;
    void _id;

    return this.fileToDataUrl(imageFile);
  };

  deleteImage = async () => null;

  getProductReviews = async (productId) => {
  const product = await this.request(`/products/${productId}`);
  return Array.isArray(product?.reviews) ? product.reviews : [];
};

addReview = async (productId, review) => {
  const product = await this.request(`/products/${productId}`);
  const currentReviews = Array.isArray(product?.reviews) ? product.reviews : [];
  const nextReviews = [review, ...currentReviews];
  await this.request(`/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ reviews: nextReviews }),
  });
  return nextReviews;
};

deleteReview = async (productId, reviewId) => {
  const product = await this.request(`/products/${productId}`);
  const currentReviews = Array.isArray(product?.reviews) ? product.reviews : [];
  const nextReviews = currentReviews.filter((r) => r.id !== reviewId);
  await this.request(`/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ reviews: nextReviews }),
  });
  return nextReviews;
};

  confirmOrderReceived = async (userId, orderId) => {
    const snapshot = await this.getUser(userId);
    const user = snapshot.data() || {};
    const currentOrders = Array.isArray(user.orders) ? user.orders : [];
    const nextOrders = currentOrders.map((order) =>
      order.id === orderId ? { ...order, status: "RECEIVED" } : order
    );
    await this.request(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ orders: nextOrders }),
    });
    return nextOrders;
  };

  editProduct = (id, updates) =>
    this.request(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

  removeProduct = (id) =>
    this.request(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      }),
    });

}
  

const firebaseInstance = new JsonServerService();

export default firebaseInstance;
