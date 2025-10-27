import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  MenuItem,
  SelectChangeEvent,
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
}) => {
  // ============================================================================
  // STATE - Selection
  // ============================================================================
  const [primaryBody, setPrimaryBody] = useState<string>('');
  const [secondaryBody, setSecondaryBody] = useState<string>('');
  const [family, setFamily] = useState<string>('');
  const [p, setP] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [libration, setLibration] = useState<string>('');
  const [batch, setBatch] = useState<string>('');

  // ============================================================================
  // STATE - Options
  // ============================================================================
  const [primaryOptions, setPrimaryOptions] = useState<SystemOption[]>([]);
  const [secondaryOptions, setSecondaryOptions] = useState<SystemOption[]>([]);
  const [familyOptions, setFamilyOptions] = useState<SystemOption[]>([]);
  const [pOptions, setPOptions] = useState<SystemOption[]>([]);
  const [qOptions, setQOptions] = useState<SystemOption[]>([]);
  const [librationOptions, setLibrationOptions] = useState<string[]>([]);

  // ============================================================================
  // STATE - UI Control
  // ============================================================================
  const [librationActive, setLibrationActive] = useState<boolean>(false);
  const [batchActive, setBatchActive] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [Norbits, setNorbits] = useState<number | undefined>(undefined);
  const [database, setDatabase] = useState<string>('0');
  const [currentSecondary, setCurrentSecondary] = useState<string>('');

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
            name: family.family,
          })) || [];
        setFamilyOptions(options);
        setFamily('');
      } catch (error) {
        console.error('Error fetching families:', error);
      }
    };

    fetchFamilies();
  }, [primaryBody, secondaryBody]);

  // ============================================================================
  // EFFECT - Fetch Resonance Options and Libration/Batch
  // ============================================================================
  useEffect(() => {
    if (!family) return;

    const fetchResonanceOptions = async () => {
      try {
        const response = await axios.get<ApiResponse>(
          `${API_URL}/resonances/${secondaryBody}`
        );

        const uniquePOptions = Array.from(
          new Set(response.data.resonances?.map((pair) => pair.p))
        )
          .sort((a, b) => Number(a) - Number(b))
          .map((p) => ({ id: p, name: p }));

        setPOptions(uniquePOptions);
        setQOptions([]);
        setQ('');
      } catch (error) {
        console.error('Error fetching resonance options:', error);
      }
    };

    const fetchLibrationBatch = async () => {
      try {
        const response = await axios.get<ApiResponse>(
          `${API_URL}/librationbatch/${family}`
        );

        if (response.data.family) {
          const librationData = response.data.family[0].libration;
          const batchData = response.data.family[0].batch;

          if (librationData && librationData !== '') {
            setLibrationActive(true);
            const libOptions = librationData.split('').map((num) => `L${num}`);
            setLibrationOptions(libOptions);
          } else {
            setLibrationActive(false);
            setLibrationOptions([]);
          }

          setBatchActive(batchData === 1);
          setLibration('');
          setBatch('');
        }
      } catch (error) {
        console.error('Error fetching libration batch:', error);
      }
    };

    if (family === '9') {
      fetchResonanceOptions();
      setBatchActive(false);
      setLibrationActive(false);
    } else {
      setPOptions([]);
      setQOptions([]);
      fetchLibrationBatch();
    }
  }, [family, secondaryBody]);

  // ============================================================================
  // EFFECT - Fetch Q Options
  // ============================================================================
  useEffect(() => {
    if (!family || family !== '9' || !p) return;

    const fetchQOptions = async () => {
      try {
        const response = await axios.get<ApiResponse>(
          `${API_URL}/resonances/${secondaryBody}`
        );

        const filteredQOptions =
          response.data.resonances
            ?.filter((pair) => pair.p === p)
            .map((pair) => ({ id: pair.q, name: pair.q }))
            .sort((a, b) => Number(a.id) - Number(b.id)) || [];

        setQOptions(filteredQOptions);

        if (!filteredQOptions.some((option) => option.id === q)) {
          setQ('');
        }
      } catch (error) {
        console.error('Error fetching Q options:', error);
      }
    };

    fetchQOptions();
  }, [p, secondaryBody, family, q]);

  // ============================================================================
  // HANDLERS - Selection Changes
  // ============================================================================
  const handlePrimaryChange = useCallback((event: SelectChangeEvent<string>) => {
    setPrimaryBody(event.target.value);
    setBatchActive(false);
    setLibrationActive(false);
    setSecondaryBody('');
    setFamily('');
    setFamilyOptions([]);
  }, []);

  const handleSecondaryChange = useCallback((event: SelectChangeEvent<string>) => {
    setSecondaryBody(event.target.value);
    setFamily('');
    setFamilyOptions([]);
    setBatchActive(false);
    setLibrationActive(false);
    setBatch('');
    setLibration('');
  }, []);

  const handleFamilyChange = useCallback((event: SelectChangeEvent<string>) => {
    setFamily(event.target.value);
  }, []);

  // ============================================================================
  // HANDLER - Load Orbits
  // ============================================================================
  const handleLoadOrbits = useCallback(async () => {
    const bodyResponse = await axios.get(`${API_URL}/bodies/${secondaryBody}`);
    handleBody(bodyResponse.data.body[0]);

    try {
      handleLoading(true);

      const formattedP = p === '' ? '0' : p;
      const formattedQ = q === '' ? '0' : q;
      const formattedLibration = libration === '' ? '-1' : libration.replace('L', '');
      const formattedBatch = batch === '' ? '0' : batch;
      const formattedLimit = Norbits === undefined ? '0' : String(Norbits);
      const formattedDatabase = database;

      const response = await axios.get<ApiResponse>(
        `${API_URL}/orbits/?S=${secondaryBody}&F=${family}&P=${formattedP}&Q=${formattedQ}&L=${formattedLibration}&B=${formattedBatch}&LIMIT=${formattedLimit}&D=${formattedDatabase}`
      );

      onDataLoaded(response.data);

      if (secondaryBody !== currentSecondary) {
        const responseIc = await axios.get<ApiResponse>(
          `${API_URL}/initialconditions/${secondaryBody}`
        );

        const icDataModified = {
          x: responseIc.data.initialconditions?.map((ic) => Number(ic.x0)),
          y: responseIc.data.initialconditions?.map((ic) => Number(ic.y0)),
          z: responseIc.data.initialconditions?.map((ic) => Number(ic.z0)),
          vx: responseIc.data.initialconditions?.map((ic) => Number(ic.vx0)),
          vy: responseIc.data.initialconditions?.map((ic) => Number(ic.vy0)),
          vz: responseIc.data.initialconditions?.map((ic) => Number(ic.vz0)),
          period: responseIc.data.initialconditions?.map((ic) => Number(ic.period)),
          family: responseIc.data.initialconditions?.map((ic) => Number(ic.id_family)),
          stability_index: responseIc.data.initialconditions?.map((ic) =>
            Number(ic.stability_index)
          ),
          jacobi_constant: responseIc.data.initialconditions?.map((ic) =>
            Number(ic.jacobi_constant)
          ),
          source: responseIc.data.initialconditions?.map((ic) => Number(ic.source)),
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
    p,
    q,
    libration,
    batch,
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
    if (family === '9' && (!p || !q)) return false;
    if (librationActive && !libration) return false;
    if (batchActive && !batch) return false;
    return true;
  }, [primaryBody, secondaryBody, family, p, q, libration, batch, librationActive, batchActive]);

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

          {family === '9' && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '80%' }}>
              <TextField
                id="p-select"
                label="p"
                value={p}
                onChange={(e) => {
                  setP(e.target.value);
                  setQ('');
                }}
                select
                fullWidth
              >
                {pOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                id="q-select"
                label="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                select
                fullWidth
                disabled={!p}
              >
                {qOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          {librationActive && (
            <TextField
              id="libration-select"
              label="Libration"
              value={libration}
              onChange={(e) => setLibration(e.target.value)}
              select
              fullWidth
              sx={{ width: '80%' }}
            >
              {librationOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          )}

          {batchActive && (
            <TextField
              id="batch-select"
              label="Batch"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              select
              fullWidth
              sx={{ width: '80%' }}
            >
              <MenuItem value="-1">South</MenuItem>
              <MenuItem value="1">North</MenuItem>
            </TextField>
          )}
        </Box>
      </Box>

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
              <MenuItem value="0">any</MenuItem>
              <MenuItem value="1">Planar Axis-symetric</MenuItem>
              <MenuItem value="2">JPL CRTBP</MenuItem>
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