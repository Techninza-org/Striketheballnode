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
import Papa from 'papaparse';

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
        const { name, address, phone, storeLocation, image } = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'address', 'phone'])
        if (!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'store name, address and phone are requried.' })
        }
        const store = await prisma.store.create({
            data: {
                name,
                address,
                phone,
                storeLocation,
                image
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
                appAccess: {
                    'clients': true,
                    'bookings': true,
                }
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
            where: { email }
        })

        if(employeeExist) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'Employee email already exist.',
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
                appAccess: {
                    'bookings': true
                }
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
                notIn: ['ADMIN']
            }
            },
            select: {
            id: true,
            name: true,
            email: true,
            storeId: true,
            accessTo: true,
            employeeId: true,
            phone: true,
            role: true
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

const getEmployeesAll = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const employees = await prisma.employee.findMany({
            select: {
            id: true,
            name: true,
            email: true,
            storeId: true,
            accessTo: true,
            employeeId: true,
            phone: true,
            role: true
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

const getBookingsRevenueStoreWise = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const date = req.params.date
        console.log(date, 'date');
        
        const stores = await prisma.store.findMany();
        if(date === 'null'){
            
            let storeRevenue = [];
            for (let i = 0; i < stores.length; i++) {
                const storeId = stores[i].id;
                const storeName = stores[i].name;
                const bookings = await prisma.booking.findMany({
                    orderBy: { createdAt: 'desc' },
                    where: { storeId: storeId }, 
                    include: { store: true, customer: true, package: true },
            });
            
                let totalRevenue = 0;
            
                bookings.forEach((booking) => {
                    if (booking.price !== null) {
                        totalRevenue += booking.price;
                    }
                });
          
              storeRevenue.push({
                storeId,
                storeName,
                total: totalRevenue,
              });
            }
            console.log(storeRevenue, 'storeRevenue');
            
            return res.status(200).send({ valid: true, revenue: storeRevenue });
        }else {
        const filterDate = date ? new Date(date as string) : null;
        const now = filterDate || new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        console.log(startOfDay, endOfDay, 'startOfDay');
        

        let storeRevenue = [];
        for (let i = 0; i < stores.length; i++) {
          const storeId = stores[i].id;
          const storeName = stores[i].name;
        
          const bookings = await prisma.booking.findMany({
            where: {
              storeId: storeId,
              ...(filterDate && {
                createdAt: {
                  gte: startOfDay!,
                  lte: endOfDay!,
                },
              }),
            },
            orderBy: { createdAt: 'desc' },
            include: { store: true, customer: true, package: true },
          });
        
          let totalRevenue = 0;
          let monthRevenue = 0;
        
          bookings.forEach((booking) => {
            if (booking.price !== null) {
              totalRevenue += booking.price;
              monthRevenue += booking.price;
            }
          });
        
          storeRevenue.push({
            storeId,
            storeName,
            total: totalRevenue,
            month: monthRevenue,
          });
        }
        console.log(storeRevenue, 'storeRevenue');
        
      return res.status(200).send({ valid: true, revenue: storeRevenue });
    }
    }catch(err){
        console.log(err);
        
        return next(err)
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
        const { name, price, overs, type, validity, normalMachinePrice, roboArmPrice, image, sessionsPerMonth, oversPerMonth } = req.body;
        const isValidPayload = helper.isValidatePaylod(req.body, ['name', 'price', 'overs', 'type']);
        if (!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'name, price, type and overs are required.' });
        }

        if(isNaN(Number(price))) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'price must be a integer.' });
        }
        
        const newPackage = await prisma.package.create({
            data: {
                name,
                price: parseInt(price),
                type,
                overs: parseInt(overs),
                validity,
                normalMachinePrice: normalMachinePrice ? parseInt(normalMachinePrice) : null,
                roboArmPrice: roboArmPrice ? parseInt(roboArmPrice) : null,
                image,
                sessionsPerMonth: sessionsPerMonth ? parseInt(sessionsPerMonth) : null,
                oversPerMonth: oversPerMonth ? parseInt(oversPerMonth) : null
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

const getBookingsByCustomerId = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const customer = await prisma.customer.findUnique({where: {id: parseInt(id)}})
        if(!customer) {
            return res.send({ valid: false, error: 'Customer not found.', error_description: 'Customer does not exist' })
        }
        const bookings = await prisma.booking.findMany({where: {customerId: parseInt(id)}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
        return res.send({ valid: true, bookings })
    } catch (err) {
        return next(err)
    }
}

const getBookingsByPaidStatus = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { paid } = req.params
        if(paid !== '0' && paid !== '1') {
            return res.send({ valid: false, error: 'Invalid paid status', error_description: 'Paid status must be 0 or 1' })
        }
        if(paid === '0') {
            const bookings = await prisma.booking.findMany({where: {paid: false}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }else if(paid === '1'){
            const bookings = await prisma.booking.findMany({where: {paid: true}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }else {
            const bookings = await prisma.booking.findMany({orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            return res.send({ valid: true, bookings })
        }
    } catch (err) {
        return next(err)
    }
}

const getBookingsByDate = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { date } = req.params
        const now = new Date(date);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
        const bookings = await prisma.booking.findMany({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lt: endOfDay
                }
            },
            orderBy: { createdAt: 'desc' },
            include: { store: true, customer: true, package: true }
        });
        return res.send({ valid: true, bookings })
    } catch (err) {
        return next(err)
    }
}

const getBookingsByCustomerType = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { customerType } = req.params
        if(customerType !== '0' && customerType !== '1' && customerType !== '2' && customerType !== '3') {
            return res.send({ valid: false, error: 'Invalid customer type', error_description: 'Customer type must be 0, 1, 2, 3' })
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
        }else if(customerType === '3'){
            const bookings = await prisma.booking.findMany({
                where: {
                    customerId: { not: null },
                    customer: { customer_type: 'ENQUIRY' }
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

const createDirectBooking = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { packageId, storeId, customerName, customerPhone, customerEmail, bookingType, overs, price } = req.body;
        const isValidPayload = helper.isValidatePaylod(req.body, ['storeId', 'bookingType', 'customerName', 'customerPhone']);
        if(!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'storeId, bookingType, customerName, customerPhone are required.' });
        }
        const existingCustomer = await prisma.customer.findUnique({where: {phone: customerPhone}})
        if(existingCustomer) {
            return res.send({ valid: false, error: 'Customer already found.', error_description: 'Customer with phone already exist' })
        }
        const customer = await prisma.customer.create({
            data: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                customer_type: 'NORMAL'
            }
        })
        const customerId = customer.id.toString();
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

const markPaymentAsDone = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user
        const username = user.name
        const paymentDate = new Date()
        const { id } = req.params
        const booking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: {
                paid: true,
                paymentMarkedBy: username,
                paymentMarkedAt: paymentDate,
            },
        })
        if(!booking) {
            return res.send({ valid: false, error: 'Booking not found.', error_description: 'Booking does not exist' })
        }
        return res.send({ valid: true, booking })
    } catch (err) {
        return next(err)
    }
}

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
                },
                lastPlayedDate: new Date(),
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

