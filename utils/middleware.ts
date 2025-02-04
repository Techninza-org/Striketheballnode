import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export type ExtendedRequest = Request & {
    user: any,
}

const AdminMiddleware = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const token = req.headers?.authorization

    if (!token) {
        return res.status(200).send({
            status: 400,
            error: 'Authentication failed',
            error_description: 'token is required',
        })
    }

    const splittedToken = token.split(' ')
    if (splittedToken[0] !== 'Bearer') {
        return res.status(200).send({
            status: 400,
            error: 'Authentication failed',
            error_description: 'Invalid token type',
        })
    }

    let decryptedToken: any
    try {
        decryptedToken = jwt.verify(splittedToken[1], process.env.JWT_SECRET!)
    } catch (err: any) {
        return next(err)
    }

    const email: string = decryptedToken?.email
    if (!email) {
        const err = new Error("Error: token doens't contain email")
        return next(err)
    }
    try {
        const user = await prisma.employee.findFirst({where: {email, role: 'ADMIN'}})
        if (!user) {
            return res.status(200).send({ status: 400, error: 'User not found.', error_description: 'Admin does not exist' })
        }
        delete (user as any)?.password
        req.user = user
        next()
    } catch (err) {
        return res.status(200).send({ status: 400, error: 'user not found.', error_description: (err as Error).message })
    }
}
const AuthMiddleware = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    const token = req.headers?.authorization

    if (!token) {
        return res.status(200).send({
            status: 400,
            error: 'Authentication failed',
            error_description: 'token is required',
        })
    }

    const splittedToken = token.split(' ')
    if (splittedToken[0] !== 'Bearer') {
        return res.status(200).send({
            status: 400,
            error: 'Authentication failed',
            error_description: 'Invalid token type',
        })
    }

    let decryptedToken: any
    try {
        decryptedToken = jwt.verify(splittedToken[1], process.env.JWT_SECRET!)
    } catch (err: any) {
        return next(err)
    }

    const email: string = decryptedToken?.email
    if (!email) {
        const err = new Error("Error: token doens't contain email")
        return next(err)
    }
    try {
        const user = await prisma.employee.findFirst({where: {email}})
        if (!user) {
            return res.status(200).send({ status: 400, error: 'user not found.', error_description: 'Employee does not exist' })
        }
        delete (user as any)?.password
        req.user = user
        next()
    } catch (err) {
        return res.status(200).send({ status: 400, error: 'user not found.', error_description: (err as Error).message })
    }
}

const ErrorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof Error) {
        if (err.name === 'PrismaClientKnownRequestError') {
            return res.status(200).send({
                status: 400,
                error: 'Invalid Payload',
                error_description: err.message,
            })
        }
        console.log(err);
        return res.status(200).send({
            status: 500,
            error: 'Internal Server Error',
            error_description: err.message,
        })
    }
}

const middleware = { ErrorHandler, AuthMiddleware, AdminMiddleware }

export default middleware
