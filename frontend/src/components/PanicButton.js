// frontend/src/components/PanicButton.js
import React, { useState, useEffect } from 'react';
import API from '../api';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Alert,
    CircularProgress,
    Typography,
    IconButton,
    TextField,
    Checkbox,
    FormControlLabel,
    Avatar,
    Stack,
} from '@mui/material';
import {
    Emergency as EmergencyIcon,
    Close as CloseIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';

function PanicButton() {
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [patientId, setPatientId] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setUserData(data);
                setIsLoggedIn(data && data.role === 'patient');
            } catch (e) {
                setIsLoggedIn(false);
            }
        }
    }, []);

    const handleOpen = () => {
        setOpen(true);
        setResult(null);
        setError(null);
        setAgreed(false);
    };

    const handleClose = () => {
        setOpen(false);
        setConfirmOpen(false);
        setResult(null);
        setError(null);
    };

    const handleConfirmOpen = () => {
        if (!isLoggedIn && !patientId) {
            setError('Please enter your Patient ID.');
            return;
        }
        if (!isLoggedIn && !agreed) {
            setError('Please confirm you understand this is an emergency.');
            return;
        }
        setConfirmOpen(true);
    };

    const handleSendPanic = async () => {
        setLoading(true);
        setError(null);

        try {
            const payload = {
                patient_id: isLoggedIn ? userData?.patient_id : patientId,
                patient_name: isLoggedIn ? userData?.name : 'Patient',
                patient_phone: localStorage.getItem('patientPhone') || 'Not provided',
                message: 'EMERGENCY: Patient needs immediate assistance!',
                location: 'Current location',
            };

            const response = await API.post('panic-alert/', payload);
            setResult(response.data);
            setConfirmOpen(false);
            setLoading(false);
        } catch (err) {
            console.error('Panic alert error:', err);
            setError('Failed to send alert. Please call emergency services directly.');
            setLoading(false);
        }
    };

    return (
        <>
            <Box sx={{ position: 'fixed', bottom: 30, right: 28, zIndex: 9999 }}>
                <Button
                    variant="contained"
                    color="error"
                    startIcon={<EmergencyIcon />}
                    onClick={handleOpen}
                    sx={{
                        borderRadius: 999,
                        py: 1.7,
                        px: 2.8,
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                        boxShadow: '0 20px 35px rgba(185, 28, 28, 0.45)',
                        border: '2px solid rgba(255,255,255,0.7)',
                        animation: 'panicPulse 1.8s infinite',
                        '@keyframes panicPulse': {
                            '0%': { transform: 'scale(1)', boxShadow: '0 20px 35px rgba(185, 28, 28, 0.45)' },
                            '50%': { transform: 'scale(1.04)', boxShadow: '0 24px 38px rgba(185, 28, 28, 0.56)' },
                            '100%': { transform: 'scale(1)', boxShadow: '0 20px 35px rgba(185, 28, 28, 0.45)' },
                        },
                        '&:hover': {
                            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                            transform: 'translateY(-1px)',
                        },
                    }}
                >
                    Panic Button
                </Button>
            </Box>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.35)' } }}>
                <DialogTitle sx={{ p: 0 }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2.5,
                        py: 2,
                        background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
                        borderBottom: '1px solid #fecaca',
                    }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 42, height: 42, bgcolor: '#dc2626', boxShadow: '0 10px 18px rgba(185,28,28,0.25)' }}>
                                <WarningIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#7f1d1d', lineHeight: 1.2 }}>
                                    Emergency Panic Alert
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#b91c1c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                    Immediate response
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton onClick={handleClose} sx={{ color: '#7f1d1d', '&:hover': { bgcolor: 'rgba(127,29,29,0.06)' } }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: 3 }}>
                    {result ? (
                        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                            {result.message}<br />
                            <Typography variant="caption">
                                {result.alerted_doctors} healthcare professionals have been notified.
                            </Typography>
                        </Alert>
                    ) : (
                        <>
                            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                            {isLoggedIn && userData && (
                                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                                    <strong>Patient details (auto-detected):</strong><br />
                                    {userData.name || 'Unknown'} {userData.patient_id ? `(ID: ${userData.patient_id})` : ''}
                                </Alert>
                            )}

                            {!isLoggedIn && (
                                <>
                                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                                        <strong>You are not logged in.</strong><br />
                                        Please provide your Patient ID below so we can identify you.
                                    </Alert>
                                    <TextField
                                        fullWidth
                                        label="Patient ID (e.g., 1, 2, 3)"
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        margin="normal"
                                        placeholder="Enter your patient ID"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={agreed}
                                                onChange={(e) => setAgreed(e.target.checked)}
                                            />
                                        }
                                        label="I understand this is an emergency and will alert all doctors."
                                        sx={{ mt: 1 }}
                                    />
                                </>
                            )}
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2, px: 2.5 }}>
                        {result ? 'Close' : 'Cancel'}
                    </Button>
                    {!result && (
                        <Button
                            onClick={handleConfirmOpen}
                            variant="contained"
                            color="error"
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <EmergencyIcon />}
                            sx={{
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 2,
                                px: 2.5,
                                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                            }}
                        >
                            {loading ? 'Sending...' : 'Send Panic Alert'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ bgcolor: '#b91c1c', color: '#fff', py: 1.75 }}>
                    <Typography variant="h6" fontWeight="800">
                        Confirm Emergency
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mt: 2, color: 'text.primary' }}>
                        {isLoggedIn ? (
                            <>
                                You are about to send a <strong>panic alert</strong> for:<br /><br />
                                <strong>{userData?.name || 'Patient'}</strong>
                                {userData?.patient_id && ` (ID: ${userData.patient_id})`}
                                <br /><br />
                                This will notify <strong>all doctors</strong> immediately.
                            </>
                        ) : (
                            <>
                                You are about to send a panic alert for Patient ID: <strong>{patientId}</strong>.<br /><br />
                                This will notify <strong>all doctors</strong> immediately.
                            </>
                        )}
                    </DialogContentText>
                    <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                        <strong>Only click Confirm if this is a genuine emergency.</strong>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setConfirmOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSendPanic}
                        variant="contained"
                        color="error"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <EmergencyIcon />}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                        {loading ? 'Sending...' : 'Confirm Emergency'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default PanicButton;