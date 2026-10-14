import { LinkButton } from '@/components/ui';

export default function NoAccessPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-paper">
      <div className="max-w-sm">
        <h1 className="font-serif text-[26px] font-semibold text-ink">No desk assigned yet</h1>
        <p className="mt-2 text-[13.5px] text-ink-2">
          Your account is approved but doesn&apos;t have a role with screens yet. Ask the admin to assign one.
        </p>
        <LinkButton href="/api/auth/logout" className="mt-6" prefetch={false}>Sign out</LinkButton>
      </div>
    </div>
  );
}
