import React from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { theme } from '../styles/theme';
import Card from '../components/Card';

const BuzzScreen: React.FC<ScreenProps> = ({ navigation }) => (
    <div style={styles.screenScroll}>
        <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xl}}>
            <h1 style={{...styles.h1, textAlign: 'center', marginBottom: theme.spacing.lg}}>Buzz</h1>
            <Card style={{padding: theme.spacing.lg, alignItems: 'center'}}>
                <span style={{fontSize: 40}}>🏆</span>
                <h2 style={{...styles.h2, marginTop: theme.spacing.sm}}>Sticky Bee</h2>
                <p style={{color: theme.colors.textSecondary}}>A bee that sticks to information</p>
                <div style={buzzStyles.progressBarBg}>
                    <div style={{...buzzStyles.progressBarFg, width: '45%'}} />
                </div>
                <p style={{fontSize: 12, color: theme.colors.textSecondary}}><span style={{color: theme.colors.amber600, fontWeight: theme.font.bold}}>275P</span> until next tier!</p>
            </Card>
            
            <section style={{marginTop: theme.spacing.xl}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md}}>
                    <h3 style={{...styles.h2, fontSize: 18}}>Weekly Ranking</h3>
                    <span style={{fontSize: 12, color: theme.colors.textSecondary}}>Renews in 3 days</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm}}>
                    <Card style={{...buzzStyles.rankItem, ...buzzStyles.rankItemPromote}}><p style={{margin:0}}>1. Thrifty Shopper</p><p style={{fontWeight: theme.font.bold, margin:0}}>495P</p></Card>
                    <Card style={{...buzzStyles.rankItem, ...buzzStyles.rankItemPromote}}><p style={{margin:0}}>2. Receipt Collector</p><p style={{fontWeight: theme.font.bold, margin:0}}>480P</p></Card>
                    <Card style={buzzStyles.rankItem}><p style={{margin:0}}>3. Coupon Master</p><p style={{fontWeight: theme.font.bold, margin:0}}>350P</p></Card>
                    <Card style={{...buzzStyles.rankItem, backgroundColor: theme.colors.amber50}}><p style={{color: theme.colors.amber600, fontWeight: theme.font.bold, margin:0}}>4. Me (Sticky Bee)</p><p style={{color: theme.colors.amber600, fontWeight: theme.font.bold, margin:0}}>225P</p></Card>
                    <Card style={buzzStyles.rankItem}><p style={{margin:0}}>5. Bee123</p><p style={{fontWeight: theme.font.bold, margin:0}}>210P</p></Card>
                    <Card style={{...buzzStyles.rankItem, ...buzzStyles.rankItemDemote}}><p style={{margin:0}}>6. King of Savings</p><p style={{fontWeight: theme.font.bold, margin:0}}>205P</p></Card>
                </div>
            </section>
        </div>
    </div>
);

const buzzStyles = {
    progressBarBg: { width: '100%', height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, marginTop: 16, marginBottom: 8 },
    progressBarFg: { height: 10, background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`, borderRadius: 5 },
    rankItem: { padding: '12px 16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rankItemPromote: { borderLeft: `4px solid ${theme.colors.green}` },
    rankItemDemote: { borderLeft: `4px solid ${theme.colors.red}` },
};

export default BuzzScreen;