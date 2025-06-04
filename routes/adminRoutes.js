import express from 'express';
import { createAdmin, loginAdmin, createClient, getAllClients, getClientById, clientChangePassword, getAdminProfile, getTotalFunds, getTotalInterest, createPayout, getAllPayouts, getPayoutByStatus } from '../controllers/AdminController.js';
import { auth, isAdmin, isClient } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', createAdmin)
router.post('/login' ,loginAdmin)
router.post('/create-client', auth, isAdmin, createClient)
router.get('/clients', auth, isAdmin, getAllClients);
router.get('/client/:id', auth, isAdmin, getClientById);
router.post('/client/change-password', auth, isAdmin, clientChangePassword);
router.get('/profile', auth, isAdmin, getAdminProfile);
router.get('/total-funds', auth, isAdmin, getTotalFunds);
router.get('/total-interest', auth, isAdmin, getTotalInterest);
router.post('/create-payout', auth, isAdmin, createPayout);
router.get('/payouts', auth, isAdmin, getAllPayouts);
router.get('/payouts/status/:status', auth, isAdmin, getPayoutByStatus);


export default router;

