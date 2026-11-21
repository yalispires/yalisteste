import { cn } from "@/lib/utils";

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][] | Record<string, string>;
  placeholder?: string;
  className?: string;
}) {
  const opts = Array.isArray(options) ? options : Object.entries(options);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-card px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {opts.map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
