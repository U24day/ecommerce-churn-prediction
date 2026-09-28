// =========================================================
// ChurnGuard AI • Client Controller & Analytics Engine
// =========================================================

const AWS_LAMBDA_URL = "https://jcff4gbgqeadn3benrbofjdshy0hdcdl.lambda-url.ap-south-1.on.aws/";
const LOCAL_API_URL = "http://localhost:8000/predict";

let API_URL = AWS_LAMBDA_URL;

// =========================================================
// Dynamic Persona Shuffle Engine
// =========================================================

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Hyderabad", "Kolkata", "Pune"];
const GENDERS = ["Male", "Female"];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const PERSONA_TITLES = {
    high_risk: "High Churn Risk",
    medium_risk: "Moderate Risk",
    loyal_vip: "Loyal VIP",
    new_user: "New Customer"
};

// Dynamic Shuffle Generators for each Persona Category
const PERSONA_GENERATORS = {
    high_risk: () => {
        const recency = getRandomInt(135, 230);
        const tickets = getRandomInt(7, 13);
        const tenure = getRandomInt(2, 12);
        const orders = getRandomInt(3, 16);
        const aov = Math.round(getRandomInt(950, 2600) / 50) * 50;
        const age = getRandomInt(22, 60);
        const gender = getRandomItem(GENDERS);
        const city = getRandomItem(CITIES);
        const sub = getRandomItem(["Basic", "Basic", "Silver"]);
        const cid = getRandomInt(104000, 199999);
        return {
            customer_id: cid,
            age,
            gender,
            city,
            tenure_months: tenure,
            avg_order_value: aov,
            total_orders: orders,
            last_purchase_days_ago: recency,
            support_tickets: tickets,
            subscription_type: sub,
            meta: `${recency}d Inactive • ${tickets} Tickets`
        };
    },
    medium_risk: () => {
        const recency = getRandomInt(45, 85);
        const tickets = getRandomInt(2, 5);
        const tenure = getRandomInt(12, 28);
        const orders = getRandomInt(20, 58);
        const aov = Math.round(getRandomInt(2400, 4800) / 50) * 50;
        const age = getRandomInt(24, 55);
        const gender = getRandomItem(GENDERS);
        const city = getRandomItem(CITIES);
        const sub = getRandomItem(["Silver", "Gold", "Basic"]);
        const cid = getRandomInt(102000, 199999);
        return {
            customer_id: cid,
            age,
            gender,
            city,
            tenure_months: tenure,
            avg_order_value: aov,
            total_orders: orders,
            last_purchase_days_ago: recency,
            support_tickets: tickets,
            subscription_type: sub,
            meta: `${recency}d Inactive • ${tickets} Tickets`
        };
    },
    loyal_vip: () => {
        const recency = getRandomInt(2, 14);
        const tickets = getRandomInt(0, 1);
        const tenure = getRandomInt(24, 60);
        const orders = getRandomInt(80, 220);
        const aov = Math.round(getRandomInt(5500, 12000) / 50) * 50;
        const age = getRandomInt(28, 62);
        const gender = getRandomItem(GENDERS);
        const city = getRandomItem(CITIES);
        const sub = getRandomItem(["Gold", "Platinum", "Platinum"]);
        const cid = getRandomInt(100001, 199999);
        return {
            customer_id: cid,
            age,
            gender,
            city,
            tenure_months: tenure,
            avg_order_value: aov,
            total_orders: orders,
            last_purchase_days_ago: recency,
            support_tickets: tickets,
            subscription_type: sub,
            meta: `${recency}d Inactive • ${sub} Tier`
        };
    },
    new_user: () => {
        const recency = getRandomInt(3, 20);
        const tickets = getRandomInt(0, 1);
        const tenure = getRandomInt(1, 3);
        const orders = getRandomInt(1, 4);
        const aov = Math.round(getRandomInt(1200, 3500) / 50) * 50;
        const age = getRandomInt(20, 35);
        const gender = getRandomItem(GENDERS);
        const city = getRandomItem(CITIES);
        const sub = getRandomItem(["Basic", "Silver"]);
        const cid = getRandomInt(109000, 199999);
        return {
            customer_id: cid,
            age,
            gender,
            city,
            tenure_months: tenure,
            avg_order_value: aov,
            total_orders: orders,
            last_purchase_days_ago: recency,
            support_tickets: tickets,
            subscription_type: sub,
            meta: `${tenure} Mo • ${orders} Orders`
        };
    }
};

