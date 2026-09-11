// =========================================================
// ChurnGuard AI • Client Controller & Analytics Engine
// =========================================================

const AWS_LAMBDA_URL = "https://jcff4gbgqeadn3benrbofjdshy0hdcdl.lambda-url.ap-south-1.on.aws/";
const LOCAL_API_URL = "http://localhost:8000/predict";

let API_URL = AWS_LAMBDA_URL;

// =========================================================
// Personas for 1-Click Testing
// =========================================================

const PERSONAS = {
    high_risk: {
        customer_id: 104821,
        age: 38,
        gender: "Male",
        city: "Delhi",
        tenure_months: 6,
        avg_order_value: 1200,
        total_orders: 8,
        last_purchase_days_ago: 180,
        support_tickets: 9,
        subscription_type: "Basic"
    },
    medium_risk: {
        customer_id: 102145,
        age: 29,
        gender: "Female",
        city: "Bangalore",
        tenure_months: 18,
        avg_order_value: 3200,
        total_orders: 45,
        last_purchase_days_ago: 65,
        support_tickets: 3,
        subscription_type: "Silver"
    },
    loyal_vip: {
        customer_id: 100001,
        age: 42,
        gender: "Female",
        city: "Mumbai",
        tenure_months: 36,
        avg_order_value: 7800,
        total_orders: 160,
        last_purchase_days_ago: 8,
        support_tickets: 1,
        subscription_type: "Gold"
    },
    new_user: {
        customer_id: 109982,
        age: 24,
        gender: "Male",
        city: "Pune",
        tenure_months: 1,
        avg_order_value: 1800,
        total_orders: 2,
        last_purchase_days_ago: 12,
        support_tickets: 0,
        subscription_type: "Basic"
    }
};

// =========================================================
// DOM Elements
// =========================================================

const predictionForm = document.getElementById("predictionForm");
const predictButton = document.getElementById("predictButton");
const resultDiv = document.getElementById("result");
const financialRoi = document.getElementById("financialRoi");
const riskDrivers = document.getElementById("riskDrivers");
const retentionPlan = document.getElementById("retentionPlan");
const retentionActionsList = document.getElementById("retentionActionsList");
const randomizeBtn = document.getElementById("randomizeBtn");
const toast = document.getElementById("toastNotification");

const recencyValue = document.getElementById("recencyValue");
const supportValue = document.getElementById("supportValue");
const tenureValue = document.getElementById("tenureValue");
const ordersValue = document.getElementById("ordersValue");

// =========================================================
// Tab Navigation
// =========================================================

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".view-content").forEach(v => v.classList.remove("active"));

        btn.classList.add("active");
        const targetViewId = btn.getAttribute("data-view");
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.add("active");
        }
    });
});

// =========================================================
// Helper: Show Toast Notification
// =========================================================

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, 2800);
}

// =========================================================
// Behavioral Signals Live Sync
// =========================================================

function updateSignalPreview() {
    const recency = document.getElementById("last_purchase_days_ago")?.value || 0;
    const support = document.getElementById("support_tickets")?.value || 0;
    const tenure = document.getElementById("tenure_months")?.value || 0;
    const orders = document.getElementById("total_orders")?.value || 0;

    if (recencyValue) recencyValue.textContent = `${recency} days`;
    if (supportValue) supportValue.textContent = `${support} tickets`;
    if (tenureValue) tenureValue.textContent = `${tenure} mo`;
    if (ordersValue) ordersValue.textContent = `${orders}`;
}

[
    "last_purchase_days_ago",
    "support_tickets",
    "tenure_months",
    "total_orders"
].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateSignalPreview);
});

// =========================================================
// Persona Chips & Randomizer
// =========================================================

function loadPersona(key) {
    const persona = PERSONAS[key];
    if (!persona) return;

    document.querySelectorAll(".persona-chip").forEach(c => c.classList.remove("active"));
    const activeChip = document.querySelector(`.persona-chip[data-persona="${key}"]`);
    if (activeChip) activeChip.classList.add("active");

    for (const [field, val] of Object.entries(persona)) {
        const input = document.getElementById(field);
        if (input) {
            input.value = val;
            input.style.backgroundColor = "#eef2ff";
            setTimeout(() => {
                input.style.backgroundColor = "";
            }, 300);
        }
    }

    updateSignalPreview();
}

document.querySelectorAll(".persona-chip").forEach(chip => {
    chip.addEventListener("click", () => {
        const personaKey = chip.getAttribute("data-persona");
        loadPersona(personaKey);
    });
});

