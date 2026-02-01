/* server.js
   Simple Express server that accepts Excel uploads, parses sheets, stores parsed
   data into MongoDB and saves original file to GridFS.
*/

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const { Readable } = require('stream');
const { GridFSBucket } = require('mongodb');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/awms';
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).catch(err => {
  console.error('MongoDB connect error', err);
  process.exit(1);
});

const db = mongoose.connection;
let bucket;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  bucket = new GridFSBucket(db.db, { bucketName: 'files' });
  console.log('Connected to MongoDB');
});

app.use(express.static(__dirname));

app.get('/health', (req, res) => res.json({ ok: true }));

// --- REST API: Employees
app.get('/api/employees', async (req, res) => {
  try {
    const docs = await db.collection('employees').find({}).toArray();
    res.json(docs);
  } catch (err) { res.status(500).json({ error: 'db error' }); }
});

app.post('/api/employees', async (req, res) => {
  try {
    const doc = { ...req.body, createdAt: new Date() };
    const result = await db.collection('employees').insertOne(doc);
    res.json({ _id: result.insertedId, ...doc });
  } catch (err) { res.status(500).json({ error: 'db error' }); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { ObjectId } = require('mongodb');
    const id = new ObjectId(req.params.id);
    await db.collection('employees').deleteOne({ _id: id });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: 'db error' }); }
});

// --- REST API: Tasks
app.get('/api/tasks', async (req, res) => {
  try { const docs = await db.collection('tasks').find({}).toArray(); res.json(docs); }
  catch (err) { res.status(500).json({ error: 'db error' }); }
});

app.post('/api/tasks', async (req, res) => {
  try { const doc = { ...req.body, createdAt: new Date() }; const r = await db.collection('tasks').insertOne(doc); res.json({ _id: r.insertedId, ...doc }); }
  catch (err) { res.status(500).json({ error: 'db error' }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try { const { ObjectId } = require('mongodb'); const id = new ObjectId(req.params.id); await db.collection('tasks').deleteOne({ _id: id }); res.json({ deleted: true }); }
  catch (err) { res.status(500).json({ error: 'db error' }); }
});

// --- REST API: Performance
app.get('/api/performance', async (req, res) => {
  try { const docs = await db.collection('performance').find({}).toArray(); res.json(docs); }
  catch (err) { res.status(500).json({ error: 'db error' }); }
});

app.post('/api/performance', async (req, res) => {
  try { const doc = { ...req.body, createdAt: new Date() }; const r = await db.collection('performance').insertOne(doc); res.json({ _id: r.insertedId, ...doc }); }
  catch (err) { res.status(500).json({ error: 'db error' }); }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Parse Excel buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheets = [];

    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
      // store one document per sheet with rows array
      await db.collection('sheets').insertOne({
        filename: req.file.originalname,
        sheetName: name,
        rows: rows,
        uploadedAt: new Date()
      });
      sheets.push({ name, rowCount: rows.length });
    }

    // Save original file to GridFS
    if (!bucket) return res.status(500).json({ error: 'Storage not initialized' });
    const readable = Readable.from(req.file.buffer);
    const uploadStream = bucket.openUploadStream(req.file.originalname, { metadata: { mime: req.file.mimetype } });
    readable.pipe(uploadStream)
      .on('error', (err) => {
        console.error('GridFS upload error', err);
      })
      .on('finish', () => {
        return res.json({ success: true, filename: req.file.originalname, sheets });
      });

  } catch (err) {
    console.error('Upload error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
