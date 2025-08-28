// server.js
// This Node.js server acts as a proxy to forward requests to the Zapier webhook,
// bypassing the browser's CORS policy.

// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Using node-fetch for server-side HTTP requests
const cors = require('cors'); // Middleware to allow cross-origin requests from your front-end

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 3000; // Use port 3000 or an environment variable

// Configure middleware
app.use(cors()); // Allow all CORS requests for now. In production, you would specify the origin: cors({ origin: 'https://doctor-booking-olive.vercel.app' })
app.use(bodyParser.json()); // To parse incoming JSON data
app.use(bodyParser.urlencoded({ extended: true })); // To parse form-urlencoded data

// Define the API endpoint that your front-end will call
app.post('/api/book-appointment', async (req, res) => {
    console.log('Received request from front-end:', req.body);

    const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/24388341/uhd4dis/';

    try {
        // Forward the request to Zapier
        const zapierResponse = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: {
                // Zapier accepts application/json
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body) // Send the exact same JSON data from the front-end
        });

        const data = await zapierResponse.json();
        console.log('Response from Zapier:', data);

        // Send the response from Zapier back to the front-end
        res.status(zapierResponse.status).json(data);
    } catch (error) {
        console.error('Error forwarding request to Zapier:', error);
        // If there's an error, send an error response back to the front-end
        res.status(500).json({
            error: 'Failed to book appointment',
            details: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
