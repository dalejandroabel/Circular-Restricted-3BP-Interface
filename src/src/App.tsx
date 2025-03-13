import React, { useState } from 'react';
import { Box, Typography, styled } from '@mui/material';
import SystemForm from './components/SystemForm';
import ParametersTab from './components/ParametersTab';
import PlotTabs from './components/PlotTabs';
import OrbitDisplay from './components/OrbitDisplay';
import CorrectorTable from './components/CorrectorTable';
import OrbitsTableDisplay from './components/OrbitsTable';


const PageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3)
}));

const Header = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
}));

const MainContent = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '400px 1fr 1fr',
  gridTemplateRows: 'auto auto',
  gap: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const PlotsSection = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(3),
  gridColumn: '2 / -1',
}));

const TablesSection = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing(3),
  gridColumn: '2 / -1',
}));

const BottomTableSection = styled(Box)(({ theme }) => ({
  gridColumn: '1 / -1',
  marginTop: theme.spacing(3),
}));

const CircularRestrictedThreeBody: React.FC = () => {
  const [isCanonical, setIsCanonical] = useState(true);
  const  [data, setData] = useState(null);
  const [plotData, setPlotData] = useState(null);
  

  const handleDataLoaded = (loadedData) => {
    setData(loadedData);
  }
  const handlePlotData = (plotData) => {
    setPlotData(plotData);
  }
  
  return (
    <PageContainer>
      <Header>
        <img src="/path-to-icon.png" alt="Orbit icon" width={32} height={32} />
        <Typography variant="h4" component="h1">
          Circular Restricted Three Body Problem Orbits
        </Typography>
      </Header>

      <Typography variant="body1" sx={{ mb: 4 }} style={{textAlign: "center"}}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit...
      </Typography>
      <MainContent>
        {/* Left column - System configuration */}
        <Box sx={{ gridRow: 'span 2' }}>
          <SystemForm onDataLoaded = {handleDataLoaded}/>
          <ParametersTab 
          data={data} />
        </Box>

        {/* Plots section - Contains both plots */}
        <PlotsSection>
          <PlotTabs />
          <OrbitDisplay 
            isCanonical={isCanonical} 
            onUnitsChange={setIsCanonical}
            setIsCanonical={setIsCanonical}
            plotData={plotData}
          />
        </PlotsSection>

        {/* First table section - Below plots */}
        <TablesSection>
          <CorrectorTable 
            isCanonical={isCanonical}
          />
        </TablesSection>
      </MainContent>

      {/* Bottom table - Full width */}
      <BottomTableSection>
        <OrbitsTableDisplay 
          isCanonical={isCanonical}
          data={data}
          handlePlotData={handlePlotData}
        />
      </BottomTableSection>
    </PageContainer>
  );
};

export default CircularRestrictedThreeBody;