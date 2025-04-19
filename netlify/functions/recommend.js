const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const axios = require("axios");

exports.handler = async (event) => {
  try {
    console.log("🔔 /recommend function triggered");
    
    const { answers, api_keys } = JSON.parse(event.body);
    const openaiKey = api_keys.OPENAI_API_KEY;

    console.log("📨 Received answers:", answers);
    console.log("🔐 Received OpenAI API key (first 6 chars):", openaiKey?.slice(0, 6));

    if (!openaiKey) {
      console.warn("❌ Missing OpenAI API key.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing OpenAI API key." })
      };
    }

    // Load user_pool.csv from function directory
    console.log("📁 Reading user_pool.csv...");
    const csvPath = path.join(__dirname, "user_pool.csv");
    const csv = fs.readFileSync(csvPath, "utf8");
    const parsed = Papa.parse(csv, { header: false });
    const userPool = parsed.data.filter(row => row.length > 0); // remove empty rows

    console.log("✅ Loaded user pool with", userPool.length, "rows");

    // Embed incoming answers
    console.log("⚙️ Embedding incoming user answers...");
    const embeddedAnswers = await embedList(answers, openaiKey);
    console.log("✅ Embedded", embeddedAnswers.length, "answers");

    // Embed each user in user pool
    console.log("🔄 Embedding each user from user_pool...");
    const embeddedPool = [];
    for (const [i, row] of userPool.entries()) {
      console.log(`🔢 Embedding user ${i + 1}/${userPool.length}:`, row);
      const rowEmbed = await embedList(row, openaiKey);
      embeddedPool.push(rowEmbed);
    }
    console.log("✅ Finished embedding user pool");

    // Calculate cosine similarity row-wise
    console.log("🧮 Calculating similarity matrix...");
    const similarityMatrix = embeddedPool.map(row =>
      row.map((vec, i) => cosineSimilarity(vec, embeddedAnswers[i]))
    );
    console.log("✅ Similarity matrix complete");

    // Weighted score calculation
    const WEIGHTS = [0.0, 0.2, 0.1, 0.3, 0.1, 0.3, 0.3, 0.1, 0.3, 0.1, 0.1, 0.1];
    const weightedScores = similarityMatrix.map((row, i) => {
      const score = row.reduce((acc, val, j) => acc + val * (WEIGHTS[j] || 0), 0);
      console.log(`🎯 User ${i + 1} weighted score:`, score.toFixed(4));
      return score;
    });

    // Rank top matches
    const topMatches = weightedScores
      .map((score, idx) => ({ score, index: idx, name: userPool[idx][0] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log("🏆 Top matches:", topMatches);

    return {
      statusCode: 200,
      body: JSON.stringify({ recommendations: topMatches })
    };
  } catch (err) {
    console.error("🔥 Error in /recommend handler 🔥");
    console.error("Full error object:", err);

    const errorDetails = err.response?.data || err.stack || err.toString();

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Unknown error",
        details: errorDetails
      })
    };
  }
};

async function embedList(list, apiKey) {
  console.log("🔗 Calling OpenAI embedding API with list:", list);
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
  console.log("✅ OpenAI returned", response.data.data.length, "embeddings");
  return response.data.data.map(d => d.embedding);
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  const sim = dot / (magA * magB);
  return isNaN(sim) ? 0 : sim;
}
