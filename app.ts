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
import leadRouter from './routes/lead.routes';
import helper from './utils/helpers';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import userRouter from './routes/user.routes';

const prisma = new PrismaClient();
const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors());


app.use(express.static('public'));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true }); 
}

const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname); 
        const fileName = randomImageName() + ext;
        const fullPath = path.join(uploadDir, fileName);
        cb(null, fileName);
    }
    
});

export const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send({ error: 'No file uploaded' });
    }
    res.send({ message: 'File uploaded successfully', file: 'uploads/' + file.filename });
});


app.get('/', (_req, res) => {
    return res.status(200).send({ message: 'Welcome to Strike The Ball' });
});

app.get('/ping', (_req, res) => {
    return res.status(200).send({ status: 200, message: 'pong' });
});

app.post('/doubletickhook', async (req, res) => {
    try{
        console.log('Double Tick Webhook Received:', JSON.stringify(req.body));
        
        const {conversationOpened, customerName, customerPhone, tagName, from, tagAdded, tagRemoved} = req.body;
        console.log(conversationOpened, customerName, customerPhone, 'details');
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phone: customerPhone
            }
        })
        if(!existingCustomer){
            const newCustomer = await prisma.customer.create({
                data: {
                    name: customerName,
                    phone: customerPhone,
                    customer_type: 'WA'
                }
            }) 
            const newlead = await prisma.lead.create({
                data: {
                    customerId: newCustomer.id,
                    stage: 'New',
                    source: 'WhatsApp',
                }
            })
        }else{
            console.log('Customer already exists', customerPhone);
        }
        if(tagName && from){
            console.log(tagName, 'tagName', from, 'from');
            
            const stageExists= await prisma.stage.findFirst({
                where: {
                    name: tagName
                }
            })
            console.log(stageExists, 'stageExists');
            
            if(!stageExists){
                const stageCreated = await prisma.stage.create({
                    data: {
                        name: tagName
                    }
                })
                console.log(stageCreated, 'stageCreated');
                
            }
            const customer = await prisma.customer.findFirst({
                where: {
                    phone: from
                }
            })
            if(customer){
                const customer_id = customer?.id;
                const lead = await prisma.lead.create({
                    data: {
                        customerId: customer_id,
                        stage: tagName,
                        source: 'DoubleTick',
                    }
                })
                console.log(lead, 'lead');
                
            }
        }
    }catch(err){
        console.log(err);
    }
    res.status(200).send('Webhook received successfully!');
})

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
        const newCustomer = await prisma.customer.create({
            data: {
                name: name,
                phone: phone,
                customer_type: 'WA'
            }
        }) 
        const newlead = await prisma.lead.create({
            data: {
                customerId: newCustomer.id,
                stage: 'New',
                source: 'WhatsApp',
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
           const resposneJson = JSON.parse(messages.interactive.nfm_reply.response_json);
           if(resposneJson.screen_0_Label_0){
            await prisma.wAHook.create({
                data: {
                    phone: phone,
                    cust_id: customer_id,
                    response: {
                        selected: resposneJson.screen_0_Label_0
                    }
                }
            })
           }else{
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
            }
           
           if(resposneJson.screen_0_Select_Store_0){
                const rawStore = resposneJson.screen_0_Select_Store_0;
                const store = rawStore.substring(rawStore.indexOf("_") + 1).replace(/_/g, " ");
                const date = resposneJson.screen_0_Select_Date_1;
                const rawtime = resposneJson.screen_0_Select_Time_Slot_2.replace("_", " ");
                const time = rawtime.split(' ')[1];
                console.log(store, date, time);
                let storeId = 0;
                const packageHook = await prisma.$queryRaw`
                    SELECT * FROM WAHook
                    WHERE phone = ${phone}
                    AND JSON_UNQUOTE(JSON_EXTRACT(response, '$.selected')) LIKE '%Overs%'
                    ORDER BY createdAt DESC 
                    LIMIT 1;
                `;
                console.log(packageHook, 'packageHook');
                
                const response = (packageHook as any)[0].response;
                const selected = response.selected;
                console.log(selected, 'selected');
                
                if(store === 'StrikeTheBall - Palam Vihar'){
                    storeId = 1
                }else if(store === 'StrikeTheBall - Sector 93'){
                    storeId = 2
                }else if(store === 'StrikeTheBall - Sector 107'){
                    storeId = 3
                }else {
                    return;
                }
                console.log(storeId, 'storeID');
                
                
                if(selected.includes('INR') && selected.includes('Overs')){
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
                }else if(selected.includes('Overs')){
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
                                overs: parseInt(selectedOvers),
                                oversLeft: parseInt(selectedOvers)
                            }
                        })
                    }
                }
                else{
                    const overs = parseInt(selected);
                    if(isNaN(overs)){
                        return;
                    }
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

        const {call_id, caller_no, called_no, call_start_time, call_end_time, duration, keypress} = req.body;

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phone: '91'+ caller_no.toString()
            }
        })

        if(!existingCustomer){
            console.log('New Customer');
            const newCustomer = await prisma.customer.create({
                data: {
                    name: `IVR-91${caller_no}`,
                    phone: '91'+caller_no.toString(),
                    customer_type: 'IVR'
                }
            })
            const newlead = await prisma.lead.create({
                data: {
                    customerId: newCustomer.id,
                    stage: 'New',
                    source: 'IVR',
                }
            })
        }

        const customer = await prisma.customer.findFirst({
            where: {
                phone: '91'+ caller_no.toString()
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

        const presses = keypress.split('-DG-');
        console.log(presses, 'presses');

        let storeId = 0;
        let overs = 0;
        let date = '';
        let time = '';


        if(presses[0] === '1' || presses[0] === '2'){
            if(presses[1] === '1') storeId = 1;
            else if(presses[1] === '2') storeId = 2;
            else if(presses[1] === '3') storeId = 3;
            else return res.status(200).send('IVR Webhook received successfully!');
        }

        if(presses[2] === '1') overs = 10;
        else if(presses[2] === '2') overs = 20;
        else if(presses[2] === '3') overs = 30;
        else if(presses[2] === '4') overs = 40;
        else if(presses[2] === '5') overs = 0;
        else return res.status(200).send('IVR Webhook received successfully!');

        if(presses[3] === '1'){
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayDate = `${year}-${month}-${day}`;
            date = todayDate;
        }else if(presses[3] === '2'){
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');
            const tomorrowDate = `${year}-${month}-${day}`;
            date = tomorrowDate;
        }else if(presses[3] === '3'){
            const dayAfterTmrw = new Date();
            dayAfterTmrw.setDate(dayAfterTmrw.getDate() + 2);
            const year = dayAfterTmrw.getFullYear();
            const month = String(dayAfterTmrw.getMonth() + 1).padStart(2, '0');
            const day = String(dayAfterTmrw.getDate()).padStart(2, '0');
            const dayAfterTmrwDate = `${year}-${month}-${day}`;
            date = dayAfterTmrwDate;
        }else {
            return res.status(200).send('IVR Webhook received successfully!');
        }

        if(presses[4] === '1') time = 'Morning';
        else if(presses[4] === '2') time = 'Afternoon';
        else if(presses[4] === '3') time = 'Evening';
        else return;
        
        if(storeId === 0 || overs === 0 || date === '' || time === ''){
            return res.status(200).send('IVR Webhook received successfully!');
        }else{
            await prisma.booking.create({
                data: {
                    date,
                    time,
                    customerId: customer_id,
                    storeId,
                    bookingType: 'Custom',
                    overs,
                    oversLeft: overs
                }
            })
        }

        return res.status(200).send('IVR Webhook received successfully!');
    }catch(err){
        console.log(err);
        return res.status(500).send('Internal Server Error');
    }
});

