// frontend/src/components/Login.js
import React, { useState, useEffect } from 'react';
import API from '../api';
import { loginUser } from '../api/auth';
import {
    Box, Card, CardContent, Typography, TextField, Button, Alert,
    InputAdornment, IconButton, Divider, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, Checkbox, FormControlLabel
} from '@mui/material';
import {
    Person as PersonIcon, Lock as LockIcon, Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon, MedicalServices as MedicalIcon, 
    Email as EmailIcon, Warning as WarningIcon
} from '@mui/icons-material';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Forgot Password States
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotStep, setForgotStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotUid, setForgotUid] = useState('');
    const [forgotToken, setForgotToken] = useState('');
    const [forgotNewPass, setForgotNewPass] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' });

    // NEW: Public Panic States
    const [panicOpen, setPanicOpen] = useState(false);
    const [panicIdentifier, setPanicIdentifier] = useState('');
    const [panicLoading, setPanicLoading] = useState(false);
    const [panicMessage, setPanicMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchCSRF = async () => { try { await API.get('csrf/'); } catch (err) {} };
        fetchCSRF();
        const savedUser = localStorage.getItem('remembered_username');
        if (savedUser) { setUsername(savedUser); setRememberMe(true); }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const user = username.trim();
        const pass = password.trim();
        if (!user || !pass) { setError('Please enter both username and password.'); setLoading(false); return; }

        if (rememberMe) localStorage.setItem('remembered_username', user);
        else localStorage.removeItem('remembered_username');

        try {
            const result = await loginUser(user, pass, rememberMe);
            if (result.success) {
                sessionStorage.setItem('tab_session', result.session_key);
                sessionStorage.setItem('user', JSON.stringify({
                    username: result.username, role: result.role,
                    patient_id: result.patient_id || null, name: result.name,
                }));
                window.location.href = result.role === 'patient' ? '/patient-dashboard' : '/';
            } else {
                setError(result.error || 'Invalid credentials.');
                setLoading(false);
            }
        } catch (err) {
            setError('An error occurred during login. Please try again.');
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    // --- FORGOT PASSWORD HANDLERS ---
    const resetForgotState = () => {
        setForgotStep(1); setForgotEmail(''); setForgotUid(''); setForgotToken('');
        setForgotNewPass(''); setForgotMessage({ type: '', text: '' });
    };

    const handleRequestReset = async () => {
        if (!forgotEmail.trim()) return;
        setForgotLoading(true);
        try {
            const res = await API.post('request-password-reset/', { email: forgotEmail.trim() });
            setForgotMessage({ type: 'success', text: res.data.message || 'Check your email for the reset code.' });
            setForgotStep(2);
        } catch (err) { setForgotMessage({ type: 'error', text: 'Failed to send reset email.' }); }
        setForgotLoading(false);
    };

    const handleResetPassword = async () => {
        if (!forgotUid.trim() || !forgotToken.trim() || !forgotNewPass.trim()) return setForgotMessage({ type: 'error', text: 'All fields are required.' });
        if (forgotNewPass.length < 6) return setForgotMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
        setForgotLoading(true);
        try {
            const res = await API.post('reset-password/', { uid: forgotUid.trim(), token: forgotToken.trim(), new_password: forgotNewPass });
            setForgotMessage({ type: 'success', text: res.data.message || 'Password reset successful!' });
            setTimeout(() => { setForgotOpen(false); resetForgotState(); }, 2000);
        } catch (err) { setForgotMessage({ type: 'error', text: err.response?.data?.error || 'Invalid token.' }); }
        setForgotLoading(false);
    };

    // --- NEW: PUBLIC PANIC HANDLER ---
    const handlePublicPanic = async () => {
        if (!panicIdentifier.trim()) return;
        setPanicLoading(true);
        setPanicMessage({ type: '', text: '' });
        try {
            // Send the identifier (Hospital ID like ST-0004 or Phone Number)
            const res = await API.post('panic-alert/', { identifier: panicIdentifier.trim() });
            setPanicMessage({ type: 'success', text: res.data.message || '🚨 EMERGENCY ALERT SENT!' });
            setTimeout(() => { setPanicOpen(false); setPanicIdentifier(''); setPanicMessage({type:'', text:''}); }, 3000);
        } catch (err) {
            setPanicMessage({ type: 'error', text: err.response?.data?.error || 'Patient not found. Please check ID.' });
        }
        setPanicLoading(false);
    };

    const textFieldSx = {
        '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#ffffff', '& fieldset': { borderColor: '#d1d5db' }, '&:hover fieldset': { borderColor: '#9ca3af' }, '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: 2 }, '& input': { color: '#111827', fontWeight: 500, fontSize: '0.95rem' } },
        '& .MuiInputLabel-root': { color: '#6b7280', fontWeight: 500, '&.Mui-focused': { color: '#2563eb' } },
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9fafb', p: 2 }}>
            <Card elevation={0} sx={{ maxWidth: 440, width: '100%', borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden', bgcolor: '#ffffff' }}>
                <Box sx={{ bgcolor: '#2563eb', p: 4, textAlign: 'center', color: '#fff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                        <MedicalIcon sx={{ fontSize: 36 }} />
                        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>StrokeReadmit</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>Stroke Patient Readmission Prediction System</Typography>
                </Box>

                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>Welcome Back</Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 3, mt: 0.5, fontWeight: 500 }}>Sign in to access your dashboard</Typography>

                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontWeight: 500 }}>{error}</Alert>}

                    <form onSubmit={handleLogin}>
                        <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} margin="normal" required placeholder="Enter your username" sx={{ ...textFieldSx, mt: 0.5 }} InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#9ca3af', fontSize: 20, mr: 1 }} /></InputAdornment> }} />
                        <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required placeholder="Enter your password" sx={{ ...textFieldSx, mt: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#9ca3af', fontSize: 20, mr: 1 }} /></InputAdornment>, endAdornment: (<InputAdornment position="end"><IconButton onClick={togglePasswordVisibility} edge="end" sx={{ color: '#9ca3af' }}>{showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}</IconButton></InputAdornment>) }} />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 1 }}>
                            <FormControlLabel
                                control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} size="small" sx={{ color: '#9ca3af', '&.Mui-checked': { color: '#2563eb' } }} />}
                                label={<Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 500 }}>Remember me</Typography>}
                            />
                            <Button type="button" onClick={() => setForgotOpen(true)} sx={{ textTransform: 'none', color: '#2563eb', fontWeight: 500, fontSize: '0.875rem', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}>
                                Forgot Password?
                            </Button>
                        </Box>

                        <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: '1rem', fontWeight: 600, bgcolor: '#2563eb', boxShadow: '0 1px 3px rgba(37,99,235,0.3)', '&:hover': { bgcolor: '#1d4ed8' } }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    {/* NEW: PUBLIC PANIC BUTTON SECTION */}
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px dashed #fca5a5', textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Medical Emergency?
                        </Typography>
                        <Button 
                            fullWidth variant="contained" color="error" onClick={() => setPanicOpen(true)} startIcon={<WarningIcon />}
                            sx={{ mt: 1, py: 1.2, borderRadius: 2, fontWeight: 700, textTransform: 'none', fontSize: '0.95rem', boxShadow: '0 4px 6px rgba(220,38,38,0.2)' }}
                        >
                            Trigger Panic Alert (No Login Required)
                        </Button>
                    </Box>

                    <Divider sx={{ my: 3, borderColor: '#f3f4f6' }}><Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, px: 1 }}>Secure Access</Typography></Divider>
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>Contact your healthcare provider for credentials</Typography>
                </CardContent>
            </Card>

            {/* FORGOT PASSWORD MODAL */}
            <Dialog open={forgotOpen} onClose={() => { setForgotOpen(false); resetForgotState(); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, color: '#0d47a1' }}>{forgotStep === 1 ? 'Reset Password' : 'Enter Reset Code'}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, color: '#6b7280' }}>
                        {forgotStep === 1 ? "Enter your email address and we'll send you a User ID and Reset Token." : "Check your email and paste the User ID and Reset Token below, then enter your new password."}
                    </DialogContentText>
                    {forgotMessage.text && <Alert severity={forgotMessage.type} sx={{ mb: 2, borderRadius: 2, fontWeight: 500 }}>{forgotMessage.text}</Alert>}
                    {forgotStep === 1 ? (
                        <TextField fullWidth label="Email Address" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} sx={{ ...textFieldSx, mt: 1 }} InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#9ca3af' }} /></InputAdornment> }} />
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField fullWidth label="User ID (from email)" value={forgotUid} onChange={(e) => setForgotUid(e.target.value)} sx={textFieldSx} />
                            <TextField fullWidth label="Reset Token (from email)" value={forgotToken} onChange={(e) => setForgotToken(e.target.value)} sx={textFieldSx} />
                            <TextField fullWidth label="New Password" type="password" value={forgotNewPass} onChange={(e) => setForgotNewPass(e.target.value)} sx={textFieldSx} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => { setForgotOpen(false); resetForgotState(); }} sx={{ textTransform: 'none', color: '#6b7280' }}>Cancel</Button>
                    {forgotStep === 2 && <Button onClick={() => setForgotStep(1)} sx={{ textTransform: 'none', color: '#2563eb' }}>Back</Button>}
                    <Button onClick={forgotStep === 1 ? handleRequestReset : handleResetPassword} variant="contained" disabled={forgotLoading} sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}>
                        {forgotLoading ? 'Processing...' : (forgotStep === 1 ? 'Send Code' : 'Reset Password')}
                    </Button>
                </DialogActions>
            </Dialog>

                        {/* PUBLIC PANIC MODAL (SIMPLIFIED) */}
            <Dialog open={panicOpen} onClose={() => setPanicOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                    <WarningIcon /> Medical Emergency
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, color: '#4b5563', fontSize: '0.9rem' }}>
                        Enter the patient's <strong>Hospital ID</strong> or <strong>Phone Number</strong> to alert doctors immediately.
                    </DialogContentText>
                    {panicMessage.text && <Alert severity={panicMessage.type} sx={{ mb: 2, borderRadius: 2 }}>{panicMessage.text}</Alert>}
                    <TextField
                        autoFocus fullWidth label="ID or Phone" value={panicIdentifier}
                        onChange={(e) => setPanicIdentifier(e.target.value)} placeholder="e.g. ST-0004"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 0, gap: 1 }}>
                    <Button onClick={() => setPanicOpen(false)} sx={{ textTransform: 'none', color: '#6b7280' }}>Cancel</Button>
                    <Button onClick={handlePublicPanic} variant="contained" color="error" disabled={panicLoading || !panicIdentifier.trim()}
                        sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}>
                        {panicLoading ? 'Sending...' : 'Send Alert'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Login;