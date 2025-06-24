import express from 'express';
import { createAdmin, loginAdmin, createClient, getAllClients, getClientById, clientChangePassword, getAdminProfile, getTotalFunds, getTotalInterest, createPayout, getAllPayouts, getPayoutByStatus, getAllWithdrawalsRequest, toggleWithdrawalRequest, clientsTotalInvestment, addClientFund } from '../controllers/AdminController.js';
import { auth, isAdmin, isClient } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', createAdmin)
router.post('/login', loginAdmin)
router.post('/create-client', auth, isAdmin, createClient)
router.get('/clients', auth, isAdmin, getAllClients);
router.get('/client/:id', auth, isAdmin, getClientById);
router.put('/client/change-password', auth, isAdmin, clientChangePassword);
router.get('/profile', auth, isAdmin, getAdminProfile);
router.get('/total-funds', auth, isAdmin, getTotalFunds);
router.get('/total-interest', auth, isAdmin, getTotalInterest);
router.get('/client/total-investment/:clientId', auth, isAdmin, clientsTotalInvestment);
router.post('/create-payout', auth, isAdmin, createPayout);
router.post('/payouts', auth, isAdmin, getAllPayouts);
router.get('/payouts/status/:status', auth, isAdmin, getPayoutByStatus);
router.get('/withdrawal/requests/:status', auth, isAdmin, getAllWithdrawalsRequest);
router.put('/withdrawal/request/:id/:status', auth, isAdmin, toggleWithdrawalRequest);
router.put('/client/fund/add', auth, isAdmin, addClientFund);

export default router;

