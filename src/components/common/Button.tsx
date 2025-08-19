import React from 'react';
import styles from './Button.module.css';
import Spinner from './Spinner';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  className?: string;
};

const Button: React.FC<Props> = ({
  loading,
  disabled,
  children,
  className = '',
  ...rest
}) => {
  const isDisabled = Boolean(disabled) || Boolean(loading);
  return (
    <button
      {...rest}
      className={`${styles.button} ${isDisabled ? styles.disabled : ''} ${className}`}
      disabled={isDisabled}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};

export default Button;
