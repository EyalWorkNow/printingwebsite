import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

// The aceternity glowing-effect-demo card shell, reused across the whole site.
export function GlowCard({ className, inner, children }: { className?: string; inner?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3", className)}>
      <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} />
      <div className={cn("relative h-full overflow-hidden rounded-xl border-[0.75px] p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]", inner)}>{children}</div>
    </div>
  );
}
