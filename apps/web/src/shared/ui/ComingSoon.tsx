interface Props {
  readonly title: string;
  readonly description: string;
}

// Badge-and-copy panel for any screen with nothing to show — an unbuilt route, or a
// list that is legitimately empty. Shares EmptyState's badge vocabulary (80px
// surface-alt circle, muted stroke icon, animate-badge-in) but takes its copy as
// props — EmptyState's own copy is hardcoded about reports and cannot be reused here.
export function ComingSoon({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-20 h-20 rounded-full bg-surface-alt flex items-center justify-center mb-4 animate-badge-in">
        <svg
          className="w-9 h-9 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      </div>
      <p className="text-text font-semibold text-base mb-1">{title}</p>
      <p className="text-text-muted text-sm">{description}</p>
    </div>
  );
}
