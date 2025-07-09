import React from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { MOCK_RECENT_INFO, MOCK_PRICE_DATA } from '../data/mockData';
import { theme } from '../styles/theme';
import Card from '../components/Card';
import { AppButton } from '../components/common';

const ProductDetailScreen: React.FC<ScreenProps> = ({ navigation, route }) => {
    const product = route?.params?.product || MOCK_RECENT_INFO[0]; // Fallback to mock data
    
    return (
        <div style={{...styles.screenScroll, display: 'flex', flexDirection: 'column'}}>
            <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl, flex: 1}}>
                <header style={{...styles.header, justifyContent: 'flex-start', gap: theme.spacing.md}}>
                    <button onClick={() => navigation('home')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                        <span style={{fontSize: 24}}>‹</span>
                    </button>
                </header>
                <Card style={{padding: theme.spacing.md, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg}}>
                    <img src={product.image.replace('40x40', '80x80')} alt={product.name} style={{width: 80, height: 80, borderRadius: 8}} />
                    <div>
                        <h1 style={{...styles.h1, fontSize: 20, margin: 0}}>{product.name}</h1>
                        <p style={{fontSize: 12, margin: 0, marginTop: 4}}>Barcode: {product.barcode}</p>
                    </div>
                </Card>

                <h2 style={styles.h2}>Price by Mart</h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.md}}>
                    {MOCK_PRICE_DATA.map((item, index) => (
                        <Card key={index} style={{padding: theme.spacing.md, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                                <p style={{fontWeight: theme.font.bold}}>{item.store}</p>
                                <p style={{fontSize: 12, color: theme.colors.textSecondary}}>{item.distance}m · {item.date} days ago</p>
                            </div>
                            <p style={{fontSize: 18, fontWeight: theme.font.bold}}>${item.price.toFixed(2)}</p>
                        </Card>
                    ))}
                </div>
                
                 <Card style={{padding: theme.spacing.lg, marginTop: theme.spacing.lg}}>
                    <h2 style={{...styles.h2, fontSize: 18, marginBottom: theme.spacing.md}}>Price Trend Graph</h2>
                    <div style={{width: '100%', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9f9f9'}}>
                       <p style={{color: theme.colors.textTertiary}}>Graph Area</p>
                    </div>
                </Card>
            </div>
             <div style={{padding: theme.spacing.lg, backgroundColor: theme.colors.background, borderTop: `1px solid ${theme.colors.border}`}}>
                <AppButton onClick={() => navigation('compareInput')} primary>Register My Price</AppButton>
            </div>
        </div>
    );
};

export default ProductDetailScreen;