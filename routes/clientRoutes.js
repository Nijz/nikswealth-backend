import express from 'express';
import { clientLogin, getClientData, getClientPayouts } from '../controllers/ClientController.js';
import { auth, isClient } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', clientLogin)
router.get('/profile', auth, isClient, getClientData)
router.get('/payouts/:clientPayoutType', auth, isClient, getClientPayouts)


export default router;