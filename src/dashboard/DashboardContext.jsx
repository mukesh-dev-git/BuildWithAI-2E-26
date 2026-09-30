import { createContext, useContext, useMemo, useState } from 'react';
import { useApi } from './api';

const Ctx = createContext(null);

/** Global dashboard filters (country / sector / time window) plus shared metadata. */
export function DashboardProvider({ children }) {
  const [country, setCountry] = useState('ALL');
  const [sector, setSector] = useState('all');
  const [months, setMonths] = useState(12);
  const meta = useApi('/meta');

  const value = useMemo(() => ({
    country, setCountry, sector, setSector, months, setMonths,
    meta: meta.data, metaError: meta.error,
    params: { country, sector, months },
  }), [country, sector, months, meta.data, meta.error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDashboard = () => useContext(Ctx);