// =========================================================
// DOM Elements
// =========================================================

const predictionForm = document.getElementById("predictionForm");
const predictButton = document.getElementById("predictButton");
const randomizeBtn = document.getElementById("randomizeBtn");
const toast = document.getElementById("toastNotification");

const recencyValue = document.getElementById("recencyValue");
const supportValue = document.getElementById("supportValue");
const tenureValue = document.getElementById("tenureValue");
const ordersValue = document.getElementById("ordersValue");

// Pop-up Modal DOM Elements
const resultModal = document.getElementById("resultModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalDoneBtn = document.getElementById("modalDoneBtn");
const modalCopySummaryBtn = document.getElementById("modalCopySummaryBtn");
const modalBody = document.getElementById("modalBody");
const modalCustomerIdBadge = document.getElementById("modalCustomerIdBadge");
const modalInferenceBadge = document.getElementById("modalInferenceBadge");
const reopenModalBtn = document.getElementById("reopenModalBtn");

let latestPredictionData = null;
let latestCustomerData = null;
let latestLatency = 0;

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
    const generator = PERSONA_GENERATORS[key];
    if (!generator) return;

    const persona = generator();

    document.querySelectorAll(".persona-chip").forEach(c => c.classList.remove("active"));
    const activeChip = document.querySelector(`.persona-chip[data-persona="${key}"]`);
    if (activeChip) activeChip.classList.add("active");

    // Update dynamic meta badge on chip
    const metaEl = document.getElementById(`meta_${key}`);
    if (metaEl && persona.meta) {
        metaEl.textContent = persona.meta;
    }

    const fieldKeys = [
        "customer_id",
        "age",
        "gender",
        "city",
        "tenure_months",
        "avg_order_value",
        "total_orders",
        "last_purchase_days_ago",
        "support_tickets",
        "subscription_type"
    ];

    fieldKeys.forEach(field => {
        const input = document.getElementById(field);
        if (input && persona[field] !== undefined) {
            input.value = persona[field];
            input.style.backgroundColor = "#e0e7ff";
            setTimeout(() => {
                input.style.backgroundColor = "";
            }, 350);
        }
    });

    updateSignalPreview();
    const title = PERSONA_TITLES[key] || "Customer";
    showToast(`Shuffled ${title} profile loaded (#${persona.customer_id})`);
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
        const cid = getRandomInt(100000, 199999);
        const age = getRandomInt(18, 70);
        const tenure = getRandomInt(1, 72);
        const aov = Math.round(getRandomInt(500, 9500) / 50) * 50;
        const orders = getRandomInt(1, 180);
        const recency = getRandomInt(1, 250);
        const tickets = getRandomInt(0, 12);
        const gender = getRandomItem(GENDERS);
        const city = getRandomItem(CITIES);
        const sub = getRandomItem(["Basic", "Silver", "Gold", "Platinum"]);

        const randomData = {
            customer_id: cid,
            age,
            gender,
            city,
            tenure_months: tenure,
            avg_order_value: aov,
            total_orders: orders,
            last_purchase_days_ago: recency,
            support_tickets: tickets,
            subscription_type: sub
        };

        for (const [field, val] of Object.entries(randomData)) {
            const el = document.getElementById(field);
            if (el) {
                el.value = val;
                el.style.backgroundColor = "#e0e7ff";
                setTimeout(() => el.style.backgroundColor = "", 350);
            }
        }

        updateSignalPreview();
        showToast(`Random customer parameters generated (#${cid})`);
    });
}

// =========================================================
// Pop-up Modal Controller & Results Renderer
// =========================================================

