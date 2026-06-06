interface ReadOnlyFieldProps {
  label: string;
  value?: string;
  multiline?: boolean;
}

export default function ReadOnlyField({ label, value, multiline = false }: ReadOnlyFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-600">{label}</p>
      {multiline ? (
        <textarea
          readOnly
          value={value ?? "-"}
          rows={4}
          className="w-full cursor-not-allowed rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
        />
      ) : (
        <div className="cursor-not-allowed rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
          {value ?? "-"}
        </div>
      )}
    </div>
  );
}
