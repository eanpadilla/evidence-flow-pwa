import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', fullWidth = false, isLoading = false, icon, children, disabled, ...props }, ref) => {
    const buttonClasses = [
      styles.button,
      styles[variant],
      fullWidth ? styles.fullWidth : '',
      className
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={buttonClasses}
        {...props}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {!isLoading && icon && <span className={styles.icon}>{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
