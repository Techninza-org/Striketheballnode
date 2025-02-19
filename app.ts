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

app.post('/webhook', async (req, res) => {
    console.log('Received data:', JSON.stringify(req.body)); 
    try{
    const {entry} = req.body;
    const value = entry[0].changes[0].value;
    const messages = value.messages[0];
    const phone = value.contacts[0].wa_id;
    const name = value.contacts[0].profile.name;
    
    const existingCustomer = await prisma.customer.findFirst({
        where: {
            phone: phone
        }
    })
    
    if(!existingCustomer){
        await prisma.customer.create({
            data: {
                name: name,
                phone: phone,
                customer_type: 'WA'
            }
        }) 
    }
    const customer = await prisma.customer.findFirst({
        where: {
            phone: phone
        }
    })
    const customer_id = customer?.id;
    
    if(value.messages[0].text){
        // await prisma.wAHook.create({
        //     data: {
        //         phone: phone,
        //         cust_id: customer_id,
        //         response: {
        //             text: value.messages[0].text
        //         }
        //     }
        // })
    }
    if(messages.type === 'interactive'){
        if(messages.interactive.list_reply){
            await prisma.wAHook.create({
                data: {
                    phone: phone,
                    cust_id: customer_id,
                    response: {
                        selected: messages.interactive.list_reply.title,
                    }
                }
            })
        }
        if(messages.interactive.nfm_reply){
            await prisma.wAHook.create({
                data: {
                    phone: phone,
                    cust_id: customer_id,
                    response: {
                        booking: true,
                        details: messages.interactive.nfm_reply.response_json
                    }
                }
            })
           const resposneJson = JSON.parse(messages.interactive.nfm_reply.response_json);
           
           if(resposneJson.screen_0_Select_Store_0){
                const rawStore = resposneJson.screen_0_Select_Store_0;
                const store = rawStore.substring(rawStore.indexOf("_") + 1).replace(/_/g, " ");
                const date = resposneJson.screen_0_Select_Date_1;
                const time = resposneJson.screen_0_Select_Time_Slot_2.substring(2);
                console.log(store, date, time);
                let storeId = 0;
                
                const packageHook = await prisma.$queryRaw`
                    SELECT * FROM WAHook
                    WHERE phone = ${phone}
                    AND JSON_UNQUOTE(JSON_EXTRACT(response, '$.selected')) LIKE '%Overs%'
                    LIMIT 1;
                `;
                const selected = JSON.parse((packageHook as any)[0].response).selected;
                if(store === 'StrikeTheBall - Palam Vihar'){
                    storeId = 1
                }else if(store === 'StrikeTheBall - Sector 93'){
                    storeId = 2
                }else if(store === 'StrikeTheBall - Sector 107'){
                    storeId = 3
                }else {
                    return;
                }
                
                if(selected.includes('INR')){
                    let packageId = 0;
                    if(selected === '5 Overs - 300 INR'){
                        packageId = 1;
                    }else if(selected === '10 Overs - 500 INR'){
                        packageId = 2;
                    }else if(selected === '20 Overs - 1000 INR'){
                        packageId = 3;
                    }else if(selected === '40 Overs - 1500 INR'){
                        packageId = 4;
                    }else{
                        console.log('Invalid Package');
                        return;
                    }
                    const packagee = await prisma.package.findUnique({where: {id: packageId}});
                    console.log(packagee, 'selected ');
                    
                    if(packagee){
                    await prisma.booking.create({
                        data: {
                            date: date,
                            time: time,
                            packageId: packageId,
                            customerId: customer_id,
                            storeId: storeId,
                            bookingType: 'Package',
                            price: packagee.price,
                            overs: packagee.overs,
                            oversLeft: packagee.overs
                        }
                    })
                    }
                }else if(parseInt(selected) > 0){
                    const overs = selected;
                    await prisma.booking.create({
                        data: {
                            date: date,
                            time: time,
                            customerId: customer_id,
                            storeId: storeId,
                            bookingType: 'Custom',
                            overs: overs,
                            oversLeft: overs
                        }
                    })
                }else{
                    const selectedOvers = selected.split(' ')[0];
                    console.log(selectedOvers, 'selectedOvers');
                    if(selectedOvers === '40+'){
                        await prisma.booking.create({
                            data: {
                                date: date,
                                time: time,
                                customerId: customer_id,
                                storeId: storeId,
                                bookingType: 'Custom',
                                overs: 40,
                                oversLeft: 40
                            }
                        })
                    }else{
                        await prisma.booking.create({
                            data: {
                                date: date,
                                time: time,
                                customerId: customer_id,
                                storeId: storeId,
                                bookingType: 'Custom',
                                overs: selectedOvers,
                                oversLeft: selectedOvers
                            }
                        })
                    }
                }
           }
        }
    }
    }catch(err){
        console.log(err);
    }
    res.status(200).send('Webhook received successfully!');
});

app.post('/ivrhook', async (req, res) => {
    try{
        console.log('IVR Webhook Received:', JSON.stringify(req.body));

        const {call_id, caller_no, called_no, call_start_time, call_end_time, duration} = req.body;

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phone: caller_no.toString()
            }
        })

        if(!existingCustomer){
            console.log('New Customer');
            await prisma.customer.create({
                data: {
                    name: `IVR-${caller_no}`,
                    phone: caller_no.toString(),
                    customer_type: 'IVR'
                }
            })
        }

        const customer = await prisma.customer.findFirst({
            where: {
                phone: caller_no.toString()
            }
        })
        const customer_id = customer?.id;
        await prisma.call.create({
            data: {
                call_id,
                caller_no,
                called_no,
                call_start_time,
                call_end_time,
                duration,
                customer_id
            }
        })
        
        return res.status(200).send('IVR Webhook received successfully!');
    }catch(err){
        console.log(err);
        return res.status(500).send('Internal Server Error');
    }
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
