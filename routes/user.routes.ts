//@ts-nocheck
import { Router } from 'express'
import userController from '../controller/user.controller'
const userRouter = Router()

userRouter.get('/profile', userController.getProfile)
userRouter.put('/profile', userController.updateProfile)
userRouter.get('/trending', userController.trendingPackages)
userRouter.post('/book-slot', userController.bookSlot)
userRouter.get('/packages', userController.getPackages)
userRouter.get('/bookings', userController.getBookings)
userRouter.get('/search', userController.searchPackages)
userRouter.post('/review', userController.addReview)
userRouter.get('/notifications', userController.getNotifications)

export default userRouter
