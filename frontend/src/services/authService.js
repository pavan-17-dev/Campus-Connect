import api, { USE_API, tokenStorage } from '../api/axios';
import { normalizeUser } from '../api/normalize';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const USER_KEY = 'cc_user';

/** POST /api/auth/login/ → { access, refresh, user } */
export const login = async ({ email, password, remember }) => {
  if (USE_API) {
    const { data } = await api.post('/auth/login/', { email, password });
    tokenStorage.set(data, remember);
    return normalizeUser(data.user);
  }
  await delay();
  if (password.length < 6) throw new Error('Invalid email or password.');
  const user = {
    id: 1,
    fullName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
    college: 'BMS College of Engineering',
    studentId: '1BM25CS000',
    isAdmin: email.startsWith('admin'),
    joined: new Date().toISOString(),
  };
  tokenStorage.set({ access: 'demo-access-token', refresh: 'demo-refresh-token' }, remember);
  return user;
};

/** POST /api/auth/register/ */
export const register = async (values) => {
  if (USE_API) {
    const { data } = await api.post('/auth/register/', {
      full_name: values.fullName,
      email: values.email,
      college: values.college,
      student_id: values.studentId,
      password: values.password,
      confirm_password: values.confirmPassword,
    });
    return normalizeUser(data.user);
  }
  await delay(800);
  return { ...values, password: undefined };
};

/** GET /api/auth/profile/ – refreshes the cached user after a reload. */
export const fetchProfile = async () => {
  if (!USE_API) return null;
  return normalizeUser((await api.get('/auth/profile/')).data);
};

/** PATCH /api/auth/profile/ */
export const updateProfile = async (changes) => {
  if (!USE_API) {
    await delay(300);
    return changes;
  }
  const { data } = await api.patch('/auth/profile/', {
    full_name: changes.fullName,
    college: changes.college,
    student_id: changes.studentId,
    phone: changes.phone,
    bio: changes.bio,
  });
  return normalizeUser(data);
};

export const changePassword = async (currentPassword, newPassword) => {
  if (!USE_API) return delay(300);
  return (await api.post('/auth/change-password/', { current_password: currentPassword, new_password: newPassword })).data;
};

export const requestPasswordReset = async (email) => {
  if (USE_API) return (await api.post('/auth/password-reset/', { email })).data;
  await delay();
  return { detail: 'Reset link sent' };
};

/** POST /api/auth/logout/ blacklists the refresh token on the server. */
export const logout = async () => {
  const refresh = tokenStorage.refresh;
  if (USE_API && refresh) {
    try {
      await api.post('/auth/logout/', { refresh });
    } catch {
      /* token already invalid – logging out locally is enough */
    }
  }
  tokenStorage.clear();
};

export const saveUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const loadUser = () => {
  try {
    return tokenStorage.access ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
};
export const clearUser = () => localStorage.removeItem(USER_KEY);
