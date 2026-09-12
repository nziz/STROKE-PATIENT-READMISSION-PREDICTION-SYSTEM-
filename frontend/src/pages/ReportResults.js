// frontend/src/pages/ReportResults.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import { Box, Typography, Card, Grid, Chip, Button, CircularProgress, Divider, Paper } from '@mui/material';
// FIX: Added CheckCircle for cleared symptoms
import { ArrowBack, Warning, Info, LocalHospital, AutoAwesome as SmartToyIcon, CheckCircle, VerifiedUser, EventNote } from '@mui/icons-material';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function ReportResults() {
    const { reportId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState(null);
    const [latestReport, setLatestReport] = useState(null);

    useEffect(() => {
        let cancelled = false;
        let retryTimer;

        const fetchData = async () => {
            try {
                if (location.state?.patient && location.state?.report) {
                    setPatient(location.state.patient);
                    setLatestReport(location.state.report);
                    setLoading(false);
                    return;
                }
                
                const user = JSON.parse(sessionStorage.getItem('user') || '{}');
                const pId = user.patient_id || location.state?.patientId;
                
                if (pId) {
                    const [pRes, rRes] = await Promise.all([
                        API.get(`patient/${pId}/`), 
                        API.get(`patient/${pId}/reports/`)
                    ]);
                    if (cancelled) return;
                    setPatient(pRes.data);
                    const reports = rRes.data.reports || rRes.data || [];
                    
                    if (reportId) {
                        const specificReport = reports.find(r => r.id === parseInt(reportId));
                        const selectedReport = specificReport || reports[0];
                        setLatestReport(selectedReport);
                        if (selectedReport && !selectedReport.ai_ready && !selectedReport.ai_recommendation) {
                            retryTimer = setTimeout(fetchData, 1000);
                        }
                    } else {
                        setLatestReport(reports[0]); 
                    }
                }
            } catch (err) {
                console.error("Error fetching report data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        return () => {
            cancelled = true;
            clearTimeout(retryTimer);
        };
    }, [reportId, location.state]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
    
    if (!patient || !latestReport) return (
        <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6" color="text.secondary">No report data found.</Typography>
            <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Go Back</Button>
        </Box>
    );

    const riskScore = patient.risk_score ?? patient.current_risk_score ?? 0;
    const riskCategory = patient.risk_category || patient.current_risk_category || 'Low';
    const riskPercentage = Math.round(riskScore * 100);
    
    const getRiskColor = (cat) => ({ High: '#dc2626', Medium: '#f59e0b', Low: '#16a34a' }[cat] || '#6b7280');
    const getRiskBg = (cat) => ({ High: '#fef2f2', Medium: '#fffbeb', Low: '#f0fdf4' }[cat] || '#f9fafb');

    const recommendations = latestReport.recommendations || patient.recommendations || [];

    // 🏥 ENTERPRISE SYMPTOM CHECKLIST
    const symptomFields = [
        { key: 'has_weakness', label: 'Numbness / Weakness', type: 'severe' },
        { key: 'has_speech_difficulty', label: 'Slurred Speech', type: 'severe' },
        { key: 'has_vision_changes', label: 'Vision Changes', type: 'severe' },
        { key: 'has_swallowing_difficulty', label: 'Swallowing Issues', type: 'severe' },
        { key: 'has_dizziness', label: 'Dizziness', type: 'mild' },
        { key: 'has_headache', label: 'Headache', type: 'mild' },
        { key: 'has_fever', label: 'Fever', type: 'mild' }
    ];

    return (
        <Box sx={{ maxWidth: 1120, mx: 'auto', p: { xs: 1.5, md: 0 }, color: '#172033' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ color: '#536174', textTransform: 'none', fontWeight: 700, minWidth: 'auto', px: 0.5 }}>Back</Button>
                <Typography sx={{ color: '#b6c0ce' }}>/</Typography>
                <Typography variant="body2" sx={{ color: '#536174', fontWeight: 600 }}>Patient report</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2.5, pb: 2, borderBottom: '1px solid #dbe3ed', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 5, height: 48, borderRadius: 1, bgcolor: '#0f766e' }} />
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#12233f', letterSpacing: '-0.3px' }}>Daily Clinical Assessment</Typography>
                        <Typography variant="body2" sx={{ color: '#536174', mt: 0.25 }}>A focused review of today&apos;s recovery indicators</Typography>
                    </Box>
                </Box>
                <Chip icon={<EventNote sx={{ fontSize: 17 }} />} label={new Date(latestReport.date || latestReport.report_date).toLocaleDateString()} sx={{ bgcolor: '#eef4f8', color: '#31546c', fontWeight: 700, borderRadius: 1.5 }} />
            </Box>

            <Grid container spacing={2}>
                {/* Left: Vitals & Risk */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #dbe3ed', p: 2, textAlign: 'center', height: '100%', boxShadow: '0 8px 24px rgba(27, 54, 93, 0.06)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#12233f', fontSize: '1rem' }}>Readmission Risk</Typography>
                            <VerifiedUser sx={{ color: '#0f766e', fontSize: 20 }} />
                        </Box>
                        <Box sx={{ width: 140, height: 140, mx: 'auto', mb: 1 }}>
                            <CircularProgressbar 
                                value={riskPercentage} 
                                text={`${riskPercentage}%`} 
                                styles={buildStyles({ 
                                    pathColor: getRiskColor(riskCategory), 
                                    textColor: getRiskColor(riskCategory), 
                                    trailColor: '#e5e7eb', 
                                    textSize: '22px',
                                    fontWeight: 'bold'
                                })} 
                            />
                        </Box>
                        <Chip 
                            label={`${riskCategory} Risk`} 
                            sx={{ bgcolor: getRiskBg(riskCategory), color: getRiskColor(riskCategory), fontWeight: 800, borderRadius: 1.5, px: 1.5, mb: 1.5, border: `1px solid ${getRiskColor(riskCategory)}33` }} 
                        />
                        
                        <Divider sx={{ my: 1.5 }} />
                        
                        <Box sx={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: '#6b7280', fontWeight: 500 }}>Well-being</Typography>
                                <Typography sx={{ fontWeight: 700 }}>{latestReport.well_being_score}/5</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ color: '#6b7280', fontWeight: 500 }}>Medications</Typography>
                                <Typography sx={{ fontWeight: 700, color: latestReport.took_medications ? '#16a34a' : '#dc2626' }}>
                                    {latestReport.took_medications ? 'Taken' : 'Missed'}
                                </Typography>
                            </Box>
                        </Box>
                    </Card>
                </Grid>

                {/* Right: Clinical Directives & Symptoms */}
                <Grid item xs={12} md={8}>
                    {/* 🏥 NEW: Clinical Symptom Checklist */}
                    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #dbe3ed', p: 2, mb: 2, boxShadow: '0 8px 24px rgba(27, 54, 93, 0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <LocalHospital sx={{ color: '#0f766e' }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#12233f', fontSize: '1rem' }}>Clinical Symptom Checklist</Typography>
                                <Typography variant="caption" sx={{ color: '#708096' }}>Reported during today&apos;s check-in</Typography>
                            </Box>
                        </Box>

                        <Grid container spacing={1}>
                            {symptomFields.map((symptom) => {
                                const isPresent = latestReport[symptom.key];
                                return (
                                    <Grid item xs={6} sm={6} md={4} key={symptom.key}>
                                        <Chip
                                            label={symptom.label}
                                            variant={isPresent ? "filled" : "outlined"}
                                            sx={{
                                                width: '100%',
                                                height: 'auto',
                                                py: 0.7,
                                                fontWeight: isPresent ? 700 : 500,
                                                fontSize: '0.85rem',
                                                justifyContent: 'flex-start',
                                                borderRadius: 1.5,
                                                bgcolor: isPresent ? '#fef2f2' : 'transparent',
                                                color: isPresent ? '#991b1b' : '#64748b',
                                                borderColor: isPresent ? '#fecaca' : '#e2e8f0',
                                                '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'left', px: 1.5 }
                                            }}
                                            icon={isPresent ? <Warning sx={{ color: '#dc2626', fontSize: 16 }} /> : <CheckCircle sx={{ color: '#16a34a', fontSize: 16 }} />}
                                        />
                                    </Grid>
                                );
                            })}
                        </Grid>

                        {latestReport.notes && (
                            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                    Additional Patient Notes
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>
                                    {latestReport.notes}
                                </Typography>
                            </Box>
                        )}
                    </Card>

                    {/* AI Clinical Assessment & Recommendations */}
                    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #c9ddea', p: 2, height: '100%', boxShadow: '0 8px 24px rgba(27, 54, 93, 0.06)', overflow: 'hidden', position: 'relative' }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: '#0f766e' }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <SmartToyIcon sx={{ color: '#0f766e' }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#12233f', fontSize: '1rem' }}>AI Clinical Assessment &amp; Recommendations</Typography>
                                <Typography variant="caption" sx={{ color: '#708096' }}>Personalized from the patient&apos;s reported symptoms</Typography>
                            </Box>
                        </Box>

                        {(!recommendations || recommendations.length === 0) ? (
                            <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 1.5, border: '1px solid #bfdbfe' }}>
                                <Typography variant="body1" sx={{ color: '#0f172a', lineHeight: 1.7, fontWeight: 500 }}>
                                    {latestReport.ai_recommendation || "Standard monitoring protocols apply. Continue daily tracking and medication adherence."}
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {/* Show AI Text First if available */}
                                {latestReport.ai_recommendation && (
                                    <Box sx={{ p: 1.5, bgcolor: '#f0fdfa', borderRadius: 1.5, border: '1px solid #99f6e4', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ color: '#163b42', lineHeight: 1.6, fontWeight: 600 }}>
                                            {latestReport.ai_recommendation}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Show Rule-Based Cards */}
                                {recommendations.map((rec, idx) => {
                                    const isUrgent = rec.priority === 'IMMEDIATE' || rec.priority === 'HIGH';
                                    const color = isUrgent ? '#dc2626' : '#2563eb';
                                    const bg = isUrgent ? '#fef2f2' : '#eff6ff';
                                    const Icon = isUrgent ? Warning : Info;

                                    return (
                                        <Paper key={idx} elevation={0} sx={{ p: 1.5, borderRadius: 1.5, borderLeft: `4px solid ${color}`, bgcolor: bg }}>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Icon sx={{ color: color, mt: 0.5 }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#111827' }}>{rec.action}</Typography>
                                                        <Chip label={rec.priority} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: color, color: '#fff' }} />
                                                    </Box>
                                                    {rec.details && <Typography variant="body2" sx={{ color: '#4b5563', lineHeight: 1.5 }}>{rec.details}</Typography>}
                                                </Box>
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </Box>
                        )}
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default ReportResults;