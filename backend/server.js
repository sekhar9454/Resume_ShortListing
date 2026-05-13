const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Set up multer for handling file uploads (store in memory for processing)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Gemini
// The user needs to provide GEMINI_API_KEY in their environment or .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to convert multer file buffer to Gemini's expected format
function fileToGenerativePart(file) {
    return {
        inlineData: {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype
        },
    };
}

app.post('/api/evaluate', upload.fields([
    { name: 'jdPdf', maxCount: 1 },
    { name: 'resumePdf', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files || !req.files.jdPdf || !req.files.resumePdf) {
            return res.status(400).json({ error: 'Both Job Description and Resume PDFs are required.' });
        }

        const jdFile = req.files.jdPdf[0];
        const resumeFile = req.files.resumePdf[0];

        // 1. Call Gemini to parse the PDFs
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
You are a highly accurate document parser. I have provided two PDF documents: a Job Description and a Candidate Resume.
Please analyze these documents and extract the following information.
Return ONLY a raw JSON object (no markdown, no backticks) with exactly these three keys:
1. "job_role": The specific job title or role mentioned in the Job Description. Keep it concise.
2. "job_description": The core responsibilities and requirements from the Job Description document.
3. "resume": The content of the candidate's Resume document. Clean up the text to be readable.

Make sure the JSON is perfectly valid.
        `;

        const jdPart = fileToGenerativePart(jdFile);
        const resumePart = fileToGenerativePart(resumeFile);

        console.log("Sending PDFs to Gemini for structuring...");
        const result = await model.generateContent([prompt, jdPart, resumePart]);
        let responseText = result.response.text();

        // Clean up markdown block if Gemini adds it
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        let structuredData;
        try {
            structuredData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", responseText);
            return res.status(500).json({ error: 'Failed to parse document structure from Gemini.' });
        }

        // 2. Format texts for the dual-encoder similarity model
        const jobRole = structuredData.job_role || "Unknown Role";
        const jobDescription = structuredData.job_description || "";
        const resume = structuredData.resume || "";

        // JD text combines role + description (same format as training)
        const jdText = `Role: ${jobRole}. ${jobDescription}`;
        console.log("Extracted Role:", jobRole);

        // 3. Call Python script for inference
        console.log("Running inference model...");
        const pythonProcess = spawn('python3', ['inference.py']);

        let predictionData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            predictionData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python script exited with code", code);
                console.error(errorData);
                return res.status(500).json({ error: 'Model inference failed.' });
            }

            try {
                // predictionData should contain the JSON output from inference.py
                const result = JSON.parse(predictionData.trim().split('\n').pop()); // Get last line in case of warnings

                if (result.status === "success") {
                    res.json({
                        role: jobRole,
                        prediction: result.prediction,     // 1 for Selected, 0 for Not Selected
                        confidence: result.confidence      // 0.0 to 1.0
                    });
                } else {
                    res.status(500).json({ error: result.error || 'Inference failed' });
                }
            } catch (e) {
                console.error("Failed to parse Python output:", predictionData);
                res.status(500).json({ error: 'Invalid response from inference model.' });
            }
        });

        // Send separate resume and JD texts to the Python script
        pythonProcess.stdin.write(JSON.stringify({ resume: resume, jd: jdText }));
        pythonProcess.stdin.end();

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'An unexpected error occurred processing the request.' });
    }
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
