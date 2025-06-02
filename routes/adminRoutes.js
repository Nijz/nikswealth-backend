import express from 'express';
import { createAdmin, loginAdmin } from '../controllers/AdminController.js';
import { auth, isAdmin, isClient } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', createAdmin)
router.post('/login' ,loginAdmin)

export default router;

