import React from 'react';
import { HotDeal } from '../types';
import { theme } from '../styles/theme';

const HotDealCard: React.FC<{ item: HotDeal }> = ({ item }) => (
    <div style={hotDealCardStyles.dealCard}>
      <img src={item.image} style={hotDealCardStyles.dealImage} alt={item.name} />
      <div style={{ padding: theme.spacing.md }}>
        <p style={hotDealCardStyles.dealName}>{item.name}</p>
        <p style={hotDealCardStyles.dealSpec}>{item.spec}</p>
        <p style={hotDealCardStyles.dealPrice}>{item.price}</p>
      </div>
    </div>
);

const hotDealCardStyles = {
    dealCard: { backgroundColor: theme.colors.card, border: `1px solid ${theme.colors.border}`, borderRadius: 16, width: 160, flexShrink: 0 },
    dealImage: { height: 112, width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, objectFit: 'cover' as const },
    dealName: { fontWeight: theme.font.bold, fontSize: 14, color: theme.colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    dealSpec: { fontSize: 12, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
    dealPrice: { fontWeight: theme.font.bold, fontSize: 18, marginTop: theme.spacing.xs, color: theme.colors.textPrimary },
};

export default HotDealCard;