function openModal() {
    if (!resultModal) return;
    resultModal.classList.add("active");
    resultModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    if (!resultModal) return;
    resultModal.classList.remove("active");
    resultModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function openModalLoading(customer) {
    if (modalCustomerIdBadge) {
        modalCustomerIdBadge.textContent = `Customer #${customer.customer_id}`;
    }
    if (modalInferenceBadge) {
        modalInferenceBadge.textContent = "AWS Lambda • ONNX";
    }
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="modal-loading-state">
                <div class="modal-radar-spinner">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spin-icon">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                </div>
                <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: var(--text-main);">Running Inference Engine...</h3>
                <p style="font-size: 14px; color: var(--text-muted); max-width: 440px;">Evaluating 13 customer behavioral parameters with Random Forest (ONNX) on AWS Lambda</p>
                <div class="modal-loading-steps">
                    <span class="step-badge active">1. Ingesting Telemetry</span>
                    <span class="step-badge active">2. ONNX Classification</span>
                    <span class="step-badge">3. Prescriptive Strategy</span>
                </div>
            </div>
        `;
    }
    openModal();
}

function displayModalError(errorMessage) {
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="result-placeholder" style="border-color: #fecaca; background: #fff5f5; padding: 40px 20px; border-radius: var(--radius-md);">
                <div class="radar-pulse-icon" style="color: #ef4444; margin-bottom: 12px; display: inline-flex; align-items: center; justify-content: center;">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <h3 style="color: #991b1b; font-family: var(--font-heading); font-size: 18px; font-weight: 700;">Inference Service Offline</h3>
                <p style="color: #7f1d1d; margin-top: 6px;">${errorMessage}</p>
                <small style="display:block; margin-top: 14px; color: #64748b;">
                    Start local API with: <code>.venv/bin/uvicorn api.app:app --port 8000</code>
                </small>
            </div>
        `;
    }
}

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

function getRetentionActions(probability, customer) {
    const recency = Number(customer.last_purchase_days_ago);
    const tickets = Number(customer.support_tickets);
    const subscription = customer.subscription_type;

    const actions = [];

    if (probability >= 60) {
        if (recency >= 90) {
            actions.push({
                type: "urgent",
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
                title: "Urgent 25% Win-Back Campaign",
                detail: `Customer inactive for ${recency} days. Send personalized win-back voucher expiring in 7 days.`,
                actionLabel: "Copy Voucher: WINBACK25",
                actionCode: "WINBACK25"
            });
        }
        if (tickets >= 4) {
            actions.push({
                type: "urgent",
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
                title: "Executive Support Outreach",
                detail: `High ticket volume (${tickets} complaints). Route customer to Senior Success Specialist within 24 hours.`,
                actionLabel: "Queue CS Follow-up",
                actionCode: "CS_PRIORITY_SCHEDULED"
            });
        }
        actions.push({
            type: "urgent",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
            title: "30-Day VIP Tier Perk Grant",
            detail: "Offer free Gold shipping and zero-friction returns for 30 days to re-anchor purchase behavior.",
            actionLabel: "Grant VIP Pass",
            actionCode: "VIP_PASS_30D"
        });
    } else if (probability >= 30) {
        if (recency >= 45) {
            actions.push({
                type: "medium",
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
                title: "Re-engagement Push & Points Reminder",
                detail: "Send personalized new arrival catalog and notify customer of expiring loyalty reward balance.",
                actionLabel: "Copy Promo: REENGAGE15",
                actionCode: "REENGAGE15"
            });
        }
        actions.push({
            type: "medium",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
            title: "Targeted Category Promotion",
            detail: "Provide 10% discount on customer's most-frequently viewed product categories.",
            actionLabel: "Generate Coupon",
            actionCode: "CATEGORY10"
        });
    } else {
        actions.push({
            type: "loyal",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 18 3 22 9 12 22 2 9 6 3"/><line x1="12" y1="22" x2="8" y2="9"/><line x1="12" y1="22" x2="16" y2="9"/><line x1="2" y1="9" x2="22" y2="9"/></svg>`,
            title: "VIP Flash Sale Access",
            detail: "Customer demonstrates strong brand loyalty. Grant early 24-hour access to upcoming flash sale.",
            actionLabel: "Enroll Early Access",
            actionCode: "VIP_EARLY_ACCESS"
        });
        if (subscription !== "Platinum") {
            actions.push({
                type: "loyal",
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
                title: "Platinum Membership Upgrade",
                detail: `Target with discounted upgrade offer from ${subscription} to Platinum tier.`,
                actionLabel: "Offer Upgrade",
                actionCode: "UPGRADE_PLATINUM"
            });
        }
        actions.push({
            type: "loyal",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
            title: "Refer-a-Friend Ambassador Program",
            detail: "Send 'Give ₹500, Get ₹500' referral invitation to drive organic viral customer acquisition.",
            actionLabel: "Copy Referral Link",
            actionCode: "REFER_A_FRIEND"
        });
    }

    return actions;
}

