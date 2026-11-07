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
  getMyJob,
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

export {
  researchCountries,
  researchOverview,
  researchEmployers,
  researchEmployerRoles,
  type ResearchFilter,
  type ResearchSummary,
  type WeekRow,
  type FacetRow,
  type TagRow,
  type EmployerRow,
  type RoleRow,
} from './research'

export {
  getMyProfile,
  saveMyProfile,
  listMyMatches,
  EMPTY_PROFILE,
  type Profile,
} from './profile'

export {
  listMyTailored,
  getMyTailored,
  setTailoredStatus,
  TAILORED_STATUSES,
  type TailoredApplication,
  type TailoredSummary,
  type TailoredStatus,
  type TailoredAnswer,
} from './tailored'

export {
  listMyLeads,
  LEAD_DECISIONS,
  VERIFICATION_STATES,
  type LeadRow,
  type LeadDecision,
  type VerificationState,
} from './leads'
