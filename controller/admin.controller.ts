import { type NextFunction, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { ExtendedRequest } from '../utils/middleware'
import helper from '../utils/helpers'
import crypto from 'crypto'
const prisma = new PrismaClient()
const SALT_ROUND = process.env.SALT_ROUND!
const ITERATION = 100
const KEYLENGTH = 10
const DIGEST_ALGO = 'sha512'

////////////////////////////////////////////////////////////////////////// STORE CONTROLLER //////////////////////////////////////////////////////////////////////////////

const getStores = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const stores = await prisma.store.findMany()
        return res.send({ valid: true, stores })
    } catch (err) {
        return next(err)
    }
}

const getStoreById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const store = await prisma.store.findUnique({
            where: { id: parseInt(id) }
        })
        if(!store) {
            return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
        }
        return res.send({ valid: true, store })
    } catch (err) {
        return next(err)
    }
}

const updateStore = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const { name, address, phone, storeLocation } = req.body
        const store = await prisma.store.update({
            where: { id: parseInt(id) },
            data: {
                name,
                address,
                phone,
                storeLocation
            },
        })
        if(!store) {
            return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
        }
        return res.send({ valid: true, store })
    } catch (err) {
        return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
    }
}

const deleteStore = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const store = await prisma.store.delete({
            where: { id: parseInt(id) },
        })
        if(!store) {
            return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
        }
        return res.send({ valid: true, store })
    } catch (err) {
        return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
    }
}

const createStore = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { name, address, phone, storeLocation } = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'address', 'phone'])
        if (!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'store name, address and phone are requried.' })
        }
        const store = await prisma.store.create({
            data: {
                name,
                address,
                phone,
                storeLocation
            },
        })
        return res.send({ valid: true, store })
    } catch (err) {
        return next(err)
    }
}


////////////////////////////////////////////////////////////////////////// EMPLOYEE CONTROLLER //////////////////////////////////////////////////////////////////////////////

const createSubadmin = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {name, email, password, accessTo, phone} = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['email', 'password']);
        if (!isValidPayload) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'email, password are required.',
            });
        }
        const employeeExist = await prisma.employee.findFirst({
            where: { OR: [{ email: email }, { phone: phone }] }
        })

        if(employeeExist) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'Employee email or phone already exist.',
            });
        }

        const hash_password = crypto.pbkdf2Sync(password, SALT_ROUND, ITERATION, KEYLENGTH, DIGEST_ALGO).toString('hex');

        const employee = await prisma.employee.create({
            data: {
                name,
                email,
                password: hash_password, 
                accessTo: {
                    'stores': true,
                    'add-store': true,
                    'employees': true,
                    'add-employee': true,
                    'packages': true,
                    'add-package': true,
                    'bookings': true,
                    'customers': true,
                    'logs': true,
                    'calls': true,
                },
                role: 'SUBADMIN',
                phone,
            },
        });

        const { password: _, ...employeeWithoutPassword } = employee;
        return res.status(200).send({ valid: true, employee: employeeWithoutPassword });
    }catch(err){
        return next(err)
    }
}

const updateSubadminAccess = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { accessTo } = req.body;

        const employee = await prisma.employee.update({
            where: { id: parseInt(id) },
            data: {
                accessTo
            },
        });

        const { password: _, ...employeeWithoutPassword } = employee;
        return res.status(200).send({ valid: true, employee: employeeWithoutPassword });
    } catch (err) {
        return next(err);
    }
}

const getSubadmins = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                role: 'SUBADMIN'
            },
            select: {
                id: true,
                name: true,
                email: true,
                accessTo: true,
                phone: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return res.status(200).send({ valid: true, employees });
    } catch (err) {
        return next(err);
    }
}

const getRoutesToAccess = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const routes = [
            'stores', 'add-store', 'employees', 'add-employee', 'packages', 'add-package', 'bookings', 'customers', 'logs', 'calls'
        ]
        return res.status(200).send({ valid: true, routes });
    } catch (err) {
        return next(err);
    }
}

const createEmployee = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, storeId, accessTo, employeeId, phone } = req.body;

        const isValidPayload = helper.isValidatePaylod(req.body, ['email', 'password', 'storeId']);
        if (!isValidPayload) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'email, password, and storeId are required.',
            });
        }

        const s_id = parseInt(storeId);

        const employeeExist = await prisma.employee.findFirst({
            where: { OR: [{ email: email }, { phone: phone }] }
        })

        if(employeeExist) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'Employee email or phone already exist.',
            });
        }

        const storeExist = await prisma.store.findUnique({
            where: { id: s_id }
        })
        if(!storeExist) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'Store does not exist.', 
            });
        }

        const hash_password = crypto.pbkdf2Sync(password, SALT_ROUND, ITERATION, KEYLENGTH, DIGEST_ALGO).toString('hex');

        const employee = await prisma.employee.create({
            data: {
                name,
                email,
                password: hash_password, 
                storeId: s_id,
                accessTo,
                employeeId,
                phone,
            },
        });

        const { password: _, ...employeeWithoutPassword } = employee;
        return res.status(200).send({ valid: true, employee: employeeWithoutPassword });
    } catch (err) {
        return next(err);
    }
};


