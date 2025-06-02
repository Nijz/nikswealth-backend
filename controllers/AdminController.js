import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';

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

