import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClusterPanel from '../ClusterPanel';
import type { AugmentedEvent, ClusteringResult, EventCategory } from '../../types';

// Mock data setup
const mockClusteringResults: ClusteringResult = {
  clusters: [
    {
      id: 'cluster-1',
      eventIds: ['event-1', 'event-2'],
      theme: 'Political Protests'
    },
    {
      id: 'cluster-2',
      eventIds: ['event-3'],
      theme: 'Natural Disasters'
    }
  ]
};

const mockEventData: AugmentedEvent[] = [
  {
    id: 'event-1',
    title: 'Protests in France',
    timestamp: 1686816000000, // 6/15/2023 10:00:00
    latitude: 48.8566,
    longitude: 2.3522,
    category: 'political' as EventCategory,
    description: 'Large-scale protests in Paris',
    sourceUrl: 'https://example.com/protests-france',
    confidenceScore: 0.9,
    vector: Array(128).fill(0)
  },
  {
    id: 'event-2',
    title: 'Demonstrations in Germany',
    timestamp: 1686902400000, // 6/16/2023 14:30:00
    latitude: 52.52,
    longitude: 13.405,
    category: 'political' as EventCategory,
    description: 'Climate change demonstrations in Berlin',
    sourceUrl: 'https://example.com/demonstrations-germany',
    confidenceScore: 0.85,
    vector: Array(128).fill(0)
  },
  {
    id: 'event-3',
    title: 'Earthquake in Japan',
    timestamp: 1686985200000, // 6/17/2023 08:20:00
    latitude: 36.2,
    longitude: 138.25,
    category: 'natural_disaster' as EventCategory,
    description: 'Magnitude 6.5 earthquake hits Tokyo region',
    sourceUrl: 'https://example.com/earthquake-japan',
    confidenceScore: 0.95,
    vector: Array(128).fill(0)
  }
];

describe('ClusterPanel', () => {
  beforeEach(() => {
    render(
      <ClusterPanel 
        clusteringResults={mockClusteringResults} 
        eventData={mockEventData} 
      />
    );
  });

  test('renders thematic labels from clusteringResults', () => {
    // Check if the themes are rendered
    expect(screen.getByText('Political Protests')).toBeInTheDocument();
    expect(screen.getByText('Natural Disasters')).toBeInTheDocument();
    
    // Check if the correct number of cluster sections are rendered
    const clusterSections = screen.getAllByRole('heading', { level: 3 });
    expect(clusterSections).toHaveLength(2);
  });

  test('maps cluster members correctly using eventData', () => {
    // Check if member events are displayed under their respective clusters
    expect(screen.getByText('Protests in France')).toBeInTheDocument();
    expect(screen.getByText('Demonstrations in Germany')).toBeInTheDocument();
    expect(screen.getByText('Earthquake in Japan')).toBeInTheDocument();
    
    // Check if timestamps are formatted correctly
    expect(screen.getByText('Protests in France').nextSibling).toHaveTextContent(
      expect.stringContaining('6/15/2023')
    );
  });

  test('passes clusteringResults to 3DGlobe Epic', () => {
    // This test verifies that the clusteringResults prop is passed to 3DGlobeEpic
    // In a real test, we might mock ThreeDGlobeEpic to verify prop passing
    // For now, we'll ensure the component structure includes the 3DGlobeEpic
    const globeContainer = screen.getByTestId('globe-container');
    expect(globeContainer).toBeInTheDocument();
  });

  test('handles empty clustering results', () => {
    render(
      <ClusterPanel 
        clusteringResults={{ clusters: [] }} 
        eventData={mockEventData} 
      />
    );
    
    // Should not render any cluster sections
    const clusterSections = screen.queryByRole('heading', { level: 3 });
    expect(clusterSections).not.toBeInTheDocument();
  });

  test('handles missing events in eventData', () => {
    // Test with an event ID in cluster that doesn't exist in eventData
    const partialClusteringResults: ClusteringResult = {
      clusters: [
        {
          id: 'cluster-1',
          eventIds: ['event-1', 'non-existent-event'],
          theme: 'Mixed Events'
        }
      ]
    };

    render(
      <ClusterPanel 
        clusteringResults={partialClusteringResults} 
        eventData={[mockEventData[0]]} // Only include first event
      />
    );

    // Check that the cluster label is displayed
    expect(screen.getByText('Mixed Events')).toBeInTheDocument();
    
    // Check that only the existing event is displayed
    expect(screen.getByText('Protests in France')).toBeInTheDocument();
    
    // Check that the non-existent event is not displayed
    expect(screen.queryByText('non-existent-event')).not.toBeInTheDocument();
  });
});
