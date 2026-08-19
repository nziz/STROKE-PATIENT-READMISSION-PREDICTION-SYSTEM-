import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, allowedRoles = null }) => {
    const user = JSON.parse(localStorage.getItem('user'));

    // Not logged in → go to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If roles are specified and the user's role is not allowed → redirect to their dashboard
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const redirectTo = user.role === 'doctor' ? '/' : '/patient-dashboard';
        return <Navigate to={redirectTo} replace />;
    }

    // Authenticated and authorized → render children
    return children;
};

export default PrivateRoute;