import { type NextFunction, type Request, type Response } from 'express'
import helper from '../utils/helpers'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()


const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { email, name, phone } = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['phone', 'name']);
        if (!isValidPayload) {
            return res.status(400).send({
                status: 400,
                error: 'Invalid payload',
                error_description: 'name and phone are required.',
            });
        }
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phone: phone
            }
        })
        if(existingCustomer){
            return res.status(400).send({vaid: false, message: 'Customer with phone already exist'})
        }
        const customer = await prisma.customer.create({
            data: {
                email,
                name,
                phone
            }
        })
        return res.status(200).send({valid: true, message: 'Customer created successfully', data: customer})
    }catch(err){
        return next(err)
    }
}

const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const customers = await prisma.customer.findMany({orderBy: {createdAt: 'desc'}})
        return res.status(200).send({valid: true, message: 'Customers fetched successfully', customers})
    }catch(err){
        return next(err)
    }
}

const getClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bookings = await prisma.booking.findMany({});
        const customerIds = bookings
            .map((booking) => booking.customerId)
            .filter((customerId) => customerId !== null) as number[];
        const customers = await prisma.customer.findMany({
            where: {
                id: {
                    in: customerIds,
                },
            },
        });
        return res
            .status(200)
            .send({ valid: true, message: 'Customers fetched successfully', customers });
    } catch (err) {
        return next(err);
    }
}

const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { id } = req.params
        const customer = await prisma.customer.delete({
            where: {
                id: parseInt(id)
            }
        })
        return res.status(200).send({valid: true, message: 'Customer deleted successfully', data: customer})
    }catch(err){
        return res.status(400).send({valid: false, message: 'Customer not found'})
    }
}

const editCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { id } = req.params
        const { email, name } = req.body
        const customer = await prisma.customer.update({
            where: {
                id: parseInt(id)
            },
            data: {
                email,
                name
            }
        })
        return res.status(200).send({valid: true, message: 'Customer updated successfully', customer})
    }catch(err){
        return res.status(400).send({valid: false, message: 'Customer not found'})
    }
}

const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { id } = req.params
        const customer = await prisma.customer.findFirst({
            where: {
                id: parseInt(id)
            }
        })
        return res.status(200).send({valid: true, message: 'Customer fetched successfully', customer})
    }catch(err){
        return res.status(400).send({valid: false, message: 'Customer not found'})
    }
}

const customerController = {
    createCustomer,
    getCustomers,
    deleteCustomer,
    editCustomer,
    getCustomerById,
    getClients
}

export default customerController