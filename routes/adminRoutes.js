import express from 'express';
import { createAdmin, loginAdmin, createClient, getAllClients, getClientById, clientChangePassword, getAdminProfile, getTotalFunds, getTotalInterest, createPayout, getAllPayouts, getPayoutByStatus, clientsTotalInvestment, addClientFund, deleteClient, editClient, updateBankDetails, searchClient, withDrawFund, getPayoutByClientId, updateAdminProfile } from '../controllers/AdminController.js';
import { auth, isAdmin, isClient } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create', createAdmin)
router.post('/login', loginAdmin)
router.put('/update', auth, isAdmin, updateAdminProfile)

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
router.put('/client/fund/add', auth, isAdmin, addClientFund);

router.delete('/client/delete/:clientId', auth, isAdmin, deleteClient)
router.put('/client/update', auth, isAdmin, editClient)
router.put('/client/update/bank-details/:clientId', auth, isAdmin, updateBankDetails)
router.post('/search/clients', auth, isAdmin, searchClient)
router.put('/withdraw/client/fund', auth, isAdmin, withDrawFund)
router.get('/payouts/client/:clientId', auth, isAdmin, getPayoutByClientId)

export default router;

