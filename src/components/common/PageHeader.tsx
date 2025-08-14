import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => (
  <header style={{ marginBottom: 24 }}>
    <h1 style={{ fontSize: 24 }}>{title}</h1>
    {children}
  </header>
);

export default PageHeader;
