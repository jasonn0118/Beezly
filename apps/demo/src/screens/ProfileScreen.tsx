import React from 'react';
import Image from 'next/image';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { theme } from '../styles/theme';
import Card from '../components/Card';

const ProfileScreen: React.FC<ScreenProps> = () => (
    <div style={styles.screenScroll}>
        <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xl}}>
            <h1 style={{...styles.h1, textAlign: 'center', marginBottom: theme.spacing.lg}}>Profile</h1>
            <Card style={{padding: theme.spacing.lg, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg}}>
                <Image src="https://i.pravatar.cc/80?u=user1" style={{borderRadius: 40}} alt="profile" width={80} height={80} />
                <div>
                    <h2 style={styles.h2}>Thrifty Shopper</h2>
                    <p style={{color: theme.colors.amber600, fontWeight: theme.font.semibold, margin:0}}>LV.5 / 5,800P</p>
                </div>
            </Card>
            <Card style={{padding: theme.spacing.lg, marginTop: theme.spacing.lg}}>
                <h3 style={{...styles.h2, fontSize: 18}}>Badges Earned</h3>
                <div style={{display: 'flex', flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md}}>
                    <span style={{fontSize: 36}}>🏆</span>
                    <span style={{fontSize: 36}}>🥇</span>
                    <span style={{fontSize: 36}}>✨</span>
                </div>
            </Card>
            <Card style={{padding: theme.spacing.lg, marginTop: theme.spacing.lg}}>
                <h3 style={{...styles.h2, fontSize: 18}}>My Contributions</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.md}}>
                    <p style={{margin:0}}>Seoul Milk 1L</p>
                    <p style={{margin:0}}>Nongshim Shin Ramyun (5 pack)</p>
                </div>
            </Card>
        </div>
    </div>
);

export default ProfileScreen;