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
adminRouter.get('/package', adminController.getAllPackages)
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
//@ts-ignore
adminRouter.get('/booking/status/:status', middleware.AdminMiddleware, adminController.getBookingsByStatus)
//@ts-ignore
adminRouter.post('/booking', middleware.AdminMiddleware, adminController.createBooking)
//@ts-ignore
adminRouter.put('/booking/:id', middleware.AdminMiddleware, adminController.updateBooking)
//@ts-ignore
adminRouter.get('/booking/details/:id', middleware.AdminMiddleware, adminController.getBookingById)
//@ts-ignore
adminRouter.get('/booking/logs/all', middleware.AdminMiddleware, adminController.getBookingLogs)
//@ts-ignore
adminRouter.post('/subadmin', middleware.AdminMiddleware, adminController.createSubadmin)
//@ts-ignore
adminRouter.get('/subadmin', middleware.AdminMiddleware, adminController.getSubadmins)
//@ts-ignore
adminRouter.put('/subadmin/:id', middleware.AdminMiddleware, adminController.updateSubadminAccess)
//@ts-ignore
adminRouter.get('/access', middleware.AdminMiddleware, adminController.getRoutesToAccess)

export default adminRouter
