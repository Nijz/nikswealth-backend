import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const createAdmin = async (req, res) => {

    try {
        
        const { email, password, name, phone } = req.body;

        if (!email || !password || !name || !phone) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const ifAdminExsists = await Admin.findOne({email});

        if (ifAdminExsists) {
            return res.status(409).json({
                success: false,
                message: "Admin already exists with this email"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await Admin.create({
            email: email,
            password: hashedPassword,
            name: name,
            phone: phone,
            role: 'admin',  
        })

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            admin: {
                id: newAdmin._id,
                email: newAdmin.email,
                name: newAdmin.name,
                phone: newAdmin.phone,
                role: newAdmin.role,
            }
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error
        })
        
    }
}

export const loginAdmin = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        const payload = {
            email: admin.email,
            id: admin._id,
            role: admin.role,
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        admin.token = token;
        await admin.save();

        const adminData = await Admin.findOne({ email });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: adminData
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

