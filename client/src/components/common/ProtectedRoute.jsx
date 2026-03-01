import { Navigate } from 'react-router-dom';

const decodeToken = (token) => {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return decoded;
    } catch (error) {
        return null;
    }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    let user = null;
    try {
        user = storedUser ? JSON.parse(storedUser) : null;
    } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return <Navigate to="/login" replace />;
    }

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    const decoded = decodeToken(token);
    if (decoded?.exp && Date.now() >= decoded.exp * 1000) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
