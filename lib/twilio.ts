import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendNotification(to: string, message: string, channel: 'sms' | 'whatsapp') {
  const from = channel === 'whatsapp' ? 'whatsapp:' + process.env.TWILIO_PHONE_NUMBER : process.env.TWILIO_PHONE_NUMBER;
  await client.messages.create({ from, to: channel === 'whatsapp' ? 'whatsapp:' + to : to, body: message });
}