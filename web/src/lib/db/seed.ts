import { app } from '../app'
import { ensureMigrated, rid } from './core'

const DAY = 86_400_000

const COMPANIES = [
  { name: 'Canva', slug: 'canva', industry: 'Design Technology', size: '1000+', location: 'Sydney, NSW', website: 'https://canva.com', description: 'Canva is a global online visual communications platform with a mission to empower everyone in the world to design.' },
  { name: 'Atlassian', slug: 'atlassian', industry: 'Enterprise Software', size: '5000+', location: 'Sydney, NSW', website: 'https://atlassian.com', description: 'Atlassian builds software that helps teams collaborate and work smarter together.' },
  { name: 'SafetyCulture', slug: 'safetyculture', industry: 'SaaS / Workplace Safety', size: '500-1000', location: 'Sydney, NSW', website: 'https://safetyculture.com', description: 'SafetyCulture is a global technology company that helps working teams get better every day.' },
  { name: 'Buildkite', slug: 'buildkite', industry: 'Developer Tools', size: '50-100', location: 'Melbourne, VIC', website: 'https://buildkite.com', description: 'Buildkite is a platform for running fast, secure, and scalable continuous integration pipelines.' },
  { name: 'Culture Amp', slug: 'culture-amp', industry: 'HR Technology', size: '500-1000', location: 'Melbourne, VIC', website: 'https://cultureamp.com', description: 'Culture Amp is the world\'s leading employee experience platform, helping companies improve employee engagement and retention.' },
  { name: 'Linktree', slug: 'linktree', industry: 'Social Media', size: '200-500', location: 'Melbourne, VIC', website: 'https://linktr.ee', description: 'Linktree empowers creators and brands to curate their online presence with a single link.' },
]

