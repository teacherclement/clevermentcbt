// ============================================================
// CleverMent CBT - Backend Server
// ============================================================
// Handles: teacher/admin auth, Flutterwave payments, admin
// teacher-management, and (as of this update) the full exam
// pipeline - publishing, fetching, and grading assessments -
// plus results management. These moved here because grading and
// answer-secrecy cannot be enforced safely from the browser: a
// client can always be tampered with, so anything that decides
// "did this answer earn a point" or "what are the correct
// answers" must live where it can't be edited by the person
// taking the exam.
//
// Question banks, CSV upload history, class rosters, FAQs, and
// settings still talk to Supabase directly from the browser for
// now - lower-stakes tables, addressed in a later pass.
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');

const app = express();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_WEBHOOK_HASH = process.env.FLW_WEBHOOK_HASH;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
// ------------------------------------------------------------
// CleverBot AI providers - all FREE tiers, tried in order until one answers.
// Add any of these keys in the Render environment (one is enough, all three is best):
//   MISTRAL_API_KEY     free (phone number, no card), very large limits (text + images)
//   CEREBRAS_API_KEY    now needs a payment card - optional, skip it if you have none
//   GROQ_API_KEY        free, very fast, small per-minute limit (text + images)
//   OPENROUTER_API_KEY  free models, about 50 requests/day (text + images)
// Optional overrides (comma-separated model lists, first = preferred):
//   MISTRAL_MODELS, GROQ_MODELS, GROQ_VISION_MODELS, OPENROUTER_MODELS, OPENROUTER_VISION_MODELS,
//   CEREBRAS_MODELS, AI_PROVIDER_ORDER (default: mistral,groq,openrouter,cerebras)
// ------------------------------------------------------------
function csvEnv(name, fallback) {
    return String(process.env[name] || fallback).split(',').map(function(x) { return x.trim(); }).filter(Boolean);
}
function aiNum(name, fallback) {
    var n = parseInt(process.env[name], 10);
    return n > 0 ? n : fallback;
}
function buildAiProviders() {
    var defs = {
        mistral: {
            key: process.env.MISTRAL_API_KEY, host: 'api.mistral.ai', path: '/v1/chat/completions', tokenParam: 'max_tokens',
            text: csvEnv('MISTRAL_MODELS', 'mistral-small-latest'), vision: csvEnv('MISTRAL_VISION_MODELS', 'mistral-small-latest'),
            maxRequestTokens: aiNum('MISTRAL_MAX_REQUEST_TOKENS', 120000), imageUrlAsString: true
        },
        cerebras: {
            key: process.env.CEREBRAS_API_KEY, host: 'api.cerebras.ai', path: '/v1/chat/completions', tokenParam: 'max_completion_tokens',
            text: csvEnv('CEREBRAS_MODELS', 'gpt-oss-120b'), vision: csvEnv('CEREBRAS_VISION_MODELS', ''),
            maxRequestTokens: aiNum('CEREBRAS_MAX_REQUEST_TOKENS', 24000)
        },
        groq: {
            key: process.env.GROQ_API_KEY, host: 'api.groq.com', path: '/openai/v1/chat/completions', tokenParam: 'max_completion_tokens',
            text: csvEnv('GROQ_MODELS', 'openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b'),
            vision: csvEnv('GROQ_VISION_MODELS', 'qwen/qwen3.6-27b'),
            maxRequestTokens: aiNum('GROQ_MAX_REQUEST_TOKENS', 7000),
            maxOutput: aiNum('GROQ_MAX_OUTPUT', 3000) // keeps one request inside Groq's small per-minute limit; longer answers continue automatically
        },
        openrouter: {
            key: process.env.OPENROUTER_API_KEY, host: 'openrouter.ai', path: '/api/v1/chat/completions', tokenParam: 'max_tokens',
            text: csvEnv('OPENROUTER_MODELS', 'openai/gpt-oss-120b:free,openrouter/free'), vision: csvEnv('OPENROUTER_VISION_MODELS', 'openrouter/free'),
            maxRequestTokens: aiNum('OPENROUTER_MAX_REQUEST_TOKENS', 100000), extraHeaders: { 'X-Title': 'CleverMent' }
        }
    };
    return csvEnv('AI_PROVIDER_ORDER', 'mistral,groq,openrouter,cerebras').map(function(name) {
        var d = defs[name];
        return d ? Object.assign({ name: name }, d) : null;
    }).filter(function(p) { return p && p.key; });
}
const AI_PROVIDERS = buildAiProviders();

const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'ADMIN_PASSWORD', 'FLW_SECRET_KEY']
    .filter(function(name) { return !process.env[name]; });
if (missing.length > 0) {
    console.error('Missing required environment variables: ' + missing.join(', '));
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '24mb' }));


// Assessment images are stored in a private-by-default Supabase project using
// a small public bucket for the actual image URLs. Uploads are performed by
// this server with the service-role key so teachers never receive that key.
const ASSESSMENT_IMAGE_BUCKET = 'assessment-images';
const ASSESSMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

async function ensureAssessmentImageBucket() {
    try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) {
            console.warn('Assessment image bucket check failed:', listError.message);
            return;
        }
        const exists = (buckets || []).some(function(b) { return b.name === ASSESSMENT_IMAGE_BUCKET; });
        if (!exists) {
            const { error } = await supabase.storage.createBucket(ASSESSMENT_IMAGE_BUCKET, {
                public: true,
                fileSizeLimit: '5MB',
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            });
            if (error && !/already exists|duplicate/i.test(error.message || '')) {
                console.warn('Could not create assessment image bucket:', error.message);
            }
        }
    } catch (e) {
        console.warn('Assessment image bucket setup failed:', e.message);
    }
}
ensureAssessmentImageBucket();


// ============================================================
// STUDENT ACCESS LOGGING
// Access events use their own table.  The existing
// cleverment_settings table is reserved for application settings
// such as reactivation_fee and must not be used as an event log.
// ============================================================
async function logStudentAccessEvent(teacherEmail, event) {
    try {
        if (!teacherEmail) return;
        var item = event || {};
        var writePromise = supabase.from('cleverment_access_logs').insert([{
            teacher_email: String(teacherEmail).trim().toLowerCase(),
            timestamp: item.timestamp || new Date().toISOString(),
            code: String(item.code || '').trim().toUpperCase(),
            subject: String(item.subject || ''),
            class_name: String(item.className || ''),
            student_name: String(item.studentName || ''),
            admission_number: String(item.admissionNumber || ''),
            status: String(item.status || ''),
            message: String(item.message || ''),
            source: String(item.source || 'student')
        }]);
        var timeoutPromise = new Promise(function(resolve) {
            setTimeout(function() {
                resolve({ error: { message: 'Access log write timed out.' } });
            }, 3000);
        });
        var result = await Promise.race([writePromise, timeoutPromise]);
        if (result && result.error) {
            console.warn('Student access log write failed:', result.error.message);
        }
    } catch (e) {
        console.warn('Student access log error:', e.message);
    }
}

function accessEventFromRequest(req) {
    var body = req.body || {};
    return {
        code: String(body.code || '').trim().toUpperCase(),
        studentName: String(body.studentName || '').trim(),
        admissionNumber: String(body.admissionNumber || '').trim(),
        source: String(body.source || 'student')
    };
}

function normalizeAccessName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function safeAssessmentImageExtension(mime) {
    var map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
    };
    return map[mime] || null;
}


// ============================================================
// CLEVERBOT - AI ANSWER-ONLY ASSISTANT
// API key stays on the server. No app actions/tools are exposed.
// Uses free AI providers (Mistral, Groq, OpenRouter free models, optional Cerebras) with automatic failover.
// ============================================================
const cleverBotLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'CleverBot is receiving too many requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false
});

function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ------------------------------------------------------------
// CleverBot: what does the person want? (CleverMent CSV vs normal chat)
// Pure functions - no network, easy to test.
// ------------------------------------------------------------
var CB_GEN_VERB = '(?:gen[ea]?r[ae]?t\\w*|creat\\w*|mak\\w*|giv\\w*|writ\\w*|prepar\\w*|produc\\w*|draft\\w*|compos\\w*|extract\\w*|convert\\w*|turn\\w*|build\\w*|craft\\w*|provid\\w*|design\\w*|formulat\\w*|compil\\w*|develop\\w*|reformat\\w*|rewrit\\w*|transform\\w*|frame|list|set|put)';
var CB_Q_NOUN = '(?:questions?|mcqs?|multiple[- ]choice|quiz(?:zes)?)';
var CB_RE_GENERIC = new RegExp('\\b' + CB_GEN_VERB + '\\b[^.!?\\n]{0,70}?\\b' + CB_Q_NOUN + '\\b', 'i');
var CB_RE_NEED_NUM = new RegExp('\\b(?:need|want|require|would like)\\s+(?:to get\\s+)?(?:\\d{1,3}|some|a few|more)\\s+(?:\\w+\\s+){0,3}' + CB_Q_NOUN + '\\b', 'i');
var CB_RE_Q_FROM_SOURCE = new RegExp('\\b' + CB_Q_NOUN + '\\b[^.!?\\n]{0,40}?\\b(?:from|using|based on|out of)\\b[^.!?\\n]{0,40}?\\b(?:file|image|document|doc|pdf|picture|photo|attached|attachment|this|these|note|notes|text|passage|chapter|page|pages|slide|slides|scheme|material)\\b', 'i');

function cleverBotLastAssistantText(history) {
    for (var i = history.length - 1; i >= 0; i--) {
        var h = history[i];
        if (h && h.role === 'assistant' && h.text) return String(h.text);
    }
    return '';
}

