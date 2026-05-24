/**
 * Public D1 API barrel for the Jobs app.
 *
 * All callsites outside `lib/db/` should import from `../lib/db` (this file).
 */

export { ensureMigrated } from './core'

export {
  listJobs,
  countJobs,
  getJob,
  getJobBySlug,
  searchJobs,
  type JobRow,
  type JobWithCompany,
  type ListJobsOpts,
} from './jobs'

export {
  listCompanies,
  getCompany,
  getCompanyBySlug,
  getCompanyJobs,
  type CompanyRow,
} from './companies'

export {
  isJobSaved,
  saveJob,
  unsaveJob,
  listSavedJobs,
} from './saved'

export {
  applyToJob,
  withdrawApplication,
  listApplications,
  getApplicationStatus,
  updateApplicationNote,
  type ApplicationRow,
  type ApplicationWithJob,
} from './applications'

export {
  recordView,
  listRecentViews,
  clearRecentViews,
} from './views'

export {
  registerCompany,
  updateCompany,
  getMyCompanies,
  isCompanyOwner,
  postJob,
  updateJob,
  closeJob,
  getMyJobs,
  getJobApplicants,
  updateApplicantStatus,
  type PostJobData,
  type UpdateJobData,
} from './employer'

export {
  listNotifications,
  markRead,
  markAllRead,
  countUnread,
  type NotificationRow,
} from './notifications'
