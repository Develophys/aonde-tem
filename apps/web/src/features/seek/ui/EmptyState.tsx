interface Props {
  readonly query?: string;
}

export function EmptyState({ query }: Props) {
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
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </div>
      <p className="text-text font-semibold text-base mb-1">
        {query
          ? `Ninguém relatou "${query}" por aqui ainda`
          : "Ninguém relatou nada por aqui ainda"}
      </p>
      {/* No CTA here any more: the FAB that used to pass `onReport` is gone, and the
          Relatar tab in the bottom bar is the one route into reporting. */}
      <p className="text-text-muted text-sm">Seja o primeiro a ajudar sua comunidade!</p>
    </div>
  );
}
