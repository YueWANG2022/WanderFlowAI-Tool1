// netlify/functions/submit.js

const { DateTime } = require("luxon");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const answers = body.answers;
    const api_keys = body.api_keys;

    if (!answers || !Array.isArray(answers)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or invalid 'answers' array." })
      };
    }

    // Just simulate file naming for display purposes
    const timestamp = DateTime.now().toFormat("yyyyLLdd_HHmmss");
    const filename = `user_answer_${timestamp}.json`;

    // Optionally: save to database or Netlify Blob Storage here
    // For now, just return the generated filename

    return {
      statusCode: 200,
      body: JSON.stringify({ saved_as: filename })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};