function displayModalResult(data, customer, duration) {
    const probability = Number(data.churn_probability) * 100;

    let riskLevel = (data.risk_level || "").toUpperCase();
    if (!riskLevel) {
        if (probability >= 60) riskLevel = "HIGH";
        else if (probability >= 30) riskLevel = "MEDIUM";
        else riskLevel = "LOW";
    }

    const riskClass = riskLevel.toLowerCase();
    const riskDotSvg = riskClass === "high" 
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444" style="margin-right: 5px; vertical-align: middle;"><circle cx="12" cy="12" r="10"/></svg>`
        : (riskClass === "medium" 
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" style="margin-right: 5px; vertical-align: middle;"><circle cx="12" cy="12" r="10"/></svg>` 
            : `<svg width="10" height="10" viewBox="0 0 24 24" fill="#10b981" style="margin-right: 5px; vertical-align: middle;"><circle cx="12" cy="12" r="10"/></svg>`);

    const predictionText = Number(data.churn_prediction) === 1
        ? "Likely to Churn (Retention Intervention Needed)"
        : "Customer Retained (Healthy Engagement)";

    const inferenceSource = data.inference_source || "AWS Lambda (Serverless)";

    if (modalCustomerIdBadge) {
        modalCustomerIdBadge.textContent = `Customer #${data.customer_id || customer.customer_id}`;
    }
    if (modalInferenceBadge) {
        modalInferenceBadge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>${duration || 12}ms • ${inferenceSource}`;
    }

    // Financial ROI metrics
    const aov = Number(customer.avg_order_value) || 0;
    const orders = Number(customer.total_orders) || 0;
    const tenure = Math.max(Number(customer.tenure_months), 1);
    const ordersPerYear = (orders / tenure) * 12.0;
    const annualLtv = Math.round(ordersPerYear * aov);
    const lossAtRisk = Math.round(annualLtv * (probability / 100));

    let interventionCost = 0;
    let recoveryRate = 0.50;

    if (probability >= 60) {
        interventionCost = Math.round(0.12 * aov + 250);
        recoveryRate = 0.45;
    } else if (probability >= 30) {
        interventionCost = Math.round(0.08 * aov + 100);
        recoveryRate = 0.55;
    } else {
        interventionCost = 80;
        recoveryRate = 0.70;
    }

    const netSavings = Math.max(Math.round((lossAtRisk * recoveryRate) - interventionCost), 0);
    const roiPercent = interventionCost > 0 ? Math.round((netSavings / interventionCost) * 100) : 0;
    const formatINR = num => "₹" + num.toLocaleString("en-IN");

    // Drivers calculation
    const recency = customer.last_purchase_days_ago;
    const tickets = customer.support_tickets;
    const recencyScore = Math.min(Math.round((recency / 180) * 100), 100);
    const supportScore = Math.min(Math.round((tickets / Math.min(orders, 10)) * 100), 100);
    const tenureScore = Math.max(Math.round((1 - (tenure / 36)) * 100), 10);

    const playbookActions = getRetentionActions(probability, customer);

    if (modalBody) {
        modalBody.innerHTML = `
            <!-- Top Probability & Risk Banner -->
            <div class="prediction-card" style="box-shadow: none; border-color: var(--border-light); padding: 22px;">
                <div class="customer-tag">
                    Customer Profile: <strong>#${data.customer_id || customer.customer_id} • ${customer.city} (${customer.subscription_type} Tier)</strong>
                </div>

                <div class="probability-display">
                    <div class="probability-val" id="modalProbNum">${probability.toFixed(2)}%</div>
                </div>
                <div class="probability-label">Predicted Churn Probability</div>

                <div class="risk-meter-wrapper">
                    <div class="risk-meter-bar">
                        <div id="modalRiskMeterFill" class="risk-meter-fill ${riskClass}" style="width: 0%;"></div>
                    </div>
                    <div class="risk-scale-labels">
                        <span>Low (&lt;30%)</span>
                        <span>Medium (30-59%)</span>
                        <span>High (&ge;60%)</span>
                    </div>
                </div>

                <div>
                    <div class="risk-status-badge ${riskClass}">
                        ${riskDotSvg}${riskLevel} CHURN RISK
                    </div>
                </div>

                <div class="decision-statement" style="margin-bottom: 0;">
                    ${predictionText}
                </div>
            </div>

            <!-- Revenue Impact & Campaign ROI -->
            <div class="embedded-roi-card" style="margin: 0; background: #ffffff;">
                <div class="roi-header">
                    <span class="roi-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px; margin-right:5px;"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>REVENUE IMPACT & CAMPAIGN ROI
                    </span>
                    <span class="roi-badge">+${roiPercent}% ROI</span>
                </div>
                <div class="roi-stats-grid">
                    <div class="roi-box danger">
                        <span class="roi-label">Loss at Risk</span>
                        <strong class="roi-val">${formatINR(lossAtRisk)}</strong>
                        <small>LTV: ${formatINR(annualLtv)}/yr</small>
                    </div>
                    <div class="roi-box warning">
                        <span class="roi-label">Campaign Cost</span>
                        <strong class="roi-val">${formatINR(interventionCost)}</strong>
                        <small>Voucher & CS</small>
                    </div>
                    <div class="roi-box success">
                        <span class="roi-label">Expected Net Savings</span>
                        <strong class="roi-val">${formatINR(netSavings)}</strong>
                        <small>Protected Margin</small>
                    </div>
                </div>
            </div>

            <!-- Key Risk Attribution Drivers -->
            <div class="risk-drivers-section" style="margin-bottom: 0; padding-top: 0; border-top: none;">
                <div class="section-subheading">
                    <h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px; margin-right:6px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Key Risk Attribution Drivers
                    </h3>
                    <p>Feature contribution weights towards churn risk for this customer</p>
                </div>
                <div class="driver-bars">
                    <div class="driver-item">
                        <div class="driver-label">
                            <span>Purchase Inactivity (Recency: ${recency}d)</span>
                            <strong>${recencyScore}%</strong>
                        </div>
                        <div class="driver-track"><div class="driver-fill red" style="width: ${recencyScore}%;"></div></div>
                    </div>
                    <div class="driver-item">
                        <div class="driver-label">
                            <span>Support Friction (${tickets} tickets / ${orders} orders)</span>
                            <strong>${supportScore}%</strong>
                        </div>
                        <div class="driver-track"><div class="driver-fill orange" style="width: ${supportScore}%;"></div></div>
                    </div>
                    <div class="driver-item">
                        <div class="driver-label">
                            <span>Account Tenure Vulnerability (${tenure} mo)</span>
                            <strong>${tenureScore}%</strong>
                        </div>
                        <div class="driver-track"><div class="driver-fill blue" style="width: ${tenureScore}%;"></div></div>
                    </div>
                </div>
            </div>

            <!-- Prescriptive Retention Playbook -->
            <div class="retention-plan-section" style="margin-bottom: 0; padding-top: 0; border-top: none;">
                <div class="section-subheading">
                    <h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px; margin-right:6px;"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>Prescriptive Retention Playbook
                    </h3>
                    <p>Proactive retention actions recommended for this profile</p>
                </div>
                <div class="retention-actions-list">
                    ${playbookActions.map(act => `
                        <div class="retention-card ${act.type}">
                            <div class="retention-icon">${act.icon}</div>
                            <div class="retention-content">
                                <strong>${act.title}</strong>
                                <span>${act.detail}</span>
                                <button type="button" class="retention-action-btn modal-action-btn" data-code="${act.actionCode}">
                                    ${act.actionLabel}
                                </button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- Live Behavioral Signals Summary -->
            <div class="signals-summary" style="margin-top: 0;">
                <div class="signal-card">
                    <div class="sig-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div class="sig-info">
                        <span>Recency</span>
                        <strong>${recency} days</strong>
                    </div>
                </div>
                <div class="signal-card">
                    <div class="sig-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </div>
                    <div class="sig-info">
                        <span>Support Tickets</span>
                        <strong>${tickets} tickets</strong>
                    </div>
                </div>
                <div class="signal-card">
                    <div class="sig-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div class="sig-info">
                        <span>Tenure</span>
                        <strong>${tenure} months</strong>
                    </div>
                </div>
                <div class="signal-card">
                    <div class="sig-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    </div>
                    <div class="sig-info">
                        <span>Total Orders</span>
                        <strong>${orders}</strong>
                    </div>
                </div>
            </div>

            <!-- Result Meta Grid -->
            <div class="result-meta-grid" style="padding-top: 10px; margin-top: 0;">
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
        `;

        // Wire modal action buttons
        modalBody.querySelectorAll(".modal-action-btn").forEach(b => {
            b.addEventListener("click", () => {
                const code = b.getAttribute("data-code");
                navigator.clipboard?.writeText(code);
                showToast(`Action Executed: ${code} copied to clipboard!`);
            });
        });

        // Trigger animations
        const modalProbNum = document.getElementById("modalProbNum");
        if (modalProbNum) animateNumber(modalProbNum, probability);

        setTimeout(() => {
            const fill = document.getElementById("modalRiskMeterFill");
            if (fill) fill.style.width = `${Math.min(probability, 100)}%`;
        }, 50);
    }
}

// Modal Event Listeners
if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
if (modalDoneBtn) modalDoneBtn.addEventListener("click", closeModal);
if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);

if (reopenModalBtn) {
    reopenModalBtn.addEventListener("click", () => {
        if (latestPredictionData && latestCustomerData) {
            displayModalResult(latestPredictionData, latestCustomerData, latestLatency);
        }
        openModal();
    });
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && resultModal && resultModal.classList.contains("active")) {
        closeModal();
    }
});

