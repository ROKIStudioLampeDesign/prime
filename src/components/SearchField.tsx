import { CloseIcon, SearchIcon } from './icons';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  return (
    <div className="flex min-h-12 items-center gap-2 border-b-[3px] border-fg focus-within:border-accent">
      <SearchIcon className="size-5 shrink-0 text-muted" />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 min-w-0 flex-1 bg-transparent text-xl font-bold outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center text-muted"
          onClick={() => onChange('')}
        >
          <CloseIcon className="size-5" />
        </button>
      )}
    </div>
  );
}