if (randomizeBtn) {
    randomizeBtn.addEventListener("click", () => {
        document.querySelectorAll(".persona-chip").forEach(c => c.classList.remove("active"));
        document.getElementById("customer_id").value = Math.floor(100000 + Math.random() * 90000);
        document.getElementById("age").value = Math.floor(20 + Math.random() * 50);
        document.getElementById("tenure_months").value = Math.floor(1 + Math.random() * 48);
        document.getElementById("avg_order_value").value = Math.floor(500 + Math.random() * 8000);
        document.getElementById("total_orders").value = Math.floor(1 + Math.random() * 150);
        document.getElementById("last_purchase_days_ago").value = Math.floor(1 + Math.random() * 200);
        document.getElementById("support_tickets").value = Math.floor(Math.random() * 12);
        updateSignalPreview();
        showToast("🎲 Random customer parameters generated!");
    });
}

// =========================================================
// Form Submission & Prediction Handler
// =========================================================

predictionForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    predictButton.disabled = true;
    predictButton.innerHTML = `
        <span class="btn-text">Running Inference...</span>
    `;

    resultDiv.innerHTML = `
        <div class="result-placeholder">
            <div class="radar-pulse-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-icon">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
            </div>
            <h3>Running Random Forest (ONNX)...</h3>
            <p>Processing 13 behavioral features through AWS Lambda endpoint</p>
        </div>
    `;

    if (financialRoi) financialRoi.style.display = "none";
    if (riskDrivers) riskDrivers.style.display = "none";
    if (retentionPlan) retentionPlan.style.display = "none";

    const customerData = {
        customer_id: Number(document.getElementById("customer_id").value),
        age: Number(document.getElementById("age").value),
        gender: document.getElementById("gender").value,
        city: document.getElementById("city").value,
        tenure_months: Number(document.getElementById("tenure_months").value),
        avg_order_value: Number(document.getElementById("avg_order_value").value),
        total_orders: Number(document.getElementById("total_orders").value),
        last_purchase_days_ago: Number(document.getElementById("last_purchase_days_ago").value),
        support_tickets: Number(document.getElementById("support_tickets").value),
        subscription_type: document.getElementById("subscription_type").value
    };

    updateSignalPreview();

    const startTime = performance.now();

    try {
        let response;
        let usedEndpoint = API_URL;

        try {
            response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(customerData)
            });
        } catch (fetchErr) {
            console.warn("Primary Lambda endpoint unreachable, attempting local fallback:", LOCAL_API_URL);
            response = await fetch(LOCAL_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(customerData)
            });
            usedEndpoint = LOCAL_API_URL;
        }

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const duration = Math.round(performance.now() - startTime);

        const latencyInd = document.getElementById("latencyIndicator");
        if (latencyInd) {
            latencyInd.textContent = `⚡ ${duration}ms Roundtrip`;
        }

        data.inference_source = usedEndpoint.includes("lambda-url") ? "AWS Lambda (Serverless)" : "FastAPI (Local)";

        displayResult(data, customerData);

    } catch (error) {
        console.error("Prediction failed:", error);
        resultDiv.innerHTML = `
            <div class="result-placeholder" style="border-color: #fecaca; background: #fff5f5;">
                <div class="radar-pulse-icon" style="color: #ef4444;">❌</div>
                <h3 style="color: #991b1b;">Inference Service Offline</h3>
                <p>${error.message}</p>
                <small style="display:block; margin-top: 10px; color: #64748b;">
                    Start local API with: <code>.venv/bin/uvicorn api.app:app --port 8000</code>
                </small>
            </div>
        `;
    } finally {
        predictButton.disabled = false;
        predictButton.innerHTML = `
            <span class="btn-text">Run Churn Prediction</span>
            <svg class="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        `;
    }
});

// =========================================================
// Render Results & Drivers
// =========================================================

function animateNumber(element, target, duration = 800) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * easeProgress;
        element.textContent = `${current.toFixed(2)}%`;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateRiskDrivers(customer) {
    const recency = customer.last_purchase_days_ago;
    const tickets = customer.support_tickets;
    const tenure = Math.max(customer.tenure_months, 1);
    const orders = Math.max(customer.total_orders, 1);

    const recencyScore = Math.min(Math.round((recency / 180) * 100), 100);
    const supportScore = Math.min(Math.round((tickets / Math.min(orders, 10)) * 100), 100);
    const tenureScore = Math.max(Math.round((1 - (tenure / 36)) * 100), 10);

    const recBar = document.getElementById("recencyDriverBar");
    const supBar = document.getElementById("supportDriverBar");
    const tenBar = document.getElementById("tenureDriverBar");

    if (recBar) recBar.style.width = `${recencyScore}%`;
    if (supBar) supBar.style.width = `${supportScore}%`;
    if (tenBar) tenBar.style.width = `${tenureScore}%`;

    const recTxt = document.getElementById("recencyDriverScore");
    const supTxt = document.getElementById("supportDriverScore");
    const tenTxt = document.getElementById("tenureDriverScore");

    if (recTxt) recTxt.textContent = `${recencyScore}%`;
    if (supTxt) supTxt.textContent = `${supportScore}%`;
    if (tenTxt) tenTxt.textContent = `${tenureScore}%`;

    if (riskDrivers) riskDrivers.style.display = "block";
}

