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
            bankDetails: newBankDetails._id,
            createdAt: date,
        })

        const amountInvested = await Investment.create({
            client: newClient._id,
            amount: amount,
        })

        newClient.investments.push(amountInvested._id);
        await newClient.save();

        const adminProfile = await Admin.findById(req.user.id);
        adminProfile.totalFunds = adminProfile.totalFunds + amount;
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
            .populate()
            .select('-password -token -__v -createdAt -updatedAt -_id')
            .lean();

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
            .select('-password -token -__v -createdAt -updatedAt -_id')
            .lean();

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

        const { clientId, amount } = req.body;

        if (!clientId || !amount) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const investment = await Investment.create({
            client: clientId,
            amount: amount
        })

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
                select: '-password -token -__v -createdAt -updatedAt -_id -totalInvestment -totalWithdrawn -totalInterest -totalBalance -transactionRequests -statements -role -bankDetails',
                populate: {
                    path: 'investments',
                    select: '-__v -createdAt -updatedAt -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

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