const getBookingLogsByStoreId = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const bookingLogs = await prisma.bookingOvers.findMany({
            where: {booking: {storeId: parseInt(id)}},
            include: {booking: {include: {store: {select: {name: true}}, customer: {select: {name: true, email: true}}}}, employee: {select: {name: true, email: true}}},
            orderBy: {createdAt: 'desc'}
        });
        return res.send({ valid: true, bookingLogs });
    } catch (err) {
        return next(err);
    }
}

const getBookingLogsByCustomerId = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const bookingLogs = await prisma.bookingOvers.findMany({
            where: {customerId: parseInt(id)},
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

const getEachStoreRevenue = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const stores = await prisma.store.findMany()
        let storeRevenue = []
        for(let i = 0; i < stores.length; i++) {
            const storeId = stores[i].id
            const bookings = await prisma.booking.findMany({where: {storeId: storeId}, orderBy: {createdAt: 'desc'}, include: {store: true, customer: true, package: true}})
            let totalRevenue = 0;
            bookings.forEach((booking) => {
                if (booking.price !== null) {
                    totalRevenue += booking.price
                }
            })
            let currentMonthRevenue = 0;
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            bookings.forEach((booking) => {
                const bookingDate = new Date(booking.createdAt);
                const bookingMonth = bookingDate.getMonth() + 1;
                const bookingYear = bookingDate.getFullYear();
                if (bookingMonth === currentMonth && bookingYear === currentYear) {
                    if(booking.price !== null){
                        currentMonthRevenue += booking.price
                    }
                }
            })
            storeRevenue.push({storeId, total: totalRevenue, month: currentMonthRevenue})
        }
        return res.send({ valid: true, storeRevenue })
    } catch (err) {
        return next(err)
    }
}

const getTodayBookings = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        const bookings = await prisma.booking.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: { store: true, customer: true, package: true },
        });

        return res.send({ valid: true, bookings });
    } catch (err) {
        return next(err);
    }
};


