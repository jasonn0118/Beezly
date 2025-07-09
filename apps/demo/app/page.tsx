'use client';
import React, { useState } from 'react';
import { ScreenName } from '../src/types';
import { SCREENS, NavButton } from '../src/navigation/AppNavigator';
import { styles } from '../src/styles/globalStyles';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [navParams, setNavParams] = useState<any>({});

  const handleNavigation = (screenName: ScreenName, params: any = {}) => {
      setNavParams(params);
      setCurrentScreen(screenName);
  }

  const ScreenComponent = SCREENS[currentScreen] || SCREENS['home'];

  return (
    <div style={styles.body}>
        <div style={styles.phoneFrame}>
            <div style={styles.appContainer}>
                <ScreenComponent navigation={handleNavigation} route={{ params: navParams }} />
            </div>
            <nav style={styles.navBar}>
                <NavButton screenName="home" label="Home" icon="🏠" currentScreen={currentScreen} setScreen={handleNavigation} />
                <NavButton screenName="watchlist" label="Watchlist" icon="❤️" currentScreen={currentScreen} setScreen={handleNavigation} />
                <button onClick={() => handleNavigation('scan')} style={styles.scanButton}>
                    <span style={{color: 'white', fontSize: 32}}>+</span>
                </button>
                <NavButton screenName="rank" label="Buzz" icon="🏆" currentScreen={currentScreen} setScreen={handleNavigation} />
                <NavButton screenName="profile" label="Profile" icon="👤" currentScreen={currentScreen} setScreen={handleNavigation} />
            </nav>
        </div>
    </div>
  );
}