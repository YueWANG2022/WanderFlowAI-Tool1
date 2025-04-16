const questions = [
  { label: "What is your name?", type: "text" },
  { label: "Select your age group", type: "select", options: ["18–24", "25–34", "35–44", "45–54", "55–64", "65+"] },
  { label: "Select your gender", type: "select", options: ["Female", "Male", "Non-binary", "Prefer not to say"] },
  { label: "What's your nationality?", type: "text" },
  { label: "Where do you want to live if you have infinite resources?", type: "text" },
  { label: "What’s the cultural symbol that first pops to your mind?", type: "text" },
  { label: "What's the number one goal on your bucket list?", type: "text" },
  { label: "What sort of healthcare amenities do you expect when traveling?", type: "text" },
  { label: "How much is your travel budget?", type: "select", options: ["$500", "$1000", "$1500", "$2000", "$3000", "$5000", "$7000", "$10000"] },
  { label: "What currency or financial arrangements do you typically use while traveling?", type: "select", options: ["Local currency", "Credit card", "Revolut", "Wise", "Cash", "Multi-currency account", "Digital wallets", "Prepaid travel card", "PayPal", "ATM use"] },
  { label: "What types of insurance coverage are you currently using or interested in?", type: "select", options: ["Travel only", "Medical only", "Comprehensive", "Basic travel", "VIP insurance"] },
  { label: "Have you encountered any issues with insurance claims during previous travels?", type: "text" },
];

let answers = [];

function renderAllQuestions() {
  const container = document.getElementById("question-container");
  container.innerHTML = "";
  questions.forEach((q, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "question";

    const label = document.createElement("label");
    label.innerText = q.label;
    wrapper.appendChild(label);

    let input;
    if (q.type === "text") {
      input = document.createElement("input");
      input.type = "text";
      input.name = `q${index}`;
      input.style.width = "100%";
      input.style.padding = "8px";
    } else if (q.type === "select") {
      input = document.createElement("select");
      input.name = `q${index}`;
      input.style.width = "100%";
      input.style.padding = "8px";
      q.options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt;
        option.text = opt;
        input.appendChild(option);
      });
    }

    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });
}

function getApiKeys() {
  return {
    ORS_API_KEY: document.getElementById("orsApiKey").value.trim(),
    GEMINI_API_KEY: document.getElementById("geminiApiKey").value.trim(),
    OPENAI_API_KEY: document.getElementById("openaiApiKey").value.trim()
  };
}

function submitAnswers(e) {
  e.preventDefault();
  answers = [];
  questions.forEach((_, index) => {
    const val = document.querySelector(`[name="q${index}"]`).value || "";
    answers.push(val);
  });

  showResults();
}

function showResults() {
  document.getElementById("questionnaire-form").style.display = "none";

  const csvHeader = questions.map((_, i) => `Q${i + 1}`).join(",");
  const csvRow = answers.map(value => `"${value.replace(/"/g, '""')}"`).join(",");
  const csvContent = `${csvHeader}\n${csvRow}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = `<h3>Your Answers:</h3>
    <ul>${answers.map((v, i) => `<li><strong>Q${i + 1}</strong>: ${v}</li>`).join("")}</ul>
    <a href="${url}" download="questionnaire_results.csv"><button>Download CSV</button></a>
  `;
  resultsDiv.style.display = "block";

  fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answers,
      api_keys: getApiKeys()
    })
  })
  .then(res => res.json())
  .then(data => {
    const message = document.createElement("p");
    message.textContent = `✅ Your data has been saved to ${data.saved_as}`;
    message.style.marginTop = "1rem";
    message.style.color = "green";
    resultsDiv.appendChild(message);
    document.getElementById("find-mate-button").style.display = "inline-block";
  })
  .catch(err => console.error("❌ Failed to save to backend:", err));
}

function fetchRecommendations() {
  const button = document.getElementById("find-mate-button");
  button.disabled = true;
  button.textContent = "🔍 Finding...";

  fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answers,
      api_keys: getApiKeys()
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.recommendations) {
      console.error("❌ Server responded with error:", data);
      alert("Sorry, there was a problem finding matches. Please check your API key and try again.");
      return;
    }
    // render recommendations...
  })
  .catch(err => {
    console.error("❌ Failed to fetch recommendations:", err);
    button.textContent = "❌ Try again";
  });
}

function restartSurvey() {
  answers = [];
  document.getElementById("questionnaire-form").style.display = "block";
  document.getElementById("results").style.display = "none";
  document.getElementById("find-mate-button").style.display = "none";
  renderAllQuestions();
}

function submitRandomProfile() {
  answers = [
    "Meimei Han", "18–24", "Female", "China", "Swiss",
    "Cheese Fondue", "Climb Alps Mountain", "Hospital",
    "$1000", "Credit card", "Medical only", "No issues"
  ];
  showResults();
}

renderAllQuestions();
