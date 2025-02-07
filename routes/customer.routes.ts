import { Router } from 'express'
import customerController from '../controller/customer.controller'

const customerRouter = Router()

customerRouter.post('/', customerController.createCustomer)
customerRouter.get('/', customerController.getCustomers)
customerRouter.delete('/:id', customerController.deleteCustomer)

export default customerRouter
