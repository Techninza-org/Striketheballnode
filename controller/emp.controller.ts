import { type NextFunction, type Request, type Response } from 'express'
import helper from '../utils/helpers'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import axios from 'axios'
const prisma = new PrismaClient()

const getBookings = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const storeId = req.user.storeId
        if(!storeId) return res.status(200).send({ status: 400, error: 'Store not found.', error_description: 'Store does not exist' })
        const bookings = await prisma.booking.findMany({where: {storeId}})
        return res.status(200).send({ status: 200, bookings })
    } catch (err) {
        return next(err)
    }
}

const empController = {
    getBookings
}

export default empController