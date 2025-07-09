import React, { useState } from 'react';
import { styles } from '../styles/globalStyles';
import { ScreenProps } from '../types';
import { MOCK_SEARCH_RESULTS } from '../data/mockData';
import { theme } from '../styles/theme';
import Card from '../components/Card';

const SearchResultsScreen: React.FC<ScreenProps> = ({ navigation, route }) => {
    const query = route?.params?.query || '';
    const [addedItems, setAddedItems] = useState<string[]>([]);

    const handleAddItem = (itemId: string) => {
        setAddedItems(prev => [...prev, itemId]);
        // In a real app, you'd also update the global state or DB for the watchlist
    };

    return (
        <div style={styles.screenScroll}>
            <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl }}>
                <header style={{...styles.header, justifyContent: 'flex-start', gap: theme.spacing.md}}>
                    <button onClick={() => navigation('home')} style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                        <span style={{fontSize: 24}}>‹</span>
                    </button>
                    <h1 style={{...styles.h1, flex: 1, textAlign: 'center', marginRight: 24}}>Search Results</h1>
                </header>
                <p style={{textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg}}>
                    Showing results for "<span style={{fontWeight: theme.font.bold, color: theme.colors.textPrimary}}>{query}</span>"
                </p>
                <div style={{display: 'flex', flexDirection: 'column', gap: theme.spacing.sm}}>
                    {MOCK_SEARCH_RESULTS.map(item => {
                        const isAdded = addedItems.includes(item.id);
                        return (
                            <Card key={item.id} style={{padding: theme.spacing.md, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md}}>
                                <img src={item.image} alt={item.name} style={{width: 64, height: 64, borderRadius: 8}}/>
                                <div style={{flex: 1, overflow: 'hidden'}}>
                                    <p style={{fontWeight: theme.font.bold}}>{item.name}</p>
                                    <p style={{fontSize: 12, color: theme.colors.textSecondary}}>Lowest Price: ${item.lowestPrice.toFixed(2)} @ {item.store}</p>
                                </div>
                                <button 
                                    onClick={() => handleAddItem(item.id)} 
                                    disabled={isAdded}
                                    style={{...searchStyles.honeyButton, ...(isAdded && searchStyles.honeyButtonAdded)}}
                                >
                                    {isAdded ? 'Added ✓' : 'Add to Honey 🍯'}
                                </button>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const searchStyles = {
    honeyButton: {
        backgroundColor: theme.colors.amber50,
        color: theme.colors.amber600,
        border: `1px solid ${theme.colors.amber400}`,
        borderRadius: 99,
        padding: '8px 12px',
        fontWeight: theme.font.semibold,
        fontSize: 12,
        cursor: 'pointer',
        transition: 'background-color 0.2s, color 0.2s',
    },
    honeyButtonAdded: {
        backgroundColor: theme.colors.green,
        color: theme.colors.white,
        border: `1px solid ${theme.colors.green}`,
        cursor: 'default',
    }
};

export default SearchResultsScreen;