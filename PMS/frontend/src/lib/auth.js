export const getToken = () => localStorage.getItem('token');

export const getRole = () => localStorage.getItem('role');

export const setAuth = (token, role) => {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('student_resume_path');
  localStorage.removeItem('student_resume_name');
};

export const isStudent = () => {
  const role = getRole();
  return role === 'STUDENT' || role === 'ROLE_STUDENT';
};

export const isAdmin = () => {
  const role = getRole();
  return role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'PLACEMENT_COORDINATOR' || role === 'ROLE_PLACEMENT_COORDINATOR';
};
