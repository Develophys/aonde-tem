interface Props {
  query?: string;
  onReport?: () => void;
}

export function EmptyState({ query, onReport }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-5xl mb-4">🗺️</div>
      <p className="text-text font-semibold text-base mb-1">
        {query
          ? `Ninguém relatou "${query}" por aqui ainda`
          : "Ninguém relatou nada por aqui ainda"}
      </p>
      <p className="text-text-muted text-sm mb-6">Seja o primeiro a ajudar sua comunidade!</p>
      {onReport && (
        <button
          onClick={onReport}
          className="bg-brand text-white font-semibold px-6 py-3 rounded-full"
        >
          Relatar agora
        </button>
      )}
    </div>
  );
}
