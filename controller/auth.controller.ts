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
      const { date } = req.query;
      const filterDate = date ? new Date(date as string) : null;
  
      const monthStartDate = filterDate
        ? new Date(filterDate.getFullYear(), filterDate.getMonth(), 1)
        : null;
  
      const monthEndDate = filterDate
        ? new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0, 23, 59, 59)
        : null;
  
      const stores = await prisma.store.findMany();
      const employees = await prisma.employee.findMany();
  
      const bookings = await prisma.booking.findMany({
        where: filterDate
          ? {
              createdAt: {
                gte: monthStartDate!,
                lte: monthEndDate!,
              },
            }
          : undefined,
      });
  
      const packages = await prisma.package.findMany();
  
      const customers = await prisma.customer.findMany({
        where: filterDate
          ? {
              createdAt: {
                gte: monthStartDate!,
                lte: monthEndDate!,
              },
            }
          : undefined,
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
        },
      });
  
      const monthLeads = await prisma.customer.count({
        where: filterDate
          ? {
              createdAt: {
                gte: monthStartDate!,
                lte: monthEndDate!,
              },
            }
          : {
              createdAt: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                lte: new Date(),
              },
            },
      });
  
      const sources = await prisma.source.findMany();
  
      const sourcesWithLeads = await Promise.all(
        sources.map(async (source) => {
          const leadsCount = await prisma.lead.count({
            where: {
              source: source.name,
              ...(filterDate && {
                createdAt: {
                  gte: monthStartDate!,
                  lte: monthEndDate!,
                },
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
              ...(filterDate && {
                createdAt: {
                  gte: monthStartDate!,
                  lte: monthEndDate!,
                },
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
      for (let i = 0; i < stores.length; i++) {
        const storeId = stores[i].id;
        const storeName = stores[i].name;
  
        const bookings = await prisma.booking.findMany({
          where: {
            storeId: storeId,
            ...(filterDate && {
              createdAt: {
                gte: monthStartDate!,
                lte: monthEndDate!,
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

const authController = {
    Login,
    Signup,
    dashboardDetails,
}
export default authController
