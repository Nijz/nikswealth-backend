import express from "express";
import { connectDb } from "./config/database.js";
import dotenv from "dotenv";
dotenv.config();


const app = express();
const PORT = process.env.PORT || 4000;

// Connect to the database
connectDb();

// deafult 
app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Your server is up and running..."
    })
})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})