// Returns 'csv' when the person wants CleverMent-format questions, else 'chat'.
function cleverBotIntent(message, history, hasAttachments) {
    var msg = String(message || '');
    history = Array.isArray(history) ? history : [];

    // 1. They said they do NOT want CSV.
    if (/\b(?:no|not|without|don'?t (?:use|give|want|need)|instead of)\s+(?:a\s+|the\s+)?csv\b/i.test(msg)) return 'chat';

    // 2. A plain "how do I / what is ..." question about the format is just a question.
    var infoStart = /^\s*(?:what|what's|whats|which|how|where|why|who|when|explain|describe|tell me (?:about|how|what))\b/i.test(msg);
    if (infoStart && !hasAttachments) return 'chat';

    var mentionsCM = /clever\s*-?\s*ment/i.test(msg);
    var formatWord = /\b(?:format|formats|style|csv|template|layout|structure|spreadsheet|sheet|excel|import|upload|import-ready)\b/i.test(msg);
    var qNoun = new RegExp('\\b' + CB_Q_NOUN + '\\b', 'i').test(msg);
    var generic = CB_RE_GENERIC.test(msg) || CB_RE_NEED_NUM.test(msg) || CB_RE_Q_FROM_SOURCE.test(msg);
    var csvWord = /\bcsv\b/i.test(msg);

    // 3. "CleverMent format / style / CSV / template ..." - the magic words.
    if (mentionsCM && formatWord) return 'csv';
    // 4. "CleverMent questions" together with a request or a file.
    if (mentionsCM && qNoun && (generic || hasAttachments)) return 'csv';
    // 5. "... in CSV".
    if (csvWord && (generic || qNoun || hasAttachments)) return 'csv';

    // 6. Follow-ups right after a CSV reply: "10 more", "same format", "make them harder".
    var lastBotText = cleverBotLastAssistantText(history);
    var prevWasCsv = /```csv/i.test(lastBotText) || /Question\s*,\s*Option\s*A\s*,/i.test(lastBotText) ||
        (lastBotText.match(/^.+,\s*[A-Da-d]\s*,?\s*$/gm) || []).length >= 2;
    if (prevWasCsv && /\b(?:more|another|again|same|next|rest|remaining|additional|extra|regenerate|redo|replace|add|change|fix|harder|easier|shorter|longer|different|new|format|\d+)\b/i.test(msg)) return 'csv';

    // 7. Ordinary "generate N questions ..." requests (this platform's default is CleverMent CSV),
    //    unless the person clearly wants something else (essay questions, explanations ...).
    var otherKind = /\b(?:essay|theory|short[- ]answer|open[- ]ended|true or false|true\/false|fill[- ]in|subjective|structured|oral|comprehension)\b/i.test(msg);
    var wantsExplanation = /\b(?:explain|explanation|explanations|reasoning|step[- ]by[- ]step|walk me through|tips?|advice|how to|best way|is hard|is difficult)\b/i.test(msg);
    if (generic && !otherKind && !wantsExplanation) return 'csv';

    return 'chat';
}

function cleverBotRequestedCount(message) {
    var m = String(message || '').match(/\b(\d{1,3})\b\s*(?:[A-Za-z][A-Za-z-]*\s+){0,3}(?:questions?|mcqs?)/i);
    return m ? parseInt(m[1], 10) : 0;
}

function cleverBotLooksComplex(message, hasAttachments) {
    var msg = String(message || '');
    return hasAttachments || msg.length > 200 ||
        /\b(?:solve|calculate|compute|prove|derive|simplify|integrate|differentiate|equation|algorithm|debug|code|program|function|essay|analy[sz]e|compare|evaluate|translate|summari[sz]e|step[- ]by[- ]step|why|how does|explain|difficult|hard)\b/i.test(msg);
}

var CB_CSV_HEADER = 'Question,Option A,Option B,Option C,Option D,Correct Answer,';

function cleverBotBaseSystemText(context) {
    return 'You are CleverBot, the AI assistant built into the CleverMent assessment platform. ' +
        'You are a capable, general-purpose assistant on the level of ChatGPT, Claude and Gemini. ' +
        'You help with school subjects at every level, mathematics and science, coding, writing and editing, summarising and explaining documents and images, translation, study and career advice, and everyday questions. ' +
        'Do not limit yourself to CleverMent topics; answer anything helpfully. You can also answer questions about CleverMent itself accurately.\n\n' +
        'HOW TO ANSWER:\n' +
        '- Think the problem through before you answer. For mathematics, science and logic, work step by step and double-check the final result.\n' +
        '- Give the answer first, then the explanation. Match the depth to the question: short for simple questions, thorough and well organised for complex ones. Do not pad, do not repeat the question, do not add needless disclaimers.\n' +
        '- Use Markdown for readability: short paragraphs, bullet or numbered lists, tables for comparisons, **bold** for key terms, headings for long answers, and fenced code blocks (with the language name) for code. ' +
        'Write mathematics in LaTeX between dollar signs only (never use \\( \\) or \\[ \\] brackets), for example $x^2 + 1$ inline and $$\\frac{a}{b}$$ for display equations.\n' +
        '- Reply in the language the person writes in.\n' +
        '- If a request is ambiguous in a way that changes the answer, ask one short clarifying question. Otherwise make a sensible assumption, say it in a few words, and carry on.\n' +
        '- Be honest. If you are not sure, say so. Never invent facts, sources, or private CleverMent data you were not given.\n' +
        '- Be friendly, respectful and encouraging.\n\n' +
        'LIMITS INSIDE THE APP: you are answer-only. You must NEVER perform, trigger, simulate, or claim to have performed an app action. ' +
        'You cannot publish assessments, delete results, modify records, change settings, send messages, or operate buttons. ' +
        'If asked to perform an action, explain how the person can do it themselves.\n\n' +
        'Current CleverMent page/context: ' + (context || 'Not provided.') + '\n' +
        'If an attachment is supplied, read it carefully and answer from its contents.';
}

function cleverBotCsvModeText() {
    return '\n\n=== CLEVERMENT CSV MODE (this overrides every other formatting rule for THIS reply) ===\n' +
        'The person wants multiple-choice questions in the CleverMent import format. ' +
        'Reply with ONE fenced code block that starts with ```csv and ends with ``` and contains the CSV and NOTHING else. ' +
        'No greeting, no explanation, no notes, no question numbers, no text before or after the code block.\n\n' +
        'FIXED LAYOUT:\n' +
        'Line 1 is ALWAYS this exact header row (CleverMent skips line 1 when importing, so without it the first question would be lost):\n' +
        CB_CSV_HEADER + '\n' +
        'Every following line is exactly ONE question with 7 fields separated by commas: Question, Option A, Option B, Option C, Option D, Correct Answer, and an EMPTY Image URL field. Every row therefore ends with a comma.\n\n' +
        'RULES:\n' +
        '1. Exactly 4 options per question and exactly ONE correct option. Each option cell holds only the option text (no "A." or "(a)" prefixes).\n' +
        '2. Correct Answer is a single capital letter: A, B, C or D. Spread the correct answers across A, B, C and D; do not favour one letter.\n' +
        '3. One question per line. Never put a line break inside a cell.\n' +
        '4. If a cell contains a comma, wrap that whole cell in double quotes. Never use a double-quote character inside the text of a cell (use single quotes or rephrase) because the importer cannot read escaped quotes.\n' +
        '5. Write mathematics in LaTeX between dollar signs, e.g. $\\frac{2}{5}$, $x^2 + 3x$, $\\sqrt{36}$. Write the backslashes exactly once, as shown. Plain-number questions such as What is 5 x 5? stay plain text.\n' +
        '6. Fill-in-the-blank style questions use five underscores: _____\n' +
        '7. Image URL: ALWAYS leave it empty (the teacher adds pictures inside CleverMent). For questions about an attached diagram or figure, word them so they make sense with the picture attached, like: This diagram is called _____ or What is the name of the figure above?\n' +
        '8. Quantity: if the person gives a number, write EXACTLY that many questions. If no number is given, write 10. If they ask for "all" or "as many as possible", cover the whole material evenly (maximum 60). Never write more than 100.\n' +
        '9. Source: if a file, image or document is attached, base every question ONLY on its content and cover it evenly from start to end. If the attachment already contains questions, convert them faithfully into this format without inventing new ones (keep their wording; work out the correct answer if it is not given). If nothing is attached, use the topic, subject and class level the person states.\n' +
        '10. Quality: every question must be clear, unambiguous and factually correct, with plausible wrong options. Check each answer is right before you write it.\n' +
        '11. Only exception: if you truly cannot do it (the attachment cannot be read, or you were given no topic and no material at all), reply with ONE short sentence saying what you need instead of a code block.\n\n' +
        'EXAMPLE OF THE EXACT OUTPUT STYLE:\n' +
        '```csv\n' +
        CB_CSV_HEADER + '\n' +
        'What is 2 + 2?,3,4,5,6,B,\n' +
        'What is the capital of Nigeria?,Lagos,Abuja,Kano,Ibadan,B,\n' +
        'This diagram is called _____,Brain,Head,Ankle,Skull,D,\n' +
        '"What is the value of $\\sqrt{\\frac{16}{25}}$, expressed as a simplified fraction?",$\\frac{2}{5}$,$\\frac{4}{5}$,$\\frac{3}{5}$,$\\frac{1}{2}$,B,\n' +
        '"If $2x + 5 = 15$, where $x$ is a positive integer, what is the value of $x$?",$x = 4$,$x = 6$,$x = 5$,$x = 3$,C,\n' +
        'What is the name of the figure above?,Cylinder,Cuboid,Sphere,Cone,A,\n' +
        '```';
}

// ------------------------------------------------------------
// OpenRouter (OpenAI-style streaming API) + retry wrapper.
// Images are sent to a vision-capable model; PDFs and audio cannot be read directly
// (the browser extracts PDF text, or turns scanned pages into pictures, before sending).
var AI_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Converts the internal message format into the OpenAI-style messages OpenRouter expects.
// Images become image_url parts; any other binary (PDF, audio ...) is replaced by a short
// note so the model can tell the person it could not read it instead of failing.
function geminiContentsToMessages(contents) {
    return (contents || []).map(function(c) {
        var role = c.role === 'model' ? 'assistant' : 'user';
        var parts = c.parts || [];
        var hasImage = false;
        var blocks = [];
        parts.forEach(function(p) {
            if (typeof p.text === 'string') {
                blocks.push({ type: 'text', text: p.text });
            } else if (p.inline_data && p.inline_data.data) {
                var mime = String(p.inline_data.mime_type || '').toLowerCase();
                if (role === 'user' && AI_IMAGE_TYPES.indexOf(mime) !== -1) {
                    hasImage = true;
                    blocks.push({ type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + p.inline_data.data } });
                } else {
                    blocks.push({ type: 'text', text: '[An attachment of type ' + (mime || 'unknown') + ' was sent but cannot be read. Tell the person to attach it as a JPG/PNG image, or as a PDF or document that contains text.]' });
                }
            }
        });
        if (!hasImage) return { role: role, content: blocks.map(function(x) { return x.text; }).join('\n\n') };
        return { role: role, content: blocks };
    });
}

async function streamLLM(payload, res, opts, provider, model, messages) {
    var silent = !!(opts && opts.silent);
    var gc = payload.generationConfig || {};
    var level = gc.thinkingConfig && gc.thinkingConfig.thinkingLevel;
    var bodyObj = { model: model, messages: messages, stream: true };
    var wantOut = gc.maxOutputTokens || 8000;
    bodyObj[provider.tokenParam] = provider.maxOutput ? Math.min(wantOut, provider.maxOutput) : wantOut;
    if (provider.imageUrlAsString) {
        bodyObj.messages = messages.map(function(m) {
            if (!Array.isArray(m.content)) return m;
            return { role: m.role, content: m.content.map(function(b) { return b.type === 'image_url' ? { type: 'image_url', image_url: b.image_url.url } : b; }) };
        });
    }
    if (provider.name === 'openrouter') {
        // the free router picks its own model; for named models, only hard questions think first
        if (!/^openrouter\//.test(model)) bodyObj.reasoning = level === 'medium' ? { enabled: true, effort: 'high' } : { enabled: false };
    } else if (/gpt-oss/i.test(model)) {
        bodyObj.reasoning_effort = level === 'medium' ? 'medium' : 'low';
    }
    var body = JSON.stringify(bodyObj);

    return new Promise(function(resolve, reject) {
        var collected = '';
        var finishReason = null;
        var sent = false;
        var fatal = null;
        var settled = false;
        var firstTimer = null;
        var inThink = false;
        // Some models write their private reasoning between <think> tags: never show it.
        function stripThink(t) {
            var out = '';
            while (t.length) {
                if (inThink) {
                    var e = t.indexOf('</think>');
                    if (e < 0) return out;
                    t = t.slice(e + 8); inThink = false;
                } else {
                    var st = t.indexOf('<think>');
                    if (st < 0) { out += t; t = ''; }
                    else { out += t.slice(0, st); t = t.slice(st + 7); inThink = true; }
                }
            }
            return out;
        }
        function fail(err) { if (settled) return; settled = true; clearTimeout(firstTimer); err.sentText = sent; reject(err); }
        function finish(value) { if (settled) return; settled = true; clearTimeout(firstTimer); resolve(value); }

        function handleLine(line) {
            if (line.indexOf('data:') !== 0) return;
            var raw = line.slice(5).trim();
            if (!raw || raw === '[DONE]') return;
            try {
                var obj = JSON.parse(raw);
                if (obj.error) { fatal = new Error(typeof obj.error === 'string' ? obj.error : (obj.error.message || 'AI service error.')); return; }
                var choice = obj.choices && obj.choices[0];
                if (!choice) return;
                if (choice.finish_reason) finishReason = choice.finish_reason;
                var text = choice.delta && choice.delta.content;
                if (text) text = stripThink(text);
                if (text) {
                    collected += text;
                    if (opts && opts.onText) {
                        sent = true; // the caller already used this text, so this try must not be repeated blindly
                        try { opts.onText(text); } catch (e) {}
                    } else if (!silent) {
                        sent = true;
                        try { res.write('data: ' + JSON.stringify({ text: text }) + '\n\n'); } catch (e) {}
                    }
                }
            } catch (e) { /* incomplete line - the next chunk completes it */ }
        }

        var headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Authorization': 'Bearer ' + provider.key,
            'Accept': 'text/event-stream'
        };
        Object.keys(provider.extraHeaders || {}).forEach(function(k) { headers[k] = provider.extraHeaders[k]; });

        var req = https.request({
            hostname: provider.host,
            path: provider.path,
            method: 'POST',
            headers: headers,
            timeout: (opts && opts.timeoutMs) || 45000
        }, function(response) {
            if (response.statusCode < 200 || response.statusCode >= 300) {
                var errChunks = [];
                response.on('data', function(c) { errChunks.push(c); });
                response.on('end', function() {
                    var data = null;
                    try { data = JSON.parse(Buffer.concat(errChunks).toString('utf8')); } catch (e) {}
                    var msg = (data && data.error && data.error.message) || (data && typeof data.error === 'string' && data.error) || (data && data.message) || (data && data.detail) || 'AI request failed.';
                    if (typeof msg !== 'string') msg = JSON.stringify(msg).slice(0, 200);
                    var err = new Error(msg); err.statusCode = response.statusCode; fail(err);
                });
                return;
            }
            var buffer = '';
            response.on('data', function(chunk) {
                buffer += chunk.toString('utf8');
                var lines = buffer.split(/\r?\n/);
                buffer = lines.pop() || '';
                lines.forEach(handleLine);
                if (fatal) fail(fatal);
                // The caller has everything it needs (for example all requested questions): stop paying for more.
                if (!settled && opts && opts.shouldStop && opts.shouldStop()) {
                    finish({ finishReason: 'STOP', text: collected });
                    try { req.destroy(); } catch (e) {}
                }
            });
            response.on('end', function() {
                if (buffer) handleLine(buffer);
                if (fatal) return fail(fatal);
                if (!collected) { var ne = new Error('AI service returned no text.'); ne.statusCode = 502; return fail(ne); }
                if (!silent) { try { res.write('data: ' + JSON.stringify({ done: true }) + '\n\n'); } catch (e) {} }
                finish({ finishReason: finishReason === 'length' ? 'MAX_TOKENS' : 'STOP', text: collected });
            });
            response.on('error', fail);
        });
        req.on('timeout', function() { var te = new Error('AI service timed out.'); te.statusCode = 408; req.destroy(te); });
        req.on('error', fail);
        // Keep-alive pings from some services reset the idle timer, so also give up when no
        // answer text has started within this time.
        firstTimer = setTimeout(function() {
            if (!collected && !settled) { var fe = new Error('AI service was too slow to start.'); fe.statusCode = 408; req.destroy(fe); }
        }, (opts && opts.firstTokenMs) || 25000);
        req.write(body); req.end();
    });
}

function friendlyAiError(e, allTooBig) {
    var code = e && e.statusCode;
    var msg;
    if (allTooBig || code === 413) msg = 'That file or message is too long for the free AI service. Please use fewer pages, a shorter document, or ask for fewer questions at a time.';
    else if (code === 401 || code === 403) msg = 'CleverBot\u2019s AI key is not valid. Please contact the administrator.';
    else if (code === 402) msg = 'CleverBot\u2019s AI account has no credit. Please contact the administrator.';
    else if (code === 429) msg = 'CleverBot\u2019s free AI limit has been reached for now. Please try again in a few minutes.';
    else msg = 'CleverBot is temporarily busy. Please try again in a moment.';
    var err = new Error(msg);
    err.statusCode = (code === 429) ? 429 : (allTooBig || code === 413 ? 413 : 503);
    return err;
}

// Rough size of a request in tokens (free tiers limit tokens per request / per minute).
function estimateRequestTokens(messages, maxOut) {
    var chars = 0, images = 0;
    messages.forEach(function(m) {
        if (typeof m.content === 'string') chars += m.content.length;
        else (m.content || []).forEach(function(b) { if (b.type === 'text') chars += (b.text || '').length; else images++; });
    });
    return Math.ceil(chars / 3.3) + images * 1200 + (maxOut || 8000);
}

// Remembers which provider/model just failed so the next requests do not waste time on it.
var aiCooldown = {};
function aiCoolFor(code) {
    if (code === 401 || code === 403 || code === 404 || code === 400 || code === 402) return 30 * 60 * 1000;
    if (code === 429) return 90 * 1000;
    return 3 * 60 * 1000;
}

// Tries every configured free provider (and each of its models) until one answers.
// A try is only repeated elsewhere when nothing has reached the browser yet.
async function streamAI(payload, res, opts) {
    if (!AI_PROVIDERS.length) {
        var nc = new Error('CleverBot is not configured on the server yet.'); nc.statusCode = 503; throw nc;
    }
    var messages = geminiContentsToMessages(payload.contents);
    var hasImages = messages.some(function(m) { return Array.isArray(m.content); });
    var wantOut = (payload.generationConfig && payload.generationConfig.maxOutputTokens) || 8000;
    var now = Date.now();
    var candidates = [], skippedBig = 0;
    AI_PROVIDERS.forEach(function(provider) {
        var models = hasImages ? provider.vision : provider.text;
        if (!models.length) return;
        var needTokens = estimateRequestTokens(messages, provider.maxOutput ? Math.min(wantOut, provider.maxOutput) : wantOut);
        if (needTokens > provider.maxRequestTokens) { skippedBig++; return; }
        models.forEach(function(model) { candidates.push({ provider: provider, model: model }); });
    });
    // models that failed a moment ago go to the back of the line (but are still tried if nothing else works)
    var ready = candidates.filter(function(c) { return !(aiCooldown[c.provider.name + '/' + c.model] > now); });
    var cooling = candidates.filter(function(c) { return aiCooldown[c.provider.name + '/' + c.model] > now; });
    candidates = ready.concat(cooling);

    var deadline = now + 90000;
    var lastError = null, tried = 0, badKey = {};
    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        if (badKey[c.provider.name]) continue;
        if (Date.now() > deadline) break;
        if (tried > 0 && opts && opts.onStatus) { try { opts.onStatus('Trying another AI service…'); } catch (e) {} }
        tried++;
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                return await streamLLM(payload, res, opts, c.provider, c.model, messages);
            } catch (e) {
                lastError = e;
                if (e && e.sentText) throw e;
                var code = e && e.statusCode;
                console.warn('CleverBot AI ' + c.provider.name + '/' + c.model + ' failed: ' + ((e && e.message) || 'unknown error') + (code ? ' (HTTP ' + code + ')' : ''));
                if ((code === 429 || code === 503) && attempt === 0 && Date.now() < deadline - 5000) { await sleep(1500); continue; } // brief capacity limit: one quick retry
                aiCooldown[c.provider.name + '/' + c.model] = Date.now() + aiCoolFor(code);
                if (code === 401 || code === 403) badKey[c.provider.name] = true; // wrong key: skip this provider's other models
                break;
            }
        }
    }
    if (!tried && skippedBig) throw friendlyAiError(null, true);
    throw friendlyAiError(lastError, false);
}

