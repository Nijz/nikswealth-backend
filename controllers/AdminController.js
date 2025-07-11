import Admin from '../models/Admin.js';
import Client from '../models/Client.js';
import Payout from '../models/Payout.js';
import BankDetails from '../models/BankDetails.js';
import Investment from '../models/Investment.js';
import TransactionRequest from '../models/TranscationRequest.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';

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

        const newAdmin = await Admin.create({
            email: email,
            password: password,
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

        const isPasswordValid = password === admin.password;

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

export const updateAdminProfile = async (req, res) => {

    try {

        const { name, phone, email, password, oldPassword } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        const admin = await Admin.findById(req.user.id)

        if (name !== null && name !== '') {
            admin.name = name;
        }

        if (phone !== null && phone !== '') {
            admin.phone = phone;
        }

        if (email !== null && email !== '') {
            admin.email = email;
        }

        if (password !== null && password !== '' && oldPassword !== null && oldPassword !== '') {

            if (oldPassword !== admin.password) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid old password"
                });
            }

            admin.password = password;
        }

        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Admin profile updated successfully",
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

export const createClient = async (req, res) => {

    try {

        const { email, password, name, phone, bankName, accountNumber, ifscCode, bankBranch, amount, date, lockDate, refNo } = req.body;

        const istDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).startOf('day').toISO()
        const lock = DateTime.fromISO(lockDate, { zone: 'Asia/Kolkata' }).startOf('day').toISO()

        if (!email || !password || !name || !phone || !bankName || !accountNumber || !ifscCode || !bankBranch || !amount || !refNo) {
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

        const newBankDetails = await BankDetails.create({
            bankName: bankName,
            accountNumber: accountNumber,
            bankBranch: bankBranch,
            ifscCode: ifscCode,
        })

        const newClient = await Client.create({
            email: email,
            password: password,
            name: name,
            phone: phone,
            role: 'client',
            bankDetails: newBankDetails._id,
            createdAt: istDate,
        })

        const amountInvested = await Investment.create({
            client: newClient._id,
            amount: amount,
            lockInStartDate: istDate,
            lockInEndDate: lock,
            createdAt: istDate,
            updatedAt: istDate,
        })

        newClient.investments.push(amountInvested._id);
        await newClient.save();


        const adminProfile = await Admin.findById(req.user.id);
        adminProfile.totalFunds = adminProfile.totalFunds + amount;
        await adminProfile.save();

        const payout = await Payout.create({
            client: newClient._id,
            amount: amount,
            reference: refNo,
            payoutType: "credit",
            clientPayoutType: "debit",
            payoutDate: istDate,
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
            .select('-token -__v -totalBalance -role')
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
            .select('-token -__v -createdAt -updatedAt')

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
        const { email, newPassword } = req.body;

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

        client.password = newPassword;
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

        const { clientId, amount, date, lockDate, refNo } = req.body;
        console.log(
            "data: ",
            clientId,
            amount,
            date,
            lockDate
        );
        const istDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).startOf('day').toISO()
        const lock = DateTime.fromISO(lockDate, { zone: 'Asia/Kolkata' }).startOf('day').toISO()

        if (!clientId || !amount) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const investment = await Investment.create({
            client: clientId,
            amount: amount,
            lockInStartDate: date ? istDate : new Date(),
            createdAt: date ? istDate : new Date(),
            lockInEndDate: lock,
        })

        const client = await Client.findById(clientId);
        const admin = await Admin.findById(req.user.id);

        const payout = await Payout.create({
            client: client._id,
            amount: amount,
            reference: refNo,
            payoutType: "credit",
            clientPayoutType: "debit",
            payoutDate: istDate,
        })

        client.investments.push(investment._id);
        admin.totalFunds += amount;
        await admin.save();
        await client.save();

        return res.status(201).json({
            success: true,
            message: "Client fund added successfully",
            data: investment
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
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

        const { name, amount, date, refNo } = req.body;
        const istDate = DateTime.fromISO(date, { zone: 'Asia/Kolkata' }).startOf('day').toISO()

        if (!name || !amount) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const client = await Client.findOne({ name })
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
            reference: refNo,
            payoutType: "return",
            clientPayoutType: "return",
            payoutDate: istDate
        });

        client.totalInterest = client.totalInterest + amount;
        client.updatedAt = new Date();
        admin.totalInterest = admin.totalInterest + amount;

        await admin.save();
        await client.save();

        return res.status(201).json({
            success: true,
            message: "Payout created successfully",
            data: newPayout
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
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
        const { clientId, investmentId, reference } = req.body;

        console.log("Pass-1");
        if (!clientId || !investmentId) {
            return res.status(400).json({
                success: false,
                message: "Client ID and Investment ID are required."
            });
        }

        console.log("Pass-2");
        // Fetch all needed data in parallel
        const [client, investment, admin] = await Promise.all([
            Client.findById(clientId),
            Investment.findById(investmentId),
            Admin.findById(req.user.id)
        ]);

        console.log("Pass-3");
        // Validate data existence
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        console.log("Pass-4");
        if (!investment) {
            return res.status(404).json({ success: false, message: "Investment not found." });
        }

        console.log("Pass-5");
        // Check investment unlock status
        if (investment.status === 'locked') {
            return res.status(400).json({
                success: false,
                message: `${investment.amount} is not yet unlocked for withdrawal.`
            });
        }

        console.log("Pass-6");
        // Update admin funds and create payout
        admin.totalFunds -= investment.amount;
        client.totalWithdrawn += investment.amount;
        client.totalInvestment -= investment.amount;

        console.log("Pass-7");
        await Payout.create({
            client: clientId,
            amount: investment.amount,
            reference: reference,
            payoutType: 'debit',
            clientPayoutType: 'withdraw',
            payoutDate: new Date(),
        });

        console.log("Pass-8");
        // Delete investment and save changes
        const [_, __] = await Promise.all([
            admin.save(),
            client.save(),
            Investment.findByIdAndDelete(investmentId)
        ]);

        console.log("Pass-9");
        // Fetch updated client info
        const updatedClient = await Client.findById(clientId)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt');

        console.log("Pass-10");
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

export const getPayoutByClientId = async (req, res) => {
    try {

        const { clientId } = req.params;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            });
        }

        const payouts = await Payout.find({ client: clientId })
            .populate({
                path: 'client',
                select: '-password -token -__v -createdAt -updatedAt -_id -totalInvestment -totalWithdrawn -totalInterest -totalBalance -transactionRequests -statements -role -bankDetails',
                populate: {
                    path: 'investments',
                    select: '-__v -createdAt -updatedAt -_id -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                }
            })
            .sort({ createdAt: -1 })


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
export const renewInvestment = async (req, res) => {
    try {
        const { investmentId, clientId } = req.body;

        if (!investmentId || !clientId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const [user, investment, admin] = await Promise.all([
            Client.findById(clientId),
            Investment.findById(investmentId),
            Admin.findById(req.user.id)
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!investment) {
            return res.status(404).json({
                success: false,
                message: "Investment not found"
            });
        }

        const today = new Date();
        const lockInEndDate = new Date(today);
        lockInEndDate.setDate(lockInEndDate.getDate() + 365);

        investment.isRenewed = true;
        investment.renewedOn = today;
        investment.lockInStartDate = today;
        investment.status = 'locked';
        investment.lockInEndDate = lockInEndDate;

        await Promise.all([
            admin.save(),
            user.save(),
            investment.save()
        ]);

        return res.status(200).json({
            success: true,
            message: "Investment renewed successfully",
            data: investment
        });

    } catch (error) {
        console.error("Renew Investment Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
