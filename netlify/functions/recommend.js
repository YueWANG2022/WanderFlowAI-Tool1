// netlify/functions/recommend.js

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const axios = require("axios");

exports.handler = async (event) => {
  try {
    const { answers, api_keys } = JSON.parse(event.body);
    const openaiKey = api_keys.OPENAI_API_KEY;

    if (!openaiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing OpenAI API key." })
      };
    }

    // Load user_pool.csv from function directory
    const csvPath = path.join(__dirname, "user_pool.csv");
    const csv = fs.readFileSync(csvPath, "utf8");
    const parsed = Papa.parse(csv, { header: false });
    const userPool = parsed.data.filter(row => row.length > 0); // remove empty rows

    // Embed incoming answers
    const embeddedAnswers = await embedList(answers, openaiKey);

    // Embed each user in user pool
    const embeddedPool = [];
    for (const row of userPool) {
      const rowEmbed = await embedList(row, openaiKey);
      embeddedPool.push(rowEmbed);
    }

    // Calculate cosine similarity row-wise
    const similarityMatrix = embeddedPool.map(row =>
      row.map((vec, i) => cosineSimilarity(vec, embeddedAnswers[i]))
    );

    const WEIGHTS = [0.0, 0.2, 0.1, 0.3, 0.1, 0.3, 0.3, 0.1, 0.3, 0.1, 0.1, 0.1];
    const weightedScores = similarityMatrix.map(row =>
      row.reduce((acc, val, i) => acc + val * (WEIGHTS[i] || 0), 0)
    );

    const topMatches = weightedScores
      .map((score, idx) => ({ score, index: idx, name: userPool[idx][0] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      statusCode: 200,
      body: JSON.stringify({ recommendations: topMatches })
    };
  } catch (err) {
    console.error("🔥 Error in /recommend handler 🔥");
    console.error("Full error object:", err);
    // Optional: handle known structure for axios errors
    const errorDetails = err.response?.data || err.stack || err.toString();

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Unknown error",
        details: errorDetails
      })
    };
}


async function embedList(list, apiKey) {
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      input: list.map(String),
      model: "text-embedding-ada-002"
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.data.map(d => d.embedding);
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}
