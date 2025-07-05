import Client from "../models/Client.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Payout from "../models/Payout.js";

export const clientLogin = async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }

        const client = await Client.findOne({ email });

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            })
        }

        const isPasswordValid = await bcrypt.compare(password, client.password)

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            })
        }

        const payload = {
            email: client.email,
            id: client._id,
            role: client.role
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: token
        })

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}

export const getClientData = async (req, res) => {

    try {

        const client = await Client.findById(req.user.id)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-token -__v -createdAt -updatedAt')

        if (client.totalInvestment < 0) client.totalInvestment = 0;
        if (client.totalInterest < 0) client.totalInterest = 0;
        if (client.totalWithdrawn < 0) client.totalWithdrawn = 0;
        if (client.totalBalance < 0) client.totalBalance = 0;

        await client.save();

        return res.status(200).json({
            success: true,
            message: "Client fetched successfully",
            data: client
        })

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}

export const updateClientProfile = async (req, res) => {

    try {

        const { name, phone, email, id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            })
        }

        const client = await Client.findById(id)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt')

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            })
        }

        if (name != null && name !== '') {
            client.name = name;
        }

        if (phone != null && phone !== '') {
            client.phone = phone;
        }

        if (email != null && email !== '') {
            client.email = email;
        }

        await client.save();

        return res.status(200).json({
            success: true,
            message: "Client updated successfully",
            data: client
        })

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }

}

export const updateBankDetails = async (req, res) => {

    try {

        const { clientId, bankName, accountNumber, bankBranch, ifscCode } = req.body;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            })
        }

        const client = await Client.findById(clientId);
        const bank = await BankDetails.findById(client.bankDetails);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            })
        }


        if (bankName != null && bankName !== '') {
            bank.bankName = bankName;
            client.bankDetails.bankName = bankName;
        }


        if (accountNumber != null && accountNumber !== '') {
            bank.accountNumber = accountNumber;
            client.bankDetails.accountNumber = accountNumber;
        }


        if (bankBranch != null && bankBranch !== '') {
            bank.bankBranch = bankBranch;
            client.bankDetails.bankBranch = bankBranch;
        }


        if (ifscCode != null && ifscCode !== '') {
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
        })

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}

export const getClientPayouts = async (req, res) => {

    try {

        const { clientId, payoutType } = req.params;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            })
        }

        const client = await Client.findById(clientId)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt')

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            })
        }

        if (payoutType === 'credit' || payoutType === 'debit') {
            const payouts = await Payout.find({ client: clientId, payoutType: payoutType })
                .populate({
                    path: 'client',
                    select: '-password -token -__v -createdAt -updatedAt -_id -totalInvestment -totalWithdrawn -totalInterest -totalBalance -statements -role -bankDetails',
                    populate: {
                        path: 'investments',
                        select: '-__v -createdAt -updatedAt -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                    }
                })
                .sort({ payoutDate: -1 });

            return res.status(200).json({
                success: true,
                message: `${payoutType} payouts fetched successfully`,
                data: payouts
            })

        } else {

            const payouts = await Payout.find({ client: clientId })
                .populate({
                    path: 'client',
                    select: '-password -token -__v -createdAt -updatedAt -_id -totalInvestment -totalWithdrawn -totalInterest -totalBalance -statements -role -bankDetails',
                    populate: {
                        path: 'investments',
                        select: '-__v -createdAt -updatedAt -client -lockInStartDate -lockInEndDate -isRenewed -renewedOn'
                    }
                })
                .sort({ payoutDate: -1 });

            return res.status(200).json({
                success: true,
                message: "All payouts fetched successfully",
                data: payouts
            })
        }

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }

}