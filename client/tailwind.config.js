/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--color-primary-base)',
                    hover: 'var(--color-primary-hover)',
                    light: 'var(--color-primary-light)',
                },
                secondary: {
                    DEFAULT: 'var(--color-secondary-base)',
                    hover: 'var(--color-secondary-hover)',
                    light: 'var(--color-secondary-light)',
                },
                accent: {
                    DEFAULT: 'var(--color-accent-base)',
                    hover: 'var(--color-accent-hover)',
                    light: 'var(--color-accent-light)',
                },
                success: {
                    DEFAULT: 'var(--color-success-base)',
                    light: 'var(--color-success-light)',
                },
                warning: {
                    DEFAULT: 'var(--color-warning-base)',
                    light: 'var(--color-warning-light)',
                },
                danger: {
                    DEFAULT: 'var(--color-danger-base)',
                    light: 'var(--color-danger-light)',
                },
                surface: {
                    DEFAULT: 'var(--color-surface-base)',
                    base: 'var(--color-surface-base)',
                    alt: 'var(--color-surface-alt)',
                    hover: 'var(--color-surface-hover)',
                },
                background: {
                    DEFAULT: 'var(--color-bg-base)',
                    base: 'var(--color-bg-base)',
                },
                text: {
                    primary: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    muted: 'var(--color-text-secondary)',
                    inverse: 'var(--color-text-inverse)',
                },
                border: {
                    subtle: 'var(--color-border-subtle)',
                    DEFAULT: 'var(--color-border-base)',
                    base: 'var(--color-border-base)',
                    hover: 'var(--color-border-subtle)',
                },
            },
            fontFamily: {
                heading: ['var(--font-family-headings)'],
                body: ['var(--font-family-body)'],
                mono: ['var(--font-family-mono)'],
            },
            boxShadow: {
                level1: 'var(--shadow-level-1)',
                level2: 'var(--shadow-level-2)',
                level3: 'var(--shadow-level-3)',
            }
        },
    },
    plugins: [],
}
