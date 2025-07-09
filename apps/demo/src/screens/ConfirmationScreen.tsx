import React from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { theme } from '../styles/theme';
import { AppButton } from '../components/common';

const ConfirmationScreen: React.FC<ScreenProps> = ({ navigation }) => (
    <div style={{...styles.centeredScreen, textAlign: 'center'}}>
        <span style={{fontSize: 70}}></span>
        <h1 style={{...styles.h1, marginTop: theme.spacing.md}}>Thank you for the valuable information!</h1>
        <p style={{color: theme.colors.textSecondary, marginTop: theme.spacing.sm}}>Thanks to you, the Beezly hive has become smarter.</p>
        <div style={{marginTop: 48, width: '80%'}}>
            <AppButton onClick={() => navigation('home')} primary>Back to Home</AppButton>
        </div>
    </div>
);

export default ConfirmationScreen;