import { Router } from 'express'
import authController from '../controller/auth.controller'

const authRouter = Router()

authRouter.post('/login', authController.Login)
authRouter.post('/signup', authController.Signup)
authRouter.get('/dashboard-details', authController.dashboardDetails)
authRouter.post('/user-login', authController.userLogin)
authRouter.post('/sendOtp', authController.sendOtp)
authRouter.post('/guest-login', authController.guestLogin)

export default authRouter
