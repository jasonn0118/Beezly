import React, { useState } from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps, PriceData } from '../types';
import { MOCK_PRICE_DATA } from '../data/mockData';
import { theme } from '../styles/theme';
import Card from '../components/Card';
import { AppButton } from '../components/common';

const CompareInputScreen: React.FC<ScreenProps> = ({ navigation }) => {
    const [sortedData, setSortedData] = useState<PriceData[]>(MOCK_PRICE_DATA);
    const [sortType, setSortType] = useState<'date' | 'distance' | 'price'>('date');
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

    const sort = (type: 'date' | 'distance' | 'price') => {
        setSortType(type);
        const data = [...MOCK_PRICE_DATA];
        if (type === 'date') data.sort((a, b) => a.date - b.date);
        if (type === 'distance') data.sort((a, b) => a.distance - b.distance);
        if (type === 'price') data.sort((a, b) => a.price - b.price);
        setSortedData(data);
    };

    const getSortButtonStyle = (type: 'date' | 'distance' | 'price') => {
        const baseStyle = { ...compareInputStyles.sortButton };
        if (sortType === type) {
            return { ...baseStyle, ...compareInputStyles.sortButtonActive };
        }
        return baseStyle;
    };

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div style={styles.screenScroll}>
                <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.xl}}>
                    <header style={{...styles.header, justifyContent: 'flex-start', gap: theme.spacing.md}}>
                        <button onClick={() => navigation('scan')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                            <span style={{fontSize: 24}}>‹</span>
                        </button>
                        <h1 style={{...styles.h1, flex: 1, textAlign: 'center', marginRight: 24}}>Price Compare & Register</h1>
                    </header>

                    <Card style={{padding: theme.spacing.md, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg}}>
                        <img src="https://placehold.co/64x64/3B82F6/FFFFFF?text=Milk" alt="Seoul Milk" style={{width: 64, height: 64, borderRadius: 8}} />
                        <div>
                            <h3 style={{...styles.h2, fontSize: 18, margin: 0}}>Seoul Milk 1L</h3>
                            <p style={{fontSize: 12, margin: 0}}>Barcode: 8801115115115</p>
                        </div>
                    </Card>

                    <Card style={{padding: theme.spacing.lg, marginBottom: theme.spacing.sm}}>
                        <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary}}>Where did you purchase?</label>
                        <input type="text" placeholder="e.g., Costco" style={compareInputStyles.storeInput}/>
                    </Card>

                    <Card style={{padding: theme.spacing.lg, marginBottom: theme.spacing.lg}}>
                        <label style={{fontWeight: theme.font.bold, color: theme.colors.textSecondary}}>How much did you pay for this item?</label>
                        <div style={{position: 'relative', marginTop: theme.spacing.sm}}>
                            <span style={{position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 24, fontWeight: 'bold', color: theme.colors.textTertiary}}>$</span>
                            <input
                                type="number"
                                placeholder="Enter manually or select below"
                                style={compareInputStyles.priceInput}
                                value={selectedPrice || ''}
                                onChange={(e) => setSelectedPrice(Number(e.target.value))}
                            />
                        </div>
                    </Card>

                    {selectedPrice && (
                        <div style={{backgroundColor: '#D1FAE5', padding: 8, borderRadius: 8, marginBottom: 16}}>
                            <p style={{color: '#065F46', textAlign: 'center', fontWeight: 'bold'}}>
                                Sweet! {selectedPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} was selected.
                            </p>
                        </div>
                    )}

                    <h2 style={styles.h2}>Other Users' Submissions</h2>
                    <div style={{display: 'flex', justifyContent: 'space-around', margin: `${theme.spacing.md}px 0`, borderRadius: theme.spacing.sm, overflow: 'hidden', border: `1px solid ${theme.colors.border}`}}>
                        <button onClick={() => sort('distance')} style={{...getSortButtonStyle('distance'), borderRight: `1px solid ${theme.colors.border}`}}>Distance</button>
                        <button onClick={() => sort('date')} style={getSortButtonStyle('date')}>Date</button>
                        <button onClick={() => sort('price')} style={{...getSortButtonStyle('price'), borderLeft: `1px solid ${theme.colors.border}`}}>Price</button>
                    </div>
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm}}>
                        {sortedData.map((item, index) => (
                            <Card key={index} style={{padding: theme.spacing.md, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                    <p style={{fontWeight: theme.font.bold}}>{item.store}</p>
                                    <p style={{fontSize: 12, color: theme.colors.textSecondary}}>{item.distance}m · {item.date} days ago</p>
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: theme.spacing.md}}>
                                    <p style={{fontSize: 18, fontWeight: theme.font.bold}}>${item.price.toFixed(2)}</p>
                                    <button onClick={() => setSelectedPrice(item.price)} style={selectedPrice === item.price ? compareInputStyles.selectedSweetBtn : compareInputStyles.sweetBtn}>
                                        Sweet!
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Card style={{marginTop: theme.spacing.lg, padding: theme.spacing.lg}}>
                        <h2 style={{...styles.h2, marginBottom: theme.spacing.md}}>Price Trend Graph</h2>
                        <div style={{height: 200, backgroundColor: '#F9FAFB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.colors.border}`}}>
                            <p style={{color: theme.colors.textSecondary}}>Price trend graph will be displayed here.</p>
                        </div>
                    </Card>
                </div>
            </div>
            <div style={{padding: theme.spacing.lg, backgroundColor: theme.colors.background, borderTop: `1px solid ${theme.colors.border}`}}>
                <AppButton onClick={() => navigation('confirmation')} primary>Register My Price</AppButton>
            </div>
        </div>
    );
};

const compareInputStyles = {
    storeInput: { marginTop: 8, width: '100%', padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, border: 'none', fontSize: 16, boxSizing: 'border-box' as const },
    priceInput: {
        width: '100%',
        padding: '12px 16px 12px 40px',
        fontSize: 24,
        fontWeight: 'bold',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        border: 'none',
        boxSizing: 'border-box' as const,
    },
    sweetBtn: {
        backgroundColor: theme.colors.amber50,
        color: theme.colors.amber600,
        border: `1px solid ${theme.colors.amber400}`,
        borderRadius: 99,
        padding: '4px 12px',
        fontWeight: theme.font.semibold,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
    },
    selectedSweetBtn: {
        backgroundColor: theme.colors.amber50,
        color: theme.colors.amber600,
        borderWidth: '2px',
        borderColor: '#FBBF24',
        boxShadow: '0 0 15px rgba(251, 191, 36, 0.3)',
        borderRadius: 99,
        padding: '4px 12px',
        fontWeight: theme.font.semibold,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
    },
    sortButton: {
        flex: 1,
        padding: '10px 16px',
        backgroundColor: 'white',
        border: 'none',
        color: theme.colors.textPrimary,
        cursor: 'pointer',
        fontSize: 14,
        transition: 'background-color 0.2s ease-in-out',
    },
    sortButtonActive: {
        backgroundColor: theme.colors.primary,
        color: 'white',
        fontWeight: theme.font.bold,
    }
};

export default CompareInputScreen;