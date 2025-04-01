import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button
} from '@mui/material';
import axios from 'axios';
import { API_URL } from "../../config";

interface SystemOption {
  id: string;
  name: string;
}

interface ApiResponse {
  primaries?: { id_body: string; secondary: string; }[];
  secondaries?: { id_body: string; secondary: string; }[];
  families?: { id_family: string; family: string; }[];
  family?: Array<{
    libration?: string;
    batch?: number;
  }>;
  resonances?: { p: string; q: string; }[];
  orbits?: any;
  initialconditions?: {
    x0: string,
    y0: string,
    z0: string,
    vx0: string,
    vy0: string,
    vz0: string,
    period: string,
    id_family: string,
    stability_index: string,
    jacobi_constant: string
  }[];

}

interface SystemFormProps {
  onDataLoaded: (data: any) => void;
  onIcDataLoaded: (data: any) => void;
  handlePlotData: (data: any) => void;
  handleBody: (data: any) => void;
}

const SystemForm: React.FC<SystemFormProps> = ({
  onDataLoaded,
  onIcDataLoaded,
  handlePlotData,
  handleBody
}) => {
  const [primaryBody, setPrimaryBody] = useState<string>('');
  const [secondaryBody, setSecondaryBody] = useState<string>('');
  const [family, setFamily] = useState<string>('');
  const [p, setP] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [libration, setLibration] = useState<string>('');
  const [batch, setBatch] = useState<string>('');

  const [primaryOptions, setPrimaryOptions] = useState<SystemOption[]>([]);
  const [secondaryOptions, setSecondaryOptions] = useState<SystemOption[]>([]);
  const [familyOptions, setFamilyOptions] = useState<SystemOption[]>([]);

  const [librationActive, setLibrationActive] = useState<boolean>(false);
  const [batchActive, setBatchActive] = useState<boolean>(false);
  const [librationOptions, setLibrationOptions] = useState<string[]>([]);

  const [pOptions, setPOptions] = useState<SystemOption[]>([]);
  const [qOptions, setQOptions] = useState<SystemOption[]>([]);

  // Fetch primary bodies on component mount
  useEffect(() => {
    const fetchPrimaryBodies = async () => {
      try {
        const response = await axios.get<ApiResponse>(`${API_URL}/primaries`);
        const options = response.data.primaries?.map((body) => ({
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

  // Fetch secondary bodies when primary body changes
  useEffect(() => {
    const fetchSecondaryBodies = async () => {
      if (!primaryBody) {
        setSecondaryOptions([]);
        return;
      }

      try {
        const response = await axios.get<ApiResponse>(`${API_URL}/secondaries/${primaryBody}`);
        const options = response.data.secondaries?.map((body) => ({
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

  // Fetch families when secondary body changes
  useEffect(() => {
    const fetchFamilies = async () => {
      if (!primaryBody || !secondaryBody) {
        setFamilyOptions([]);
        return;
      }

      try {
        const response = await axios.get<ApiResponse>(`${API_URL}/families/${secondaryBody}`);
        const options = response.data.families?.map((family) => ({
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

  // Fetch resonance options when family changes
  useEffect(() => {
    if (!family) return;

    const fetchResonanceOptions = async () => {
      try {
        const response = await axios.get<ApiResponse>(`${API_URL}/resonances/${secondaryBody}`);

        // Group resonances by unique p values
        const uniquePOptions = Array.from(
          new Set(response.data.resonances?.map(pair => pair.p))
        )
          .sort((a, b) => Number(a) - Number(b))
          .map(p => ({ id: p, name: p }));

        setPOptions(uniquePOptions);

        // Reset q options and selection when p changes
        setQOptions([]);
        setQ('');
      } catch (error) {
        console.error('Error fetching resonance options:', error);
      }
    }

    const fetchLibrationBatch = async () => {
      try {
        const response = await axios.get<ApiResponse>(`${API_URL}/librationbatch/${family}`);

        if (response.data.family) {
          const librationData = response.data.family[0].libration;
          const batchData = response.data.family[0].batch;

          // Handle libration
          if (librationData && librationData !== "") {
            setLibrationActive(true);
            const libOptions = librationData.split('').map(num => `L${num}`);
            setLibrationOptions(libOptions);
          } else {
            setLibrationActive(false);
            setLibrationOptions([]);
          }

          // Handle batch
          if (batchData === 1) {
            setBatchActive(true);
          } else {
            setBatchActive(false);
          }

          // Reset related fields
          setLibration('');
          setBatch('');
        }
      } catch (error) {
        console.error('Error fetching libration batch:', error);
      }
    };

    if (family == "9") {
      fetchResonanceOptions();
      setBatchActive(false);
      setLibrationActive(false);
    } else {
      setPOptions([]);
      setQOptions([]);
      fetchLibrationBatch();
    }
  }, [family, secondaryBody]);

  // Fetch Q options based on selected P
  useEffect(() => {
    if (!family || family != "9" || !p) return;

    const fetchQOptions = async () => {
      try {
        const response = await axios.get<ApiResponse>(`${API_URL}/resonances/${secondaryBody}`);

        // Filter q options based on selected p
        const filteredQOptions = response.data.resonances
          ?.filter(pair => pair.p === p)
          .map(pair => ({ id: pair.q, name: pair.q }))
          .sort((a, b) => Number(a.id) - Number(b.id)) || [];

        setQOptions(filteredQOptions);

        // Reset q if it's not in the new options
        if (!filteredQOptions.some(option => option.id === q)) {
          setQ('');
        }
      } catch (error) {
        console.error('Error fetching Q options:', error);
      }
    };

    fetchQOptions();
  }, [p, secondaryBody, family]);

  const handlePrimaryChange = (event: SelectChangeEvent<string>) => {
    setPrimaryBody(event.target.value);
    setBatchActive(false);
    setLibrationActive(false);
    setSecondaryBody('');
    setFamily('');
    setFamilyOptions([]);
  };

  const handleSecondaryChange = (event: SelectChangeEvent<string>) => {
    setSecondaryBody(event.target.value);
    setFamily('');
    setFamilyOptions([]);
    setBatchActive(false);
    setLibrationActive(false);
    setBatch('');
    setLibration('');
  };

  const handleFamilyChange = (event: SelectChangeEvent<string>) => {
    setFamily(event.target.value);
  };

  const isButtonEnabled = (): boolean => {
    const hasBasicSelection = primaryBody && secondaryBody && family;

    if (!hasBasicSelection) return false;

    if (family === "9" && (!p || !q)) return false;
    if (librationActive && !libration) return false;
    if (batchActive && !batch) return false;

    return true;
  };

  const handleLoadOrbits = async () => {

    try {

      console.log('Loading orbits with:', {
        primaryBody,
        secondaryBody,
        family,
        ...(family === "9" && { p, q }),
        ...(librationActive && { libration }),
        ...(batchActive && { batch })
      });

      const formattedP = p === "" ? "0" : p;
      const formattedQ = q === "" ? "0" : q;
      const formattedLibration = libration === "" ? "-1" : libration.replace("L", "");
      const formattedBatch = batch === "" ? "0" : batch;
      const response = await axios.get<ApiResponse>(`${API_URL}/orbits/?S=${secondaryBody}&F=${family}&P=${formattedP}&Q=${formattedQ}&L=${formattedLibration}&B=${formattedBatch}`);
      const data = response.data;
      onDataLoaded(data);

      const response_ic = await axios.get<ApiResponse>(`${API_URL}/initialconditions/${secondaryBody}`);

      const ic_data = response_ic.data;
      let ic_data_modified = {
        x: ic_data.initialconditions?.map((ic) => Number(ic.x0)),
        y: ic_data.initialconditions?.map((ic) => Number(ic.y0)),
        z: ic_data.initialconditions?.map((ic) => Number(ic.z0)),
        vx: ic_data.initialconditions?.map((ic) => Number(ic.vx0)),
        vy: ic_data.initialconditions?.map((ic) => Number(ic.vy0)),
        vz: ic_data.initialconditions?.map((ic) => Number(ic.vz0)),
        period: ic_data.initialconditions?.map((ic) => Number(ic.period)),
        family: ic_data.initialconditions?.map((ic) => Number(ic.id_family)),
        stability_index: ic_data.initialconditions?.map((ic) => Number(ic.stability_index)),
        jacobi_constant: ic_data.initialconditions?.map((ic) => Number(ic.jacobi_constant)),
      }
      onIcDataLoaded(ic_data_modified);
      handlePlotData([]);

      const body = await axios.get(`${API_URL}/bodies/${secondaryBody}`);
      handleBody(body.data.body[0]);
    }
    catch (error) {
      console.error('Error fetching orbits:', error);
    }


  };

  return (
    <Box sx={{
      minWidth: 120,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: 2
    }}>
      <p style={{ fontSize: 24, fontWeight: "normal" }}>System</p>

      {/* Primary Body Dropdown */}
      <FormControl fullWidth>
        <InputLabel id="primary-body-label">Primary Body</InputLabel>
        <Select
          labelId="primary-body-label"
          value={primaryBody}
          label="Primary Body"
          onChange={handlePrimaryChange}
        >
          {primaryOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Secondary Body Dropdown */}
      <FormControl fullWidth>
        <InputLabel id="secondary-body-label">Secondary Body</InputLabel>
        <Select
          labelId="secondary-body-label"
          value={secondaryBody}
          label="Secondary Body"
          onChange={handleSecondaryChange}
          disabled={!primaryBody}
        >
          {secondaryOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Family Dropdown */}
      <FormControl fullWidth>
        <InputLabel id="family-label">Family</InputLabel>
        <Select
          labelId="family-label"
          value={family}
          label="Family"
          onChange={handleFamilyChange}
          disabled={!secondaryBody}
        >
          {familyOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Resonance Dropdowns for Family 9 */}
      {family == "9" && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <FormControl fullWidth>
            <InputLabel id="p-label">p</InputLabel>
            <Select
              labelId="p-label"
              value={p}
              label="p"
              onChange={(e: SelectChangeEvent) => {
                setP(e.target.value);
                // Reset q when p changes
                setQ('');
              }}
            >
              {pOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="q-label">q</InputLabel>
            <Select
              labelId="q-label"
              value={q}
              label="q"
              disabled={!p} // Disable q until p is selected
              onChange={(e: SelectChangeEvent) => setQ(e.target.value)}
            >
              {qOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Libration Dropdown */}
      {librationActive && (
        <FormControl fullWidth>
          <InputLabel id="libration-label">Libration</InputLabel>
          <Select
            labelId="libration-label"
            value={libration}
            label="Libration"
            onChange={(e: SelectChangeEvent) => setLibration(e.target.value)}
          >
            {librationOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Batch Dropdown */}
      {batchActive && (
        <FormControl fullWidth>
          <InputLabel id="batch-label">Batch</InputLabel>
          <Select
            labelId="batch-label"
            value={batch}
            label="Batch"
            onChange={(e: SelectChangeEvent) => setBatch(e.target.value)}
          >
            <MenuItem value="-1">South</MenuItem>
            <MenuItem value="1">North</MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Load Orbits Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleLoadOrbits}
          disabled={!isButtonEnabled()}
          sx={{
            backgroundColor: '#3498db',
            '&:hover': {
              backgroundColor: '#2980b9'
            }
          }}
        >
          Load orbits
        </Button>
      </Box>
    </Box>
  );
};

export default SystemForm;