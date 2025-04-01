import React, { useContext, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Switch,
  FormControlLabel,
  Typography,
} from '@mui/material';
import Plot from 'react-plotly.js';
import BodyContext from './contexts';
import { API_URL } from '../../config';
import axios from 'axios';
import { OrbitDisplayProps } from './types';

const OrbitDisplay: React.FC<OrbitDisplayProps> = ({
  isCanonical,
  setIsCanonical,
  plotData,
  icData,
  setCorrectorData }) => {

  const [orbitsPlotData, setOrbitPlotData] = useState<Partial<Plotly.Data>[]>([{
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    hovertemplate: 'x: %{x}<br>vy: %{y}',
    customdata: [[]],
    name: ""
  }]);
  const [layout, setLayout] = useState<any>(null);
  const body = useContext<any>(BodyContext);
  const R2 = body?.radius;
  const R1 = body?.primary_radius;

  useEffect(() => {

    if (!plotData || plotData.length == 0) {
      return;
    }
    const fetchPlotData = async () => {
      try {
        let lagrangeLen = 2;
        let maxCoords = [0, 0, 0];

        // Calculate maxCoords from orbit data
        plotData.forEach((orbit: any) => {
          if (!orbit.x || !orbit.y || !orbit.z) return;

          const _validX = orbit.x.filter((val: number) => typeof val === "number" && !isNaN(val));
          const validY = orbit.y.filter((val: number) => typeof val === "number" && !isNaN(val));
          const validZ = orbit.z.filter((val: number) => typeof val === "number" && !isNaN(val));

          const validX = _validX.map((val: number) => val - (1 - body.mu));

          if (validX.length) maxCoords[0] = Math.max(maxCoords[0], ...validX);
          if (validY.length) maxCoords[1] = Math.max(maxCoords[1], ...validY);
          if (validZ.length) maxCoords[2] = Math.max(maxCoords[2], ...validZ);
        });

        // Get Lagrange points from API
        const { data: Lagrange } = await axios.get(`${API_URL}/orbits/lagrange/${body.id_body}`);
        const LagrangeData = JSON.parse(Lagrange.data);
        const [L1, L2, L3] = [LagrangeData.L1 - (1 - body.mu), LagrangeData.L2 - (1 - body.mu), LagrangeData.L3 - (1 - body.mu)];

        // Create orbit traces with line style (as in Python: black, width 1, mode "lines")
        const orbitTraces = plotData
          .filter((orbit: any) => orbit.x && orbit.y && orbit.z)
          .map((orbit: any, index: number) => {
            // Adjust lagrangeLen if any orbit has negative x values
            if (Math.min(...orbit.x) < 0) {
              lagrangeLen = 3;
            }
            return {
              x: orbit.x.map((val: number) => val - (1 - body.mu)),
              y: orbit.y,
              z: orbit.z,
              type: "scatter3d",
              mode: "lines",
              line: { color: "black", width: 1 },
              hoverinfo: "skip",
              name: `Orbit ${index + 1}`,
            };
          });

        // Fetch R2 sphere data from API and create its trace
        const { data: R2_sphere_ } = await axios.post(`${API_URL}/orbits/sphere/`, { R: R2 });
        const R2_sphere = JSON.parse(R2_sphere_.data);
        const R2SphereTrace = {
          x: R2_sphere.x,
          y: R2_sphere.y,
          z: R2_sphere.z,
          type: "surface",
          colorscale: "mint",
          hoverinfo: "skip",
          showscale: false,
          contours: { x: { highlight: false }, y: { highlight: false }, z: { highlight: false } },
        };

        if (maxCoords[0] < Math.abs(L1)) {
          maxCoords[0] = Math.abs(L1);
        }
        // Adjust maxCoords if needed (mimicking Python behavior)
        if (lagrangeLen === 3 && maxCoords[0] < Math.abs(L3)) {
          maxCoords[0] = Math.abs(L3);
        }

        // Fetch R1 sphere if required (only if lagrangeLen is 3)
        let R1SphereTrace = null;
        if (lagrangeLen === 3) {
          if (maxCoords[0] < Math.abs(L3)) {
            maxCoords[0] = Math.abs(L3);
          }
          const { data: R1_sphere_ } = await axios.post(`${API_URL}/orbits/sphere/`, { R: R1 });
          const R1_sphere = JSON.parse(R1_sphere_.data);
          R1SphereTrace = {
            x: R1_sphere.x,
            y: R1_sphere.y,
            z: R1_sphere.z,
            type: "surface",
            colorscale: [[0, "red"], [1, "red"]],
            hoverinfo: "skip",
            showscale: false,
          };
        }

        // Create Lagrange points trace
        const LagrangeTrace = {
          x: [L1, L2, L3].slice(0, lagrangeLen),
          y: Array(lagrangeLen).fill(0),
          z: Array(lagrangeLen).fill(0),
          type: "scatter3d",
          mode: "markers+text",
          marker: { size: 1, color: "black" },
          text: ["L1", "L2", "L3"].slice(0, lagrangeLen),
          textposition: "top right",
          hoverinfo: "skip",
          name: "Lagrange points",
        };

        // Combine all traces in the order: orbits, spheres, then Lagrange points
        const dataToPlot = [
          ...orbitTraces,
          R2SphereTrace,
          ...(R1SphereTrace ? [R1SphereTrace] : []),
          LagrangeTrace,
        ];


        // Determine axis limits (similar to Python: limit based on maxCoords and factor)
        const factor = 1.1;
        const limit = Math.max(...maxCoords);
        const ranges = [-limit * factor, limit * factor];
        // Update layout with camera settings matching Python's
        setLayout({
          scene: {
            aspectmode: "manual",
            aspectratio: { x: 1, y: 1, z: 1 },
            xaxis: { title: "X", range: ranges, showspikes: false, showline: true },
            yaxis: { title: "Y", range: ranges, showspikes: false, showline: true },
            zaxis: { title: "Z", range: ranges, showspikes: false, showline: true },
            camera: { eye: { x: 1.3, y: 1.3, z: 1.3 } },
          },
          legend: { xanchor: "right", x: 0.9 },
          margin: { t: 0, b: 0, l: 0, r: 0, pad: 0 },
        });

        setOrbitPlotData(dataToPlot);
      } catch (error) {
        console.error("Error in plot generation:", error);
      }
    };

    fetchPlotData();
  }, [plotData]);



  const handleUnitsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCanonical(event.target.checked);
  };

  const handleCloseOrbit = async () => {
    if (!icData) {
      return;
    }
    if (Array.isArray(icData)) {
      icData = icData[0];
    }
    let currentData = {
      iteration: 0,
      x: icData.x,
      vy: icData.vy,
      vz: icData.vz,
      period: icData.period,
      deltaX: 0,
      deltaVy: 0,
      deltaVz: 0,
    };

    setCorrectorData(currentData); // Set initial data in the table
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <Typography variant="h6" component="h2">
        Orbit display
      </Typography>

      <Box sx={{
        height: '500px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        width: '90%',
      }}>
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

      <Box sx={{ display: 'flex', justifyContent: "center", alignItems: 'center', width: '100%', padding: 0, gap: 10 }}>
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
          disabled={icData?.length > 1}
        >
          Close orbit
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography>Units:</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isCanonical}
                onChange={handleUnitsChange}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#2196f3',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#2196f3',
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography
                  sx={{
                    color: isCanonical ? '#2196f3' : 'text.secondary',
                    transition: 'color 0.3s',
                  }}
                >
                  {isCanonical ? 'Canonical' : 'International'}
                </Typography>
              </Box>
            }
          />
        </Box>
      </Box>
    </Box>
  );
};

export default OrbitDisplay;

