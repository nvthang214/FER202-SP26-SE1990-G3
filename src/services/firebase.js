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

  signInWithGoogle = () => this.socialSignIn("google.com", "Google");

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

  // PRODUCT ACTIONS --------------

  getSingleProduct = async (id) => {
    try {
      const product = await this.request(`/products/${id}`);

      return product;
    } catch (_) {
      return null;
    }
  };

  getProducts = async (lastRefKey) => {
    const products = await this.request("/products");
    const sortedProducts = [...products].sort((a, b) =>
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
    const normalizedSearch = searchKey.trim().toLowerCase();
    const keywords = normalizedSearch.split(" ").filter(Boolean);
    const products = await this.request("/products");

    const startsWithMatches = products.filter((product) =>
      (product.name_lower || "").startsWith(normalizedSearch),
    );
    const keywordMatches = products.filter(
      (product) =>
        Array.isArray(product.keywords) &&
        product.keywords.some((keyword) =>
          keywords.includes(String(keyword).toLowerCase()),
        ),
    );

    const merged = [...startsWithMatches, ...keywordMatches];
    const uniqueProducts = Object.values(
      merged.reduce((acc, product) => {
        acc[product.id] = product;
        return acc;
      }, {}),
    );

    const limitedProducts = uniqueProducts.slice(0, 12);

    return {
      products: limitedProducts,
      lastKey: limitedProducts.length
        ? limitedProducts[limitedProducts.length - 1].id
        : null,
      total: uniqueProducts.length,
    };
  };

  getFeaturedProducts = async (itemsCount = 12) => {
    const products = await this.request("/products");
    return products
      .filter((product) => product.isFeatured)
      .slice(0, itemsCount);
  };

  getRecommendedProducts = async (itemsCount = 12) => {
    const products = await this.request("/products");
    return products
      .filter((product) => product.isRecommended)
      .slice(0, itemsCount);
  };

  addProduct = (id, product) =>
    this.request("/products", {
      method: "POST",
      body: JSON.stringify({ id, ...product }),
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

  editProduct = (id, updates) =>
    this.request(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

  removeProduct = (id) =>
    this.request(`/products/${id}`, {
      method: "DELETE",
    });
}

const firebaseInstance = new JsonServerService();

export default firebaseInstance;
