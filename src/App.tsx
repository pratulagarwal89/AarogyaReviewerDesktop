import { useState } from 'react';
import { isLoggedIn } from './api/client';
import LoginScreen from './screens/LoginScreen';
import ProfileListScreen from './screens/ProfileListScreen';
import ProfileReviewScreen from './screens/ProfileReviewScreen';

type Screen = 'login' | 'profiles' | 'profileReview';

function App() {
  const [screen, setScreen] = useState<Screen>(isLoggedIn() ? 'profiles' : 'login');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const handleLogin = () => setScreen('profiles');
  const handleLogout = () => setScreen('login');
  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    setScreen('profileReview');
  };
  const handleBackFromProfileReview = () => {
    setScreen('profiles');
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }
  if (screen === 'profileReview' && selectedProfileId) {
    return <ProfileReviewScreen profileId={selectedProfileId} onBack={handleBackFromProfileReview} />;
  }
  return <ProfileListScreen onSelectProfile={handleSelectProfile} onLogout={handleLogout} />;
}

export default App;
