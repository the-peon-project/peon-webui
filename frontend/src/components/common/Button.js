import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button component with variants
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'gold-button',
    secondary: 'gray-button',
    danger: 'red-button',
    ghost: 'bg-transparent hover:bg-white/10 text-gray-300',
    outline: 'border-2 border-purple-500 text-purple-400 hover:bg-purple-500/20',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        rounded 
        inline-flex items-center justify-center gap-2
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4" />
      )}
    </button>
  );
};

/**
 * Icon button (circular)
 */
export const IconButton = ({
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  className = '',
  ...props
}) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variants = {
    ghost: 'hover:bg-white/10 text-gray-400 hover:text-white',
    primary: 'gold-button',
    danger: 'hover:bg-red-500/20 text-red-400 hover:text-red-300',
  };

  return (
    <button
      className={`
        ${sizes[size]} 
        ${variants[variant]}
        rounded-full 
        inline-flex items-center justify-center
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );
};

/**
 * Button Group
 */
export const ButtonGroup = ({ children, className = '' }) => (
  <div className={`flex gap-2 ${className}`}>
    {children}
  </div>
);

export default Button;