// ------------------------------------------------------------
// CleverBot CSV generation: small batches, exact count enforced here.
// The model is asked for ~10 questions at a time (fast, low thinking), the
// server validates every row, drops duplicates, trims any extras and only
// then sends rows to the browser. Result: exactly the number requested.
// ------------------------------------------------------------
var CB_CSV_BATCH = 10;

function cleverBotSendStatus(res, text, temp) {
    try { res.write('data: ' + JSON.stringify({ status: text, temp: !!temp }) + '\n\n'); } catch (e) {}
}

function cleverBotCsvTarget(message) {
    var n = cleverBotRequestedCount(message);
    if (n > 0) return Math.min(n, 100);
    if (/\b(?:all|as many as possible|every)\b/i.test(String(message || ''))) return 40;
    return 10;
}

function cleverBotCsvRows(text) {
    return String(text || '').split(/\r?\n/).map(function(l) { return l.trim(); }).filter(function(t) {
        if (!t) return false;
        if (/^```/.test(t)) return false;
        if (/^"?question"?\s*,\s*"?option\s*a/i.test(t)) return false;
        return /,\s*"?[A-Da-d]"?\s*,?\s*$/.test(t);
    }).map(function(t) { return /,\s*$/.test(t) ? t : t + ','; });
}

async function runCleverBotCsv(opts) {
    var res = opts.res;
    var target = cleverBotCsvTarget(opts.message);
    var rows = [], seen = {}, wrote = false, carry = '', plainText = '', failure = null;

    cleverBotSendStatus(res, 'Writing ' + target + ' question' + (target === 1 ? '' : 's') + '…', true);

    function writeText(t) { try { res.write('data: ' + JSON.stringify({ text: t }) + '\n\n'); } catch (e) {} }

    // Every finished line coming from the AI passes through here: only valid, new rows go on to the
    // browser, and nothing is sent after the requested number has been reached.
    function takeLine(line) {
        if (rows.length >= target) return;
        var t = String(line || '').trim();
        if (!t || /^```/.test(t) || /^"?question"?\s*,\s*"?option\s*a/i.test(t)) return;
        var found = cleverBotCsvRows(t);
        if (!found.length) { if (!wrote) plainText += t + '\n'; return; }
        var row = found[0];
        var key = row.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 60);
        if (seen[key]) return;
        seen[key] = true;
        rows.push(row);
        writeText((wrote ? '' : '```csv\n' + CB_CSV_HEADER + '\n') + row + '\n');
        wrote = true;
    }
    function onText(text) {
        carry += text;
        var lines = carry.split(/\r?\n/);
        carry = lines.pop() || '';
        lines.forEach(takeLine);
    }

    // Normally one pass is enough. A second or third pass only happens when the AI stopped short.
    for (var pass = 0; pass < 3 && rows.length < target; pass++) {
        var need = target - rows.length;
        carry = '';
        var instr = '\n\n[EXACT COUNT - overrides the quantity rule above] Write EXACTLY ' + need + ' question line' + (need === 1 ? '' : 's') +
            (rows.length ? ' (the remaining ones)' : '') + ' in the same CSV format. Do not write more than ' + need +
            ' question lines and do not stop before all ' + need + ' are written.';
        if (opts.hasAttachments && target > 5 && !rows.length) instr += ' Spread the questions evenly across the whole attached material.';
        if (rows.length) {
            instr += ' These questions are already written. Do not repeat or rephrase any of them:\n' +
                rows.map(function(r) { return r.slice(0, 100); }).join('\n');
        }
        var passContents = opts.contents.slice();
        var last = passContents[passContents.length - 1];
        passContents[passContents.length - 1] = { role: last.role, parts: last.parts.concat([{ text: instr }]) };

        try {
            await streamAI({
                contents: passContents,
                generationConfig: { maxOutputTokens: Math.min(16000, 1500 + need * 280), thinkingConfig: { thinkingLevel: 'low' } }
            }, res, {
                silent: true,
                onStatus: function(t) { cleverBotSendStatus(res, t, false); },
                onText: onText,
                shouldStop: function() { return rows.length >= target; },
                timeoutMs: 60000
            });
        } catch (e) {
            failure = e;
            if (!(e && e.sentText)) break;   // nothing arrived at all: streamAI already retried, give up
            carry = '';                      // the connection dropped mid-line: top up the missing questions
            continue;
        }
        if (carry) { takeLine(carry); carry = ''; }
        if (!rows.length && plainText.trim()) break; // the AI answered with a sentence instead (it needs more information)
    }

    if (!wrote) {
        if (plainText.trim()) {
            writeText(plainText.trim());
        } else {
            var err = failure || new Error('CleverBot could not generate the questions right now. Please try again.');
            if (!err.statusCode) err.statusCode = 503;
            throw err;
        }
    } else {
        var tail = '```';
        if (rows.length < target) {
            tail += '\n\nI could only generate ' + rows.length + ' of the ' + target + ' questions. Ask me for ' + (target - rows.length) + ' more.';
        }
        writeText(tail);
    }
    try { res.write('data: ' + JSON.stringify({ done: true }) + '\n\n'); } catch (e) {}
}

app.post('/api/cleverbot/chat', cleverBotLimiter, async function(req, res) {
    try {
        if (!AI_PROVIDERS.length) return res.status(503).json({ error: 'CleverBot is not configured yet. Add CEREBRAS_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY to the backend environment.' });
        var message = String(req.body.message || '').trim();
        var history = Array.isArray(req.body.history) ? req.body.history.slice(-20) : [];
        var context = String(req.body.context || '').slice(0, 6000);
        var attachments = Array.isArray(req.body.attachments) ? req.body.attachments.slice(0, 12) : [];
        if (!message && attachments.length === 0) return res.status(400).json({ error: 'Please enter a message or attach a file.' });
        if (message.length > 30000) return res.status(400).json({ error: 'That message is too long. Please shorten it.' });

        // Attachments can be sent either as extracted text (preferred for PDFs)
        // or as base64 inline data (used as a fallback for images/scanned PDFs).
        // Keep the aggregate binary payload bounded so the server never has to
        // accept an arbitrarily large JSON request.
        var totalBinaryChars = 0;
        attachments.forEach(function(a) {
            if (a && a.data) totalBinaryChars += String(a.data).length;
        });
        if (totalBinaryChars > 18000000) {
            return res.status(413).json({ error: 'The attached files are too large together. Please attach one file at a time or use a smaller PDF/image.' });
        }

        var contents = [];
        history.forEach(function(item) {
            if (!item || !item.role || !item.text) return;
            contents.push({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(item.text).slice(0, 20000) }] });
        });
        var parts = [];
        var hasAttachments = attachments.length > 0;
        var questionGeneration = cleverBotIntent(message, history, hasAttachments) === 'csv';
        var systemText = cleverBotBaseSystemText(context);
        if (questionGeneration) systemText += cleverBotCsvModeText();
        parts.push({ text: systemText });
        if (message) parts.push({ text: message });
        attachments.forEach(function(a) {
            if (!a || !a.mimeType) return;
            var mime = String(a.mimeType).slice(0, 100);
            if (a.text) {
                var extracted = String(a.text).slice(0, 1400000);
                parts.push({ text: '\n[ATTACHMENT: ' + String(a.name || 'document').slice(0,120) + ']\n' + extracted + '\n[END ATTACHMENT]' });
                return;
            }
            if (!a.data) return;
            if (String(a.data).length > 12000000) return;
            parts.push({ inline_data: { mime_type: mime, data: String(a.data) } });
        });
        contents.push({ role: 'user', parts: parts });

        // Streaming gives the UI the first words as soon as the AI produces them.
        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') res.flushHeaders();
        if (typeof res.write === 'function') {
            res.write(': CleverBot stream started\n\n');
            // Keep the SSE connection active and discourage intermediary buffering
            // while the AI is thinking before its first text chunk arrives.
            if (typeof res.flush === 'function') res.flush();
        }
        var cleverBotHeartbeat = setInterval(function(){
            if (!res.writableEnded) {
                try {
                    res.write(': heartbeat\n\n');
                    if (typeof res.flush === 'function') res.flush();
                } catch (e) {}
            }
        }, 1000);

        cleverBotSendStatus(res, questionGeneration ? 'Preparing your questions…' : 'Thinking…', true);
        if (questionGeneration) {
            await runCleverBotCsv({ message: message, contents: contents, hasAttachments: hasAttachments, res: res });
            clearInterval(cleverBotHeartbeat);
            return res.end();
        }

        var basePayload = {
            contents: contents,
            generationConfig: {
                maxOutputTokens: 8000,
                thinkingConfig: { thinkingLevel: cleverBotLooksComplex(message, hasAttachments) ? 'medium' : 'low' }
            }
        };
        var requestPayload = basePayload;
        var streamResult = await streamAI(requestPayload, res, { onStatus: function(t) { cleverBotSendStatus(res, t, true); } });
        var allText = streamResult && streamResult.text ? streamResult.text : '';
        var continueCount = 0;

        // --- Pass 1+: the reply was cut off by the per-response output cap ---
        // Long CSV replies (50-100 questions) routinely hit MAX_TOKENS mid-list.
        // Feed the partial reply back as a model turn and ask it to pick up
        // exactly where it stopped, then keep streaming to the browser.
        while (streamResult && streamResult.finishReason === 'MAX_TOKENS' && continueCount < 8) {
            continueCount++;
            console.log('CleverBot: reply hit the output cap (MAX_TOKENS) - continuing generation (pass ' + continueCount + ')');
            var continuedContents = requestPayload.contents.slice();
            continuedContents.push({ role: 'model', parts: [{ text: streamResult.text }] });
            continuedContents.push({ role: 'user', parts: [{ text: 'Your previous reply was cut off by an output limit. Continue EXACTLY where you stopped - mid-line if necessary. Do not repeat any line you already wrote, do not restart from the beginning, do not add explanations or commentary of any kind. Output only the remaining lines.' }] });
            requestPayload = Object.assign({}, basePayload, { contents: continuedContents });
            streamResult = await streamAI(requestPayload, res, { onStatus: function(t) { cleverBotSendStatus(res, t, true); } });
            if (streamResult && streamResult.text) allText += streamResult.text;
        }

        clearInterval(cleverBotHeartbeat);
        res.end();
    } catch (e) {
        if (typeof cleverBotHeartbeat !== 'undefined') clearInterval(cleverBotHeartbeat);
        console.error('CleverBot error:', e.message);
        if (res.headersSent) {
            try { res.write('data: ' + JSON.stringify({ error: e.message || 'CleverBot is temporarily unavailable.' }) + '\n\n'); } catch (_) {}
            return res.end();
        }
        res.status(e.statusCode === 429 ? 429 : (e.statusCode === 503 ? 503 : 502)).json({ error: e.message || 'CleverBot is temporarily unavailable.' });
    }
});

