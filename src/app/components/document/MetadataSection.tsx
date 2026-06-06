import Card from "../common/Card";

interface MetadataSectionProps {
  metadata?: Record<string, string>;
}

export default function MetadataSection({ metadata }: MetadataSectionProps) {
  const pairs = Object.entries(metadata ?? {});

  return (
    <Card title="Document Metadata">
      {pairs.length === 0 ? (
        <p className="text-sm text-gray-600">No metadata available.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {pairs.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-600">{label}</p>
              <p className="mt-1 rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">{value || "-"}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
