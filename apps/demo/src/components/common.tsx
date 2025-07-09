import React from 'react';
import { theme } from '../styles/theme';

export const AppButton: React.FC<{onClick: () => void, children: React.ReactNode, style?: object, primary?: boolean}> = ({onClick, children, style, primary}) => (
    <button onClick={onClick} style={{...commonStyles.button, ...(primary && commonStyles.primaryGradientBg), ...style}}>
        <span style={commonStyles.buttonText}>{children}</span>
    </button>
);

const commonStyles = {
    button: {
        padding: '16px 0',
        borderRadius: 12,
        backgroundColor: theme.colors.gray,
        border: 'none',
        cursor: 'pointer',
        width: '100%',
    },
    primaryGradientBg: {
        background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`,
    },
    buttonText: {
        color: theme.colors.white,
        fontWeight: theme.font.bold,
        fontSize: 16,
    },
};