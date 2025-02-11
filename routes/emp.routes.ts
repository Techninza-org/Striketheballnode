import { Router } from 'express'
import empController from '../controller/emp.controller'
import middleware from '../utils/middleware'

const empRouter = Router()

//@ts-ignore
empRouter.get('/booking', middleware.AuthMiddleware, empController.getBookings)
//@ts-ignore
empRouter.get('/dashboard', middleware.AuthMiddleware, empController.empDashboardDetails)
//@ts-ignore
empRouter.post('/booking', middleware.AuthMiddleware, empController.empCreateBooking)
//@ts-ignore
empRouter.get('/booking/status/:status', middleware.AuthMiddleware, empController.getBookingsByStatusEmp)
//@ts-ignore
empRouter.put('/booking/:id', middleware.AuthMiddleware, empController.updateBookingEmp)
//@ts-ignore
empRouter.get('/booking/details/:id', middleware.AuthMiddleware, empController.getBookingByIdEmp)
//@ts-ignore
empRouter.get('/booking/logs/all', middleware.AuthMiddleware, empController.getBookingLogsStore)
export default empRouter