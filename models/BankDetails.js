import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema({

    bankName : {
        type: String,
        required: true,
        trim: true,
    },

    accountNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },

    bankBranch: {
        type: String,
        required: true,
        trim: true,
    },

    ifscCode: {
        type: String,
        required: true,
        trim: true,
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

export default mongoose.model('BankDetails', bankDetailsSchema);