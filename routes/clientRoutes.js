import express from 'express';
import { changePassword, clientLogin, getClientData, getClientPayouts, updateBankDetails, updateClientProfile } from '../controllers/ClientController.js';
import { auth, isClient } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', clientLogin)
router.get('/profile', auth, isClient, getClientData)
router.get('/payouts/:clientPayoutType', auth, isClient, getClientPayouts)
router.put('/change-password', auth, isClient, changePassword)
router.put('/update/bank-details', auth, isClient, updateBankDetails)
router.put('/update', auth, isClient, updateClientProfile)

export default router;