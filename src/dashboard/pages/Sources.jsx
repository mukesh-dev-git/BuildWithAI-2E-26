import { ExternalLink } from 'lucide-react';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { Async, Note, Panel } from '../components/ui';
import { FLAGS, fmtInt } from '../format';

export default function Sources() {
  const state = useApi('/sources');
  const { meta } = useDashboard();

  return (
    <>
      <Note>
        Every number in this dashboard comes from the open sources below. Nothing is simulated. Where a BRICS member publishes no
        open citizen-feedback data, the dashboard shows the gap instead of estimating it.
      </Note>
      <Async state={state} label="Loading sources…">
        {(rows) => (
          <Panel title="Datasets in use" flush>
            <div className="table-wrap">
              <table className="dtable">
                <thead><tr><th>Dataset</th><th>Publisher</th><th>Coverage</th><th className="r">Records</th><th>License</th><th>Retrieved</th></tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td style={{ maxWidth: 380 }}>
                        <a href={s.url} target="_blank" rel="noreferrer"><strong>{s.name}</strong> <ExternalLink size={12} /></a>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{s.notes}</div>
                      </td>
                      <td>{s.publisher}</td>
                      <td>{s.coverage}</td>
                      <td className="r">{fmtInt(s.records)}</td>
                      <td className="nowrap">{s.license}</td>
                      <td className="nowrap muted">{s.retrieved_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </Async>

      <Panel title="Citizen-feedback coverage by member" subtitle="Open, machine-readable records of individual citizen requests" flush>
        <table className="dtable">
          <thead><tr><th>Country</th><th>Status</th><th>What would close the gap</th></tr></thead>
          <tbody>
            {meta?.countries.map((c) => (
              <tr key={c.iso3}>
                <td className="nowrap">{FLAGS[c.iso3]} {c.name}</td>
                <td>{c.feedback_source ? <span className="badge badge-demand">Integrated (Fala.BR)</span> : <span className="badge badge-need">Not openly published</span>}</td>
                <td className="muted" style={{ fontSize: 12.5 }}>{GAP_NOTES[c.iso3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Method">
        <ul className="list-plain" style={{ gap: 10 }}>
          <li><span><strong>Sector mapping.</strong> Each source subject (308 Fala.BR subjects) is mapped by rule to one of 11 development sectors. Administration and individual pension/benefit case handling are kept separate and left out of demand totals and priorities.</span></li>
          <li><span><strong>Aggregation.</strong> Records are rolled up by region × sector × month × request type during the build, so dashboard queries never scan raw records.</span></li>
          <li><span><strong>Priority score (0–100).</strong> Within each sector: demand intensity (per-capita and volume percentile, 45%), 6-month growth (20%), unresolved share (15%), and national infrastructure gap from World Bank indicators (20%). Members without citizen data are scored on the gap alone, capped at 70, and labelled “Indicator need”.</span></li>
          <li><span><strong>Rebuild.</strong> <code>npm run data:fetch</code> then <code>npm run data:build -- &lt;path to manifestacoes-ouvidoria.zip&gt;</code>.</span></li>
        </ul>
      </Panel>
    </>
  );
}

// What we found when looking for open, record-level citizen-feedback data (Sep 2026).
const GAP_NOTES = {
  BRA: 'Monthly Fala.BR dumps from CGU. Already integrated.',
  RUS: 'No open bulk export found for national e-government feedback (Gosuslugi). Would need a data-sharing agreement.',
  IND: 'CPGRAMS publishes ministry-level totals only (PIB and parliamentary answers). Record-level data would need an agreement with DARPG.',
  CHN: 'No open record-level export found for the 12345 government service hotlines.',
  ZAF: 'No open complaints export found. Afrobarometer surveys cover citizen priorities (World Bank Microdata Library).',
  EGY: 'No open complaints export found. Arab Barometer surveys cover citizen priorities.',
  ETH: 'No open complaints export found. Afrobarometer surveys cover citizen priorities (World Bank Microdata Library).',
  IRN: 'No open complaints export found.',
  ARE: 'No open complaints export found.',
  IDN: 'No open record-level export found for SP4N-LAPOR!. Would need an API agreement.',
};
