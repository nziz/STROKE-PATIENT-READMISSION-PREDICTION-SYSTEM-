// frontend/src/components/SubmitReport.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Switch,
    Slider,
    Alert,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    InputAdornment,
    Chip,
} from '@mui/material';
import {
    CheckCircle,
    Send,
    Warning as WarningIcon,
    Info as InfoIcon,
    Person as PersonIcon,
} from '@mui/icons-material';

function SubmitReport() {
    const navigate = useNavigate();
    const location = useLocation();

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const isPatient = userData?.role === 'patient';
    const patientIdFromStorage = userData?.patient_id || '';

    const patientIdFromState = location.state?.patientId || '';

    const initialPatientId = isPatient ? patientIdFromStorage : patientIdFromState;

    const [patientId, setPatientId] = useState(initialPatientId || '');
    const [isPatientView, setIsPatientView] = useState(isPatient || !!initialPatientId);
    const [report, setReport] = useState({
        has_headache: false,
        has_dizziness: false,
        has_weakness: false,
        has_speech_difficulty: false,
        has_vision_changes: false,
        has_fever: false,
        has_swallowing_difficulty: false,
        took_medications: true,
        well_being_score: 3,
        notes: '',
    });
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogType, setDialogType] = useState('info');

    const symptoms = [
        { key: 'has_headache', label: 'Headache' },
        { key: 'has_dizziness', label: 'Dizziness' },
        { key: 'has_weakness', label: 'Weakness' },
        { key: 'has_speech_difficulty', label: 'Speech Difficulty' },
        { key: 'has_vision_changes', label: 'Vision Changes' },
        { key: 'has_fever', label: 'Fever' },
        { key: 'has_swallowing_difficulty', label: 'Swallowing Difficulty' },
    ];

    useEffect(() => {
        if (isPatient && !patientId && patientIdFromStorage) {
            setPatientId(patientIdFromStorage);
        }
        if (patientIdFromState) {
            setIsPatientView(true);
        }
    }, [isPatient, patientIdFromStorage, patientIdFromState]);

    // ============================================================
    // ✅ UPDATED: handleSubmit with redirect logic
    // ============================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!patientId) {
            setError('Please enter a patient ID');
            return;
        }

        setSubmitting(true);
        setError(null);
        setResult(null);

        try {
            // ✅ Make sure this endpoint matches your urls.py
            const response = await API.post(`patient/${patientId}/report/`, report);
            const data = response.data;

            // ✅ NEW: Check if we have a redirect_to URL
            if (data.success && data.redirect_to) {
                // Get patient name from userData or fallback
                const patientName = userData?.name || 
                                   (userData?.first_name && userData?.last_name ? 
                                    `${userData.first_name} ${userData.last_name}` : 
                                    'Patient');

                // Navigate to the results page with all the data
                navigate(data.redirect_to, {
                    state: {
                        report_id: data.report_id,
                        patient_id: patientId,
                        patient_name: patientName,
                        risk_category: data.risk_category,
                        risk_percentage: data.risk_percentage,
                        new_risk_score: data.new_risk_score,
                        recommendations: data.recommendations,
                    }
                });
                return; // Stop here — we don't want to show the success alert
            }

            // If no redirect_to, fallback to old behavior (show success alert)
            setResult(data);

        } catch (err) {
            console.error('Error submitting report:', err);
            if (err.response && err.response.status === 400) {
                const errorMsg = err.response.data.error || '';
                if (errorMsg.includes('already submitted')) {
                    setDialogTitle('Duplicate Report');
                    setDialogMessage('You have already submitted a report for this patient today. Please wait until tomorrow to submit another report.');
                    setDialogType('warning');
                    setDialogOpen(true);
                    return;
                } else {
                    setError(`Error: ${errorMsg}`);
                }
            } else if (err.response && err.response.status === 404) {
                setDialogTitle('Patient Not Found');
                setDialogMessage(`Patient with ID "${patientId}" was not found. Please check the patient ID and try again.`);
                setDialogType('error');
                setDialogOpen(true);
                return;
            } else {
                setError('Failed to submit report. Please try again.');
            }
        }
        setSubmitting(false);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setDialogMessage('');
        setDialogTitle('');
        setDialogType('info');
    };

    const handleChange = (field) => (event) => {
        setReport({ ...report, [field]: event.target.checked });
    };

    const handleClear = () => {
        setPatientId('');
        setReport({
            has_headache: false,
            has_dizziness: false,
            has_weakness: false,
            has_speech_difficulty: false,
            has_vision_changes: false,
            has_fever: false,
            has_swallowing_difficulty: false,
            took_medications: true,
            well_being_score: 3,
            notes: '',
        });
        setResult(null);
        setError(null);
    };

    const getDialogIcon = () => {
        if (dialogType === 'warning') return <WarningIcon sx={{ fontSize: 40, color: '#f59e0b' }} />;
        if (dialogType === 'error') return <WarningIcon sx={{ fontSize: 40, color: '#dc2626' }} />;
        return <InfoIcon sx={{ fontSize: 40, color: '#2563eb' }} />;
    };

    const cardHoverSx = {
        borderRadius: 3,
        bgcolor: '#ffffff',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s ease',
        '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
            borderColor: '#d1d5db',
        },
    };

    const textFieldSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: '#f9fafb',
            '& fieldset': { borderColor: '#e5e7eb' },
            '&:hover fieldset': { borderColor: '#d1d5db' },
            '&.Mui-focused fieldset': { borderColor: '#2563eb' },
        },
        '& .MuiInputLabel-root': { color: '#6b7280' },
        '& .MuiFormHelperText-root': { color: '#9ca3af', fontSize: '0.75rem', fontWeight: 500 },
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                    Submit Daily Report
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                    {isPatientView
                        ? 'Check all symptoms you\'re experiencing today.'
                        : 'Enter the patient ID and check all symptoms they\'re experiencing today.'}
                </Typography>
            </Box>

            <Card elevation={0} sx={cardHoverSx}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <form onSubmit={handleSubmit}>
                        {!isPatientView ? (
                            <TextField
                                fullWidth
                                label="Patient ID (numeric, e.g., 1, 2, 3)"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                placeholder="Enter patient ID"
                                margin="normal"
                                required
                                helperText="Check the dashboard for patient IDs"
                                sx={textFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        ) : (
                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                    Reporting for Patient ID:
                                </Typography>
                                <Chip
                                    label={`#${patientId}`}
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        bgcolor: '#eff6ff',
                                        color: '#2563eb',
                                        borderRadius: 2,
                                        border: '1px solid #bfdbfe',
                                    }}
                                />
                            </Box>
                        )}

                        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1.5, fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                            Symptoms (Check all that apply)
                        </Typography>
                        <Grid container spacing={1}>
                            {symptoms.map((symptom) => (
                                <Grid item xs={6} sm={4} md={3} key={symptom.key}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={report[symptom.key]}
                                                onChange={handleChange(symptom.key)}
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#dc2626' },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#dc2626' },
                                                }}
                                            />
                                        }
                                        label={<Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>{symptom.label}</Typography>}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                        <Box sx={{ mt: 2 }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={report.took_medications}
                                        onChange={handleChange('took_medications')}
                                        sx={{
                                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' },
                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16a34a' },
                                        }}
                                    />
                                }
                                label={<Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>Took medications today</Typography>}
                            />
                        </Box>

                        <Box sx={{ mt: 3 }}>
                            <Typography gutterBottom sx={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>
                                Well-being Score: {report.well_being_score} / 5
                            </Typography>
                            <Slider
                                value={report.well_being_score}
                                onChange={(e, val) => setReport({ ...report, well_being_score: val })}
                                min={1}
                                max={5}
                                marks={[
                                    { value: 1, label: 'Poor' },
                                    { value: 3, label: 'Average' },
                                    { value: 5, label: 'Excellent' },
                                ]}
                                valueLabelDisplay="auto"
                                sx={{
                                    color: '#2563eb',
                                    '& .MuiSlider-thumb': {
                                        bgcolor: '#2563eb',
                                        width: 18,
                                        height: 18,
                                    },
                                    '& .MuiSlider-track': { height: 6, borderRadius: 3 },
                                    '& .MuiSlider-rail': { height: 6, borderRadius: 3, bgcolor: '#e5e7eb' },
                                    '& .MuiSlider-markLabel': { color: '#6b7280', fontWeight: 500, fontSize: '0.8rem' },
                                }}
                            />
                        </Box>

                        <TextField
                            fullWidth
                            label="Additional Notes (optional)"
                            multiline
                            rows={2}
                            value={report.notes}
                            onChange={(e) => setReport({ ...report, notes: e.target.value })}
                            margin="normal"
                            sx={textFieldSx}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mt: 2, borderRadius: 2, fontWeight: 500 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        {result && (
                            <Alert
                                severity="success"
                                sx={{ mt: 3, borderRadius: 2, fontWeight: 500 }}
                                onClose={() => setResult(null)}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
                                    Report Submitted Successfully
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                                    Risk Increase: {(result.risk_increase * 100).toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#374151' }}>
                                    New Risk Score: {(result.new_risk_score * 100).toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#374151' }}>
                                    Risk Category: <strong>{result.risk_category}</strong>
                                </Typography>
                                {result.symptoms_reported && result.symptoms_reported.length > 0 && (
                                    <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                                        Symptoms: {result.symptoms_reported.join(', ')}
                                    </Typography>
                                )}
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={submitting}
                                startIcon={submitting ? null : <Send sx={{ fontSize: 18 }} />}
                                sx={{
                                    flex: 1,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: '#2563eb',
                                    boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </Button>
                            {!isPatientView && (
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={handleClear}
                                    sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 500,
                                        borderColor: '#d1d5db',
                                        color: '#374151',
                                        '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                                    }}
                                >
                                    Clear
                                </Button>
                            )}
                        </Box>
                    </form>
                </CardContent>
            </Card>

            {/* Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleDialogClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle
                    id="alert-dialog-title"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 3,
                        pt: 2.5,
                        pb: 2,
                        borderBottom: '1px solid #f3f4f6',
                    }}
                >
                    {getDialogIcon()}
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                        {dialogTitle}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
                    <DialogContentText id="alert-dialog-description" sx={{ color: '#374151', fontSize: '0.95rem', fontWeight: 500 }}>
                        {dialogMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
                    <Button
                        onClick={handleDialogClose}
                        variant="contained"
                        autoFocus
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#2563eb',
                            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SubmitReport;