// Slows down brute-force password guessing against login/reset endpoints.
// Does not affect normal use - a real user won't hit these limits.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================================
// HELPERS
// ============================================================

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function requireTeacherAuth(req, res, next) {
    var authHeader = req.headers.authorization || '';
    var token = authHeader.indexOf('Bearer ') === 0 ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not logged in.' });
    try {
        var decoded = jwt.verify(token, JWT_SECRET);

        // Admin "act as teacher": an admin token is accepted on teacher
        // endpoints when a teacherEmail query param or body field is
        // supplied. The admin operates as that specific teacher.
        if (decoded.role === 'admin') {
            var actAsEmail = (req.query && req.query.teacherEmail)
                ? String(req.query.teacherEmail).trim().toLowerCase()
                : ((req.body && req.body.teacherEmail)
                    ? String(req.body.teacherEmail).trim().toLowerCase()
                    : '');
            if (!actAsEmail) {
                return res.status(403).json({ error: 'Admin must specify a teacher to act as.' });
            }
            req.teacherEmail = actAsEmail;
            req.teacherId = null;
            req.isAdminActingAsTeacher = true;
            return next();
        }

        if (decoded.role !== 'teacher') return res.status(403).json({ error: 'Not authorized.' });
        req.teacherId = decoded.teacherId;
        req.teacherEmail = decoded.email;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
}

function requireAdminAuth(req, res, next) {
    var authHeader = req.headers.authorization || '';
    var token = authHeader.indexOf('Bearer ') === 0 ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not logged in as admin.' });
    try {
        var decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Not authorized.' });
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
    }
}

function isBcryptHash(value) {
    return typeof value === 'string' && /^\$2[aby]?\$\d{2}\$/.test(value);
}

function generateResetToken() {
    var chars = 'abcdef0123456789';
    var token = '';
    for (var i = 0; i < 48; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

async function getReactivationFee() {
    var { data } = await supabase
        .from('cleverment_settings')
        .select('value')
        .eq('key', 'reactivation_fee')
        .maybeSingle();
    var amount = data && data.value ? Number(data.value) : NaN;
    return isNaN(amount) ? 2500 : amount;
}

// ============================================================
// TEACHER AUTH
// ============================================================

app.post('/api/auth/teacher/signup', authLimiter, async function(req, res) {
    try {
        var name = (req.body.name || '').trim();
        var email = (req.body.email || '').trim().toLowerCase();
        var password = req.body.password || '';

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        var { data: existing } = await supabase
            .from('cleverment_teachers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        var passwordHash = bcrypt.hashSync(password, 10);

        var { data: inserted, error } = await supabase
            .from('cleverment_teachers')
            .insert([{ name: name, email: email, password_hash: passwordHash }])
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });

        var token = signToken({ role: 'teacher', teacherId: inserted.id, email: inserted.email });
        res.json({ token: token, teacher: { id: inserted.id, name: inserted.name, email: inserted.email } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/teacher/login', authLimiter, async function(req, res) {
    try {
        var email = (req.body.email || '').trim().toLowerCase();
        var password = req.body.password || '';

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        var { data: teacher } = await supabase
            .from('cleverment_teachers')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (!teacher) return res.status(401).json({ error: 'Invalid email or password.' });

        var hashed = isBcryptHash(teacher.password_hash);
        var matches = hashed
            ? bcrypt.compareSync(password, teacher.password_hash)
            : teacher.password_hash === password;

        if (!matches) return res.status(401).json({ error: 'Invalid email or password.' });

        // Quietly migrate any account still on a legacy plain-text password.
        if (!hashed) {
            var newHash = bcrypt.hashSync(password, 10);
            await supabase.from('cleverment_teachers').update({ password_hash: newHash }).eq('id', teacher.id);
        }

        // A paused teacher still needs a valid token - they can't reach
        // their dashboard, but they DO need to be authenticated to call
        // /api/payment/initiate and pay to reactivate their own account.
        var token = signToken({ role: 'teacher', teacherId: teacher.id, email: teacher.email });
        res.json({
            token: token,
            teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
            paused: teacher.paused === true
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/teacher/forgot-password', authLimiter, async function(req, res) {
    try {
        var email = (req.body.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        var { data: teacher } = await supabase
            .from('cleverment_teachers')
            .select('id, email, name')
            .eq('email', email)
            .maybeSingle();

        // Always respond success whether or not the account exists,
        // so this can't be used to check which emails are registered.
        if (!teacher) return res.json({ success: true });

        var token = generateResetToken();
        var expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await supabase
            .from('cleverment_teachers')
            .update({ reset_token: token, reset_token_expiry: expiry })
            .eq('id', teacher.id);

        res.json({ success: true, resetToken: token, email: teacher.email, name: teacher.name });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/teacher/reset-password', authLimiter, async function(req, res) {
    try {
        var token = req.body.token;
        var newPassword = req.body.newPassword;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required.' });
        }

        var { data: teacher } = await supabase
            .from('cleverment_teachers')
            .select('id, reset_token_expiry')
            .eq('reset_token', token)
            .maybeSingle();

        if (!teacher || !teacher.reset_token_expiry || new Date(teacher.reset_token_expiry) < new Date()) {
            return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
        }

        var newHash = bcrypt.hashSync(newPassword, 10);
        await supabase
            .from('cleverment_teachers')
            .update({ password_hash: newHash, reset_token: null, reset_token_expiry: null })
            .eq('id', teacher.id);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// ADMIN AUTH
// ============================================================

app.post('/api/auth/admin/login', authLimiter, function(req, res) {
    var password = req.body.password;
    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Incorrect admin password.' });
    }
    res.json({ token: signToken({ role: 'admin' }) });
});

// ============================================================
// ADMIN: MANAGE TEACHERS
// (moved here from direct-Supabase access so the teachers table
// can be locked down with Row Level Security - see README)
// ============================================================

app.get('/api/admin/teachers', requireAdminAuth, async function(req, res) {
    try {
        var { data, error } = await supabase
            .from('cleverment_teachers')
            .select('id, name, email, paused, created_at')
            .order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        res.json({ teachers: data || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/teachers/:id/pause', requireAdminAuth, async function(req, res) {
    try {
        var id = req.params.id;
        var { data: teacher, error: fetchError } = await supabase
            .from('cleverment_teachers')
            .select('id, paused')
            .eq('id', id)
            .maybeSingle();
        if (fetchError || !teacher) return res.status(404).json({ error: 'Teacher not found.' });

        var newPaused = !teacher.paused;
        var { error } = await supabase
            .from('cleverment_teachers')
            .update({ paused: newPaused })
            .eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ paused: newPaused });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/teachers/:id', requireAdminAuth, async function(req, res) {
    try {
        var { error } = await supabase
            .from('cleverment_teachers')
            .delete()
            .eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// FLUTTERWAVE PAYMENTS (account reactivation)
// ============================================================

app.post('/api/payment/initiate', requireTeacherAuth, async function(req, res) {
    try {
        var { data: teacher } = await supabase
            .from('cleverment_teachers')
            .select('id, name, email, paused')
            .eq('id', req.teacherId)
            .maybeSingle();

        if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
        if (!teacher.paused) return res.status(400).json({ error: 'This account is not paused - no payment needed.' });

        var amount = await getReactivationFee();
        var txRef = 'cbt-' + teacher.id + '-' + Date.now();

        var flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + FLW_SECRET_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tx_ref: txRef,
                amount: amount,
                currency: 'NGN',
                redirect_url: FRONTEND_URL + '/?page=payment-callback',
                customer: { email: teacher.email, name: teacher.name },
                customizations: {
                    title: 'CleverMent Account Reactivation',
                    description: 'Reactivate your CleverMent teacher account'
                }
            })
        });

        var flwData = await flwRes.json();

        if (flwData.status !== 'success') {
            return res.status(502).json({ error: 'Flutterwave error: ' + (flwData.message || 'Unknown error') });
        }

        res.json({ link: flwData.data.link });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/payment/verify', async function(req, res) {
    try {
        var transactionId = req.body.transactionId;
        if (!transactionId) return res.status(400).json({ error: 'Transaction ID required.' });

        var result = await verifyAndApplyPayment(transactionId);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/payment/webhook', async function(req, res) {
    var signature = req.headers['verif-hash'];
    if (!FLW_WEBHOOK_HASH || !signature || signature !== FLW_WEBHOOK_HASH) {
        return res.status(401).end();
    }
    try {
        var event = req.body;
        if (event && event.data && event.data.id) {
            await verifyAndApplyPayment(event.data.id);
        }
        res.status(200).end();
    } catch (e) {
        console.error('Webhook error:', e);
        res.status(500).end();
    }
});

async function verifyAndApplyPayment(transactionId) {
    var verifyRes = await fetch('https://api.flutterwave.com/v3/transactions/' + transactionId + '/verify', {
        headers: { 'Authorization': 'Bearer ' + FLW_SECRET_KEY }
    });
    var verifyData = await verifyRes.json();

    if (verifyData.status !== 'success' || !verifyData.data || verifyData.data.status !== 'successful') {
        return { success: false, error: 'Payment was not successful.' };
    }

    var txRef = verifyData.data.tx_ref || '';
    var match = /^cbt-(\d+)-/.exec(txRef);
    if (!match) {
        return { success: false, error: 'Could not identify which account this payment belongs to.' };
    }
    var teacherId = match[1];

    var expectedAmount = await getReactivationFee();
    if (verifyData.data.currency !== 'NGN' || Number(verifyData.data.amount) < expectedAmount) {
        return { success: false, error: 'Payment amount or currency did not match what was expected.' };
    }

    await supabase.from('cleverment_teachers').update({ paused: false }).eq('id', teacherId);
    return { success: true };
}

// ============================================================
// PUBLIC QUIZ ENDPOINTS (no login - students never have accounts)
// ============================================================

function letterToIndex(letter) {
    var letters = ['A', 'B', 'C', 'D'];
    return letters.indexOf(letter);
}

// Grades a set of submitted answers against the real questions. Used by the
// normal submit endpoint AND by the auto-submit sweeper below, so both always
// grade in exactly the same way.
function gradeSubmission(assessment, submittedAnswers) {
    var realQuestions = assessment.questions || [];
    var correctCount = 0;
    var corrections = [];
    var answerByIndex = {};
    for (var i = 0; i < (submittedAnswers || []).length; i++) {
        answerByIndex[submittedAnswers[i].originalIndex] = submittedAnswers[i].selectedOptionText;
    }
    for (var qi = 0; qi < realQuestions.length; qi++) {
        var q = realQuestions[qi];
        var correctIdx = letterToIndex(q.correctAnswer);
        var correctText = (correctIdx !== -1 && q.options) ? q.options[correctIdx] : '';
        var selectedText = answerByIndex.hasOwnProperty(qi) ? answerByIndex[qi] : null;
        var isCorrect = selectedText !== null && selectedText === correctText;
        if (isCorrect) correctCount++;
        corrections.push({
            question: q.question,
            userAnswerText: selectedText || '',
            correctAnswerText: correctText,
            isCorrect: isCorrect
        });
    }
    var totalQuestions = realQuestions.length;
    var score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    var passMark = (assessment.pass_mark !== null && assessment.pass_mark !== undefined) ? assessment.pass_mark : 50;
    return {
        correctCount: correctCount,
        corrections: corrections,
        totalQuestions: totalQuestions,
        score: score,
        passMark: passMark,
        passed: score >= passMark
    };
}

// Inserts a result row. The "fast_answer_warnings" column is optional: if the
// database has not been updated yet, the insert is retried without it so
// students are never blocked from submitting.
async function insertResultRow(payload, fastAnswerWarnings) {
    var withFlag = Object.assign({}, payload, { fast_answer_warnings: fastAnswerWarnings || 0 });
    var r = await supabase.from('cleverment_results').insert([withFlag]);
    if (r.error && /fast_answer_warnings/i.test(r.error.message || '')) {
        r = await supabase.from('cleverment_results').insert([payload]);
    }
    return r;
}

app.get('/api/quiz/assessment/:code', async function(req, res) {
    try {
        var code = req.params.code;
        var { data: assessment, error } = await supabase
            .from('cleverment_assessments')
            .select('*')
            .eq('code', code)
            .maybeSingle();

        if (error || !assessment) {
            return res.status(404).json({ error: 'Assessment code not found.' });
        }

        var now = new Date();
        if (assessment.available_from && now < new Date(assessment.available_from)) {
            await logStudentAccessEvent(assessment.teacher_email, {
                code: code, subject: assessment.subject, className: assessment.class_name,
                studentName: '', admissionNumber: '', status: 'not_yet_open',
                message: 'Assessment code was checked before the assessment opened.'
            });
            return res.status(403).json({ error: 'not_yet_open', message: 'This assessment is not open yet.', availableFrom: assessment.available_from });
        }
        if (assessment.available_until && now > new Date(assessment.available_until)) {
            await logStudentAccessEvent(assessment.teacher_email, {
                code: code, subject: assessment.subject, className: assessment.class_name,
                studentName: '', admissionNumber: '', status: 'closed',
                message: 'Assessment code was checked after the assessment window closed.'
            });
            return res.status(403).json({ error: 'closed', message: 'This assessment window has closed.', availableUntil: assessment.available_until });
        }

        // Correct answers are deliberately left out - the browser never
        // needs them, and grading happens here on the server instead.
        var safeQuestions = (assessment.questions || []).map(function(q, i) {
            return {
                originalIndex: i,
                question: q.question,
                options: q.options,
                image: q.image || ''
            };
        });

        res.json({
            id: assessment.id,
            code: assessment.code,
            teacherEmail: assessment.teacher_email,
            teacherName: assessment.teacher_name || 'Unknown Teacher',
            teacherSignature: assessment.teacher_signature || '',
            subject: assessment.subject,
            className: assessment.class_name,
            questions: safeQuestions,
            timeLimit: assessment.time_limit,
            shuffle: assessment.shuffle,
            cameraMonitoring: assessment.camera_monitoring || false,
            noiseMonitoring: assessment.noise_monitoring || false,
            showResults: assessment.show_results !== false,
            passMark: (assessment.pass_mark !== null && assessment.pass_mark !== undefined) ? assessment.pass_mark : 50
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// Best-effort client report for cases where the browser believes a network
// error occurred. A genuine total loss of connectivity cannot be reported
// until connectivity returns; this endpoint records the event when reachable.
app.post('/api/quiz/access-log-client', async function(req, res) {
    try {
        var info = accessEventFromRequest(req);
        if (!info.code) return res.status(400).json({ ok: false });
        var { data: assessment } = await supabase
            .from('cleverment_assessments')
            .select('code, teacher_email, subject, class_name')
            .eq('code', info.code)
            .maybeSingle();
        if (!assessment) return res.status(404).json({ ok: false });
        await logStudentAccessEvent(assessment.teacher_email, {
            code: info.code,
            subject: assessment.subject,
            className: assessment.class_name,
            studentName: info.studentName,
            admissionNumber: info.admissionNumber,
            status: 'network_error',
            message: 'The student reported that the assessment request could not reach the server.'
        });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

// Check whether a student is eligible to START an assessment. This is
// deliberately server-side so the browser cannot bypass roster or
// duplicate-submission rules by clearing localStorage or changing JS.
app.post('/api/quiz/start-check', async function(req, res) {
    try {
        var body = req.body || {};
        var code = (body.code || '').trim().toUpperCase();
        var studentName = (body.studentName || '').trim();
        var admissionNumber = (body.admissionNumber || '').trim();

        if (!code || !admissionNumber || !studentName) {
            return res.status(400).json({ allowed: false, reason: 'missing_details', error: 'Please enter your full name and admission number.' });
        }

        var { data: assessment, error: assessmentError } = await supabase
            .from('cleverment_assessments')
            .select('code, teacher_email, subject, class_name, available_from, available_until')
            .eq('code', code)
            .maybeSingle();

        if (assessmentError || !assessment) {
            return res.status(404).json({ allowed: false, reason: 'assessment_not_found', error: 'Assessment not found.' });
        }

        var baseEvent = {
            code: code,
            subject: assessment.subject,
            className: assessment.class_name,
            studentName: studentName,
            admissionNumber: admissionNumber
        };

        var now = new Date();
        if (assessment.available_from && now < new Date(assessment.available_from)) {
            await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
                status: 'not_yet_open', message: 'Student tried to access before the assessment opened.'
            }));
            return res.status(403).json({ allowed: false, reason: 'not_yet_open', error: 'This assessment is not open yet.', availableFrom: assessment.available_from });
        }
        if (assessment.available_until && now > new Date(assessment.available_until)) {
            await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
                status: 'closed', message: 'Student tried to access after the assessment window closed.'
            }));
            return res.status(403).json({ allowed: false, reason: 'closed', error: 'This assessment window has closed.', availableUntil: assessment.available_until });
        }

        // Enforce the class roster before the student is allowed into the quiz.
        var { data: rosterRow, error: rosterError } = await supabase
            .from('cleverment_rosters')
            .select('student_names')
            .eq('teacher_email', assessment.teacher_email)
            .eq('class_name', assessment.class_name)
            .maybeSingle();

        if (rosterError) {
            await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
                status: 'network_error', message: 'The server could not verify the class roster.'
            }));
            return res.status(503).json({ allowed: false, reason: 'check_failed', error: 'We could not verify your class details. Please try again.' });
        }

        if (rosterRow && rosterRow.student_names && rosterRow.student_names.length > 0) {
            var validEntries = rosterRow.student_names.filter(function(e) {
                return e && typeof e === 'object' && (e.admissionNumber || e.name);
            });
            if (validEntries.length > 0) {
                var normalizedAdmission = admissionNumber.toLowerCase();
                var normalizedName = normalizeAccessName(studentName);
                var admissionMatch = validEntries.some(function(e) {
                    return (e.admissionNumber || '').trim().toLowerCase() === normalizedAdmission;
                });
                var nameMatch = validEntries.some(function(e) {
                    return normalizeAccessName(e.name) === normalizedName;
                });
                var exactStudentMatch = validEntries.some(function(e) {
                    return (e.admissionNumber || '').trim().toLowerCase() === normalizedAdmission &&
                           normalizeAccessName(e.name) === normalizedName;
                });

                if (!exactStudentMatch) {
                    var status = (!nameMatch && !admissionMatch) ? 'invalid_name_and_admission' :
                        (!nameMatch ? 'invalid_name' : 'invalid_admission');
                    await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
                        status: status,
                        message: status === 'invalid_name' ? 'Name did not match the class roster.' :
                            status === 'invalid_admission' ? 'Admission number did not match the class roster.' :
                            'Name and admission number did not match the class roster.'
                    }));
                    return res.status(403).json({
                        allowed: false,
                        reason: status,
                        error: 'The name and admission number entered do not match the class roster for ' + assessment.class_name + '. Please check your details and try again.'
                    });
                }
            }
        }

        // Authoritative duplicate-submission check before entering the quiz.
        var { data: existing, error: resultError } = await supabase
            .from('cleverment_results')
            .select('id')
            .eq('assessment_code', code)
            .ilike('admission_number', admissionNumber)
            .limit(1);

        if (resultError) {
            await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
                status: 'network_error', message: 'The server could not verify whether this student had already submitted.'
            }));
            return res.status(503).json({ allowed: false, reason: 'check_failed', error: 'We could not verify your assessment status. Please try again.' });
        }

        if (existing && existing.length > 0) {
            await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
                status: 'duplicate_attempt', message: 'Student had already submitted this assessment.'
            }));
            return res.status(409).json({
                allowed: false,
                reason: 'already_submitted',
                error: 'A student with admission number "' + admissionNumber + '" has already submitted this assessment.'
            });
        }

        await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
            status: 'successful_access', message: 'Student passed the access checks and was allowed into the assessment.'
        }));
        res.json({ allowed: true });
    } catch (e) {
        res.status(500).json({ allowed: false, reason: 'check_failed', error: 'Could not verify assessment eligibility. Please try again.' });
    }
});

app.post('/api/quiz/submit', async function(req, res) {
    try {
        var body = req.body;
        var code = body.code;
        var studentName = (body.studentName || '').trim();
        var admissionNumber = (body.admissionNumber || '').trim();
        var submittedAnswers = body.answers || []; // [{ originalIndex, selectedOptionText }]
        var tabSwitches = body.tabSwitches || 0;
        var proctorViolations = body.proctorViolations || 0;
        var timeTaken = body.timeTaken || '';

        if (!code || !studentName || !admissionNumber) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        var { data: assessment, error: assessmentError } = await supabase
            .from('cleverment_assessments')
            .select('*')
            .eq('code', code)
            .maybeSingle();

        if (assessmentError || !assessment) {
            return res.status(404).json({ error: 'Assessment not found.' });
        }

        // Roster check - only enforced if a roster with real entries
        // actually exists for this class. This is the authoritative
        // check; the client's own pre-check is just a UX convenience.
        var { data: rosterRow } = await supabase
            .from('cleverment_rosters')
            .select('student_names')
            .eq('teacher_email', assessment.teacher_email)
            .eq('class_name', assessment.class_name)
            .maybeSingle();

        if (rosterRow && rosterRow.student_names && rosterRow.student_names.length > 0) {
            var validEntries = rosterRow.student_names.filter(function(e) {
                return e && typeof e === 'object' && e.admissionNumber;
            });
            if (validEntries.length > 0) {
                var onRoster = validEntries.some(function(e) {
                    return (e.admissionNumber || '').trim().toLowerCase() === admissionNumber.toLowerCase();
                });
                if (!onRoster) {
                    return res.status(403).json({ error: 'Admission number "' + admissionNumber + '" was not found on the class roster for ' + assessment.class_name + '.' });
                }
            }
        }

        // Duplicate-attempt check - also authoritative here, not just
        // a client-side convenience.
        var { data: existing } = await supabase
            .from('cleverment_results')
            .select('id')
            .eq('assessment_code', code)
            .ilike('admission_number', admissionNumber)
            .limit(1);
        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'A student with admission number "' + admissionNumber + '" has already submitted this assessment.' });
        }

        // Grade server-side, by comparing the TEXT of the option the
        // student picked against the real correct option's text - this
        // works correctly no matter how the client shuffled question
        // order or option order for that particular student.
        var graded = gradeSubmission(assessment, submittedAnswers);
        var correctCount = graded.correctCount;
        var corrections = graded.corrections;
        var totalQuestions = graded.totalQuestions;
        var score = graded.score;
        var passMark = graded.passMark;
        var passed = graded.passed;

        var payload = {
            teacher_email: assessment.teacher_email,
            student_name: studentName,
            admission_number: admissionNumber,
            class_name: assessment.class_name,
            subject: assessment.subject,
            score: score,
            correct_answers: correctCount,
            total_questions: totalQuestions,
            time_taken: timeTaken,
            assessment_code: code,
            tab_switches: tabSwitches,
            proctor_violations: proctorViolations,
            answers: corrections
        };

        var { error: insertError } = await insertResultRow(payload, body.fastAnswerWarnings || 0);
        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }

        // The attempt is finished - stop the auto-submit sweeper from touching it.
        try {
            await supabase.from('cleverment_quiz_sessions')
                .update({ submitted: true })
                .eq('code', String(code).trim().toUpperCase())
                .eq('admission_key', admissionNumber.toLowerCase());
        } catch (e) { /* table may not exist yet - not critical */ }

        res.json({
            score: score,
            correctAnswers: correctCount,
            totalQuestions: totalQuestions,
            passed: passed,
            passMark: passMark,
            showResults: assessment.show_results !== false,
            corrections: corrections
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// SERVER-SIDE TIMER + AUTO-SUBMIT
// While a student is taking an assessment, their browser saves their
// progress here every few seconds. The server remembers when the attempt
// started and when it must end. If the student leaves the page (or closes
// the browser) and the time runs out, the sweeper below grades the answers
// saved so far and submits them automatically - no student action needed.
// Needs the cleverment_quiz_sessions table (see supabase_quiz_sessions.sql).
// ============================================================

app.post('/api/quiz/progress', async function(req, res) {
    try {
        var body = req.body || {};
        var code = (body.code || '').trim().toUpperCase();
        var studentName = (body.studentName || '').trim();
        var admissionNumber = (body.admissionNumber || '').trim();
        if (!code || !studentName || !admissionNumber) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        var { data: assessment } = await supabase
            .from('cleverment_assessments')
            .select('code, time_limit')
            .eq('code', code)
            .maybeSingle();
        if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });

        var key = admissionNumber.toLowerCase();
        var { data: existing } = await supabase
            .from('cleverment_quiz_sessions')
            .select('id, submitted, ends_at')
            .eq('code', code)
            .eq('admission_key', key)
            .maybeSingle();

        if (existing && existing.submitted) {
            return res.json({ ok: true, submitted: true });
        }

        var answers = Array.isArray(body.answers) ? body.answers.slice(0, 500) : [];
        var fields = {
            student_name: studentName,
            admission_number: admissionNumber,
            answers: answers,
            tab_switches: Number(body.tabSwitches) || 0,
            proctor_violations: Number(body.proctorViolations) || 0,
            fast_answer_warnings: Number(body.fastAnswerWarnings) || 0,
            updated_at: new Date().toISOString()
        };

        if (existing) {
            await supabase.from('cleverment_quiz_sessions').update(fields).eq('id', existing.id);
            return res.json({ ok: true, endsAt: existing.ends_at });
        }

        var limitSeconds = Number(assessment.time_limit) || 0;
        var startedAt = new Date();
        var endsAt = limitSeconds > 0 ? new Date(startedAt.getTime() + limitSeconds * 1000) : null;
        var row = Object.assign({
            code: code,
            admission_key: key,
            started_at: startedAt.toISOString(),
            ends_at: endsAt ? endsAt.toISOString() : null,
            submitted: false
        }, fields);
        var ins = await supabase.from('cleverment_quiz_sessions').insert([row]);
        if (ins.error) return res.status(500).json({ error: ins.error.message });
        res.json({ ok: true, endsAt: row.ends_at });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function formatSecondsAsClock(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

var autoSubmitRunning = false;
async function autoSubmitExpiredSessions() {
    if (autoSubmitRunning) return;
    autoSubmitRunning = true;
    try {
        // 20 second grace period so a student who is still online gets to
        // submit by themselves first.
        var cutoff = new Date(Date.now() - 20 * 1000).toISOString();
        var { data: sessions, error } = await supabase
            .from('cleverment_quiz_sessions')
            .select('*')
            .eq('submitted', false)
            .not('ends_at', 'is', null)
            .lt('ends_at', cutoff)
            .limit(100);
        if (error || !sessions || sessions.length === 0) return;

        for (var i = 0; i < sessions.length; i++) {
            var sess = sessions[i];
            try {
                var { data: assessment } = await supabase
                    .from('cleverment_assessments')
                    .select('*')
                    .eq('code', sess.code)
                    .maybeSingle();
                if (!assessment) {
                    await supabase.from('cleverment_quiz_sessions').update({ submitted: true }).eq('id', sess.id);
                    continue;
                }

                var { data: already } = await supabase
                    .from('cleverment_results')
                    .select('id')
                    .eq('assessment_code', sess.code)
                    .ilike('admission_number', sess.admission_number)
                    .limit(1);
                if (already && already.length > 0) {
                    await supabase.from('cleverment_quiz_sessions').update({ submitted: true }).eq('id', sess.id);
                    continue;
                }

                var graded = gradeSubmission(assessment, sess.answers || []);
                var limitSeconds = Number(assessment.time_limit) || 0;
                var payload = {
                    teacher_email: assessment.teacher_email,
                    student_name: sess.student_name,
                    admission_number: sess.admission_number,
                    class_name: assessment.class_name,
                    subject: assessment.subject,
                    score: graded.score,
                    correct_answers: graded.correctCount,
                    total_questions: graded.totalQuestions,
                    time_taken: formatSecondsAsClock(limitSeconds),
                    assessment_code: sess.code,
                    tab_switches: sess.tab_switches || 0,
                    proctor_violations: sess.proctor_violations || 0,
                    answers: graded.corrections
                };
                var ins = await insertResultRow(payload, sess.fast_answer_warnings || 0);
                if (!ins.error) {
                    await supabase.from('cleverment_quiz_sessions').update({ submitted: true }).eq('id', sess.id);
                    console.log('Auto-submitted expired attempt for ' + sess.student_name + ' (' + sess.code + ')');
                }
            } catch (inner) {
                console.error('Auto-submit failed for session ' + sess.id + ':', inner.message);
            }
        }
    } catch (e) {
        console.error('Auto-submit sweep error:', e.message);
    } finally {
        autoSubmitRunning = false;
    }
}

// ============================================================
// LIVE PRESENCE (which students are taking an assessment right now)
// The student's browser pings /api/quiz/presence every 20s while a
// quiz is open. Sessions are held in memory (single-instance deploy)
// and expire 60s after the last ping. Nothing is written to the
// database - this is transient "who is online" state only.
// ============================================================

var activeSessions = {};

app.post('/api/quiz/presence', async function(req, res) {
    try {
        var code = (req.body.code || '').trim().toUpperCase();
        var studentName = (req.body.studentName || '').trim();
        var admissionNumber = (req.body.admissionNumber || '').trim();

        if (!code || !studentName || !admissionNumber) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        var { data: assessment } = await supabase
            .from('cleverment_assessments')
            .select('id, teacher_email, subject, class_name')
            .eq('code', code)
            .maybeSingle();

        if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });

        var key = code + '|' + admissionNumber.toLowerCase();
        var existing = activeSessions[key];
        activeSessions[key] = {
            code: code,
            subject: assessment.subject,
            className: assessment.class_name,
            studentName: studentName,
            admissionNumber: admissionNumber,
            teacherEmail: assessment.teacher_email || '',
            startedAt: existing ? existing.startedAt : new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/teacher/live', requireTeacherAuth, async function(req, res) {
    try {
        // Sweep entries idle for more than 60s.
        var cutoff = Date.now() - 60 * 1000;
        for (var key in activeSessions) {
            if (new Date(activeSessions[key].lastSeen).getTime() < cutoff) {
                delete activeSessions[key];
            }
        }

        var { data: assessments } = await supabase
            .from('cleverment_assessments')
            .select('code')
            .eq('teacher_email', req.teacherEmail);

        var myCodes = {};
        (assessments || []).forEach(function(a) { myCodes[a.code] = true; });

        var live = [];
        for (var k in activeSessions) {
            if (myCodes[activeSessions[k].code]) live.push(activeSessions[k]);
        }
        live.sort(function(a, b) { return a.startedAt < b.startedAt ? -1 : 1; });

        res.json({ live: live });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ============================================================
// TEACHER: STUDENT ACCESS LOGS
// ============================================================
app.get('/api/teacher/access-logs', requireTeacherAuth, async function(req, res) {
    try {
        var teacherEmail = String(req.teacherEmail || '').trim().toLowerCase();
        if (!teacherEmail) return res.status(401).json({ error: 'Teacher email is missing from the session.' });

        var { data, error } = await supabase
            .from('cleverment_access_logs')
            .select('id, timestamp, code, subject, class_name, student_name, admission_number, status, message, source')
            .eq('teacher_email', teacherEmail)
            .order('timestamp', { ascending: false })
            .limit(500);

        if (error) {
            console.error('Could not load student access logs:', error.message);
            return res.status(500).json({ error: 'Could not load student access attempts. Make sure the cleverment_access_logs table has been created in Supabase.' });
        }

        var logs = (data || []).map(function(row) {
            return {
                id: row.id,
                timestamp: row.timestamp,
                code: row.code || '',
                subject: row.subject || '',
                className: row.class_name || '',
                studentName: row.student_name || '',
                admissionNumber: row.admission_number || '',
                status: row.status || '',
                message: row.message || '',
                source: row.source || 'student'
            };
        });
        res.json({ logs: logs });
    } catch (e) {
        console.error('Access log endpoint error:', e.message);
        res.status(500).json({ error: 'Could not load student access logs.' });
    }
});

// ============================================================
// TEACHER: MANAGE OWN ASSESSMENTS
// ============================================================


app.post('/api/teacher/assessment-images', requireTeacherAuth, async function(req, res) {
    try {
        var body = req.body || {};
        var dataUrl = String(body.dataUrl || '');
        var match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/i);
        if (!match) {
            return res.status(400).json({ error: 'Please upload a supported image (JPG, PNG, WEBP or GIF).' });
        }

        var mime = match[1].toLowerCase();
        var buffer = Buffer.from(match[2], 'base64');
        if (!buffer.length) return res.status(400).json({ error: 'The image file is empty.' });
        if (buffer.length > ASSESSMENT_IMAGE_MAX_BYTES) {
            return res.status(413).json({ error: 'Image is too large. Please use an image no larger than 5 MB.' });
        }

        var ext = safeAssessmentImageExtension(mime);
        var teacherPart = String(req.teacherEmail || 'teacher').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'teacher';
        var filePath = teacherPart + '/' + Date.now() + '-' + crypto.randomBytes(8).toString('hex') + '.' + ext;

        var upload = await supabase.storage.from(ASSESSMENT_IMAGE_BUCKET).upload(filePath, buffer, {
            contentType: mime,
            upsert: false,
            cacheControl: '31536000'
        });
        if (upload.error) {
            return res.status(500).json({ error: 'Could not store the image: ' + upload.error.message });
        }

        var publicUrl = supabase.storage.from(ASSESSMENT_IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;
        res.json({ url: publicUrl });
    } catch (e) {
        console.error('Assessment image upload error:', e);
        res.status(500).json({ error: 'Could not upload the image.' });
    }
});

app.post('/api/teacher/assessments', requireTeacherAuth, async function(req, res) {
    try {
        var body = req.body;
        if (!body.subject || !body.className || !body.questions || body.questions.length === 0) {
            return res.status(400).json({ error: 'Subject, class, and at least one question are required.' });
        }

        var code = body.subject.substring(0, 3).toUpperCase() + '-' + body.className.substring(0, 3).toUpperCase() + '-' + String(Date.now()).slice(-3);

        var payload = {
            teacher_email: req.teacherEmail,
            teacher_name: body.teacherName || 'Unknown Teacher',
            teacher_signature: body.teacherSignature || '',
            subject: body.subject,
            class_name: body.className,
            code: code,
            questions: body.questions,
            time_limit: body.timeLimit || 0,
            shuffle: !!body.shuffle,
            camera_monitoring: !!body.cameraMonitoring,
            noise_monitoring: !!body.noiseMonitoring,
            show_results: body.showResults !== false,
            available_from: body.availableFrom || null,
            available_until: body.availableUntil || null,
            pass_mark: (body.passMark !== null && body.passMark !== undefined) ? body.passMark : 50
        };

        var { data, error } = await supabase.from('cleverment_assessments').insert([payload]).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json({ assessment: data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/teacher/assessments', requireTeacherAuth, async function(req, res) {
    try {
        var { data, error } = await supabase
            .from('cleverment_assessments')
            .select('*')
            .eq('teacher_email', req.teacherEmail)
            .order('id', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        res.json({ assessments: data || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Builds the database update for an assessment edit from the request body.
// Only fields that were actually sent are changed. Returns { update } or { error }.
function buildAssessmentUpdate(body) {
    var update = {};

    if (body.questions !== undefined) {
        if (!Array.isArray(body.questions) || body.questions.length === 0) {
            return { error: 'At least one question is required.' };
        }
        update.questions = body.questions;
    }
    if (body.subject !== undefined) {
        var subject = String(body.subject || '').trim();
        if (!subject) return { error: 'Subject cannot be empty.' };
        update.subject = subject;
    }
    if (body.className !== undefined) {
        var className = String(body.className || '').trim();
        if (!className) return { error: 'Class cannot be empty.' };
        update.class_name = className;
    }
    if (body.teacherName !== undefined) {
        update.teacher_name = String(body.teacherName || '').trim() || 'Unknown Teacher';
    }
    if (body.timeLimit !== undefined) {
        var tl = parseInt(body.timeLimit, 10);
        if (isNaN(tl) || tl < 0 || tl > 24 * 3600) return { error: 'Time limit is not valid.' };
        update.time_limit = tl;
    }
    if (body.passMark !== undefined) {
        var pm = parseInt(body.passMark, 10);
        if (isNaN(pm) || pm < 0 || pm > 100) return { error: 'Pass mark must be between 0 and 100.' };
        update.pass_mark = pm;
    }
    if (body.shuffle !== undefined) update.shuffle = !!body.shuffle;
    if (body.cameraMonitoring !== undefined) update.camera_monitoring = !!body.cameraMonitoring;
    if (body.noiseMonitoring !== undefined) update.noise_monitoring = !!body.noiseMonitoring;
    if (body.showResults !== undefined) update.show_results = !!body.showResults;

    if (Object.keys(update).length === 0) return { error: 'Nothing to update.' };
    return { update: update };
}

app.put('/api/teacher/assessments/:id', requireTeacherAuth, async function(req, res) {
    try {
        var id = req.params.id;
        var body = req.body || {};

        var built = buildAssessmentUpdate(body);
        if (built.error) return res.status(400).json({ error: built.error });

        // Only the teacher who owns the assessment may edit it.
        var { data: existing, error: fetchError } = await supabase
            .from('cleverment_assessments')
            .select('id, teacher_email, code')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) return res.status(500).json({ error: fetchError.message });
        if (!existing || existing.teacher_email !== req.teacherEmail) {
            return res.status(403).json({ error: 'Not authorized to edit this assessment.' });
        }

        // The assessment code never changes, so the code students already
        // have keeps working.
        var { data, error } = await supabase
            .from('cleverment_assessments')
            .update(built.update)
            .eq('id', id)
            .eq('teacher_email', req.teacherEmail)
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json({ assessment: data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// TEACHER PROFILE: saved certificate name + signature, so a teacher uploads
// their signature ONCE and it is used on every assessment they publish.
// Needs the signature / cert_name columns (see supabase_batch2.sql).
// ------------------------------------------------------------
var SIGNATURE_MAX_CHARS = 1500000; // ~1.1 MB of image data

app.get('/api/teacher/profile', requireTeacherAuth, async function(req, res) {
    try {
        var { data, error } = await supabase
            .from('cleverment_teachers')
            .select('name, email, signature, cert_name')
            .eq('email', req.teacherEmail)
            .maybeSingle();
        if (error) {
            // Columns not added yet: behave as an empty profile.
            return res.json({ name: '', email: req.teacherEmail, certName: '', signature: '', setupNeeded: true });
        }
        res.json({
            name: (data && data.name) || '',
            email: req.teacherEmail,
            certName: (data && data.cert_name) || '',
            signature: (data && data.signature) || ''
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/teacher/profile', requireTeacherAuth, async function(req, res) {
    try {
        var body = req.body || {};
        var update = {};
        if (body.certName !== undefined) {
            update.cert_name = String(body.certName || '').trim().slice(0, 120);
        }
        if (body.signature !== undefined) {
            var sig = String(body.signature || '');
            if (sig !== '') {
                if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+\/=]+$/.test(sig)) {
                    return res.status(400).json({ error: 'The signature must be a PNG, JPG or WEBP image.' });
                }
                if (sig.length > SIGNATURE_MAX_CHARS) {
                    return res.status(400).json({ error: 'That signature image is too large. Please use a smaller image.' });
                }
            }
            update.signature = sig;
        }
        if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nothing to update.' });

        var { error } = await supabase
            .from('cleverment_teachers')
            .update(update)
            .eq('email', req.teacherEmail);
        if (error) {
            return res.status(500).json({ error: 'Could not save your profile. Please run supabase_batch2.sql in Supabase first. (' + error.message + ')' });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/teacher/assessments/:id', requireTeacherAuth, async function(req, res) {
    try {
        var { data: existing } = await supabase
            .from('cleverment_assessments')
            .select('id, teacher_email')
            .eq('id', req.params.id)
            .maybeSingle();
        if (!existing || existing.teacher_email !== req.teacherEmail) {
            return res.status(403).json({ error: 'Not authorized to delete this assessment.' });
        }
        var { error } = await supabase.from('cleverment_assessments').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/teacher/results/:id', requireTeacherAuth, async function(req, res) {
    try {
        var id = req.params.id;
        var { data: existing, error: fetchError } = await supabase
            .from('cleverment_results')
            .select('id, teacher_email')
            .eq('id', id)
            .maybeSingle();
        if (fetchError) return res.status(500).json({ error: fetchError.message });
        if (!existing || existing.teacher_email !== req.teacherEmail) {
            return res.status(403).json({ error: 'Not authorized to delete this result.' });
        }
        var { error } = await supabase.from('cleverment_results').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Deletes ONLY the results whose ids are listed (used for multi-select delete
// and for "Clear" on a filtered view). A teacher can only delete their own.
app.post('/api/teacher/results/bulk-delete', requireTeacherAuth, async function(req, res) {
    try {
        var ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
        ids = ids.map(function(x) { return Number(x); }).filter(function(x) { return Number.isFinite(x); });
        if (ids.length === 0) return res.status(400).json({ error: 'No results were selected.' });
        if (ids.length > 5000) return res.status(400).json({ error: 'Too many results at once.' });

        var { data, error } = await supabase
            .from('cleverment_results')
            .delete()
            .in('id', ids)
            .eq('teacher_email', req.teacherEmail)
            .select('id');
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, deleted: (data || []).length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/teacher/results', requireTeacherAuth, async function(req, res) {
    try {
        var { error } = await supabase.from('cleverment_results').delete().eq('teacher_email', req.teacherEmail);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// ADMIN: LIVE NOW (all teachers or filtered by teacherEmail)
// ============================================================
app.get('/api/admin/live', requireAdminAuth, async function(req, res) {
    try {
        var cutoff = Date.now() - 60 * 1000;
        for (var key in activeSessions) {
            if (new Date(activeSessions[key].lastSeen).getTime() < cutoff) {
                delete activeSessions[key];
            }
        }

        var filterEmail = req.query.teacherEmail
            ? String(req.query.teacherEmail).trim().toLowerCase()
            : '';

        var live = [];
        for (var k in activeSessions) {
            if (filterEmail) {
                if (activeSessions[k].teacherEmail === filterEmail) {
                    live.push(activeSessions[k]);
                }
            } else {
                live.push(activeSessions[k]);
            }
        }
        live.sort(function(a, b) { return a.startedAt < b.startedAt ? -1 : 1; });
        res.json({ live: live });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// ADMIN: ACCESS ATTEMPTS (all teachers or filtered by teacherEmail)
// ============================================================
app.get('/api/admin/access-logs', requireAdminAuth, async function(req, res) {
    try {
        var filterEmail = req.query.teacherEmail
            ? String(req.query.teacherEmail).trim().toLowerCase()
            : '';

        var query = supabase
            .from('cleverment_access_logs')
            .select('id, timestamp, code, subject, class_name, student_name, admission_number, status, message, source, teacher_email')
            .order('timestamp', { ascending: false })
            .limit(500);

        if (filterEmail) {
            query = query.eq('teacher_email', filterEmail);
        }

        var { data, error } = await query;
        if (error) {
            console.error('Admin access logs error:', error.message);
            return res.status(500).json({ error: 'Could not load access attempts.' });
        }

        var logs = (data || []).map(function(row) {
            return {
                id: row.id,
                timestamp: row.timestamp,
                code: row.code || '',
                subject: row.subject || '',
                className: row.class_name || '',
                studentName: row.student_name || '',
                admissionNumber: row.admission_number || '',
                status: row.status || '',
                message: row.message || '',
                source: row.source || 'student',
                teacherEmail: row.teacher_email || ''
            };
        });
        res.json({ logs: logs });
    } catch (e) {
        console.error('Admin access log endpoint error:', e.message);
        res.status(500).json({ error: 'Could not load access attempts.' });
    }
});

// ============================================================
// ADMIN: MANAGE ALL ASSESSMENTS & RESULTS
// ============================================================

app.get('/api/admin/assessments', requireAdminAuth, async function(req, res) {
    try {
        var { data, error } = await supabase
            .from('cleverment_assessments')
            .select('*')
            .order('id', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        res.json({ assessments: data || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/assessments/:id', requireAdminAuth, async function(req, res) {
    try {
        var { error } = await supabase.from('cleverment_assessments').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/results/:id', requireAdminAuth, async function(req, res) {
    try {
        var id = req.params.id;
        var { error } = await supabase.from('cleverment_results').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/results/bulk-delete', requireAdminAuth, async function(req, res) {
    try {
        var ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
        ids = ids.map(function(x) { return Number(x); }).filter(function(x) { return Number.isFinite(x); });
        if (ids.length === 0) return res.status(400).json({ error: 'No results were selected.' });
        if (ids.length > 5000) return res.status(400).json({ error: 'Too many results at once.' });
        var { data, error } = await supabase
            .from('cleverment_results')
            .delete()
            .in('id', ids)
            .select('id');
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, deleted: (data || []).length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/results', requireAdminAuth, async function(req, res) {
    try {
        var { error } = await supabase.from('cleverment_results').delete().neq('id', -1);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================

app.get('/', function(req, res) {
    res.send('CleverMent backend is running.');
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log('CleverMent backend listening on port ' + PORT);
    // Auto-submit attempts whose time ran out while the student was away.
    setTimeout(autoSubmitExpiredSessions, 5000);
    setInterval(autoSubmitExpiredSessions, 30 * 1000);
});
