import { getToken } from './auth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const withBaseUrl = (url) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return API_BASE_URL ? `${API_BASE_URL}${url}` : url;
};

const buildHeaders = (extraHeaders = {}, includeAuth = false) => {
  const headers = { ...extraHeaders };
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
};

export const apiRequest = async (url, options = {}) => {
  const response = await fetch(withBaseUrl(url), options);

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const raw = await response.text();
      if (raw) {
        try {
          const payload = JSON.parse(raw);
          message = payload.error || payload.message || message;
        } catch {
          message = raw;
        }
      }
    } catch {
      // Ignore body parsing errors and keep the default message.
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const api = {
  login: (payload) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    }),

  registerStudent: (payload) =>
    apiRequest('/api/auth/register/student', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    }),

  registerAdmin: (payload) =>
    apiRequest('/api/admin/auth/register', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    }),

  getJobs: () =>
    apiRequest('/api/jobs', {
      headers: buildHeaders({}, true),
    }),

  applyJob: (jobId, reviewOpinion) =>
    apiRequest(`/api/student/apply/${jobId}`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify({ reviewOpinion }),
    }),

  addJob: (payload) =>
    apiRequest('/api/admin/job', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  getStudentApplications: () =>
    apiRequest('/api/student/applications', {
      headers: buildHeaders({}, true),
    }),

  getStudentProfile: () =>
    apiRequest('/api/student/profile', {
      headers: buildHeaders({}, true),
    }),

  updateStudentProfile: (payload) =>
    apiRequest('/api/student/profile', {
      method: 'PUT',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  uploadStudentDocument: (type, file) => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest(`/api/student/documents/${type}`, {
      method: 'POST',
      headers: buildHeaders({}, true),
      body: form,
    });
  },

  getStudentInterviews: () =>
    apiRequest('/api/student/interviews', {
      headers: buildHeaders({}, true),
    }),

  getStudentOffers: () =>
    apiRequest('/api/student/offers', {
      headers: buildHeaders({}, true),
    }),

  respondToOffer: (offerId, payload) =>
    apiRequest(`/api/student/offers/${offerId}/respond`, {
      method: 'PUT',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  submitStudentFeedback: (payload) =>
    apiRequest('/api/student/feedback', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  getStudentFeedback: () =>
    apiRequest('/api/student/feedback', {
      headers: buildHeaders({}, true),
    }),

  getStudentReminders: () =>
    apiRequest('/api/student/reminders', {
      headers: buildHeaders({}, true),
    }),

  getApplications: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        query.append(key, value);
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/api/admin/applications${suffix}`, {
      headers: buildHeaders({}, true),
    });
  },

  updateApplicationStatus: (applicationId, payload) =>
    apiRequest(`/api/admin/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  bulkUpdateStatus: (payload) =>
    apiRequest('/api/admin/applications/bulk-status', {
      method: 'PUT',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  scheduleInterview: (applicationId, payload) =>
    apiRequest(`/api/admin/applications/${applicationId}/interview`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  bulkInterviewSchedule: (payload) =>
    apiRequest('/api/admin/applications/bulk-interview', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  issueOffer: (applicationId, payload) =>
    apiRequest(`/api/admin/applications/${applicationId}/offer`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }, true),
      body: JSON.stringify(payload),
    }),

  getInterviews: () =>
    apiRequest('/api/admin/interviews', {
      headers: buildHeaders({}, true),
    }),

  getOffers: () =>
    apiRequest('/api/admin/offers', {
      headers: buildHeaders({}, true),
    }),

  getFeedback: () =>
    apiRequest('/api/admin/feedback', {
      headers: buildHeaders({}, true),
    }),

  getAnalytics: () =>
    apiRequest('/api/admin/analytics', {
      headers: buildHeaders({}, true),
    }),

  downloadStudentDocumentAsAdmin: async (studentId, type = 'resume') => {
    const response = await fetch(withBaseUrl(`/api/admin/students/${studentId}/documents/${type}`), {
      headers: buildHeaders({}, true),
    });
    if (!response.ok) {
      let message = 'Unable to download document';
      try {
        const raw = await response.text();
        if (raw) {
          message = raw;
        }
      } catch {
        // Keep fallback message.
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const disposition = response.headers.get('content-disposition') || '';
    const fileNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const encodedName = fileNameMatch?.[1];
    const directName = fileNameMatch?.[2];
    const fileName = encodedName
      ? decodeURIComponent(encodedName)
      : (directName || `${type}`);

    return { blob, fileName, contentType };
  },

  downloadAnalyticsReport: async () => {
    const response = await fetch(withBaseUrl('/api/admin/reports/analytics/pdf'), {
      headers: buildHeaders({}, true),
    });
    if (!response.ok) {
      throw new Error('Unable to download analytics report');
    }
    return response.blob();
  },
};
