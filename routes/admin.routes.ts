import { Router } from 'express'
import adminController from '../controller/admin.controller'
import middleware from '../utils/middleware'

const adminRouter = Router()

//@ts-ignore
adminRouter.get('/store', middleware.AdminMiddleware, adminController.getStores)
//@ts-ignore
adminRouter.post('/store', middleware.AdminMiddleware, adminController.createStore)
//@ts-ignore
adminRouter.get('/store/:id', middleware.AdminMiddleware, adminController.getStoreById)
//@ts-ignore
adminRouter.put('/store/:id', middleware.AdminMiddleware, adminController.updateStore)
//@ts-ignore
adminRouter.delete('/store/:id', middleware.AdminMiddleware, adminController.deleteStore)
//@ts-ignore
adminRouter.get('/employee', middleware.AdminMiddleware, adminController.getEmployees)
//@ts-ignore
adminRouter.post('/employee', middleware.AdminMiddleware, adminController.createEmployee)
//@ts-ignore
adminRouter.put('/employee/:id', middleware.AdminMiddleware, adminController.updateEmployeeDetails)
//@ts-ignore
adminRouter.put('/employee/:id/password', middleware.AdminMiddleware, adminController.updateEmployeePassword)
//@ts-ignore
adminRouter.delete('/employee/:id', middleware.AdminMiddleware, adminController.deleteEmployee)
//@ts-ignore
adminRouter.get('/employee/:id', middleware.AdminMiddleware, adminController.getEmployeeById)
//@ts-ignore
adminRouter.post('/package', middleware.AdminMiddleware, adminController.createPackage)
//@ts-ignore
adminRouter.get('/package', middleware.AdminMiddleware, adminController.getAllPackages)
//@ts-ignore
adminRouter.get('/package/:id', middleware.AdminMiddleware, adminController.getPackageById)
//@ts-ignore
adminRouter.put('/package/:id', middleware.AdminMiddleware, adminController.updatePackage)
//@ts-ignore
adminRouter.delete('/package/:id', middleware.AdminMiddleware, adminController.deletePackage)
//@ts-ignore
adminRouter.get('/booking', middleware.AdminMiddleware, adminController.getBookings)    
//@ts-ignore
adminRouter.get('/booking/:storeId', middleware.AdminMiddleware, adminController.getBookingsByStore)

export default adminRouter