const updateEmployeeDetails = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, email, storeId, accessTo, employeeId, phone } = req.body;

        const employee = await prisma.employee.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                storeId,
                accessTo,
                employeeId,
                phone,
            },
        });

        const { password: _, ...employeeWithoutPassword } = employee;
        return res.status(200).send({ valid: true, employee: employeeWithoutPassword });
    } catch (err) {
        return next(err);
    }
}

const updateEmployeePassword = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const hash_password = crypto.pbkdf2Sync(password, SALT_ROUND, ITERATION, KEYLENGTH, DIGEST_ALGO).toString('hex');

        const employee = await prisma.employee.update({
            where: { id: parseInt(id) },
            data: {
                password: hash_password,
            },
        });

        const { password: _, ...employeeWithoutPassword } = employee;
        return res.status(200).send({ valid: true, employee: employeeWithoutPassword });
    } catch (err) {
        return next(err);
    }
}

const deleteEmployee = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const employee = await prisma.employee.delete({
            where: { id: parseInt(id) },
        });

        const { password: _, ...employeeWithoutPassword } = employee;
        return res.status(200).send({ valid: true, employee: employeeWithoutPassword });
    } catch (err) {
        return res.send({ valid: false, error: 'Employee not found.', error_description: 'Employee does not exist' });
    }
}

const getEmployees = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const employees = await prisma.employee.findMany({
            where: {
            role: {
                notIn: ['ADMIN', 'SUBADMIN']
            }
            },
            select: {
            id: true,
            name: true,
            email: true,
            storeId: true,
            accessTo: true,
            employeeId: true,
            phone: true
            },
            orderBy: {
            createdAt: 'desc'
            }
        });
        return res.status(200).send({ valid: true, employees });
    } catch (err) {
        return next(err);
    }
}

const getEmployeeById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(id) },
        });

        if (!employee) {
            return res.status(200).send({ valid: false, error: 'Employee not found.', error_description: 'Employee does not exist' });
        }
        
        const { password: _, ...employeeWithoutPassword } = employee;
        return res.status(200).send({ valid: true, employee: employeeWithoutPassword });
    } catch (err) {
        return next(err);
    }
}

////////////////////////////////////////////////////////////////////////// PACKAGE CONTROLLER //////////////////////////////////////////////////////////////////////////////
const createPackage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { name, price, title, description, overs } = req.body;
        const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'price', 'overs']);
        if (!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'name, price and overs are required.' });
        }

        if(isNaN(Number(price))) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'price must be a integer.' });
        }
        
        const newPackage = await prisma.package.create({
            data: {
                name,
                title,
                price: parseInt(price),
                description,
                overs: parseInt(overs)
            },
        })
        return res.send({ valid: true, newPackage })
    } catch (err) {
        return next(err)
    }
}

const getAllPackages = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const packages = await prisma.package.findMany()
        return res.send({ valid: true, packages })
    } catch (err) {
        return next(err)
    }
}

const updatePackage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const { name, price, title, description, overs } = req.body
        const updatedPackage = await prisma.package.update({
            where: { id: parseInt(id) },
            data: {
                name,
                title,
                price,
                description,
                overs
            },
        })
        return res.send({ valid: true, updatedPackage })
    } catch (err) {
        return res.send({ valid: false, error: 'Package not found.', error_description: 'Package does not exist' })
    }
}

const deletePackage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const deletedPackage = await prisma.package.delete({
            where: { id: parseInt(id) },
        })
        return res.send({ valid: true, deletedPackage })
    } catch (err) {
        return res.send({ valid: false, error: 'Package not found.', error_description: 'Package does not exist' })
    }
}

const getPackageById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const packageDetails = await prisma.package.findUnique({
            where: { id: parseInt(id) }
        })
        if(!packageDetails) {
            return res.send({ valid: false, error: 'Package not found.', error_description: 'Package does not exist' })
        }
        return res.send({ valid: true, packageDetails })
    } catch (err) {
        return next(err)
    }
}

const getBookings = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const bookings = await prisma.booking.findMany({orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
        return res.send({ valid: true, bookings })
    } catch (err) {
        return next(err)
    }
}

