import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
  center = true,
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <section id={id} className={`scroll-mt-20 py-12 sm:py-16 lg:py-20 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || title || subtitle) && (
          <div className={`mb-8 sm:mb-10 ${center ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}`}>
            {eyebrow && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground mb-4">
                <span className="h-1.5 w-1.5 rounded-full gradient-accent" />
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-4 text-base sm:text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
