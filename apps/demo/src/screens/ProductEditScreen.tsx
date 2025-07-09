import React, { useState } from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { theme } from '../styles/theme';
import Card from '../components/Card';
import { AppButton } from '../components/common';

const ProductEditScreen: React.FC<ScreenProps> = ({ navigation, route }) => {
    const { params } = route || {};
    const { originalName, matchedName } = params || {};
    const originalNameString = originalName as string;
    const matchedNameString = matchedName as string;

    const [productName, setProductName] = useState(matchedNameString || '');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [capacity, setCapacity] = useState('');
    const [capacityUnit, setCapacityUnit] = useState<'LB' | 'mL'>('mL');

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div style={styles.screenScroll}>
                <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xl}}>
                    <header style={{...styles.header, justifyContent: 'flex-start', gap: theme.spacing.md, flexDirection: 'column', alignItems: 'stretch', borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: theme.spacing.md, marginBottom: theme.spacing.md}}>
                        <div style={{display: 'flex', alignItems: 'center', width: '100%'}}>
                            <button onClick={() => navigation('receiptResult')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                                <span style={{fontSize: 24}}>‹</span>
                            </button>
                            <h1 style={{...styles.h1, flex: 1, textAlign: 'center', marginRight: 24}}>
                                {matchedName ? 'Edit Product Info' : 'Enter Product Info'}
                            </h1>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', padding: `0 ${theme.spacing.md}px`}}>
                            <p style={{fontSize: 12, color: theme.colors.textSecondary, margin: 0}}><strong>Mart:</strong> Costco</p>
                            <p style={{fontSize: 12, color: theme.colors.textSecondary, margin: 0}}><strong>Date:</strong> 2025/07/08</p>
                        </div>
                    </header>

                    {originalNameString && (
                         <Card style={{padding: theme.spacing.md, marginBottom: theme.spacing.lg, backgroundColor: '#FFFBEB' }}>
                            <p style={{fontSize: 12, color: theme.colors.textSecondary, margin: 0}}>Original Receipt Item</p>
                            <p style={{fontSize: 16, fontWeight: theme.font.semibold, color: theme.colors.amber600, marginTop: 4}}>{originalNameString}</p>
                        </Card>
                    )}

                    <Card style={{padding: theme.spacing.lg, marginBottom: theme.spacing.sm}}>
                        <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary}}>Product Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Seoul Milk 1L"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            style={editStyles.input}
                        />
                    </Card>

                    <Card style={{padding: theme.spacing.lg, marginBottom: theme.spacing.sm}}>
                        <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary}}>Category</label>
                        <input
                            type="text"
                            placeholder="e.g., Dairy"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={editStyles.input}
                        />
                    </Card>

                    <Card style={{padding: theme.spacing.lg, marginBottom: theme.spacing.sm}}>
                        <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary}}>Volume</label>
                        <div style={{display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.sm}}>
                            <button
                                onClick={() => setCapacityUnit('LB')}
                                style={capacityUnit === 'LB' ? editStyles.unitButtonActive : editStyles.unitButton}
                            >
                                LB
                            </button>
                            <button
                                onClick={() => setCapacityUnit('mL')}
                                style={capacityUnit === 'mL' ? editStyles.unitButtonActive : editStyles.unitButton}
                            >
                                mL
                            </button>
                        </div>
                        <input
                            type="number"
                            placeholder="Enter volume"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            style={editStyles.input}
                        />
                    </Card>

                    <Card style={{padding: theme.spacing.lg, marginBottom: theme.spacing.lg}}>
                        <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary}}>Purchase Price</label>
                        <div style={{position: 'relative', marginTop: theme.spacing.sm}}>
                            <span style={{position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 24, fontWeight: 'bold', color: theme.colors.textTertiary}}>$</span>
                            <input
                                type="number"
                                placeholder="Enter price"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                style={editStyles.priceInput}
                            />
                        </div>
                    </Card>
                </div>
            </div>
            <div style={{padding: theme.spacing.lg, backgroundColor: theme.colors.background, borderTop: `1px solid ${theme.colors.border}`}}>
                <AppButton onClick={() => navigation('receiptResult')} primary>Save</AppButton>
            </div>
        </div>
    );
};

const editStyles = {
    input: {
        marginTop: 8,
        width: '100%',
        padding: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        border: '1px solid #E5E7EB',
        fontSize: 16,
        boxSizing: 'border-box' as const
    },
    priceInput: {
        width: '100%',
        padding: '12px 16px 12px 40px',
        fontSize: 24,
        fontWeight: 'bold',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        border: '1px solid #E5E7EB',
        boxSizing: 'border-box' as const,
    },
    unitButton: {
        padding: '8px 16px',
        backgroundColor: 'white',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 8,
        color: theme.colors.textPrimary,
        cursor: 'pointer',
        fontSize: 14,
    },
    unitButtonActive: {
        padding: '8px 16px',
        backgroundColor: theme.colors.primary,
        border: `1px solid ${theme.colors.primary}`,
        borderRadius: 8,
        color: 'white',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: theme.font.bold,
    }
};

export default ProductEditScreen;
