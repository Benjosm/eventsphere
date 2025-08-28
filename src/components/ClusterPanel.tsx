import React from 'react';
import type { AugmentedEvent, ClusteringResult } from '../types';
import ThreeDGlobeEpic from './ThreeDGlobeEpic';
import styles from './ClusterPanel.module.css';

interface ClusterPanelProps {
  clusteringResults: ClusteringResult;
  eventData: AugmentedEvent[];
}

const ClusterPanel: React.FC<ClusterPanelProps> = ({ clusteringResults, eventData }) => {
  return (
    <div className={styles.clusterPanel}>
      {/* Thematic Labels and Members */}
      {clusteringResults.clusters.map((cluster) => {
        // Find events that belong to this cluster
        const memberEvents = cluster.eventIds
          .map(id => eventData.find(event => event.id === id))
          .filter((event): event is AugmentedEvent => Boolean(event)); // Filter out undefined and assert type

        return (
          <div key={cluster.id} className={styles.clusterSection}>
            <h3 className={styles.themeLabel}>{cluster.label}</h3>
            <ul className={styles.memberList}>
              {memberEvents.map(event => (
                <li key={event.id} className={styles.memberItem}>
                  <strong>{event.title || `Event ${event.id}`}</strong>
                  {event.timestamp && <span className={styles.timestamp}> ({new Date(event.timestamp).toLocaleString()})</span>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className={styles.globeContainer}>
        <ThreeDGlobeEpic clusteringResults={clusteringResults} />
      </div>
    </div>
  );
};

export default ClusterPanel;
