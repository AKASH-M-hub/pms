import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buildDeadlineCalendarEvent,
  buildGoogleCalendarUrl,
  buildInterviewCalendarEvent,
  downloadCalendarEvent,
} from '../lib/calendar';
import { api } from '../lib/api';
import { clearAuth, getToken, isStudent } from '../lib/auth';

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, toast };
}

const STUDENT_TABS = [
  { key: 'overview',     label: 'Overview' },
  { key: 'jobs',         label: 'Jobs' },
  { key: 'applications', label: 'Applications' },
  { key: 'interviews',   label: 'Interviews' },
  { key: 'offers',       label: 'Offers' },
  { key: 'calendar',     label: 'Calendar' },
  { key: 'profile',      label: 'Profile' },
  { key: 'feedback',     label: 'Feedback' },
];

const RESUME_PATH_CACHE_KEY = 'student_resume_path';
const RESUME_NAME_CACHE_KEY = 'student_resume_name';

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const { toasts, toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [profile, setProfile] = useState({
    name: '',
    dept: '',
    cgpa: '',
    skills: '',
    portfolioUrl: '',
  });
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [resumePath, setResumePath] = useState('');
  const [resumeDisplayName, setResumeDisplayName] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    applicationId: '',
    comment: '',
    rating: 5,
  });
  const [loading, setLoading] = useState(true);

  const [selectedJob, setSelectedJob] = useState(null);
  const [applyOpinion, setApplyOpinion] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [respondingOfferId, setRespondingOfferId] = useState(null);
  const [offerRemarks, setOfferRemarks] = useState('');

  const handleLogout = () => {
    localStorage.removeItem(RESUME_PATH_CACHE_KEY);
    localStorage.removeItem(RESUME_NAME_CACHE_KEY);
    clearAuth();
    navigate('/login', { replace: true });
  };

  const getFileNameFromPath = (path = '') => path.split(/[\\/]/).pop() || '';

  const cacheResumeState = (path, name) => {
    if (path) {
      localStorage.setItem(RESUME_PATH_CACHE_KEY, path);
    }
    if (name) {
      localStorage.setItem(RESUME_NAME_CACHE_KEY, name);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [jobsData, appsData, interviewsData, offersData, profileData, feedbackData] = await Promise.all([
        api.getJobs(),
        api.getStudentApplications(),
        api.getStudentInterviews(),
        api.getStudentOffers(),
        api.getStudentProfile(),
        api.getStudentFeedback(),
      ]);

      setJobs(jobsData);
      setApplications(appsData);
      setInterviews(interviewsData);
      setOffers(offersData);
      setFeedbackItems(feedbackData);

      if (profileData?.student) {
        const cachedResumePath = localStorage.getItem(RESUME_PATH_CACHE_KEY) || '';
        const cachedResumeName = localStorage.getItem(RESUME_NAME_CACHE_KEY) || '';
        setProfile({
          name: profileData.student.name || '',
          dept: profileData.student.dept || '',
          cgpa: profileData.student.cgpa ?? '',
          skills: profileData.student.skills || '',
          portfolioUrl: profileData.student.portfolioUrl || '',
        });
        const storedResumePath = profileData.student.resumePath || cachedResumePath;
        setResumePath(storedResumePath);
        const storedResumeName = getFileNameFromPath(storedResumePath) || cachedResumeName;
        setResumeDisplayName(storedResumeName);
        cacheResumeState(storedResumePath, storedResumeName);
        setProfileCompleteness(profileData.completeness?.percentage ?? 0);
      }
    } catch {
      clearAuth();
      toast('Session expired — please login again', 'error');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getToken() || !isStudent()) {
      clearAuth();
      navigate('/login');
      return;
    }
    loadDashboard();
  }, []);

  const upcomingInterviews = useMemo(
    () => interviews.filter((i) => i && i.status !== 'CANCELLED'),
    [interviews]
  );

  const activeOffers = useMemo(
    () => offers.filter((o) => !o.status || o.status === 'ISSUED' || o.status === 'ACCEPTED'),
    [offers]
  );

  const progressApplications = useMemo(
    () => applications.filter((a) => ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'SELECTED'].includes(a.status)).length,
    [applications]
  );

  const openJobs = useMemo(() => jobs.filter((j) => !j.applied), [jobs]);
  const appliedJobs = useMemo(() => jobs.filter((j) => j.applied), [jobs]);

  const firstName = profile.name?.trim()?.split(' ')[0] || 'Student';

  const nextInterview = useMemo(
    () => [...upcomingInterviews].sort((a, b) => Date.parse(a.scheduledAt || 0) - Date.parse(b.scheduledAt || 0))[0],
    [upcomingInterviews]
  );

  const overviewProgressPct = applications.length
    ? Math.round((progressApplications / applications.length) * 100)
    : 0;

  const calendarEvents = useMemo(() => {
    const deadlines = applications
      .filter((a) => a.job?.deadlineDate)
      .map((a) => ({
        kind: 'Deadline',
        label: a.job.deadlineDate,
        sourceId: `deadline-${a.applicationId}`,
        details: buildDeadlineCalendarEvent(a),
      }));
    const interviewEvts = interviews
      .filter((i) => i.scheduledAt)
      .map((i) => ({
        kind: 'Interview',
        label: i.scheduledAt,
        sourceId: `interview-${i.interviewId}`,
        details: buildInterviewCalendarEvent(i),
      }));
    return [...interviewEvts, ...deadlines].sort(
      (a, b) => a.details.start.getTime() - b.details.start.getTime()
    );
  }, [applications, interviews]);

  const tabBadge = {
    jobs:         openJobs.length,
  };

  const profileSkillTags = useMemo(
    () => (profile.skills || '')
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean),
    [profile.skills]
  );

  const shortlistedCount = useMemo(
    () => applications.filter((a) => ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'SELECTED'].includes(a.status)).length,
    [applications]
  );

  const profileStageLabel = useMemo(() => {
    if (profileCompleteness >= 90) return 'Placement Ready';
    if (profileCompleteness >= 70) return 'Strong Profile';
    if (profileCompleteness >= 40) return 'Building Momentum';
    return 'Needs Attention';
  }, [profileCompleteness]);

  const saveProfile = async () => {
    try {
      const payload = {
        ...profile,
        cgpa: profile.cgpa === '' ? null : Number(profile.cgpa),
      };
      const res = await api.updateStudentProfile(payload);
      setProfileCompleteness(res.completeness?.percentage ?? 0);
      if (res.student?.resumePath) {
        setResumePath(res.student.resumePath);
        const storedResumeName = getFileNameFromPath(res.student.resumePath);
        setResumeDisplayName(storedResumeName);
        cacheResumeState(res.student.resumePath, storedResumeName);
      }
      toast('Profile updated successfully');
    } catch (error) {
      toast(error.message || 'Failed to update profile', 'error');
    }
  };

  const uploadDocument = async (type, file) => {
    if (!file) {
      return;
    }
    try {
      if (type === 'resume') {
        setUploadingResume(true);
        setResumeDisplayName(file.name);
      }
      const uploadResponse = await api.uploadStudentDocument(type, file);
      toast(`${type} uploaded successfully`);
      const res = await api.getStudentProfile();
      const storedResumePath = res.student?.resumePath || uploadResponse?.resumePath || uploadResponse?.path || '';
      setResumePath(storedResumePath);
      if (type === 'resume') {
        const storedResumeName = getFileNameFromPath(storedResumePath) || file.name;
        setResumeDisplayName(storedResumeName);
        cacheResumeState(storedResumePath, storedResumeName);
      }
      setProfileCompleteness(res.completeness?.percentage ?? 0);
    } catch (error) {
      toast(error.message || 'Upload failed', 'error');
      if (type === 'resume') {
        setResumeDisplayName(getFileNameFromPath(resumePath));
      }
    } finally {
      if (type === 'resume') {
        setUploadingResume(false);
      }
    }
  };

  const resumeFileName = resumePath ? resumePath.split(/[\\/]/).pop() : '';

  const submitFeedback = async () => {
    if (!feedbackForm.applicationId || !feedbackForm.comment.trim()) {
      toast('Select an application and enter a comment', 'error');
      return;
    }

    try {
      await api.submitStudentFeedback({
        applicationId: Number(feedbackForm.applicationId),
        comment: feedbackForm.comment,
        rating: Number(feedbackForm.rating),
      });
      toast('Feedback submitted');
      setFeedbackForm({ applicationId: '', comment: '', rating: 5 });
      const list = await api.getStudentFeedback();
      setFeedbackItems(list);
    } catch (error) {
      toast(error.message || 'Failed to submit feedback', 'error');
    }
  };

  const openApplyModal = (job) => { setSelectedJob(job); setApplyOpinion(''); };

  const submitApply = async () => {
    if (!applyOpinion.trim()) { toast('Review opinion is required', 'error'); return; }
    try {
      setApplySubmitting(true);
      await api.applyJob(selectedJob.jobId, applyOpinion.trim());
      toast(`Applied to ${selectedJob.title} ✓`);
      setSelectedJob(null);
      const [jd, ad] = await Promise.all([api.getJobs(), api.getStudentApplications()]);
      setJobs(jd);
      setApplications(ad);
    } catch (err) {
      toast(err.message || 'Unable to apply', 'error');
    } finally {
      setApplySubmitting(false);
    }
  };

  const startOfferResponse = (offerId) => { setRespondingOfferId(offerId); setOfferRemarks(''); };

  const respondToOffer = async (offerId, accepted) => {
    try {
      await api.respondToOffer(offerId, { accepted, remarks: offerRemarks });
      toast(accepted ? 'Offer accepted!' : 'Offer declined');
      setRespondingOfferId(null);
      setOfferRemarks('');
      const updated = await api.getStudentOffers();
      setOffers(updated);
    } catch (err) {
      toast(err.message || 'Could not update offer response', 'error');
    }
  };

  return (
    <div className="container">
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
        ))}
      </div>

      <div className="page-header">
        <div>
          <h1>Student Dashboard</h1>
          <p>Welcome back, {firstName}. Track your placement journey here.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>Logout</button>
      </div>

      {loading ? (
        <div className="card loading-state">
          <div className="spinner" />
          <p>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          <nav className="tab-nav">
            {STUDENT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tab-btn ${activeTab === tab.key ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tabBadge[tab.key] ? <span className="tab-badge">{tabBadge[tab.key]}</span> : null}
              </button>
            ))}
          </nav>

          {/* ── OVERVIEW ──────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="tab-panel">
              <section className="student-hero card">
                <div className="student-hero__intro">
                  <span className="hero-kicker">Placement Journey</span>
                  <h2>{firstName}, stay in momentum.</h2>
                  <p>Track. Apply. Convert.</p>
                  <div className="hero-mini-row">
                    <span className="hero-mini-pill">Focus score {overviewProgressPct}%</span>
                    <span className="hero-mini-pill">Profile {profileCompleteness}%</span>
                  </div>
                </div>
                <div className="student-hero__visual">
                  <div className="hero-orbit">
                    <div className="hero-orbit__core">{overviewProgressPct}%</div>
                  </div>
                  <div className="student-hero__metrics">
                    <div className="hero-metric"><strong>{applications.length}</strong><span>Application</span></div>
                    <div className="hero-metric"><strong>{upcomingInterviews.length}</strong><span>Interviews</span></div>
                    <div className="hero-metric"><strong>{activeOffers.length}</strong><span>Offers</span></div>
                  </div>
                </div>
              </section>

              <section className="student-dashboard-grid">
                <div className="card spotlight-card">
                  <span className="nav-card__eyebrow">Progress</span>
                  <h3>{progressApplications}/{applications.length || 0}</h3>
                  <p>In pipeline</p>
                </div>
                <div className="card spotlight-card spotlight-card--accent">
                  <span className="nav-card__eyebrow">Next Step</span>
                  <h3>{nextInterview ? 'Interview' : 'No interview'}</h3>
                  <p>
                    {nextInterview
                      ? `${nextInterview.application?.job?.title || 'Role'} • ${nextInterview.scheduledAt}`
                      : 'Keep applying'}
                  </p>
                </div>
                <div className="card spotlight-card">
                  <span className="nav-card__eyebrow">Open Roles</span>
                  <h3>{openJobs.length}</h3>
                  <p>Ready to apply</p>
                </div>
              </section>
            </div>
          )}

          {/* ── JOBS ──────────────────────────────────────── */}
          {activeTab === 'jobs' && (
            <div className="tab-panel">
              <div className="section-header-row">
                <h2>Available Jobs</h2>
                <p>{openJobs.length} role{openJobs.length !== 1 ? 's' : ''} open</p>
              </div>
              {openJobs.length === 0 ? (
                <div className="card empty-state"><p>You have applied to all available jobs.</p></div>
              ) : (
                <div className="job-grid">
                  {openJobs.map((job) => (
                    <div key={job.jobId} className="job-card">
                      <div>
                        <span className="nav-card__eyebrow">Open Role</span>
                        <h3>{job.title}</h3>
                      </div>
                      <div className="job-meta">
                        <p>Salary: ₹{Number(job.salary || 0).toLocaleString('en-IN')}</p>
                        <p>Min CGPA: {job.eligibilityCgpa}</p>
                        <p>Deadline: {job.deadlineDate}</p>
                        {job.registrationLink
                          ? <a href={job.registrationLink} target="_blank" rel="noreferrer">Registration Link ↗</a>
                          : null}
                      </div>
                      <button className="btn" onClick={() => openApplyModal(job)}>Apply Now</button>
                    </div>
                  ))}
                </div>
              )}
              {appliedJobs.length > 0 && (
                <>
                  <div className="section-header-row" style={{ marginTop: 28 }}>
                    <h2>Already Applied</h2>
                  </div>
                  <div className="job-grid">
                    {appliedJobs.map((job) => (
                      <div key={job.jobId} className="job-card job-card--applied">
                        <div>
                          <span className="nav-card__eyebrow">Applied</span>
                          <h3>{job.title}</h3>
                        </div>
                        <div className="job-meta">
                          <p>Salary: ₹{Number(job.salary || 0).toLocaleString('en-IN')}</p>
                          <p>Deadline: {job.deadlineDate}</p>
                        </div>
                        <span className="status-chip status-chip--applied">Applied ✓</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── APPLICATIONS ──────────────────────────────── */}
          {activeTab === 'applications' && (
            <div className="tab-panel">
              <div className="section-header-row">
                <h2>Your Applications</h2>
                <p>{applications.length} total</p>
              </div>
              {applications.length === 0 ? (
                <div className="card empty-state">
                  <p>No applications yet.</p>
                  <button className="btn" onClick={() => setActiveTab('jobs')}>Browse Jobs</button>
                </div>
              ) : (
                <div className="card table-card">
                  <div className="table-scroll-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Job Title</th>
                          <th>Status</th>
                          <th>Applied Date</th>
                          <th>Review Opinion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app, idx) => (
                          <tr key={app.applicationId}>
                            <td>{idx + 1}</td>
                            <td className="cell-primary">{app.job?.title || 'N/A'}</td>
                            <td>
                              <span className={`status-chip status-chip--${(app.status || '').toLowerCase()}`}>
                                {app.status}
                              </span>
                            </td>
                            <td>{app.appliedDate || 'N/A'}</td>
                            <td className="review-cell">{app.reviewOpinion || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── INTERVIEWS ────────────────────────────────── */}
          {activeTab === 'interviews' && (
            <div className="tab-panel">
              <div className="section-header-row">
                <h2>Interview Schedule</h2>
                <p>{upcomingInterviews.length} upcoming</p>
              </div>
              {interviews.length === 0 ? (
                <div className="card empty-state"><p>No interviews scheduled yet.</p></div>
              ) : (
                <div className="card table-card">
                  <div className="table-scroll-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Company / Job</th>
                          <th>Scheduled At</th>
                          <th>Mode</th>
                          <th>Status</th>
                          <th>Join</th>
                          <th>Calendar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interviews.map((interview) => {
                          const event = buildInterviewCalendarEvent(interview);
                          return (
                            <tr
                              key={interview.interviewId}
                              className={interview.status === 'CANCELLED' ? 'row-muted' : ''}
                            >
                              <td className="cell-primary">{interview.application?.job?.title || 'N/A'}</td>
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
                                  ? <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="btn btn-sm">Join ↗</a>
                                  : '—'}
                              </td>
                              <td>
                                <div className="inline-actions">
                                  <button className="btn btn-sm btn-secondary" onClick={() => downloadCalendarEvent(event)}>ICS</button>
                                  <a className="btn btn-sm" href={buildGoogleCalendarUrl(event)} target="_blank" rel="noreferrer">Google</a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── OFFERS ────────────────────────────────────── */}
          {activeTab === 'offers' && (
            <div className="tab-panel">
              <div className="section-header-row">
                <h2>Your Offers</h2>
                <p>{activeOffers.length} pending response</p>
              </div>
              {offers.length === 0 ? (
                <div className="card empty-state"><p>No offers yet — keep going!</p></div>
              ) : (
                <div className="card table-card">
                  <div className="table-scroll-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Job</th>
                          <th>Offered CTC</th>
                          <th>Offered Date</th>
                          <th>Status</th>
                          <th>Remarks</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offers.map((offer) => {
                          const ctc = offer.offeredCtc ?? offer.offeredCTC ?? offer.offered_ctc ?? offer.application?.job?.salary;
                          const ctcDisplay = (ctc !== null && ctc !== undefined && !Number.isNaN(Number(ctc)))
                            ? `₹${Number(ctc).toLocaleString('en-IN')}`
                            : 'N/A';
                          const isResponding = respondingOfferId === offer.offerId;
                          return (
                            <Fragment key={offer.offerId}>
                              <tr>
                                <td className="cell-primary">{offer.application?.job?.title || 'N/A'}</td>
                                <td><strong>{ctcDisplay}</strong></td>
                                <td>{offer.offeredDate || 'N/A'}</td>
                                <td>
                                  <span className={`status-chip status-chip--${(offer.status || '').toLowerCase()}`}>
                                    {offer.status || 'N/A'}
                                  </span>
                                </td>
                                <td>{offer.remarks || '—'}</td>
                                <td>
                                  {offer.status === 'ISSUED'
                                    ? (!isResponding && <button className="btn btn-sm" onClick={() => startOfferResponse(offer.offerId)}>Respond</button>)
                                    : <span className="text-muted">Completed</span>}
                                </td>
                              </tr>
                              {isResponding && (
                                <tr className="action-workspace-row">
                                  <td colSpan={6}>
                                    <div className="offer-respond-panel">
                                      <div className="field">
                                        <label>Remarks (optional)</label>
                                        <input
                                          value={offerRemarks}
                                          onChange={(e) => setOfferRemarks(e.target.value)}
                                          placeholder="Add a note..."
                                        />
                                      </div>
                                      <div className="inline-actions">
                                        <button className="btn" onClick={() => respondToOffer(offer.offerId, true)}>Accept Offer</button>
                                        <button className="btn btn-secondary" onClick={() => respondToOffer(offer.offerId, false)}>Decline</button>
                                        <button className="btn btn-muted" onClick={() => setRespondingOfferId(null)}>Cancel</button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CALENDAR ──────────────────────────────────── */}
          {activeTab === 'calendar' && (
            <div className="tab-panel">
              <div className="section-header-row">
                <h2>Placement Calendar</h2>
                <p>Open events in Google Calendar</p>
              </div>
              {calendarEvents.length === 0 ? (
                <div className="card empty-state"><p>No calendar events yet.</p></div>
              ) : (
                <div className="stack-list">
                  {calendarEvents.map((event) => (
                    <section key={event.sourceId} className="card calendar-card">
                      <div className="calendar-card__content">
                        <div>
                          <span className={`status-chip status-chip--${event.kind.toLowerCase()}`}>{event.kind}</span>
                          <h3 style={{ marginTop: 8 }}>{event.details.title}</h3>
                          <p>{event.label}</p>
                          {event.details.description ? <p>{event.details.description}</p> : null}
                        </div>
                        <div className="inline-actions">
                          <a className="btn btn-secondary" href={buildGoogleCalendarUrl(event.details)} target="_blank" rel="noreferrer">
                            Google Calendar
                          </a>
                        </div>
                  </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE ───────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="tab-panel">
              <div className="section-header-row"><h2>Profile &amp; Documents</h2></div>
              <div className="profile-pro-layout">
                <section className="card profile-hero-panel">
                  <div className="profile-hero-panel__content">
                    <span className="hero-kicker">Student Profile</span>
                    <h3>{firstName}, keep this profile interview-ready.</h3>
                    <p>Your profile strength directly affects shortlisting and interview visibility.</p>
                    <div className="profile-hero-tags">
                      <span className="profile-pill">{profileStageLabel}</span>
                      <span className="profile-pill">{profileCompleteness}% complete</span>
                    </div>
                  </div>
                  <div className="profile-progress-ring" style={{ '--profile-progress': `${profileCompleteness}%` }}>
                    <div className="profile-progress-ring__inner">
                      <strong>{profileCompleteness}%</strong>
                      <span>Complete</span>
                    </div>
                  </div>
                </section>

                <section className="profile-kpi-grid">
                  <article className="card profile-kpi-card">
                    <span>Applications</span>
                    <strong>{applications.length}</strong>
                    <small>Total submitted</small>
                  </article>
                  <article className="card profile-kpi-card">
                    <span>Shortlisted</span>
                    <strong>{shortlistedCount}</strong>
                    <small>Moving ahead</small>
                  </article>
                  <article className="card profile-kpi-card">
                    <span>Interviews</span>
                    <strong>{upcomingInterviews.length}</strong>
                    <small>Scheduled</small>
                  </article>
                  <article className="card profile-kpi-card">
                    <span>Offers</span>
                    <strong>{activeOffers.length}</strong>
                    <small>Active pipeline</small>
                  </article>
                </section>

                <section className="profile-editor-grid">
                  <div className="card profile-editor-card">
                    <div className="profile-completeness-bar">
                      <div className="profile-completeness-bar__label">
                        <span>Profile Completeness</span>
                        <strong>{profileCompleteness}%</strong>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${profileCompleteness}%` }} />
                      </div>
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label>Name</label>
                        <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Department</label>
                        <input value={profile.dept} onChange={(e) => setProfile({ ...profile, dept: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>CGPA</label>
                        <input type="number" step="0.01" value={profile.cgpa} onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Skills</label>
                        <input value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} />
                      </div>
                      <div className="field" style={{ gridColumn: '1 / -1' }}>
                        <label>Portfolio URL</label>
                        <input value={profile.portfolioUrl} onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })} />
                      </div>
                    </div>
                    <div className="actions">
                      <button className="btn" onClick={saveProfile}>Save Profile</button>
                    </div>
                    <div className="document-row">
                      <label className="upload-control">
                        {uploadingResume ? 'Uploading Resume...' : 'Upload Resume'}
                        <input
                          type="file"
                          onChange={(e) => uploadDocument('resume', e.target.files?.[0])}
                          disabled={uploadingResume}
                        />
                      </label>
                    </div>
                    <p className="inline-state">
                      {resumePath
                        ? `Stored resume: ${resumeDisplayName || resumeFileName}`
                        : (resumeDisplayName ? `Selected: ${resumeDisplayName}` : 'No resume uploaded yet.')}
                    </p>
                  </div>

                  <aside className="card profile-insights-card">
                    <h3 className="section-title">Profile Insights</h3>
                    <div className="stack-list">
                      <div className="mini-card">
                        <strong>Current CGPA</strong>
                        <p>{profile.cgpa !== '' ? profile.cgpa : 'Add your CGPA to improve matching.'}</p>
                      </div>
                      <div className="mini-card">
                        <strong>Resume Status</strong>
                        <p>{resumePath ? 'Resume is uploaded and available.' : 'Upload your resume to complete profile.'}</p>
                      </div>
                      <div className="mini-card">
                        <strong>Skills Snapshot</strong>
                        {profileSkillTags.length > 0 ? (
                          <div className="skill-chip-wrap">
                            {profileSkillTags.slice(0, 10).map((skill) => (
                              <span key={skill} className="skill-chip">{skill}</span>
                            ))}
                          </div>
                        ) : (
                          <p>Add comma-separated skills to highlight your strengths.</p>
                        )}
                      </div>
                    </div>
                  </aside>
                </section>
              </div>
            </div>
          )}

          {/* ── FEEDBACK ──────────────────────────────────── */}
          {activeTab === 'feedback' && (
            <div className="tab-panel">
              <div className="section-header-row"><h2>Submit Feedback</h2></div>
              <div className="card">
                <div className="form-grid">
                  <div className="field">
                    <label>Application</label>
                    <select
                      value={feedbackForm.applicationId}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, applicationId: e.target.value })}
                    >
                      <option value="">Select an application</option>
                      {applications.map((a) => (
                        <option key={a.applicationId} value={a.applicationId}>
                          {(a.job?.title || 'Job')} — {a.status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Rating</label>
                    <select
                      value={feedbackForm.rating}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: e.target.value })}
                    >
                      {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v} star{v !== 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label>Comment</label>
                    <textarea
                      rows={4}
                      value={feedbackForm.comment}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                      placeholder="Share your placement experience..."
                    />
                  </div>
                </div>
                <div className="actions">
                  <button className="btn" onClick={submitFeedback}>Submit Feedback</button>
                </div>
              </div>
              <div className="section-header-row" style={{ marginTop: 24 }}>
                <h2>Feedback History</h2>
                <p>{feedbackItems.length} submitted</p>
              </div>
              <div className="stack-list">
                {feedbackItems.length === 0 ? (
                  <div className="mini-card">
                    <strong>No feedback yet</strong>
                    <p>Submitted feedback will appear here.</p>
                  </div>
                ) : feedbackItems.map((item) => (
                  <div key={item.feedbackId} className="mini-card">
                    <div className="mini-card__header">
                      <strong>{item.application?.job?.title || 'Application'}</strong>
                      <span className="rating-stars">
                        {'★'.repeat(item.rating || 0)}{'☆'.repeat(5 - (item.rating || 0))}
                      </span>
                    </div>
                    <p>{item.comment}</p>
                    {item.submittedAt ? <small>{item.submittedAt}</small> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── APPLY MODAL ───────────────────────────────── */}
          {selectedJob && (
            <div
              className="modal-overlay"
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedJob(null); }}
            >
              <div className="modal-card">
                <div className="modal-header">
                  <div>
                    <span className="nav-card__eyebrow">Apply Now</span>
                    <h2>{selectedJob.title}</h2>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedJob(null)}>✕</button>
                </div>
                <div className="job-review-meta">
                  <p><strong>Salary:</strong> ₹{Number(selectedJob.salary || 0).toLocaleString('en-IN')}</p>
                  <p><strong>Min CGPA:</strong> {selectedJob.eligibilityCgpa}</p>
                  <p><strong>Deadline:</strong> {selectedJob.deadlineDate}</p>
                  {selectedJob.registrationLink
                    ? <p><a href={selectedJob.registrationLink} target="_blank" rel="noreferrer">Registration Link ↗</a></p>
                    : null}
                </div>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Your Review Opinion <span style={{ color: '#e53e3e' }}>*</span></label>
                  <textarea
                    rows={5}
                    placeholder="Why are you interested in this role? Mention your suitability and motivation."
                    value={applyOpinion}
                    onChange={(e) => setApplyOpinion(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="inline-actions" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedJob(null)} disabled={applySubmitting}>Cancel</button>
                  <button className="btn" onClick={submitApply} disabled={applySubmitting}>
                    {applySubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
