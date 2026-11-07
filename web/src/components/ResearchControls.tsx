import { useEffect, useState } from 'react'
import { researchCountries, getMyProfile } from '../lib/db'
import { COUNTRIES, PERIODS, countryName, readResearchPrefs, writeResearchPrefs } from '../lib/research-prefs'
import { selectClass } from '../lib/constants'

/** Country + period for the research pages; defaults to the profile's country. */
export function useResearchScope() {
  const saved = readResearchPrefs()
  const [country, setCountry] = useState<string | null>(saved.country)
  const [days, setDays] = useState(saved.days)
  const [countries, setCountries] = useState<{ country: string; postings: number }[]>([])
  useEffect(() => {
    researchCountries().then(setCountries).catch(() => setCountries([]))
    if (!saved.country) getMyProfile().then((p) => setCountry(p?.country ?? 'AU')).catch(() => setCountry('AU'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (country) writeResearchPrefs(country, days) }, [country, days])
  return { country, setCountry, days, setDays, countries }
}

export function ResearchControls({ scope }: { scope: ReturnType<typeof useResearchScope> }) {
  const counts = new Map(scope.countries.map((c) => [c.country, c.postings]))
  const codes = [...new Set([...scope.countries.map((c) => c.country), ...COUNTRIES])]
  return (
    <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="research-country">Country</label>
      <select id="research-country" className={selectClass} value={scope.country ?? 'AU'} onChange={(e) => scope.setCountry(e.target.value)}>
        {codes.map((c) => <option key={c} value={c}>{countryName(c)}{counts.has(c) ? ` (${counts.get(c)})` : ''}</option>)}
      </select>
      <label className="sr-only" htmlFor="research-period">Period</label>
      <select id="research-period" className={selectClass} value={scope.days} onChange={(e) => scope.setDays(Number(e.target.value))}>
        {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
    </div>
  )
}
