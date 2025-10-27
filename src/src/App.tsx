import React, { useState, useMemo } from 'react';
import { Box, Grid2, Typography, styled } from '@mui/material';
import AppContext, { BodyData } from './components/contexts';
import SystemForm from './components/SystemForm';
import ParametersTab from './components/ParametersTab';
import PlotTabs from './components/PlotTabs';
import OrbitDisplay from './components/OrbitDisplay';
import CorrectorTable from './components/CorrectorTable';
import OrbitsTableDisplay from './components/OrbitsTable';
import orbitIcon from './assets/orbit.svg';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Header = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  marginTop: theme.spacing(4),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
}));

const PlotsSection = styled(Box)(() => ({
  display: 'grid',
  gridTemplateColumns: '3fr 2fr',
  gap: 32,
}));

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CircularRestrictedThreeBody: React.FC = () => {
  // State Management
  const [body, setBody] = useState<BodyData | null>(null);
  const [data, setData] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [icData, setICData] = useState(null);
  const [plotDataIc, setPlotDataIc] = useState(null);
  const [correctordata, setCorrectorData] = useState(null);
  const [isLoadingOrbits, setIsLoadingOrbits] = useState(false);

  // Memoized Context Value
  const contextValue = useMemo(
    () => ({
      body,
      plotData,
      icData,
      plotDataIc,
      correctorData: correctordata,
      tableData: data,
      isLoading: isLoadingOrbits,
      setBody,
      setPlotData,
      setICData,
      setPlotDataIc,
      setCorrectorData,
      setTableData: setData,
      setIsLoading: setIsLoadingOrbits,
    }),
    [body, plotData, icData, plotDataIc, correctordata, data, isLoadingOrbits]
  );

  return (
    <AppContext.Provider value={contextValue}>
      <Box sx={{ ml: 2, mr: 2, mt: 2, mb: 2 }}>
        <Header>
          <img src={orbitIcon} alt="Orbit icon" width={52} height={52} />
          <Typography variant="h3" component="h1">
            Circular Restricted Three Body Problem Orbits
          </Typography>
        </Header>

        <Typography
          variant="body1"
          sx={{ ml: 10, mr: 10 }}
          style={{ textAlign: 'center' }}
        >
          Welcome to the Three-Body Problem Periodic Orbits Database, an
          interactive online platform designed to support the exploration and
          analysis of periodic orbits within the Circular Restricted Three-Body
          Problem (CRTBP). This tool provides access to an extensive catalog of
          over 700,000 pre-computed periodic orbits, sourced from JPL and other
          databases, covering a variety of three-body systems such as Sun-Earth,
          Earth-Moon, Mars-Phobos, and Saturn-Titan. The interface allows users
          to visualize, compare, and refine orbits based on parameters like the
          Jacobi constant, period, and stability index, with options to filter
          orbits by family, such as Lyapunov, Halo, and Butterfly. In addition
          to data exploration Advanced users can access the API to retrieve data
          programmatically, apply corrections, or generate new orbits in a
          professional workflow. This platform is open-source and designed as
          both an educational tool and a research asset, enabling users to gain
          insights into orbit dynamics and potentially discover new orbits with
          applications in solar system exploration.
        </Typography>

        <Grid2 container>
          {/* Left Column - System Configuration */}
          <Grid2 size={3} sx={{ padding: 4, mt: 4 }}>
            <SystemForm
              onDataLoaded={setData}
              onIcDataLoaded={setICData}
              handlePlotData={setPlotData}
              handleBody={setBody}
              handleLoading={setIsLoadingOrbits}
              loading={isLoadingOrbits}
            />
            <ParametersTab data={data} />
          </Grid2>

          {/* Right Column - Plots and Tables */}
          <Grid2
            size={9}
            sx={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}
          >
            <PlotsSection sx={{ paddingTop: 4, paddingRight: 4 }}>
              <PlotTabs
                initialConditions={icData}
                database="1"
                tableData={data}
                setPlotData={setPlotData}
                setPlotDataIc={setPlotDataIc}
              />

              <OrbitDisplay
                plotData={plotData}
                icData={plotDataIc}
                setCorrectorData={setCorrectorData}
              />
            </PlotsSection>

            {/* Corrector Table Section */}
            <Grid2
              size={12}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 4,
              }}
            >
              <CorrectorTable
                correctordata={correctordata}
                setPlotData={setPlotData}
                setPlotDataIc={setPlotDataIc}
                data={data}
              />
            </Grid2>
          </Grid2>

          {/* Full Width Orbits Table */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <OrbitsTableDisplay
              data={data}
              handlePlotData={setPlotData}
              handleIcData={setPlotDataIc}
            />
          </Box>
        </Grid2>
      </Box>
    </AppContext.Provider>
  );
};

export default CircularRestrictedThreeBody;