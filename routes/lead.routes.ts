import { Router } from 'express'
import leadController from '../controller/lead.controller'

const leadRouter = Router()

//@ts-ignore
leadRouter.post('/lead', leadController.createLead)
//@ts-ignore
leadRouter.post('/source', leadController.createSource)
//@ts-ignore
leadRouter.post('/stage', leadController.createStage)
//@ts-ignore
leadRouter.get('/source', leadController.getSources)
//@ts-ignore
leadRouter.get('/stage', leadController.getStages)
//@ts-ignore
leadRouter.delete('/source/:id', leadController.deleteSource)
//@ts-ignore
leadRouter.delete('/stage/:id', leadController.deleteStage)
//@ts-ignore
leadRouter.get('/customer/leads/:id', leadController.getCustomerLeads)
//@ts-ignore
leadRouter.get('/customer/leads/stage/:stage', leadController.getCustomerByLeadStatus)
//@ts-ignore
leadRouter.get('/customer/leads/source/:source', leadController.getCustomerByLeadSource)
//@ts-ignore
leadRouter.get('/today-callbacks', leadController.todayFollowUps)

export default leadRouter