/**
 * KIT brand mark. Renders the PNG at `public/logo.png`.
 * Drop-in: pass Tailwind sizing via `className` (e.g. "h-24 w-24"), same as before.
 */
export function KitLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="KIT"
      className={className}
      width={200}
      height={200}
    />
  );
}
