import React, { useState } from 'react';
import Image from 'next/image';
import { styles } from '../styles/globalStyles';
import { ScreenProps, WatchlistItem } from '../types';
import { MOCK_WATCHLIST_DATA } from '../data/mockData';
import { theme } from '../styles/theme';
import Card from '../components/Card';

const WatchlistScreen: React.FC<ScreenProps> = () => {
    const [watchlist, setWatchlist] = useState(MOCK_WATCHLIST_DATA);

    const handleDelete = (itemId: string) => {
        setWatchlist(currentList => currentList.filter(item => item.id !== itemId));
    };

    const renderTrend = (item: WatchlistItem) => {
        const trendColor = item.trend === 'up' ? theme.colors.red : item.trend === 'down' ? theme.colors.blue : theme.colors.textSecondary;
        const trendArrow = item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '▬';
        return (
            <div style={{ textAlign: 'center', width: 60 }}>
                <p style={{ fontSize: 24, color: trendColor, margin: 0 }}>{trendArrow}</p>
                <p style={{ fontSize: 12, color: trendColor, fontWeight: theme.font.semibold, margin: 0 }}>${item.priceChange.toFixed(2)}</p>
            </div>
        );
    };

    return (
        <div style={{...styles.screenScroll, paddingBottom: 96}}>
            <div style={{...styles.screenContainer, paddingTop: theme.spacing.xl }}>
                <header style={{...styles.header, marginBottom: theme.spacing.lg}}>
                    <h1 style={{...styles.h1, textAlign: 'center', width: '100%'}}>Watchlist</h1>
                </header>

                {watchlist.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                        {watchlist.map(item => (
                            <div key={item.id} className="watchlist-item-wrapper" style={{position: 'relative', overflow: 'hidden', borderRadius: 16}}>
                                <Card style={{ padding: theme.spacing.md, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, width: '100%' }}>
                                    <Image src={item.image} style={{ borderRadius: 8 }} alt={item.name} width={64} height={64} />
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <p style={{ fontWeight: theme.font.bold, color: theme.colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
                                            <p style={{ fontSize: 18, fontWeight: theme.font.bold, color: theme.colors.textPrimary }}>${item.lowestPrice.toFixed(2)}</p>
                                            <p style={{ fontSize: 12, color: theme.colors.textSecondary, paddingBottom: 2 }}> @ {item.store}</p>
                                        </div>
                                    </div>
                                    {renderTrend(item)}
                                </Card>
                                 <button onClick={() => handleDelete(item.id)} style={watchlistStyles.deleteButton}>
                                    ️
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', paddingTop: 60 }}>
                        <p style={{ fontSize: 60, color: theme.colors.textTertiary, margin: 0 }}></p>
                        <p style={{ fontWeight: theme.font.bold, marginTop: theme.spacing.md, color: theme.colors.textPrimary }}>Your watchlist is empty</p>
                        <p style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>Add products to track price changes!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const watchlistStyles = {
    deleteButton: {
        position: 'absolute' as const,
        right: 0, top: 0, bottom: 0,
        width: '60px',
        backgroundColor: theme.colors.red,
        color: theme.colors.white,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        fontSize: 24,
    },
};

export default WatchlistScreen;