import { type NextFunction, type Request, type Response } from 'express'
import helper from '../utils/helpers'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import axios from 'axios'
const prisma = new PrismaClient()

const empDashboardDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const storeId = user.storeId;
    try {
        const stores = await prisma.store.findMany({
            where: { id: storeId },
        });
        const employees = await prisma.employee.findMany({
            where: { storeId },
        });
        const bookings = await prisma.booking.findMany({
            where: { storeId },
        });
        const packages = await prisma.package.findMany();
        return res.status(200).send({ valid: true, stores: stores.length, employees: employees.length, bookings: bookings.length, packages: packages.length });
    } catch (err) {
        return next(err);
    }
}

const getBookings = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        console.log(req.user.storeId, 'o');
        
        const storeId = req.user.storeId
        if(!storeId) return res.status(200).send({ status: 400, error: 'Store not found.', error_description: 'Store does not exist' })
        const bookings = await prisma.booking.findMany({where: {storeId}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
        return res.status(200).send({ valid: true, bookings })
    } catch (err) {
        return next(err)
    }
}

const empCreateBooking = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { packageId, storeId, customerId, bookingType, overs, price } = req.body;
        const isValidPayload = helper.isValidatePaylod(req.body, ['storeId', 'customerId', 'bookingType']);
        if(!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'storeId, customerId, bookingType are required.' });
        }
        const customer = await prisma.customer.findUnique({where: {id: parseInt(customerId)}})
        if(!customer) {
            return res.send({ valid: false, error: 'Customer not found.', error_description: 'Customer does not exist' })
        }
        const store = await prisma.store.findUnique({where: {id: parseInt(storeId)}})
        if(!store) {
            return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
        }
        if(bookingType === 'Package') {
            const packagee = await prisma.package.findUnique({where: {id: parseInt(packageId)}})
            if(!packagee) {
                return res.send({ valid: false, error: 'Package not found.', error_description: 'Package does not exist' })
            }
            const packageBooking = await prisma.booking.create({
                data: {
                    storeId: parseInt(storeId),
                    customerId: parseInt(customerId),
                    bookingType: 'Package',
                    packageId: parseInt(packageId),
                    price: packagee.price,
                    overs: packagee.overs,
                    oversLeft: packagee.overs
                }
            })
            return res.send({ valid: true, booking: packageBooking })
        }
        if(bookingType === 'Custom') {
            if(!price) {
                return res.send({ status: 400, error: 'Invalid payload', error_description: 'price is required.' });
            }
            if(isNaN(Number(price))) {
                return res.send({ status: 400, error: 'Invalid payload', error_description: 'price must be a integer.' });
            }
            if(!overs) {
                return res.send({ status: 400, error: 'Invalid payload', error_description: 'overs is required.' });
            }
            if(isNaN(Number(overs))) {
                return res.send({ status: 400, error: 'Invalid payload', error_description: 'overs must be a integer.' });
            }
            const customBooking = await prisma.booking.create({
                data: {
                    storeId: parseInt(storeId),
                    customerId: parseInt(customerId),
                    bookingType: 'Custom',
                    price: parseInt(price),
                    overs: parseInt(overs),
                    oversLeft: parseInt(overs)
                }
            })
            return res.send({ valid: true, booking: customBooking })
        }
        return res.send({ valid: false, message: "Failed to create booking" })
    } catch (err) {
        console.log(err);
        return next(err);
    }
};

const getBookingsByStatusEmp = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { status } = req.params
        const storeId = req.user.storeId
        if(status !== '0' && status !== '1') {
            return res.send({ valid: false, error: 'Invalid status', error_description: 'Status must be PENDING, COMPLETED or CANCELLED' })
        }
        if(status === '0') {
            const bookings = await prisma.booking.findMany({where: {status: 'PENDING', storeId}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }else if(status === '1') {
            const bookings = await prisma.booking.findMany({where: {status: 'COMPLETED', storeId}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }else{
            const bookings = await prisma.booking.findMany({where: {storeId},orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }
    } catch (err) {
        return next(err)
    }
}

const updateBookingEmp = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { playedOvers } = req.body;
        const isValidPayload = helper.isValidatePaylod(req.body, ['playedOvers']);
        if (!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'playedOvers is required.' });
        }
        if (isNaN(Number(playedOvers))) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'playedOvers must be a integer.' });
        }
        const bookingExist = await prisma.booking.findUnique({ where: { id: parseInt(id), storeId: req.user.storeId } });
        if (!bookingExist) {
            return res.send({ status: 400, error: 'Booking not found.', error_description: 'Booking does not exist' });
        }
        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: {
                lastPlayedDate: new Date(),
                oversLeft: {
                    decrement: parseInt(playedOvers)
                }
            },
        });
        const customerId = booking.customerId;
        const storeId = booking.storeId;
        const bookingLog = await prisma.bookingOvers.create({
            data: {
                bookingId: parseInt(id),
                overs: parseInt(playedOvers),
                employeeId: req.user.id,
                storeId: storeId,
                customerId: customerId
            }
        })
        const updatedBooking = await prisma.booking.findUnique({where: {id: parseInt(id)}});
        if(updatedBooking?.oversLeft === 0) {
            await prisma.booking.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'COMPLETED'
                }
            });
        }
        return res.send({ valid: true, booking });
    } catch (err) {
        return next(err);
    }
}

const getBookingByIdEmp = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique(
            { where: { id: parseInt(id), storeId: req.user.storeId }, include: {store: true, customer: true, package: true} },
        );
        if (!booking) {
            return res.send({ status: 400, error: 'Booking not found.', error_description: 'Booking does not exist' });
        }
        return res.send({ valid: true, booking });
    } catch (err) {
        return next(err);
    }
}

const getBookingLogsStore = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const bookingLogs = await prisma.bookingOvers.findMany({
            where: {booking: {store: {id: req.user.storeId}}},
            include: {booking: {include: {store: {select: {name: true}}, customer: {select: {name: true, email: true}}}}, employee: {select: {name: true, email: true}}},
            orderBy: {createdAt: 'desc'}
        });
        return res.send({ valid: true, bookingLogs });
    } catch (err) {
        return next(err);
    }
}

const empController = {
    empDashboardDetails,
    getBookings,
    empCreateBooking,
    getBookingsByStatusEmp,
    updateBookingEmp,
    getBookingByIdEmp,
    getBookingLogsStore
}

export default empController