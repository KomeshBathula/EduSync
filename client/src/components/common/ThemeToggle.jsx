import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed bottom-6 right-6 p-4 rounded-full bg-surface-base text-text-primary shadow-level2 border border-border-base hover:shadow-level3 transition-all z-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center group"
            aria-label="Toggle Theme"
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
        >
            <motion.div
                initial={false}
                animate={{ rotate: isDarkMode ? 180 : 0 }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
            >
                {isDarkMode ? (
                    <Sun className="w-6 h-6 text-warning-light group-hover:text-warning transition-colors" />
                ) : (
                    <Moon className="w-6 h-6 text-primary group-hover:text-primary-hover transition-colors" />
                )}
            </motion.div>
        </button>
    );
};

export default ThemeToggle;
