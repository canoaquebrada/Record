const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/recordings');

const recordingSchema = new mongoose.Schema({
  user: String,
  date: Date,
  type: String,
  description: String
});

const Recording = mongoose.model('Recording', recordingSchema);

app.use('/auth', authRoutes);

app.post('/recordings', authMiddleware, async (req, res) => {
  const recording = new Recording(req.body);
  await recording.save();
  res.send(recording);
});

app.get('/recordings', authMiddleware, async (req, res) => {
  const { startDate, endDate, page = 1, limit = 10 } = req.query;
  const query = {};

  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const skip = (page - 1) * limit;

  const recordings = await Recording.find(query)
    .skip(skip)
    .limit(Number(limit));

  const total = await Recording.countDocuments(query);

  res.send({ recordings, total });
});

app.get('/reports', authMiddleware, async (req, res) => {
  const { period } = req.query;
  const recordings = await Recording.find();

  let groupedData;

  if (period === 'monthly') {
    groupedData = recordings.reduce((acc, record) => {
      const month = moment(record.date).format('YYYY-MM');
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(record);
      return acc;
    }, {});
  } else if (period === 'weekly') {
    groupedData = recordings.reduce((acc, record) => {
      const week = moment(record.date).startOf('isoWeek').format('YYYY-MM-DD');
      if (!acc[week]) {
        acc[week] = [];
      }
      acc[week].push(record);
      return acc;
    }, {});
  }

  res.send(groupedData);
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
