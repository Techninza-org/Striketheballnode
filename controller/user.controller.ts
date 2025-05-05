import { type NextFunction, type Request, type Response } from 'express'
import helper from '../utils/helpers'
import { PrismaClient } from '@prisma/client'
import { ExtendedRequest } from '../utils/middleware'
const prisma = new PrismaClient()

const getProfile = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        if (!user) {
            return res.status(200).send({ valid: false, message: 'User not found' })
        }
        return res.status(200).send({ valid: true, message: 'User fetched successfully', data: user })
    } catch (err) {
        return next(err)
    }
}

const updateProfile = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        if (!user) {
            return res.status(200).send({ valid: false, message: 'User not found' })
        }
       const {profile, name} = req.body
       const updatedUser = await prisma.customer.update({
            where: {
                id: user.id,
            },
            data: {
                profile: profile,
                name: name
            }
       })
       
        return res.status(200).send({ valid: true, message: 'Profile updated successfully', data: updatedUser })
    } catch (err) {
        return next(err)
    }
}

const trendingPackages = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const packages = await prisma.package.findMany({
            where: {
                type: 'INDIVIDUAL'
            },
        })
        const stores = await prisma.store.findMany({});
        return res.status(200).send({ valid: true, message: 'Packages fetched successfully', stores, packages })
    } catch (err) {
        return next(err)
    }
}

const bookSlot = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const { packageId, storeId, date, time} = req.body;
        // const isValidPayload = helper.isValidatePaylod(req.body, ['storeId', 'packageId', 'date', 'time']);
        // if(!isValidPayload) {
        //     return res.send({ status: 400, erroxr: 'Invalid payload', error_description: 'packageId, date, time and storeId are required.' });
        // }
        if(!packageId){
            return res.send({ valid: false, error: 'Package ID not found.', error_description: 'Package ID is required' })
        }
        if(!storeId){
            return res.send({ valid: false, error: 'Store ID not found.', error_description: 'Store ID is required' })
        }
        if(!date || !time){
            return res.send({ valid: false, error: 'Date or time not found.', error_description: 'Date and time are required' })
        }
        const user = req.user;
        const { name, phone } = user;
        const store = await prisma.store.findUnique({where: {id: parseInt(storeId)}})
        if(!store) {
            return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
        }
       const packageExist = await prisma.package.findUnique({where: {id: parseInt(packageId)}})
        if(!packageExist) {
            return res.send({ valid: false, error: 'Package not found.', error_description: 'Package does not exist' })
        }
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phone: phone
            }
        })
        if(!existingCustomer){
            const newCustomer = await prisma.customer.create({
                data: {
                    name: name,
                    phone: phone,
                    customer_type: 'APP'
                }
            })
            const newlead = await prisma.lead.create({
                data: {
                    customerId: newCustomer.id,
                    stage: 'New',
                    source: 'APP',
                }
            })
        }
        const customer = await prisma.customer.findFirst({
            where: {
                phone: phone
            }
        })
        const customer_id = customer?.id;
        const booking = await prisma.booking.create({
            data: {
                date,
                time,
                customerId: customer_id,
                storeId,
                price: packageExist?.price,
                bookingType: 'App',
                packageId: packageId,
                overs: packageExist?.overs,
                oversLeft: packageExist?.overs,
            }
        })
        return res.status(200).send({valid: true, message: 'Slot booking successfully!', booking});
    }catch(err){
        console.log(err);
        return res.status(500).send('Internal Server Error');
    }
}

const getPackages = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const individualPackages = await prisma.package.findMany({
            where: {
                type: 'INDIVIDUAL'
            },
        })
        const packages = await prisma.package.findMany({
            where: {
                type: 'PACKAGE'
            },
        })
        const subscriptions = await prisma.package.findMany({
            where: {
                type: 'SUBSCRIPTION'
            },
        })
        return res.status(200).send({ valid: true, message: 'Packages fetched successfully', individual: individualPackages, package: packages, subscription: subscriptions })
    } catch (err) {
        return next(err)
    }
}

const getBookings = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        if (!user) {
            return res.status(200).send({ valid: false, message: 'User not found' })
        }
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`; 
        const completedBookings = await prisma.booking.findMany({
            where: {
              customerId: user.id,
            //   date: {
            //     gte: todayStr, 
            //   }
            oversLeft: 0,
            },
            include: {
              package: true,
              store: true
            }
        });

        const ongoingBookings = await prisma.booking.findMany({
            where: {
                customerId: user.id,
                date: {
                    lte: todayStr
                },
                oversLeft: {
                    gt: 0
                }
            },
            include: {
                package: true,
                store: true
            }
        })

        const scheduledBookings = await prisma.booking.findMany({
            where: {
                customerId: user.id,
                date: {
                    gte: todayStr
                },
                oversLeft: {
                    gt: 0
                }
            },
            include: {
                package: true,
                store: true
            }
        })

        return res.status(200).send({ valid: true, message: 'Bookings fetched successfully', completed: completedBookings, ongoing: ongoingBookings, scheduled: scheduledBookings })
    } catch (err) {
        return next(err)
    }
}

const searchPackages = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query
        if (!search) {
            return res.status(200).send({ valid: false, message: 'Search query not found' })
        }
        const packages = await prisma.package.findMany({
            where: {
                name: {
                    contains: search.toString()
                },
            },
        })
        return res.status(200).send({ valid: true, message: 'Packages fetched successfully', packages })
    } catch (err) {
        return next(err)
    }
}

const userController = {
    getProfile,
    updateProfile,
    trendingPackages,
    bookSlot,
    getPackages,
    getBookings,
    searchPackages
}

export default userController