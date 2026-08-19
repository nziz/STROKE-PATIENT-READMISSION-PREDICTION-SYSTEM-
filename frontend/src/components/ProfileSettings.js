// frontend/src/components/ProfileSettings.js
import React, { useState, useEffect, useRef } from 'react';
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
    CircularProgress,
    Avatar,
    Divider,
    Tooltip,
} from '@mui/material';
import {
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Lock as LockIcon,
    Save as SaveIcon,
    CameraAlt as CameraIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';

function ProfileSettings() {
    const [user, setUser] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
    });
    const [passwordData, setPasswordData] = useState({
        current: '',
        new: '',
        confirm: '',
    });
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
            setMessage({ type: '', text: '' });
        } catch (error) {
            console.error('Error fetching profile:', error);
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            setUser({
                first_name: stored.name?.split(' ')[0] || '',
                last_name: stored.name?.split(' ')[1] || '',
                email: '',
                phone: '',
                role: stored.role || 'user',
            });
            setMessage({ type: 'warning', text: 'Could not load profile from server. Using local data.' });
        }
        setLoading(false);
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please upload an image file.' });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image must be under 2MB.' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            setProfileImage(base64);
            localStorage.setItem('profile_image', base64);
            setMessage({ type: 'success', text: 'Profile picture updated!' });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setProfileImage(null);
        localStorage.removeItem('profile_image');
        setMessage({ type: 'success', text: 'Profile picture removed.' });
    };

    const handleUserChange = (field) => (event) => {
        setUser({ ...user, [field]: event.target.value });
    };

    const handlePasswordChange = (field) => (event) => {
        setPasswordData({ ...passwordData, [field]: event.target.value });
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await API.put('profile/update/', user);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            stored.name = `${user.first_name} ${user.last_name}`.trim() || stored.name;
            localStorage.setItem('user', JSON.stringify(stored));
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (passwordData.new !== passwordData.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (passwordData.new.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await API.post('change-password/', {
                current: passwordData.current,
                new: passwordData.new,
            });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage({ type: 'error', text: (error.response?.data?.error || 'Failed to change password') });
        }
        setSaving(false);
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

    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#0d47a1', letterSpacing: '-0.5px' }}>
                    Profile Settings
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                    Manage your account information, profile picture, and security.
                </Typography>
            </Box>

            {message.text && (
                <Alert
                    severity={message.type}
                    sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}
                    onClose={() => setMessage({ type: '', text: '' })}
                >
                    {message.text}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Left Column - Profile Info */}
                <Grid item xs={12} md={7}>
                    <Card elevation={0} sx={cardHoverSx}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem', mb: 3 }}>
                                Personal Information
                            </Typography>

                            {/* Avatar Upload */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Tooltip title="Click to change photo">
                                        <Avatar
                                            src={profileImage || undefined}
                                            sx={{
                                                width: 88,
                                                height: 88,
                                                bgcolor: '#2563eb',
                                                fontSize: 32,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: '3px solid #e5e7eb',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    boxShadow: '0 0 0 4px rgba(37,99,235,0.2)',
                                                    borderColor: '#bfdbfe',
                                                },
                                            }}
                                            onClick={handleImageClick}
                                        >
                                            {!profileImage && fullName.charAt(0)}
                                        </Avatar>
                                    </Tooltip>
                                    <Box
                                        onClick={handleImageClick}
                                        sx={{
                                            position: 'absolute',
                                            bottom: -2,
                                            right: -2,
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            bgcolor: '#2563eb',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            border: '2px solid #fff',
                                            boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                                            '&:hover': { bgcolor: '#1d4ed8' },
                                        }}
                                    >
                                        <CameraIcon sx={{ fontSize: 14 }} />
                                    </Box>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem' }}>
                                        {fullName}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                        {user.role?.toUpperCase() || 'User'}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<CameraIcon sx={{ fontSize: 16 }} />}
                                            onClick={handleImageClick}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                borderColor: '#d1d5db',
                                                color: '#374151',
                                                fontSize: '0.75rem',
                                                '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                                            }}
                                        >
                                            {profileImage ? 'Change Photo' : 'Upload Photo'}
                                        </Button>
                                        {profileImage && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                color="error"
                                                startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                                                onClick={handleRemoveImage}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: 'none',
                                                    fontWeight: 500,
                                                    borderColor: '#dc2626',
                                                    color: '#dc2626',
                                                    fontSize: '0.75rem',
                                                    '&:hover': { bgcolor: '#fef2f2', borderColor: '#dc2626' },
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500, mt: 0.5, display: 'block' }}>
                                        Max file size: 2MB
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ mb: 3, borderColor: '#f3f4f6' }} />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="First Name"
                                        value={user.first_name}
                                        onChange={handleUserChange('first_name')}
                                        sx={textFieldSx}
                                        InputProps={{
                                            startAdornment: (
                                                <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex' }}>
                                                    <PersonIcon sx={{ fontSize: 20 }} />
                                                </Box>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Last Name"
                                        value={user.last_name}
                                        onChange={handleUserChange('last_name')}
                                        sx={textFieldSx}
                                        InputProps={{
                                            startAdornment: (
                                                <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex' }}>
                                                    <PersonIcon sx={{ fontSize: 20 }} />
                                                </Box>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        type="email"
                                        value={user.email}
                                        onChange={handleUserChange('email')}
                                        sx={textFieldSx}
                                        InputProps={{
                                            startAdornment: (
                                                <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex' }}>
                                                    <EmailIcon sx={{ fontSize: 20 }} />
                                                </Box>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Phone Number"
                                        value={user.phone || ''}
                                        onChange={handleUserChange('phone')}
                                        placeholder="+250XXXXXXXXX"
                                        sx={textFieldSx}
                                        InputProps={{
                                            startAdornment: (
                                                <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex' }}>
                                                    <PhoneIcon sx={{ fontSize: 20 }} />
                                                </Box>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Role"
                                        value={user.role?.toUpperCase() || 'N/A'}
                                        disabled
                                        sx={{
                                            ...textFieldSx,
                                            '& .MuiOutlinedInput-root': {
                                                ...textFieldSx['& .MuiOutlinedInput-root'],
                                                bgcolor: '#f3f4f6',
                                            },
                                        }}
                                    />
                                </Grid>
                            </Grid>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon sx={{ fontSize: 18 }} />}
                                onClick={handleSaveProfile}
                                disabled={saving}
                                sx={{
                                    mt: 3,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    bgcolor: '#2563eb',
                                    boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                                    '&:hover': { bgcolor: '#1d4ed8' },
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column - Password */}
                <Grid item xs={12} md={5}>
                    <Card elevation={0} sx={cardHoverSx}>
                        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.1rem', mb: 2 }}>
                                Change Password
                            </Typography>
                            <TextField
                                fullWidth
                                label="Current Password"
                                type="password"
                                value={passwordData.current}
                                onChange={handlePasswordChange('current')}
                                margin="normal"
                                sx={textFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex' }}>
                                            <LockIcon sx={{ fontSize: 20 }} />
                                        </Box>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                label="New Password"
                                type="password"
                                value={passwordData.new}
                                onChange={handlePasswordChange('new')}
                                margin="normal"
                                helperText="Minimum 6 characters"
                                sx={textFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex' }}>
                                            <LockIcon sx={{ fontSize: 20 }} />
                                        </Box>
                                    ),
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Confirm New Password"
                                type="password"
                                value={passwordData.confirm}
                                onChange={handlePasswordChange('confirm')}
                                margin="normal"
                                error={passwordData.confirm && passwordData.new !== passwordData.confirm}
                                helperText={passwordData.confirm && passwordData.new !== passwordData.confirm ? 'Passwords do not match' : ''}
                                sx={textFieldSx}
                                InputProps={{
                                    startAdornment: (
                                        <Box sx={{ color: '#9ca3af', mr: 1, display: 'flex' }}>
                                            <LockIcon sx={{ fontSize: 20 }} />
                                        </Box>
                                    ),
                                }}
                            />
                            <Button
                                variant="outlined"
                                startIcon={<LockIcon sx={{ fontSize: 18 }} />}
                                onClick={handleChangePassword}
                                disabled={saving}
                                sx={{
                                    mt: 2,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    borderColor: '#d1d5db',
                                    color: '#374151',
                                    '&:hover': { borderColor: '#9ca3af', bgcolor: '#f9fafb' },
                                }}
                            >
                                {saving ? 'Changing...' : 'Change Password'}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default ProfileSettings;