import React from 'react';

interface ThreeDGlobeEpicProps {
  clusteringResults: {
    clusters: Array<{
      id: string;
      eventIds: string[];
      label: string;
    }>;
  };
}

const ThreeDGlobeEpic: React.FC<ThreeDGlobeEpicProps> = ({ clusteringResults }) => {
  return (
    <div 
      data-testid="globe-container"
      style={{ 
        width: '100%', 
        height: '400px', 
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ color: 'white', textAlign: 'center' }}>
        <h4>3D Globe Visualization</h4>
        <p>Clusters: {clusteringResults.clusters.length}</p>
        {clusteringResults.clusters.map((cluster) => (
          <div key={cluster.id} style={{ margin: '8px 0' }}>
            {cluster.label} ({cluster.eventIds.length} events)
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreeDGlobeEpic;
