import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
// import authRouter from './routes/auth.routes';
import middleware from './utils/middleware';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import morgan from 'morgan';
import multer from 'multer';
import authRouter from './routes/auth.routes';
import adminRouter from './routes/admin.routes';
import empRouter from './routes/emp.routes';
import customerRouter from './routes/customer.routes';

const prisma = new PrismaClient();
const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors());

const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });

app.get('/', (_req, res) => {
    return res.status(200).send({ message: 'Welcome to Strike The Ball' });
});

app.get('/ping', (_req, res) => {
    return res.status(200).send({ status: 200, message: 'pong' });
});

app.post('/webhook', (req, res) => {
    console.log('Received data:', req.body);  
    res.status(200).send('Webhook received successfully!');
});

app.get('/public/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filepath = path.resolve('./public/images/' + filename);
    try {
        const stream = fs.createReadStream(filepath);
        stream.on('data', (chunk) => res.write(chunk));
        stream.on('end', () => res.end());
        stream.on('error', () => res.sendStatus(404));
    } catch (err) {
        return res.sendStatus(404);
    }
});

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/emp', empRouter);
app.use('/customer', customerRouter);

app.use(middleware.ErrorHandler);

app.all('*', (_req, res) => {
    res.status(404).send({
        status: 404,
        error: 'Not found',
        error_description: `(${_req.url}), route or file not found.`,
    });
});

export default app;