if (modalCopySummaryBtn) {
    modalCopySummaryBtn.addEventListener("click", () => {
        if (!latestPredictionData || !latestCustomerData) {
            showToast("No active prediction data available.");
            return;
        }
        const prob = (Number(latestPredictionData.churn_probability) * 100).toFixed(2);
        const risk = (latestPredictionData.risk_level || "MEDIUM").toUpperCase();
        const c = latestCustomerData;
        const summary = `ChurnGuard AI • Retention Risk Executive Brief
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Customer ID: #${c.customer_id}
• Age: ${c.age} | City: ${c.city} | Tier: ${c.subscription_type}
• Churn Probability: ${prob}%
• Risk Level: ${risk} RISK
• Status: ${Number(latestPredictionData.churn_prediction) === 1 ? 'Likely to Churn' : 'Retained Customer'}
• Recency: ${c.last_purchase_days_ago} days | Support Tickets: ${c.support_tickets}
• Tenure: ${c.tenure_months} mo | Orders: ${c.total_orders} | Avg Order Value: ₹${c.avg_order_value}
• Inference Host: ${latestPredictionData.inference_source || 'AWS Lambda (Serverless)'}`;

        navigator.clipboard?.writeText(summary);
        showToast("Executive Summary copied to clipboard!");
    });
}

// =========================================================
// Form Submission & Prediction Handler
// =========================================================

predictionForm.addEventListener("submit", async function (event) {
    event.preventDefault();

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

    // Trigger Pop-up Modal immediately with loading state!
    openModalLoading(customerData);

    predictButton.disabled = true;
    predictButton.innerHTML = `
        <span class="btn-text">Running Inference...</span>
    `;

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
            latencyInd.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:3px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>${duration}ms Roundtrip`;
        }

        data.inference_source = usedEndpoint.includes("lambda-url") ? "AWS Lambda (Serverless)" : "FastAPI (Local)";

        latestPredictionData = data;
        latestCustomerData = customerData;
        latestLatency = duration;

        // Render exclusively in pop-up modal
        displayModalResult(data, customerData, duration);

        if (reopenModalBtn) {
            reopenModalBtn.style.display = "inline-flex";
        }

    } catch (error) {
        console.error("Prediction failed:", error);
        displayModalError(error.message);
    } finally {
        predictButton.disabled = false;
        predictButton.innerHTML = `
            <span class="btn-text">Run Churn Prediction</span>
            <svg class="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        `;
    }
});

// Initial signals preview on load
updateSignalPreview();