'use client';
import React, { useState } from 'react';
import { ScreenProps } from '../types';
import { theme } from '../styles/theme';
import { AppButton } from '../components/common';
import { styles } from '../styles/globalStyles';

const ScanScreen: React.FC<ScreenProps> = ({ navigation }) => {
    const [mode, setMode] = useState<'barcode' | 'receipt'>('barcode');

    return (
        <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={scanStyles.toggleContainer}>
                <button 
                    style={{...scanStyles.toggleButton, ...(mode === 'barcode' && scanStyles.toggleButtonActive)}} 
                    onClick={() => setMode('barcode')}>
                    <span style={{...scanStyles.toggleButtonText, ...(mode === 'barcode' && scanStyles.toggleButtonTextActive)}}>Barcode</span>
                </button>
                <button 
                    style={{...scanStyles.toggleButton, ...(mode === 'receipt' && scanStyles.toggleButtonActive)}}
                    onClick={() => setMode('receipt')}>
                    <span style={{...scanStyles.toggleButtonText, ...(mode === 'receipt' && scanStyles.toggleButtonTextActive)}}>Receipt</span>
                </button>
            </div>

            <header style={{textAlign: 'center', margin: `${theme.spacing.xl}px 0`}}>
                <h1 style={styles.h1}>{mode === 'barcode' ? 'Scan Barcode' : 'Scan Receipt'}</h1>
                <p style={{color: theme.colors.textSecondary, marginTop: theme.spacing.sm, whiteSpace: 'pre-wrap'}}>
                    {mode === 'barcode' 
                        ? 'Scan the product barcode to\ncompare prices and register.'
                        : 'Please capture the entire receipt\nto fit the screen.'
                    }
                </p>
            </header>

            <div style={scanStyles.scannerBox}>
                <div style={scanStyles.scannerBoxInner}>
                    <span style={{fontSize: 48, color: '#D1D5DB'}}>📷</span>
                    <p style={{color: theme.colors.textTertiary, marginTop: theme.spacing.sm}}>
                        {mode === 'barcode' ? 'Fit the barcode to the screen' : 'Fit the receipt to the screen'}
                    </p>
                </div>
            </div>
            
            <div style={{marginTop: theme.spacing.xl, width: '100%', display: 'flex', flexDirection: 'column', gap: theme.spacing.sm}}>
                {mode === 'barcode' ? (
                    <>
                        <AppButton onClick={() => navigation('compareInput')} style={{backgroundColor: theme.colors.blue}}>Product Found (Simulation)</AppButton>
                        <AppButton onClick={() => navigation('newProduct')}>Product Not Found (Simulation)</AppButton>
                    </>
                ) : (
                    <AppButton onClick={() => navigation('receiptResult')} primary>Capture Receipt (Simulation)</AppButton>
                )}
            </div>
        </div>
    );
};

const scanStyles = {
    toggleContainer: { display: 'flex', flexDirection: 'row' as const, backgroundColor: '#E5E7EB', borderRadius: 99, padding: 4, width: '80%', alignSelf: 'center' as const },
    toggleButton: { flex: 1, padding: '8px 0', borderRadius: 99, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
    toggleButtonActive: { backgroundColor: '#333' },
    toggleButtonText: { textAlign: 'center' as const, fontSize: 14, color: '#333' },
    toggleButtonTextActive: { color: 'white' },
    scannerBox: { width: '100%', aspectRatio: '1 / 1', backgroundColor: 'white', borderRadius: 24, border: '1px solid #E5E7EB', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    scannerBoxInner: { width: '100%', height: '100%', border: '4px dashed #D1D5DB', borderRadius: 16, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' },
};

export default ScanScreen;
