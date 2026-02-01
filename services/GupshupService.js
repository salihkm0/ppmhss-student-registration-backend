// const axios = require('axios');
// const dotenv = require('dotenv');
// const fs = require('fs');
// dotenv.config();

// class GupshupService {
//     constructor() {
//         this.apiKey = process.env.GUPSHUP_API_KEY;
//         this.appName = process.env.GUPSHUP_APP_NAME || 'ppmhss';
//         this.baseURL = 'https://api.gupshup.io/sm/api/v1';
//         this.enabled = process.env.ENABLE_WHATSAPP === 'true' && this.apiKey;
        
//         if (this.enabled) {
//             console.log('✅ Gupshup WhatsApp Service Initialized');
//             console.log(`📱 App Name: ${this.appName}`);
//         } else {
//             console.log('⚠️ Gupshup WhatsApp Service Disabled');
//         }
//     }

//     async sendWhatsApp(to, message, template = null) {
//         if (!this.enabled) {
//             return this.simulateWhatsApp(to, message);
//         }

//         const phoneNumber = `91${to}`; // Indian number format
        
//         try {
//             let payload = {
//                 channel: 'whatsapp',
//                 source: '917834811114', // Your Gupshup registered number
//                 destination: phoneNumber,
//                 message: {
//                     type: 'text',
//                     text: message
//                 },
//                 src.name: this.appName
//             };

//             // If using template
//             if (template) {
//                 payload.message = {
//                     type: 'template',
//                     template: {
//                         name: template.name,
//                         language: {
//                             code: 'en',
//                             policy: 'deterministic'
//                         },
//                         components: template.components || []
//                     }
//                 };
//             }

//             console.log('📤 Sending WhatsApp via Gupshup...');
//             console.log(`To: ${phoneNumber}`);
//             console.log(`Message: ${message.substring(0, 50)}...`);

//             const response = await axios.post(
//                 `${this.baseURL}/msg`,
//                 payload,
//                 {
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'apikey': this.apiKey,
//                         'Cache-Control': 'no-cache'
//                     }
//                 }
//             );

//             console.log(`✅ WhatsApp sent! Response:`, response.data);
            
//             // Log success
//             this.logNotification({
//                 type: 'WhatsApp',
//                 status: 'sent',
//                 to: phoneNumber,
//                 message: message,
//                 response: response.data,
//                 timestamp: new Date().toISOString()
//             });

//             return {
//                 success: true,
//                 messageId: response.data.messageId,
//                 status: 'sent'
//             };

//         } catch (error) {
//             console.error('❌ Gupshup WhatsApp failed:', error.response?.data || error.message);
            
//             // Log error
//             this.logNotification({
//                 type: 'WhatsApp',
//                 status: 'failed',
//                 to: phoneNumber,
//                 message: message,
//                 error: error.response?.data || error.message,
//                 timestamp: new Date().toISOString()
//             });

//             // Fallback to simulation
//             return this.simulateWhatsApp(to, message);
//         }
//     }

//     async sendRegistrationNotification(student) {
//         const message = `Dear ${student.name}, your registration is successful!

// 📝 Application No: ${student.applicationNo}
// 🔑 Registration Code: ${student.registrationCode}

// Keep this information safe for future reference.

// - PPMHSS Kottukkara`;

//         return await this.sendWhatsApp(student.phoneNo, message);
//     }

//     simulateWhatsApp(to, message) {
//         console.log('='.repeat(60));
//         console.log('💬 WHATSAPP NOTIFICATION (SIMULATED)');
//         console.log('='.repeat(60));
//         console.log(`To: +91${to}`);
//         console.log(`Message: ${message}`);
//         console.log('='.repeat(60));

//         this.logNotification({
//             type: 'WhatsApp',
//             status: 'simulated',
//             to: `91${to}`,
//             message: message,
//             timestamp: new Date().toISOString()
//         });

//         return {
//             success: true,
//             status: 'simulated',
//             message: 'WhatsApp simulated for development'
//         };
//     }

//     logNotification(data) {
//         try {
//             const logEntry = JSON.stringify(data) + '\n';
//             fs.appendFileSync('whatsapp_logs.json', logEntry);
            
//             // Also log to console file
//             fs.appendFileSync('notifications.log', 
//                 `[${new Date().toLocaleString()}] ${data.type} ${data.status} to ${data.to}\n`
//             );
//         } catch (error) {
//             console.error('Logging error:', error.message);
//         }
//     }

//     async getBalance() {
//         if (!this.enabled) {
//             return { balance: 'N/A (simulation mode)' };
//         }

//         try {
//             const response = await axios.get(
//                 `${this.baseURL}/wallet/balance`,
//                 {
//                     headers: {
//                         'apikey': this.apiKey
//                     }
//                 }
//             );
//             return response.data;
//         } catch (error) {
//             console.error('Balance check failed:', error.message);
//             return { error: error.message };
//         }
//     }
// }

// module.exports = GupshupService;