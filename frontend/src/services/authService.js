import api, { USE_API, tokenStorage } from '../api/axios';

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const USER_KEY = 'cc_user';

// Endpoints follow djangorestframework-simplejwt conventions.
export const login = async ({ email, password, remember }) => {
  if (USE_API) {
    const { data } = await api.post('/auth/login/', { email, password });
    tokenStorage.set(data, remember);
    return data.user;
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

export const register = async (values) => {
  if (USE_API) {
    const { data } = await api.post('/auth/register/', {
      full_name: values.fullName,
      email: values.email,
      college: values.college,
      student_id: values.studentId,
      password: values.password,
    });
    return data;
  }
  await delay(800);
  return { ...values, password: undefined };
};

export const requestPasswordReset = async (email) => {
  if (USE_API) return (await api.post('/auth/password-reset/', { email })).data;
  await delay();
  return { detail: 'Reset link sent' };
};

export const logout = () => tokenStorage.clear();

export const saveUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const loadUser = () => {
  try {
    return tokenStorage.access ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
};
export const clearUser = () => localStorage.removeItem(USER_KEY);
