import { type NextFunction, type Request, type Response } from 'express'
import helper from '../utils/helpers'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import jwt from 'jsonwebtoken'
import axios from 'axios'

const SALT_ROUND = process.env.SALT_ROUND!
const ITERATION = 100
const KEYLENGTH = 10
const DIGEST_ALGO = 'sha512'

const Login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body
        const isValidPayload = helper.isValidatePaylod(body, ['email', 'password'])
        if (!isValidPayload) {
            return res
                .status(200)
                .send({ status: 400, error: 'Invalid payload', error_description: 'email and password are requried.' })
        }
        const { password } = req.body
        if (typeof password !== 'string') return res.status(400).send({ error: 'password must be a string' })
        let hash_password: string | Buffer = crypto.pbkdf2Sync(password, SALT_ROUND, ITERATION, KEYLENGTH, DIGEST_ALGO)
        hash_password = hash_password.toString('hex')
        try {
            const userDetails = await prisma.employee.findUnique({
                where: { email: String(body.email), password: hash_password },
            })
            if (!userDetails) {
                return res.status(200).send({
                    status: 200,
                    error: 'Invalid credentials.',
                    error_description: 'email or password is not valid',
                })
            }
           
            delete (userDetails as any).password
            
            if(userDetails.role === 'ADMIN'){
                const token = jwt.sign({ email: userDetails.email, role: userDetails.role }, process.env.JWT_SECRET!, {
                    expiresIn: '7d',
                })
                return res.status(200).send({
                    status: 200,
                    message: 'Ok',
                    user: { ...userDetails, token },
                })
            }

            if(userDetails.role === 'SUBADMIN'){
                const token = jwt.sign({ email: userDetails.email, role: userDetails.role, accessTo: userDetails.accessTo }, process.env.JWT_SECRET!, {
                    expiresIn: '7d',
                })
                return res.status(200).send({
                    status: 200,
                    message: 'Ok',
                    user: { ...userDetails, token },
                })
            }
            
            if(userDetails.storeId){
                const token = jwt.sign({ email: userDetails.email, storeId: userDetails.storeId }, process.env.JWT_SECRET!, {
                    expiresIn: '7d',
                })
                return res.status(200).send({
                    status: 200,
                    message: 'Ok',
                    user: { ...userDetails, token },       
                })
            }

            return res.status(200).send({
                status: 200,
                error: 'Invalid credentials.',
                error_description: 'email or password is not valid',
            })
        } catch (err) {
            return res.status(200).send({
                status: 200,
                error: 'Invalid credentials.',
                error_description: (err as any).message,
            })
        }
    } catch (err) {
        return next(err)
    }
}


const Signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body;
        console.log(body, 'signup');

        if (!helper.isValidatePaylod(body, ['name', 'password', 'email'])) {
            return res.status(200).send({
                status: 400,
                error: 'Invalid Payload',
                error_description: 'name, password, email are required.',
            });
        }

        const { password, name, storeId, accessTo } = req.body;
        const email = String(req.body.email).trim();

        if (name.length > 25) {
            return res.status(400).send({ status: 400, error: 'Name too long' });
        }

        const escapePattern = /^[\S]*$/;
        if (!escapePattern.test(name)) {
            return res.status(400).send({ status: 400, error: 'Name contains invalid characters' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).send({ status: 400, error: 'Invalid Email address' });
        }

        if (typeof password !== 'string') return res.status(400).send({ error: 'password should be a string' });
        if (password.includes(' ') || password.length < 5) {
            return res
                .status(400)
                .send({ status: 400, error: 'Password should not contain any spaces, minimum length 7 required' });
        }

        if (!escapePattern.test(password)) {
            return res.status(400).send({ status: 400, error: 'Password cannot contain invalid characters' });
        }

        try {
            const isEmailExists = await prisma.employee.findFirst({ where: { email } });
            if (isEmailExists) {
                return res
                    .status(200)
                    .send({ status: 400, error: 'BAD REQUEST', error_description: 'email already exists.' });
            }
        } catch (err) {
            return next(err);
        }

        crypto.pbkdf2(password, SALT_ROUND, ITERATION, KEYLENGTH, DIGEST_ALGO, async (err, hash_password) => {
            if (err) return next(err);

            try {
                const hash_password_hex = hash_password.toString('hex');
                const emp = await prisma.employee.create({
                    data: {
                        name,
                        email,
                        password: hash_password_hex,
                        storeId,
                        accessTo,
                    },
                });

                return res.status(200).json({ status: 'success', message: 'User created successfully', employee: emp });
            } catch (err) {
                return next(err);
            }
        });
    } catch (err) {
        return next(err);
    }
};

const dashboardDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, startDate, endDate, month, year, filterType, storeId } = req.query;
      
      let startFilterDate = null;
      let endFilterDate = null;
      
      // Handle different filter types
      if (filterType === 'dateRange' && startDate && endDate) {
        startFilterDate = new Date(startDate as string);
        endFilterDate = new Date(endDate as string);
        endFilterDate.setHours(23, 59, 59, 999); // End of day
      } else if (filterType === 'month' && month && year) {
        const monthNum = parseInt(month as string) - 1; // Month is 0-indexed
        const yearNum = parseInt(year as string);
        startFilterDate = new Date(yearNum, monthNum, 1);
        endFilterDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);
      } else if (filterType === 'year' && year) {
        const yearNum = parseInt(year as string);
        startFilterDate = new Date(yearNum, 0, 1);
        endFilterDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
      } else if (date) {
        // Legacy support for single date (monthly filter)
        const filterDate = new Date(date as string);
        startFilterDate = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1);
        endFilterDate = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0, 23, 59, 59, 999);
      }
  
      const stores = await prisma.store.findMany();
      const employees = await prisma.employee.findMany({
        where: storeId ? { storeId: parseInt(storeId as string) } : undefined
      });
  
      const bookings = await prisma.booking.findMany({
        where: {
          ...(startFilterDate && endFilterDate && {
            createdAt: {
              gte: startFilterDate,
              lte: endFilterDate,
            },
          }),
          ...(storeId && { storeId: parseInt(storeId as string) }),
        },
      });
  
      const packages = await prisma.package.findMany();
  
      const customers = await prisma.customer.findMany({
        where: {
          ...(startFilterDate && endFilterDate && {
            createdAt: {
              gte: startFilterDate,
              lte: endFilterDate,
            },
          }),
          ...(storeId && {
            bookings: {
              some: {
                storeId: parseInt(storeId as string)
              }
            }
          }),
        },
      });
  
      const todayFollowUps = await prisma.lead.count({
        where: {
          callbackDate: new Date(),
        },
      });
  
      const todayLeadsCount = await prisma.customer.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59)),
          },
          ...(storeId && {
            bookings: {
              some: {
                storeId: parseInt(storeId as string)
              }
            }
          }),
        },
      });
  
      const monthLeads = await prisma.customer.count({
        where: {
          ...(startFilterDate && endFilterDate
            ? {
                createdAt: {
                  gte: startFilterDate,
                  lte: endFilterDate,
                },
              }
            : {
                createdAt: {
                  gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                  lte: new Date(),
                },
              }),
          ...(storeId && {
            bookings: {
              some: {
                storeId: parseInt(storeId as string)
              }
            }
          }),
        },
      });
  
      const sources = await prisma.source.findMany();
  
      const sourcesWithLeads = await Promise.all(
        sources.map(async (source) => {
          const leadsCount = await prisma.lead.count({
            where: {
              source: source.name,
              ...(startFilterDate && endFilterDate && {
                createdAt: {
                  gte: startFilterDate,
                  lte: endFilterDate,
                },
              }),
              ...(storeId && {
                customer: {
                  bookings: {
                    some: {
                      storeId: parseInt(storeId as string)
                    }
                  }
                }
              }),
            },
          });
          return {
            name: source.name,
            leadsCount,
          };
        })
      );
  
      const stages = await prisma.stage.findMany();
  
      const stagesWithLeads = await Promise.all(
        stages.map(async (stage) => {
          const leadsCount = await prisma.lead.count({
            where: {
              stage: stage.name,
              ...(startFilterDate && endFilterDate && {
                createdAt: {
                  gte: startFilterDate,
                  lte: endFilterDate,
                },
              }),
              ...(storeId && {
                customer: {
                  bookings: {
                    some: {
                      storeId: parseInt(storeId as string)
                    }
                  }
                }
              }),
            },
          });
          return {
            name: stage.name,
            leadsCount,
          };
        })
      );
  
      let storeRevenue = [];
      const storesToProcess = storeId ? stores.filter(store => store.id === parseInt(storeId as string)) : stores;
      
      for (let i = 0; i < storesToProcess.length; i++) {
        const storeId = storesToProcess[i].id;
        const storeName = storesToProcess[i].name;
  
        const bookings = await prisma.booking.findMany({
          where: {
            storeId: storeId,
            ...(startFilterDate && endFilterDate && {
              createdAt: {
                gte: startFilterDate,
                lte: endFilterDate,
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
  
      return res.status(200).send({
        valid: true,
        stores: stores.length,
        employees: employees.length - 1,
        bookings: bookings.length,
        packages: packages.length,
        customers: customers.length,
        todayLeads: todayLeadsCount,
        monthLeads: monthLeads,
        sources: sourcesWithLeads,
        stages: stagesWithLeads,
        todayFollowUps: todayFollowUps,
        revenue: storeRevenue,
        allStores: stores, // Include all stores for frontend dropdown
        selectedStoreId: storeId ? parseInt(storeId as string) : null,
      });
    } catch (err) {
      return next(err);
    }
  };
  
// const leadsData = async (req: Request, res: Response, next: NextFunction) => {
//     try{
//         const todayLeadsCount = await prisma.customer.count({
//             where: {
//             createdAt: {
//                 gte: new Date(new Date().setHours(0o0, 0o0, 0o0)),
//                 lte: new Date(new Date().setHours(23, 59, 59))
//             }
//             }
//         })

//         const monthLeads = await prisma.customer.count({
//             where: {
//                 createdAt: {
//                     gte: new Date(new Date().setDate(new Date().getDate() - 30)),
//                     lte: new Date()
//                 }
//             }
//         })

//         const sources = await prisma.source.findMany();

//         const sourcesWithLeads = await Promise.all(
//             sources.map(async (source) => {
//                 const leadsCount = await prisma.lead.count({
//                     where: {
//                         source: source.name
//                     }
//                 });
//                 return {
//                     name: source.name,
//                     leadsCount
//                 };
//             })
//         );

//         const stages = await prisma.stage.findMany();

//         const stagesWithLeads = await Promise.all(
//             stages.map(async (stage) => {
//                 const leadsCount = await prisma.lead.count({
//                     where: {
//                         stage: stage.name
//                     }
//                 });
//                 return {
//                     name: stage.name,
//                     leadsCount
//                 };
//             })
//         );
        
//         return res.status(200).send({
//             valid: true,
//             todayLeads: todayLeadsCount,
//             monthLeads: monthLeads,
//             sources: sourcesWithLeads,
//             stages: stagesWithLeads,
//         })
    
//     }catch(err){
//         return next(err);
//     }
// }


const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone } = req.body
        if (!phone) {
            return res.status(400).send({ status: 400, error: 'Invalid payload', error_description: 'phone is required.' })
        }

        if(isNaN(Number(phone)) || phone.length !== 10){
            return res.status(400).send({ status: 400, error: 'Invalid payload', error_description: 'phone should be a 10 digit number.' })
        }

        // const otp = Math.floor(1000 + Math.random() * 9000).toString()
        const otp = 1234;

        // await prisma.otp.create({
        //     data: {
        //         phone: phone,
        //         otp: otp,
        //     },
        // })

        // Send OTP via SMS (using Twilio or any other service)
        // const message = await sendOtpViaSms(phone, otp)

        return res.status(200).send({ status: 200, message: 'Ok', phone, otp })
    } catch (err) {
        return next(err)
    }
}

const userLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone, otp } = req.body
        if (!phone || !otp) {
            return res.status(400).send({ status: 400, error: 'Invalid payload', error_description: 'phone and otp are required.' })
        }

        if(isNaN(Number(phone)) || phone.length !== 10){
            return res.status(400).send({ status: 400, error: 'Invalid payload', error_description: 'phone should be a 10 digit number.' })
        }

        if(isNaN(Number(otp)) || otp.length !== 4){
            return res.status(400).send({ status: 400, error: 'Invalid payload', error_description: 'otp should be a 4 digit number.' })
        }

        const isValidOtp = otp === "1234";
        if (!isValidOtp) {
            return res.status(400).send({ status: 400, error: 'Invalid OTP', error_description: 'otp is not valid.' })
        }

        const existingCustomer = await prisma.customer.findUnique({
            where: { phone: phone },
        })

        const noOfCustomers = await prisma.customer.count({});

        if(!existingCustomer){
            await prisma.customer.create({
                data: {
                    phone: phone,
                    name: 'Player' + noOfCustomers.toString(),
                },
            })
        }

        const customer = await prisma.customer.findUnique({
            where: { phone: phone },
        })

        if(!customer){
            return res.status(400).send({ status: 400, error: 'Invalid payload', error_description: 'customer not found.' })
        }
        const customerId = customer.id
        const token = jwt.sign({ phone: phone, customerId: customerId }, process.env.JWT_SECRET!, {
            expiresIn: '7d',
        })

        delete (customer as any).password

        return res.status(200).send({
            status: 200,
            message: 'Ok',
            user: customer,
            token: token,
        })
    } catch (err) {
        return next(err)
    }
}

const guestLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const phone = 'GUEST-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const existingCustomer = await prisma.customer.findUnique({
            where: { phone: phone },
        })

        if(!existingCustomer){
            await prisma.customer.create({
                data: {
                    phone: phone,
                    name: `Guest-${crypto.randomUUID().slice(0, 6)}`
                },
            })
        }

        const customer = await prisma.customer.findUnique({
            where: { phone: phone },
        })

        if(!customer){
            return res.status(400).send({ status: 400, error: 'Invalid payload', error_description: 'customer not found.' })
        }
        const customerId = customer.id
        const token = jwt.sign({ phone: phone, customerId: customerId }, process.env.JWT_SECRET!, {
            expiresIn: '7d',
        })

        delete (customer as any).password

        return res.status(200).send({
            status: 200,
            message: 'Ok',
            user: customer,
            token: token,
        })
    } catch (err) {
        return next(err)
    }
}

const getAppBanners = async (req: Request, res: Response, next: NextFunction) => {
    try{
      const banners = await prisma.appBanner.findMany({})
      return res.status(200).send({ valid: true, banners });
    }catch(err){
      return next(err);
    }
}

const getGlobalNotifications =  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notifications = await prisma.globalNotification.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).send({ valid: true, notifications });
    } catch (err) {
        return next(err);
    }
}

const authController = {
    Login,
    Signup,
    dashboardDetails,
    userLogin,
    sendOtp,
    guestLogin,
    getAppBanners,
    getGlobalNotifications
}
export default authController