const JOBS: Array<{
  companySlug: string
  title: string
  category: string
  location: string
  locationType: string
  employmentType: string
  salaryMin: number | null
  salaryMax: number | null
  experienceLevel: string
  daysAgo: number
  description: string
}> = [
  { companySlug: 'canva', title: 'Senior Frontend Engineer', category: 'Engineering', location: 'Sydney, NSW', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 180000, salaryMax: 220000, experienceLevel: 'senior', daysAgo: 1, description: '<p>We are looking for a Senior Frontend Engineer to join our Design Platform team. You will be working on Canva\'s core editing experience used by over 100 million monthly users.</p><h3>What you\'ll do</h3><ul><li>Build and maintain high-performance UI components</li><li>Collaborate with designers and product managers to ship features</li><li>Mentor junior engineers and contribute to technical direction</li><li>Write well-tested, production-quality code in TypeScript and React</li></ul><h3>What we\'re looking for</h3><ul><li>5+ years experience with modern frontend frameworks</li><li>Strong TypeScript skills</li><li>Experience with performance optimisation at scale</li><li>Excellent communication and collaboration skills</li></ul>' },
  { companySlug: 'canva', title: 'Product Designer', category: 'Design', location: 'Sydney, NSW', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 140000, salaryMax: 180000, experienceLevel: 'mid', daysAgo: 3, description: '<p>Join Canva\'s product design team to shape the future of visual communication. You will work on features used by millions of people worldwide.</p><h3>Responsibilities</h3><ul><li>Design end-to-end user experiences from research to implementation</li><li>Create wireframes, prototypes, and high-fidelity designs</li><li>Collaborate with cross-functional teams</li><li>Contribute to our design system</li></ul>' },
  { companySlug: 'atlassian', title: 'Staff Software Engineer — Jira', category: 'Engineering', location: 'Sydney, NSW', locationType: 'remote', employmentType: 'full-time', salaryMin: 220000, salaryMax: 280000, experienceLevel: 'staff', daysAgo: 2, description: '<p>Atlassian is looking for a Staff Software Engineer to lead technical initiatives on the Jira platform. You will drive architectural decisions that impact millions of users.</p><h3>Key responsibilities</h3><ul><li>Lead design and implementation of complex distributed systems</li><li>Set technical direction for a team of 8-10 engineers</li><li>Drive cross-team collaboration on platform-wide initiatives</li><li>Improve system reliability and performance at scale</li></ul>' },
  { companySlug: 'atlassian', title: 'Engineering Manager — Cloud Platform', category: 'Engineering', location: 'Sydney, NSW', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 240000, salaryMax: 300000, experienceLevel: 'senior', daysAgo: 5, description: '<p>Lead a team of talented engineers building Atlassian\'s cloud infrastructure. This role combines people leadership with technical excellence.</p><h3>What you\'ll do</h3><ul><li>Manage and grow a team of 6-8 engineers</li><li>Drive technical roadmap and delivery</li><li>Partner with product and design on strategy</li><li>Foster an inclusive and high-performing team culture</li></ul>' },
  { companySlug: 'atlassian', title: 'Marketing Analyst', category: 'Marketing', location: 'Sydney, NSW', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 100000, salaryMax: 130000, experienceLevel: 'mid', daysAgo: 7, description: '<p>Join the marketing analytics team to drive data-informed decision making across Atlassian\'s go-to-market organisation.</p><h3>Responsibilities</h3><ul><li>Analyse campaign performance and customer acquisition data</li><li>Build dashboards and reports for stakeholders</li><li>Identify growth opportunities through data analysis</li><li>Partner with marketing teams to optimise spend</li></ul>' },
  { companySlug: 'safetyculture', title: 'Full-Stack Developer', category: 'Engineering', location: 'Sydney, NSW', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 140000, salaryMax: 180000, experienceLevel: 'mid', daysAgo: 4, description: '<p>SafetyCulture is looking for a Full-Stack Developer to build features that help frontline workers stay safe and productive.</p><h3>Tech stack</h3><ul><li>React, TypeScript, Go</li><li>PostgreSQL, Redis, Kafka</li><li>AWS, Kubernetes</li></ul><h3>Requirements</h3><ul><li>3+ years full-stack experience</li><li>Strong problem-solving skills</li><li>Passion for building great products</li></ul>' },
  { companySlug: 'safetyculture', title: 'Sales Development Representative', category: 'Sales', location: 'Sydney, NSW', locationType: 'onsite', employmentType: 'full-time', salaryMin: 70000, salaryMax: 90000, experienceLevel: 'junior', daysAgo: 6, description: '<p>Join our sales team and help safety-focused organisations discover SafetyCulture. This is a great entry point into SaaS sales.</p><h3>What you\'ll do</h3><ul><li>Research and prospect into target accounts</li><li>Qualify inbound leads and book demos</li><li>Collaborate with Account Executives</li><li>Exceed monthly meeting and pipeline targets</li></ul>' },
  { companySlug: 'buildkite', title: 'Senior Backend Engineer (Go)', category: 'Engineering', location: 'Melbourne, VIC', locationType: 'remote', employmentType: 'full-time', salaryMin: 170000, salaryMax: 210000, experienceLevel: 'senior', daysAgo: 3, description: '<p>Buildkite is hiring a Senior Backend Engineer to work on our CI/CD pipeline infrastructure. We\'re a remote-first company building tools developers love.</p><h3>What you\'ll work on</h3><ul><li>Distributed job scheduling and execution</li><li>API design and implementation in Go</li><li>Scaling infrastructure to handle millions of builds</li><li>Observability and reliability improvements</li></ul>' },
  { companySlug: 'buildkite', title: 'DevOps Engineer', category: 'Engineering', location: 'Melbourne, VIC', locationType: 'remote', employmentType: 'contract', salaryMin: 900, salaryMax: 1100, experienceLevel: 'mid', daysAgo: 8, description: '<p>We need a DevOps contractor to help us improve our Kubernetes infrastructure and deployment pipelines.</p><h3>Requirements</h3><ul><li>Strong Kubernetes and Terraform experience</li><li>AWS expertise</li><li>CI/CD pipeline design</li><li>6-month initial contract with potential extension</li></ul>' },
  { companySlug: 'culture-amp', title: 'People Scientist', category: 'HR', location: 'Melbourne, VIC', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 120000, salaryMax: 150000, experienceLevel: 'mid', daysAgo: 2, description: '<p>As a People Scientist at Culture Amp, you\'ll use data and research to help organisations build better workplaces.</p><h3>Responsibilities</h3><ul><li>Analyse employee engagement survey data</li><li>Develop insights and recommendations for customers</li><li>Contribute to thought leadership content</li><li>Build scalable frameworks for people analytics</li></ul>' },
  { companySlug: 'culture-amp', title: 'Senior Product Manager', category: 'Operations', location: 'Melbourne, VIC', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 160000, salaryMax: 200000, experienceLevel: 'senior', daysAgo: 10, description: '<p>Lead product strategy for Culture Amp\'s performance management suite. You\'ll define the roadmap and work closely with engineering and design to deliver impactful features.</p><h3>Requirements</h3><ul><li>5+ years product management experience</li><li>B2B SaaS background</li><li>Strong analytical and communication skills</li><li>Experience with HR technology is a plus</li></ul>' },
  { companySlug: 'linktree', title: 'React Native Engineer', category: 'Engineering', location: 'Melbourne, VIC', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 150000, salaryMax: 190000, experienceLevel: 'mid', daysAgo: 1, description: '<p>Help build Linktree\'s mobile experience used by millions of creators worldwide. You\'ll work on our React Native app across iOS and Android.</p><h3>What we\'re looking for</h3><ul><li>3+ years React Native experience</li><li>Strong JavaScript/TypeScript skills</li><li>Experience with native module bridging</li><li>Passion for mobile UX</li></ul>' },
  { companySlug: 'linktree', title: 'Legal Counsel', category: 'Legal', location: 'Melbourne, VIC', locationType: 'hybrid', employmentType: 'full-time', salaryMin: 140000, salaryMax: 180000, experienceLevel: 'mid', daysAgo: 12, description: '<p>Join Linktree\'s legal team to support commercial contracts, privacy compliance, and intellectual property matters.</p><h3>Responsibilities</h3><ul><li>Draft and negotiate commercial agreements</li><li>Advise on privacy and data protection</li><li>Support IP portfolio management</li><li>Provide legal guidance to business teams</li></ul>' },
  { companySlug: 'canva', title: 'Data Engineer', category: 'Engineering', location: 'Sydney, NSW', locationType: 'remote', employmentType: 'full-time', salaryMin: 160000, salaryMax: 200000, experienceLevel: 'mid', daysAgo: 5, description: '<p>Build and maintain the data infrastructure that powers Canva\'s analytics and machine learning systems.</p><h3>Tech stack</h3><ul><li>Python, Spark, Airflow</li><li>BigQuery, dbt</li><li>Kafka, streaming pipelines</li></ul>' },
  { companySlug: 'safetyculture', title: 'UX Researcher', category: 'Design', location: 'Sydney, NSW', locationType: 'onsite', employmentType: 'part-time', salaryMin: 70000, salaryMax: 90000, experienceLevel: 'mid', daysAgo: 9, description: '<p>Conduct user research to help SafetyCulture build products that truly serve frontline workers. Part-time role (3 days/week).</p><h3>Responsibilities</h3><ul><li>Plan and conduct user interviews and usability tests</li><li>Synthesise findings into actionable insights</li><li>Present research to product and design teams</li><li>Build and maintain a research repository</li></ul>' },
  { companySlug: 'culture-amp', title: 'Finance Manager', category: 'Finance', location: 'Melbourne, VIC', locationType: 'onsite', employmentType: 'full-time', salaryMin: 130000, salaryMax: 160000, experienceLevel: 'senior', daysAgo: 14, description: '<p>Lead financial planning and analysis for Culture Amp\'s APAC operations. You\'ll partner with leadership to drive strategic decision-making.</p><h3>Requirements</h3><ul><li>CPA/CA qualified</li><li>5+ years FP&A experience</li><li>SaaS metrics experience preferred</li><li>Strong Excel/modeling skills</li></ul>' },
]

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

