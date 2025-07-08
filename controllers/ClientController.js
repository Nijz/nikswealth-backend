import Client from "../models/Client.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Payout from "../models/Payout.js";
import PDFDocument from 'pdfkit';
import moment from 'moment';

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

        const isPasswordValid = client.password === password;

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

        const clientId = req.user.id;
        const { clientPayoutType } = req.params;

        console.log("Pass-1", clientId);
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required"
            })
        }

        console.log("Pass-2");
        const client = await Client.findById(clientId)
            .populate('bankDetails')
            .populate({
                path: 'investments',
                options: { sort: { createdAt: -1 } }
            })
            .select('-password -token -__v -createdAt -updatedAt')

        console.log("Pass-3");
        if (!client) {
            return res.status(404).json({
                success: false,
                message: "Client not found"
            })
        }

        console.log("Pass-4");
        if (clientPayoutType === 'all') {
            const payouts = await Payout.find({ client: clientId })
            return res.status(200).json({
                success: true,
                message: "All payouts fetched successfully",
                data: payouts
            })
        } else {
            const payouts = await Payout.find({ client: clientId, clientPayoutType: clientPayoutType })
            return res.status(200).json({
                success: true,
                message: `${clientPayoutType} payouts fetched successfully`,
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

export const downloadStatementsPdf = async (req, res) => {
    // routes/statement.js
    try {
        const { clientId, startDate, endDate } = req.params;

        const client = await Client.findById(clientId).populate('bankDetails');
        if (!client) return res.status(404).json({ message: 'Client not found' });

        const payouts = await Payout.find({
            client: clientId,
            payoutDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            },
            status: 'completed',
        }).sort({ payoutDate: -1 });

        // Total calculations
        const totalInvested = payouts.filter(p => p.payoutType === 'credit').reduce((sum, p) => sum + p.amount, 0);
        const totalWithdrawn = payouts.filter(p => p.payoutType === 'debit').reduce((sum, p) => sum + p.amount, 0);
        const totalInterest = client.totalInterest || 0;

        // Start PDF
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${client.name}_statement.pdf`);
            res.send(pdfData);
        });

        // Header
        doc.fontSize(22).text('Reset Wealth', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).text('Client Statement', { align: 'center' });
        doc.moveDown(1.5);

        // Client Info
        doc.fontSize(12);
        doc.text(`Client ID: ${client._id}`);
        doc.text(`Name: ${client.name}`);
        doc.text(`Email: ${client.email}`);
        doc.text(`Phone: ${client.phone}`);
        doc.moveDown(0.5);

        // Bank Info
        doc.fontSize(12).text('Bank Details:');
        doc.text(`Bank Name: ${client.bankDetails?.bankName || 'N/A'}`);
        doc.text(`IFSC Code: ${client.bankDetails?.ifscCode || 'N/A'}`);
        doc.text(`Account Number: ${client.bankDetails?.accountNumber || 'N/A'}`);
        doc.moveDown(1);

        // Summary
        doc.fontSize(12).text('Statement Summary:', { underline: true });
        doc.text(`Total Investment: ₹${totalInvested}`);
        doc.text(`Total Withdrawn: ₹${totalWithdrawn}`);
        doc.text(`Total Interest Earned: ₹${totalInterest}`);
        doc.moveDown(1);

        // Statement Table Header
        doc.font('Helvetica-Bold');
        doc.text('Date', 50, doc.y, { width: 90 });
        doc.text('Reference No', 140, doc.y, { width: 140 });
        doc.text('Credit (₹)', 280, doc.y, { width: 80 });
        doc.text('Return (₹)', 360, doc.y, { width: 80 });
        doc.text('Withdraw (₹)', 440, doc.y, { width: 80 });
        doc.moveDown(0.5);
        doc.font('Helvetica');

        payouts.forEach(p => {
            const date = moment(p.payoutDate).format('DD/MM/YYYY');
            const reference = p.reference;
            const credit = p.payoutType === 'credit' ? p.amount.toFixed(2) : '';
            const debit = p.payoutType === 'debit' ? p.amount.toFixed(2) : '';
            const ret = ''; // Use return logic if applicable

            doc.text(date, 50, doc.y, { width: 90 });
            doc.text(reference, 140, doc.y, { width: 140 });
            doc.text(credit, 280, doc.y, { width: 80 });
            doc.text(ret, 360, doc.y, { width: 80 });
            doc.text(debit, 440, doc.y, { width: 80 });
            doc.moveDown(0.5);
        });

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).text(`Generated on ${moment().format('DD MMMM YYYY, hh:mm A')}`, { align: 'right' });

        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}