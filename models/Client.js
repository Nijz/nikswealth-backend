import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({

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
        trim: true,
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

    role: {
        type: String,
        enum: ['admin', 'client'],
        default: 'client',
        required: true,
    },

    bankDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankDetails',
        required: true,
    },

    investments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Investment',
        }
    ],

    totalInvestment: {
        type: Number,
        default: 0,
    },

    totalInterest: {
        type: Number,
        default: 0,
    },

    totalWithdrawn: {
        type: Number,
        default: 0,
    },

    totalBalance: {
        type: Number,
        default: 0,
    },

    transactionRequests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TransactionRequest',
        }
    ],

    statements: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payout',
        }
    ],

    token: {
        type: String,
        default: null,
    },

    createdAt: {
        type: Date,
    },

    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

export default mongoose.model('Client', clientSchema);