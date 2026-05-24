require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');
const moment = require('moment-timezone');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
let isFirebaseInitialized = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    console.log("Firebase Admin Initialized Successfully");
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is missing in .env");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error.message);
}

const db = isFirebaseInitialized ? admin.firestore() : null;
const messaging = isFirebaseInitialized ? admin.messaging() : null;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateMorningBulletin(city, weatherData) {
  if (!GEMINI_API_KEY) {
    return `صباح الخير! الحرارة اليوم ${weatherData.current?.temperature_2m || '--'}° والعظمى ${weatherData.daily?.temperature_2m_max?.[0] || '--'}°. نتمنى لك يوماً سعيداً!`;
  }
  try {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const prompt = `أنت مذيع ومحلل طقس. اكتب رسالة إشعار صباحية ملهمة ومختصرة جداً (سطر واحد فقط) لمدينة ${city}.
      البيانات: الحرارة الآن ${weatherData.current?.temperature_2m}°C. العظمى المتوقعة ${weatherData.daily?.temperature_2m_max?.[0]}°C والصغرى ${weatherData.daily?.temperature_2m_min?.[0]}°C.
      لا تستخدم نجوم (**) للتنسيق أبدًا.`;
    
    const response = await axios.post(API_URL, { contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || `صباح الخير! الحرارة اليوم ${weatherData.current?.temperature_2m}°C.`;
  } catch (e) {
    console.error("Gemini Error:", e.message);
    return `صباح الخير! الحرارة اليوم ${weatherData.current?.temperature_2m}°C.`;
  }
}

app.get('/api/trigger-alerts', async (req, res) => {
  if (!isFirebaseInitialized) return res.status(500).send('Firebase not initialized');
  console.log("Cron Job Triggered at", new Date().toISOString());

  try {
    const usersSnapshot = await db.collection('users').get();
    let sentCount = 0;

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const token = data.fcmToken;
      if (!token) continue;

      const city = data.selectedCity;
      if (!city || !city.lat || !city.lon) continue;

      // Check Morning Config
      const morningConfig = data.morningConfig || {};
      const targetTime = morningConfig.time || '07:00';
      
      const now = moment().tz('Africa/Cairo');
      const targetMoment = moment.tz(`${now.format('YYYY-MM-DD')} ${targetTime}`, 'YYYY-MM-DD HH:mm', 'Africa/Cairo');
      
      const diffMins = now.diff(targetMoment, 'minutes');
      const isMorningTime = diffMins >= 0 && diffMins < 30; // within 30 mins

      const lastMorningDate = data.lastMorningSentDate;
      const todayDate = now.format('YYYY-MM-DD');

      let weatherData = null;

      // 1. Send Morning Briefing
      if (isMorningTime && lastMorningDate !== todayDate) {
        try {
          const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
          weatherData = weatherRes.data;

          const text = await generateMorningBulletin(city.name, weatherData);
          
          await messaging.send({
            token: token,
            notification: {
              title: `النشرة الصباحية - ${city.name} ☀️`,
              body: text
            }
          });
          
          await doc.ref.update({ lastMorningSentDate: todayDate });
          sentCount++;
          console.log(`Sent morning briefing to ${doc.id}`);
        } catch(e) {
          console.error(`Error sending morning to ${doc.id}`, e.message);
        }
      }

      // 2. Send Severe Weather Alert
      const alertEnabled = data.alertEnabled || data.followMeEnabled;
      const lastAlertTimestamp = data.lastAlertTimestamp || 0;
      const hoursSinceLastAlert = (Date.now() - lastAlertTimestamp) / (1000 * 60 * 60);

      if (alertEnabled && hoursSinceLastAlert > 12) {
        try {
          if (!weatherData) {
            const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=weathercode,precipitation_sum,wind_gusts_10m_max&timezone=auto`);
            weatherData = weatherRes.data;
          }

          const daily = weatherData.daily;
          if (daily) {
            const rain = daily.precipitation_sum?.[0] || 0;
            const wind = daily.wind_gusts_10m_max?.[0] || 0;
            const code = daily.weathercode?.[0] || 0;

            let alertTitle = null;
            let alertBody = null;

            if (wind >= 40) {
              alertTitle = "تحذير رياح نشطة 💨"; alertBody = `رياح تصل لـ ${Math.round(wind)} كم/س تقترب من منطقتك.`;
            } else if (rain >= 10) {
              alertTitle = "أمطار غزيرة 🌧️"; alertBody = `متوقع هطول أمطار غزيرة في منطقتك. خذ حذرك.`;
            } else if ([95, 96, 99].includes(code)) {
              alertTitle = "عواصف رعدية ⛈️"; alertBody = `احذر عواصف رعدية متوقعة قريباً.`;
            }

            if (alertTitle) {
              await messaging.send({
                token: token,
                notification: { title: alertTitle, body: alertBody }
              });
              await doc.ref.update({ lastAlertTimestamp: Date.now() });
              sentCount++;
              console.log(`Sent alert to ${doc.id}`);
            }
          }
        } catch(e) {
          console.error(`Error sending alert to ${doc.id}`, e.message);
        }
      }
    }

    res.status(200).send(`Cron finished successfully. Sent ${sentCount} notifications.`);
  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).send('Error running cron');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Weather Pro Backend running on port ${PORT}`);
});
