import React from 'react';

interface MetricsCardProps {
    title: string;
    value: number;
    description: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, description }) => {
    return (
        <div className="panel">
            <h3 className="panel-title">{title}</h3>
            <p className="metric-value">{value}</p>
            <p className="muted">{description}</p>
        </div>
    );
};

export default MetricsCard;