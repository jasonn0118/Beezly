import React from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { theme } from '../styles/theme';
import Card from '../components/Card';
import { AppButton } from '../components/common';

const NewProductScreen: React.FC<ScreenProps> = ({ navigation }) => (
    <div style={{...styles.screenScroll, display: 'flex', flexDirection: 'column'}}>
        <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, flex: 1}}>
             <header style={{...styles.header, justifyContent: 'flex-start', gap: theme.spacing.md}}>
                <button onClick={() => navigation('scan')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                    <span style={{fontSize: 24}}>‹</span>
                </button>
            </header>
            <div style={{textAlign: 'center'}}>
                <div style={newProductStyles.beeIconContainer}>
                    <span style={{fontSize: 50}}>🐝</span>
                </div>
                <h1 style={styles.h1}>Found a New Honey!</h1>
                <p style={{color: theme.colors.textSecondary, marginTop: theme.spacing.sm, whiteSpace: 'pre-wrap'}}>
                    Please name this discovery.
                    You get bonus points for the first registration!
                </p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.md, marginTop: theme.spacing.xl, paddingBottom: theme.spacing.xl}}>
                <Card style={{padding: theme.spacing.md, alignItems: 'center'}}>
                    <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary, fontSize: 14, width: '100%'}}>Proof of Discovery (Photo)</label>
                    <button style={newProductStyles.photoUploadButton}>
                        Upload Photo
                    </button>
                </Card>
                <Card style={{padding: theme.spacing.md}}>
                    <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary, fontSize: 14}}>Name of Honey Found (Product Name)</label>
                    <input type="text" placeholder="e.g., Seoul Milk 1L" style={newProductStyles.formInput}/>
                </Card>
                <Card style={{padding: theme.spacing.md}}>
                    <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary, fontSize: 14}}>Type of Honey (Category)</label>
                    <input type="text" placeholder="e.g., Beverage" style={newProductStyles.formInput}/>
                </Card>
                <Card style={{padding: theme.spacing.md}}>
                    <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary, fontSize: 14}}>Where did you find it?</label>
                    <input type="text" placeholder="e.g., Costco" style={newProductStyles.formInput}/>
                </Card>
                 <Card style={{padding: theme.spacing.md}}>
                    <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary, fontSize: 14}}>How much did you find it for?</label>
                    <input type="number" placeholder="Enter price" style={newProductStyles.formInput}/>
                </Card>
            </div>
        </div>
        <div style={{padding: theme.spacing.lg, backgroundColor: theme.colors.background, borderTop: `1px solid ${theme.colors.border}`}}>
            <AppButton onClick={() => navigation('confirmation')} primary>Report Discovery</AppButton>
        </div>
    </div>
);

const newProductStyles = {
    beeIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.amber50, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
    formInput: { marginTop: 8, width: '100%', padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, border: 'none', fontSize: 16, boxSizing: 'border-box' as const },
    photoUploadButton: { width: '100%', border: '2px dashed #D1D5DB', borderRadius: 8, padding: 32, marginTop: 8, color: theme.colors.textTertiary, backgroundColor: 'transparent', cursor: 'pointer' },
};

export default NewProductScreen;
