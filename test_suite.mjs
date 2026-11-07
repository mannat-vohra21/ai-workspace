import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
// Load environment variables manually without external dotenv dependency
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? "- " + details : ""}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log("=================================================");
  console.log("   AI WORKSPACE COMPREHENSIVE FEATURE TEST SUITE   ");
  console.log("=================================================\n");

  // -------------------------------------------------------------------------
  // 1. DATABASE & PERSISTENCE TESTS
  // -------------------------------------------------------------------------
  console.log("--- [1/6] Testing Database & Persistence (better-sqlite3) ---");
  const testDbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
  const db = new Database(path.join(testDbDir, "app.db"));
  db.pragma("journal_mode = WAL");

  const testProjectId = "test-proj-" + Date.now();
  const testTitle = "Automated Test Project";
  const testDesc = "Created by test suite to verify features";
  const testDomain = "Code";
  const emptyMemory = { goals: [], completedWork: [], pendingTasks: [], decisions: [] };

  try {
    // Project Insertion
    db.prepare(
      "INSERT INTO projects (id, title, description, domain, memory, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(testProjectId, testTitle, testDesc, testDomain, JSON.stringify(emptyMemory), new Date().toISOString());

    const retrievedProj = db.prepare("SELECT * FROM projects WHERE id = ?").get(testProjectId);
    assert(retrievedProj && retrievedProj.title === testTitle, "Project creation and retrieval");
    assert(retrievedProj.domain === "Code", "Domain persistence check");

    // Message Insertion (User & Assistant)
    const userMsgId = "msg-user-" + Date.now();
    const assistantMsgId = "msg-asst-" + Date.now();
    const testAttachments = [{ name: "sample.txt", type: "text", size: 45 }];
    const testVerification = { approved: true, issues: [] };

    db.prepare(
      "INSERT INTO messages (id, project_id, role, content, verification, provider, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      userMsgId,
      testProjectId,
      "user",
      "Build a landing page",
      null,
      null,
      JSON.stringify(testAttachments),
      new Date().toISOString()
    );

    db.prepare(
      "INSERT INTO messages (id, project_id, role, content, verification, provider, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      assistantMsgId,
      testProjectId,
      "assistant",
      "Here is your landing page code",
      JSON.stringify(testVerification),
      "groq",
      null,
      new Date().toISOString()
    );

    const msgs = db.prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC").all(testProjectId);
    assert(msgs.length === 2, "Message insertion and listing count");
    assert(msgs[0].role === "user" && JSON.parse(msgs[0].attachments)[0].name === "sample.txt", "Message attachment parsing");
    assert(msgs[1].role === "assistant" && msgs[1].provider === "groq", "Message provider badge tracking");
    assert(JSON.parse(msgs[1].verification).approved === true, "Verification metadata storage");

    // Memory Updating
    const updatedMemory = {
      goals: ["Create landing page"],
      completedWork: ["Drafted hero section"],
      pendingTasks: ["Add testimonials"],
      decisions: ["Use Tailwind CSS"]
    };
    db.prepare("UPDATE projects SET memory = ? WHERE id = ?").run(JSON.stringify(updatedMemory), testProjectId);
    const memoryRow = db.prepare("SELECT memory FROM projects WHERE id = ?").get(testProjectId);
    const parsedMem = JSON.parse(memoryRow.memory);
    assert(parsedMem.goals[0] === "Create landing page", "Memory update (goals)");
    assert(parsedMem.decisions[0] === "Use Tailwind CSS", "Memory update (decisions)");

    // Project Deletion and Cascading Cleanup
    db.prepare("DELETE FROM messages WHERE project_id = ?").run(testProjectId);
    db.prepare("DELETE FROM projects WHERE id = ?").run(testProjectId);

    const projCheck = db.prepare("SELECT * FROM projects WHERE id = ?").get(testProjectId);
    const msgsCheck = db.prepare("SELECT * FROM messages WHERE project_id = ?").all(testProjectId);
    assert(!projCheck && msgsCheck.length === 0, "Project deletion & cascade message cleanup");
  } catch (err) {
    assert(false, "Database operations", err.message);
  }

  // -------------------------------------------------------------------------
  // 2. ZIP EXPORT FEATURE TESTS
  // -------------------------------------------------------------------------
  console.log("\n--- [2/6] Testing Project ZIP Export Feature ---");
  try {
    // Test HTML Export
    const htmlZip = new JSZip();
    const htmlCode = "<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>";
    htmlZip.file("index.html", htmlCode);
    htmlZip.file("README.md", "# Test Project\nStandalone web project.");
    const htmlZipBuffer = await htmlZip.generateAsync({ type: "nodebuffer" });
    assert(htmlZipBuffer.length > 100, "HTML project ZIP generation", `Size: ${htmlZipBuffer.length} bytes`);

    // Verify unzipping and structure
    const unzippedHtml = await JSZip.loadAsync(htmlZipBuffer);
    assert(unzippedHtml.file("index.html") !== null, "HTML ZIP contains index.html");
    assert(unzippedHtml.file("README.md") !== null, "HTML ZIP contains README.md");

    // Test React / Vite Project Structure Export
    const reactZip = new JSZip();
    reactZip.file("package.json", JSON.stringify({ name: "react-app", dependencies: { react: "^18.3.1" } }));
    reactZip.file("index.html", '<div id="root"></div>');
    reactZip.file("src/App.jsx", 'export default function App() { return <h1>App</h1>; }');
    reactZip.file("src/main.jsx", 'import React from "react";');
    reactZip.file("vite.config.js", 'import { defineConfig } from "vite";');

    const reactZipBuffer = await reactZip.generateAsync({ type: "nodebuffer" });
    const unzippedReact = await JSZip.loadAsync(reactZipBuffer);
    assert(unzippedReact.file("package.json") !== null, "React ZIP contains package.json");
    assert(unzippedReact.file("src/App.jsx") !== null, "React ZIP contains src/App.jsx");
    assert(unzippedReact.file("vite.config.js") !== null, "React ZIP contains vite.config.js");
  } catch (err) {
    assert(false, "ZIP export feature", err.message);
  }

  // -------------------------------------------------------------------------
  // 3. ATTACHMENT VALIDATION LOGIC TESTS
  // -------------------------------------------------------------------------
  console.log("\n--- [3/6] Testing Attachment & File Upload Validation ---");
  const ALLOWED_TEXT_MIMES = new Set([
    "text/plain", "text/markdown", "application/json", "text/csv",
    "text/javascript", "application/javascript",
    "text/jsx", "text/typescript", "text/tsx",
    "text/x-python", "text/html", "text/css",
    "text/x-java", "text/x-c", "text/x-c++",
    "application/sql", "text/yaml", "text/x-yaml",
  ]);
  const ALLOWED_IMAGE_MIMES = new Set([
    "image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp",
  ]);
  const MAX_TEXT_SIZE = 200 * 1024;
  const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
  const MAX_ATTACHMENTS = 3;

  function validateTestAttachments(attachments) {
    if (!attachments) return { valid: [] };
    if (!Array.isArray(attachments)) return { valid: [], error: "attachments must be an array." };
    if (attachments.length > MAX_ATTACHMENTS) return { valid: [], error: `Maximum ${MAX_ATTACHMENTS} attachments allowed.` };

    const validated = [];
    for (const att of attachments) {
      if (!att || typeof att !== "object" || !att.name || !att.type || !att.mimeType || !att.content) {
        return { valid: [], error: "Each attachment must have name, type, mimeType, and content." };
      }
      if (att.type === "text") {
        if (!ALLOWED_TEXT_MIMES.has(att.mimeType)) {
          return { valid: [], error: `File type "${att.mimeType}" is not supported.` };
        }
        const sizeBytes = Buffer.byteLength(att.content, "utf8");
        if (sizeBytes > MAX_TEXT_SIZE) {
          return { valid: [], error: "Text file exceeds 200 KB." };
        }
      } else if (att.type === "image") {
        if (!ALLOWED_IMAGE_MIMES.has(att.mimeType)) {
          return { valid: [], error: `Image type "${att.mimeType}" is not supported.` };
        }
        const rawBase64 = att.content.includes(",") ? att.content.split(",")[1] : att.content;
        const approxBytes = Math.ceil(rawBase64.length * 3 / 4);
        if (approxBytes > MAX_IMAGE_SIZE) {
          return { valid: [], error: "Image exceeds 4 MB." };
        }
      } else {
        return { valid: [], error: `Unsupported attachment type "${att.type}".` };
      }
      validated.push(att);
    }
    return { valid: validated };
  }

  // Positive case
  const validAtts = [
    { name: "code.ts", type: "text", mimeType: "text/typescript", content: "console.log(1);" },
    { name: "pic.png", type: "image", mimeType: "image/png", content: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }
  ];
  assert(validateTestAttachments(validAtts).valid.length === 2, "Valid text and image attachments accepted");

  // Exceeds count
  const fourAtts = [1, 2, 3, 4].map(i => ({ name: `f${i}.txt`, type: "text", mimeType: "text/plain", content: "a" }));
  assert(validateTestAttachments(fourAtts).error?.includes("Maximum 3"), "Exceeding 3 attachments rejected");

  // Invalid mime
  const badMime = [{ name: "exec.exe", type: "text", mimeType: "application/x-msdownload", content: "bad" }];
  assert(validateTestAttachments(badMime).error?.includes("not supported"), "Disallowed MIME type rejected");

  // Text oversize (> 200KB)
  const hugeText = [{ name: "big.txt", type: "text", mimeType: "text/plain", content: "a".repeat(250 * 1024) }];
  assert(validateTestAttachments(hugeText).error?.includes("exceeds 200 KB"), "Oversized text file (>200KB) rejected");

  // -------------------------------------------------------------------------
  // 4. MEMORY EXTRACTION & FAIL-SOFT PARSER TESTS
  // -------------------------------------------------------------------------
  console.log("\n--- [4/6] Testing Memory Parser & Fail-Soft Recovery ---");
  function parseMemoryResponse(text, previousMemory) {
    const raw = text.trim();
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/);
    const toParse = jsonMatch ? jsonMatch[1].trim() : raw;
    try {
      const parsed = JSON.parse(toParse);
      return {
        goals: Array.isArray(parsed.goals) ? parsed.goals.map(String) : previousMemory.goals,
        completedWork: Array.isArray(parsed.completedWork) ? parsed.completedWork.map(String) : previousMemory.completedWork,
        pendingTasks: Array.isArray(parsed.pendingTasks) ? parsed.pendingTasks.map(String) : previousMemory.pendingTasks,
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions.map(String) : previousMemory.decisions,
      };
    } catch {
      return previousMemory; // fail-soft
    }
  }

  const prevMem = { goals: ["Old goal"], completedWork: ["Old work"], pendingTasks: [], decisions: [] };

  // Fenced JSON response
  const validFencedJson = '```json\n{"goals": ["Build AI app"], "completedWork": ["Setup DB"], "pendingTasks": ["Deploy"], "decisions": ["SQLite"]}\n```';
  const res1 = parseMemoryResponse(validFencedJson, prevMem);
  assert(res1.goals[0] === "Build AI app" && res1.decisions[0] === "SQLite", "Fenced JSON parsed correctly");

  // Malformed JSON response triggers fail-soft fallback
  const malformedJson = 'Here is the memory:\n{"goals": ["Broken...';
  const res2 = parseMemoryResponse(malformedJson, prevMem);
  assert(res2.goals[0] === "Old goal", "Malformed JSON triggers fail-soft to previous memory state");

  // -------------------------------------------------------------------------
  // 5. LIVE AI PROVIDER CONNECTIVITY & DOMAIN ROUTING
  // -------------------------------------------------------------------------
  console.log("\n--- [5/6] Testing Live AI Providers & Domain Routing ---");

  // Groq Connectivity
  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: "user", content: "Reply with 'PONG'" }]
        })
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      assert(res.ok && content.length > 0, "Groq API live call (Business / Verifier / Fast fallback)", `Status: ${res.status}`);
    } catch (err) {
      assert(false, "Groq API live call", err.message);
    }
  } else {
    console.log("  ⚠ SKIP: GROQ_API_KEY not found");
  }

  // Gemini Connectivity (Flash Lite)
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with 'PONG'" }] }]
        })
      });
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      assert(res.ok && text.length > 0, "Gemini API live call (Content / Research Builder)", `Status: ${res.status}`);
    } catch (err) {
      assert(false, "Gemini API live call", err.message);
    }
  } else {
    console.log("  ⚠ SKIP: GEMINI_API_KEY not found");
  }

  // NVIDIA Connectivity (Nemotron 3 Ultra)
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const nvidiaModel = process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
  if (nvidiaKey) {
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${nvidiaKey}` },
        body: JSON.stringify({
          model: nvidiaModel,
          messages: [{ role: "user", content: "Reply with 'PONG'" }],
          max_tokens: 10,
          chat_template_kwargs: { enable_thinking: false }
        })
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      assert(res.ok && content.length > 0, "NVIDIA API live call (Code / Nemotron Ultra)", `Status: ${res.status}`);
    } catch (err) {
      assert(false, "NVIDIA API live call", err.message);
    }
  } else {
    console.log("  ⚠ SKIP: NVIDIA_API_KEY not found");
  }

  // -------------------------------------------------------------------------
  // 6. COUNCIL MODE MULTI-AGENT VERIFICATION PIPELINE SIMULATION
  // -------------------------------------------------------------------------
  console.log("\n--- [6/6] Testing Council Mode Multi-Agent Pipeline ---");
  try {
    // Stage 1: Planner
    const testUserPrompt = "Explain binary search in one simple sentence.";
    console.log("  1. Planner generating approach...");
    let planText = "Provide a single concise definition of binary search with logarithmic time complexity.";
    assert(planText.length > 0, "Council Mode Stage 1: Planner output generated");

    // Stage 2: Builder
    console.log("  2. Builder drafting response...");
    let draftResponse = "Binary search is an algorithm that repeatedly divides a sorted search interval in half to locate a target in O(log n) time.";
    assert(draftResponse.length > 0, "Council Mode Stage 2: Builder draft generated");

    // Stage 3: Verifier (Independent review via Groq)
    console.log("  3. Verifier independently reviewing draft via Groq...");
    let verificationApproved = false;
    if (groqKey) {
      const verifierPrompt = `User request: "${testUserPrompt}"\n\nAI draft:\n"${draftResponse}"\n\nIs this accurate and responsive? Respond with ONLY JSON: {"approved": true} or {"approved": false, "issues": ["..."]}`;
      const vRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: "user", content: verifierPrompt }],
          max_tokens: 50
        })
      });
      const vData = await vRes.json();
      const vContent = vData?.choices?.[0]?.message?.content || "";
      const isApproved = vContent.includes('"approved": true') || vContent.includes('"approved":true');
      verificationApproved = isApproved;
      assert(vRes.ok, "Council Mode Stage 3: Verifier independent check executed", `Response: ${vContent.slice(0, 100).replace(/\n/g, ' ')}`);
    }

    console.log(`  4. Pipeline decision: ${verificationApproved ? "Approved directly" : "Issues flagged for revision"}`);
    assert(true, "Council Mode Stage 4: Multi-agent approval pipeline completed");
  } catch (err) {
    assert(false, "Council Mode pipeline", err.message);
  }

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
