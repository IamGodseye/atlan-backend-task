import express from "express";
import { faker } from '@faker-js/faker';
import User from '../models/user'
import { fileURLToPath } from "url";
import user from "../models/user";
const fs=require('fs')
const path=require('path')
const RequestValidator = require('request-validator-js');
const converter = require('json-2-csv');
const fast2sms=require('fast-two-sms')

const router = express.Router();

// 1. find slang as per local language 
// was not able to find any working api as had no VISA card 🥲 but here is my approach:
// get keyword and language from request
// generated fake data to check 
// find all occurences of the slang
// return indexes of all occurences to show that row 
const findLocalSlang = async(req,res)=>{
    try{
        const {keyword,language} =req.body;
        // પ્રશિક્ષક is gujarati word for instructor
        const translatedSlang= 'પ્રશિક્ષક' // await translate(keyword,language)
        
        let data=[];
        for(let i=0;i<10;i++){
            data.push(faker.word.noun());
            if(i===5 || i==7){
                data.push('પ્રશિક્ષક')
            }
        }

        // logic to find all the occurences of translated Slang from the array
        const find=data.map((e, i) => e === translatedSlang ? i : '').filter(String)

        // returns index of occurence of translated Slang as an array in the response
        return res.json({success:true, data:find, message:'found the slang in local language in current responses'})
    }
    catch(error){
        console.log('Error in find-slang-local =>', error);
        return res.json({success:false,
            message:error.message||'Something went wrong'})
    }
}
router.post('/find-slang-local',findLocalSlang)


// 2. validate as per buisness logic
// To be honest for this task a request validator makes things much easier
// so here we can basically write some rules to check on request by default 
// then apply the buisness logic 
const validator=async (req,res)=>{
    try{
    // init for validator    
    const request = new RequestValidator.RequestValidator();
    // dummy data
    const user={
        "name":"Ajay Ghiyad",
        "email":"Katelynn_Kub92@yahoo.com",
        "monthlySalary":"120000",
        "monthlySavings":"1100000",
    }

    let errors = request.validate(user,{
        'name': 'required|string|max:255',
        'monthlySavings': 'required',
        'monthlySalary': 'required',
    });
    // if there are errors as per validator logic throw them
    if(errors.errors==={}) throw errors

    // buisness logic
    if(isNaN(user.monthlySalary)) throw new Error('monthly salary should be an number')
    if(isNaN(user.monthlySavings)) throw new Error('monthly savings should be an number')
    if(user.monthlySavings>user.monthlySalary) throw new Error('savings cant be greater than salary')
    
    // return success true if validated
    return res.json({success:true, message: 'validated as per buisness logic'})
    }
    catch(error){
        console.log('Error in validate =>',error);
        return res.json({success:false, message: error.message || JSON.stringify(error) ||'Something went wrong'})
    }
}
router.get('/validate',validator)

// 3. export to csv
// get data from user db
// get relevent data
// convert array to csv
// save file in public folder
// resposnse.download to show the file
const convertToCsv = (arr) => {
    const keys = Object.keys(arr[0]);
    const replacer = (_key, value) => value === null ? '' : value;
    const processRow = row => keys.map(key => JSON.stringify(row[key], replacer)).join(',');
    return [ keys.join(','), ...arr.map(processRow) ].join('\r\n');
};

const exportToCSV= async (req,res)=>{
    try{
        const data= await User.find({}).exec();
        // console.log(data);
        const userData=[];
        for(let i=0;i<data.length;i++){
            const {name, email, monthlySalary, monthlySavings}=data[i]
            userData.push({
                name,
                email,
                monthlySalary,
                monthlySavings
            })
        }
        const filePath='public/data.csv'   
        const csv = convertToCsv(userData)
        
        // write csv file on the given path
        fs.writeFileSync(filePath,csv)
        
        return res.download(filePath)
    }
    catch(error){
        console.log('Error in /export-data-to-csv =>', error);
        return res.json({success:false,
            message:error.message||'Something went wrong'})
    }
}
router.get('/export-to-csv', exportToCSV)


// 4. send sms 
// used fast-two-sms for this
// defined message structure
// call on fast-two-sms api
// response
const sendSms = async (req,res) => {
    try{
        // get relevent data from request
        const {email,  mobileNumber, name, monthlySalary, monthlySavings} = req.body;

        // message structure
        const options = { authorization: process.env.API_KEY, 
            message: `Data received from Customer :\n 
                    Email : ${email}\n
                    Mobile Number : ${mobileNumber}\n
                    Name : ${name}\n
                    Monthly Income : ${monthlySalary}\n
                    Monthly Savings : ${monthlySavings}\n
                    Thank you.`,
            numbers: [mobileNumber] };

        // api call
        const response = await fast2sms.sendMessage(options); 
        // response
        return res.json({success:true, message: response.message})
        }
        catch(error){
            console.log('Error on /send-sms =>',error)
            return res.json({success:false,
                message:error.message||'Something went wrong'})
        }
}
router.post('/send-sms',sendSms)

module.exports = router;