function renderRetentionPlaybook(data, customer) {
    const probability = Number(data.churn_probability) * 100;
    const recency = Number(customer.last_purchase_days_ago);
    const tickets = Number(customer.support_tickets);
    const subscription = customer.subscription_type;

    const actions = [];

    if (probability >= 60) {
        if (recency >= 90) {
            actions.push({
                type: "urgent",
                icon: "💌",
                title: "Urgent 25% Win-Back Campaign",
                detail: `Customer inactive for ${recency} days. Send personalized win-back voucher expiring in 7 days.`,
                actionLabel: "Copy Voucher: WINBACK25",
                actionCode: "WINBACK25"
            });
        }
        if (tickets >= 4) {
            actions.push({
                type: "urgent",
                icon: "🎧",
                title: "Executive Support Outreach",
                detail: `High ticket volume (${tickets} complaints). Route customer to Senior Success Specialist within 24 hours.`,
                actionLabel: "Queue CS Follow-up",
                actionCode: "CS_PRIORITY_SCHEDULED"
            });
        }
        actions.push({
            type: "urgent",
            icon: "🎁",
            title: "30-Day VIP Tier Perk Grant",
            detail: "Offer free Gold shipping and zero-friction returns for 30 days to re-anchor purchase behavior.",
            actionLabel: "Grant VIP Pass",
            actionCode: "VIP_PASS_30D"
        });
    } else if (probability >= 30) {
        if (recency >= 45) {
            actions.push({
                type: "medium",
                icon: "🔔",
                title: "Re-engagement Push & Points Reminder",
                detail: "Send personalized new arrival catalog and notify customer of expiring loyalty reward balance.",
                actionLabel: "Copy Promo: REENGAGE15",
                actionCode: "REENGAGE15"
            });
        }
        actions.push({
            type: "medium",
            icon: "🏷️",
            title: "Targeted Category Promotion",
            detail: "Provide 10% discount on customer's most-frequently viewed product categories.",
            actionLabel: "Generate Coupon",
            actionCode: "CATEGORY10"
        });
    } else {
        actions.push({
            type: "loyal",
            icon: "💎",
            title: "VIP Flash Sale Access",
            detail: "Customer demonstrates strong brand loyalty. Grant early 24-hour access to upcoming flash sale.",
            actionLabel: "Enroll Early Access",
            actionCode: "VIP_EARLY_ACCESS"
        });
        if (subscription !== "Platinum") {
            actions.push({
                type: "loyal",
                icon: "⭐",
                title: "Platinum Membership Upgrade",
                detail: `Target with discounted upgrade offer from ${subscription} to Platinum tier.`,
                actionLabel: "Offer Upgrade",
                actionCode: "UPGRADE_PLATINUM"
            });
        }
        actions.push({
            type: "loyal",
            icon: "🤝",
            title: "Refer-a-Friend Ambassador Program",
            detail: "Send 'Give ₹500, Get ₹500' referral invitation to drive organic viral customer acquisition.",
            actionLabel: "Copy Referral Link",
            actionCode: "REFER_A_FRIEND"
        });
    }

    if (retentionActionsList) {
        retentionActionsList.innerHTML = actions.map(act => `
            <div class="retention-card ${act.type}">
                <div class="retention-icon">${act.icon}</div>
                <div class="retention-content">
                    <strong>${act.title}</strong>
                    <span>${act.detail}</span>
                    <button type="button" class="retention-action-btn" data-code="${act.actionCode}">
                        ${act.actionLabel}
                    </button>
                </div>
            </div>
        `).join("");

        // Attach action button handlers
        retentionActionsList.querySelectorAll(".retention-action-btn").forEach(b => {
            b.addEventListener("click", () => {
                const code = b.getAttribute("data-code");
                navigator.clipboard?.writeText(code);
                showToast(`✅ Action Executed: ${code} copied to clipboard!`);
            });
        });

        if (retentionPlan) retentionPlan.style.display = "block";
    }
}

