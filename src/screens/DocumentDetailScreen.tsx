import { useEffect, useState } from 'react';
import type { DocumentDetail, LabelValuePair } from '../api/client';
import { getDocument, getDocumentPdfUrl } from '../api/client';

interface Props {
  documentId: string;
  onBack: () => void;
}

type TabType = 'labels' | 'tables' | 'text';

export default function DocumentDetailScreen({ documentId, onBack }: Props) {
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('labels');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [sortByConf, setSortByConf] = useState(false);

  useEffect(() => {
    fetchDoc();
  }, [documentId]);

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const data = await getDocument(documentId, true);
      setDoc(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;
  if (!doc) return <div style={{ padding: '2rem' }}>Document not found</div>;

  const pdfUrl = getDocumentPdfUrl(documentId);
  const labels: LabelValuePair[] = doc.label_value_pairs || [];
  const sortedLabels = sortByConf 
    ? [...labels].sort((a, b) => (a.confidence ?? 100) - (b.confidence ?? 100))
    : labels;

  const tables = doc.structured_tables || [];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9f9f9' }}>
        <button onClick={onBack} style={{ padding: '0.5rem 1rem' }}>Back</button>
        <h3 style={{ margin: 0, flex: 1 }}>{doc.filename}</h3>
        <span style={{ fontSize: '0.9rem', color: '#666' }}>Status: {doc.status}</span>
        {doc.patient_name && <span style={{ fontSize: '0.9rem', color: '#666' }}>Patient: {doc.patient_name}</span>}
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, borderRight: '1px solid #ddd', overflow: 'hidden' }}>
          <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF" />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            <button onClick={() => setActiveTab('labels')} style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'labels' ? '#e0e0e0' : 'transparent', cursor: 'pointer' }}>Label/Value ({labels.length})</button>
            <button onClick={() => setActiveTab('tables')} style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'tables' ? '#e0e0e0' : 'transparent', cursor: 'pointer' }}>Tables ({tables.length})</button>
            <button onClick={() => setActiveTab('text')} style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'text' ? '#e0e0e0' : 'transparent', cursor: 'pointer' }}>OCR Text</button>
          </div>
          {activeTab === 'labels' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
              <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label><input type="checkbox" checked={sortByConf} onChange={e => setSortByConf(e.target.checked)} /> Sort by confidence</label>
                <label>Threshold: <input type="number" value={confidenceThreshold} onChange={e => setConfidenceThreshold(Number(e.target.value))} style={{ width: '50px' }} /></label>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Label</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Value</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Conf</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Page</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLabels.map((lv, i) => {
                    const lowConf = lv.confidence !== undefined && lv.confidence < confidenceThreshold;
                    return (
                      <tr key={i} style={{ background: lowConf ? '#fff3cd' : 'white' }}>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{lv.label}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{lv.value}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', color: lowConf ? 'red' : 'inherit' }}>{lv.confidence?.toFixed(1) ?? '-'}</td>
                        <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{lv.page ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {labels.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No label/value pairs extracted</div>}
            </div>
          )}
          {activeTab === 'tables' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
              {tables.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No tables extracted</div>}
              {tables.map((table: any, ti: number) => (
                <div key={ti} style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem' }}>Table {ti + 1} {table.header ? `(${table.header.join(', ')})` : ''}</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    {table.header && (
                      <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                          {table.header.map((h: string, hi: number) => (
                            <th key={hi} style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {(table.rows || []).map((row: any, ri: number) => (
                        <tr key={ri}>
                          {Array.isArray(row) ? row.map((cell: any, ci: number) => (
                            <td key={ci} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{String(cell)}</td>
                          )) : Object.values(row).map((cell: any, ci: number) => (
                            <td key={ci} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'text' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', margin: 0 }}>{doc.plain_text_searchable || 'No OCR text available'}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
