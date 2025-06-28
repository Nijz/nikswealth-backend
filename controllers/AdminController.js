import Admin from '../models/Admin.js';
import Client from '../models/Client.js';
import Payout from '../models/Payout.js';
import BankDetails from '../models/BankDetails.js';
import Investment from '../models/Investment.js';
import TransactionRequest from '../models/TranscationRequest.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const createAdmin = async (req, res) => {

    try {

        console.log(req.body);
        const { email, password, name, phone } = req.body;

        if (!email || !password || !name || !phone) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const ifAdminExsists = await Admin.findOne({ email });

        if (ifAdminExsists) {
            return res.status(409).json({
                success: false,
                message: "Admin already exists with this email"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await Admin.create({
            email: email,
            password: hashedPassword,
            name: name,
            phone: phone,
            role: 'admin',
        })

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: newAdmin
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error
        })
    }
}

export const loginAdmin = async (req, res) => {

    try {

        const { email, password } = req.body;

        console.log("Login attempt with email:", email);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: `${!email ? "Email" : "Password"} is required`
            });
        }

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        const payload = {
            email: admin.email,
            id: admin._id,
            role: admin.role
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        admin.token = token;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: token
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const createClient = async (req, res) => {

    try {

        const { email, password, name, phone, bankName, accountNumber, ifscCode, bankBranch, amount, date } = req.body;

        if (!email || !password || !name || !phone || !bankName || !accountNumber || !ifscCode || !bankBranch || !amount) {
            return res.status(409).json({
                success: false,
                message: "All fields are required"
            });
        }

        const ifClientExsists = await Client.findOne({ email });

        if (ifClientExsists) {
            return res.status(409).json({
                success: false,
                message: "Client already exists with this email"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newBankDetails = await BankDetails.create({
            bankName: bankName,
            accountNumber: accountNumber,
            bankBranch: bankBranch,
            ifscCode: ifscCode,
        })

        const newClient = await Client.create({
            email: email,
            password: hashedPassword,
            name: name,
            phone: phone,
            role: 'client',
            bankDetails: newBankDetails._id,
            createdAt: date,
        })

        const amountInvested = await Investment.create({
            client: newClient._id,
            amount: amount,
            lockInStartDate: date ? date : new Date(),
            createdAt: date ? date : new Date(),
            updatedAt: date ? date : new Date(),
        })

        newClient.investments.push(amountInvested._id);
        await newClient.save();

        console.log('user-id', req.user.id);
        const adminProfile = await Admin.findById(req.user.id);
        console.log('admin-total-fund before', adminProfile.totalFunds);
        adminProfile.totalFunds = adminProfile.totalFunds + amount;
        console.log('admin-total-fund after', adminProfile.totalFunds);
        await adminProfile.save();

        const payout = await Payout.create({
            client: newClient._id,
            amount: amount,
            payoutType: "credit",
            payoutDate: date ? date : new Date(),
            status: 'completed'
        })

        const clientDetails = await Client.findById(newClient._id)
            .populate('bankDetails')
            .populate('investments')
            .select('-password -token -__v -createdAt -updatedAt -_id -totalInvestment -totalWithdrawn -totalInterest -totalBalance -transactionRequests -statements');


        return res.status(201).json({
            success: true,
            message: "Client created successfully",
            data: clientDetails
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });

    }
}

export const getAllClients = async (req, res) => {
    try {
        const clients = await Client.find()
            .populate('bankDetails')
            .populate({
                path: 'investments'
            })
            .select('-password -token -__v -totalBalance -role')
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({
            success: true,
            message: "All clients fetched successfully",
            data: clients
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getClientById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            });
        }

        const client = await Client.findById(id)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt')

        return res.status(200).json({
            success: true,
            message: "Client fetched successfully",
            data: client
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const clientChangePassword = async (req, res) => {

    try {
        const { email, password, newPassword } = req.body;

        if (!email || !password, !newPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const client = await Client.findOne({ email });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, client.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        client.password = hashedPassword;
        await client.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getAdminProfile = async (req, res) => {
    try {


        const admin = await Admin.findById(req.user.id)
        if (admin.totalFunds < 0) admin.totalFunds = 0;
        if (admin.totalInterest < 0) admin.totalInterest = 0;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Admin profile fetched successfully",
            data: admin
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getTotalFunds = async (req, res) => {

    try {

        const totalFunds = await Investment.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" }
                }
            }
        ]);

        if (totalFunds.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No funds found"
            });
        }

        const admin = await Admin.findById(req.user.id);
        admin.totalFunds = totalFunds[0].totalAmount;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Total funds fetched successfully",
            data: totalFunds[0].totalAmount
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const clientsTotalInvestment = async (req, res) => {

    try {

        const { clientId } = req.params

        const result = await Investment.aggregate([
            {
                $match: { client: new mongoose.Types.ObjectId(clientId) }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" }
                }
            }
        ])

        const totalInvestment = result.length > 0 ? result[0].totalAmount : 0;

        console.log("Total investment:", result);

        const client = await Client.findById(clientId);
        client.totalInvestment = totalInvestment;
        client.updatedAt = new Date();
        await client.save();

        return res.status(200).json({
            success: true,
            message: "Total funds updated successfully",
            data: client.totalInvestment
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const addClientFund = async (req, res) => {
    try {

        const { clientId, amount, date } = req.body;

        if (!clientId || !amount) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const investment = await Investment.create({
            client: clientId,
            amount: amount,
            lockInStartDate: date ? date : new Date(),
            createdAt: date ? date : new Date(),
        })

        const client = await Client.findById(clientId);
        client.investments.push(investment._id);
        await client.save();

        const payout = await Payout.create({
            client: clientId,
            amount: amount,
            payoutType: "credit",
            payoutDate: date ? date : new Date(),
            status: 'completed'
        })

        const admin = await Admin.findById(req.user.id);
        admin.totalFunds += amount;
        await admin.save();

        return res.status(201).json({
            success: true,
            message: "Client fund added successfully",
            data: investment
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getTotalInterest = async (req, res) => {

    try {

        const totalInterest = await Payout.aggregate([
            {
                $match: { payoutType: 'debit' }
            },
            {
                $group: {
                    _id: null,
                    totalInterest: { $sum: "$amount" }
                }
            }
        ]);

        if (totalInterest.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No interest payouts found"
            });
        }

        const admin = await Admin.findById(req.user.id)
        admin.totalInterest = totalInterest[0].totalInterest;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Total interest fetched successfully",
            data: totalInterest[0].totalInterest
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const createPayout = async (req, res) => {

    try {

        const { email, amount, date } = req.body;
        console.log(req.body)

        if (!email || !amount) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const client = await Client.findOne({ email })
        const admin = await Admin.findById(req.user.id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        const newPayout = await Payout.create({
            client: client._id,
            amount: amount,
            payoutType: "debit",
            payoutDate: date ? date : new Date(),
            status: "completed"
        });

        client.totalInterest = client.totalInterest + amount;
        client.updatedAt = new Date();
        await client.save();

        admin.totalInterest = admin.totalInterest + amount;
        await admin.save();

        return res.status(201).json({
            success: true,
            message: "Payout created successfully",
            data: newPayout
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getAllPayouts = async (req, res) => {
    try {

        const { payoutType } = req.body

        const payouts = await Payout.find()
            .where('payoutType')
            .equals(payoutType)
            .populate({
                path: 'client',
                select: '-password -token -__v -createdAt -updatedAt -_id -totalInvestment -totalWithdrawn -totalInterest -totalBalance -transactionRequests -statements -role -bankDetails',
                populate: {
                    path: 'investments',
                    select: '-__v -createdAt -updatedAt -_id -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                }
            })
            .sort({ payoutDate: -1 });


        return res.status(200).json({
            success: true,
            message: "All payouts fetched successfully",
            data: payouts
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getPayoutByStatus = async (req, res) => {

    try {

        const { status } = req.params;

        console.log(status);

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const payouts = await Payout.find()
            .where('status')
            .equals(status)
            .populate({
                path: 'client',
                select: '-password -token -__v -createdAt -updatedAt -_id -totalInvestment -totalWithdrawn -totalInterest -totalBalance -transactionRequests -statements -role -bankDetails',
                populate: {
                    path: 'investments',
                    select: '-__v -createdAt -updatedAt -_id -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        if (payouts.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No payouts found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "All payouts fetched successfully",
            data: payouts
        });


    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const getAllWithdrawalsRequest = async (req, res) => {

    try {

        const { status } = req.params;

        const withdrawalsRequest = await TransactionRequest.find()
            .where('type').equals('withdraw')
            .where('status').equals(status)
            .populate({
                path: 'client',
                select: '-password -token -__v -createdAt -updatedAt -_id -totalBalance -statements -role',
                populate: {
                    path: 'investments',
                    select: '-__v -createdAt -updatedAt -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                }
            })
            .sort({ createdAt: -1 })

        if (withdrawalsRequest.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No withdrawal ${status} requests found`
            });
        }

        return res.status(200).json({
            success: true,
            message: `All ${status} withdrawal requests fetched successfully`,
            data: withdrawalsRequest
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }

}

export const getAllRequests = async (req, res) => {

    try {

        const requests = await TransactionRequest.find()
            .populate({
                path: 'client',
                select: '-password -token -__v -createdAt -updatedAt -_id -totalBalance -statements -role',
                populate: {
                    path: 'investments',
                    select: '-__v -createdAt -updatedAt -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                }
            })
            .sort({ createdAt: -1 })

        return res.status(200).json({
            success: true,
            message: "All requests fetched successfully",
            data: requests
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const approveAddAmountRequest = async (req, res) => {

    try {

        const { clientId } = req.params
        const { amount } = req.body

        if (!clientId || !amount) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const request = await TransactionRequest.findOne({ client: clientId, type: 'add_amount', status: 'pending' })

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            });
        }

        request.amount = amount;
        request.status = 'approved';
        request.respondedAt = new Date();
        await request.save();

        const client = await Client.findById(clientId);
        client.totalInvestment += amount;

        const payout = await Payout.create({
            client: clientId,
            amount: amount,
            payoutType: "credit",
            payoutDate: request.createdAt,
            status: 'completed'
        });

        const investment = await Investment.create({
            client: clientId,
            amount: amount,
            lockInStartDate: request.createdAt,
            isRenewed: false,
            status: 'locked',
            createdAt: request.createdAt,
            updatedAt: request.createdAt,
        })

        client.investments.push(investment._id);
        await client.save();

        return res.status(200).json({
            success: true,
            message: "Add amount request approved",
            data: request
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }

}

export const toggleWithdrawalRequest = async (req, res) => {
    try {

        const { id, status } = req.params;

        if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Request ID is required"
            });
        }

        const request = await TransactionRequest.findById(id);
        const client = await Client.findById(request.client);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "Request is not pending"
            });
        }

        request.status = 'approved';
        request.respondedAt = new Date();
        await request.save();

        if (status === 'approved') {
            const client = await Client.findById(request.client);
            client.totalWithdrawn += request.amount;
            client.totalBalance -= request.amount;
            client.totalInvestment -= request.amount;
            client.investments = client.investments.filter(investment => investment._id === request.investment._id);
            await client.save();
        }

        return res.status(200).json({
            success: true,
            message: `Withdrawal request ${status}`,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

export const deleteClient = async (req, res) => {
    try {

        const { clientId } = req.params;
        console.log(clientId);

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            });
        }

        const client = await Client.findById(clientId);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            });
        }

        const admin = await Admin.findById(req.user.id);

        admin.totalFunds = admin.totalFunds - client.totalInvestment;
        admin.totalInterest = admin.totalInterest - client.totalInterest;
        if (admin.totalFunds < 0) admin.totalFunds = 0;
        if (admin.totalInterest < 0) admin.totalInterest = 0;

        await admin.save();


        if (client.bankDetails) {
            await BankDetails.findByIdAndDelete(client.bankDetails);
        }

        await Payout.deleteMany({ client: clientId })
            ;
        if (client.investments.length > 0) {
            await Investment.deleteMany({ _id: { $in: client.investments } });
        }

        if (client.transactionRequests.length > 0) {
            await TransactionRequest.deleteMany({ _id: { $in: client.transactionRequests } });
        }

        if (client.statements.length > 0) {
            await Payout.deleteMany({ _id: { $in: client.statements } });
        }

        await Client.findByIdAndDelete(clientId);

        return res.status(200).json({
            success: true,
            message: "Client and associated data deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const editClient = async (req, res) => {

    try {

        const { clientId, name, email, phone, password, oldPassword } = req.body;

        console.log(clientId, name, email, phone, password, oldPassword);

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            });
        }

        const client = await Client.findById(clientId);


        if (name !== null && name !== '') {
            client.name = name;
        }


        if (email !== null && email !== '') {
            client.email = email;
        }

        if (phone !== null && phone !== '') {
            client.phone = phone;
        }

        if (password !== null && password !== '' && oldPassword !== null && oldPassword !== '') {

            const isPasswordValid = await bcrypt.compare(oldPassword, client.password);


            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid password"
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            client.password = hashedPassword;
        }


        await client.save();

        return res.status(200).json({
            success: true,
            message: "Client updated successfully",
            data: client
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }

}

export const updateBankDetails = async (req, res) => {
    try {

        const { clientId } = req.params;
        const { bankName, accountNumber, bankBranch, ifscCode } = req.body;

        if (!clientId) {
            return res.status(400).json({ success: false, message: "Client ID is required" });
        }


        const client = await Client.findById(clientId);
        const bank = await BankDetails.findById(client.bankDetails);

        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }


        if (bankName !== null && bankName !== '') {
            bank.bankName = bankName;
            client.bankDetails.bankName = bankName;
        }


        if (accountNumber !== null && accountNumber !== '') {
            bank.accountNumber = accountNumber;
            client.bankDetails.accountNumber = accountNumber;
        }


        if (bankBranch !== null && bankBranch !== '') {
            bank.bankBranch = bankBranch;
            client.bankDetails.bankBranch = bankBranch;
        }


        if (ifscCode !== null && ifscCode !== '') {
            bank.ifscCode = ifscCode;
            client.bankDetails.ifscCode = ifscCode;
        }

        await bank.save();
        await client.save();
        console.log('Client', client);
        console.log('Bank', bank);

        const updatedClient = await Client.findById(clientId)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt')



        return res.status(200).json({
            success: true,
            message: "Bank details updated successfully",
            data: updatedClient
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const searchClient = async (req, res) => {
    try {

        console.log(req.body);
        const { name } = req.body;

        let query = {};
        if (name) {
            query.name = { $regex: name, $options: 'i' };
        }

        console.log(query);

        if (Object.keys(query).length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one of 'name' or 'email' must be provided for search."
            });
        }

        const clients = await Client.find(query)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt');

        console.log(clients);
        return res.status(200).json({
            success: true,
            message: `${clients.length} client(s) found.`,
            data: clients
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const withDrawFund = async (req, res) => {
    try {
        const { clientId, investmentId } = req.body;

        if (!clientId || !investmentId) {
            return res.status(400).json({
                success: false,
                message: "Client ID and Investment ID are required."
            });
        }

        // Fetch all needed data in parallel
        const [client, investment, admin] = await Promise.all([
            Client.findById(clientId),
            Investment.findById(investmentId),
            Admin.findById(req.user.id)
        ]);

        // Validate data existence
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        if (!investment) {
            return res.status(404).json({ success: false, message: "Investment not found." });
        }

        // Check investment unlock status
        if (investment.status === 'locked') {
            return res.status(400).json({
                success: false,
                message: `${investment.amount} is not yet unlocked for withdrawal.`
            });
        }

        // Update admin funds and create payout
        admin.totalFunds -= investment.amount;
        client.totalWithdrawn += investment.amount;
        client.totalInvestment -= investment.amount;

        await Payout.create({
            client: clientId,
            amount: investment.amount,
            payoutType: 'debit',
            payoutDate: new Date(),
            status: 'completed'
        });

        // Delete investment and save changes
        const [_, __] = await Promise.all([
            admin.save(),
            client.save(),
            Investment.findByIdAndDelete(investmentId)
        ]);

        // Fetch updated client info
        const updatedClient = await Client.findById(clientId)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt');

        return res.status(200).json({
            success: true,
            message: "Fund withdrawn successfully.",
            data: updatedClient
        });

    } catch (error) {
        console.error('❌ Withdraw Fund Error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message
        });
    }
};
