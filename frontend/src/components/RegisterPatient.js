// frontend/src/components/RegisterPatient.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Paper,
    Stepper,
    Step,
    StepLabel,
    MenuItem,
    InputAdornment,
    IconButton,
    Snackbar,
    Tooltip,
} from '@mui/material';
import {
    PersonAdd,
    CheckCircle,
    Phone as PhoneIcon,
    ContentCopy as CopyIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

const steps = ['Patient Info', 'Clinical Data', 'Review'];

function RegisterPatient() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogTitle, setDialogTitle] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [phoneError, setPhoneError] = useState('');

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        age: '',
        gender: 'M',
        phone_number: '',
        nihss_score: '',
        length_of_stay_days: '1',
        discharge_destination: 'home',
    });

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text.trim()).then(
            () => {
                setSnackbarMessage(`${label} copied to clipboard!`);
                setSnackbarOpen(true);
            },
            () => {
                setSnackbarMessage(`Failed to copy ${label}.`);
                setSnackbarOpen(true);
            }
        );
    };

    const validatePhoneNumber = (phone) => {
        const rwandaPhoneRegex = /^\+250[0-9]{9}$/;
        if (!phone) return true;
        return rwandaPhoneRegex.test(phone);
    };

    const handleChange = (field) => (event) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        setFormData({ ...formData, [field]: value });

        if (field === 'phone_number') {
            if (value && !validatePhoneNumber(value)) {
                setPhoneError('Phone number must be in format +250XXXXXXXXX (e.g., +250788123456)');
            } else {
                setPhoneError('');
            }
        }
    };

    const handleNext = () => {
        if (activeStep === 0) {
            if (!formData.first_name || !formData.last_name || !formData.age || !formData.gender) {
                setError('Please fill in all required fields (first name, last name, age, gender)');
                return;
            }
            if (formData.phone_number && !validatePhoneNumber(formData.phone_number)) {
                setError('Phone number must be in format +250XXXXXXXXX (e.g., +250788123456)');
                return;
            }
        }
        setError(null);
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        if (formData.phone_number && !validatePhoneNumber(formData.phone_number)) {
            setError('Phone number must be in format +250XXXXXXXXX');
            setSubmitting(false);
            return;
        }

        try {
            // REMOVED: has_urinary_catheter, hypercoagulable_state, 
            // percutaneous_gastrostomy, hemodialysis, malnutrition
            const payload = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                age: parseInt(formData.age),
                gender: formData.gender,
                phone_number: formData.phone_number,
                nihss_score: parseInt(formData.nihss_score) || 0,
                length_of_stay_days: parseInt(formData.length_of_stay_days) || 1,
                discharge_destination: formData.discharge_destination,
            };

            console.log('Registering patient:', payload);
            const response = await API.post('register-patient/', payload);
            console.log('Response:', response.data);

            if (response.data.success) {
                setSuccess({
                    patient_id: response.data.patient_id,
                    hospital_id: response.data.hospital_id,
                    username: response.data.username,
                    password: response.data.password,
                    risk_score: response.data.risk_score,
                    risk_category: response.data.risk_category,
                });
                setDialogTitle('Patient Registered Successfully');
                setDialogMessage(`
                    Patient ID: ${response.data.hospital_id}
                    Risk Score: ${Math.round(response.data.risk_score * 100)}%
                    Risk Category: ${response.data.risk_category}
                `);
                setDialogOpen(true);
            }
        } catch (err) {
            console.error('Error registering patient:', err);
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError('Failed to register patient. Please try again.');
            }
        }
        setSubmitting(false);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        if (success) {
            navigate('/patients');
        }
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
        '& .MuiFormHelperText-root': { color: '#9ca3af', fontSize: '0.75rem' },
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="First Name *"
                                    value={formData.first_name}
                                    onChange={handleChange('first_name')}
                                    required
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Last Name *"
                                    value={formData.last_name}
                                    onChange={handleChange('last_name')}
                                    required
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Age *"
                                    type="number"
                                    value={formData.age}
                                    onChange={handleChange('age')}
                                    required
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Gender *"
                                    value={formData.gender}
                                    onChange={handleChange('gender')}
                                    required
                                    sx={textFieldSx}
                                >
                                    <MenuItem value="M">Male</MenuItem>
                                    <MenuItem value="F">Female</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    value={formData.phone_number}
                                    onChange={handleChange('phone_number')}
                                    placeholder="+250788123456"
                                    error={!!phoneError}
                                    helperText={phoneError || 'Format: +250XXXXXXXXX (9 digits)'}
                                    sx={textFieldSx}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PhoneIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="NIHSS Score"
                                    type="number"
                                    value={formData.nihss_score}
                                    onChange={handleChange('nihss_score')}
                                    helperText="0-42 (higher = more severe)"
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Length of Stay (days)"
                                    type="number"
                                    value={formData.length_of_stay_days}
                                    onChange={handleChange('length_of_stay_days')}
                                    sx={textFieldSx}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Discharge Destination"
                                    value={formData.discharge_destination}
                                    onChange={handleChange('discharge_destination')}
                                    sx={textFieldSx}
                                >
                                    <MenuItem value="home">Home</MenuItem>
                                    <MenuItem value="snf">Skilled Nursing Facility</MenuItem>
                                    <MenuItem value="rehab">Rehabilitation Facility</MenuItem>
                                    <MenuItem value="hospice">Hospice</MenuItem>
                                </TextField>
                            </Grid>

                            {/* ============================================================
                                RISK FACTORS SECTION — REMOVED
                                The following fields were removed per supervisor feedback:
                                - Urinary Catheter
                                - Hypercoagulable State
                                - Percutaneous Gastrostomy
                                - Hemodialysis
                                - Malnutrition
                                These are ICU-specific features not relevant to the
                                stroke readmission prediction context at Gihundwe Hospital.
                                ============================================================ */}
                        </Grid>
                    </Box>
                );

            case 2:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem', mb: 2 }}>
                            Review Patient Information
                        </Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 3,
                                bgcolor: '#f9fafb',
                                borderRadius: 3,
                                border: '1px solid #e5e7eb',
                            }}
                        >
                            <Grid container spacing={1.5}>
                                <Grid item xs={6}><Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Name</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>{formData.first_name} {formData.last_name}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Age</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>{formData.age}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Gender</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>{formData.gender === 'M' ? 'Male' : 'Female'}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Phone</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>{formData.phone_number || 'N/A'}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>NIHSS Score</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>{formData.nihss_score || 'N/A'}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Length of Stay</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>{formData.length_of_stay_days} days</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>Discharge Destination</Typography></Grid>
                                <Grid item xs={6}><Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>{formData.discharge_destination}</Typography></Grid>
                            </Grid>
                        </Paper>
                    </Box>
                );

            default:
                return 'Unknown step';
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                    Register New Patient
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                    Register a new stroke patient to start tracking their readmission risk.
                    Credentials will be auto-generated and shown after registration.
                </Typography>
            </Box>

            <Card elevation={0} sx={cardHoverSx}>
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Stepper
                        activeStep={activeStep}
                        sx={{
                            mb: 4,
                            '& .MuiStepLabel-label': { fontWeight: 500, color: '#6b7280' },
                            '& .Mui-active .MuiStepLabel-label': { color: '#2563eb', fontWeight: 600 },
                            '& .Mui-completed .MuiStepLabel-label': { color: '#16a34a', fontWeight: 600 },
                        }}
                    >
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}

                    {getStepContent(activeStep)}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                borderColor: '#d1d5db',
                                color: '#374151',
                                px: 3,
                                '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                            }}
                        >
                            Back
                        </Button>
                        {activeStep === steps.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={submitting}
                                startIcon={<PersonAdd sx={{ fontSize: 18 }} />}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    bgcolor: '#2563eb',
                                    px: 3,
                                    boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                {submitting ? 'Registering...' : 'Register Patient'}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    bgcolor: '#2563eb',
                                    px: 3,
                                    boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                Next
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Success Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleDialogClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, border: '1px solid #e5e7eb' } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, pt: 2.5, pb: 2 }}>
                    <CheckCircle sx={{ fontSize: 28, color: '#16a34a' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                        {dialogTitle}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
                    <DialogContentText sx={{ whiteSpace: 'pre-line', color: '#374151', fontSize: '0.95rem' }}>
                        {dialogMessage}
                    </DialogContentText>

                    {success && (
                        <Box sx={{ mt: 2.5, p: 2.5, bgcolor: '#f9fafb', borderRadius: 3, border: '1px solid #e5e7eb' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827', mb: 1.5, fontSize: '0.9rem' }}>
                                Patient Credentials
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280', minWidth: 80, fontWeight: 500 }}>
                                    Username:
                                </Typography>
                                <code style={{ fontFamily: 'monospace', fontSize: '0.95rem', background: '#e5e7eb', padding: '4px 10px', borderRadius: 6, color: '#111827' }}>
                                    {success.username}
                                </code>
                                <Tooltip title="Copy username">
                                    <IconButton
                                        size="small"
                                        onClick={() => copyToClipboard(success.username, 'Username')}
                                        sx={{ color: '#6b7280', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                                    >
                                        <CopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280', minWidth: 80, fontWeight: 500 }}>
                                    Password:
                                </Typography>
                                <code style={{ fontFamily: 'monospace', fontSize: '0.95rem', background: '#e5e7eb', padding: '4px 10px', borderRadius: 6, color: '#111827' }}>
                                    {success.password}
                                </code>
                                <Tooltip title="Copy password">
                                    <IconButton
                                        size="small"
                                        onClick={() => copyToClipboard(success.password, 'Password')}
                                        sx={{ color: '#6b7280', '&:hover': { color: '#2563eb', bgcolor: '#eff6ff' } }}
                                    >
                                        <CopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#9ca3af', mt: 1.5, display: 'block', fontWeight: 500 }}>
                                Make sure to copy the exact characters – no extra spaces.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
                    <Button
                        onClick={handleDialogClose}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            bgcolor: '#2563eb',
                            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                            '&:hover': { bgcolor: '#1d4ed8' },
                        }}
                    >
                        Go to Patients
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={2500}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                ContentProps={{ sx: { borderRadius: 2, bgcolor: '#111827', fontWeight: 500 } }}
                action={
                    <IconButton size="small" color="inherit" onClick={() => setSnackbarOpen(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
            />
        </Box>
    );
}

export default RegisterPatient;