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

export { seedIfEmpty } from './seed'