app.post('/enquiry', async (req, res) => {
    try{
        const {name, phone, packageId, storeId, date, time} = req.body;
        const isValidPayload = helper.isValidatePaylod(req.body, ['storeId', 'name', 'phone', 'packageId', 'date', 'time']);
        if(!isValidPayload) {
            return res.send({ status: 400, error: 'Invalid payload', error_description: 'name, phone, packageId, date, time and storeId are required.' });
        }
        const store = await prisma.store.findUnique({where: {id: parseInt(storeId)}})
        if(!store) {
            return res.send({ valid: false, error: 'Store not found.', error_description: 'Store does not exist' })
        }
       const packageExist = await prisma.package.findUnique({where: {id: parseInt(packageId)}})
        if(!packageExist) {
            return res.send({ valid: false, error: 'Package not found.', error_description: 'Package does not exist' })
        }
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phone: phone
            }
        })
        if(!existingCustomer){
            const newCustomer = await prisma.customer.create({
                data: {
                    name: name,
                    phone: phone,
                    customer_type: 'ENQUIRY'
                }
            })
            const newlead = await prisma.lead.create({
                data: {
                    customerId: newCustomer.id,
                    stage: 'New',
                    source: 'ENQUIRY',
                }
            })
        }
        const customer = await prisma.customer.findFirst({
            where: {
                phone: phone
            }
        })
        const customer_id = customer?.id;
        const booking = await prisma.booking.create({
            data: {
                date,
                time,
                customerId: customer_id,
                storeId,
                price: packageExist?.price,
                bookingType: 'Enquiry',
                packageId: packageId,
                overs: packageExist?.overs,
                oversLeft: packageExist?.overs,
            }
        })
        return res.status(200).send({valid: true, message: 'Booking received successfully!', booking});
    }catch(err){
        console.log(err);
        return res.status(500).send('Internal Server Error');
    }
})

