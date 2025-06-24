import express from "express";
import { connectDb } from "./config/database.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import adminRoutes from "./routes/adminRoutes.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to the database
connectDb();

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

app.use("/api/v1/admin/", adminRoutes)

// deafult 
app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Your server is up and running..."
    })
})


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port 0.0.0.0 ${PORT}`);
})