import React from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { theme } from '../styles/theme';
import Card from '../components/Card';
import { AppButton } from '../components/common';

const ReceiptResultScreen: React.FC<ScreenProps> = ({ navigation }) => (
    <div style={{...styles.screenScroll, display: 'flex', flexDirection: 'column'}}>
        <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, flex: 1}}>
            <header style={{...styles.header, justifyContent: 'flex-start', gap: theme.spacing.md}}>
                <button onClick={() => navigation('scan')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                    <span style={{fontSize: 24}}>‹</span>
                </button>
                <h1 style={{...styles.h1, flex: 1, textAlign: 'center', marginRight: 24}}>Receipt Scan Results</h1>
            </header>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: `0 ${theme.spacing.md}px`}}>
                <p style={{fontSize: 12, color: theme.colors.textSecondary, margin: 0}}><strong>Mart:</strong> Costco</p>
                <p style={{fontSize: 12, color: theme.colors.textSecondary, margin: 0}}><strong>Date:</strong> 2025/07/08</p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm}}>
                {/* Success Item */}
                <Card style={{padding: theme.spacing.md}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <p style={{fontSize: 12, color: theme.colors.textSecondary}}>Original: Seoul Milk</p>
                        <p style={{fontSize: 12, color: theme.colors.green, fontWeight: theme.font.bold}}>98%</p>
                    </div>
                    <p style={{fontSize: 18, fontWeight: theme.font.bold, color: theme.colors.textPrimary, marginTop: 4}}>Seoul Milk 1L</p>
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 8}}>
                        <button onClick={() => navigation('productEdit', { originalName: 'Seoul Milk', matchedName: 'Seoul Milk 1L' })} style={{fontSize: 12, color: theme.colors.textSecondary, background: 'none', border: 'none', cursor: 'pointer'}}>Edit</button>
                    </div>
                </Card>
                {/* Failed Item */}
                <Card style={{padding: theme.spacing.md, backgroundColor: '#FEF2F2', borderColor: '#FECACA'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <p style={{fontSize: 12, color: theme.colors.red}}>Original: CJ Hetbahn</p>
                        <p style={{fontSize: 12, color: theme.colors.red, fontWeight: theme.font.bold}}>Match Failed</p>
                    </div>
                    <p style={{fontSize: 18, fontWeight: theme.font.bold, color: '#B91C1C', marginTop: 4}}>Please enter manually</p>
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 8}}>
                        <button onClick={() => navigation('productEdit', { originalName: 'CJ Hetbahn' })} style={{fontSize: 12, color: theme.colors.red, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Input</button>
                    </div>
                </Card>
            </div>
        </div>
        <div style={{padding: theme.spacing.lg, backgroundColor: theme.colors.background, borderTop: `1px solid ${theme.colors.border}`}}>
            <AppButton onClick={() => navigation('confirmation')} primary>Register & Earn Points</AppButton>
        </div>
    </div>
);

export default ReceiptResultScreen;