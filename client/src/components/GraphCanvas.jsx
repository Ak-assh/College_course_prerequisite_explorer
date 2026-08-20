import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

// Register dagre layout extension with Cytoscape
if (!cytoscape.prototype.hasDagreRegistered) {
  cytoscape.use(dagre);
  cytoscape.prototype.hasDagreRegistered = true;
}

const DEPT_COLORS = [
  { name: 'Computer Science', color: '#6366f1' },
  { name: 'Mathematics', color: '#10b981' },
  { name: 'Data Science', color: '#06b6d4' },
  { name: 'Electrical Eng', color: '#f59e0b' },
  { name: 'Physics', color: '#ec4899' }
];

export default function GraphCanvas({ onCourseSelect, completedCourses = [], filterDept = null }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function initGraph() {
      setLoading(true);
      try {
        const graphData = filterDept 
          ? await api.getDepartmentGraph(filterDept)
          : await api.getFullGraph();

        if (!isMounted || !containerRef.current) return;

        // Cleanup existing instance
        if (cyRef.current) {
          cyRef.current.destroy();
        }

        const cy = cytoscape({
          container: containerRef.current,
          elements: [
            ...(graphData.nodes || []),
            ...(graphData.edges || [])
          ],
          style: [
            {
              selector: 'node',
              style: {
                'label': 'data(label)',
                'background-color': 'data(color)',
                'color': '#f8fafc',
                'font-family': 'JetBrains Mono, monospace',
                'font-size': '11px',
                'font-weight': '600',
                'text-valign': 'center',
                'text-halign': 'center',
                'width': 'mapData(credits, 1, 4, 34, 56)',
                'height': 'mapData(credits, 1, 4, 34, 56)',
                'border-width': 2,
                'border-color': 'rgba(255, 255, 255, 0.2)',
                'transition-property': 'background-color, border-color, width, height, opacity',
                'transition-duration': '200ms',
                'text-outline-color': '#090a10',
                'text-outline-width': 2
              }
            },
            {
              selector: 'node:selected',
              style: {
                'border-color': '#ffffff',
                'border-width': 4,
                'shadow-blur': 20,
                'shadow-color': '#6366f1',
                'shadow-opacity': 0.8
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 2,
                'line-color': 'rgba(99, 102, 241, 0.45)',
                'target-arrow-color': '#6366f1',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'arrow-scale': 0.9,
                'transition-property': 'line-color, target-arrow-color, width',
                'transition-duration': '200ms'
              }
            },
            {
              selector: 'edge[type = "recommended"]',
              style: {
                'line-style': 'dashed',
                'line-dash-pattern': [4, 4],
                'line-color': 'rgba(148, 163, 184, 0.4)',
                'target-arrow-color': '#94a3b8'
              }
            }
          ],
          layout: {
            name: 'dagre',
            rankDir: 'BT', // Bottom-to-Top (entry courses at bottom, terminal courses at top)
            nodeSep: 60,
            rankSep: 85,
            padding: 50,
            animate: true,
            animationDuration: 400
          },
          minZoom: 0.3,
          maxZoom: 2.5,
          wheelSensitivity: 0.25
        });

        // Event listeners
        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          onCourseSelect(node.id());
        });

        cy.on('mouseover', 'node', (evt) => {
          const node = evt.target;
          const renderedPos = node.renderedPosition();
          setHoveredNode({
            code: node.data('label'),
            name: node.data('name'),
            level: node.data('level'),
            credits: node.data('credits'),
            department: node.data('department'),
            x: renderedPos.x,
            y: renderedPos.y
          });

          // Highlight neighborhood
          cy.elements().style('opacity', 0.2);
          node.neighborhood().add(node).style('opacity', 1);
        });

        cy.on('mouseout', 'node', () => {
          setHoveredNode(null);
          cy.elements().style('opacity', 1);
        });

        cyRef.current = cy;
      } catch (err) {
        console.error('Error rendering Cytoscape graph:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initGraph();

    return () => {
      isMounted = false;
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [filterDept, onCourseSelect]);

  // Update node appearance when completedCourses changes
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    
    cy.batch(() => {
      cy.nodes().forEach(node => {
        const isDone = completedCourses.includes(node.id());
        if (isDone) {
          node.style({
            'border-color': '#3b82f6',
            'border-width': 3,
            'shadow-blur': 12,
            'shadow-color': '#3b82f6',
            'shadow-opacity': 0.6
          });
        } else {
          node.style({
            'border-color': 'rgba(255, 255, 255, 0.2)',
            'border-width': 2,
            'shadow-blur': 0
          });
        }
      });
    });
  }, [completedCourses]);

  // HUD Handlers
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.7);
  const handleFit = () => cyRef.current?.fit(null, 50);
  const handleReset = () => {
    cyRef.current?.reset();
    cyRef.current?.fit(null, 50);
  };

  return (
    <div className="graph-canvas-container">
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(9, 10, 16, 0.7)',
          zIndex: 20
        }}>
          <div className="loading-spinner" style={{ width: '44px', height: '44px', marginBottom: '16px' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading CognoDB Course Graph...</p>
        </div>
      )}

      <div id="cy-viewport" ref={containerRef} />

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div className="node-tooltip" style={{ left: `${hoveredNode.x}px`, top: `${hoveredNode.y}px` }}>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {hoveredNode.code}: {hoveredNode.name}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
            {hoveredNode.department} • {hoveredNode.credits} Credits • {hoveredNode.level} Level
          </div>
        </div>
      )}

      {/* HUD Zoom & Pan Controls */}
      <div className="graph-hud-controls">
        <button className="hud-btn" onClick={handleZoomIn} title="Zoom In" aria-label="Zoom In">
          <ZoomIn size={18} />
        </button>
        <button className="hud-btn" onClick={handleZoomOut} title="Zoom Out" aria-label="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <button className="hud-btn" onClick={handleFit} title="Fit to Viewport" aria-label="Fit View">
          <Maximize2 size={18} />
        </button>
        <button className="hud-btn" onClick={handleReset} title="Reset Layout" aria-label="Reset View">
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Department & Edge Legend */}
      <div className="graph-legend-overlay">
        <div className="legend-title">Department Mapping</div>
        <div className="legend-items">
          {DEPT_COLORS.map(d => (
            <div key={d.name} className="legend-item">
              <span className="legend-color-dot" style={{ backgroundColor: d.color }}></span>
              <span>{d.name}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', gap: '16px' }}>
          <div className="legend-item">
            <span className="legend-edge-sample mandatory"></span>
            <span>Mandatory</span>
          </div>
          <div className="legend-item">
            <span className="legend-edge-sample recommended"></span>
            <span>Recommended</span>
          </div>
        </div>
      </div>
    </div>
  );
}
