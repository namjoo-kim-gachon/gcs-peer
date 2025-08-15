import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => (
  <header
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    }}
  >
    <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{title}</h1>
    {children}
  </header>
);

export default PageHeader;
