import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  MenuItem,
  Button,
  TextField,
  Popover,
  IconButton,
  CircularProgress,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';
import { API_URL } from '../../config';
import { SystemOption, ApiResponse, SystemFormProps } from './types';
import AddOrbitsDialog from './newOrbitsDialog';
// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SystemForm: React.FC<SystemFormProps> = ({
  onDataLoaded,
  onIcDataLoaded,
  handlePlotData,
  handleBody,
  handleLoading,
  loading,
  setColumns
}) => {
  // ============================================================================
  // STATE - Selection
  // ============================================================================
  const [primaryBody, setPrimaryBody] = useState<string>('');
  const [secondaryBody, setSecondaryBody] = useState<string>('');
  const [family, setFamily] = useState<string>('');
  const [databases, setDatabases] = useState<string[]>([]);

  // ============================================================================
  // STATE - Options
  // ============================================================================
  const [primaryOptions, setPrimaryOptions] = useState<SystemOption[]>([]);
  const [secondaryOptions, setSecondaryOptions] = useState<SystemOption[]>([]);
  const [familyOptions, setFamilyOptions] = useState<SystemOption[]>([]);

  // ============================================================================
  // STATE - UI Control
  // ============================================================================
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [Norbits, setNorbits] = useState<number | undefined>(undefined);
  const [database, setDatabase] = useState<string>('0');
  const [currentSecondary, setCurrentSecondary] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);


  // ============================================================================
  // EFFECT - Fetch Primary Bodies
  // ============================================================================
  useEffect(() => {
    const fetchPrimaryBodies = async () => {
      try {

        const response = await axios.get<ApiResponse>(`${API_URL}/primaries`);
        const options =
          response.data.primaries?.map((body) => ({
            id: body.id_body,
            name: body.secondary,
          })) || [];
        setPrimaryOptions(options);
      } catch (error) {
        console.error('Error fetching primary bodies:', error);
      }
    };

    fetchPrimaryBodies();
  }, []);

  // ============================================================================
  // EFFECT - Fetch Secondary Bodies
  // ============================================================================
  useEffect(() => {
    if (!primaryBody) {
      setSecondaryOptions([]);
      return;
    }

    const fetchSecondaryBodies = async () => {
      try {
        const response = await axios.get<ApiResponse>(
          `${API_URL}/secondaries/${primaryBody}`
        );
        const options =
          response.data.secondaries?.map((body) => ({
            id: body.id_body,
            name: body.secondary,
          })) || [];
        setSecondaryOptions(options);
        setSecondaryBody('');
        setFamily('');
      } catch (error) {
        console.error('Error fetching secondary bodies:', error);
      }
    };

    fetchSecondaryBodies();
  }, [primaryBody]);

  // ============================================================================
  // EFFECT - Fetch Families
  // ============================================================================
  useEffect(() => {
    if (!primaryBody || !secondaryBody) {
      setFamilyOptions([]);
      return;
    }

    const fetchFamilies = async () => {
      try {
        const response = await axios.get<ApiResponse>(
          `${API_URL}/families/${secondaryBody}`
        );
        const options =
          response.data.families?.map((family) => ({
            id: family.id_family,
            name: family.name,
          })) || [];
        setFamilyOptions(options);
        setFamily('');
      } catch (error) {
        console.error('Error fetching families:', error);
      }
    };

    fetchFamilies();
  }, [primaryBody, secondaryBody]);


  useEffect(() => {
    loadDatabases();
  }, []);

  const loadDatabases = async () => {
    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/databases/`);
      setDatabases(response.data.databases || []);
      return databases;
    } catch (error) {
      console.error('Error fetching databases:', error);
      return [];
    }
  }
  // ============================================================================
  // HANDLERS - Selection Changes
  // ============================================================================
  const handlePrimaryChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPrimaryBody(event.target.value);

    setSecondaryBody('');
    setFamily('');
    setFamilyOptions([]);
  }, []);

  const handleSecondaryChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSecondaryBody(event.target.value);
    setFamily('');
    setFamilyOptions([]);
  }, []);

  const handleFamilyChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFamily(event.target.value);
  }, []);

  // ============================================================================
  // HANDLER - Load Orbits
  // ============================================================================
  const handleLoadOrbits = useCallback(async () => {
    const bodyResponse = await axios.get(`${API_URL}/bodies/${secondaryBody}`);
    handleBody(bodyResponse.data.body);

    try {
      handleLoading(true);

      const formattedLimit = Norbits === undefined ? '0' : String(Norbits);
      const formattedDatabase = database;

      const response = await axios.get<ApiResponse>(
        `${API_URL}/orbits/?S=${secondaryBody}&F=${family}&LIMIT=${formattedLimit}&D=${formattedDatabase}`
      );

      onDataLoaded(response.data);

      const responseColumns = await axios.get<ApiResponse>(
        `${API_URL}/columns/${secondaryBody}`
      );
      setColumns(responseColumns.data);

      if (secondaryBody !== currentSecondary) {
        const responseIc = await axios.get<ApiResponse>(
          `${API_URL}/initialconditions/${secondaryBody}`
        );

        const icDataModified = {
          x: responseIc.data.initialconditions?.map((ic) => Number(ic.x)),
          y: responseIc.data.initialconditions?.map((ic) => Number(ic.y)),
          z: responseIc.data.initialconditions?.map((ic) => Number(ic.z)),
          vx: responseIc.data.initialconditions?.map((ic) => Number(ic.vx)),
          vy: responseIc.data.initialconditions?.map((ic) => Number(ic.vy)),
          vz: responseIc.data.initialconditions?.map((ic) => Number(ic.vz)),
          period: responseIc.data.initialconditions?.map((ic) => Number(ic.period)),
          family: responseIc.data.initialconditions?.map((ic) => Number(ic.id_family)),
          stability_index: responseIc.data.initialconditions?.map((ic) =>
            Number(ic.stability_index)
          ),
          jacobi_constant: responseIc.data.initialconditions?.map((ic) =>
            Number(ic.jc)
          ),
          source: responseIc.data.initialconditions?.map((ic) => String(ic.source)),
        };
        onIcDataLoaded(icDataModified);
        handlePlotData([]);
      }

      setCurrentSecondary(secondaryBody);
    } catch (error) {
      console.error('Error fetching orbits:', error);
    } finally {
      handleLoading(false);
    }
  }, [
    secondaryBody,
    family,
    Norbits,
    database,
    currentSecondary,
    handleBody,
    handleLoading,
    onDataLoaded,
    onIcDataLoaded,
    handlePlotData,
  ]);

  // ============================================================================
  // UTILITY - Check if Button is Enabled
  // ============================================================================
  const isButtonEnabled = useCallback((): boolean => {
    const hasBasicSelection = primaryBody && secondaryBody && family;
    if (!hasBasicSelection) return false;
    return true;
  }, [primaryBody, secondaryBody, family]);


  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <Box
      sx={{
        minWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: 650,
        alignItems: 'center',
        justifyContent: 'space-between',
        border: 1,
        borderColor: '#ccc',
        borderRadius: 5,
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <p style={{ fontSize: 24, fontWeight: 'normal' }}>System</p>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            flexDirection: 'column',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <TextField
            id="primary-select"
            label="Primary Body"
            value={primaryBody}
            onChange={handlePrimaryChange}
            select
            fullWidth
            sx={{ width: '80%' }}
          >
            {primaryOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            id="secondary-select"
            label="Secondary Body"
            value={secondaryBody}
            onChange={handleSecondaryChange}
            select
            fullWidth
            disabled={!primaryBody}
            sx={{ width: '80%' }}
          >
            {secondaryOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            id="family-select"
            label="Family"
            value={family}
            onChange={handleFamilyChange}
            select
            fullWidth
            disabled={!secondaryBody}
            sx={{ width: '80%' }}
          >
            {familyOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>

        </Box>
      </Box>
      <Button variant="outlined" onClick={() => setDialogOpen(true)}>
        Add Orbits
      </Button>
      <AddOrbitsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}>
      </AddOrbitsDialog>

      <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              select
              fullWidth
            >
              <MenuItem value="-1">All Databases</MenuItem>
              {databases.map((db, index) => (
                <MenuItem key={index} value={String(index)}>
                  {db}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Number of Orbits"
              type="number"
              value={Norbits}
              onChange={(e) => setNorbits(Number(e.target.value))}
              fullWidth
            />
          </Box>
        </Popover>

        <IconButton
          aria-label="Configuration"
          size="large"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            borderRadius: 2,
            p: 1,
            '& .MuiSvgIcon-root': { fontSize: 30 },
            boxShadow: 0,
            mr: 2,
          }}
        >
          <SettingsIcon />
        </IconButton>

        <Button
          variant="contained"
          onClick={handleLoadOrbits}
          disabled={!isButtonEnabled() || loading}
          sx={{
            height: 50,
            justifySelf: 'self-end',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <Box
              component="span"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={24} color="inherit" />
            </Box>
          ) : (
            'Load orbits'
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default SystemForm;