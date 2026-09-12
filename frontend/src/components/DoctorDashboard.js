// frontend/src/components/DoctorDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { Box, Card, CardContent, Typography, Grid, Chip, Button, Avatar, CircularProgress, LinearProgress } from '@mui/material';
import { Warning, CheckCircle, TrendingUp, People, ArrowForward } from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function DoctorDashboard() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await API.get('doctor/dashboard/');
                setPatients(res.data.patients || []);
                setStats({
                    total: res.data.total_patients || 0,
                    high: res.data.high_risk_count || 0,
                    medium: res.data.medium_risk_count || 0,
                    low: res.data.low_risk_count || 0,
                });
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

    // Sort patients: High risk first, then medium, then low
    const sortedPatients = [...patients].sort((a, b) => {
        const riskOrder = { High: 1, Medium: 2, Low: 3 };
        return (riskOrder[a.risk_category] || 4) - (riskOrder[b.risk_category] || 4);
    });

    const pieData = [
        { name: 'High', value: stats.high, color: '#ef4444' },
        { name: 'Medium', value: stats.medium, color: '#f59e0b' },
        { name: 'Low', value: stats.low, color: '#10b981' },
    ].filter(d => d.value > 0);

    const bentoCard = {
        borderRadius: 4, bgcolor: '#ffffff', border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'all 0.2s',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: '#e2e8f0' }
    };

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>Clinical Command Center</Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>Real-time cohort monitoring and triage.</Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Cohort Health Breakdown (Donut) */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ ...bentoCard, height: '100%', p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>Cohort Risk Distribution</Typography>
                        <Box sx={{ height: 200, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>{stats.total}</Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Total</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                            {pieData.map(d => (
                                <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color }} />
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>{d.name} ({d.value})</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Card>
                </Grid>

                {/* Attention Required List */}
                <Grid item xs={12} md={8}>
                    <Card elevation={0} sx={{ ...bentoCard, height: '100%', p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Warning sx={{ color: '#ef4444' }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>Attention Required</Typography>
                            </Box>
                            <Button endIcon={<ArrowForward />} onClick={() => navigate('/patients/search')} sx={{ textTransform: 'none', color: '#0ea5e9', fontWeight: 600 }}>View All</Button>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 280, overflowY: 'auto' }}>
                            {sortedPatients.slice(0, 5).map(p => (
                                <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ width: 36, height: 36, bgcolor: '#e2e8f0', color: '#475569', fontSize: '0.9rem', fontWeight: 700 }}>
                                            {p.name?.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography sx={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{p.name}</Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b' }}>ID: {p.hospital_id || p.id}</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Chip label={p.risk_category} size="small" 
                                            sx={{ 
                                                fontWeight: 700, borderRadius: 1,
                                                bgcolor: p.risk_category === 'High' ? '#fee2e2' : p.risk_category === 'Medium' ? '#fef3c7' : '#dcfce7',
                                                color: p.risk_category === 'High' ? '#991b1b' : p.risk_category === 'Medium' ? '#92400e' : '#166534'
                                            }} 
                                        />
                                        <Button size="small" onClick={() => navigate(`/patient/${p.id}`)} sx={{ textTransform: 'none', fontWeight: 600, color: '#0ea5e9' }}>Review</Button>
                                    </Box>
                                </Box>
                            ))}
                            {sortedPatients.length === 0 && <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 4 }}>No patients requiring attention.</Typography>}
                        </Box>
                    </Card>
                </Grid>

                {/* Quick Stats Row */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ ...bentoCard, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1.5, bgcolor: '#fee2e2', borderRadius: 2 }}><Warning sx={{ color: '#ef4444' }} /></Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.high}</Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>High Risk Patients</Typography>
                        </Box>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ ...bentoCard, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1.5, bgcolor: '#fef3c7', borderRadius: 2 }}><TrendingUp sx={{ color: '#f59e0b' }} /></Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.medium}</Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Medium Risk Patients</Typography>
                        </Box>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ ...bentoCard, p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1.5, bgcolor: '#dcfce7', borderRadius: 2 }}><CheckCircle sx={{ color: '#10b981' }} /></Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{stats.low}</Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>Low Risk / Stable</Typography>
                        </Box>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default DoctorDashboard;