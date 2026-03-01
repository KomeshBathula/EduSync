import React from 'react';

const Badge = ({ children, color = 'neutral', className = '', ...props }) => {
    const colors = {
        neutral: 'bg-surface-alt text-text-secondary border-border-base',
        success: 'bg-success-light/10 text-success border-success/20',
        warning: 'bg-warning-light/10 text-warning border-warning/20',
        danger: 'bg-danger-light/10 text-danger border-danger/20',
        primary: 'bg-primary-light/10 text-primary border-primary/20',
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.neutral} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
};

export default Badge;
