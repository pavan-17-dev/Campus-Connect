export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Student emails are typically on an academic domain (.ac.in, .edu, .edu.in).
export const STUDENT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.(ac\.in|edu|edu\.in|ac\.uk|edu\.[a-z]{2})$/i;

export const validateLogin = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
};

export const validateRegister = (v) => {
  const errors = {};
  if (!v.fullName.trim()) errors.fullName = 'Full name is required.';
  else if (v.fullName.trim().length < 3) errors.fullName = 'Name must be at least 3 characters.';
  if (!v.email.trim()) errors.email = 'Student email is required.';
  else if (!EMAIL_RE.test(v.email)) errors.email = 'Enter a valid email address.';
  else if (!STUDENT_EMAIL_RE.test(v.email)) errors.email = 'Please use your college email (e.g. name@college.ac.in or .edu).';
  if (!v.college.trim()) errors.college = 'College name is required.';
  if (!v.studentId.trim()) errors.studentId = 'Student ID is required.';
  else if (!/^[A-Za-z0-9-]{4,20}$/.test(v.studentId.trim())) errors.studentId = 'Use 4–20 letters, numbers or hyphens.';
  if (!v.password) errors.password = 'Password is required.';
  else if (v.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) errors.password = 'Include at least one letter and one number.';
  if (!v.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (v.confirmPassword !== v.password) errors.confirmPassword = 'Passwords do not match.';
  if (!v.terms) errors.terms = 'You must accept the terms to continue.';
  return errors;
};

export const MAX_IMAGES = 5;
export const MAX_IMAGE_MB = 5;

export const validateProduct = (v) => {
  const errors = {};
  if (!v.name.trim()) errors.name = 'Product name is required.';
  else if (v.name.trim().length < 5) errors.name = 'Use at least 5 characters.';
  if (!v.description.trim()) errors.description = 'Description is required.';
  else if (v.description.trim().length < 20) errors.description = 'Add a few more details (at least 20 characters).';
  if (!v.category) errors.category = 'Choose a category.';
  if (v.price === '' || v.price == null) errors.price = 'Price is required.';
  else if (Number(v.price) <= 0) errors.price = 'Price must be greater than ₹0.';
  else if (Number(v.price) > 500000) errors.price = 'Price looks too high for a student listing.';
  if (!v.condition) errors.condition = 'Select the product condition.';
  if (!v.images.length) errors.images = 'Add at least one photo.';
  if (!v.location.trim()) errors.location = 'Campus location is required.';
  return errors;
};

export const passwordStrength = (pw = '') => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return [
    { label: 'Too weak', tone: 'danger', pct: 15 },
    { label: 'Weak', tone: 'danger', pct: 30 },
    { label: 'Fair', tone: 'warning', pct: 55 },
    { label: 'Good', tone: 'info', pct: 80 },
    { label: 'Strong', tone: 'success', pct: 100 },
  ][score];
};