const updateEmpPassword = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const { password } = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['password']);
        if (!isValidPayload) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'password is required.',
            });
        }
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

const uploadSheet = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'File is required.'
            });
        }

        const csvText = file.buffer.toString('utf-8'); 

        let customers: any[] = [];
        let bookings: any[] = [];

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: any) => {
                const data = results.data as { name: string; phone: string, date: string, overs: string, oversLeft: string, price: string }[];
        
                for (const row of data) {
                    if (row.name && row.phone) {
                        customers.push({
                            name: row.name,
                            phone: row.phone,
                            customer_type: 'NORMAL'
                        });
                    }
        
                    if (row.name && row.phone && row.overs && row.oversLeft && row.price && row.date) {
                        const customer = await prisma.customer.findUnique({ where: { phone: row.phone } });

                        if (customer) {
                            bookings.push({
                                customerId: customer.id,
                                overs: parseInt(row.overs),
                                oversLeft: parseInt(row.oversLeft),
                                price: parseInt(row.price),
                                bookingType: 'Custom',
                                storeId: 1,
                                date: row.date,
                                paid: true
                            });
                        }
                    }
                }

                const resp = await handleCreateCustomers(customers);
                const bs = await handleCreateBookings(bookings);
                return res.status(200).send({ valid: true, data: resp, bookings: bs, message: 'Customers and bookings created successfully' });
            },
            error: (err: any) => {
                console.error('Error parsing CSV:', err);
                return res.status(500).send({ valid: false, error: 'Error parsing CSV file' });
            }
        });
        

    } catch (err) {
        return next(err);
    }
};

async function handleCreateBookings(bookings: any[]){
    const createdBookings = await prisma.booking.createMany({
        data: bookings
    })
    return { bookings: createdBookings }
}


async function handleCreateCustomers(customers: any[]) {
    const uniqueCustomerMap = new Map<string, any>();
    for (const customer of customers) {
        const normalizedPhone = customer.phone.trim(); 
        if (!uniqueCustomerMap.has(normalizedPhone)) {
            uniqueCustomerMap.set(normalizedPhone, { ...customer, phone: normalizedPhone });
        }
    }
    const uniqueCustomers = Array.from(uniqueCustomerMap.values());

    const existingCustomers = await prisma.customer.findMany({
        where: {
            phone: {
                in: uniqueCustomers.map((customer) => customer.phone)
            }
        }
    });

    const existingPhones = new Set(existingCustomers.map(c => c.phone));

    const newCustomers = uniqueCustomers.filter(customer => !existingPhones.has(customer.phone));

    if (newCustomers.length > 0) {
        await prisma.customer.createMany({ data: newCustomers });
    }

    return { createdCount: newCustomers.length, existingCount: existingCustomers.length };
}

async function addBanner(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).send({ valid: false, error: 'Image URL is required.' });
        }
        const banner = await prisma.appBanner.create({
            data: { image: imageUrl }
        });
        return res.status(200).send({ valid: true, banner });
    } catch (err) {
        return next(err);
    }
}

async function getAllBanners(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
        const banners = await prisma.appBanner.findMany();
        return res.status(200).send({ valid: true, banners });
    } catch (err) {
        return next(err);
    }
}

async function deleteBannerById(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const banner = await prisma.appBanner.delete({
            where: { id: parseInt(id) }
        });
        return res.status(200).send({ valid: true, banner });
    } catch (err) {
        return next(err);
    }
}

async function sendGlobalNotification(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
        const { title, body } = req.body;
        if (!title || !body) {
            return res.status(400).send({ valid: false, error: 'Title and body are required.' });
        }
        const notif = await prisma.globalNotification.create({
            data: {
                title,
                body
            }
        })
        
        return res.status(200).send({ valid: true, message: 'Notification sent successfully.', nofication: notif });
    } catch (err) {
        return next(err);
    }
}


const adminController = {
        sendGlobalNotification,
        addBanner,
        getAllBanners,
        deleteBannerById,
        uploadSheet,
        getStores,
        getBookingLogsByStoreId,
        getBookingLogsByCustomerId,
        getEachStoreRevenue,
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
        getBookingsByCustomerType,
        getBookingsByCustomerId,
        getEmployeesAll,
        updateEmpPassword,
        createDirectBooking,
        getTodayBookings,
        markPaymentAsDone,
        getBookingsByPaidStatus,
        getBookingsByDate,
        getBookingsRevenueStoreWise
    }
export default adminController