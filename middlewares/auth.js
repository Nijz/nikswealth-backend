import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const auth = (req, res, next) => {

    try {
        
        const token = req.body.token || req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required"
            });
        }

        try {
            
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decode;

        } catch (error) {
            
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });

        }

        next();

    } catch (error) {
        
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const isAdmin = (req, res, next) => {

    try {
        
        if(req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied, admin role required"
            });
        }

        next();

    } catch (error) {
        
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const isClient = (req, res, next) => {

    try {
        
        if(req.user.role !== 'client') {
            return res.status(403).json({
                success: false,
                message: "Access denied, client role required"
            });
        }

        next();

    } catch (error) {
        
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}