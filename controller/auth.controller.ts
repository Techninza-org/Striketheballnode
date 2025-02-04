import { type NextFunction, type Request, type Response } from 'express'
import helper from '../utils/helpers'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import axios from 'axios'
const prisma = new PrismaClient()

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
                const token = jwt.sign({ email: userDetails.email }, process.env.JWT_SECRET!, {
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

// const SendOtp = async (req: Request, res: Response, _next: NextFunction) => {
//     try {
//         if (!helper.isValidatePaylod(req.body, ['email'])) {
//             return res.status(200).send({ status: 400, error: 'Invalid Payload', error_description: 'Email requried' })
//         }
//         const { email } = req.body
//         const otp = Math.floor(10000 + Math.random() * 90000)
//         // const otp = 1234
//         const user = await prisma.user.findFirst({ where: { email } })
//         console.log(user)

//         if (!user) return res.status(200).send({ status: 404, error: 'Not found', error_description: 'user not found' })
//         const previousSendOtp = await prisma.otp.findUnique({ where: { user_id: user.id } })
//         const userid = user.id
//         if (!previousSendOtp) {
//             try {
//                 const otpData = await prisma.otp.create({ data: { user_id: userid, otp: otp } })
//                 helper.sendMail(email, 'EzioTravels Account Verification', `Your OTP is ${otp}`)
//             } catch (err) {
//                 return _next(err)
//             }
//             return res.status(200).send({ status: 200, message: 'Ok' })
//         } else {
//             try {
//                 const otpData = await prisma.otp.update({ where: { user_id: userid }, data: { otp: otp } })
//                 helper.sendMail(email, 'EzioTravels Account Verification', `Your OTP is ${otp}`)
//             } catch (err) {
//                 return _next(err)
//             }
//             return res.status(200).send({ status: 200, message: 'Ok' })
//         }
//     } catch (err) {
//         return _next(err)
//     }
// }


// const VerifyOtp = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const { email, otp } = req.body
//         if (!helper.isValidatePaylod(req.body, ['email', 'otp'])) {
//             return res
//                 .status(200)
//                 .send({ status: 400, error: 'Invalid payload', error_description: 'email, otp are required.' })
//         }
//         const user = await prisma.user.findFirst({ where: { email } })
//         if (!user)
//             return res
//                 .status(200)
//                 .send({ status: 400, error: 'user not found.', error_description: `No user with ${email}` })
//         const otpData = await prisma.otp.findUnique({ where: { user_id: user.id } })
//         if (!otpData) {
//             return res.status(200).send({ error: 'Bad Request', error_description: 'OTP is not valid.' })
//         }
//         if (otpData?.otp === otp) {
//             const otpExpirationTime = new Date(otpData.updated_at).setMinutes(new Date().getMinutes() + 5)
//             if (otpExpirationTime < new Date().getTime()) {
//                 return res.status(200).send({ status: 400, error: 'Bad Request', error_description: 'OTP is expired.' })
//             }
//             try {
//                 const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { is_verified: true } })
//                 const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET!, {
//                     expiresIn: '7d',
//                 })
//                 return res.status(200).send({ status: 200, message: 'Ok', user: updatedUser, token })
//             } catch (err) {
//                 return next(err)
//             }
//         } else {
//             return res.status(200).send({ status: 400, error: 'Bad Request', error_description: 'OTP is not valid.' })
//         }
//     } catch (err) {
//         return next(err)
//     }
// }

const authController = {
    Login,
    Signup,
}
export default authController
