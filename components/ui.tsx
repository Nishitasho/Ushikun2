import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";
import { statusLabels } from "@/features/core/labels";
import type { ProposalStatus } from "@/features/core/types";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary: "bg-ink text-white hover:bg-black",
    secondary: "bg-white text-ink border border-line hover:bg-paper",
    danger: "bg-coral text-white hover:bg-[#a9554a]",
    ghost: "bg-transparent text-ink hover:bg-white/70"
  };

  return (
    <button
      className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`focus-ring min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`focus-ring min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink placeholder:text-ink/40 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`focus-ring min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink/55">{hint}</span> : null}
    </label>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = ""
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-white/82 p-5 shadow-soft ${className}`}>
      {title || action ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-base font-bold text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-ink/62">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const styles: Record<ProposalStatus, string> = {
    draft: "border-brass/40 bg-brass/10 text-[#7a5522]",
    approved: "border-sky/35 bg-sky/10 text-[#2f5b72]",
    rejected: "border-coral/35 bg-coral/10 text-[#934438]",
    posted: "border-moss/35 bg-moss/10 text-[#3e5a43]"
  };

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold ${styles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export function Metric({
  label,
  value,
  note
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white/78 p-4">
      <div className="text-xs font-semibold text-ink/55">{label}</div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
      {note ? <div className="mt-1 text-xs text-ink/50">{note}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-line bg-white/50 p-8 text-center">
      <div className="max-w-md">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink/60">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
