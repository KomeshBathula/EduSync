import React from 'react';

const Card = ({ children, level = 1, className = '', ...props }) => {
    const shadows = {
        1: 'shadow-level1',
        2: 'shadow-level2',
        3: 'shadow-level3',
    };

    const rounded = {
        sm: 'rounded-[var(--radius-sm)]',
        md: 'rounded-[var(--radius-md)]',
        lg: 'rounded-[var(--radius-lg)]',
        xl: 'rounded-[var(--radius-xl)]',
    };

    // Determine border radius based on level, giving it asymmetrical/varied feel
    let defaultRounded = rounded.lg;
    if (level === 2) defaultRounded = rounded.md;
    if (level === 3) defaultRounded = rounded.xl;

    return (
        <div
            className={`bg-surface border border-border-subtle ${shadows[level]} ${defaultRounded} ${className} transition-shadow duration-300`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
