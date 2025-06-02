import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export const connectDb = () => {

    mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Database connected successfully ✅');
    })
    .catch((error) => {
        console.error('Database connection failed ❌', error);
        process.exit(1); 
    })
}

