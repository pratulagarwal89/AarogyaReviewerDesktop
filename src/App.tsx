import { useState } from 'react';
import { isLoggedIn } from './api/client';
import LoginScreen from './screens/LoginScreen';
import DocumentListScreen from './screens/DocumentListScreen';
import DocumentDetailScreen from './screens/DocumentDetailScreen';

type Screen = 'login' | 'list' | 'detail';

function App() {
  const [screen, setScreen] = useState<Screen>(isLoggedIn() ? 'list' : 'login');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleLogin = () => setScreen('list');
  const handleLogout = () => setScreen('login');
  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setScreen('detail');
  };
  const handleBack = () => {
    setSelectedDocId(null);
    setScreen('list');
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }
  if (screen === 'detail' && selectedDocId) {
    return <DocumentDetailScreen documentId={selectedDocId} onBack={handleBack} />;
  }
  return <DocumentListScreen onSelectDocument={handleSelectDoc} onLogout={handleLogout} />;
}

export default App;
