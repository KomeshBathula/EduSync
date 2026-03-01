import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyles = "inline-flex items-center justify-center px-6 py-3 font-medium rounded-[var(--radius-md)] transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus-ring)] focus:ring-offset-background hover:-translate-y-[1px]";

    const variants = {
        primary: "bg-primary text-text-inverse hover:bg-primary-hover shadow-level1 hover:shadow-level2",
        secondary: "bg-surface-alt text-text-primary hover:bg-surface-hover border border-border-base shadow-level1 hover:shadow-level2",
        danger: "bg-danger text-text-inverse hover:bg-danger-light shadow-level1 hover:shadow-level2",
        ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-alt"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
