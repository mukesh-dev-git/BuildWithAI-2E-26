import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { Async, CountryName, Panel, SectorTag } from '../components/ui';
import { fmtInt, TYPE_LABELS } from '../format';

const SOURCE_LABELS = { falabr: 'Fala.BR', platform: 'Citizen Intake' };

export default function Explorer() {
  const { params } = useDashboard();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const size = 50;

  // Debounce free-text search
  useEffect(() => {
    const t = setTimeout(() => { setQuery(q); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [params.country, params.sector, type, source]);

  const state = useApi('/requests', { country: params.country, sector: params.sector, type, source, q: query, page, size });
  const pages = state.data ? Math.max(1, Math.ceil(state.data.total / size)) : 1;

  return (
    <Panel
      title="Individual citizen requests"
      subtitle="Most recent 12 months of source records plus anything submitted through Citizen Intake"
      actions={(
        <>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: 'var(--d-text-3)' }} />
            <input type="search" placeholder="Search subject, agency, text" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 28, width: 240 }} />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Request type">
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </>
      )}
      flush
    >
      <Async state={state} label="Querying records…">
        {(d) => (
          <>
            <div className="table-wrap">
              <table className="dtable">
                <thead>
                  <tr><th>Date</th><th>Location</th><th>Sector</th><th>Subject / text</th><th>Type</th><th>Agency</th><th>Status</th><th className="r">Days</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {d.items.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap num muted">{r.date}</td>
                      <td>
                        {r.municipality ? <>{r.municipality}, </> : null}{r.region || '—'}
                        {r.iso3 && <div className="muted" style={{ fontSize: 11.5 }}><CountryName iso3={r.iso3} /></div>}
                      </td>
                      <td><SectorTag sector={r.sector} /></td>
                      <td style={{ maxWidth: 320 }}>{r.subject}{r.text && <div className="muted" style={{ fontSize: 12 }}>{r.text}</div>}</td>
                      <td className="nowrap">{TYPE_LABELS[r.type] || r.type}</td>
                      <td style={{ maxWidth: 220, fontSize: 12.5 }}>{r.agency || '—'}</td>
                      <td className="nowrap" style={{ fontSize: 12.5 }}>{r.status}</td>
                      <td className="r">{r.days ?? '—'}</td>
                      <td className="nowrap muted" style={{ fontSize: 12 }}>{SOURCE_LABELS[r.source] || r.source}</td>
                    </tr>
                  ))}
                  {!d.items.length && <tr><td colSpan={9} className="muted">No records match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>{fmtInt(d.total)} records · page {page} of {fmtInt(pages)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Prev</button>
                <button className="btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </Async>
    </Panel>
  );
}
