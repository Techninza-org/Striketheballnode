import { Router } from 'express'
import adminController from '../controller/admin.controller'
import middleware from '../utils/middleware'
import { upload } from '../utils/helpers'

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
adminRouter.get('/employee/all', middleware.AdminMiddleware, adminController.getEmployeesAll)
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
adminRouter.get('/booking/customer/:id', middleware.AdminMiddleware, adminController.getBookingsByCustomerId)    
//@ts-ignore
adminRouter.get('/booking/:storeId', middleware.AdminMiddleware, adminController.getBookingsByStore)
//@ts-ignore
adminRouter.get('/booking/type/customer/:customerType', middleware.AdminMiddleware, adminController.getBookingsByCustomerType)
//@ts-ignore
adminRouter.get('/booking/status/:status', middleware.AdminMiddleware, adminController.getBookingsByStatus)
//@ts-ignore
adminRouter.get('/booking/payment/:paid', middleware.AdminMiddleware, adminController.getBookingsByPaidStatus)
//@ts-ignore
adminRouter.get('/booking/date/:date', middleware.AdminMiddleware, adminController.getBookingsByDate)
//@ts-ignore
adminRouter.post('/booking', middleware.AdminMiddleware, adminController.createBooking)
//@ts-ignore
adminRouter.post('/direct/booking', middleware.AdminMiddleware, adminController.createDirectBooking)
//@ts-ignore
adminRouter.put('/booking/:id', middleware.AdminMiddleware, adminController.updateBooking)
//@ts-ignore
adminRouter.get('/booking/payment/:id', middleware.AdminMiddleware, adminController.markPaymentAsDone)
//@ts-ignore
adminRouter.get('/booking/details/:id', middleware.AdminMiddleware, adminController.getBookingById)
//@ts-ignore
adminRouter.get('/booking/logs/all', middleware.AdminMiddleware, adminController.getBookingLogs)
//@ts-ignore
adminRouter.get('/booking/logs/store/:id', middleware.AdminMiddleware, adminController.getBookingLogsByStoreId)
//@ts-ignore
adminRouter.get('/booking/logs/customer/:id', middleware.AdminMiddleware, adminController.getBookingLogsByCustomerId)
//@ts-ignore
adminRouter.post('/subadmin', middleware.AdminMiddleware, adminController.createSubadmin)
//@ts-ignore
adminRouter.get('/subadmin', middleware.AdminMiddleware, adminController.getSubadmins)
//@ts-ignore
adminRouter.put('/subadmin/:id', middleware.AdminMiddleware, adminController.updateSubadminAccess)
//@ts-ignore
adminRouter.get('/access', middleware.AdminMiddleware, adminController.getRoutesToAccess)
//@ts-ignore
adminRouter.get('/calls', middleware.AdminMiddleware, adminController.getCalls)
//@ts-ignore
adminRouter.get('/calls/:id', middleware.AdminMiddleware, adminController.getCallById)
//@ts-ignore
adminRouter.post('/calls/:id', middleware.AdminMiddleware, adminController.addCallRemarks)
//@ts-ignore
adminRouter.post('/password/employee/:id', middleware.AdminMiddleware, adminController.updateEmpPassword)
//@ts-ignore
adminRouter.get('/bookings/today', middleware.AdminMiddleware, adminController.getTodayBookings)
//@ts-ignore
adminRouter.post('/upload-sheet', upload.single('file'), middleware.AdminMiddleware, adminController.uploadSheet)

export default adminRouter
