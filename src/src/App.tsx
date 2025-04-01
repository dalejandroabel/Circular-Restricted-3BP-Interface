import React, { useState } from 'react';
import { Box, Grid2, Typography, styled } from '@mui/material';
import SystemForm from './components/SystemForm';
import ParametersTab from './components/ParametersTab';
import PlotTabs from './components/PlotTabs';
import OrbitDisplay from './components/OrbitDisplay';
import CorrectorTable from './components/CorrectorTable';
import OrbitsTableDisplay from './components/OrbitsTable';
import BodyContext from './components/contexts';
import orbitIcon from './assets/orbit.svg';




const Header = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
}));


const PlotsSection = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '3fr 2fr',
  gap: theme.spacing(0),
  gridColumn: '2',
  marginTop: theme.spacing(2),
}));

const CircularRestrictedThreeBody: React.FC = () => {
  const [isCanonical, setIsCanonical] = useState(true);
  const [data, setData] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [icData, setICData] = useState(null);
  const [plotDataIc, setPlotDataIc] = useState(null);
  const [correctordata, setCorrectorData] = useState(null);
  const [body, setBody] = useState(null);
  const [isLoadingOrbits, setIsLoadingOrbits] = useState(false);



  return (
    <Box>
      <Header>
        <img src={orbitIcon} alt="Orbit icon" width={46} height={46} />
        <Typography variant="h4" component="h1">
          Circular Restricted Three Body Problem Orbits
        </Typography>
      </Header>

      <Typography variant="body1" sx={{ mb: 4 }} style={{ textAlign: "center" }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit...
      </Typography>
      <Grid2 container>
        <BodyContext.Provider value={body}>
          {/* Left column - System configuration */}
          <Grid2 size={3}>
            <SystemForm
              onDataLoaded={setData}
              onIcDataLoaded={setICData}
              handlePlotData={setPlotData}
              handleBody={setBody}
              handleLoading={setIsLoadingOrbits}
              loading={isLoadingOrbits}
            />
            <ParametersTab
              data={data} isLoading={isLoadingOrbits} />
          </Grid2>

          {/* Plots section - Contains both plots */}
          <Grid2 size={9} sx={{ display: 'flex', flexDirection: 'column'}}>

            <PlotsSection>
              <PlotTabs
                initialConditions={icData}
                database='1'
                tableData={data}
                setPlotData={setPlotData}
                setPlotDataIc={setPlotDataIc} />

              <OrbitDisplay
                isCanonical={isCanonical}
                onUnitsChange={setIsCanonical}
                setIsCanonical={setIsCanonical}
                plotData={plotData}
                icData={plotDataIc}
                setCorrectorData={setCorrectorData}
              />
            </PlotsSection>

            {/* First table section - Below plots */}
            <Grid2 size={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CorrectorTable
                isCanonical={isCanonical}
                correctordata={correctordata}
                setPlotData={setPlotData}
                setPlotDataIc={setPlotDataIc}
              />
            </Grid2>
          </Grid2>
          <Box sx= {{ display: 'flex', flexDirection: 'column', justifyContent:'center', width: '100%' }}>
            <OrbitsTableDisplay
              isCanonical={isCanonical}
              data={data}
              handlePlotData={setPlotData}
              handleIcData={setPlotDataIc}
              isLoading={isLoadingOrbits}
            />
          </Box >

        </BodyContext.Provider>
      </Grid2 >

    </Box>
  );
};

export default CircularRestrictedThreeBody;