import React from 'react';

const Input = ({ icon: Icon, className = '', ...props }) => {
    return (
        <div className="relative group">
            {Icon && (
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5 transition-colors group-focus-within:text-primary" />
            )}
            <input
                className={`w-full bg-surface border border-border-base rounded-[var(--radius-md)] px-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all duration-300 placeholder:text-text-secondary ${Icon ? 'pl-12' : ''} ${className}`}
                {...props}
            />
        </div>
    );
};

export default Input;
