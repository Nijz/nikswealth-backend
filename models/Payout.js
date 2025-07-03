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
        enum: ['credit', 'debit'],
        default: 'credit',
        required: true,
    },

    payoutDate: {
        type: Date,
        // make sure to set the timezone to +05:30 for the date (IST)
    },

    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    },

})

export default mongoose.model('Payout', payoutSchema);