// frontend/src/components/PanicButton.js
import React, { useState, useEffect } from 'react';
import API from '../api';
import {
    Box, Button, CircularProgress, Typography, Snackbar, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { Emergency as EmergencyIcon } from '@mui/icons-material';

function PanicButton() {
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });
    
    // For non-logged in users
    const [idDialogOpen, setIdDialogOpen] = useState(false);
    const [manualId, setManualId] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('user');
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

    const triggerPanic = async (patientId) => {
        if (!patientId) {
            setSnackbar({ open: true, severity: 'error', message: 'Patient ID is required.' });
            return;
        }

        // FRONTEND LIMIT: Check localStorage for 3 alerts per day
        const storageKey = `panic_alerts_${patientId}`;
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const today = new Date().toDateString();
        const todayAlerts = stored.filter(date => new Date(date).toDateString() === today);

        if (todayAlerts.length >= 3) {
            setSnackbar({ open: true, severity: 'error', message: 'Daily limit reached (3 per day). Please call emergency services if this is a real emergency.' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                patient_id: patientId,
                message: 'EMERGENCY: Patient needs immediate assistance!',
            };
            const response = await API.post('panic-alert/', payload);
            
            // Save to localStorage to enforce the limit
            todayAlerts.push(new Date().toISOString());
            localStorage.setItem(storageKey, JSON.stringify(todayAlerts));

            setSnackbar({ open: true, severity: 'success', message: response.data.message || 'Emergency alert sent to all doctors!' });
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Failed to send alert. Please call emergency services directly.';
            setSnackbar({ open: true, severity: 'error', message: errMsg });
        } finally {
            setLoading(false);
            setIdDialogOpen(false);
        }
    };

    const handleClick = () => {
        if (isLoggedIn && userData?.patient_id) {
            // 1-Click for logged in users
            triggerPanic(userData.patient_id);
        } else {
            // Minimal prompt for non-logged in users
            setIdDialogOpen(true);
        }
    };

    return (
        <>
            <Box sx={{ position: 'fixed', bottom: 30, right: 28, zIndex: 9999 }}>
                <Button
                    variant="contained"
                    color="error"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <EmergencyIcon />}
                    onClick={handleClick}
                    disabled={loading}
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
                        animation: loading ? 'none' : 'panicPulse 1.8s infinite',
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
                    {loading ? 'Sending...' : 'Panic Button'}
                </Button>
            </Box>

            {/* Minimal Dialog for Non-Logged In Users Only */}
            <Dialog open={idDialogOpen} onClose={() => setIdDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Enter Patient ID</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: '#6b7280' }}>
                        You are not logged in. Please enter your Patient ID to send the emergency alert.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Patient ID"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="e.g. 4"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIdDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => triggerPanic(manualId)} variant="contained" color="error">Send Alert</Button>
                </DialogActions>
            </Dialog>

            {/* Feedback Snackbar */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity} 
                    variant="filled"
                    sx={{ width: '100%', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}

export default PanicButton;