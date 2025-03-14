import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  styled,
} from '@mui/material';
import Plot from 'react-plotly.js';

const StyledBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(4),
}));

interface OrbitDisplayProps {
  isCanonical: boolean;
  plotData: any;
  setIsCanonical: (isCanonical: boolean) => void;
  onUnitsChange?: (isCanonical: boolean) => void;
}

const OrbitDisplay: React.FC<OrbitDisplayProps> = ({
  isCanonical,
  setIsCanonical,
  plotData }) => {

  const [orbitsPlotData, setOrbitPlotData] = useState([{
      x: [],
      y: [],
      type: 'scatter',
      mode: 'lines',
      hovertemplate: 'x: %{x}<br>vy: %{y}',
      customdata: [[]],
      name: ""
    }]);
  
    useEffect(() => {
      if (!plotData) {
        return;
      }
      const fetchPlotData = async () => {

      const dataToPlot = plotData.map((orbit: any) => {
        return {
          x: orbit.x,
          y: orbit.y,
          type: '',
          mode: 'lines',
          hovertemplate: 'x: %{x}<br>y: %{y}',
          customdata: [[]],
          name: ""
        };
        });
        setOrbitPlotData(dataToPlot);
      };
  
      fetchPlotData();
    }, [plotData]);


  const handleUnitsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCanonical(event.target.checked);
  };

  const handleCloseOrbit = () => {
    console.log('Closing orbit...');
    // Add your orbit closing logic here
  };

  return (
    <StyledBox>
      <Typography variant="h6" component="h2">
        Orbit display
      </Typography>

      <Box sx={{
        width: '100%',
        height: '400px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <Plot
          data={orbitsPlotData}
          layout={{
            legend: {
              xanchor: 'right',
              x: 0.9,
            },
            
            margin: { t: 10, b: 40, l: 10, r: 10 },
          }}
          config={{
            responsive: true,
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </Box>

      <ControlsContainer>
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
      </ControlsContainer>
    </StyledBox>
  );
};

export default OrbitDisplay;

