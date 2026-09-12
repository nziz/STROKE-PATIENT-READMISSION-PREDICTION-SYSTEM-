// frontend/src/components/SubmitReport.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
    Box, Card, Typography, Grid, Button, Alert, 
    Slider, FormControlLabel, Switch, TextField, Chip, CircularProgress
} from '@mui/material';
import {
    Medication as MedIcon, SentimentSatisfied as HappyIcon,
    Warning as WarningIcon, CheckCircle as CheckIcon
} from '@mui/icons-material';

function SubmitReport() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [wellBeing, setWellBeing] = useState(3);
    const [tookMeds, setTookMeds] = useState(true);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [additionalNotes, setAdditionalNotes] = useState('');

    const symptomOptions = [
        'Numbness / Weakness', 'Dizziness / Imbalance', 'Severe Headache',
        'Vision Changes', 'Chest Pain', 'Shortness of Breath',
        'Confusion / Slurred Speech', 'Extreme Fatigue', 'None (Feeling Well)'
    ];

    const handleSymptomToggle = (symptom) => {
        if (symptom === 'None (Feeling Well)') {
            setSelectedSymptoms(['None (Feeling Well)']);
        } else {
            setSelectedSymptoms(prev => 
                prev.includes(symptom) 
                    ? prev.filter(s => s !== symptom) 
                    : [...prev.filter(s => s !== 'None (Feeling Well)'), symptom]
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (!user.patient_id) {
            setMessage({ type: 'error', text: 'Patient ID not found. Please log in again.' });
            setLoading(false);
            return;
        }

        const finalSymptoms = selectedSymptoms.length > 0 
            ? `${selectedSymptoms.join(', ')}. ${additionalNotes}` 
            : (additionalNotes || 'No specific symptoms reported.');

        const payload = {
            well_being_score: wellBeing,
            took_medications: tookMeds,
            symptoms: finalSymptoms
        };

        try {
            const res = await API.post(`patient/${user.patient_id}/report/`, payload);
            
            // 🚀 INSTANT REDIRECT: No setTimeout, no success banners
            const newReportId = res.data.report_id || res.data.id;
            if (newReportId) {
                navigate(`/reports/${newReportId}/results`);
            } else {
                navigate('/patient-dashboard');
            }
            
            // NOTE: We intentionally DO NOT call setLoading(false) here on success.
            // The page will unmount instantly, keeping the button spinner active 
            // right up until the new page loads, making it feel incredibly fast.
            
        } catch (err) {
            // Only stop loading and show message if it FAILS
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit report.' });
            setLoading(false); 
        }
    };

    const bentoCard = {
        borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)', p: 3
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 3 } }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>Daily Health Check-in</Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>Select your symptoms below. Our clinical engine will review this instantly.</Typography>
            </Box>

            {/* ONLY show the alert if it is an ERROR (No more green success flashes) */}
            {message.text && message.type === 'error' && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{message.text}</Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    
                    {/* Well-being Score */}
                    <Grid item xs={12}>
                        <Card elevation={0} sx={bentoCard}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <HappyIcon sx={{ color: '#0284c7' }} />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Overall Well-being</Typography>
                            </Box>
                            <Box sx={{ px: 2 }}>
                                <Slider value={wellBeing} onChange={(e, val) => setWellBeing(val)} step={1} marks min={1} max={5} valueLabelDisplay="auto" sx={{ color: '#0284c7' }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>Poor</Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>Excellent</Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>

                    {/* Symptom Chips */}
                    <Grid item xs={12}>
                        <Card elevation={0} sx={bentoCard}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <WarningIcon sx={{ color: '#0284c7' }} />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Current Symptoms</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>Tap all that apply right now:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {symptomOptions.map((opt) => (
                                    <Chip
                                        key={opt}
                                        label={opt}
                                        onClick={() => handleSymptomToggle(opt)}
                                        variant={selectedSymptoms.includes(opt) ? "filled" : "outlined"}
                                        sx={{
                                            fontWeight: 600, borderRadius: 2, px: 1,
                                            bgcolor: selectedSymptoms.includes(opt) ? '#0f172a' : '#ffffff',
                                            color: selectedSymptoms.includes(opt) ? '#ffffff' : '#475569',
                                            borderColor: '#cbd5e1',
                                            '&:hover': { bgcolor: selectedSymptoms.includes(opt) ? '#1e293b' : '#f8fafc' }
                                        }}
                                    />
                                ))}
                            </Box>
                            <TextField
                                fullWidth multiline rows={2} placeholder="Any additional details? (Optional)"
                                value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
                                sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } }}
                            />
                        </Card>
                    </Grid>

                    {/* Medication */}
                    <Grid item xs={12}>
                        <Card elevation={0} sx={{ ...bentoCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <MedIcon sx={{ color: '#0284c7' }} />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Medication Adherence</Typography>
                            </Box>
                            <FormControlLabel
                                control={<Switch checked={tookMeds} onChange={(e) => setTookMeds(e.target.checked)} color="primary" />}
                                label={
                                    <Typography sx={{ fontWeight: 600, color: tookMeds ? '#16a34a' : '#dc2626' }}>
                                        {tookMeds ? 'Yes, I took all medications' : 'No, I missed a dose'}
                                    </Typography>
                                }
                            />
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
                            sx={{ py: 2, borderRadius: 2, textTransform: 'none', fontSize: '1.1rem', fontWeight: 700, bgcolor: '#0f172a', boxShadow: '0 4px 6px rgba(15,23,42,0.1)', '&:hover': { bgcolor: '#1e293b' } }}>
                            {loading ? 'Predicting ...' : 'Submit Daily Report'}
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
}

export default SubmitReport;