import type { TextFieldView } from "../../types";
import Card from "../common/Card";
import ReadOnlyField from "../common/ReadOnlyField";

interface TextFieldsSectionProps {
  textFields?: TextFieldView[];
}

export default function TextFieldsSection({ textFields }: TextFieldsSectionProps) {
  if (!textFields || textFields.length === 0) {
    return (
      <Card title="Text Fields">
        <p className="text-sm text-gray-600">No extracted text fields for this document.</p>
      </Card>
    );
  }

  return (
    <Card title="Text Fields">
      <div className="space-y-3">
        {textFields.map((field, index) => (
          <ReadOnlyField key={`${field.label}-${index}`} label={field.label} value={field.value} multiline={field.multiline} />
        ))}
      </div>
    </Card>
  );
}