const getBookingsByCustomerType = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { customerType } = req.params
        if(customerType !== '0' && customerType !== '1' && customerType !== '2') {
            return res.send({ valid: false, error: 'Invalid customer type', error_description: 'Customer type must be 0, 1 or 2' })
        }
        if(customerType === '0') {
            const bookings = await prisma.booking.findMany({
                where: {
                    customerId: { not: null },
                    customer: { customer_type: 'NORMAL' }
                },
                orderBy: { createdAt: 'desc' },
                include: { store: true, customer: true, package: true }
            });
            return res.send({ valid: true, bookings })
        }else if(customerType === '1'){
            const bookings = await prisma.booking.findMany({
                where: {
                    customerId: { not: null },
                    customer: { customer_type: 'IVR' }
                },
                orderBy: { createdAt: 'desc' },
                include: { store: true, customer: true, package: true }
            });
            return res.send({ valid: true, bookings })
        }else if(customerType === '2'){
            const bookings = await prisma.booking.findMany({
                where: {
                    customerId: { not: null },
                    customer: { customer_type: 'WA' }
                },
                orderBy: { createdAt: 'desc' },
                include: { store: true, customer: true, package: true }
            });
            return res.send({ valid: true, bookings })
        }else {
            const bookings = await prisma.booking.findMany({orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }
    } catch (err) {
        return next(err)
    }
}

const getBookingsByStore = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { storeId } = req.params
        const store = await prisma.store.findUnique({where: {id: parseInt(storeId)}})
        if(!store) {
            return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
        }
        const bookings = await prisma.booking.findMany({where: {storeId: parseInt(storeId)}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
        return res.send({ valid: true, bookings })
    } catch (err) {
        return next(err)
    }
}

const getBookingsByStatus = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { status } = req.params
        if(status !== '0' && status !== '1') {
            return res.send({ valid: false, error: 'Invalid status', error_description: 'Status must be PENDING, COMPLETED' })
        }
        if(status === '0') {
            const bookings = await prisma.booking.findMany({where: {status: 'PENDING'}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }else if(status === '1') {
            const bookings = await prisma.booking.findMany({where: {status: 'COMPLETED'}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }else{
            const bookings = await prisma.booking.findMany({orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }
    } catch (err) {
        return next(err)
    }
}

const createBooking = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
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

const updateBooking = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { playedOvers } = req.body;
        const isValidPayload = helper.isValidatePaylod(req.body, ['playedOvers']);
        if (!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'playedOvers is required.' });
        }
        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: {
                oversLeft: {
                    decrement: parseInt(playedOvers)
                }
            },
        });
        const customerId = booking.customerId;
        const bookingLog = await prisma.bookingOvers.create({
            data: {
                bookingId: parseInt(id),
                overs: parseInt(playedOvers),
                employeeId: req.user.id,
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

const getBookingById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: {store: true, customer: true, package: true}
        });
        if(!booking) {
            return res.send({ valid: false, error: 'Booking not found.', error_description: 'Booking does not exist' });
        }
        return res.send({ valid: true, booking });
    } catch (err) {
        return next(err);
    }
}

const getBookingLogs = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const bookingLogs = await prisma.bookingOvers.findMany({
            include: {booking: {include: {store: {select: {name: true}}, customer: {select: {name: true, email: true}}}}, employee: {select: {name: true, email: true}}},
            orderBy: {createdAt: 'desc'}
        });
        return res.send({ valid: true, bookingLogs });
    } catch (err) {
        return next(err);
    }
}

const getCalls = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const calls = await prisma.call.findMany({orderBy: {createdAt: 'desc'}, include: {customer: true, call_remarks: true}})
        return res.status(200).send({valid: true, calls})
    }catch(err){
        return next(err)
    }
}

const getCallById = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const { id } = req.params
        const call = await prisma.call.findUnique({where: {id: parseInt(id)}, include: {customer: true, call_remarks: true}})
        return res.status(200).send({valid: true, call})
    }catch(err){
        return next(err)
    }
}

const addCallRemarks = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const { id } = req.params
        const { remarks } = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['remarks']);
        if (!isValidPayload) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'remarks is required.',
            });
        }
        const call = await prisma.callRemarks.update({
            where: { id: parseInt(id) },
            data: {
                remarks
            },
        });
        return res.status(200).send({valid: true, call})
    }catch(err){
        return next(err)
    }
}

const adminController = {
        getStores,
        createStore,
        getStoreById, 
        updateStore, 
        deleteStore, 
        createEmployee, 
        updateEmployeeDetails, 
        updateEmployeePassword, 
        deleteEmployee, 
        getEmployees, 
        getEmployeeById,
        createPackage,
        getAllPackages,
        updatePackage, 
        deletePackage,
        getPackageById,
        getBookings,
        getBookingsByStore,
        createBooking,
        getBookingsByStatus,
        updateBooking,
        getBookingById,
        getBookingLogs,
        createSubadmin,
        updateSubadminAccess,
        getSubadmins,
        getRoutesToAccess,
        getCalls,
        addCallRemarks,
        getCallById,
        getBookingsByCustomerType
    }
export default adminController