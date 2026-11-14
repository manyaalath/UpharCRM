'use client';

import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { Button, Dialog } from '@/components/ui';
import { usePwaInstall } from './usePwaInstall';

type ButtonProps = React.ComponentProps<typeof Button>;

// Shows only when the app can actually be installed on this device.
export default function InstallButton({
  label = 'Install app', fallback = null, onInstalled, ...button
}: Omit<ButtonProps, 'onClick' | 'children'> & { label?: string; fallback?: React.ReactNode; onInstalled?: () => void }) {
  const { available, canPrompt, install } = usePwaInstall();
  const [iosHelp, setIosHelp] = useState(false);

  if (!available) return <>{fallback}</>;

  const onClick = async () => {
    if (canPrompt) {
      if (await install()) onInstalled?.();
    } else {
      setIosHelp(true);
    }
  };

  return (
    <>
      <Button icon={<Download className="size-4" />} {...button} onClick={onClick}>{label}</Button>
      <IosInstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />
    </>
  );
}

export function IosInstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add Uphar CRM to your Home Screen"
      description="On iPhone and iPad the app is installed from Safari’s Share menu."
      footer={<Button variant="primary" onClick={onClose}>Got it</Button>}
    >
      <ol className="divide-y divide-line text-[14px] text-ink">
        <li className="flex items-center gap-3 py-3">
          <span className="font-mono text-[12px] text-ink-3 w-4">1</span>
          <Share className="size-5 text-info shrink-0" />
          <span>Tap <b className="font-semibold">Share</b> in the Safari toolbar.</span>
        </li>
        <li className="flex items-center gap-3 py-3">
          <span className="font-mono text-[12px] text-ink-3 w-4">2</span>
          <SquarePlus className="size-5 text-info shrink-0" />
          <span>Choose <b className="font-semibold">Add to Home Screen</b>.</span>
        </li>
        <li className="flex items-center gap-3 py-3">
          <span className="font-mono text-[12px] text-ink-3 w-4">3</span>
          <span className="grid size-5 place-items-center rounded-[5px] bg-accent font-deva text-[13px] font-bold leading-none text-white shrink-0">उ</span>
          <span>Tap <b className="font-semibold">Add</b>. Open it from the Home Screen icon.</span>
        </li>
      </ol>
    </Dialog>
  );
}
