import { AE, BR, CN, EG, ET, ID, IN, IR, RU, ZA } from 'country-flag-icons/react/3x2';

// SVG flags (emoji flags don't render on Windows)
const FLAGS = { BRA: BR, RUS: RU, IND: IN, CHN: CN, ZAF: ZA, EGY: EG, ETH: ET, IRN: IR, ARE: AE, IDN: ID };

export const COUNTRY_NAMES = {
  BRA: 'Brazil', RUS: 'Russia', IND: 'India', CHN: 'China', ZAF: 'South Africa',
  EGY: 'Egypt', ETH: 'Ethiopia', IRN: 'Iran', ARE: 'United Arab Emirates', IDN: 'Indonesia',
};

export default function Flag({ iso3, size = 18, className = '' }) {
  const F = FLAGS[iso3];
  if (!F) return null;
  return <F title={COUNTRY_NAMES[iso3]} className={`flag ${className}`} style={{ width: size, height: Math.round((size * 2) / 3) }} />;
}
