const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const expenseSchema = require('../models/expense');
const { processTextWithLLM } = require('../services/llmProcessor');
const { jsonrepair } = require('jsonrepair');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    let extractedText = '';

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("Got the file:", file);

    if (file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      extractedText = (await pdfParse(dataBuffer)).text;
    } else {
      extractedText = (await Tesseract.recognize(file.path, 'eng')).data.text;
    }
    if (!extractedText || extractedText.trim().length < 10) {
      return res.status(400).json({ error: 'Image/pdf did not contain valid text.' });
    }
    
    // Process text using LLM
    let structuredDataRaw = await processTextWithLLM(extractedText);
    // console.log('structuredDataRaw type:', typeof structuredDataRaw);
    // console.log('structuredDataRaw content:', structuredDataRaw);
    structuredDataRaw = structuredDataRaw.replace(/```json|```/g, '').trim();
    console.log('structuredDataRaw content:', structuredDataRaw);

    let parsedData;
    try {
      const repaired = jsonrepair(structuredDataRaw);
      parsedData = JSON.parse(repaired);;
      if (!Array.isArray(parsedData)) {
        return res.status(400).json({ error: 'Expected an array of objects' });
      }
    } catch (error) {
      console.error("Error parsing LLM JSON:", error);
      return res.status(500).json({ error: 'Error parsing LLM JSON' });
    }

    // Attach user ID to each entry
  const enrichedData = parsedData.map(item => ({
    ...item,
    user: req.user._id || req.user.id,
    sourceType: 'pdf/image'
  }));
  console.log("Enriched Data:", enrichedData);

  const savedData = await expenseSchema.insertMany(enrichedData);

    res.json({ message: 'Data extracted and saved successfully', data: savedData });
  } catch (error) {
    console.error("File processing error:", error);
    res.status(500).json({ error: 'Error processing file' });
  }
});

module.exports = router;
