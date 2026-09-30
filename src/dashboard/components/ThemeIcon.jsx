import { Briefcase, Bus, Droplet, GraduationCap, Heart, Leaf, Wifi, Wind } from 'lucide-react';

const ICONS = { droplet: Droplet, heart: Heart, wifi: Wifi, bus: Bus, leaf: Leaf, graduation: GraduationCap, briefcase: Briefcase, wind: Wind };

// Sector ids (from the demand data) that correspond to a theme icon
export const SECTOR_ICON = { water: 'droplet', health: 'heart', digital: 'wifi', transport: 'bus', energy: 'leaf', education: 'graduation', social: 'briefcase', environment: 'wind' };

export default function ThemeIcon({ icon, color, size = 18, filled = true }) {
  const I = ICONS[icon] || Droplet;
  return <I size={size} color={color} fill={filled ? color : 'none'} fillOpacity={filled ? 0.9 : 0} strokeWidth={filled ? 1.6 : 2} />;
}