function formatDuration(duration: number): string {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes} min ${seconds} sec`;
}

app.post('/superfonehook', async (req, res) => {
    try{
        console.log('Superfone Webhook Received:', JSON.stringify(req.body));
        const body = req.body;
        const {contact_first_name, cdr_phone, staff_phone, staff_first_name, staff_last_name, cdr_start, contact_labels, contact_products, cdr_end, cdr_duration, contact_lead_stage_name} = body;
        const customerPhone = cdr_phone.slice(-12);
        const customerName = contact_first_name;
        const staffPhone = staff_phone.slice(-12);
        const staffName = staff_first_name + ' ' + staff_last_name;
        const callDuration = formatDuration(cdr_duration);
        const callStart = new Date(cdr_start).toLocaleString();
        const callEnd = new Date(cdr_end).toLocaleString();
        if(contact_lead_stage_name){
            const stageExists= await prisma.stage.findFirst({
                where: {
                    name: contact_lead_stage_name
                }
            })
            if(!stageExists){
                const stageCreated = await prisma.stage.create({
                    data: {
                        name: contact_lead_stage_name
                    }
                })
            }
        }
        console.log(contact_lead_stage_name, 'contact_lead_stage_name');
        
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phone: customerPhone
            }
        })
        if(!existingCustomer){
            const newCustomer = await prisma.customer.create({
                data: {
                    name: customerName,
                    phone: customerPhone,
                    customer_type: 'SUPERFONE'
                }
            })
            console.log(newCustomer, 'newCustomer');
            
            const lead = await prisma.lead.create({
                data: {
                    customerId: newCustomer.id,
                    stage: contact_lead_stage_name || "Others",
                    source: 'Superfone',
                    staffName: staffName,
                    staffPhone: staffPhone,
                    callDuration: callDuration,
                    callStart: callStart,
                    callEnd: callEnd,
                }
            })
            console.log(lead, 'lead');
            
        }else {
            const oldLead = await prisma.lead.create({
                data: {
                    customerId: existingCustomer.id,
                    stage: contact_lead_stage_name || "Others",
                    source: 'Superfone',
                    staffName: staffName,
                    staffPhone: staffPhone,
                    callDuration: callDuration,
                    callStart: callStart,
                    callEnd: callEnd,
                }
            })
            console.log(oldLead, 'oldLead');
            
        }
        
        return res.status(200).send('Webhook received successfully!');
    }catch(err){
        console.log(err);
        return res.status(500).send('Internal Server Error');
    }
})

app.get('/stores', async (req, res) => {
        try {
            const stores = await prisma.store.findMany()
            return res.send({ valid: true, stores })
        } catch (err) {
            return res.send({ valid: false, error: 'Internal Server Error', error_description: 'Something went wrong' })
        }
})

app.get('/packages', async (req, res) => {
    try {
        const packages = await prisma.package.findMany()
        return res.send({ valid: true, packages })
    } catch (err) {
        return res.send({ valid: false, error: 'Internal Server Error', error_description: 'Something went wrong' })
    }
})

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
app.use('/lead', leadRouter);
//@ts-ignore
app.use('/user', middleware.UserMiddleware, userRouter)

app.use(middleware.ErrorHandler);

app.all('*', (_req, res) => {
    res.status(404).send({
        status: 404,
        error: 'Not found',
        error_description: `(${_req.url}), route or file not found.`,
    });
});

export default app;
