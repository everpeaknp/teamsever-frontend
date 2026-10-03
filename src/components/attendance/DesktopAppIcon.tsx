'use client';

import { AppWindow } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaEdge, FaFirefoxBrowser, FaMicrosoft, FaSlack } from 'react-icons/fa6';
import {
  SiBrave,
  SiDiscord,
  SiGooglechrome,
  SiIntellijidea,
  SiNotion,
  SiObsidian,
  SiPycharm,
  SiWebstorm,
  SiZoom,
} from 'react-icons/si';
import { VscCode } from 'react-icons/vsc';

const appIcons: Record<string, { Icon: IconType; color: string }> = {
  code: { Icon: VscCode, color: '#007acc' },
  'code-insiders': { Icon: VscCode, color: '#24bfa5' },
  chrome: { Icon: SiGooglechrome, color: '#4285f4' },
  brave: { Icon: SiBrave, color: '#fb542b' },
  firefox: { Icon: FaFirefoxBrowser, color: '#ff7139' },
  msedge: { Icon: FaEdge, color: '#0c8ce9' },
  teams: { Icon: FaMicrosoft, color: '#6264a7' },
  slack: { Icon: FaSlack, color: '#611f69' },
  discord: { Icon: SiDiscord, color: '#5865f2' },
  idea: { Icon: SiIntellijidea, color: '#fe315d' },
  webstorm: { Icon: SiWebstorm, color: '#07c3f2' },
  pycharm: { Icon: SiPycharm, color: '#21d789' },
  zoom: { Icon: SiZoom, color: '#0b5cff' },
  notion: { Icon: SiNotion, color: '#111111' },
  obsidian: { Icon: SiObsidian, color: '#7c3aed' },
};

export function DesktopAppIcon({ appId, label, className = 'h-9 w-9' }: { appId: string; label: string; className?: string }) {
  const key = appId.toLowerCase().replace(/\.exe$/i, '').replace(/[_\s]+/g, '-');
  const app = appIcons[key];
  const Icon = app?.Icon || AppWindow;

  return (
    <span
      role="img"
      aria-label={`${label} app icon`}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background shadow-sm ${className}`}
      title={label}
    >
      <Icon aria-hidden="true" className="h-5 w-5" style={app ? { color: app.color } : undefined} />
    </span>
  );
}
