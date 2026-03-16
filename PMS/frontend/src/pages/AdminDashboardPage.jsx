import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearAuth, getToken, isAdmin } from '../lib/auth';

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, toast };
}

const ADMIN_TABS = [
  { key: 'applications', label: 'Applications' },
  { key: 'add-job',      label: 'Add Job' },
  { key: 'interviews',   label: 'Interviews' },
  { key: 'offers',       label: 'Offers' },
  { key: 'analytics',   label: 'Analytics' },
];

const initialJob = {
  title: '',
  salary: '',
  eligibilityCgpa: '',
  deadlineDate: '',
  registrationLink: '',
};

const defaultActionDraft = {
  type: 'STATUS',
  status: 'SHORTLISTED',
  remarks: '',
  scheduledAt: '',
  mode: 'ONLINE',
  meetingLink: '',
  offeredCtc: '',
};

const getFileExtensionFromContentType = (contentType = '') => {
  const normalized = contentType.toLowerCase();
  if (normalized.includes('pdf')) return '.pdf';
  if (normalized.includes('msword')) return '.doc';
  if (normalized.includes('officedocument.wordprocessingml.document')) return '.docx';
  if (normalized.includes('png')) return '.png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return '.jpg';
  return '';
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toasts, toast } = useToast();
  const [activeTab, setActiveTab] = useState('applications');

  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  /* ── Interviews tab ──────────────────────────────── */
  const [interviews, setInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [interviewsLoaded, setInterviewsLoaded] = useState(false);

  /* ── Offers tab ──────────────────────────────────── */
  const [adminOffers, setAdminOffers] = useState([]);
  const [loadingAdminOffers, setLoadingAdminOffers] = useState(false);
  const [adminOffersLoaded, setAdminOffersLoaded] = useState(false);

  /* ── Analytics tab ───────────────────────────────── */
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jobFilter, setJobFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('SHORTLISTED');
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'appliedDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedApplicationId, setExpandedApplicationId] = useState(null);
  const [activeActionApplicationId, setActiveActionApplicationId] = useState(null);
  const [actionDrafts, setActionDrafts] = useState({});
  const [actionInFlightId, setActionInFlightId] = useState(null);
  const [downloadingResumeApplicationId, setDownloadingResumeApplicationId] = useState(null);
  const [job, setJob] = useState(initialJob);
  const pageSize = 8;

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const loadApplications = async (params = {}) => {
    try {
      setLoadingApplications(true);
      const data = await api.getApplications(params);
      setApplications(data);
    } catch {
      clearAuth();
      toast('Session expired — please login again', 'error');
      navigate('/login');
    } finally {
      setLoadingApplications(false);
    }
  };

  useEffect(() => {
    if (!getToken() || !isAdmin()) {
      clearAuth();
      navigate('/login');
      return;
    }
    loadApplications();
  }, []);

  /* ── Lazy loaders for tabs ───────────────────────── */
  const loadInterviews = async () => {
    if (interviewsLoaded) return;
    try {
      setLoadingInterviews(true);
      const data = await api.getInterviews();
      setInterviews(data);
      setInterviewsLoaded(true);
    } catch {
      toast('Failed to load interviews', 'error');
    } finally {
      setLoadingInterviews(false);
    }
  };

  const loadAdminOffers = async () => {
    if (adminOffersLoaded) return;
    try {
      setLoadingAdminOffers(true);
      const data = await api.getOffers();
      setAdminOffers(data);
      setAdminOffersLoaded(true);
    } catch {
      toast('Failed to load offers', 'error');
    } finally {
      setLoadingAdminOffers(false);
    }
  };

  const loadAnalytics = async () => {
    if (analyticsLoaded) return;
    try {
      setLoadingAnalytics(true);
      const data = await api.getAnalytics();
      setAnalytics(data);
      setAnalyticsLoaded(true);
    } catch {
      toast('Failed to load analytics', 'error');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'interviews') loadInterviews();
    if (activeTab === 'offers')     loadAdminOffers();
    if (activeTab === 'analytics')  loadAnalytics();
  }, [activeTab]);

  const downloadAnalytics = async () => {
    try {
      const blob = await api.downloadAnalyticsReport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'analytics-report.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err.message || 'Download failed', 'error');
    }
  };

  const onAddJob = async () => {
    const { title, salary, eligibilityCgpa, deadlineDate, registrationLink } = job;

    if (!title || !salary || !eligibilityCgpa || !deadlineDate || !registrationLink) {
      toast('Please fill in all job fields', 'error');
      return;
    }

    if (Number.isNaN(Number(salary)) || Number.isNaN(Number(eligibilityCgpa))) {
      toast('Salary and CGPA must be valid numbers', 'error');
      return;
    }

    try {
      await api.addJob({
        title,
        salary: Number(salary),
        eligibilityCgpa: Number(eligibilityCgpa),
        deadlineDate,
        registrationLink,
      });
      toast('Job added successfully');
      setJob(initialJob);
      loadApplications(buildServerFilters());
    } catch (error) {
      toast(error.message || 'Failed to add job', 'error');
    }
  };

  const buildServerFilters = () => ({
    status: statusFilter === 'ALL' ? '' : statusFilter,
    department: departmentFilter,
    skill: skillFilter,
    minCgpa: minCgpaFilter,
  });

  const applyServerFilters = async () => {
    setCurrentPage(1);
    setExpandedApplicationId(null);
    await loadApplications(buildServerFilters());
  };

  const toggleSelect = (applicationId) => {
    setSelectedIds((ids) => (ids.includes(applicationId)
      ? ids.filter((id) => id !== applicationId)
      : [...ids, applicationId]));
  };

  const openActionPanel = (applicationId, type, overrides = {}) => {
    setActiveActionApplicationId(applicationId);
    setActionDrafts((current) => {
      const existing = current[applicationId] || defaultActionDraft;
      return {
        ...current,
        [applicationId]: {
          ...existing,
          type,
          ...overrides,
        },
      };
    });
  };

  const updateActionDraft = (applicationId, patch) => {
    setActionDrafts((current) => {
      const existing = current[applicationId] || defaultActionDraft;
      return {
        ...current,
        [applicationId]: {
          ...existing,
          ...patch,
        },
      };
    });
  };

  const updateStatus = async (applicationId, status, remarks = '') => {
    try {
      await api.updateApplicationStatus(applicationId, { status, remarks });
      await loadApplications(buildServerFilters());
      toast(`${status} action completed`);
    } catch (error) {
      toast(error.message || 'Could not update status', 'error');
    }
  };

  const runBulkStatusUpdate = async () => {
    if (selectedIds.length === 0) {
      toast('Select at least one application', 'error');
      return;
    }

    try {
      await api.bulkUpdateStatus({
        applicationIds: selectedIds,
        status: bulkStatus,
        remarks: bulkRemarks,
      });
      setSelectedIds([]);
      setBulkRemarks('');
      await loadApplications(buildServerFilters());
      toast(`Bulk updated ${selectedIds.length} applications to ${bulkStatus}`);
    } catch (error) {
      toast(error.message || 'Bulk update failed', 'error');
    }
  };

  const scheduleInterview = async (applicationId, payload) => {
    try {
      await api.scheduleInterview(applicationId, payload);
      await loadApplications(buildServerFilters());
      toast('Interview scheduled');
    } catch (error) {
      toast(error.message || 'Unable to schedule interview', 'error');
    }
  };

  const issueOffer = async (applicationId, payload) => {
    try {
      await api.issueOffer(applicationId, payload);
      await loadApplications(buildServerFilters());
      toast('Offer issued');
    } catch (error) {
      toast(error.message || 'Unable to issue offer', 'error');
    }
  };

  const downloadResume = async (application) => {
    if (!application.studentId) {
      toast('Student ID unavailable for this row', 'error');
      return;
    }

    try {
      setDownloadingResumeApplicationId(application.applicationId);
      const { blob, fileName, contentType } = await api.downloadStudentDocumentAsAdmin(application.studentId, 'resume');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (application.studentName || 'student').replace(/[^a-zA-Z0-9._-]/g, '_');
      const hasKnownExtension = /\.[a-z0-9]+$/i.test(fileName || '');
      const fallbackName = `${safeName}_resume${getFileExtensionFromContentType(contentType)}`;
      link.href = url;
      link.download = fileName || fallbackName;
      if (!hasKnownExtension && !fileName) {
        link.download = fallbackName;
      }
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast(error.message || 'Unable to download resume', 'error');
    } finally {
      setDownloadingResumeApplicationId(null);
    }
  };

  const submitRowAction = async (applicationId) => {
    const draft = actionDrafts[applicationId] || defaultActionDraft;

    try {
      setActionInFlightId(applicationId);

      if (draft.type === 'STATUS') {
        await updateStatus(applicationId, draft.status, draft.remarks || '');
      } else if (draft.type === 'INTERVIEW') {
        if (!draft.scheduledAt) {
          toast('Select interview date and time', 'error');
          return;
        }

        await scheduleInterview(applicationId, {
          scheduledAt: draft.scheduledAt,
          mode: draft.mode || 'ONLINE',
          meetingLink: draft.meetingLink || '',
          remarks: draft.remarks || '',
        });
      } else if (draft.type === 'OFFER') {
        if (!draft.offeredCtc || Number.isNaN(Number(draft.offeredCtc))) {
          toast('Enter a valid offered CTC', 'error');
          return;
        }

        await issueOffer(applicationId, {
          offeredCtc: Number(draft.offeredCtc),
          remarks: draft.remarks || '',
        });
      }

      setActiveActionApplicationId(null);
    } finally {
      setActionInFlightId(null);
    }
  };

  const normalizedApplications = useMemo(
    () => applications.map((application) => {
      const student = application.student || {};
      const jobData = application.job || {};

      return {
        ...application,
        studentId: student.studentId || application.studentId || null,
        studentName: student.name || application.studentName || 'N/A',
        studentEmail: student.email || application.studentEmail || 'N/A',
        studentDept: student.dept || 'N/A',
        studentCgpa: student.cgpa ?? 'N/A',
        studentSkills: student.skills || 'N/A',
        jobTitle: jobData.title || application.jobTitle || 'N/A',
        appliedDate: application.appliedDate || 'N/A',
        status: application.status || 'N/A',
        reviewOpinion: application.reviewOpinion || 'No review provided',
      };
    }),
    [applications]
  );

  const jobOptions = useMemo(() => {
    const uniqueTitles = [...new Set(normalizedApplications.map((item) => item.jobTitle))];
    return uniqueTitles.filter((title) => title !== 'N/A').sort((a, b) => a.localeCompare(b));
  }, [normalizedApplications]);

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return normalizedApplications.filter((application) => {
      const matchesSearch = !query
        || application.studentName.toLowerCase().includes(query)
        || application.studentEmail.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'ALL' || application.status === statusFilter;
      const matchesJob = jobFilter === 'ALL' || application.jobTitle === jobFilter;
      return matchesSearch && matchesStatus && matchesJob;
    });
  }, [normalizedApplications, searchTerm, statusFilter, jobFilter]);

  const sortedApplications = useMemo(() => {
    const sortable = [...filteredApplications];
    const { key, direction } = sortConfig;

    sortable.sort((first, second) => {
      const firstValue = first[key] ?? '';
      const secondValue = second[key] ?? '';

      if (key === 'appliedDate') {
        const firstDate = Date.parse(firstValue) || 0;
        const secondDate = Date.parse(secondValue) || 0;
        return direction === 'asc' ? firstDate - secondDate : secondDate - firstDate;
      }

      const compareResult = String(firstValue).localeCompare(String(secondValue), undefined, {
        sensitivity: 'base',
        numeric: true,
      });

      return direction === 'asc' ? compareResult : -compareResult;
    });

    return sortable;
  }, [filteredApplications, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedApplications.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedApplications.slice(start, start + pageSize);
  }, [currentPage, sortedApplications]);

  const pageNumbers = useMemo(() => {
    const visible = 5;
    const firstPage = Math.max(1, currentPage - 2);
    const lastPage = Math.min(totalPages, firstPage + visible - 1);
    const adjustedFirstPage = Math.max(1, lastPage - visible + 1);
    return Array.from({ length: lastPage - adjustedFirstPage + 1 }, (_, index) => adjustedFirstPage + index);
  }, [currentPage, totalPages]);

  const onSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortLabel = (key) => {
    if (sortConfig.key !== key) {
      return '';
    }
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const onFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setCurrentPage(1);
    setExpandedApplicationId(null);
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage jobs and applications.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* ── Toast notifications ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
        ))}
      </div>

      {/* ── Tab navigation ── */}
      <nav className="tab-nav">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-btn${activeTab === tab.key ? ' tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'applications' && sortedApplications.length > 0 && (
              <span className="tab-badge">{sortedApplications.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ══ TAB: Add Job ══ */}
      {activeTab === 'add-job' && (
        <div className="tab-panel">
          <section className="card">
            <h2 className="section-title">Post a New Job</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="title">Job Title</label>
                <input
                  id="title"
                  placeholder="Job Title"
                  value={job.title}
                  onChange={(event) => setJob({ ...job, title: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="salary">Salary (₹)</label>
                <input
                  id="salary"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Salary"
                  value={job.salary}
                  onChange={(event) => setJob({ ...job, salary: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="cgpa">Eligibility CGPA</label>
                <input
                  id="cgpa"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Eligibility CGPA"
                  value={job.eligibilityCgpa}
                  onChange={(event) => setJob({ ...job, eligibilityCgpa: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="deadline">Application Deadline</label>
                <input
                  id="deadline"
                  type="date"
                  value={job.deadlineDate}
                  onChange={(event) => setJob({ ...job, deadlineDate: event.target.value })}
                />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="link">Registration Link</label>
                <input
                  id="link"
                  type="url"
                  placeholder="https://..."
                  value={job.registrationLink}
                  onChange={(event) => setJob({ ...job, registrationLink: event.target.value })}
                />
              </div>
            </div>
            <div className="actions">
              <button className="btn" onClick={onAddJob}>Post Job</button>
            </div>
          </section>
        </div>
      )}

      {/* ══ TAB: Applications ══ */}
      {activeTab === 'applications' && (
        <div className="tab-panel">
          <section className="card table-card">
            <div className="section-header-row">
              <h2 className="section-title">Applications</h2>
              <span className="text-muted">{sortedApplications.length} total</span>
            </div>

        <div className="table-controls">
          <input
            value={searchTerm}
            onChange={onFilterChange(setSearchTerm)}
            placeholder="Search by student name or email"
            aria-label="Search students"
          />
          <select value={statusFilter} onChange={onFilterChange(setStatusFilter)} aria-label="Filter by status">
            <option value="ALL">All Status</option>
            <option value="APPLIED">APPLIED</option>
            <option value="SHORTLISTED">SHORTLISTED</option>
            <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
            <option value="OFFERED">OFFERED</option>
            <option value="SELECTED">SELECTED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select value={jobFilter} onChange={onFilterChange(setJobFilter)} aria-label="Filter by job">
            <option value="ALL">All Jobs</option>
            {jobOptions.map((title) => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </div>

        <div className="table-controls">
          <input
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            placeholder="Department filter"
          />
          <input
            value={skillFilter}
            onChange={(event) => setSkillFilter(event.target.value)}
            placeholder="Skill filter"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={minCgpaFilter}
            onChange={(event) => setMinCgpaFilter(event.target.value)}
            placeholder="Min CGPA"
          />
        </div>

        <div className="bulk-row">
          <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
            <option value="SHORTLISTED">SHORTLISTED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="SELECTED">SELECTED</option>
          </select>
          <input
            value={bulkRemarks}
            onChange={(event) => setBulkRemarks(event.target.value)}
            placeholder="Bulk remarks"
          />
          <button type="button" className="btn btn-secondary" onClick={applyServerFilters}>Apply Server Filters</button>
          <button type="button" className="btn" onClick={runBulkStatusUpdate}>Bulk Update Selected</button>
        </div>

        <div className="table-summary">
          {pagedApplications.length} of {sortedApplications.length} applications shown
        </div>

        {loadingApplications ? (
          <div className="card inline-state">Loading applications...</div>
        ) : sortedApplications.length === 0 ? (
          <div className="card inline-state">No applications match the current filters.</div>
        ) : (
          <>
            <div className="table-scroll-wrap admin-table-wrap">
              <table className="data-table interactive-table admin-data-table">
              <thead>
                <tr>
                  <th className="col-select">Select</th>
                  <th className="col-student">
                    <button type="button" className="sort-btn" onClick={() => onSort('studentName')}>
                      Student{sortLabel('studentName')}
                    </button>
                  </th>
                  <th className="col-email">
                    <button type="button" className="sort-btn" onClick={() => onSort('studentEmail')}>
                      Email{sortLabel('studentEmail')}
                    </button>
                  </th>
                  <th className="col-job">
                    <button type="button" className="sort-btn" onClick={() => onSort('jobTitle')}>
                      Job{sortLabel('jobTitle')}
                    </button>
                  </th>
                  <th className="col-resume">Resume</th>
                  <th className="col-status">
                    <button type="button" className="sort-btn" onClick={() => onSort('status')}>
                      Status{sortLabel('status')}
                    </button>
                  </th>
                  <th className="col-review">Review Opinion</th>
                  <th className="col-date">
                    <button type="button" className="sort-btn" onClick={() => onSort('appliedDate')}>
                      Applied Date{sortLabel('appliedDate')}
                    </button>
                  </th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedApplications.map((application) => {
                  const expanded = expandedApplicationId === application.applicationId;

                  return (
                    <Fragment key={application.applicationId}>
                      <tr
                        className={`expandable-row ${expanded ? 'expanded' : ''}`}
                        onClick={() => setExpandedApplicationId(expanded ? null : application.applicationId)}
                      >
                        <td onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(application.applicationId)}
                            onChange={() => toggleSelect(application.applicationId)}
                          />
                        </td>
                        <td className="cell-primary">{application.studentName}</td>
                        <td className="cell-wrap cell-email">{application.studentEmail}</td>
                        <td className="cell-wrap">{application.jobTitle}</td>
                        <td onClick={(event) => event.stopPropagation()}>
                          {application.studentId ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              disabled={downloadingResumeApplicationId === application.applicationId}
                              onClick={() => downloadResume(application)}
                            >
                              {downloadingResumeApplicationId === application.applicationId ? 'Loading...' : 'Resume'}
                            </button>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td className="cell-status">{application.status}</td>
                        <td className="review-cell">{application.reviewOpinion}</td>
                        <td className="cell-date">{application.appliedDate}</td>
                        <td className="action-cell" onClick={(event) => event.stopPropagation()}>
                          <div className="inline-actions quick-actions">
                            <button
                              className="btn btn-secondary"
                              onClick={() => openActionPanel(application.applicationId, 'STATUS', { status: 'SHORTLISTED' })}
                            >
                              Shortlist
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => openActionPanel(application.applicationId, 'INTERVIEW')}
                            >
                              Interview
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => openActionPanel(application.applicationId, 'OFFER')}
                            >
                              Offer
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => openActionPanel(application.applicationId, 'STATUS', { status: 'REJECTED' })}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                      {activeActionApplicationId === application.applicationId ? (
                        <tr className="action-workspace-row">
                          <td colSpan={9} onClick={(event) => event.stopPropagation()}>
                            <div className="action-panel">
                              <div className="action-panel__header">
                                <h3>Action Workspace</h3>
                                <p>Run one action for {application.studentName}.</p>
                              </div>

                              <div className="action-panel__grid">
                                <div className="action-panel__row">
                                  <label>Action Type</label>
                                  <select
                                    value={(actionDrafts[application.applicationId] || defaultActionDraft).type}
                                    onChange={(event) => updateActionDraft(application.applicationId, { type: event.target.value })}
                                  >
                                    <option value="STATUS">Status Update</option>
                                    <option value="INTERVIEW">Schedule Interview</option>
                                    <option value="OFFER">Issue Offer</option>
                                  </select>
                                </div>

                                {(actionDrafts[application.applicationId] || defaultActionDraft).type === 'STATUS' ? (
                                  <div className="action-panel__row">
                                    <label>New Status</label>
                                    <select
                                      value={(actionDrafts[application.applicationId] || defaultActionDraft).status}
                                      onChange={(event) => updateActionDraft(application.applicationId, { status: event.target.value })}
                                    >
                                      <option value="SHORTLISTED">SHORTLISTED</option>
                                      <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
                                      <option value="OFFERED">OFFERED</option>
                                      <option value="SELECTED">SELECTED</option>
                                      <option value="REJECTED">REJECTED</option>
                                    </select>
                                  </div>
                                ) : null}

                                {(actionDrafts[application.applicationId] || defaultActionDraft).type === 'INTERVIEW' ? (
                                  <>
                                    <div className="action-panel__row">
                                      <label>Date &amp; Time</label>
                                      <input
                                        type="datetime-local"
                                        value={(actionDrafts[application.applicationId] || defaultActionDraft).scheduledAt}
                                        onChange={(event) => updateActionDraft(application.applicationId, { scheduledAt: event.target.value })}
                                      />
                                    </div>
                                    <div className="action-panel__row">
                                      <label>Mode</label>
                                      <select
                                        value={(actionDrafts[application.applicationId] || defaultActionDraft).mode}
                                        onChange={(event) => updateActionDraft(application.applicationId, { mode: event.target.value })}
                                      >
                                        <option value="ONLINE">ONLINE</option>
                                        <option value="OFFLINE">OFFLINE</option>
                                      </select>
                                    </div>
                                    <div className="action-panel__row">
                                      <label>Meeting Link</label>
                                      <input
                                        type="url"
                                        placeholder="https://..."
                                        value={(actionDrafts[application.applicationId] || defaultActionDraft).meetingLink}
                                        onChange={(event) => updateActionDraft(application.applicationId, { meetingLink: event.target.value })}
                                      />
                                    </div>
                                  </>
                                ) : null}

                                {(actionDrafts[application.applicationId] || defaultActionDraft).type === 'OFFER' ? (
                                  <div className="action-panel__row">
                                    <label>Offered CTC</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={(actionDrafts[application.applicationId] || defaultActionDraft).offeredCtc}
                                      onChange={(event) => updateActionDraft(application.applicationId, { offeredCtc: event.target.value })}
                                    />
                                  </div>
                                ) : null}

                                <div className="action-panel__row action-panel__row--wide">
                                  <label>Remarks</label>
                                  <input
                                    placeholder="Add remarks"
                                    value={(actionDrafts[application.applicationId] || defaultActionDraft).remarks}
                                    onChange={(event) => updateActionDraft(application.applicationId, { remarks: event.target.value })}
                                  />
                                </div>
                              </div>

                              <div className="action-panel__buttons">
                                <button
                                  className="btn"
                                  disabled={actionInFlightId === application.applicationId}
                                  onClick={() => submitRowAction(application.applicationId)}
                                >
                                  {actionInFlightId === application.applicationId ? 'Saving...' : 'Run Action'}
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  disabled={actionInFlightId === application.applicationId}
                                  onClick={() => setActiveActionApplicationId(null)}
                                >
                                  Close Workspace
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {expanded ? (
                        <tr className="detail-row">
                          <td colSpan={9}>
                            <div className="detail-grid">
                              <p><strong>Department:</strong> {application.studentDept}</p>
                              <p><strong>CGPA:</strong> {application.studentCgpa}</p>
                              <p><strong>Skills:</strong> {application.studentSkills}</p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
              </table>
            </div>

            <div className="pagination-wrap">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage((page) => Math.max(1, page - 1));
                  setExpandedApplicationId(null);
                }}
              >
                Previous
              </button>

              <div className="page-number-list">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`page-btn ${pageNumber === currentPage ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPage(pageNumber);
                      setExpandedApplicationId(null);
                    }}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage((page) => Math.min(totalPages, page + 1));
                  setExpandedApplicationId(null);
                }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
        </div>
      )}

      {/* ══ TAB: Interviews ══ */}
      {activeTab === 'interviews' && (
        <div className="tab-panel">
          <section className="card table-card">
            <div className="section-header-row">
              <h2 className="section-title">Interview Schedule</h2>
              <span className="text-muted">{interviews.length} scheduled</span>
            </div>
            {loadingInterviews ? (
              <div className="loading-state"><span className="spinner" />Loading interviews…</div>
            ) : interviews.length === 0 ? (
              <div className="empty-state">
                <p>No interviews scheduled yet.</p>
                <p className="text-muted">Schedule interviews from the Applications tab.</p>
              </div>
            ) : (
              <div className="table-scroll-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Job</th>
                      <th>Scheduled At</th>
                      <th>Mode</th>
                      <th>Status</th>
                      <th>Meeting Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.map((interview) => (
                      <tr key={interview.interviewId}>
                        <td className="cell-primary">{interview.application?.student?.name || 'N/A'}</td>
                        <td>{interview.application?.job?.title || 'N/A'}</td>
                        <td>{interview.scheduledAt || 'N/A'}</td>
                        <td>
                          <span className={`status-chip status-chip--${(interview.mode || '').toLowerCase()}`}>
                            {interview.mode || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-chip status-chip--${(interview.status || '').toLowerCase()}`}>
                            {interview.status || 'N/A'}
                          </span>
                        </td>
                        <td>
                          {interview.meetingLink
                            ? <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary">Join</a>
                            : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══ TAB: Offers ══ */}
      {activeTab === 'offers' && (
        <div className="tab-panel">
          <section className="card table-card">
            <div className="section-header-row">
              <h2 className="section-title">Offers Workspace</h2>
              <span className="text-muted">{adminOffers.length} offers</span>
            </div>
            {loadingAdminOffers ? (
              <div className="loading-state"><span className="spinner" />Loading offers…</div>
            ) : adminOffers.length === 0 ? (
              <div className="empty-state">
                <p>No offers issued yet.</p>
                <p className="text-muted">Issue offers from the Applications tab.</p>
              </div>
            ) : (
              <div className="table-scroll-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Job</th>
                      <th>Offered CTC</th>
                      <th>Offered Date</th>
                      <th>Status</th>
                      <th>Response Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminOffers.map((offer) => (
                      <tr key={offer.offerId}>
                        <td className="cell-primary">{offer.application?.student?.name || 'N/A'}</td>
                        <td>{offer.application?.job?.title || 'N/A'}</td>
                        <td>₹{Number(offer.offeredCtc || 0).toLocaleString()}</td>
                        <td>{offer.offeredDate || 'N/A'}</td>
                        <td>
                          <span className={`status-chip status-chip--${(offer.status || '').toLowerCase()}`}>
                            {offer.status || 'N/A'}
                          </span>
                        </td>
                        <td>{offer.responseDate || <span className="text-muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══ TAB: Analytics ══ */}
      {activeTab === 'analytics' && (
        <div className="tab-panel">
          {loadingAnalytics ? (
            <div className="card loading-state"><span className="spinner" />Loading analytics…</div>
          ) : !analytics ? (
            <div className="card empty-state"><p>Analytics are unavailable.</p></div>
          ) : (
            <>
              <div className="section-header-row" style={{ marginBottom: '1rem' }}>
                <h2 className="section-title">Placement Analytics</h2>
                <button className="btn btn-sm" onClick={downloadAnalytics}>⬇ Download PDF</button>
              </div>

              <div className="analytics-stat-grid">
                <div className="stat-card">
                  <strong>{analytics.totalApplications ?? '—'}</strong>
                  <p>Total Applications</p>
                </div>
                <div className="stat-card">
                  <strong>{analytics.selected ?? '—'}</strong>
                  <p>Selected</p>
                </div>
                <div className="stat-card">
                  <strong>{analytics.rejected ?? '—'}</strong>
                  <p>Rejected</p>
                </div>
                <div className="stat-card">
                  <strong>{analytics.offered ?? '—'}</strong>
                  <p>Offered</p>
                </div>
                <div className="stat-card">
                  <strong>{Number(analytics.selectionRate ?? 0).toFixed(1)}%</strong>
                  <p>Selection Rate</p>
                </div>
              </div>

              <section className="card table-card" style={{ marginTop: '1.5rem' }}>
                <h2 className="section-title">Applications by Job</h2>
                {(analytics.applicationsByJob || []).length === 0 ? (
                  <p className="text-muted">No job data available.</p>
                ) : (
                  <div className="stack-list">
                    {(() => {
                      const jobRows = analytics.applicationsByJob || [];
                      const maxCount = Math.max(1, ...jobRows.map((item) => Number(item[1] || 0)));
                      return jobRows.map(([jobTitle, count]) => (
                        <div key={jobTitle} className="bar-row">
                          <div className="bar-row__label">{jobTitle}</div>
                          <div className="bar-row__track">
                            <div className="bar-row__fill" style={{ width: `${(Number(count) / maxCount) * 100}%` }} />
                          </div>
                          <div className="bar-row__value">{count}</div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </section>

              <section className="card table-card" style={{ marginTop: '1.5rem' }}>
                <h2 className="section-title">Selected by Department</h2>
                {(analytics.selectedByDepartment || []).length === 0 ? (
                  <p className="text-muted">No department data available.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Selected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.selectedByDepartment || []).map(([department, count]) => (
                        <tr key={department}>
                          <td>{department}</td>
                          <td>{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </div>
      )}

    </div>
  );
}
