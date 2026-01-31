import { useEffect, useState } from 'react';
import type { DocumentListItem } from '../api/client';
import { listDocuments, clearTokens } from '../api/client';

interface Props {
  onSelectDocument: (id: string) => void;
  onLogout: () => void;
}

export default function DocumentListScreen({ onSelectDocument, onLogout }: Props) {
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);

  useEffect(() => {
    fetchDocs();
  }, [statusFilter, search]);

  const fetchDocs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listDocuments({ limit: 100, status: statusFilter || undefined, q: search || undefined });
      setDocs(res.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    onLogout();
  };

  const needsReview = (doc: DocumentListItem) => {
    const scores = doc.doc_confidence_scores;
    if (!scores) return false;
    return (scores.text_min !== undefined && scores.text_min < confidenceThreshold) ||
           (scores.table_min !== undefined && scores.table_min < confidenceThreshold);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Documents</h2>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Logout</button>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search filename/patient..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.5rem', flex: 1, minWidth: '200px' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label>Confidence threshold:</label>
          <input type="number" value={confidenceThreshold} onChange={e => setConfidenceThreshold(Number(e.target.value))} style={{ width: '60px', padding: '0.5rem' }} />
        </div>
        <button onClick={fetchDocs} style={{ padding: '0.5rem 1rem' }}>Refresh</button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Filename</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Patient</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Text Conf</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Table Conf</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => (
              <tr key={doc.id} onClick={() => onSelectDocument(doc.id)} style={{ cursor: 'pointer', background: needsReview(doc) ? '#fff3cd' : 'white' }}>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{doc.filename}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{doc.patient_name || '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{doc.document_type || '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}><span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', background: doc.status === 'completed' ? '#d4edda' : doc.status === 'failed' ? '#f8d7da' : '#e2e3e5' }}>{doc.status}</span></td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', color: (doc.doc_confidence_scores?.text_min ?? 100) < confidenceThreshold ? 'red' : 'inherit' }}>{doc.doc_confidence_scores?.text_min?.toFixed(1) ?? '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee', color: (doc.doc_confidence_scores?.table_min ?? 100) < confidenceThreshold ? 'red' : 'inherit' }}>{doc.doc_confidence_scores?.table_min?.toFixed(1) ?? '-'}</td>
                <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && docs.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No documents found</div>}
    </div>
  );
}
