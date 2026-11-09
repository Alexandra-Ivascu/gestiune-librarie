
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    try {
        // Get token
        const token = req.cookies?.token;

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Attach user information
        req.user = decoded;

        // Continue to endpoint
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = authenticateToken;