function displayResult(data, customer) {
    const probability = Number(data.churn_probability) * 100;

    let riskLevel = (data.risk_level || "").toUpperCase();
    if (!riskLevel) {
        if (probability >= 60) riskLevel = "HIGH";
        else if (probability >= 30) riskLevel = "MEDIUM";
        else riskLevel = "LOW";
    }

    const riskClass = riskLevel.toLowerCase();
    const riskIcon = riskClass === "high" ? "🔴" : (riskClass === "medium" ? "🟠" : "🟢");

    const predictionText = Number(data.churn_prediction) === 1
        ? "Likely to Churn (Retention Intervention Needed)"
        : "Customer Retained (Healthy Engagement)";

    const inferenceSource = data.inference_source || "AWS Lambda (Serverless)";

    resultDiv.innerHTML = `
        <div class="prediction-card">
            <div class="customer-tag">
                Customer ID: <strong>#${data.customer_id || customer.customer_id}</strong>
            </div>

            <div class="probability-display">
                <div class="probability-val" id="probNum">${probability.toFixed(2)}%</div>
            </div>
            <div class="probability-label">Predicted Churn Probability</div>

            <!-- Risk Progress Meter -->
            <div class="risk-meter-wrapper">
                <div class="risk-meter-bar">
                    <div id="riskMeterFill" class="risk-meter-fill ${riskClass}" style="width: 0%;"></div>
                </div>
                <div class="risk-scale-labels">
                    <span>Low (&lt;30%)</span>
                    <span>Medium (30-59%)</span>
                    <span>High (&ge;60%)</span>
                </div>
            </div>

            <!-- Risk Badge -->
            <div>
                <div class="risk-status-badge ${riskClass}">
                    ${riskIcon} ${riskLevel} CHURN RISK
                </div>
            </div>

            <div class="decision-statement">
                ${predictionText}
            </div>

            <!-- Meta Details -->
            <div class="result-meta-grid">
                <div class="meta-box">
                    <span>Inference Host</span>
                    <strong>${inferenceSource}</strong>
                </div>
                <div class="meta-box">
                    <span>Decision Threshold</span>
                    <strong>30.0%</strong>
                </div>
                <div class="meta-box">
                    <span>Runtime</span>
                    <strong>ONNX Runtime v1.29</strong>
                </div>
            </div>
        </div>
    `;

    // Trigger smooth bar and number animations
    const numEl = document.getElementById("probNum");
    if (numEl) animateNumber(numEl, probability);

    setTimeout(() => {
        const fillEl = document.getElementById("riskMeterFill");
        if (fillEl) fillEl.style.width = `${Math.min(probability, 100)}%`;
    }, 50);

    // Update financial ROI, risk drivers, and retention playbook
    updateFinancialRoi(data, customer);
    updateRiskDrivers(customer);
    renderRetentionPlaybook(data, customer);
}

function updateFinancialRoi(data, customer) {
    const probability = Number(data.churn_probability) || 0;
    const aov = Number(customer.avg_order_value) || 0;
    const orders = Number(customer.total_orders) || 0;
    const tenure = Math.max(Number(customer.tenure_months), 1);

    // Annualized forward spend velocity
    const ordersPerYear = (orders / tenure) * 12.0;
    const annualLtv = Math.round(ordersPerYear * aov);

    // Gross financial loss at risk
    const lossAtRisk = Math.round(annualLtv * probability);

    // Cost of targeted retention campaign
    let interventionCost = 0;
    let recoveryRate = 0.50;

    if (probability >= 0.60) {
        interventionCost = Math.round(0.12 * aov + 250);
        recoveryRate = 0.45;
    } else if (probability >= 0.30) {
        interventionCost = Math.round(0.08 * aov + 100);
        recoveryRate = 0.55;
    } else {
        interventionCost = 80;
        recoveryRate = 0.70;
    }

    const netSavings = Math.max(Math.round((lossAtRisk * recoveryRate) - interventionCost), 0);
    const roiPercent = interventionCost > 0 ? Math.round((netSavings / interventionCost) * 100) : 0;

    const formatINR = num => "₹" + num.toLocaleString("en-IN");

    const roiBadge = document.getElementById("roiBadge");
    const lossEl = document.getElementById("roiLossAtRisk");
    const costEl = document.getElementById("roiInterventionCost");
    const savingsEl = document.getElementById("roiNetSavings");
    const ltvNote = document.getElementById("roiLtvNote");

    if (roiBadge) roiBadge.textContent = `+${roiPercent}% ROI`;
    if (lossEl) lossEl.textContent = formatINR(lossAtRisk);
    if (costEl) costEl.textContent = formatINR(interventionCost);
    if (savingsEl) savingsEl.textContent = formatINR(netSavings);
    if (ltvNote) ltvNote.textContent = `Est. LTV: ${formatINR(annualLtv)}/yr`;

    if (financialRoi) financialRoi.style.display = "block";
}

// Initial signals preview on load
updateSignalPreview();