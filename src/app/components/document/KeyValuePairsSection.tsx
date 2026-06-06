import Card from "../common/Card";

interface KeyValuePairsSectionProps {
  keyValuePairs?: Record<string, string>;
}

export default function KeyValuePairsSection({ keyValuePairs }: KeyValuePairsSectionProps) {
  const pairs = Object.entries(keyValuePairs ?? {});

  if (pairs.length === 0) {
    return (
      <Card title="Key-Value Pairs">
        <p className="text-sm text-gray-600">No key-value pairs extracted from this document.</p>
      </Card>
    );
  }

  return (
    <Card title="Key-Value Pairs">
      <div className="grid grid-cols-2 gap-3">
        {pairs.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">{label}</p>
            <p className="mt-1 rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
