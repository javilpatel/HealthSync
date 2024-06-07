require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fetch = require('node-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


app.post('/sensor-data', async (req, res) => {
    try {
      const { timestamp, device_id, sensor_type, user_id, additional_info, accelX, accelY, accelZ, steps, heartrate, spo2, bodytemp } = req.body;
      const result = await pool.query(
        `INSERT INTO sensor_data (timestamp, device_id, sensor_type, user_id, additional_info, accelX, accelY, accelZ, steps, heartrate, spo2, bodytemp) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         RETURNING *`,
        [timestamp, device_id, sensor_type, user_id, JSON.stringify(additional_info), accelX, accelY, accelZ, steps, heartrate, spo2, bodytemp]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
});


app.get('/', (req, res) => {
    res.send('Health Monitoring Backend Server is running!');
});  

app.get('/latest-heart-rate', async (req, res) => {
    try {
        const result = await pool.query('SELECT heartrate FROM sensor_data ORDER BY timestamp DESC LIMIT 1');
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/latest-temperature', async (req, res) => {
    try {
        const result = await pool.query('SELECT bodytemp FROM sensor_data ORDER BY timestamp DESC LIMIT 1');
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/today-steps', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT SUM(steps) AS totalSteps FROM sensor_data WHERE timestamp >= CURRENT_DATE'
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/daily-data', async (req, res) => {
    const date = new Date();
    const currentDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;

    try {
        const queries = `
            SELECT
                date_trunc('hour', timestamp) AS hour,
                AVG(heartrate) AS avgHeartRate,
                AVG(bodytemp) AS avgTemp,
                SUM(steps) AS totalSteps
            FROM sensor_data
            WHERE timestamp >= '${currentDate}'
            GROUP BY 1
            ORDER BY 1;
        `;
        const result = await pool.query(queries);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/weekly-data', async (req, res) => {
    const date = new Date();
    const startDate = new Date(date.setDate(date.getDate() - date.getDay())); // This sets to the start of this week

    try {
        const queries = `
        SELECT
        date_trunc('day', timestamp) AS day,
        AVG(heartrate) AS avgHeartRate,
        AVG(bodytemp) AS avgTemp,
        SUM(steps) AS totalSteps
    FROM sensor_data
    WHERE timestamp >= '${startDate.toISOString().split('T')[0]}'
    GROUP BY 1
    ORDER BY 1;
        `;
        const result = await pool.query(queries);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


const getDailyData = async () => {
    const date = new Date();
    const currentDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`; // Formats current date as YYYY-MM-DD

    const queries = {
        heartRate: `SELECT avg(heartrate) as averageHeartrate FROM sensor_data WHERE timestamp >= '${currentDate}'`,
        temperature: `SELECT avg(bodytemp) as averageTemperature FROM sensor_data WHERE timestamp >= '${currentDate}'`,
        steps: `SELECT sum(steps) as totalSteps FROM sensor_data WHERE timestamp >= '${currentDate}'`
    };

    try {
        const results = await Promise.all([
            pool.query(queries.heartRate),
            pool.query(queries.temperature),
            pool.query(queries.steps)
        ]);

        return {
            heartRate: results[0].rows[0].averageheartrate.toFixed(2),
            temperature: results[1].rows[0].averagetemperature.toFixed(2),
            steps: results[2].rows[0].totalsteps
        };
    } catch (err) {
        console.error('Error in fetching daily data:', err);
        throw err;
    }
};


async function fetchOpenAIRecommendation(input) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "system", content: "Analyze the following data from an IoT health wristband and provide health recommendations based on the metrics of heart rate, body temperature, and physical activity: Offers health advice and proactive alerts based on these data inputs, communicating in a positive and supportive manner. Provide actionable recommendations to enhance their health based on the analysis of their physical activity, temperature, and heart rate. Also reccomend workout routines." }, { role: "user", content: input }]
            })
        });

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (err) {
        console.error('Error fetching recommendation from OpenAI:', err);
        throw err;
    }
}

app.get('/get-recommendations', async (req, res) => {
    try {
        const { heartRate, temperature, steps } = await getDailyData();

        let inputDetails = `Average heart rate today is ${heartRate} BPM, average body temperature today is ${temperature} °C, and total steps taken today are ${steps}.`;
        const recommendation = await fetchOpenAIRecommendation(inputDetails);
        res.json({ recommendation });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
