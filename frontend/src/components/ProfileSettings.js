// frontend/src/components/ProfileSettings.js
import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import {
    Box, Card, CardContent, Typography, TextField, Button, Grid, Alert, 
    CircularProgress, Avatar, Tabs, Tab, IconButton, Tooltip
} from '@mui/material';
import {
    Person as PersonIcon, Save as SaveIcon, CameraAlt as CameraIcon, 
    Security as SecurityIcon, Lock as LockIcon
} from '@mui/icons-material';

function ProfileSettings() {
    const [tabValue, setTabValue] = useState(0);
    const [user, setUser] = useState({ first_name: '', last_name: '', email: '', phone: '', role: '' });
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profileImage, setProfileImage] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
        const saved = localStorage.getItem('profile_image');
        if (saved) setProfileImage(saved);
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const response = await API.get('profile/');
            setUser(response.data);
        } catch (error) {
            const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
            setUser({
                first_name: stored.name?.split(' ')[0] || '',
                last_name: stored.name?.split(' ')[1] || '',
                email: stored.email || '',
                phone: '',
                role: stored.role || 'user',
            });
        }
        setLoading(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return setMessage({ type: 'error', text: 'Please upload an image file.' });
        if (file.size > 2 * 1024 * 1024) return setMessage({ type: 'error', text: 'Image must be under 2MB.' });

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileImage(reader.result);
            localStorage.setItem('profile_image', reader.result);
            setMessage({ type: 'success', text: 'Profile picture updated!' });
        };
        reader.readAsDataURL(file);
    };

    const handleUserChange = (field) => (event) => setUser({ ...user, [field]: event.target.value });
    const handlePasswordChange = (field) => (event) => setPasswordData({ ...passwordData, [field]: event.target.value });

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await API.put('profile/update/', user);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
            stored.name = `${user.first_name} ${user.last_name}`.trim() || stored.name;
            stored.email = user.email; // Keep email synced in the tab session
            sessionStorage.setItem('user', JSON.stringify(stored));
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        setMessage({ type: '', text: '' });
        if (passwordData.new !== passwordData.confirm) return setMessage({ type: 'error', text: 'New passwords do not match' });
        if (passwordData.new.length < 6) return setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
        
        setSaving(true);
        try {
            await API.post('change-password/', { current: passwordData.current, new: passwordData.new });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error) {
            setMessage({ type: 'error', text: (error.response?.data?.error || 'Failed to change password') });
        }
        setSaving(false);
    };

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0d47a1', letterSpacing: '-0.5px' }}>Account Settings</Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>Manage your personal details, contact info, and security preferences.</Typography>
            </Box>

            {message.text && (
                <Alert severity={message.type} sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }} onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                </Alert>
            )}

            {/* Tabbed Settings Card */}
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.95rem', px: 3 } }}>
                        <Tab icon={<PersonIcon sx={{ fontSize: 18, mb: 0.5 }} />} iconPosition="start" label="Profile Information" />
                        <Tab icon={<SecurityIcon sx={{ fontSize: 18, mb: 0.5 }} />} iconPosition="start" label="Security & Password" />
                    </Tabs>
                </Box>

                {/* TAB 1: PROFILE INFO */}
                {tabValue === 0 && (
                    <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
                        {/* Compact Avatar Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4, p: 2.5, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    src={profileImage || undefined}
                                    sx={{ width: 72, height: 72, bgcolor: '#0d47a1', fontSize: 28, fontWeight: 700, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                                >
                                    {!profileImage && fullName.charAt(0)}
                                </Avatar>
                                <Tooltip title="Upload Photo">
                                    <IconButton
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{
                                            position: 'absolute', bottom: -4, right: -4, width: 28, height: 28,
                                            bgcolor: '#0d47a1', color: '#fff', border: '2px solid #fff',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)', '&:hover': { bgcolor: '#0a3a80' }
                                        }}
                                    >
                                        <CameraIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{fullName}</Typography>
                                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, textTransform: 'capitalize' }}>{user.role || 'User'}</Typography>
                                {profileImage && (
                                    <Button size="small" color="error" onClick={() => { setProfileImage(null); localStorage.removeItem('profile_image'); }} sx={{ textTransform: 'none', mt: 0.5, fontSize: '0.75rem', p: 0, minWidth: 'auto' }}>
                                        Remove Photo
                                    </Button>
                                )}
                            </Box>
                        </Box>

                        <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', fontSize: '0.75rem', mb: 2, display: 'block' }}>Personal Details</Typography>
                        
                        <Grid container spacing={2.5}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="First Name" value={user.first_name} onChange={handleUserChange('first_name')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Last Name" value={user.last_name} onChange={handleUserChange('last_name')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Email Address" type="email" value={user.email} onChange={handleUserChange('email')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Phone Number" value={user.phone || ''} onChange={handleUserChange('phone')} placeholder="+250XXXXXXXXX" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveProfile} disabled={saving}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#0d47a1', px: 4, boxShadow: '0 2px 4px rgba(13,71,161,0.2)', '&:hover': { bgcolor: '#0a3a80' } }}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Box>
                    </CardContent>
                )}

                {/* TAB 2: SECURITY */}
                {tabValue === 1 && (
                    <CardContent sx={{ p: 4, '&:last-child': { pb: 4 } }}>
                        <Box sx={{ maxWidth: 500 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>Update Password</Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>Ensure your account is using a strong, unique password to protect your medical data.</Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <TextField fullWidth label="Current Password" type="password" value={passwordData.current} onChange={handlePasswordChange('current')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
                                <TextField fullWidth label="New Password" type="password" value={passwordData.new} onChange={handlePasswordChange('new')} helperText="Minimum 6 characters" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} />
                                <TextField 
                                    fullWidth 
                                    label="Confirm New Password" 
                                    type="password" 
                                    value={passwordData.confirm} 
                                    onChange={handlePasswordChange('confirm')} 
                                    error={passwordData.confirm && passwordData.new !== passwordData.confirm}
                                    helperText={passwordData.confirm && passwordData.new !== passwordData.confirm ? 'Passwords do not match' : ''}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }} 
                                />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                                <Button variant="contained" startIcon={<LockIcon />} onClick={handleChangePassword} disabled={saving}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, bgcolor: '#0d47a1', px: 4, boxShadow: '0 2px 4px rgba(13,71,161,0.2)', '&:hover': { bgcolor: '#0a3a80' } }}>
                                    {saving ? 'Updating...' : 'Update Password'}
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                )}
            </Card>
        </Box>
    );
}

export default ProfileSettings;