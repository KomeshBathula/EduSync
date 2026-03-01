import React from 'react';

const SectionHeader = ({ title, description, action, className = '' }) => {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h2>
                {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
};

export default SectionHeader;
