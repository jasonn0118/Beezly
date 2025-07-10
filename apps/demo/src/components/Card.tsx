import React from 'react';
import { theme } from '../styles/theme';

const Card: React.FC<{children: React.ReactNode, style?: object}> = ({ children, style }) => (
    <div style={{...cardStyles.card, ...style}}>{children}</div>
);

const cardStyles = {
    card: {
        backgroundColor: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    },
};

export default Card;