import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        primary: true,
    },

    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false, // Exclude password from queries by default
    },

    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
    },

    phone: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
    },

    totalFunds: {
        type: Number,
        default: 0,
    },

    totalInterest: {
        type: Number,
        default: 0,
    },

    role: {
        type: String,
        enum: ['admin', 'client'],
        default: 'admin',
        required: true,
    },

    token: {
        type: String,
        default: null,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },

    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

export default mongoose.model('Admin', adminSchema);