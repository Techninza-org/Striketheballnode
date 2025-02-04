import { Router } from 'express'
import empController from '../controller/emp.controller'
import middleware from '../utils/middleware'

const empRouter = Router()

//@ts-ignore
empRouter.get('/booking', middleware.AuthMiddleware, empController.getBookings)

export default empRouter