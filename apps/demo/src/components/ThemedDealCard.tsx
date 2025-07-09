import React from 'react';
import { ThemedDeal } from '../types';
import { theme } from '../styles/theme';

const ThemedDealCard: React.FC<{ item: ThemedDeal }> = ({ item }) => (
    <div style={themedDealCardStyles.dealCard}>
        <img src={item.image} style={themedDealCardStyles.dealImage} alt={item.name} />
        {item.badge && (
            <div style={{...themedDealCardStyles.badge, backgroundColor: item.badge === 'BEST' ? theme.colors.primary : theme.colors.green}}>
                <span style={themedDealCardStyles.badgeText}>{item.badge}</span>
            </div>
        )}
        <div style={{ padding: theme.spacing.md }}>
            <p style={themedDealCardStyles.storeName}>{item.store}</p>
            <p style={themedDealCardStyles.dealName} >{item.name}</p>
            <p style={themedDealCardStyles.dealPrice}>{item.price}</p>
        </div>
    </div>
);

const themedDealCardStyles = {
    dealCard: { position: 'relative' as const, backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}`, borderRadius: 16, width: 180, flexShrink: 0 },
    dealImage: { height: 135, width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, objectFit: 'cover' as const },
    badge: { position: 'absolute' as const, top: theme.spacing.md, left: theme.spacing.md, padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`, borderRadius: 99, },
    badgeText: { color: theme.colors.white, fontWeight: theme.font.bold, fontSize: 10 },
    storeName: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: theme.font.semibold },
    dealName: { fontWeight: theme.font.bold, fontSize: 16, color: theme.colors.textPrimary, margin: `${theme.spacing.xs}px 0` },
    dealPrice: { fontWeight: theme.font.bold, fontSize: 20, color: theme.colors.textPrimary },
};

export default ThemedDealCard;