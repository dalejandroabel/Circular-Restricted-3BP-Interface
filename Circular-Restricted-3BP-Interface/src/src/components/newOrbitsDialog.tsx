import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    TextField,
    FormControl,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    Stepper,
    Step,
    StepLabel,
    Chip,
    Alert,
    Select,
    MenuItem,
    Checkbox
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';
import { API_URL } from '../../config';

interface BodyMapping {
    fileValue: string;
    dbBodyId?: string;
    newBodyData?: Record<string, string>;
}

interface FamilyMapping {
    fileValue: string;
    dbFamilyId?: string;
    newFamilyData?: Record<string, string>;
}

interface ColumnMapping {
    csvColumn: string;
    targetParameter: string;
    isNewParameter?: boolean;
    newColumnData?: Record<string, string>;
}

interface DialogProps {
    open: boolean;
    onClose: () => void;
}

const AddOrbitsDialog = ({ open, onClose }: DialogProps) => {
    const [activeStep, setActiveStep] = useState<number>(0);
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    
    // Body configuration
    const [bodyMode, setBodyMode] = useState<string>('single');
    const [singleBodyId, setSingleBodyId] = useState<string>('');
    const [singleBodyNew, setSingleBodyNew] = useState<boolean>(false);
    const [newBodyForm, setNewBodyForm] = useState<Record<string, string>>({});
    const [bodyColumnName, setBodyColumnName] = useState<string>('');
    const [bodyMappings, setBodyMappings] = useState<BodyMapping[]>([]);
    const [tempBodyValue, setTempBodyValue] = useState<string>('');
    const [tempBodyDbId, setTempBodyDbId] = useState<string>('');
    const [tempBodyNew, setTempBodyNew] = useState<boolean>(false);
    const [tempBodyForm, setTempBodyForm] = useState<Record<string, string>>({});
    
    // Family configuration
    const [familyMode, setFamilyMode] = useState<string>('single');
    const [singleFamilyId, setSingleFamilyId] = useState<string>('');
    const [singleFamilyNew, setSingleFamilyNew] = useState<boolean>(false);
    const [newFamilyForm, setNewFamilyForm] = useState<Record<string, string>>({});
    const [familyColumnName, setFamilyColumnName] = useState<string>('');
    const [familyMappings, setFamilyMappings] = useState<FamilyMapping[]>([]);
    const [tempFamilyValue, setTempFamilyValue] = useState<string>('');
    const [tempFamilyDbId, setTempFamilyDbId] = useState<string>('');
    const [tempFamilyNew, setTempFamilyNew] = useState<boolean>(false);
    const [tempFamilyForm, setTempFamilyForm] = useState<Record<string, string>>({});
    
    // Column configuration
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
    const [tempColumnNew, setTempColumnNew] = useState<boolean>(false);
    const [tempColumnForm, setTempColumnForm] = useState<Record<string, string>>({});
    const [tempColumnCsvColumn, setTempColumnCsvColumn] = useState<string>('');
    
    const [bodiesOptions, setBodiesOptions] = useState<Array<{id_body: string, secondary: string}>>([]);
    const [familiesOptions, setFamiliesOptions] = useState<Array<{id_family: string, name: string}>>([]);
    const [columnsOptions, setColumnsOptions] = useState<Array<{c_name: string}>>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [bodiesResponse, familiesResponse, columnsResponse] = await Promise.all([
                    axios.get(API_URL + '/allbodies/'),
                    axios.get(API_URL + '/allfamilies/'),
                    axios.get(API_URL + '/allColumns/')
                ]);
                setBodiesOptions(bodiesResponse.data.bodies);
                setFamiliesOptions(familiesResponse.data.families);
                setColumnsOptions(columnsResponse.data.columns);
            } catch (error) {
                console.error('Error fetching options:', error);
            }
        };

        fetchOptions();
    }, []);

    const bodyParams = [
        { name: 'identifier', required: true },
        { name: 'name', required: true },
        { name: 'mass_ratio', label: 'Mass Ratio (μ)', required: true },
        { name: 'distance_km', label: 'Distance (km)', required: false },
        { name: 'mass_kg', label: 'Mass (kg)', required: false },
        { name: 'radius_km', label: 'Radius (km)', required: false },
        { name: 'period_days', label: 'Period (days)', required: false }
    ];

    const familyParams = [
        { name: 'identifier', required: true },
        { name: 'name', required: true },
        { name: 'description', required: false }
    ];

    const columnParams = [
        { name: 'name', required: true },
        { name: 'description', required: false },
        { name: 'unit', required: false }
    ];

    const mandatoryColumns = ['x', 'y', 'z', 'vx', 'vy', 'vz', "period"];

    const steps = ['Upload File', 'Configure Bodies', 'Configure Families', 'Map Columns'];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = event.target.files?.[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            // Parse CSV headers (simplified - in production use a CSV parser)
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    const firstLine = text.split('\n')[0];
                    const headers = firstLine.split(',').map((h: string) => h.trim());
                    setCsvHeaders(headers);
                }
            };
            reader.readAsText(uploadedFile);
        }
    };

    const handleNext = () => {
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleAddBodyMapping = () => {
        if (!tempBodyValue) return;
        
        const mapping: BodyMapping = {
            fileValue: tempBodyValue,
            dbBodyId: tempBodyNew ? undefined : tempBodyDbId,
            newBodyData: tempBodyNew ? tempBodyForm : undefined
        };
        
        setBodyMappings([...bodyMappings, mapping]);
        setTempBodyValue('');
        setTempBodyDbId('');
        setTempBodyNew(false);
        setTempBodyForm({});
    };

    const handleRemoveBodyMapping = (index: number) => {
        setBodyMappings(bodyMappings.filter((_, i) => i !== index));
    };

    const handleAddFamilyMapping = () => {
        if (!tempFamilyValue) return;
        
        const mapping: FamilyMapping = {
            fileValue: tempFamilyValue,
            dbFamilyId: tempFamilyNew ? undefined : tempFamilyDbId,
            newFamilyData: tempFamilyNew ? tempFamilyForm : undefined
        };
        
        setFamilyMappings([...familyMappings, mapping]);
        setTempFamilyValue('');
        setTempFamilyDbId('');
        setTempFamilyNew(false);
        setTempFamilyForm({});
    };

    const handleRemoveFamilyMapping = (index: number) => {
        setFamilyMappings(familyMappings.filter((_, i) => i !== index));
    };

    const handleAddColumnMapping = (csvColumn: string, targetParam: string, isNew: boolean = false) => {
        const existing = columnMappings.find(m => m.csvColumn === csvColumn);
        if (existing) {
            setColumnMappings(columnMappings.map(m => 
                m.csvColumn === csvColumn 
                    ? { csvColumn, targetParameter: targetParam, isNewParameter: isNew }
                    : m
            ));
        } else {
            setColumnMappings([...columnMappings, { 
                csvColumn, 
                targetParameter: targetParam, 
                isNewParameter: isNew 
            }]);
        }
    };

    const handleAddColumnMappingWithForm = () => {
        if (!tempColumnCsvColumn || !tempColumnForm.name) return;

        const mapping: ColumnMapping = {
            csvColumn: tempColumnCsvColumn,
            targetParameter: tempColumnForm.name,
            isNewParameter: true,
            newColumnData: tempColumnForm
        };

        const existing = columnMappings.find(m => m.csvColumn === tempColumnCsvColumn);
        if (existing) {
            setColumnMappings(columnMappings.map(m =>
                m.csvColumn === tempColumnCsvColumn ? mapping : m
            ));
        } else {
            setColumnMappings([...columnMappings, mapping]);
        }

        resetColumnForm();
    };

    const resetColumnForm = () => {
        setTempColumnNew(false);
        setTempColumnForm({});
        setTempColumnCsvColumn('');
    };

    const handleRemoveColumnMapping = (csvColumn: string) => {
        setColumnMappings(columnMappings.filter(m => m.csvColumn !== csvColumn));
    };

    const isMandatoryColumnsMapped = () => {
        return mandatoryColumns.every(col => 
            columnMappings.some(m => m.targetParameter === col)
        );
    };

    const renderBodyForm = (form: Record<string, string>, setForm: (value: Record<string, string>) => void, params: any[]) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {params.map((param: any) => (
                <TextField
                    key={param.name}
                    label={param.label || param.name}
                    required={param.required}
                    size="small"
                    value={form[param.name] || ''}
                    onChange={(e) => setForm({ ...form, [param.name]: e.target.value })}
                    helperText={param.required ? 'Required' : 'Optional'}
                />
            ))}
        </Box>
    );

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Upload a CSV file containing orbit data. The file should include state vectors [x, y, z, vx, vy, vz] and may include body/family information.
                        </Typography>
                        
                        <Button variant="outlined" component="label" fullWidth sx={{ py: 2 }}>
                            {file ? `Selected: ${(file as File).name}` : 'Choose CSV File'}
                            <input type="file" hidden accept=".csv" onChange={handleFileChange} />
                        </Button>

                        {file && (
                            <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
                                File loaded with {csvHeaders.length} columns
                            </Alert>
                        )}
                    </Box>
                );

            case 1:
                return (
                    <Box sx={{ py: 2 }}>
                        <FormControl component="fieldset" fullWidth>
                            <FormLabel sx={{ mb: 2, fontWeight: 'bold' }}>Body Configuration</FormLabel>
                            <RadioGroup value={bodyMode} onChange={(e) => setBodyMode(e.target.value)}>
                                <FormControlLabel 
                                    value="single" 
                                    control={<Radio />} 
                                    label="Single Body (all orbits belong to one body)" 
                                />
                                <FormControlLabel 
                                    value="multiple" 
                                    control={<Radio />} 
                                    label="Multiple Bodies (CSV contains body column)" 
                                />
                            </RadioGroup>
                        </FormControl>

                        {bodyMode === 'single' && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox 
                                            checked={singleBodyNew}
                                            onChange={(e) => setSingleBodyNew(e.target.checked)}
                                        />
                                    }
                                    label="Create new body"
                                    sx={{ mb: 2 }}
                                />

                                {!singleBodyNew ? (
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={singleBodyId}
                                            onChange={(e) => setSingleBodyId(e.target.value)}
                                            displayEmpty
                                        >
                                            <MenuItem value="">-- Select Body --</MenuItem>
                                            {bodiesOptions.map((body) => (
                                                <MenuItem key={body.id_body} value={body.id_body}>
                                                    {body.secondary}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    renderBodyForm(newBodyForm, setNewBodyForm, bodyParams)
                                )}
                            </Box>
                        )}

                        {bodyMode === 'multiple' && (
                            <Box sx={{ mt: 3 }}>
                                <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                                    <FormLabel sx={{ mb: 1 }}>CSV Column with Body Names</FormLabel>
                                    <Select
                                        value={bodyColumnName}
                                        onChange={(e) => setBodyColumnName(e.target.value)}
                                        displayEmpty
                                    >
                                        <MenuItem value="">-- Select Column --</MenuItem>
                                        {csvHeaders.map((header) => (
                                            <MenuItem key={header} value={header}>{header}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                        Add Body Mapping
                                    </Typography>
                                    
                                    <TextField
                                        label="Value in CSV File"
                                        size="small"
                                        fullWidth
                                        value={tempBodyValue}
                                        onChange={(e) => setTempBodyValue(e.target.value)}
                                        sx={{ mb: 2 }}
                                        placeholder="e.g., Moon, Europa"
                                    />

                                    <FormControlLabel
                                        control={
                                            <Checkbox 
                                                checked={tempBodyNew}
                                                onChange={(e) => setTempBodyNew(e.target.checked)}
                                            />
                                        }
                                        label="Create as new body"
                                        sx={{ mb: 2 }}
                                    />

                                    {!tempBodyNew ? (
                                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                            <Select
                                                value={tempBodyDbId}
                                                onChange={(e) => setTempBodyDbId(e.target.value)}
                                                displayEmpty
                                            >
                                                <MenuItem value="">-- Map to Existing Body --</MenuItem>
                                                {bodiesOptions.map((body) => (
                                                    <MenuItem key={body.id_body} value={body.id_body}>
                                                        {body.secondary}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        renderBodyForm(tempBodyForm, setTempBodyForm, bodyParams)
                                    )}

                                    <Button 
                                        variant="contained" 
                                        startIcon={<AddIcon />}
                                        onClick={handleAddBodyMapping}
                                        disabled={!tempBodyValue || (!tempBodyNew && !tempBodyDbId)}
                                        fullWidth
                                    >
                                        Add Mapping
                                    </Button>
                                </Box>

                                {bodyMappings.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                            Current Mappings ({bodyMappings.length})
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>CSV Value</strong></TableCell>
                                                    <TableCell><strong>Maps To</strong></TableCell>
                                                    <TableCell width={50}></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {bodyMappings.map((mapping, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Chip label={mapping.fileValue} size="small" />
                                                        </TableCell>
                                                        <TableCell>
                                                            {mapping.dbBodyId 
                                                                ? bodiesOptions.find(b => b.id_body === mapping.dbBodyId)?.secondary
                                                                : <Chip label="New Body" color="primary" size="small" />
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => handleRemoveBodyMapping(index)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                );

            case 2:
                return (
                    <Box sx={{ py: 2 }}>
                        <FormControl component="fieldset" fullWidth>
                            <FormLabel sx={{ mb: 2, fontWeight: 'bold' }}>Family Configuration</FormLabel>
                            <RadioGroup value={familyMode} onChange={(e) => setFamilyMode(e.target.value)}>
                                <FormControlLabel 
                                    value="single" 
                                    control={<Radio />} 
                                    label="Single Family (all orbits belong to one family)" 
                                />
                                <FormControlLabel 
                                    value="multiple" 
                                    control={<Radio />} 
                                    label="Multiple Families (CSV contains family column)" 
                                />
                            </RadioGroup>
                        </FormControl>

                        {familyMode === 'single' && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox 
                                            checked={singleFamilyNew}
                                            onChange={(e) => setSingleFamilyNew(e.target.checked)}
                                        />
                                    }
                                    label="Create new family"
                                    sx={{ mb: 2 }}
                                />

                                {!singleFamilyNew ? (
                                    <FormControl fullWidth size="small">
                                        <Select
                                            value={singleFamilyId}
                                            onChange={(e) => setSingleFamilyId(e.target.value)}
                                            displayEmpty
                                        >
                                            <MenuItem value="">-- Select Family --</MenuItem>
                                            {familiesOptions.map((family) => (
                                                <MenuItem key={family.id_family} value={family.id_family}>
                                                    {family.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    renderBodyForm(newFamilyForm, setNewFamilyForm, familyParams)
                                )}
                            </Box>
                        )}

                        {familyMode === 'multiple' && (
                            <Box sx={{ mt: 3 }}>
                                <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                                    <FormLabel sx={{ mb: 1 }}>CSV Column with Family Names</FormLabel>
                                    <Select
                                        value={familyColumnName}
                                        onChange={(e) => setFamilyColumnName(e.target.value)}
                                        displayEmpty
                                    >
                                        <MenuItem value="">-- Select Column --</MenuItem>
                                        {csvHeaders.map((header) => (
                                            <MenuItem key={header} value={header}>{header}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                        Add Family Mapping
                                    </Typography>
                                    
                                    <TextField
                                        label="Value in CSV File"
                                        size="small"
                                        fullWidth
                                        value={tempFamilyValue}
                                        onChange={(e) => setTempFamilyValue(e.target.value)}
                                        sx={{ mb: 2 }}
                                        placeholder="e.g., Lyapunov, Halo"
                                    />

                                    <FormControlLabel
                                        control={
                                            <Checkbox 
                                                checked={tempFamilyNew}
                                                onChange={(e) => setTempFamilyNew(e.target.checked)}
                                            />
                                        }
                                        label="Create as new family"
                                        sx={{ mb: 2 }}
                                    />

                                    {!tempFamilyNew ? (
                                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                            <Select
                                                value={tempFamilyDbId}
                                                onChange={(e) => setTempFamilyDbId(e.target.value)}
                                                displayEmpty
                                            >
                                                <MenuItem value="">-- Map to Existing Family --</MenuItem>
                                                {familiesOptions.map((family) => (
                                                    <MenuItem key={family.id_family} value={family.id_family}>
                                                        {family.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        renderBodyForm(tempFamilyForm, setTempFamilyForm, familyParams)
                                    )}

                                    <Button 
                                        variant="contained" 
                                        startIcon={<AddIcon />}
                                        onClick={handleAddFamilyMapping}
                                        disabled={!tempFamilyValue || (!tempFamilyNew && !tempFamilyDbId)}
                                        fullWidth
                                    >
                                        Add Mapping
                                    </Button>
                                </Box>

                                {familyMappings.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                            Current Mappings ({familyMappings.length})
                                        </Typography>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>CSV Value</strong></TableCell>
                                                    <TableCell><strong>Maps To</strong></TableCell>
                                                    <TableCell width={50}></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {familyMappings.map((mapping, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Chip label={mapping.fileValue} size="small" />
                                                        </TableCell>
                                                        <TableCell>
                                                            {mapping.dbFamilyId 
                                                                ? familiesOptions.find(f => f.id_family === mapping.dbFamilyId)?.name
                                                                : <Chip label="New Family" color="primary" size="small" />
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => handleRemoveFamilyMapping(index)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                );

            case 3:
                return (
                    <Box sx={{ py: 2 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Map CSV Columns to Parameters
                        </Typography>

                        <Alert severity="info" sx={{ mb: 3 }}>
                            State vector columns [x, y, z, vx, vy, vz] are mandatory
                        </Alert>

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                Mandatory Columns
                            </Typography>
                            {mandatoryColumns.map((mandatoryCol) => {
                                const mapping = columnMappings.find(m => m.targetParameter === mandatoryCol);
                                return (
                                    <Box key={mandatoryCol} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                        <Chip 
                                            label={mandatoryCol} 
                                            color="error" 
                                            size="small"
                                            sx={{ minWidth: 60 }}
                                        />
                                        <FormControl size="small" sx={{ flex: 1 }}>
                                            <Select
                                                value={mapping?.csvColumn || ''}
                                                onChange={(e) => handleAddColumnMapping(e.target.value, mandatoryCol)}
                                                displayEmpty
                                            >
                                                <MenuItem value="">-- Select CSV Column --</MenuItem>
                                                {csvHeaders.map((header) => (
                                                    <MenuItem key={header} value={header}>{header}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        {mapping && (
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleRemoveColumnMapping(mapping.csvColumn)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                Additional Parameters (Optional)
                            </Typography>
                            
                            {csvHeaders
                                .filter(header => !columnMappings.some(m => m.csvColumn === header))
                                .map((header) => (
                                    <Box key={header}>
                                        {tempColumnCsvColumn === header && tempColumnNew ? (
                                            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                                                    Create New Parameter for "{header}"
                                                </Typography>
                                                {renderBodyForm(tempColumnForm, setTempColumnForm, columnParams)}
                                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<AddIcon />}
                                                        onClick={handleAddColumnMappingWithForm}
                                                        disabled={!tempColumnForm.name}
                                                        fullWidth
                                                    >
                                                        Create Parameter
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={resetColumnForm}
                                                        fullWidth
                                                    >
                                                        Cancel
                                                    </Button>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                                <Chip 
                                                    label={header} 
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ minWidth: 100 }}
                                                />
                                                <FormControl size="small" sx={{ flex: 1 }}>
                                                    <Select
                                                        defaultValue=""
                                                        onChange={(e) => {
                                                            if (e.target.value === '__new__') {
                                                                setTempColumnCsvColumn(header);
                                                                setTempColumnNew(true);
                                                            } else {
                                                                handleAddColumnMapping(header, e.target.value, false);
                                                            }
                                                        }}
                                                        displayEmpty
                                                    >
                                                        <MenuItem value="">-- Map to Parameter --</MenuItem>
                                                        {columnsOptions.map((param) => (
                                                            <MenuItem key={param.c_name} value={param.c_name}>{param.c_name}</MenuItem>
                                                        ))}
                                                        <MenuItem value="__new__">+ Create New Parameter</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                        </Box>

                        {columnMappings.length > 0 && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                    Mapped: {columnMappings.length} columns
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Mandatory columns mapped: {mandatoryColumns.filter(col => 
                                        columnMappings.some(m => m.targetParameter === col)
                                    ).length}/{mandatoryColumns.length}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                );

            default:
                return null;
        }
    };

    const canProceed = () => {
        switch (activeStep) {
            case 0:
                return file !== null;
            case 1:
                if (bodyMode === 'single') {
                    return singleBodyNew ? Object.keys(newBodyForm).length > 0 : singleBodyId !== '';
                }
                return bodyColumnName !== '' && bodyMappings.length > 0;
            case 2:
                if (familyMode === 'single') {
                    return singleFamilyNew ? Object.keys(newFamilyForm).length > 0 : singleFamilyId !== '';
                }
                return familyColumnName !== '' && familyMappings.length > 0;
            case 3:
                return isMandatoryColumnsMapped();
            default:
                return true;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Add Custom Orbits</DialogTitle>
            
            <Box sx={{ px: 3, pt: 2 }}>
                <Stepper activeStep={activeStep}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            <DialogContent sx={{ minHeight: 400 }}>
                {renderStepContent(activeStep)}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Box sx={{ flex: 1 }} />
                <Button 
                    disabled={activeStep === 0} 
                    onClick={handleBack}
                >
                    Back
                </Button>
                {activeStep < steps.length - 1 ? (
                    <Button 
                        variant="contained" 
                        onClick={handleNext}
                        disabled={!canProceed()}
                    >
                        Next
                    </Button>
                ) : (
                    <Button 
                        variant="contained" 
                        color="success"
                        disabled={!canProceed()}
                        onClick={() => {
                            console.log('Submit data:', {
                                file,
                                bodyMode,
                                bodyMappings,
                                familyMode,
                                familyMappings,
                                columnMappings
                            });
                            onClose();
                        }}
                    >
                        Upload Orbits
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default AddOrbitsDialog;