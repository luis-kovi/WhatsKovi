'use client';

type ToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (nextValue: boolean) => void;
};

export default function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
    >
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      </div>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  );
}

