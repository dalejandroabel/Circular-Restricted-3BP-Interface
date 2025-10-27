import React, { useEffect, useState, useCallback } from 'react';
import { Box, Button } from '@mui/material';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { useAppContext } from './contexts';
import { API_URL } from '../../config';
import { OrbitDisplayProps } from './types';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OrbitDisplay: React.FC<OrbitDisplayProps> = ({
  plotData,
  icData,
  setCorrectorData,
}) => {
  // ============================================================================
  // CONTEXT
  // ============================================================================
  const { body } = useAppContext();

  // ============================================================================
  // STATE
  // ============================================================================
  const [orbitsPlotData, setOrbitPlotData] = useState<Partial<Plotly.Data>[]>([
    {
      x: [],
      y: [],
      type: 'scatter',
      mode: 'lines',
      hovertemplate: 'x: %{x}<br>vy: %{y}',
      customdata: [[]],
      name: '',
    },
  ]);

  const [layout, setLayout] = useState<any>({
    b: 0,
    l: 0,
    r: 0,
    t: 0,
    pad: 0,
  });

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================
  const R2 = body?.radius;
  const R1 = body?.primary_radius;
  const mu = body?.mu || 0;

  // ============================================================================
  // EFFECT - Fetch and Process Plot Data
  // ============================================================================
  useEffect(() => {
    if (!plotData || plotData.length === 0 || !body) {
      return;
    }

    const fetchPlotData = async () => {
      let dataToPlot: Partial<Plotly.Data>[] = [];

      try {
        let lagrangeLen = 2;
        let maxCoords = [0, 0, 0];
        

        // Calculate maxCoords from orbit data
        plotData.forEach((orbit: any) => {
          if (!orbit.x || !orbit.y || !orbit.z) return;

          const _validX = orbit.x.filter(
            (val: number) => typeof val === 'number' && !isNaN(val)
          );
          const validY = orbit.y.filter(
            (val: number) => typeof val === 'number' && !isNaN(val)
          );
          const validZ = orbit.z.filter(
            (val: number) => typeof val === 'number' && !isNaN(val)
          );

          const validX = _validX.map((val: number) => val - (1 - mu));

          if (validX.length) maxCoords[0] = Math.max(maxCoords[0], ...validX);
          if (validY.length) maxCoords[1] = Math.max(maxCoords[1], ...validY);
          if (validZ.length) maxCoords[2] = Math.max(maxCoords[2], ...validZ);
        });

        // Get Lagrange points
        const { data: Lagrange } = await axios.get(
          `${API_URL}/orbits/lagrange/${body.id_body}`
        );
        const LagrangeData = JSON.parse(Lagrange.data);
        const [L1, L2, L3] = [
          LagrangeData.L1 - (1 - mu),
          LagrangeData.L2 - (1 - mu),
          LagrangeData.L3 - (1 - mu),
        ];

        // Create orbit traces
        const orbitTraces = plotData
          .filter((orbit: any) => orbit.x && orbit.y && orbit.z)
          .map((orbit: any, index: number) => {
            if (Math.min(...orbit.x) < 0) {
              lagrangeLen = 3;
            }
            return {
              x: orbit.x.map((val: number) => val - (1 - mu)),
              y: orbit.y,
              z: orbit.z,
              type: 'scatter3d',
              mode: 'lines',
              line: { color: 'black', width: 1 },
              hoverinfo: 'skip',
              name: `Orbit ${index + 1}`,
            };
          });

        // Fetch R2 sphere
        const { data: R2_sphere_ } = await axios.post(
          `${API_URL}/orbits/sphere/`,
          { R: R2, N: 2, mu: mu }
        );
        const R2_sphere = JSON.parse(R2_sphere_.data);
        const R2SphereTrace = {
          x: R2_sphere.x,
          y: R2_sphere.y,
          z: R2_sphere.z,
          type: 'surface',
          colorscale: [
            [0, 'blue'],
            [1, 'blue'],
          ],
          hoverinfo: 'skip',
          showscale: false,
          contours: {
            x: { highlight: false },
            y: { highlight: false },
            z: { highlight: false },
          },
        };

        if (maxCoords[0] < Math.abs(L1)) {
          maxCoords[0] = Math.abs(L1);
        }

        if (lagrangeLen === 3 && maxCoords[0] < Math.abs(L3)) {
          maxCoords[0] = Math.abs(L3);
        }

        // Fetch R1 sphere if needed
        let R1SphereTrace = null;
        if (lagrangeLen === 3) {
          if (maxCoords[0] < Math.abs(L3)) {
            maxCoords[0] = Math.abs(L3);
          }
          const { data: R1_sphere_ } = await axios.post(
            `${API_URL}/orbits/sphere/`,
            { R: R1, N: 1, mu: mu }
          );
          const R1_sphere = JSON.parse(R1_sphere_.data);
          R1SphereTrace = {
            x: R1_sphere.x,
            y: R1_sphere.y,
            z: R1_sphere.z,
            type: 'surface',
            colorscale: [
              [0, 'red'],
              [1, 'red'],
            ],
            hoverinfo: 'skip',
            showscale: false,
          };
        }

        // Lagrange points trace
        const LagrangeTrace = {
          x: [L1, L2, L3].slice(0, lagrangeLen),
          y: Array(lagrangeLen).fill(0),
          z: Array(lagrangeLen).fill(0),
          type: 'scatter3d',
          mode: 'markers+text',
          marker: { size: 1, color: 'black' },
          text: ['L1', 'L2', 'L3'].slice(0, lagrangeLen),
          textposition: 'top right',
          hoverinfo: 'skip',
          name: 'Lagrange points',
        };

        // Combine traces
        dataToPlot = [
          ...orbitTraces,
          R2SphereTrace,
          ...(R1SphereTrace ? [R1SphereTrace] : []),
          LagrangeTrace,
        ];

        // Set axis limits
        const factor = 1.1;
        const limit = Math.max(...maxCoords);
        const ranges = [-limit * factor, limit * factor];

        setLayout({
          scene: {
            aspectmode: 'manual',
            aspectratio: { x: 1, y: 1, z: 1 },
            xaxis: { title: 'X', range: ranges, showspikes: false, showline: true },
            yaxis: { title: 'Y', range: ranges, showspikes: false, showline: true },
            zaxis: { title: 'Z', range: ranges, showspikes: false, showline: true },
            camera: { eye: { x: 1.3, y: 1.3, z: 1.3 } },
          },
          legend: { xanchor: 'right', x: 0.9 },
          margin: { t: 0, b: 0, l: 0, r: 0, pad: 0 },
        });
      } catch (error) {
        console.error('Error in plot generation:', error);
      } finally {
        setOrbitPlotData(dataToPlot);
      }
    };

    fetchPlotData();
  }, [plotData, body, mu, R1, R2]);

  // ============================================================================
  // HANDLER - Close Orbit
  // ============================================================================
  const handleCloseOrbit = useCallback(() => {
    if (!icData || !body) {
      return;
    }

    let currentIcData = Array.isArray(icData) ? icData[0] : icData;
    
    if (!currentIcData || typeof currentIcData !== 'object' || !('x' in currentIcData)) {
      console.error("IC data is invalid or incomplete. Cannot initiate correction.");
      return;
  }

    const currentData = {
      iteration: 0,
      x: currentIcData.centered
        ? currentIcData.x - (1 - body.mu)
        : currentIcData.x,
      vy: currentIcData.vy,
      vz: currentIcData.vz,
      period: currentIcData.period,
      deltaX: 0,
      deltaVy: 0,
      deltaVz: 0,
      centered: currentIcData.centered,
    };

    setCorrectorData(currentData);
  }, [icData, body, setCorrectorData]);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        border: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        height: 650,
        mr: 0,
        padding: 0,
      }}
    >
      <p style={{ fontSize: 24, fontWeight: 'normal' }}>Orbit Display</p>

      <Box
        sx={{
          height: '500px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          width: '95%',
        }}
      >
        <Plot
          data={orbitsPlotData}
          layout={layout}
          config={{
            responsive: true,
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          padding: 2,
          gap: 2,
        }}
      >
        <Button
          variant="contained"
          onClick={handleCloseOrbit}
          sx={{
            backgroundColor: '#2196f3',
            '&:hover': {
              backgroundColor: '#1976d2',
            },
            textTransform: 'none',
            minWidth: '120px',
          }}
          disabled={false}
        >
          Close orbit
        </Button>
      </Box>
    </Box>
  );
};

export default OrbitDisplay;