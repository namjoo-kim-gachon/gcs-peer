import React from 'react';
import LoginButton from '../components/common/LoginButton';

const Home: React.FC = () => {
  return (
    <div>
      <h1>GCS Peer</h1>
      <p>환영합니다! GCS Peer 웹앱에 오신 것을 환영합니다.</p>
      <LoginButton />
    </div>
  );
};

export default Home;
