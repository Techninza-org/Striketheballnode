import { type NextFunction, type Request, type Response } from 'express'
import helper from '../utils/helpers'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { ExtendedRequest } from '../utils/middleware'
import axios from 'axios'
const prisma = new PrismaClient()


const createSource = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {name} = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['name'])
        if(!isValidPayload){
            return res.send({status: 400, error: 'Invalid payload', error_description: 'name is required.'})
        }
        const source = await prisma.source.create({
            data: {
                name
            }
        })
        return res.status(200).send({valid: true, source})
    }catch(err){
        return next(err)
    }
}

const deleteSource = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {id} = req.params
        const source = await prisma.source.delete({
            where: {
                id: parseInt(id)
            }
        })
        return res.status(200).send({valid: true, source})
    }catch(err){
        return next(err)
    }
}

const getSources = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const sources = await prisma.source.findMany()
        return res.status(200).send({valid: true, sources})
    }catch(err){
        return next(err)
    }
}

const createStage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {name} = req.body
        const isValidPayload = helper.isValidatePaylod(req.body, ['name'])
        if(!isValidPayload){
            return res.send({status: 400, error: 'Invalid payload', error_description: 'name is required.'})
        }
        const stage = await prisma.stage.create({
            data: {
                name
            }
        })
        return res.status(200).send({valid: true, stage})
    }catch(err){
        return next(err)
    }
}

const deleteStage = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {id} = req.params
        const stage = await prisma.stage.delete({
            where: {
                id: parseInt(id)
            }
        })
        return res.status(200).send({valid: true, stage})
    }catch(err){
        return next(err)
    }
}

const getStages = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const stages = await prisma.stage.findMany()
        return res.status(200).send({valid: true, stages})
    }catch(err){
        return next(err)
    }
}

const createLead = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {customerId, stage, source, comments, storeId, callbackDate} = req.body
        if(!customerId || !stage){
            return res.send({valid: false, error: 'Invalid payload', error_description: 'customerId and stage are required.'})
        }
        const customer = await prisma.customer.findUnique({where: {id: parseInt(customerId)}})
        if(!customer){
            return res.send({valid: false, error: 'Customer not found.', error_description: 'Customer does not exist'})
        }
        if(storeId){
            const store = await prisma.store.findUnique({where: {id: parseInt(storeId)}})
            if(!store){
                return res.send({valid: false, error: 'Store not found.', error_description: 'Store does not exist'})
            }
        }
        
        const lead = await prisma.lead.create({
            data: {
                customerId: parseInt(customerId),
                stage: stage,
                source: source,
                comments: comments,
                storeId: storeId,
                callbackDate: callbackDate
            }
        })
        return res.status(200).send({valid: true, lead})
    }catch(err){
        return next(err)
    }
}

const getCustomerLeads = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {id} = req.params
        const leads = await prisma.lead.findMany({where: {customerId: parseInt(id)}, orderBy: {createdAt: 'desc'}})
        return res.status(200).send({valid: true, leads})
    }catch(err){
        return next(err)
    }
}

const getCustomerByLeadStatus = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { stage } = req.params;

        const latestLeads = await prisma.lead.groupBy({
            by: ["customerId"],
            _max: { createdAt: true },  
        });

        const validLeads = latestLeads.filter(lead => lead._max.createdAt !== null);

        const filteredLeads = await prisma.lead.findMany({
            where: {
                customerId: { in: validLeads.map(lead => lead.customerId) },
                createdAt: { in: validLeads.map(lead => lead._max.createdAt as Date) }, 
                stage: stage,
            },
            select: { customerId: true },
        });

        const customerIds = filteredLeads.map((lead) => lead.customerId);

        const customers = await prisma.customer.findMany({
            where: { id: { in: customerIds } },
        });

        return res.status(200).send({ valid: true, customers });
    } catch (err) {
        return next(err);
    }
};

const getCustomerByLeadSource = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
        const { source } = req.params;

        const customers = await prisma.customer.findMany({
            where: {
                leads: {
                    some: {
                        source: source,
                    },
                },
            },
            include: {
                leads: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        })

        return res.status(200).send({ valid: true, customers });
    } catch (err) {
        return next(err);
    }
}

const todayFollowUps = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0];
        const leads = await prisma.lead.findMany({
            where: {
                callbackDate: {
                    gte: new Date(`${formattedToday}T00:00:00.000Z`), 
                    lt: new Date(`${formattedToday}T23:59:59.999Z`)   
                }
            }
        });
        console.log(leads);
        
        
        const customers = await prisma.customer.findMany({where: {id: {in: leads.map(lead => lead.customerId)}}})
        return res.status(200).send({valid: true, customers})
    }catch(err){
        return next(err)
    }
}

const getDataToDownload =  async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try{
        const {stage} = req.params;
        const leads = await prisma.lead.findMany({where: {stage: stage}})
        const data = await prisma.customer.findMany({where: {id: {in: leads.map(lead => lead.customerId)}}, include: {bookings: true}})
        const customers = data.map(customer => {
            const {name, email, phone, bookings, createdAt} = customer
            return {Stage: stage, Name: name, Email: email, Phone: phone, Date: createdAt.toString().slice(4, 15), Total_Bookings: bookings.length}
        })
        return res.status(200).send({valid: true, customers})
    }catch(err){
        return next(err)
    }
}



const leadController = {
    createSource,
    deleteSource,
    getSources,
    createStage,
    deleteStage,
    getStages,
    createLead,
    getCustomerLeads,
    getCustomerByLeadStatus,
    getCustomerByLeadSource,
    todayFollowUps,
    getDataToDownload
}

export default leadController