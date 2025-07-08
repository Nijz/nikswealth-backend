import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({

    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },

    amount: {
        type: Number,
        required: true,
        min: 0,
    },

    reference: {
        type: String,
        required: true,
        trim: true,
    },

    payoutType: {
        type: String,
        enum: ['credit', 'debit', 'return'],
        required: true,
    },

    clientPayoutType: {
        type: String,
        enum: ['credit', 'withdraw', 'return'],
        required: true,
    },

    payoutDate: {
        type: Date,
    },

})

export default mongoose.model('Payout', payoutSchema);