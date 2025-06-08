import mongoose from 'mongoose';

const transactionRequestSchema = new mongoose.Schema({
    
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },

    type: {
        type: String,
        enum: ['add_amount', 'withdraw'],
        required: true,
    },

    amount: {
        type: Number,
        required: true,
    },

    // Which investment is this withdrawal request for? (only needed for withdraw)
    investment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investment',
    },

    reason: {
        type: String, // optional - for withdrawal requests
    },

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },

    requestedAt: {
        type: Date,
        default: Date.now,
    },

    respondedAt: {
        type: Date,
    },

    adminNote: {
        type: String, // for approval/rejection remarks
    }

});

export default mongoose.model('TransactionRequest', transactionRequestSchema);