let seeded = false

/**
 * Seeds the database with sample companies and jobs if the tables are empty.
 * Safe to call on every mount — exits immediately if data already exists.
 */
export async function seedIfEmpty(): Promise<void> {
  if (seeded) return
  await ensureMigrated()

  const { rows } = await app.db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM companies`,
    [],
  )
  if ((rows[0]?.cnt ?? 0) > 0) {
    seeded = true
    return
  }

  const now = Date.now()
  const companyIds = new Map<string, string>()

  // Insert companies
  for (const c of COMPANIES) {
    const id = rid()
    companyIds.set(c.slug, id)
    await app.db.execute(
      `INSERT INTO companies (id, name, slug, logo_url, description, website, location, industry, size, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, c.name, c.slug, null, c.description, c.website, c.location, c.industry, c.size, now],
    )
  }

  // Insert jobs
  for (const j of JOBS) {
    const companyId = companyIds.get(j.companySlug)!
    const postedAt = now - j.daysAgo * DAY
    await app.db.execute(
      `INSERT INTO jobs (id, company_id, title, slug, description, location, location_type,
                         salary_min, salary_max, salary_currency, employment_type, category,
                         experience_level, posted_at, expires_at, source, source_url, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        rid(), companyId, j.title, slugify(j.title), j.description,
        j.location, j.locationType, j.salaryMin, j.salaryMax, 'AUD',
        j.employmentType, j.category, j.experienceLevel, postedAt, null,
        'manual', null, 'active', now,
      ],
    )
  }

  seeded = true
}
