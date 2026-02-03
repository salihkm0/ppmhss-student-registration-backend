const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        const token = req.header('x-auth-token');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token, authorization denied'
            });
        }

        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || 'your-secret-key'
            );
            
            req.user = decoded;
            
            // Check role authorization
            if (roles.length > 0 && !roles.includes(decoded.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied. Insufficient permissions.'
                });
            }
            
            next();
        } catch (error) {
            res.status(401).json({
                success: false,
                error: 'Token is not valid'
            });
        }
    };
};

module.exports = auth;