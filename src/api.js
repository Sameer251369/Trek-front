import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://back-hyn6.onrender.com";

const WS_BASE_URL =
  import.meta.env.VITE_WS_URL || "wss://back-hyn6.onrender.com";

// Rewrites any localhost media URLs to the live backend
export const fixMediaUrl = (url) => {
  if (!url) return url;
  return url
    .replace(/http:\/\/localhost:\d+/g, API_BASE_URL)
    .replace(/http:\/\/127\.0\.0\.1:\d+/g, API_BASE_URL);
};

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh + rewrite media URLs
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = rewriteMediaUrls(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem('access_token', response.data.access);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Recursively walk any object/array and fix localhost media URLs in string values
function rewriteMediaUrls(data) {
  if (typeof data === 'string') {
    return fixMediaUrl(data);
  }
  if (Array.isArray(data)) {
    return data.map(rewriteMediaUrls);
  }
  if (data !== null && typeof data === 'object') {
    const result = {};
    for (const key of Object.keys(data)) {
      result[key] = rewriteMediaUrls(data[key]);
    }
    return result;
  }
  return data;
}

export const authAPI = {
  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/api/token/`, { username, password });
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);

    // Fetch profile info to store in user object
    const meResponse = await api.get('/users/me/');
    localStorage.setItem('user', JSON.stringify(meResponse.data));
    return meResponse.data;
  },
  register: async (username, email, password) => {
    const response = await api.post('/users/register/', { username, email, password });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return rewriteMediaUrls(user);
  },
};

export const treksAPI = {
  list: async () => {
    const response = await api.get('/treks/');
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/treks/${id}/`);
    return response.data;
  },
  create: async (data) => {
    const hasFile = data.destination_image instanceof File;
    if (hasFile) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      const response = await api.post('/treks/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    const response = await api.post('/treks/', data);
    return response.data;
  },
  requestJoin: async (groupId) => {
    const response = await api.post('/treks/requests/', { group: groupId });
    return response.data;
  },
  listRequests: async (groupId) => {
    const response = await api.get(`/treks/requests/?group=${groupId}`);
    return response.data;
  },
  updateRequest: async (requestId, status) => {
    const response = await api.patch(`/treks/requests/${requestId}/`, { status });
    return response.data;
  },
  addCheckpoint: async (data) => {
    const response = await api.post('/treks/checkpoints/', data);
    return response.data;
  },
  deleteCheckpoint: async (id) => {
    const response = await api.delete(`/treks/checkpoints/${id}/`);
    return response.data;
  },
};

export const chatAPI = {
  listMessages: async (groupId) => {
    const response = await api.get(`/chat/messages/?group=${groupId}`);
    return response.data;
  },
  sendMessage: async (groupId, content, type = 'TEXT', extra = {}) => {
    const response = await api.post('/chat/messages/', {
      group: groupId,
      content,
      message_type: type,
      ...extra,
    });
    return response.data;
  },
  getWebSocketUrl: (groupId) => {
    const token = localStorage.getItem("access_token");
    return token
      ? `${WS_BASE_URL}/ws/chat/${groupId}/?token=${encodeURIComponent(token)}`
      : `${WS_BASE_URL}/ws/chat/${groupId}/`;
  },
};

export const equipmentAPI = {
  list: async (groupId) => {
    const response = await api.get(`/equipment/?group=${groupId}`);
    return response.data;
  },
  add: async (data) => {
    const response = await api.post('/equipment/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.patch(`/equipment/${id}/`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/equipment/${id}/`);
    return response.data;
  },
};

export const expensesAPI = {
  list: async (groupId) => {
    const response = await api.get(`/expenses/?group=${groupId}`);
    return response.data;
  },
  add: async (data) => {
    const response = await api.post('/expenses/', data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/equipment/${id}/`); // Correct endpoint mismatch
    return response.data;
  },
  getBalances: async (groupId) => {
    const response = await api.get(`/expenses/balances/?group=${groupId}`);
    return response.data;
  },
};

export const usersAPI = {
  getProfile: async (id) => {
    const response = await api.get(`/users/${id}/`);
    return response.data;
  },

  createProfilePost: async (formData) => {
    // Expect raw FormData straight from form component handlers
    const response = await api.post('/users/me/posts/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateProfile: async (data) => {
    const isFormData = data instanceof FormData;
    const hasNestedFile = !isFormData && data.profile?.profile_picture instanceof File;
    const removePicture = !isFormData && data.remove_profile_picture;

    if (isFormData) {
      const response = await api.patch('/users/me/', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    }

    if (hasNestedFile || removePicture) {
      const formData = new FormData();
      if (data.profile) {
        Object.entries(data.profile).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });
      }
      if (removePicture) {
        formData.append('remove_profile_picture', 'true');
      }
      const response = await api.patch('/users/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    }

    const response = await api.patch('/users/me/', data, {
      headers: { 'Content-Type': 'application/json' },
    });
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },
};

export default api;
export { API_BASE_URL };