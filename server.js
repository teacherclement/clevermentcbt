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
// CleverBot AI providers, tried in order until one answers.
// Add any of these keys in the Render environment (one is enough, several is best):
//   GEMINI_API_KEY      Google Gemini (aistudio.google.com/apikey). Tried FIRST. Free tier has daily limits
//   MISTRAL_API_KEY     free (phone number, no card), very large limits (text + images)
//   CEREBRAS_API_KEY    now needs a payment card - optional, skip it if you have none
//   GROQ_API_KEY        free, very fast, small per-minute limit (text + images)
//   OPENROUTER_API_KEY  free models, about 50 requests/day (text + images)
// Optional overrides (comma-separated model lists, first = preferred):
//   GEMINI_MODELS, GEMINI_VISION_MODELS, MISTRAL_MODELS, GROQ_MODELS, GROQ_VISION_MODELS,
//   OPENROUTER_MODELS, OPENROUTER_VISION_MODELS, CEREBRAS_MODELS,
//   AI_PROVIDER_ORDER (default: gemini,mistral,groq,openrouter,cerebras - providers without a key are skipped)
//   To use ONLY Gemini, set AI_PROVIDER_ORDER=gemini
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
        // Google Gemini through its OpenAI-compatible endpoint. Free-tier quotas are per model, so
        // listing several models multiplies the daily allowance (a model that is out of quota or
        // unknown is skipped automatically). Flash-Lite models have the largest free allowance.
        gemini: {
            key: process.env.GEMINI_API_KEY, host: 'generativelanguage.googleapis.com', path: '/v1beta/openai/chat/completions', tokenParam: 'max_tokens',
            text: csvEnv('GEMINI_MODELS', 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.6-flash'),
            vision: csvEnv('GEMINI_VISION_MODELS', 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.6-flash'),
            maxRequestTokens: aiNum('GEMINI_MAX_REQUEST_TOKENS', 200000)
        },
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
    return csvEnv('AI_PROVIDER_ORDER', 'gemini,mistral,groq,openrouter,cerebras').map(function(name) {
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

// Notifications (phone alerts + in-app alerts). The module is attached at the bottom of this file.
// cmN('eventName', ...) tells it something happened; it can never break the request that called it.
var cmNotify = null;
function cmN(name) {
    try {
        if (cmNotify && typeof cmNotify[name] === 'function') cmNotify[name].apply(null, Array.prototype.slice.call(arguments, 1));
    } catch (e) { /* alerts must never break the app */ }
}

app.use(helmet());
// Allowed website addresses: FRONTEND_URL plus any extra ones in EXTRA_ALLOWED_ORIGINS (comma separated),
// e.g. the same site with and without "www". A trailing slash is ignored.
var ALLOWED_ORIGINS = [FRONTEND_URL].concat(String(process.env.EXTRA_ALLOWED_ORIGINS || '').split(','))
    .map(function(o) { return String(o || '').trim().replace(/\/+$/, ''); })
    .filter(Boolean);
app.use(cors({
    origin: FRONTEND_URL === '*' ? '*' : function(origin, cb) {
        cb(null, !origin || ALLOWED_ORIGINS.indexOf(origin) !== -1);
    }
}));
// A tiny endpoint for uptime monitors: no database, answers instantly.
app.get('/health', function(req, res) { cmN('maybeTick'); res.json({ ok: true }); });
app.use(express.json({ limit: '24mb' }));

// ElevenLabs neural text-to-speech for assessment read-aloud. The API key stays server-side.
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
const CM_TTS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'f', accent: 'American' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'f', accent: 'American' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'f', accent: 'American' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'f', accent: 'American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'f', accent: 'English' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'm', accent: 'American' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'm', accent: 'American' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'm', accent: 'American' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'm', accent: 'American' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'm', accent: 'American' }
];
const cmTtsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false, message: { error: 'Voice service is busy. Please wait a moment and try again.' } });
app.get('/api/tts/voices', cmTtsLimiter, function(req, res) {
  if (!ELEVENLABS_API_KEY) return res.status(503).json({ available: false, provider: 'elevenlabs', error: 'Neural voices are not configured yet.' });
  var gender = req.query.gender === 'm' ? 'm' : req.query.gender === 'f' ? 'f' : '';
  res.set('Cache-Control', 'private, max-age=300');
  res.json({ available: true, provider: 'elevenlabs', voices: CM_TTS_VOICES.filter(function(v) { return !gender || v.gender === gender; }).map(function(v) { return { id: v.id, name: v.name, gender: v.gender, accent: v.accent }; }) });
});
app.post('/api/tts/speech', cmTtsLimiter, async function(req, res) {
  if (!ELEVENLABS_API_KEY) return res.status(503).json({ error: 'Neural voices are not configured yet.' });
  var text = String((req.body && req.body.text) || '').trim();
  var voiceId = String((req.body && req.body.voiceId) || '');
  var voice = CM_TTS_VOICES.find(function(v) { return v.id === voiceId; });
  if (!voice) return res.status(400).json({ error: 'Choose a supported CleverMent voice.' });
  if (!text || text.length > 700) return res.status(400).json({ error: 'Text must contain between 1 and 700 characters.' });
  try {
    var upstream = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice.id) + '?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text: text, model_id: ELEVENLABS_MODEL_ID, voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true } })
    });
    if (!upstream.ok) {
      var detail = await upstream.text().catch(function() { return ''; });
      console.error('ElevenLabs TTS error:', upstream.status, detail.slice(0, 500));
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: upstream.status === 401 || upstream.status === 403 ? 'The voice provider rejected the API key or voice access. Check the ElevenLabs account and key.' : upstream.status === 429 ? 'The voice provider rate limit or usage allowance has been reached. Try again later.' : 'The neural voice could not be generated. Please try again.' });
    }
    var audio = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-store');
    res.set('Content-Length', String(audio.length));
    return res.send(audio);
  } catch (e) {
    console.error('ElevenLabs TTS request failed:', e.message);
    return res.status(502).json({ error: 'The voice provider could not be reached. Please try again.' });
  }
});

// Roster-only assessments: questions and starting are given only to a logged-in student of that class.
app.use(async function cmRosterGate(req, res, next) {
    try {
        var p = req.path || '', code = '';
        if (req.method === 'GET' && p.indexOf('/api/quiz/assessment/') === 0) code = decodeURIComponent(p.slice('/api/quiz/assessment/'.length));
        else if (req.method === 'POST' && p === '/api/quiz/start-check') code = String((req.body && req.body.code) || '');
        code = code.trim().toUpperCase();
        if (!code) return next();
        var r = await supabase.from('cleverment_assessments').select('teacher_email, class_name, access_mode').eq('code', code).maybeSingle();
        if (!r.data || r.data.access_mode !== 'roster') return next();
        var who = studentFromRequest(req);
        if (!who || who.email !== String(r.data.teacher_email).toLowerCase() || who.className !== r.data.class_name) {
            return res.status(403).json({ allowed: false, reason: 'login_required', error: 'This assessment is for the students of ' + r.data.class_name + '. Please log in with your name and PIN to take it.' });
        }
        return next();
    } catch (e) {
        return res.status(500).json({ error: 'Could not check access right now. Please try again.' });
    }
});



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
// The real visitor IP. Behind Render's proxy, req.ip is the PROXY's address, which would make every
// visitor share one rate-limit bucket. Cloudflare (in front of Render) passes the real address in
// True-Client-IP; X-Forwarded-For is the fallback.
function clientIp(req) {
    var h = req.headers || {};
    var ip = String(h['true-client-ip'] || h['cf-connecting-ip'] || '').trim();
    if (!ip) {
        var chain = String(h['x-forwarded-for'] || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);
        if (chain.length >= 2) ip = chain[chain.length - 2];
        else if (chain.length === 1) ip = chain[0];
    }
    if (!ip) ip = String(req.ip || (req.socket && req.socket.remoteAddress) || 'unknown');
    var withPort = ip.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/);
    return withPort ? withPort[1] : ip;
}

const cleverBotLimiter = rateLimit({
    keyGenerator: clientIp,
    validate: false,
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

// "20 questions on photosynthesis", "10 MCQs on algebra for SS2", "Questions on the human heart"
// - a bare request with no verb. Only counts when the message BEGINS like that and is not a question.
var CB_RE_BARE_REQUEST = /^\s*(?:please[, ]+)?(?:\d{1,3}\b[^.!?\n]{0,40}?\b(?:questions?|mcqs?|multiple[- ]choice(?:\s+questions?)?|quiz(?:zes)?)\b|(?:mcqs?|multiple[- ]choice(?:\s+questions?)?|questions?)\s+(?:on|about|for|from|covering|based on)\b)/i;
// "create a test / exam / assessment on fractions"
var CB_RE_TEST_REQUEST = /\b(?:gen[ea]?r[ae]?t\w*|creat\w*|set|prepar\w*|draft\w*|compos\w*|mak\w*|writ\w*|build\w*)\s+(?:an?\s+|the\s+|some\s+|my\s+|\d+\s+)?(?:[\w-]+\s+){0,2}(?:test|exam|examination|assessment|worksheet|cbt)\b[^.!?\n]{0,50}\b(?:on|about|for|covering|from|in)\b/i;

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
    var generic = CB_RE_GENERIC.test(msg) || CB_RE_NEED_NUM.test(msg) || CB_RE_Q_FROM_SOURCE.test(msg) ||
        (CB_RE_BARE_REQUEST.test(msg) && msg.indexOf('?') === -1) || CB_RE_TEST_REQUEST.test(msg);
    // A student asking to be quizzed one question at a time is a normal chat, not a question list.
    var quizMe = /\b(?:quiz|test|examine|drill|ask)\s+me\b/i.test(msg);
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
    if (generic && !otherKind && !wantsExplanation && !quizMe) return 'csv';

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

// What CleverBot knows about the CleverMent app itself. The short core is always sent; the
// detailed guide is added only when the message looks like it is about the app (saves tokens).
var CB_APP_CORE = 'ABOUT CLEVERMENT: CleverMent is a web-based computer-based testing (CBT) and assessment platform for schools. Tagline: "Intelligent Assessment. Instant Feedback." ' +
    'Teachers publish multiple-choice assessments and share a unique assessment code; students (no account needed) take them on a phone or computer and get instant, automatic marking; ' +
    'teachers and admin see results, analytics and certificates. There are three roles: Student, Teacher (has an account) and Admin (password login). You (CleverBot) are the built-in assistant.\n' +
    'WHEN ANSWERING QUESTIONS ABOUT CLEVERMENT: be precise and brief. Give the direct answer first, then at most 5 short numbered steps or 3 bullets, usually under 80 words. ' +
    'No introductions, no repeating the question, no promotional wording. Answer only what was asked. Use only the facts in this guide; if something is not covered or you are unsure, say so in one sentence and suggest asking their teacher or admin, or using the in-app help button. Never invent features, prices or settings.\n';

var CB_APP_GUIDE = '\nCLEVERMENT GUIDE (facts you can rely on):\n' +
    'STUDENT: Landing page > "I\'m a Student" > enter the assessment code > enter name and admission number > Start. One submission per admission number per assessment. ' +
    'The timer keeps running even if the student leaves the page; when time is up the assessment is submitted automatically, with no button to press. ' +
    'Switching tabs/apps is recorded and shows a warning banner. Picking answers too fast shows a warning and is flagged to the teacher. ' +
    'If the teacher allowed it, the student sees score, corrections and a certificate (download as PDF or image); otherwise only "Assessment Submitted Successfully". "Take Another Assessment" returns to the code page. ' +
    'A teacher or admin can send a short message that pops up (with a sound) during the assessment; students cannot reply. ' +
    'If camera/noise monitoring is on, the student must allow camera/microphone; two warnings are allowed and the third violation ends and submits the assessment. Nothing is recorded. ' +
    'If a class has a roster, only admission numbers on it can take that assessment.\n' +
    'TEACHER: Sign up with name, email and password. Forgot password: "Forgot password?" on the login screen emails a reset link valid for 1 hour. A paused account is reactivated by a payment through Flutterwave. ' +
    'Dashboard menu: Live Now, Access Attempts, Publish Assessment, Class Roster, Analytics & Attendance, CSV History, plus the Results table. ' +
    'PUBLISH: choose Subject and Class; upload a CSV or load a saved Question Bank; set Time Limit, Pass Mark (default 50%) and optional Available From/Until; options: Shuffle questions and answers, Camera/Noise Monitoring, Show Results & Certificate to student; certificate name and signature (upload the signature once, it is saved to the account and used on every certificate); then Publish to get a unique code to share. ' +
    'EDIT ASSESSMENT: change questions and also class, subject, certificate name, time, pass mark, monitoring, shuffle and show-results, then Save Changes. The code stays the same and past results are not recalculated. ' +
    'CSV HISTORY: "Use Again" reloads the questions and all settings it was published with, ready to publish. Question Bank: save a set of questions under a name and reuse it. "Review Questions & Add Images" attaches pictures to questions. Maths can be typed between dollar signs, e.g. $x^2 + 5x - 6 = 0$. ' +
    'CSV FORMAT: columns Question, Option A, Option B, Option C, Option D, Correct Answer (letter A-D), Image URL (optional); line 1 is a header and is skipped; wrap the question and options in double quotes. ' +
    'RESULTS TABLE: filter by class and subject, sort, select several results to delete or to download certificates (one ZIP of PDFs). Export CSV and Clear All affect only the results currently shown by the filter. Tab Switches and Cam/Noise Flags show monitoring events; a "Fast answering" badge marks students who answered too quickly. ' +
    'LIVE NOW: shows students taking your assessments right now; send a message to one student or to all, from ready-made messages or a custom one; it shows "Seen" when the student has it. ' +
    'ANALYTICS & ATTENDANCE: most-missed questions, who has or has not submitted (needs a roster), and Download All Certificates (ZIP). CLASS ROSTER is optional: download the template, fill names and admission numbers, upload it. ' +
    'ACCESS ATTEMPTS lists student attempts to open your assessments, including blocked ones.\n' +
    'ADMIN: logs in with the admin password. Menu: Live Now, Access Logs, Select Teacher, Manage Teachers (pause or delete), Manage FAQs, Reactivation Fee, Activity Log (shows teacher name and email). Admin can do what a teacher can do, for any teacher.\n' +
    'CLEVERBOT: answer-only. It cannot publish, delete, change settings or press buttons for anyone; it explains how to do things. It writes question sets in the CleverMent CSV format and can read attached images, PDFs and documents.\n';

// True when the message (or the one before it) is about the CleverMent app, so the detailed guide is worth sending.
function cleverBotAboutApp(message, history) {
    var recent = String(message || '');
    var h = Array.isArray(history) ? history : [];
    for (var i = h.length - 1, n = 0; i >= 0 && n < 2; i--) {
        if (h[i] && h[i].role === 'user' && h[i].text) { recent += ' ' + String(h[i].text).slice(0, 400); n++; }
    }
    return /clever\s*-?\s*(?:ment|bot)|\b(?:this|the|your)\s+(?:app|platform|website|site|system|software)\b|assessment code|admission number|roster|publish|certificate|live now|access (?:log|attempt)|csv history|question bank|pass mark|shuffle|monitoring|results? (?:dashboard|table)|analytics|teacher dashboard|reactivat|paused|flutterwave|signature|take another assessment|my (?:assessment|results?|dashboard)|how do i (?:log ?in|sign ?up)|admin/i.test(recent);
}

function cleverBotBaseSystemText(context, aboutApp) {
    return 'You are CleverBot, the AI assistant built into the CleverMent assessment platform. ' +
        'You are a capable, general-purpose assistant on the level of ChatGPT, Claude and Gemini. ' +
        'You help with school subjects at every level, mathematics and science, coding, writing and editing, summarising and explaining documents and images, translation, study and career advice, and everyday questions. ' +
        'Do not limit yourself to CleverMent topics; answer anything helpfully. You can also answer questions about CleverMent itself accurately.\n\n' + CB_APP_CORE + (aboutApp ? CB_APP_GUIDE : '') + '\n' +
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
        'The person wants a set of multiple-choice questions. Questions are ALWAYS written in the CleverMent import format, even if the person never mentions CleverMent or CSV. ' +
        'Reply with ONE fenced code block that starts with ```csv and ends with ``` and contains the CSV and NOTHING else. ' +
        'No greeting, no explanation, no notes, no question numbers, no text before or after the code block.\n\n' +
        'FIXED LAYOUT:\n' +
        'Line 1 is ALWAYS this exact header row (CleverMent skips line 1 when importing, so without it the first question would be lost):\n' +
        CB_CSV_HEADER + '\n' +
        'Every following line is exactly ONE question with 7 fields separated by commas: "Question", "Option A", "Option B", "Option C", "Option D", Correct Answer, and an EMPTY Image URL field. ' +
        'The question and EVERY one of the four options are ALWAYS wrapped in double quotes, even when they contain no comma. The Correct Answer letter is NOT in quotes. Every row ends with a comma.\n\n' +
        'RULES:\n' +
        '1. Exactly 4 options per question and exactly ONE correct option. Each option cell holds only the option text (no "A." or "(a)" prefixes).\n' +
        '2. DIFFICULTY - EXAM STANDARD ONLY: every question must be MEDIUM or HARD (about half each) and pitched like a real exam paper for the class level (for example WAEC, NECO, BECE, Common Entrance or Cambridge, whichever fits). NEVER write easy questions: no simple recall, no one-word definitions, nothing a student could answer without thinking. Test understanding, application, calculation, reasoning and analysis. If the person asks for easy questions, write medium ones instead. Wrong options must be plausible and built from common mistakes and misconceptions, all of similar length and style to the correct one.\n' +
        '3. STAND-ALONE QUESTIONS: every question must make complete sense on its own, exactly like a question printed in a standard exam paper. NEVER mention, quote or point to an attached document, file, text, passage, notes, article, slides, handout, source or "the author", and never write phrases such as "according to the text", "according to the document", "in the passage", "as stated above", "based on the material" or "from the reading". Use any attached material ONLY as the source of facts and topics, then ask about the subject itself.\n' +
        '4. Correct Answer is a single capital letter: A, B, C or D. Spread the correct answers across A, B, C and D; do not favour one letter.\n' +
        '5. One question per line. Never put a line break inside a cell.\n' +
        '6. QUOTES: wrap the question and each option in double quotes, always, as in the examples. Never use a double-quote character INSIDE the text of a cell (use single quotes or rephrase) because the importer cannot read escaped quotes. Commas inside the quotes are fine.\n' +
        '7. Write mathematics in LaTeX between dollar signs, e.g. $\\frac{2}{5}$, $x^2 + 3x$, $\\sqrt{36}$. Write the backslashes exactly once, as shown. Plain-number questions stay plain text.\n' +
        '8. Fill-in-the-blank style questions use five underscores: _____\n' +
        '9. Image URL: ALWAYS leave it empty (the teacher adds pictures inside CleverMent). Only when a question truly depends on an attached diagram or figure, word it so it makes sense with the picture attached (for example "In the diagram, the part labelled X is the...").\n' +
        '10. Quantity: if the person gives a number, write EXACTLY that many questions. If no number is given, write 10. If they ask for "all" or "as many as possible", cover the whole material evenly (maximum 60). Never write more than 100.\n' +
        '11. Source: if a file, image or document is attached, base every question ONLY on its content and cover it evenly from start to end, but keep every question stand-alone as rule 3 says. If the attachment already contains questions, convert them faithfully into this format (keep their wording, work out the correct answer if it is not given, and remove any wording that points to a passage or document). If nothing is attached, use the topic, subject and class level the person states.\n' +
        '12. Quality: every question must be clear, unambiguous and factually correct. Check each answer is right before you write it.\n' +
        '13. Only exception: if you truly cannot do it (the attachment cannot be read, or you were given no topic and no material at all), reply with ONE short sentence saying what you need instead of a code block.\n\n' +
        'EXAMPLE OF THE EXACT OUTPUT STYLE AND DIFFICULTY:\n' +
        '```csv\n' +
        CB_CSV_HEADER + '\n' +
        '"A train covers 150 km in 2.5 hours. At the same speed, how long will it take to cover 360 km?","5 hours","5.4 hours","6 hours","6.5 hours",C,\n' +
        '"Which of the following would be the most direct result of a sudden fall in blood glucose level?","Release of glucagon by the pancreas","Release of insulin by the pancreas","Conversion of glucose to glycogen in the liver","Increased reabsorption of water in the kidney",A,\n' +
        '"Choose the option that best completes the sentence: The committee _____ yet to announce the results of the election.","are","have","has","were",C,\n' +
        '"Solve the simultaneous equations $2x + y = 11$ and $x - y = 1$. What is the value of $xy$?","$10$","$12$","$14$","$7$",B,\n' +
        '"Simplify $\\frac{x^2 - 9}{x^2 + 5x + 6}$.","$\\frac{x - 3}{x + 2}$","$\\frac{x + 3}{x + 2}$","$\\frac{x - 3}{x - 2}$","$\\frac{x + 3}{x - 2}$",A,\n' +
        '"In the diagram, the chamber labelled X pumps oxygenated blood to the whole body. It is the","Right atrium","Left atrium","Right ventricle","Left ventricle",D,\n' +
        '```';
}

// Questions that point at the uploaded material ("according to the text", "in the passage"...) can never be
// answered by a student who has not seen it, so they are dropped and replaced by a new question.
var CB_RE_SOURCE_REF = new RegExp(
    '\\b(?:according to|as (?:stated|mentioned|described|explained|discussed|shown|indicated|noted|given|outlined|presented) (?:in|by)|based on|from|in|per|within|throughout|stated in|mentioned in|described in|explained in|discussed in|given in|shown in|using|refer(?:s|ring)? to|referring to)\\s+(?:the|this|that|these|those|our|your|a)\\s+(?:(?:given|above|following|attached|provided|uploaded|reading|comprehension|study|first|second|third|last|opening|closing)\\s+)?(?:text|texts|passage|passages|document|documents|article|articles|excerpt|extract|material|materials|notes|handout|handouts|file|pdf|slides?|attachment|paragraph|paragraphs|reading|writing|author|writer)\\b' +
    '|\\b(?:the|this|that)\\s+(?:document|passage|attachment|handout|pdf|excerpt|extract)\\b' +
    '|\\b(?:the|this)\\s+(?:author|writer)\\s+(?:says|said|states|stated|mentions|mentioned|describes|described|explains|explained|notes|noted|argues|claims|suggests)\\b' +
    '|\\b(?:in|from|by)\\s+(?:the\\s+)?(?:text|passage)\\s+(?:above|below|given|provided)\\b',
    'i');

function cleverBotRefersToSource(row) {
    return CB_RE_SOURCE_REF.test(String(row || ''));
}

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
    } else if (provider.name === 'gemini') {
        // Gemini counts its private thinking against the output limit, so keep it light for
        // normal chat (faster, no timeouts) and only think harder for hard questions.
        // ('minimal' is rejected by some Gemini models, so 'low' is the floor.)
        bodyObj.reasoning_effort = level === 'medium' ? 'medium' : 'low';
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
                    if (Array.isArray(data)) data = data[0]; // Gemini can wrap its error in an array
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
var aiRateHits = {};
function aiIsDailyLimit(e) {
    return !!(e && e.statusCode === 429 && /per ?day|daily|PerDay/i.test(String(e.message || '')));
}
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
                var streamed = await streamLLM(payload, res, opts, c.provider, c.model, messages);
                aiRateHits[c.provider.name + '/' + c.model] = 0;
                return streamed;
            } catch (e) {
                lastError = e;
                if (e && e.sentText) throw e;
                var code = e && e.statusCode;
                var coolKey = c.provider.name + '/' + c.model;
                var dailyLimit = aiIsDailyLimit(e);
                console.warn('CleverBot AI ' + coolKey + ' failed: ' + ((e && e.message) || 'unknown error') + (code ? ' (HTTP ' + code + ')' : ''));
                if (!dailyLimit && (code === 429 || code === 503) && attempt === 0 && Date.now() < deadline - 5000) { await sleep(1500); continue; } // brief capacity limit: one quick retry
                var coolMs = aiCoolFor(code);
                if (code === 429) {
                    aiRateHits[coolKey] = (aiRateHits[coolKey] || 0) + 1;
                    if (dailyLimit) coolMs = 60 * 60 * 1000;           // out of daily quota: stop wasting calls on it
                    else if (aiRateHits[coolKey] >= 3) coolMs = 15 * 60 * 1000; // keeps hitting the limit
                }
                aiCooldown[coolKey] = Date.now() + coolMs;
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

// Splits one CSV line into plain field values (quotes removed, "" read as one quote).
function cleverBotParseCsvLine(line) {
    var out = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (inQ) {
            if (ch === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
            } else { cur += ch; }
        } else if (ch === '"' && cur.trim() === '') {
            inQ = true; cur = '';
        } else if (ch === ',') {
            out.push(cur); cur = '';
        } else { cur += ch; }
    }
    out.push(cur);
    return out;
}

// Rewrites a question row in the exact CleverMent layout: the question and all four options
// ALWAYS wrapped in double quotes, the answer as a bare capital letter, one trailing comma.
// Returns null when the row cannot be trusted (it is then skipped and replaced by a new one).
function cleverBotQuoteRow(row) {
    var f = cleverBotParseCsvLine(String(row || '').trim());
    // Drop the empty Image URL column (or a stray URL) at the end.
    while (f.length > 6 && (String(f[f.length - 1]).trim() === '' || /^(?:https?:\/\/|\/)/i.test(String(f[f.length - 1]).trim()))) f.pop();
    if (f.length < 6) return null;
    if (f.length > 6) {
        // The AI forgot to quote a cell that holds commas - the question is the likeliest one.
        var extra = f.length - 6;
        f = [f.slice(0, extra + 1).join(',')].concat(f.slice(extra + 1));
    }
    var ans = String(f[5]).trim().replace(/^"|"$/g, '').trim().toUpperCase();
    if (!/^[A-D]$/.test(ans)) return null;
    var cells = [];
    for (var i = 0; i < 5; i++) {
        // The importer cannot read a quote inside a quoted cell, so use apostrophes instead.
        var v = String(f[i]).replace(/\s+/g, ' ').trim().replace(/"/g, "'");
        if (!v) return null;
        cells.push('"' + v + '"');
    }
    return cells.join(',') + ',' + ans + ',';
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
        var row = cleverBotQuoteRow(found[0]);
        if (!row) return;
        if (cleverBotRefersToSource(row)) return; // refers to the uploaded document: skip it, a new question replaces it
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
        instr += ' Every question must be MEDIUM or HARD exam standard (no easy recall questions) and must stand alone: never mention the document, text, passage or notes, and never write "according to the text/document".';
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
        var systemText = cleverBotBaseSystemText(context, !questionGeneration && cleverBotAboutApp(message, history));
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
    keyGenerator: clientIp,
    validate: false,
    skipSuccessfulRequests: true, // only wrong passwords count, so many teachers on one school Wi-Fi are never blocked together
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

async function requireTeacherAuth(req, res, next) {
    var authHeader = req.headers.authorization || '';
    var token = authHeader.indexOf('Bearer ') === 0 ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not logged in.' });
    try {
        var decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'teacher') {
            req.teacherId = decoded.teacherId;
            req.teacherEmail = decoded.email;
            return next();
        }
        // Administrator delegation is restricted to /api/teacher/* routes and
        // requires a valid admin JWT plus a real teacher record selected by email.
        if (decoded.role === 'admin' && String(req.path || '').indexOf('/api/teacher/') === 0) {
            var targetEmail = String(req.headers['x-cleverment-act-as-teacher'] || '').trim().toLowerCase();
            if (!targetEmail) return res.status(403).json({ error: 'Select a teacher before opening the teacher workspace.' });
            var lookup = await supabase.from('cleverment_teachers').select('id, email').ilike('email', targetEmail).maybeSingle();
            if (lookup.error || !lookup.data) return res.status(403).json({ error: 'The selected teacher account could not be verified.' });
            req.teacherId = lookup.data.id;
            req.teacherEmail = lookup.data.email;
            req.adminActingAsTeacher = true;
            req.adminRole = 'admin';
            return next();
        }
        return res.status(403).json({ error: 'Not authorized.' });
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
        cmN('onTeacherSignup', { name: inserted.name, email: inserted.email });
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

        try { var nowIso = new Date().toISOString(); await supabase.from('cleverment_teachers').update({ last_login_at: nowIso, last_active_at: nowIso }).eq('id', teacher.id); } catch (e) { /* column not added yet */ }
        // A paused teacher still needs a valid token - they can't reach
        // their dashboard, but they DO need to be authenticated to call
        // /api/payment/initiate and pay to reactivate their own account.
        var token = signToken({ role: 'teacher', teacherId: teacher.id, email: teacher.email });
        cmN('onTeacherLogin', { name: teacher.name, email: teacher.email });
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

// Admin login protection (in memory, like the live-presence data):
// - 5 wrong passwords from one network lock admin login for that network: 15 min, then 1 hour, then 24 hours.
// - If many wrong passwords arrive from everywhere in an hour (someone rotating addresses), every attempt is slowed.
// - After a successful login the admin is told how many wrong attempts happened since the last visit.
var ADMIN_MAX_FAILS = 5;
var ADMIN_LOCK_STEPS_MS = [15 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];
var adminLoginByIp = {};
var adminRecentFails = [];
var adminFailsSinceLogin = { count: 0, lastAt: null };

function adminPasswordMatches(given) {
    var a = crypto.createHash('sha256').update(String(given || '')).digest();
    var b = crypto.createHash('sha256').update(String(ADMIN_PASSWORD || '')).digest();
    return crypto.timingSafeEqual(a, b) && !!ADMIN_PASSWORD;
}

setInterval(function() {
    var now = Date.now();
    Object.keys(adminLoginByIp).forEach(function(ip) {
        var st = adminLoginByIp[ip];
        st.fails = st.fails.filter(function(t) { return now - t < 15 * 60 * 1000; });
        if (st.lockedUntil < now && st.fails.length === 0 && now - (st.lastFailAt || 0) > 24 * 60 * 60 * 1000) delete adminLoginByIp[ip];
    });
    adminRecentFails = adminRecentFails.filter(function(t) { return now - t < 60 * 60 * 1000; });
}, 10 * 60 * 1000);

app.post('/api/auth/admin/login', authLimiter, async function(req, res) {
    try {
        var ip = clientIp(req);
        var now = Date.now();
        var st = adminLoginByIp[ip] || (adminLoginByIp[ip] = { fails: [], locks: 0, lockedUntil: 0, lastFailAt: 0 });

        if (st.lockedUntil > now) {
            var secs = Math.ceil((st.lockedUntil - now) / 1000);
            var mins = Math.ceil(secs / 60);
            res.set('Retry-After', String(secs));
            return res.status(429).json({
                error: 'Admin login is locked on this network after too many wrong passwords. Try again in ' +
                    (mins >= 120 ? Math.ceil(mins / 60) + ' hours' : mins + ' minute' + (mins === 1 ? '' : 's')) + '.',
                locked: true,
                retryAfterSeconds: secs
            });
        }

        adminRecentFails = adminRecentFails.filter(function(t) { return now - t < 60 * 60 * 1000; });
        if (adminRecentFails.length >= 20) await sleep(3000); // under attack: make every guess slow

        var cred = adminCredentialState(req.body);
        if (cred === 'needcode') return res.status(401).json({ error: 'Enter the 6-digit code from your authenticator app.', needsCode: true });
        if (cred === 'ok') {
            st.fails = [];
            st.locks = 0;
            st.lockedUntil = 0;
            var security = { failedAttempts: adminFailsSinceLogin.count, lastFailedAt: adminFailsSinceLogin.lastAt };
            adminFailsSinceLogin = { count: 0, lastAt: null };
            return res.json({ token: signToken({ role: 'admin' }), security: security, weakPassword: String(ADMIN_PASSWORD || '').length < 12, totpEnabled: !!ADMIN_TOTP_SECRET });
        }

        // Wrong password.
        st.fails = st.fails.filter(function(t) { return now - t < 15 * 60 * 1000; });
        st.fails.push(now);
        st.lastFailAt = now;
        adminRecentFails.push(now);
        adminFailsSinceLogin.count++;
        adminFailsSinceLogin.lastAt = new Date(now).toISOString();

        if (st.fails.length >= ADMIN_MAX_FAILS) {
            var lockMs = ADMIN_LOCK_STEPS_MS[Math.min(st.locks, ADMIN_LOCK_STEPS_MS.length - 1)];
            st.locks++;
            st.fails = [];
            st.lockedUntil = now + lockMs;
            console.warn('Admin login locked for ' + Math.round(lockMs / 60000) + ' min after repeated wrong passwords from ' + ip);
            var lm = Math.round(lockMs / 60000);
            return res.status(429).json({
                error: 'Too many wrong passwords. Admin login is now locked on this network for ' + (lm >= 120 ? Math.round(lm / 60) + ' hours' : lm + ' minutes') + '.',
                locked: true,
                retryAfterSeconds: Math.round(lockMs / 1000)
            });
        }
        var left = ADMIN_MAX_FAILS - st.fails.length;
        return res.status(401).json({ error: 'Incorrect admin password. ' + left + ' attempt' + (left === 1 ? '' : 's') + ' left before a temporary lock.', attemptsLeft: left });
    } catch (e) {
        res.status(500).json({ error: 'Could not check the password. Please try again.' });
    }
});

// ============================================================
// FEATURE PERMISSIONS — per-teacher feature controls
// Apply supabase_feature_permissions.sql once before using this feature.
// ============================================================
var CM_FEATURE_DEFAULTS = {
    liveNow: true, liveCompetition: true, accessLogs: true, createAssessments: true,
    publishedAssessments: true, insights: true, messaging: true, classRoster: true,
    analytics: true, studentReports: true, csvHistory: true, classPositions: true,
    studentProgress: true, backupExport: true, questionBank: true, certificates: true,
    learningResources: true
};
app.get('/api/admin/teachers/:id/features', requireAdminAuth, async function(req, res) {
    try {
        var result = await supabase.from('cleverment_feature_permissions').select('features').eq('teacher_id', String(req.params.id)).maybeSingle();
        if (result.error) return res.status(500).json({ error: result.error.message, migrationRequired: /does not exist|schema cache/i.test(result.error.message || '') });
        res.json({ features: Object.assign({}, CM_FEATURE_DEFAULTS, result.data && result.data.features || {}) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/teachers/:id/features', requireAdminAuth, async function(req, res) {
    try {
        var input = req.body && req.body.features;
        if (!input || typeof input !== 'object' || Array.isArray(input)) return res.status(400).json({ error: 'A features object is required.' });
        var safe = {};
        Object.keys(CM_FEATURE_DEFAULTS).forEach(function(k) { safe[k] = Object.prototype.hasOwnProperty.call(input, k) ? input[k] === true : true; });
        var saved = await supabase.from('cleverment_feature_permissions').upsert({ teacher_id: String(req.params.id), features: safe, updated_at: new Date().toISOString() }, { onConflict: 'teacher_id' });
        if (saved.error) return res.status(500).json({ error: saved.error.message, migrationRequired: /does not exist|schema cache/i.test(saved.error.message || '') });
        res.json({ success: true, features: safe });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/teacher/features', requireTeacherAuth, async function(req, res) {
    try {
        var result = await supabase.from('cleverment_feature_permissions').select('features').eq('teacher_id', String(req.teacherId)).maybeSingle();
        if (result.error) return res.status(500).json({ error: result.error.message, migrationRequired: /does not exist|schema cache/i.test(result.error.message || '') });
        res.json({ features: Object.assign({}, CM_FEATURE_DEFAULTS, result.data && result.data.features || {}) });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
            .select('id, name, email, paused, created_at, last_login_at, last_active_at')
            .order('created_at', { ascending: false });
        if (error && /last_(login|active)_at/i.test(error.message || '')) {
            // The new columns have not been added yet (supabase_update6.sql): list teachers without them.
            var retry = await supabase.from('cleverment_teachers').select('id, name, email, paused, created_at').order('created_at', { ascending: false });
            data = retry.data; error = retry.error;
        }
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
        cmN('onTeacherAccount', id, newPaused);
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
    cmN('onPayment', teacherId);
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
function clockToSeconds(str) {
    var parts = String(str || '').split(':').map(function(x) { return Number(x); });
    if (parts.some(function(x) { return !isFinite(x); })) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
}

// Scales raw per-question milliseconds so the whole seconds add up EXACTLY to the total time taken.
function normalizeQuestionSeconds(msList, totalSeconds) {
    var total = Math.round(Number(totalSeconds));
    if (!isFinite(total) || total < 0) return null;
    var sum = msList.reduce(function(a, b) { return a + b; }, 0);
    if (sum <= 0) return null;
    var raw = msList.map(function(m) { return m / sum * total; });
    var floors = raw.map(Math.floor);
    var remaining = total - floors.reduce(function(a, b) { return a + b; }, 0);
    var order = raw.map(function(v, i) { return { i: i, f: v - Math.floor(v) }; }).sort(function(x, y) { return y.f - x.f; });
    for (var k = 0; k < remaining; k++) floors[order[k % order.length].i]++;
    return floors;
}

function gradeSubmission(assessment, submittedAnswers, totalSeconds, shownIndices) {
    var allQuestions = assessment.questions || [];
    // Random pools: the student was shown only some of the questions. Only honoured when the assessment really uses a pool.
    var limit = parseInt(assessment.question_limit, 10) || 0;
    var shownSet = null;
    if (limit > 0 && Array.isArray(shownIndices)) {
        var seen = {}, list = [];
        shownIndices.forEach(function(x) {
            var n = parseInt(x, 10);
            if (!isNaN(n) && n >= 0 && n < allQuestions.length && !seen[n]) { seen[n] = true; list.push(n); }
        });
        list = list.slice(0, limit);
        if (list.length > 0) { shownSet = {}; list.forEach(function(n) { shownSet[n] = true; }); }
    }
    var correctCount = 0, wrongCount = 0;
    var corrections = [];
    var answerByIndex = {};
    var msByIndex = {};
    for (var i = 0; i < (submittedAnswers || []).length; i++) {
        answerByIndex[submittedAnswers[i].originalIndex] = submittedAnswers[i].selectedOptionText;
        msByIndex[submittedAnswers[i].originalIndex] = Math.max(0, Math.min(Number(submittedAnswers[i].ms) || 0, 24 * 3600 * 1000));
    }
    var shownList = [];
    for (var qi = 0; qi < allQuestions.length; qi++) {
        if (shownSet && !shownSet[qi]) continue;
        var q = allQuestions[qi];
        var correctIdx = letterToIndex(q.correctAnswer);
        var correctText = (correctIdx !== -1 && q.options) ? q.options[correctIdx] : '';
        var selectedText = answerByIndex.hasOwnProperty(qi) ? answerByIndex[qi] : null;
        var answered = selectedText !== null && selectedText !== '';
        var isCorrect = answered && selectedText === correctText;
        if (isCorrect) correctCount++; else if (answered) wrongCount++;
        shownList.push(qi);
        corrections.push({
            question: q.question,
            userAnswerText: selectedText || '',
            correctAnswerText: correctText,
            isCorrect: isCorrect,
            explanation: q.explanation ? String(q.explanation).slice(0, 600) : undefined
        });
    }
    if (totalSeconds !== undefined && totalSeconds !== null) {
        var secs = normalizeQuestionSeconds(shownList.map(function(idx) { return msByIndex[idx] || 0; }), totalSeconds);
        if (secs) corrections.forEach(function(cr, idx) { cr.timeSeconds = secs[idx]; });
    }
    var totalQuestions = corrections.length;
    // Optional negative marking: each wrong ANSWERED question takes away a fraction of a mark (blank answers cost nothing).
    var neg = Math.max(0, Math.min(1, Number(assessment.negative_marking) || 0));
    var net = Math.max(0, correctCount - neg * wrongCount);
    var score = totalQuestions > 0 ? Math.round((net / totalQuestions) * 100) : 0;
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

// Results already on file for this student + assessment. A result the teacher has marked
// "retake allowed" does not block a new attempt. Works even if the retake_allowed column has
// not been added to the database yet.
async function findBlockingResults(code, admissionNumber) {
    var r = await supabase
        .from('cleverment_results')
        .select('id, retake_allowed')
        .eq('assessment_code', code)
        .ilike('admission_number', admissionNumber)
        .limit(10);
    if (r.error && /retake_allowed/i.test(r.error.message || '')) {
        r = await supabase
            .from('cleverment_results')
            .select('id')
            .eq('assessment_code', code)
            .ilike('admission_number', admissionNumber)
            .limit(10);
    }
    if (r.error) return { error: r.error, rows: [] };
    return { rows: (r.data || []).filter(function(row) { return !row.retake_allowed; }), all: r.data || [] };
}

// After a retake is saved, the earlier result (the one the teacher allowed to be redone) is removed.
async function removeSupersededResults(code, admissionNumber) {
    try {
        await supabase.from('cleverment_results').delete()
            .eq('assessment_code', code)
            .ilike('admission_number', admissionNumber)
            .eq('retake_allowed', true);
    } catch (e) { /* column not added yet - nothing to remove */ }
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

// Many students open the same assessment at the same moment, so the database row is remembered for
// 30 seconds instead of being read again for every student. Cleared whenever an assessment is edited.
var assessmentRowCache = {};
async function getAssessmentRowCached(code) {
    var hit = assessmentRowCache[code];
    if (hit && hit.expires > Date.now()) return { data: hit.data, error: null };
    var r = await supabase.from('cleverment_assessments').select('*').eq('code', code).maybeSingle();
    if (!r.error && r.data) assessmentRowCache[code] = { data: r.data, expires: Date.now() + 30 * 1000 };
    return r;
}

app.get('/api/quiz/assessment/:code', async function(req, res) {
    try {
        var code = req.params.code;
        var { data: assessment, error } = await getAssessmentRowCached(code);

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
            questionLimit: parseInt(assessment.question_limit, 10) || 0,
            negativeMarking: Number(assessment.negative_marking) || 0,
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
            .select('code, teacher_email, subject, class_name, access_mode, available_from, available_until')
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

        var rosterVerified = false; // true only when name AND admission number matched a roster entry
        // Roster-only assessments must fail closed: a missing/empty roster is not permission.
        if (assessment.access_mode === 'roster' && (!rosterRow || !Array.isArray(rosterRow.student_names) || rosterRow.student_names.length === 0)) {
            await logStudentAccessEvent(assessment.teacher_email, Object.assign({}, baseEvent, {
                status: 'not_on_roster', message: 'Roster-only assessment has no roster entries for this class.'
            }));
            return res.status(403).json({ allowed: false, reason: 'not_on_roster', error: 'This assessment is restricted to the class roster, but no students are currently listed for ' + assessment.class_name + '. Please contact your teacher.' });
        }
        if (rosterRow && rosterRow.student_names && rosterRow.student_names.length > 0) {
            var validEntries = rosterRow.student_names.filter(function(e) {
                return e && typeof e === 'object' && (e.admissionNumber || e.name);
            });
            if (assessment.access_mode === 'roster' && validEntries.length === 0) {
                return res.status(403).json({ allowed: false, reason: 'not_on_roster', error: 'This assessment is restricted to the class roster, but no valid students are listed for ' + assessment.class_name + '. Please contact your teacher.' });
            }
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
                rosterVerified = true;
            }
        }

        // Authoritative duplicate-submission check before entering the quiz.
        var blocking = await findBlockingResults(code, admissionNumber);
        var existing = blocking.rows;
        var resultError = blocking.error;

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
        // The student's picture is only ever sent to the student it belongs to, after the roster check passed.
        var studentPhoto = rosterVerified ? await getStudentPhoto(assessment.teacher_email, assessment.class_name, admissionNumber) : '';
        // Cross-device resume: if this student already started this assessment, give back the running clock and saved answers.
        var resume = null;
        try {
            var sessRow = await supabase.from('cleverment_quiz_sessions')
                .select('id, ends_at, submitted, answers, tab_switches, proctor_violations, fast_answer_warnings')
                .eq('code', code).eq('admission_key', admissionNumber.toLowerCase()).maybeSingle();
            var sr = sessRow && sessRow.data;
            if (sr && !sr.submitted) {
                if (sr.ends_at) {
                    var leftSec = Math.round((new Date(sr.ends_at).getTime() - Date.now()) / 1000);
                    if (leftSec <= 0) {
                        return res.status(403).json({ allowed: false, reason: 'time_up', error: 'Your time for this assessment is over. Your saved answers are being submitted automatically.' });
                    }
                    resume = { remainingSeconds: leftSec, endsAt: sr.ends_at };
                } else {
                    resume = { remainingSeconds: 0, endsAt: null };
                }
                resume.answers = Array.isArray(sr.answers) ? sr.answers : [];
                resume.tabSwitches = sr.tab_switches || 0;
                resume.proctorViolations = sr.proctor_violations || 0;
                resume.fastAnswerWarnings = sr.fast_answer_warnings || 0;
            }
        } catch (eResume) { resume = null; }
        res.json({ allowed: true, photo: studentPhoto, resume: resume });
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
        var blockingSubmit = await findBlockingResults(code, admissionNumber);
        var existing = blockingSubmit.rows;
        if (existing && existing.length > 0) {
            return res.status(409).json({ error: 'A student with admission number "' + admissionNumber + '" has already submitted this assessment.' });
        }

        // Grade server-side, by comparing the TEXT of the option the
        // student picked against the real correct option's text - this
        // works correctly no matter how the client shuffled question
        // order or option order for that particular student.
        var graded = gradeSubmission(assessment, submittedAnswers, clockToSeconds(body.timeTaken), body.shownIndices);
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

        // A teacher-approved retake replaces the earlier result.
        await removeSupersededResults(code, admissionNumber);
        cmN('onSubmit', assessment, studentName, admissionNumber, graded, false);

        // The attempt is finished - stop the auto-submit sweeper from touching it.
        var finishedKey = liveSessionKey(code, admissionNumber);
        delete pendingProgress[finishedKey];
        if (quizSessionCache[finishedKey]) quizSessionCache[finishedKey].submitted = true;
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

// The browser sends progress often, so the server keeps the LATEST copy in memory and writes it to the
// database in batches every 10 seconds (one write per student, however many updates arrived).
var quizSessionCache = {};   // "CODE|admission" -> { id, endsAt, submitted, touched }
var pendingProgress = {};    // "CODE|admission" -> fields to save
var progressFlushing = false;

async function flushPendingProgress() {
    if (progressFlushing) return;
    progressFlushing = true;
    try {
        var keys = Object.keys(pendingProgress);
        for (var i = 0; i < keys.length; i += 5) {
            await Promise.all(keys.slice(i, i + 5).map(async function(k) {
                var fields = pendingProgress[k];
                delete pendingProgress[k];
                var sess = quizSessionCache[k];
                if (!fields || !sess || sess.submitted) return;
                var r = await supabase.from('cleverment_quiz_sessions').update(fields).eq('id', sess.id);
                if (r.error && !pendingProgress[k]) pendingProgress[k] = fields; // try again next round
            }));
        }
    } catch (e) {
        console.error('Progress flush error:', e.message);
    } finally {
        progressFlushing = false;
    }
}
setInterval(flushPendingProgress, 10 * 1000);
setInterval(function() {
    var cutoff = Date.now() - 6 * 60 * 60 * 1000;
    Object.keys(quizSessionCache).forEach(function(k) {
        if ((quizSessionCache[k].touched || 0) < cutoff) delete quizSessionCache[k];
    });
}, 30 * 60 * 1000);

app.post('/api/quiz/progress', async function(req, res) {
    try {
        var body = req.body || {};
        var code = (body.code || '').trim().toUpperCase();
        var studentName = (body.studentName || '').trim();
        var admissionNumber = (body.admissionNumber || '').trim();
        if (!code || !studentName || !admissionNumber) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        var assessment = await getAssessmentForPresence(code);
        if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });

        var key = liveSessionKey(code, admissionNumber);
        var admissionKey = admissionNumber.toLowerCase();
        var sess = quizSessionCache[key];
        if (!sess) {
            var { data: existing } = await supabase
                .from('cleverment_quiz_sessions')
                .select('id, submitted, ends_at')
                .eq('code', code)
                .eq('admission_key', admissionKey)
                .maybeSingle();
            if (existing) sess = quizSessionCache[key] = { id: existing.id, endsAt: existing.ends_at, submitted: !!existing.submitted };
        }
        if (sess && sess.submitted) {
            sess.touched = Date.now();
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

        if (sess) {
            sess.touched = Date.now();
            pendingProgress[key] = fields;
            cmN('onProgress', sess, assessment, fields.proctor_violations, studentName);
            return res.json({ ok: true, endsAt: sess.endsAt });
        }

        var limitSeconds = Number(assessment.time_limit) || 0;
        var startedAt = new Date();
        var endsAt = limitSeconds > 0 ? new Date(startedAt.getTime() + limitSeconds * 1000) : null;
        var row = Object.assign({
            code: code,
            admission_key: admissionKey,
            started_at: startedAt.toISOString(),
            ends_at: endsAt ? endsAt.toISOString() : null,
            submitted: false
        }, fields);
        var ins = await supabase.from('cleverment_quiz_sessions').insert([row]).select('id, submitted, ends_at').single();
        if (ins.error) {
            // Two requests arrived together and the other one created the row first: use that one.
            var again = await supabase.from('cleverment_quiz_sessions').select('id, submitted, ends_at')
                .eq('code', code).eq('admission_key', admissionKey).maybeSingle();
            if (again.data) {
                quizSessionCache[key] = { id: again.data.id, endsAt: again.data.ends_at, submitted: !!again.data.submitted, touched: Date.now() };
                return res.json({ ok: true, endsAt: again.data.ends_at });
            }
            return res.status(500).json({ error: ins.error.message });
        }
        quizSessionCache[key] = { id: ins.data.id, endsAt: ins.data.ends_at, submitted: false, touched: Date.now(), lastViol: Number(fields.proctor_violations) || 0 };
        cmN('onStart', assessment, studentName);
        res.json({ ok: true, endsAt: row.ends_at });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

function formatSecondsAsClock(totalSeconds) {
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0');
}

var autoSubmitRunning = false;
async function autoSubmitExpiredSessions() {
    if (autoSubmitRunning) return;
    autoSubmitRunning = true;
    try {
        await flushPendingProgress(); // make sure the latest saved answers are in the database first
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

                var alreadyCheck = await findBlockingResults(sess.code, sess.admission_number);
                var already = alreadyCheck.rows;
                if (already && already.length > 0) {
                    await supabase.from('cleverment_quiz_sessions').update({ submitted: true }).eq('id', sess.id);
                    continue;
                }

                var limitSeconds = Number(assessment.time_limit) || 0;
                var graded = gradeSubmission(assessment, sess.answers || [], limitSeconds > 0 ? limitSeconds : null, (assessment.question_limit > 0 ? (sess.answers || []).map(function(x) { return x.originalIndex; }) : null));
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
                    var autoKey = liveSessionKey(sess.code, sess.admission_number);
                    delete pendingProgress[autoKey];
                    if (quizSessionCache[autoKey]) quizSessionCache[autoKey].submitted = true;
                    await removeSupersededResults(sess.code, sess.admission_number);
                    cmN('onSubmit', assessment, sess.student_name, sess.admission_number, graded, true);
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

// Live messages from a teacher/admin to a student who is taking an assessment.
// Held in memory like presence (transient): key -> list of messages. The
// student's browser receives them in the reply to its regular presence ping and
// confirms ("acks") them on the next ping, which is what marks them "Seen".
var liveMessageQueues = {};
var liveMessageRate = {};

function liveSessionKey(code, admissionNumber) {
    return String(code || '').trim().toUpperCase() + '|' + String(admissionNumber || '').trim().toLowerCase();
}

function pruneLiveMessages() {
    var cutoff = Date.now() - 3 * 60 * 60 * 1000;
    Object.keys(liveMessageQueues).forEach(function(key) {
        var list = liveMessageQueues[key].filter(function(m) { return new Date(m.sentAt).getTime() > cutoff; });
        if (list.length === 0) delete liveMessageQueues[key]; else liveMessageQueues[key] = list;
    });
}
setInterval(pruneLiveMessages, 10 * 60 * 1000);

function lastLiveMessageFor(key) {
    var list = liveMessageQueues[key];
    if (!list || list.length === 0) return null;
    var m = list[list.length - 1];
    return { text: m.text, sentAt: m.sentAt, seenAt: m.seenAt || null };
}

// Presence needs the assessment's details on every ping, so remember them for a minute
// instead of asking the database every few seconds for every student.
var presenceAssessmentCache = {};
async function getAssessmentForPresence(code) {
    var cached = presenceAssessmentCache[code];
    if (cached && cached.expires > Date.now()) return cached.data;
    var { data } = await supabase
        .from('cleverment_assessments')
        .select('id, code, teacher_email, subject, class_name, time_limit')
        .eq('code', code)
        .maybeSingle();
    if (data) presenceAssessmentCache[code] = { data: data, expires: Date.now() + 60 * 1000 };
    return data;
}

app.post('/api/quiz/presence', async function(req, res) {
    try {
        var code = (req.body.code || '').trim().toUpperCase();
        var studentName = (req.body.studentName || '').trim();
        var admissionNumber = (req.body.admissionNumber || '').trim();

        if (!code || !studentName || !admissionNumber) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        var assessment = await getAssessmentForPresence(code);

        if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });

        var key = code + '|' + admissionNumber.toLowerCase();
        var existing = activeSessions[key];
        activeSessions[key] = {
            code: code,
            subject: assessment.subject,
            className: assessment.class_name,
            studentName: studentName,
            admissionNumber: admissionNumber,
            startedAt: existing ? existing.startedAt : new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };

        // Messages the student's browser confirmed it has shown.
        var queue = liveMessageQueues[key] || [];
        var ackIds = Array.isArray(req.body.ackIds) ? req.body.ackIds.slice(0, 50).map(String) : [];
        if (ackIds.length && queue.length) {
            queue.forEach(function(m) {
                if (!m.seenAt && ackIds.indexOf(m.id) !== -1) m.seenAt = new Date().toISOString();
            });
        }
        // Messages still waiting to be shown.
        var pending = queue.filter(function(m) { return !m.seenAt; }).map(function(m) {
            if (!m.deliveredAt) m.deliveredAt = new Date().toISOString();
            return { id: m.id, text: m.text, from: m.from, sentAt: m.sentAt };
        });

        res.json({ ok: true, messages: pending });
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
            if (myCodes[activeSessions[k].code]) {
                live.push(Object.assign({}, activeSessions[k], { lastMessage: lastLiveMessageFor(k) }));
            }
        }
        live.sort(function(a, b) { return a.startedAt < b.startedAt ? -1 : 1; });

        res.json({ live: live });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// SEND A LIVE MESSAGE to one student, or to every student currently online.
// Shared by teachers (own assessments only) and admin (everyone).
// Body: { text, target: 'one' | 'all', code, admissionNumber }
// ------------------------------------------------------------
async function handleLiveMessage(req, res, role, senderKey, allowedCodes) {
    try {
        var body = req.body || {};
        var text = String(body.text || '').replace(/\s+/g, ' ').trim();
        if (!text) return res.status(400).json({ error: 'Please choose or write a message first.' });
        if (text.length > 300) return res.status(400).json({ error: 'The message is too long (300 characters at most).' });

        // Guard against accidental spamming.
        var nowMs = Date.now();
        var recent = (liveMessageRate[senderKey] || []).filter(function(t) { return nowMs - t < 60 * 1000; });
        if (recent.length >= 15) {
            return res.status(429).json({ error: 'You are sending messages too quickly. Please wait a moment.' });
        }

        // Forget students who have gone offline.
        var cutoff = nowMs - 60 * 1000;
        Object.keys(activeSessions).forEach(function(k) {
            if (new Date(activeSessions[k].lastSeen).getTime() < cutoff) delete activeSessions[k];
        });

        var targetKeys = [];
        if (body.target === 'all') {
            Object.keys(activeSessions).forEach(function(k) {
                if (allowedCodes && !allowedCodes[activeSessions[k].code]) return;
                targetKeys.push(k);
            });
        } else {
            var oneKey = liveSessionKey(body.code, body.admissionNumber);
            var sess = activeSessions[oneKey];
            if (sess && (!allowedCodes || allowedCodes[sess.code])) targetKeys.push(oneKey);
        }

        if (targetKeys.length === 0) {
            return res.status(404).json({ error: body.target === 'all'
                ? 'No students are taking assessments right now.'
                : 'That student is no longer online.' });
        }

        var sentAt = new Date().toISOString();
        targetKeys.forEach(function(k) {
            var list = liveMessageQueues[k] || (liveMessageQueues[k] = []);
            list.push({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                text: text,
                from: role,
                sentAt: sentAt
            });
            if (list.length > 20) list.splice(0, list.length - 20);
        });
        recent.push(nowMs);
        liveMessageRate[senderKey] = recent;

        res.json({ success: true, sent: targetKeys.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

app.post('/api/teacher/live/message', requireTeacherAuth, async function(req, res) {
    try {
        var { data: assessments } = await supabase
            .from('cleverment_assessments')
            .select('code')
            .eq('teacher_email', req.teacherEmail);
        var myCodes = {};
        (assessments || []).forEach(function(a) { myCodes[a.code] = true; });
        await handleLiveMessage(req, res, 'teacher', 'teacher:' + req.teacherEmail, myCodes);
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
            pass_mark: (body.passMark !== null && body.passMark !== undefined) ? body.passMark : 50,
            question_limit: Math.max(0, parseInt(body.questionLimit, 10) || 0),
            negative_marking: Math.max(0, Math.min(1, Number(body.negativeMarking) || 0)), access_mode: body.accessMode === 'roster' ? 'roster' : 'code'
        };

        var { data, error } = await supabase.from('cleverment_assessments').insert([payload]).select().single();
        if (error && /question_limit|negative_marking|access_mode/.test(error.message || '')) {
            // Delivery A SQL not run yet: publish without the two new settings.
            delete payload.question_limit; delete payload.negative_marking; delete payload.access_mode;
            var retryIns = await supabase.from('cleverment_assessments').insert([payload]).select().single();
            data = retryIns.data; error = retryIns.error;
        }
        if (error) return res.status(500).json({ error: error.message });
        cmN('onPublished', data, !!req.adminActingAsTeacher);
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

// ------------------------------------------------------------
// RE-GRADE existing results after the teacher fixes an answer key.
// Questions are matched by their text (so deleting or adding other questions does not confuse it).
// A student's chosen option is recognised from the text they picked, using the OLD options.
// ------------------------------------------------------------
function cbNorm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }

function pairChangedKeys(oldQs, newQs) {
    var used = {};
    var pairs = [];
    (newQs || []).forEach(function(nq, j) {
        var oi = -1;
        for (var i = 0; i < oldQs.length; i++) {
            if (!used[i] && cbNorm(oldQs[i].question) === cbNorm(nq.question)) { oi = i; break; }
        }
        if (oi === -1 && oldQs[j] && !used[j]) {
            var textStillExists = (newQs || []).some(function(x) { return cbNorm(x.question) === cbNorm(oldQs[j].question); });
            if (!textStillExists) oi = j; // the question's wording was edited in place
        }
        if (oi === -1) return;
        used[oi] = true;
        var oldKey = letterToIndex(oldQs[oi].correctAnswer);
        var newKey = letterToIndex(nq.correctAnswer);
        if (oldKey !== -1 && newKey !== -1 && oldKey !== newKey) pairs.push({ oldQ: oldQs[oi], newQ: nq, newKey: newKey });
    });
    return pairs;
}

async function regradeResults(code, teacherEmail, rules) {
    var { data: rows, error } = await supabase
        .from('cleverment_results')
        .select('id, answers, score, total_questions, correct_answers')
        .eq('assessment_code', code)
        .eq('teacher_email', teacherEmail)
        .limit(5000);
    if (error) throw new Error(error.message);
    var updated = 0, scoreChanged = 0;
    for (var r = 0; r < (rows || []).length; r++) {
        var row = rows[r];
        var answers = Array.isArray(row.answers) ? row.answers : null;
        if (!answers || answers.length === 0) continue;
        var touched = false;
        rules.forEach(function(rule) {
            var entry = null;
            for (var k = 0; k < answers.length; k++) {
                if (cbNorm(answers[k].question) === cbNorm(rule.oldQuestionText)) { entry = answers[k]; break; }
            }
            if (!entry) return;
            if (rule.credit) {
                if (!entry.isCorrect) { entry.isCorrect = true; touched = true; }
                entry.credited = true;
                return;
            }
            var chosen = String(entry.userAnswerText || '');
            var wasCorrect = !!entry.isCorrect;
            var nowCorrect = false;
            if (chosen !== '') {
                var chosenIdx = (rule.oldOptions || []).indexOf(chosen);
                if (chosenIdx === -1) return; // cannot tell which option they picked - leave it alone
                nowCorrect = chosenIdx === rule.newKey;
            }
            entry.isCorrect = nowCorrect;
            entry.correctAnswerText = rule.newCorrectText;
            if (wasCorrect !== nowCorrect) touched = true;
        });
        if (!touched) continue;
        var total = answers.length;
        var correct = answers.filter(function(a) { return a.isCorrect; }).length;
        var score = total > 0 ? Math.round((correct / total) * 100) : 0;
        var up = await supabase.from('cleverment_results')
            .update({ answers: answers, correct_answers: correct, score: score })
            .eq('id', row.id);
        if (!up.error) {
            updated++;
            if (score !== row.score) scoreChanged++;
        }
    }
    return { checked: (rows || []).length, updated: updated, scoreChanged: scoreChanged };
}

// Credit every student for one question (for example a question that was wrong or unclear).
app.post('/api/teacher/assessments/:id/credit-question', requireTeacherAuth, async function(req, res) {
    try {
        var questionText = cbNorm(req.body && req.body.question);
        if (!questionText) return res.status(400).json({ error: 'Which question? Please save the assessment first, then try again.' });
        var { data: a, error } = await supabase
            .from('cleverment_assessments')
            .select('id, code, teacher_email, questions')
            .eq('id', req.params.id)
            .maybeSingle();
        if (error) return res.status(500).json({ error: error.message });
        if (!a || a.teacher_email !== req.teacherEmail) return res.status(403).json({ error: 'Not authorized to change this assessment.' });
        var exists = (a.questions || []).some(function(q) { return cbNorm(q.question) === questionText; });
        if (!exists) return res.status(400).json({ error: 'That question is not in the saved assessment. Save your changes first, then give credit.' });
        var out = await regradeResults(a.code, req.teacherEmail, [{ oldQuestionText: questionText, credit: true }]);
        res.json({ success: true, regrade: out });
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

    if (body.questionLimit !== undefined) update.question_limit = Math.max(0, Math.min(1000, parseInt(body.questionLimit, 10) || 0));
    if (body.negativeMarking !== undefined) update.negative_marking = Math.max(0, Math.min(1, Number(body.negativeMarking) || 0));

    if (Object.keys(update).length === 0) return { error: 'Nothing to update.' };
    return { update: update };
}

app.put('/api/teacher/assessments/:id', requireTeacherAuth, async function(req, res) {
    try {
        var id = req.params.id;
        var body = req.body || {};

        var built = buildAssessmentUpdate(body);
        if (built.error) return res.status(400).json({ error: built.error });
        assessmentRowCache = {};
        presenceAssessmentCache = {};

        // Only the teacher who owns the assessment may edit it.
        var { data: existing, error: fetchError } = await supabase
            .from('cleverment_assessments')
            .select('id, teacher_email, code, questions, show_results, subject')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) return res.status(500).json({ error: fetchError.message });
        if (!existing || existing.teacher_email !== req.teacherEmail) {
            return res.status(403).json({ error: 'Not authorized to edit this assessment.' });
        }

        // The assessment code never changes, so the code students already
        // have keeps working.
        async function runAssessmentUpdate() {
            return await supabase.from('cleverment_assessments').update(built.update).eq('id', id).eq('teacher_email', req.teacherEmail).select().single();
        }
        var updated = await runAssessmentUpdate();
        if (updated.error && /question_limit|negative_marking/.test(updated.error.message || '')) {
            delete built.update.question_limit; delete built.update.negative_marking;
            if (Object.keys(built.update).length > 0) updated = await runAssessmentUpdate();
        }
        var data = updated.data, error = updated.error;

        if (error) return res.status(500).json({ error: error.message });

        // Alerts: results released to students, and the admin's activity summary.
        if (existing.show_results === false && data && data.show_results !== false) cmN('onResultsReleased', data);
        if (!req.adminActingAsTeacher) cmN('onTeacherDo', 'edit', req.teacherEmail, (existing.subject || 'Assessment') + ' (' + existing.code + ')');

        // Optional: re-grade results that were already submitted, for every question whose correct answer changed.
        var regradeSummary = null;
        if (body.regrade === true && Array.isArray(body.questions)) {
            try {
                var oldQs = Array.isArray(existing.questions) ? existing.questions : [];
                var rules = pairChangedKeys(oldQs, body.questions).map(function(p) {
                    return {
                        oldQuestionText: p.oldQ.question,
                        oldOptions: p.oldQ.options || [],
                        newKey: p.newKey,
                        newCorrectText: (p.newQ.options || [])[p.newKey] || ''
                    };
                });
                if (rules.length > 0) {
                    regradeSummary = await regradeResults(existing.code, req.teacherEmail, rules);
                    regradeSummary.questionsChanged = rules.length;
                }
            } catch (re) {
                regradeSummary = { error: re.message };
            }
        }
        res.json({ assessment: data, regrade: regradeSummary });
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

// Delete several of the teacher's own published assessments at once. Body: { ids: [..] }
app.post('/api/teacher/assessments/bulk-delete', requireTeacherAuth, async function(req, res) {
    assessmentRowCache = {};
    presenceAssessmentCache = {};
    try {
        var ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.filter(function(x) { return x !== null && x !== undefined && x !== ''; }) : [];
        if (!ids.length) return res.status(400).json({ error: 'Select at least one assessment.' });
        if (ids.length > 500) return res.status(400).json({ error: 'Too many selected at once.' });
        var del = await supabase.from('cleverment_assessments').delete().in('id', ids).eq('teacher_email', req.teacherEmail).select('id');
        if (del.error) return res.status(500).json({ error: del.error.message });
        if (!req.adminActingAsTeacher && (del.data || []).length) cmN('onTeacherDo', 'delete', req.teacherEmail, (del.data || []).length + ' assessments');
        res.json({ success: true, deleted: (del.data || []).length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/teacher/assessments/:id', requireTeacherAuth, async function(req, res) {
    assessmentRowCache = {};
    presenceAssessmentCache = {};
    try {
        var { data: existing } = await supabase
            .from('cleverment_assessments')
            .select('id, teacher_email, subject, code')
            .eq('id', req.params.id)
            .maybeSingle();
        if (!existing || existing.teacher_email !== req.teacherEmail) {
            return res.status(403).json({ error: 'Not authorized to delete this assessment.' });
        }
        var { error } = await supabase.from('cleverment_assessments').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        if (!req.adminActingAsTeacher) cmN('onTeacherDo', 'delete', req.teacherEmail, (existing.subject || 'Assessment') + ' (' + existing.code + ')');
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

// ------------------------------------------------------------
// STUDENT PICTURES (class roster photos)
// Kept in their own private table (see supabase_update3.sql), NOT in the public roster data.
// Teachers manage them here; a student only receives their own picture, after the roster check passes.
// ------------------------------------------------------------
var PHOTO_MAX_CHARS = 200000; // about 150 KB of image data per student
var PHOTO_RE = /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+\/=]+$/;

function photoAdmissionKey(a) { return String(a || '').trim().toLowerCase(); }

async function getStudentPhoto(teacherEmail, className, admissionNumber) {
    try {
        var { data, error } = await supabase
            .from('cleverment_student_photos')
            .select('photo')
            .eq('teacher_email', teacherEmail)
            .eq('class_name', className)
            .eq('admission_key', photoAdmissionKey(admissionNumber))
            .maybeSingle();
        if (error || !data) return '';
        return data.photo || '';
    } catch (e) {
        return '';
    }
}

app.get('/api/teacher/roster-photos', requireTeacherAuth, async function(req, res) {
    try {
        var className = String(req.query.className || '').trim();
        if (!className) return res.status(400).json({ error: 'Choose a class first.' });
        var { data, error } = await supabase
            .from('cleverment_student_photos')
            .select('admission_key, photo')
            .eq('teacher_email', req.teacherEmail)
            .eq('class_name', className)
            .limit(1000);
        if (error) return res.json({ photos: {}, setupNeeded: true });
        var photos = {};
        (data || []).forEach(function(r) { photos[r.admission_key] = r.photo; });
        res.json({ photos: photos });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Body: { className, photos: [ { admissionNumber, photo } ] }  (an empty photo removes that student's picture)
app.put('/api/teacher/roster-photos', requireTeacherAuth, async function(req, res) {
    try {
        var body = req.body || {};
        var className = String(body.className || '').trim();
        var list = Array.isArray(body.photos) ? body.photos : [];
        if (!className) return res.status(400).json({ error: 'Choose a class first.' });
        if (list.length === 0) return res.status(400).json({ error: 'No pictures were sent.' });
        if (list.length > 60) return res.status(400).json({ error: 'Too many pictures at once. Please send up to 60 at a time.' });

        var upserts = [], removals = [];
        for (var i = 0; i < list.length; i++) {
            var key = photoAdmissionKey(list[i] && list[i].admissionNumber);
            if (!key) continue;
            var photo = String((list[i] && list[i].photo) || '');
            if (photo === '') { removals.push(key); continue; }
            if (!PHOTO_RE.test(photo)) return res.status(400).json({ error: 'One of the pictures is not a valid image (use JPG, PNG or WEBP).' });
            if (photo.length > PHOTO_MAX_CHARS) return res.status(400).json({ error: 'One of the pictures is too large. Please use a smaller photo.' });
            upserts.push({
                teacher_email: req.teacherEmail,
                class_name: className,
                admission_key: key,
                photo: photo,
                updated_at: new Date().toISOString()
            });
        }
        if (upserts.length) {
            var up = await supabase.from('cleverment_student_photos').upsert(upserts, { onConflict: 'teacher_email,class_name,admission_key' });
            if (up.error) {
                return res.status(500).json({ error: 'Could not save the pictures. Please run supabase_update3.sql in Supabase first. (' + up.error.message + ')' });
            }
        }
        if (removals.length) {
            var del = await supabase.from('cleverment_student_photos').delete()
                .eq('teacher_email', req.teacherEmail).eq('class_name', className).in('admission_key', removals);
            if (del.error) return res.status(500).json({ error: del.error.message });
        }
        res.json({ success: true, saved: upserts.length, removed: removals.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// PROFILE PICTURES: a teacher's own picture, and a student changing their own picture.
// Teacher picture needs the photo column (see supabase_teacher_photo.sql).
// A student's picture is saved in the same private table the class roster pictures use.
// ------------------------------------------------------------
app.get('/api/teacher/photo', requireTeacherAuth, async function(req, res) {
    try {
        var r = await supabase.from('cleverment_teachers').select('photo').eq('email', req.teacherEmail).maybeSingle();
        if (r.error) return res.json({ photo: '', setupNeeded: true });
        res.json({ photo: (r.data && r.data.photo) || '' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/teacher/photo', requireTeacherAuth, async function(req, res) {
    try {
        var photo = String((req.body && req.body.photo) || '');
        if (photo !== '') {
            if (!PHOTO_RE.test(photo)) return res.status(400).json({ error: 'Please choose a JPG, PNG or WEBP picture.' });
            if (photo.length > PHOTO_MAX_CHARS) return res.status(400).json({ error: 'That picture is too large. Please use a smaller photo.' });
        }
        var r = await supabase.from('cleverment_teachers').update({ photo: photo }).eq('email', req.teacherEmail);
        if (r.error) return res.status(500).json({ error: 'Could not save the picture. Please run supabase_teacher_photo.sql in Supabase first.' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/student/photo', requireStudentAuth, async function(req, res) {
    try {
        var s = req.student;
        var photo = String((req.body && req.body.photo) || '');
        var key = photoAdmissionKey(s.admissionNumber);
        if (photo === '') {
            var del = await supabase.from('cleverment_student_photos').delete()
                .eq('teacher_email', s.email).eq('class_name', s.className).eq('admission_key', key);
            if (del.error) return res.status(500).json({ error: del.error.message });
            return res.json({ success: true, photo: '' });
        }
        if (!PHOTO_RE.test(photo)) return res.status(400).json({ error: 'Please choose a JPG, PNG or WEBP picture.' });
        if (photo.length > PHOTO_MAX_CHARS) return res.status(400).json({ error: 'That picture is too large. Please use a smaller photo.' });
        var up = await supabase.from('cleverment_student_photos').upsert([{
            teacher_email: s.email,
            class_name: s.className,
            admission_key: key,
            photo: photo,
            updated_at: new Date().toISOString()
        }], { onConflict: 'teacher_email,class_name,admission_key' });
        if (up.error) return res.status(500).json({ error: 'Could not save your picture. Please try again.' });
        res.json({ success: true, photo: photo });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------
// TEACHER "LAST ACTIVE" + STUDENT QUESTION FLAGS
// ------------------------------------------------------------
var lastActiveWritten = {};
app.post('/api/teacher/ping', requireTeacherAuth, async function(req, res) {
    try {
        // An admin working inside a teacher's workspace must not count as that teacher being active.
        if (req.headers['x-cleverment-act-as-teacher']) return res.json({ ok: true });
        var last = lastActiveWritten[req.teacherEmail] || 0;
        if (Date.now() - last > 10 * 60 * 1000) {
            lastActiveWritten[req.teacherEmail] = Date.now();
            await supabase.from('cleverment_teachers').update({ last_active_at: new Date().toISOString() }).eq('email', req.teacherEmail);
        }
        res.json({ ok: true });
    } catch (e) { res.json({ ok: true }); }
});

var FLAG_CATEGORIES = ['incomplete', 'no_correct', 'multiple_correct', 'typo', 'missing_media', 'symbols', 'out_of_syllabus', 'duplicate', 'other'];
const flagLimiter = rateLimit({ keyGenerator: clientIp, validate: false, windowMs: 60 * 1000, max: 40, message: { error: 'Too many reports. Please wait a moment.' } });

// A student reports a problem with one question. One flag per student per question (sending again updates it).
app.post('/api/quiz/flag', flagLimiter, async function(req, res) {
    try {
        var body = req.body || {};
        var code = String(body.code || '').trim().toUpperCase();
        var studentName = String(body.studentName || '').trim().slice(0, 120);
        var admissionNumber = String(body.admissionNumber || '').trim().slice(0, 60);
        var category = String(body.category || '');
        var qIndex = parseInt(body.questionIndex, 10);
        var note = String(body.note || '').replace(/\s+/g, ' ').trim().slice(0, 150);
        if (!code || !studentName || !admissionNumber) return res.status(400).json({ error: 'Missing details.' });
        if (FLAG_CATEGORIES.indexOf(category) === -1) return res.status(400).json({ error: 'Please choose a reason.' });

        var { data: assessment } = await getAssessmentRowCached(code);
        if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
        var questions = assessment.questions || [];
        if (isNaN(qIndex) || qIndex < 0 || qIndex >= questions.length) return res.status(400).json({ error: 'That question does not exist.' });

        // Only a student who has actually started this assessment can flag its questions.
        var key = liveSessionKey(code, admissionNumber);
        if (!activeSessions[key] && !quizSessionCache[key]) {
            return res.status(403).json({ error: 'Please start the assessment before reporting a question.' });
        }

        var row = {
            assessment_code: code,
            question_index: qIndex,
            question_text: String(questions[qIndex].question || '').slice(0, 600),
            student_name: studentName,
            admission_number: admissionNumber,
            admission_key: admissionNumber.toLowerCase(),
            category: category,
            note: note,
            resolved: false
        };
        var up = await supabase.from('cleverment_question_flags').upsert([row], { onConflict: 'assessment_code,admission_key,question_index' });
        if (up.error) return res.status(500).json({ error: 'Could not save your report right now. Please try again.' });
        cmN('onQuestionReport', assessment, studentName);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Could not save your report right now. Please try again.' });
    }
});

async function teacherOwnsAssessmentCode(teacherEmail, code) {
    var r = await supabase.from('cleverment_assessments').select('code').eq('code', code).eq('teacher_email', teacherEmail).maybeSingle();
    return !!(r && r.data);
}

app.get('/api/teacher/assessments/:code/flags', requireTeacherAuth, async function(req, res) {
    try {
        var code = String(req.params.code || '').trim().toUpperCase();
        if (!(await teacherOwnsAssessmentCode(req.teacherEmail, code))) return res.status(403).json({ error: 'Not authorized for this assessment.' });
        var r = await supabase.from('cleverment_question_flags')
            .select('question_index, question_text, student_name, admission_number, category, note, resolved, created_at')
            .eq('assessment_code', code).order('created_at', { ascending: true }).limit(5000);
        if (r.error) return res.json({ flags: [], setupNeeded: true });
        res.json({ flags: r.data || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/teacher/assessments/:code/flags/resolve', requireTeacherAuth, async function(req, res) {
    try {
        var code = String(req.params.code || '').trim().toUpperCase();
        if (!(await teacherOwnsAssessmentCode(req.teacherEmail, code))) return res.status(403).json({ error: 'Not authorized for this assessment.' });
        var qIndex = parseInt(req.body && req.body.questionIndex, 10);
        if (isNaN(qIndex)) return res.status(400).json({ error: 'Which question?' });
        var resolved = !(req.body && req.body.resolved === false);
        var up = await supabase.from('cleverment_question_flags').update({ resolved: resolved }).eq('assessment_code', code).eq('question_index', qIndex);
        if (up.error) return res.status(500).json({ error: up.error.message });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ------------------------------------------------------------
// DATABASE PROXY: the website no longer talks to the database directly.
// Every query goes through here, where the server checks WHO is asking and limits what they may see or change.
// ------------------------------------------------------------
var DB_METHODS = { select: 1, insert: 1, update: 1, delete: 1, upsert: 1, eq: 1, neq: 1, gt: 1, gte: 1, lt: 1, lte: 1, like: 1, ilike: 1, 'in': 1, is: 1, order: 1, limit: 1, range: 1, single: 1, maybeSingle: 1 };
var DB_VERBS = { select: 1, insert: 1, update: 1, delete: 1, upsert: 1 };
var DB_TABLES = {
    cleverment_results:          { scoped: true, writes: false },
    cleverment_rosters:          { scoped: true, writes: true },
    cleverment_question_banks:   { scoped: true, writes: true },
    cleverment_csv_history:      { scoped: true, writes: true },
    cleverment_teacher_activity: { scoped: true, writes: true, insertOnly: true },
    cleverment_faqs:             { publicRead: true, adminWrite: true },
    cleverment_settings:         { publicReadKeys: ['reactivation_fee'], adminWrite: true }
};
const dbLimiter = rateLimit({ keyGenerator: clientIp, validate: false, windowMs: 60 * 1000, max: 600, message: { error: 'Too many requests. Please wait a moment.' } });

async function dbResolveAuth(req) {
    var header = req.headers.authorization || '';
    var token = header.indexOf('Bearer ') === 0 ? header.slice(7) : null;
    if (!token) return null;
    var d;
    try { d = jwt.verify(token, JWT_SECRET); } catch (e) { return { invalid: true }; }
    if (d.role === 'teacher') return { role: 'teacher', email: d.email };
    if (d.role === 'admin') {
        var act = String(req.headers['x-cleverment-act-as-teacher'] || '').trim().toLowerCase();
        if (!act) return { role: 'admin' };
        var lookup = await supabase.from('cleverment_teachers').select('email').ilike('email', act).maybeSingle();
        if (lookup.error || !lookup.data) return { invalid: true };
        return { role: 'admin', actAs: lookup.data.email };
    }
    return { invalid: true };
}

app.post('/api/db/query', dbLimiter, async function(req, res) {
    try {
        var body = req.body || {};
        var table = String(body.table || '');
        var policy = DB_TABLES[table];
        var ops = Array.isArray(body.ops) ? body.ops : null;
        if (!policy) return res.status(403).json({ error: 'Not allowed.' });
        if (!ops || ops.length === 0 || ops.length > 20) return res.status(400).json({ error: 'Bad request.' });
        for (var i = 0; i < ops.length; i++) {
            if (!ops[i] || !DB_METHODS[ops[i].m] || !Array.isArray(ops[i].a)) return res.status(400).json({ error: 'Bad request.' });
        }
        var verb = ops[0].m;
        if (!DB_VERBS[verb]) return res.status(400).json({ error: 'Bad request.' });
        var isWrite = verb !== 'select';

        var auth = await dbResolveAuth(req);
        if (auth && auth.invalid) return res.status(401).json({ error: 'Session expired. Please log in again.' });
        var isAdmin = !!(auth && auth.role === 'admin');

        // ---- who may do what ----
        if (isWrite) {
            if (!policy.writes && !policy.adminWrite) return res.status(403).json({ error: 'Not allowed.' });
            if (policy.adminWrite && !isAdmin) return res.status(403).json({ error: 'Only the admin can change this.' });
            if (policy.writes && !auth) return res.status(401).json({ error: 'Please log in.' });
            if (policy.insertOnly && verb !== 'insert') return res.status(403).json({ error: 'Not allowed.' });
        } else if (policy.scoped && !auth) {
            return res.status(401).json({ error: 'Please log in.' });
        } else if (policy.publicReadKeys && !isAdmin) {
            var keyOk = ops.some(function(o) { return o.m === 'eq' && o.a[0] === 'key' && policy.publicReadKeys.indexOf(o.a[1]) !== -1; });
            if (!keyOk) return res.status(403).json({ error: 'Not allowed.' });
        }

        // A teacher (or an admin working inside a teacher's workspace) only ever sees that teacher's own rows.
        var scopeEmail = null;
        if (policy.scoped && auth) scopeEmail = auth.role === 'teacher' ? auth.email : (auth.actAs || null);

        var q = supabase.from(table);
        for (var j = 0; j < ops.length; j++) {
            var op = ops[j];
            var args = op.a.slice();
            if (scopeEmail && j === 0) {
                if (verb === 'insert' || verb === 'upsert') {
                    var rows = Array.isArray(args[0]) ? args[0] : [args[0]];
                    args[0] = rows.map(function(r) { return Object.assign({}, r, { teacher_email: scopeEmail }); });
                } else if (verb === 'update' && args[0] && typeof args[0] === 'object') {
                    args[0] = Object.assign({}, args[0]);
                    delete args[0].teacher_email; // cannot hand a row to someone else
                }
            }
            q = q[op.m].apply(q, args);
            if (scopeEmail && j === 0 && (verb === 'select' || verb === 'update' || verb === 'delete')) q = q.eq('teacher_email', scopeEmail);
        }
        var result = await q;
        res.json({ data: result.data === undefined ? null : result.data, error: result.error ? { message: result.error.message, code: result.error.code } : null });
    } catch (e) {
        res.status(500).json({ error: 'Request failed.' });
    }
});

// ------------------------------------------------------------
// ADMIN TWO-STEP LOGIN (authenticator app) + SECURITY STATUS
// ------------------------------------------------------------
var ADMIN_TOTP_SECRET = String(process.env.ADMIN_TOTP_SECRET || '').replace(/[\s=-]/g, '').toUpperCase();
var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(str) {
    var bits = '', out = [];
    str.split('').forEach(function(ch) { var v = B32.indexOf(ch); if (v >= 0) bits += v.toString(2).padStart(5, '0'); });
    for (var i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.substr(i, 8), 2));
    return Buffer.from(out);
}
function base32Encode(buf) {
    var bits = '', out = '';
    for (var i = 0; i < buf.length; i++) bits += buf[i].toString(2).padStart(8, '0');
    for (var j = 0; j + 5 <= bits.length; j += 5) out += B32[parseInt(bits.substr(j, 5), 2)];
    return out;
}
function hotp(secretBuf, counter) {
    var msg = Buffer.alloc(8);
    msg.writeUInt32BE(Math.floor(counter / 4294967296), 0);
    msg.writeUInt32BE(counter % 4294967296, 4);
    var hmac = crypto.createHmac('sha1', secretBuf).update(msg).digest();
    var off = hmac[hmac.length - 1] & 0xf;
    var code = (((hmac[off] & 0x7f) << 24) | (hmac[off + 1] << 16) | (hmac[off + 2] << 8) | hmac[off + 3]) % 1000000;
    return String(code).padStart(6, '0');
}
var lastTotpStep = 0;
function totpVerify(secretB32, token) {
    var secret = base32Decode(secretB32);
    var step = Math.floor(Date.now() / 30000);
    for (var d = -1; d <= 1; d++) {
        if (step + d <= lastTotpStep) continue; // a code can be used only once
        var expected = Buffer.from(hotp(secret, step + d));
        var given = Buffer.from(String(token));
        if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) { lastTotpStep = step + d; return true; }
    }
    return false;
}
// 'ok' | 'bad' | 'needcode'
function adminCredentialState(body) {
    if (!adminPasswordMatches(body && body.password)) return 'bad';
    if (!ADMIN_TOTP_SECRET) return 'ok';
    var code = String((body && body.code) || '').replace(/\s/g, '');
    if (!code) return 'needcode';
    return totpVerify(ADMIN_TOTP_SECRET, code) ? 'ok' : 'bad';
}

app.get('/api/admin/security', requireAdminAuth, async function(req, res) {
    var out = {
        totpEnabled: !!ADMIN_TOTP_SECRET,
        setup: null,
        weakPassword: String(ADMIN_PASSWORD || '').length < 12,
        exposure: { configured: false, tables: [] }
    };
    if (!ADMIN_TOTP_SECRET) {
        var secret = base32Encode(crypto.randomBytes(20));
        out.setup = { secret: secret, uri: 'otpauth://totp/CleverMent:Admin?secret=' + secret + '&issuer=CleverMent' };
    }
    // Can the PUBLIC key still read the database? (needs SUPABASE_ANON_KEY set in Render to run this check)
    var anon = process.env.SUPABASE_ANON_KEY;
    if (anon && typeof fetch === 'function') {
        out.exposure.configured = true;
        var tables = ['cleverment_results', 'cleverment_teachers', 'cleverment_assessments', 'cleverment_rosters', 'cleverment_question_banks'];
        for (var i = 0; i < tables.length; i++) {
            var status = 'error';
            try {
                var r = await fetch(SUPABASE_URL + '/rest/v1/' + tables[i] + '?select=*&limit=1', { headers: { apikey: anon, Authorization: 'Bearer ' + anon } });
                if (r.status === 401 || r.status === 403 || r.status === 404) status = 'protected';
                else if (r.ok) { var rows = await r.json(); status = (Array.isArray(rows) && rows.length > 0) ? 'exposed' : 'protected'; }
            } catch (e) {}
            out.exposure.tables.push({ table: tables[i], status: status });
        }
    }
    res.json(out);
});

// ------------------------------------------------------------
// AUTOMATIC BACKUPS (private Supabase Storage) + OLD-DATA CLEANUP
// ------------------------------------------------------------
var zlib = require('zlib');
var BACKUP_BUCKET = 'cleverment-backups';
var BACKUP_TABLES = ['cleverment_teachers', 'cleverment_assessments', 'cleverment_results', 'cleverment_rosters', 'cleverment_question_banks', 'cleverment_csv_history', 'cleverment_faqs', 'cleverment_settings', 'cleverment_teacher_activity', 'cleverment_question_flags'];

async function ensureBackupBucket() {
    try { await supabase.storage.createBucket(BACKUP_BUCKET, { public: false }); } catch (e) { /* already exists */ }
}
async function dumpTable(table) {
    var rows = [], from = 0;
    for (;;) {
        var r = await supabase.from(table).select('*').range(from, from + 999);
        if (r.error) return { rows: rows, error: r.error.message };
        rows = rows.concat(r.data || []);
        if (!r.data || r.data.length < 1000 || from > 200000) break;
        from += 1000;
    }
    return { rows: rows };
}
async function listBackups() {
    var r = await supabase.storage.from(BACKUP_BUCKET).list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
    if (r.error) return [];
    return (r.data || []).filter(function(f) { return /^backup-/.test(f.name); })
        .map(function(f) { return { name: f.name, size: (f.metadata && f.metadata.size) || 0, created_at: f.created_at || null }; })
        .sort(function(a, b) { return a.name < b.name ? 1 : -1; });
}
async function runBackup() {
    await ensureBackupBucket();
    var out = { created_at: new Date().toISOString(), tables: {}, errors: {} };
    var counts = {};
    for (var i = 0; i < BACKUP_TABLES.length; i++) {
        var d = await dumpTable(BACKUP_TABLES[i]);
        out.tables[BACKUP_TABLES[i]] = d.rows;
        counts[BACKUP_TABLES[i]] = d.rows.length;
        if (d.error) out.errors[BACKUP_TABLES[i]] = d.error;
    }
    var buf = zlib.gzipSync(Buffer.from(JSON.stringify(out)));
    var name = 'backup-' + out.created_at.slice(0, 16).replace(/[:T]/g, '-') + '.json.gz';
    var up = await supabase.storage.from(BACKUP_BUCKET).upload(name, buf, { contentType: 'application/gzip', upsert: true });
    if (up.error) throw new Error(up.error.message);
    var old = (await listBackups()).slice(8).map(function(f) { return f.name; }); // keep the newest 8
    if (old.length) await supabase.storage.from(BACKUP_BUCKET).remove(old);
    return { name: name, size: buf.length, counts: counts, errors: out.errors };
}
async function runCleanup() {
    function cutoff(days) { return new Date(Date.now() - days * 86400000).toISOString(); }
    try { await supabase.from('cleverment_quiz_sessions').delete().lt('updated_at', cutoff(30)); } catch (e) {}
    try { await supabase.from('cleverment_teacher_activity').delete().lt('created_at', cutoff(180)); } catch (e) {}
    var cols = ['created_at', 'timestamp'];
    for (var i = 0; i < cols.length; i++) {
        try { var r = await supabase.from('cleverment_access_logs').delete().lt(cols[i], cutoff(90)); if (!r.error) break; } catch (e) {}
    }
}
async function maybeAutoBackup() {
    try {
        await ensureBackupBucket();
        var list = await listBackups();
        var m = list[0] && list[0].name.match(/^backup-(\d{4})-(\d\d)-(\d\d)-(\d\d)-(\d\d)/);
        var last = m ? Date.parse(m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':00Z') : 0;
        if (Date.now() - last > 7 * 24 * 3600 * 1000) await runBackup();
        await runCleanup();
    } catch (e) { console.error('Auto backup/cleanup problem:', e.message); }
}
setTimeout(maybeAutoBackup, 2 * 60 * 1000);
setInterval(maybeAutoBackup, 12 * 3600 * 1000);

app.get('/api/admin/backups', requireAdminAuth, async function(req, res) {
    try { res.json({ backups: await listBackups() }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/backups/run', requireAdminAuth, async function(req, res) {
    try { res.json({ success: true, backup: await runBackup() }); } catch (e) { res.status(500).json({ error: 'Backup failed: ' + e.message }); }
});
app.get('/api/admin/backups/url', requireAdminAuth, async function(req, res) {
    try {
        var name = String(req.query.name || '');
        if (!/^backup-[0-9-]+\.json\.gz$/.test(name)) return res.status(400).json({ error: 'Bad name.' });
        var r = await supabase.storage.from(BACKUP_BUCKET).createSignedUrl(name, 300);
        if (r.error) return res.status(500).json({ error: r.error.message });
        res.json({ url: r.data.signedUrl });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Students typing their name get matching roster names (name + admission number) to tap.
// Only the few matches for what was typed are sent, never the whole roster.
const rosterSuggestLimiter = rateLimit({ keyGenerator: clientIp, validate: false, windowMs: 60 * 1000, max: 120, message: { error: 'Too many requests.' } });
app.get('/api/quiz/roster-suggest', rosterSuggestLimiter, async function(req, res) {
    try {
        var code = String(req.query.code || '').trim().toUpperCase();
        var q = String(req.query.q || '').trim().toLowerCase();
        if (!code || q.length < 2) return res.json({ matches: [] });
        var { data: assessment } = await getAssessmentRowCached(code);
        if (!assessment) return res.json({ matches: [] });
        var { data: row } = await supabase.from('cleverment_rosters').select('student_names')
            .eq('teacher_email', assessment.teacher_email).eq('class_name', assessment.class_name).maybeSingle();
        var list = (row && Array.isArray(row.student_names)) ? row.student_names : [];
        var matches = list.filter(function(e) { return e && typeof e === 'object' && e.admissionNumber && e.name && String(e.name).toLowerCase().indexOf(q) !== -1; })
            .sort(function(a, b) {
                var as = String(a.name).toLowerCase().indexOf(q) === 0 ? 0 : 1, bs = String(b.name).toLowerCase().indexOf(q) === 0 ? 0 : 1;
                return as - bs || String(a.name).localeCompare(String(b.name));
            })
            .slice(0, 5)
            .map(function(e) { return { name: String(e.name), admissionNumber: String(e.admissionNumber) }; });
        res.json({ matches: matches });
    } catch (e) { res.json({ matches: [] }); }
});

// ------------------------------------------------------------
// SCHOOLS: branding, school admins, teachers in a school
// Roles inside a school (stored on the teacher): 'admin' manages everything in the school,
// 'head' can view school results, 'teacher' is a normal member. Teachers with no school are independent.
// ------------------------------------------------------------
var SCHOOL_LOGO_RE = /^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+\/=]+$/;
function cleanColor(c, fallback) { return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c) : fallback; }
function cleanSlug(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
function schoolPublic(r) {
    if (!r) return null;
    return { id: r.id, name: r.name, slug: r.slug, logo: r.logo || '', primaryColor: r.primary_color || '#2d6cdf', accentColor: r.accent_color || '#C9A84C' };
}
function validLogo(logo) { return !logo || (SCHOOL_LOGO_RE.test(logo) && logo.length <= 300000); }

async function getTeacherSchool(email) {
    var t = await supabase.from('cleverment_teachers').select('id, name, email, school_id, school_role').ilike('email', String(email || '')).maybeSingle();
    if (t.error || !t.data || !t.data.school_id) return { teacher: t.data || null, school: null };
    var sc = await supabase.from('cleverment_schools').select('*').eq('id', t.data.school_id).maybeSingle();
    return { teacher: t.data, school: (sc.data && sc.data.active !== false) ? sc.data : null };
}

async function addTeacherToSchool(schoolId, p) {
    var email = String(p.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' };
    var role = ['admin', 'head', 'teacher'].indexOf(p.role) !== -1 ? p.role : 'teacher';
    var found = await supabase.from('cleverment_teachers').select('id, name, email, school_id').ilike('email', email).maybeSingle();
    if (found.data) {
        if (found.data.school_id && Number(found.data.school_id) !== Number(schoolId)) return { error: 'That teacher already belongs to another school.' };
        var up = await supabase.from('cleverment_teachers').update({ school_id: schoolId, school_role: role }).eq('id', found.data.id);
        if (up.error) return { error: 'Could not add the teacher. Please run supabase_schools.sql in Supabase first.' };
        return { created: false, name: found.data.name, email: found.data.email, role: role };
    }
    var name = String(p.name || '').trim(), password = String(p.password || '');
    if (!name || password.length < 8) return { error: 'This email has no CleverMent account yet. Enter the teacher\'s name and a password of at least 8 characters to create one.' };
    var ins = await supabase.from('cleverment_teachers').insert([{ name: name, email: email, password_hash: bcrypt.hashSync(password, 10), school_id: schoolId, school_role: role }]).select('id').single();
    if (ins.error) return { error: 'Could not create the account: ' + ins.error.message };
    return { created: true, name: name, email: email, role: role };
}

// ----- public -----
app.get('/api/school/public', async function(req, res) {
    try {
        var slug = cleanSlug(req.query.slug);
        if (!slug) return res.json({ school: null });
        var r = await supabase.from('cleverment_schools').select('*').eq('slug', slug).maybeSingle();
        res.json({ school: (r.data && r.data.active !== false) ? schoolPublic(r.data) : null });
    } catch (e) { res.json({ school: null }); }
});
app.get('/api/school/for-assessment', async function(req, res) {
    try {
        var code = String(req.query.code || '').trim().toUpperCase();
        var { data: a } = await getAssessmentRowCached(code);
        if (!a) return res.json({ school: null });
        var ctx = await getTeacherSchool(a.teacher_email);
        res.json({ school: schoolPublic(ctx.school) });
    } catch (e) { res.json({ school: null }); }
});

// ----- signed-in teacher -----
app.get('/api/school/me', requireTeacherAuth, async function(req, res) {
    try {
        var ctx = await getTeacherSchool(req.teacherEmail);
        if (!ctx.school) return res.json({ school: null });
        var role = ctx.teacher.school_role || 'teacher';
        var out = { school: schoolPublic(ctx.school), role: role, teachers: [] };
        if (role === 'admin' || role === 'head') {
            var list = await supabase.from('cleverment_teachers').select('name, email, school_role, last_login_at').eq('school_id', ctx.school.id);
            var rows = list.data;
            if (list.error) { var l2 = await supabase.from('cleverment_teachers').select('name, email, school_role').eq('school_id', ctx.school.id); rows = l2.data; }
            out.teachers = (rows || []).map(function(t) { return { name: t.name, email: t.email, role: t.school_role || 'teacher', lastLogin: t.last_login_at || null }; });
        }
        res.json(out);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
async function requireSchoolRole(req, res, roles) {
    var ctx = await getTeacherSchool(req.teacherEmail);
    if (!ctx.school || roles.indexOf(ctx.teacher.school_role) === -1) { res.status(403).json({ error: 'You do not have permission for this.' }); return null; }
    return ctx;
}
app.put('/api/school/branding', requireTeacherAuth, async function(req, res) {
    try {
        var ctx = await requireSchoolRole(req, res, ['admin']); if (!ctx) return;
        var b = req.body || {}, update = {};
        if (b.name !== undefined) { var nm = String(b.name || '').trim(); if (nm.length < 2) return res.status(400).json({ error: 'The school name is too short.' }); update.name = nm.slice(0, 80); }
        if (b.primaryColor !== undefined) update.primary_color = cleanColor(b.primaryColor, ctx.school.primary_color);
        if (b.accentColor !== undefined) update.accent_color = cleanColor(b.accentColor, ctx.school.accent_color);
        if (b.logo !== undefined) { if (!validLogo(b.logo)) return res.status(400).json({ error: 'That logo is not a valid or small enough image (PNG, JPG or WEBP).' }); update.logo = b.logo || null; }
        if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to change.' });
        var up = await supabase.from('cleverment_schools').update(update).eq('id', ctx.school.id).select('*').single();
        if (up.error) return res.status(500).json({ error: up.error.message });
        res.json({ school: schoolPublic(up.data) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/school/teachers', requireTeacherAuth, async function(req, res) {
    try {
        var ctx = await requireSchoolRole(req, res, ['admin']); if (!ctx) return;
        var r = await addTeacherToSchool(ctx.school.id, req.body || {});
        if (r.error) return res.status(400).json({ error: r.error });
        res.json({ success: true, member: r });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/school/teachers/remove', requireTeacherAuth, async function(req, res) {
    try {
        var ctx = await requireSchoolRole(req, res, ['admin']); if (!ctx) return;
        var email = String((req.body && req.body.email) || '').trim().toLowerCase();
        if (email === String(req.teacherEmail).toLowerCase()) return res.status(400).json({ error: 'You cannot remove yourself. Ask the platform admin.' });
        var up = await supabase.from('cleverment_teachers').update({ school_id: null, school_role: null }).ilike('email', email).eq('school_id', ctx.school.id);
        if (up.error) return res.status(500).json({ error: up.error.message });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/school/results', requireTeacherAuth, async function(req, res) {
    try {
        var ctx = await requireSchoolRole(req, res, ['admin', 'head']); if (!ctx) return;
        var members = await supabase.from('cleverment_teachers').select('email').eq('school_id', ctx.school.id);
        var emails = (members.data || []).map(function(m) { return m.email; });
        if (!emails.length) return res.json({ results: [] });
        var r = await supabase.from('cleverment_results').select('*').in('teacher_email', emails).order('id', { ascending: false }).limit(5000);
        if (r.error) return res.status(500).json({ error: r.error.message });
        res.json({ results: r.data || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----- platform admin -----
app.get('/api/admin/schools', requireAdminAuth, async function(req, res) {
    try {
        var sc = await supabase.from('cleverment_schools').select('*').order('created_at', { ascending: false });
        if (sc.error) return res.json({ schools: [], setupNeeded: true });
        var tr = await supabase.from('cleverment_teachers').select('name, email, school_id, school_role').not('school_id', 'is', null);
        var by = {};
        (tr.data || []).forEach(function(t) { (by[t.school_id] = by[t.school_id] || []).push({ name: t.name, email: t.email, role: t.school_role || 'teacher' }); });
        res.json({ schools: (sc.data || []).map(function(r) { return Object.assign(schoolPublic(r), { active: r.active !== false, members: by[r.id] || [] }); }) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/schools', requireAdminAuth, async function(req, res) {
    try {
        var b = req.body || {};
        var name = String(b.name || '').trim();
        if (name.length < 2) return res.status(400).json({ error: 'Enter the school name.' });
        var slug = cleanSlug(b.slug || name);
        if (!slug) return res.status(400).json({ error: 'Enter a link name made of letters or numbers.' });
        if (!validLogo(b.logo)) return res.status(400).json({ error: 'The logo must be a PNG, JPG or WEBP image under about 200 KB.' });
        var ins = await supabase.from('cleverment_schools').insert([{ name: name.slice(0, 80), slug: slug, logo: b.logo || null, primary_color: cleanColor(b.primaryColor, '#2d6cdf'), accent_color: cleanColor(b.accentColor, '#C9A84C') }]).select('*').single();
        if (ins.error) return res.status(400).json({ error: /duplicate|unique/i.test(ins.error.message) ? 'That link name is already used. Choose another.' : 'Could not create the school. Please run supabase_schools.sql in Supabase first. (' + ins.error.message + ')' });
        var adminRes = await addTeacherToSchool(ins.data.id, { email: b.adminEmail, name: b.adminName, password: b.adminPassword, role: 'admin' });
        if (adminRes.error) {
            await supabase.from('cleverment_schools').delete().eq('id', ins.data.id); // no half-created school
            return res.status(400).json({ error: adminRes.error });
        }
        res.json({ success: true, school: schoolPublic(ins.data), admin: adminRes });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/admin/schools/:id', requireAdminAuth, async function(req, res) {
    try {
        var b = req.body || {}, update = {};
        if (b.name !== undefined) update.name = String(b.name).trim().slice(0, 80);
        if (b.primaryColor !== undefined) update.primary_color = cleanColor(b.primaryColor, '#2d6cdf');
        if (b.accentColor !== undefined) update.accent_color = cleanColor(b.accentColor, '#C9A84C');
        if (b.active !== undefined) update.active = !!b.active;
        if (b.logo !== undefined) { if (!validLogo(b.logo)) return res.status(400).json({ error: 'Invalid logo.' }); update.logo = b.logo || null; }
        if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to change.' });
        var up = await supabase.from('cleverment_schools').update(update).eq('id', req.params.id).select('*').single();
        if (up.error) return res.status(500).json({ error: up.error.message });
        res.json({ school: schoolPublic(up.data) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/schools/:id/members', requireAdminAuth, async function(req, res) {
    try {
        var r = await addTeacherToSchool(req.params.id, req.body || {});
        if (r.error) return res.status(400).json({ error: r.error });
        res.json({ success: true, member: r });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/schools/:id/members/remove', requireAdminAuth, async function(req, res) {
    try {
        var email = String((req.body && req.body.email) || '').trim().toLowerCase();
        var up = await supabase.from('cleverment_teachers').update({ school_id: null, school_role: null }).ilike('email', email).eq('school_id', req.params.id);
        if (up.error) return res.status(500).json({ error: up.error.message });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ------------------------------------------------------------
// STUDENT ACCOUNTS (log in with name + 4-digit PIN given by the teacher)
// ------------------------------------------------------------
function admKeyOf(a) { return String(a || '').trim().toLowerCase(); }
function pinStrOk(p) { return /^[0-9]{4}$/.test(String(p || '')); }
function randomPin() { return String(crypto.randomInt(0, 10000)).padStart(4, '0'); }
function studentFromRequest(req) {
    var h = req.headers.authorization || '';
    if (h.indexOf('Bearer ') !== 0) return null;
    try {
        var d = jwt.verify(h.slice(7), JWT_SECRET);
        if (d && d.role === 'student') return d;
    } catch (e) {}
    return null;
}
function requireStudentAuth(req, res, next) {
    var st = studentFromRequest(req);
    if (!st) return res.status(401).json({ error: 'Please log in with your name and PIN.' });
    req.student = st;
    next();
}
async function studentRosterEntries(email, cls) {
    var r = await supabase.from('cleverment_rosters').select('student_names').eq('teacher_email', email).eq('class_name', cls).maybeSingle();
    var list = (r.data && Array.isArray(r.data.student_names)) ? r.data.student_names : [];
    return list.filter(function(e) { return e && typeof e === 'object' && e.name && e.admissionNumber; });
}
var studentLoginLimiter = rateLimit({ keyGenerator: clientIp, validate: false, windowMs: 15 * 60 * 1000, max: 300, message: { error: 'Too many attempts from this network. Please wait a few minutes.' } });
var studentSuggestLimiter = rateLimit({ keyGenerator: clientIp, validate: false, windowMs: 60 * 1000, max: 90, message: { error: 'Too many requests.' } });

// Name suggestions: only students who already have a PIN are listed.
app.get('/api/student/suggest', studentSuggestLimiter, async function(req, res) {
    try {
        var q = String(req.query.q || '').replace(/[%_,()*]/g, '').trim();
        if (q.length < 2) return res.json({ matches: [] });
        var qb = supabase.from('cleverment_student_accounts').select('name, admission_number, class_name, teacher_email').ilike('name', '%' + q + '%');
        var wantClass = String(req.query.className || '').trim();
        if (wantClass) qb = qb.eq('class_name', wantClass);
        var r = await qb.limit(6);
        if (r.error) return res.json({ matches: [] });
        res.json({ matches: (r.data || []).map(function(a) { return { name: a.name, admissionNumber: a.admission_number, className: a.class_name, teacherEmail: a.teacher_email }; }) });
    } catch (e) { res.json({ matches: [] }); }
});

app.post('/api/student/login', studentLoginLimiter, async function(req, res) {
    try {
        var b = req.body || {};
        var email = String(b.teacherEmail || '').trim().toLowerCase();
        var cls = String(b.className || '').trim();
        var key = admKeyOf(b.admissionNumber);
        var pin = String(b.pin || '');
        if (!email || !cls || !key || !pinStrOk(pin)) return res.status(400).json({ error: 'Choose your name and enter your 4-digit PIN.' });
        var r = await supabase.from('cleverment_student_accounts').select('*').eq('teacher_email', email).eq('class_name', cls).eq('admission_key', key).maybeSingle();
        var acc = r.data;
        if (!acc) return res.status(401).json({ error: 'That PIN is not right. Check it and try again.' });
        var now = Date.now();
        if (acc.locked_until && new Date(acc.locked_until).getTime() > now) {
            var mins = Math.ceil((new Date(acc.locked_until).getTime() - now) / 60000);
            return res.status(429).json({ error: 'Too many wrong PINs. Try again in ' + mins + ' minute' + (mins === 1 ? '' : 's') + ', or ask your teacher for a new PIN.', locked: true });
        }
        if (!bcrypt.compareSync(pin, acc.pin_hash)) {
            var fails = (acc.pin_fail || 0) + 1, locks = acc.pin_locks || 0, lockedUntil = null;
            if (fails >= 5) {
                lockedUntil = new Date(now + Math.min(24 * 3600 * 1000, 15 * 60 * 1000 * Math.pow(2, locks))).toISOString();
                locks++; fails = 0;
            }
            await supabase.from('cleverment_student_accounts').update({ pin_fail: fails, pin_locks: locks, locked_until: lockedUntil }).eq('id', acc.id);
            if (lockedUntil) return res.status(429).json({ error: 'Too many wrong PINs. Your account is locked for a while. Ask your teacher if you forgot your PIN.', locked: true });
            return res.status(401).json({ error: 'That PIN is not right. ' + (5 - fails) + ' tries left before a short lock.' });
        }
        await supabase.from('cleverment_student_accounts').update({ pin_fail: 0, pin_locks: 0, locked_until: null }).eq('id', acc.id);
        var token = jwt.sign({ role: 'student', email: email, className: cls, admissionKey: key, admissionNumber: acc.admission_number, name: acc.name }, JWT_SECRET, { expiresIn: '12h' });
        cmN('onStudentLogin', email, acc.name);
        res.json({ token: token, student: { name: acc.name, admissionNumber: acc.admission_number, className: cls } });
    } catch (e) { res.status(500).json({ error: 'Could not log in right now. Please try again.' }); }
});

app.get('/api/student/me', requireStudentAuth, async function(req, res) {
    try {
        var s = req.student;
        var photo = await getStudentPhoto(s.email, s.className, s.admissionNumber);
        var ctx = await getTeacherSchool(s.email);
        res.json({ name: s.name, admissionNumber: s.admissionNumber, className: s.className, photo: photo || '', teacherName: (ctx.teacher && ctx.teacher.name) || '', school: schoolPublic(ctx.school) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Home lists: "To do" (open assessments the student has not taken) and "Done" (their results).
app.get('/api/student/assessments', requireStudentAuth, async function(req, res) {
    try {
        var s = req.student, now = Date.now();
        var a = await supabase.from('cleverment_assessments').select('code, subject, class_name, time_limit, pass_mark, show_results, available_from, available_until, questions, camera_monitoring, noise_monitoring')
            .eq('teacher_email', s.email).eq('class_name', s.className).order('created_at', { ascending: false }).limit(200);
        if (a.error) return res.status(500).json({ error: a.error.message });
        var rs = await supabase.from('cleverment_results').select('id, assessment_code, subject, score, created_at, retake_allowed')
            .eq('teacher_email', s.email).ilike('admission_number', s.admissionNumber).order('created_at', { ascending: false }).limit(500);
        var results = rs.data || [];
        var blocked = {};
        results.forEach(function(r) { if (!r.retake_allowed) blocked[r.assessment_code] = true; });
        var assessments = a.data || [];
        var todo = [];
        assessments.forEach(function(x) {
            if (blocked[x.code]) return;
            var from = x.available_from ? Date.parse(x.available_from) : 0;
            var until = x.available_until ? Date.parse(x.available_until) : 0;
            var status = (from && from > now) ? 'upcoming' : ((until && until < now) ? 'closed' : 'open');
            todo.push({ code: x.code, subject: x.subject, className: x.class_name, timeLimit: x.time_limit || 0, questionCount: (x.questions || []).length, status: status, from: x.available_from || null, until: x.available_until || null, cameraMonitoring: !!x.camera_monitoring, noiseMonitoring: !!x.noise_monitoring });
        });
        var byCode = {};
        assessments.forEach(function(x) { byCode[x.code] = x; });
        var done = results.map(function(r) {
            var x = byCode[r.assessment_code] || {};
            var show = x.show_results !== false;
            var pm = (x.pass_mark === null || x.pass_mark === undefined) ? 50 : Number(x.pass_mark);
            return { id: r.id, code: r.assessment_code, subject: r.subject, date: r.created_at, score: show ? Number(r.score) : null, passed: show ? Number(r.score) >= pm : null, canReview: show };
        });
        res.json({ todo: todo, done: done });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// One finished assessment from the student's History: score, the corrections (correct answers)
// and what the certificate needs. Only the logged-in student's OWN result can be opened, and
// nothing is returned when the teacher turned "Show Results & Certificate" off.
app.get('/api/student/result/:code', requireStudentAuth, async function(req, res) {
    try {
        var s = req.student;
        var code = String(req.params.code || '').trim();
        if (!code) return res.status(400).json({ error: 'Missing assessment code.' });
        // The assessment may be gone (teacher deleted it) or the student may have changed class since,
        // so look it up by code only and fall back to the saved result when it cannot be found.
        var a = await supabase.from('cleverment_assessments').select('code, subject, class_name, pass_mark, show_results, teacher_name, teacher_signature')
            .eq('teacher_email', s.email).eq('code', code).limit(1);
        var ass = (a.data && a.data[0]) || null;
        if (ass && ass.show_results === false) return res.status(403).json({ error: 'Your teacher has not made the results of this assessment available.' });
        var r = await supabase.from('cleverment_results').select('score, correct_answers, total_questions, time_taken, created_at, answers, subject, class_name')
            .eq('teacher_email', s.email).eq('assessment_code', code).ilike('admission_number', s.admissionNumber)
            .order('created_at', { ascending: false }).limit(1);
        if (r.error || !r.data || !r.data.length) return res.status(404).json({ error: 'Result not found.' });
        var row = r.data[0];
        ass = ass || {};
        var pm = (ass.pass_mark === null || ass.pass_mark === undefined) ? 50 : Number(ass.pass_mark);
        var teacherNameFallback = ass.teacher_name || '';
        if (!teacherNameFallback) {
            try { var ctx0 = await getTeacherSchool(s.email); teacherNameFallback = (ctx0.teacher && ctx0.teacher.name) || ''; } catch (e0) {}
        }
        var photo = await getStudentPhoto(s.email, s.className, s.admissionNumber);
        res.json({
            code: code,
            subject: row.subject || ass.subject || '',
            className: row.class_name || ass.class_name || s.className,
            studentName: s.name,
            admissionNumber: s.admissionNumber,
            photo: photo || '',
            score: Number(row.score),
            correctAnswers: row.correct_answers,
            totalQuestions: row.total_questions,
            timeTaken: row.time_taken || '',
            date: row.created_at,
            passed: Number(row.score) >= pm,
            passMark: pm,
            teacherName: teacherNameFallback,
            teacherSignature: ass.teacher_signature || '',
            corrections: Array.isArray(row.answers) ? row.answers : []
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CLASSES / SUBJECTS added by the admin. Needs supabase_options.sql
// ============================================================
var OPT_TABLE = 'cleverment_custom_options';
function optClean(v) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 60); }
// Public: the extra classes and subjects (used to fill the drop-downs)
app.get('/api/options', async function(req, res) {
    try {
        var r = await supabase.from(OPT_TABLE).select('kind, value').order('value', { ascending: true }).limit(1000);
        var rows = r.error ? [] : (r.data || []);
        res.json({
            classes: rows.filter(function(x) { return x.kind === 'class'; }).map(function(x) { return x.value; }),
            subjects: rows.filter(function(x) { return x.kind === 'subject'; }).map(function(x) { return x.value; }),
            setupNeeded: !!r.error
        });
    } catch (e) { res.json({ classes: [], subjects: [] }); }
});
app.post('/api/admin/options', requireAdminAuth, async function(req, res) {
    try {
        var kind = String((req.body && req.body.kind) || ''), value = optClean(req.body && req.body.value);
        if (kind !== 'class' && kind !== 'subject') return res.status(400).json({ error: 'Choose class or subject.' });
        if (!value) return res.status(400).json({ error: 'Type a name first.' });
        var ex = await supabase.from(OPT_TABLE).select('id').eq('kind', kind).ilike('value', value.replace(/[%_]/g, '')).limit(1);
        if (ex.data && ex.data.length) return res.status(409).json({ error: 'That ' + kind + ' has already been added.' });
        var ins = await supabase.from(OPT_TABLE).insert({ kind: kind, value: value });
        if (ins.error) return res.status(500).json({ error: 'Could not save. Run supabase_options.sql in Supabase first.' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/options/delete', requireAdminAuth, async function(req, res) {
    try {
        var kind = String((req.body && req.body.kind) || ''), value = optClean(req.body && req.body.value);
        var del = await supabase.from(OPT_TABLE).delete().eq('kind', kind).eq('value', value);
        if (del.error) return res.status(500).json({ error: del.error.message });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Student login: only classes that actually have students with a PIN
app.get('/api/student/classes', async function(req, res) {
    try {
        var r = await supabase.from('cleverment_student_accounts').select('class_name').limit(20000);
        var seen = {};
        (r.data || []).forEach(function(x) { if (x.class_name) seen[x.class_name] = true; });
        res.json({ classes: Object.keys(seen).sort(function(a, b) { return a.localeCompare(b, undefined, { numeric: true }); }) });
    } catch (e) { res.json({ classes: [] }); }
});

// ============================================================
// ANNOUNCEMENTS (admin -> teachers / students). Needs supabase_announcements.sql
// ============================================================
app.get('/api/announcements', async function(req, res) {
    try {
        var aud = String(req.query.audience || '');
        var r = await supabase.from('cleverment_announcements').select('id, message, audience, created_at').eq('active', true).order('created_at', { ascending: false }).limit(20);
        var rows = (r.error ? [] : (r.data || [])).filter(function(x) { return x.audience === 'all' || x.audience === aud; }).slice(0, 3);
        res.json({ announcements: rows });
    } catch (e) { res.json({ announcements: [] }); }
});
app.get('/api/admin/announcements', requireAdminAuth, async function(req, res) {
    try {
        var r = await supabase.from('cleverment_announcements').select('id, message, audience, active, created_at').order('created_at', { ascending: false }).limit(100);
        res.json({ announcements: r.data || [], setupNeeded: !!r.error });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/announcements', requireAdminAuth, async function(req, res) {
    try {
        var msg = String((req.body && req.body.message) || '').trim().slice(0, 300);
        var aud = String((req.body && req.body.audience) || 'all');
        if (['all', 'teachers', 'students'].indexOf(aud) < 0) aud = 'all';
        if (!msg) return res.status(400).json({ error: 'Type the announcement first.' });
        var ins = await supabase.from('cleverment_announcements').insert({ message: msg, audience: aud });
        if (ins.error) return res.status(500).json({ error: 'Could not save. Run supabase_announcements.sql in Supabase first.' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/announcements/delete', requireAdminAuth, async function(req, res) {
    try {
        var id = Number(req.body && req.body.id);
        if (!Number.isFinite(id)) return res.status(400).json({ error: 'Bad id.' });
        var del = await supabase.from('cleverment_announcements').delete().eq('id', id);
        if (del.error) return res.status(500).json({ error: del.error.message });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// TEACHER INSIGHTS: hardest questions + students who need attention
// ============================================================
app.get('/api/teacher/insights/questions', requireTeacherAuth, async function(req, res) {
    try {
        var code = String(req.query.code || '').trim();
        if (!code) return res.status(400).json({ error: 'Choose an assessment.' });
        var r = await supabase.from('cleverment_results').select('answers').eq('teacher_email', req.teacherEmail).eq('assessment_code', code).limit(5000);
        if (r.error) return res.status(500).json({ error: r.error.message });
        var map = {}, students = (r.data || []).length;
        (r.data || []).forEach(function(row) {
            (Array.isArray(row.answers) ? row.answers : []).forEach(function(c) {
                if (!c || !c.question) return;
                var key = String(c.question).slice(0, 400);
                var q = map[key] || (map[key] = { question: key, attempts: 0, correct: 0, wrong: {} });
                q.attempts++;
                if (c.isCorrect) q.correct++;
                else { var w = String(c.userAnswerText || 'Not answered'); q.wrong[w] = (q.wrong[w] || 0) + 1; }
            });
        });
        var list = Object.keys(map).map(function(k) {
            var q = map[k], top = '', n = 0;
            Object.keys(q.wrong).forEach(function(w) { if (q.wrong[w] > n) { n = q.wrong[w]; top = w; } });
            return { question: q.question, attempts: q.attempts, correctPct: Math.round(q.correct / q.attempts * 100), commonWrong: top, commonWrongCount: n };
        }).sort(function(a, b) { return a.correctPct - b.correctPct || b.attempts - a.attempts; }).slice(0, 25);
        res.json({ students: students, questions: list });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/teacher/insights/attention', requireTeacherAuth, async function(req, res) {
    try {
        var cls = String(req.query.className || '').trim();
        if (!cls) return res.status(400).json({ error: 'Choose a class.' });
        var roster = await studentRosterEntries(req.teacherEmail, cls);
        var r = await supabase.from('cleverment_results').select('admission_number, score, created_at').eq('teacher_email', req.teacherEmail).eq('class_name', cls).limit(10000);
        var by = {};
        (r.data || []).forEach(function(x) {
            var k = admKeyOf(x.admission_number); var b = by[k] || (by[k] = { sum: 0, n: 0, last: null });
            b.sum += Number(x.score) || 0; b.n++; if (!b.last || x.created_at > b.last) b.last = x.created_at;
        });
        var out = roster.map(function(e) {
            var b = by[admKeyOf(e.admissionNumber)];
            return { name: e.name, admissionNumber: e.admissionNumber, taken: b ? b.n : 0, average: b ? Math.round(b.sum / b.n) : null, last: b ? b.last : null };
        }).filter(function(x) { return x.taken === 0 || x.average < 50; })
          .sort(function(a, b) { return (a.average === null ? -1 : a.average) - (b.average === null ? -1 : b.average); });
        res.json({ total: roster.length, students: out });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// MESSAGES (teacher <-> student). Needs supabase_messages.sql
// ============================================================
var MSG_TABLE = 'cleverment_student_messages';
function msgClean(b) { return String(b || '').replace(/\r/g, '').trim().slice(0, 1000); }
var msgLimiter = rateLimit({ keyGenerator: clientIp, validate: false, windowMs: 60 * 1000, max: 40, message: { error: 'Too many messages. Please wait a moment.' } });

// Student: read my conversation with my teacher (marks the teacher's messages as read)
app.get('/api/student/messages', requireStudentAuth, async function(req, res) {
    try {
        var s = req.student;
        var r = await supabase.from(MSG_TABLE).select('id, sender, body, created_at').eq('teacher_email', s.email).eq('admission_key', s.admissionKey).order('created_at', { ascending: true }).limit(300);
        if (r.error) return res.json({ messages: [], setupNeeded: true });
        await supabase.from(MSG_TABLE).update({ read_by_student: true }).eq('teacher_email', s.email).eq('admission_key', s.admissionKey).eq('sender', 'teacher').eq('read_by_student', false);
        res.json({ messages: r.data || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/student/messages/unread', requireStudentAuth, async function(req, res) {
    try {
        var s = req.student;
        var r = await supabase.from(MSG_TABLE).select('id', { count: 'exact', head: true }).eq('teacher_email', s.email).eq('admission_key', s.admissionKey).eq('sender', 'teacher').eq('read_by_student', false);
        res.json({ unread: r.count || 0 });
    } catch (e) { res.json({ unread: 0 }); }
});
// Student: reply to my teacher
app.post('/api/student/messages', requireStudentAuth, msgLimiter, async function(req, res) {
    try {
        var s = req.student;
        var body = msgClean(req.body && req.body.body);
        if (!body) return res.status(400).json({ error: 'Type a message first.' });
        var ins = await supabase.from(MSG_TABLE).insert({ teacher_email: s.email, class_name: s.className, admission_key: s.admissionKey, admission_number: s.admissionNumber, student_name: s.name, sender: 'student', body: body, read_by_student: true, read_by_teacher: false }).select('id, sender, body, created_at').single();
        if (ins.error) return res.status(500).json({ error: 'Could not send. Ask your teacher to set up messaging.' });
        cmN('onStudentMessage', s, body);
        res.json({ message: ins.data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Student: change my own PIN
app.post('/api/student/change-pin', requireStudentAuth, studentLoginLimiter, async function(req, res) {
    try {
        var s = req.student, b = req.body || {};
        if (!pinStrOk(b.currentPin) || !pinStrOk(b.newPin)) return res.status(400).json({ error: 'A PIN must be exactly 4 digits.' });
        if (String(b.currentPin) === String(b.newPin)) return res.status(400).json({ error: 'Choose a different new PIN.' });
        var r = await supabase.from('cleverment_student_accounts').select('id, pin_hash').eq('teacher_email', s.email).eq('class_name', s.className).eq('admission_key', s.admissionKey).maybeSingle();
        if (!r.data || !bcrypt.compareSync(String(b.currentPin), r.data.pin_hash)) return res.status(401).json({ error: 'Your current PIN is not right.' });
        var up = await supabase.from('cleverment_student_accounts').update({ pin_hash: bcrypt.hashSync(String(b.newPin), 10), pin_fail: 0, updated_at: new Date().toISOString() }).eq('id', r.data.id);
        if (up.error) return res.status(500).json({ error: 'Could not change the PIN.' });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Teacher: students of a class with last message and unread replies
app.get('/api/teacher/messages/students', requireTeacherAuth, async function(req, res) {
    try {
        var cls = String(req.query.className || '').trim();
        if (!cls) return res.status(400).json({ error: 'Choose a class.' });
        var roster = await studentRosterEntries(req.teacherEmail, cls);
        var m = await supabase.from(MSG_TABLE).select('admission_key, sender, body, created_at, read_by_teacher').eq('teacher_email', req.teacherEmail).eq('class_name', cls).order('created_at', { ascending: false }).limit(3000);
        var info = {};
        (m.data || []).forEach(function(x) {
            var i = info[x.admission_key] || (info[x.admission_key] = { unread: 0 });
            if (!i.last) { i.last = x.body; i.lastAt = x.created_at; i.lastSender = x.sender; }
            if (x.sender === 'student' && !x.read_by_teacher) i.unread++;
        });
        var out = roster.map(function(e) {
            var i = info[admKeyOf(e.admissionNumber)] || { unread: 0 };
            return { name: e.name, admissionNumber: e.admissionNumber, lastMessage: i.last || '', lastAt: i.lastAt || null, lastSender: i.lastSender || '', unread: i.unread };
        });
        out.sort(function(a, b) { return (b.unread - a.unread) || String(a.name).localeCompare(String(b.name)); });
        res.json({ students: out, setupNeeded: !!m.error });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/teacher/messages/unread', requireTeacherAuth, async function(req, res) {
    try {
        var r = await supabase.from(MSG_TABLE).select('id', { count: 'exact', head: true }).eq('teacher_email', req.teacherEmail).eq('sender', 'student').eq('read_by_teacher', false);
        res.json({ unread: r.count || 0 });
    } catch (e) { res.json({ unread: 0 }); }
});
app.get('/api/teacher/messages/thread', requireTeacherAuth, async function(req, res) {
    try {
        var cls = String(req.query.className || '').trim(), key = admKeyOf(req.query.admissionNumber);
        if (!cls || !key) return res.status(400).json({ error: 'Choose a student.' });
        var r = await supabase.from(MSG_TABLE).select('id, sender, body, created_at').eq('teacher_email', req.teacherEmail).eq('class_name', cls).eq('admission_key', key).order('created_at', { ascending: true }).limit(300);
        await supabase.from(MSG_TABLE).update({ read_by_teacher: true }).eq('teacher_email', req.teacherEmail).eq('class_name', cls).eq('admission_key', key).eq('sender', 'student').eq('read_by_teacher', false);
        res.json({ messages: r.data || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Teacher: send to one student, selected students, or the whole class
app.post('/api/teacher/messages', requireTeacherAuth, msgLimiter, async function(req, res) {
    try {
        var b = req.body || {};
        var cls = String(b.className || '').trim();
        var body = msgClean(b.body);
        if (!cls || !body) return res.status(400).json({ error: 'Choose a class and type a message.' });
        var roster = await studentRosterEntries(req.teacherEmail, cls);
        var pick = roster;
        if (!b.all) {
            var want = {};
            (Array.isArray(b.admissionNumbers) ? b.admissionNumbers : []).forEach(function(a) { want[admKeyOf(a)] = true; });
            pick = roster.filter(function(e) { return want[admKeyOf(e.admissionNumber)]; });
        }
        if (!pick.length) return res.status(400).json({ error: 'No students selected.' });
        var batch = crypto.randomBytes(8).toString('hex');
        var rows = pick.map(function(e) { return { teacher_email: req.teacherEmail, class_name: cls, admission_key: admKeyOf(e.admissionNumber), admission_number: e.admissionNumber, student_name: e.name, sender: 'teacher', body: body, batch_id: batch, read_by_student: false, read_by_teacher: true }; });
        var ins = await supabase.from(MSG_TABLE).insert(rows);
        if (ins.error) return res.status(500).json({ error: 'Could not send. Run supabase_messages.sql in Supabase first.' });
        cmN('onTeacherMessage', req.teacherEmail, cls, rows);
        res.json({ success: true, sent: rows.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Teacher: open a student's account without the PIN (only for students on that teacher's own class roster).
app.post('/api/teacher/student-enter', requireTeacherAuth, async function(req, res) {
    try {
        var b = req.body || {};
        var cls = String(b.className || '').trim();
        var key = admKeyOf(b.admissionNumber);
        if (!cls || !key) return res.status(400).json({ error: 'Choose a class and a student first.' });
        var entries = await studentRosterEntries(req.teacherEmail, cls);
        var found = entries.filter(function(e) { return admKeyOf(e.admissionNumber) === key; })[0];
        if (!found) return res.status(404).json({ error: 'That student is not on your roster for this class.' });
        var token = jwt.sign({ role: 'student', email: req.teacherEmail, className: cls, admissionKey: key, admissionNumber: found.admissionNumber, name: found.name, viaTeacher: true }, JWT_SECRET, { expiresIn: '6h' });
        res.json({ token: token, student: { name: found.name, admissionNumber: found.admissionNumber, className: cls } });
    } catch (e) { res.status(500).json({ error: 'Could not open the student account right now.' }); }
});

// Teacher: see which roster students have a PIN, and create / reset PINs.
app.get('/api/teacher/student-pins', requireTeacherAuth, async function(req, res) {
    try {
        var cls = String(req.query.className || '').trim();
        if (!cls) return res.status(400).json({ error: 'Choose a class first.' });
        var entries = await studentRosterEntries(req.teacherEmail, cls);
        var acc = await supabase.from('cleverment_student_accounts').select('admission_key, locked_until').eq('teacher_email', req.teacherEmail).eq('class_name', cls).limit(1000);
        var by = {};
        if (!acc.error) (acc.data || []).forEach(function(x) { by[x.admission_key] = x; });
        res.json({
            students: entries.map(function(e) {
                var x = by[admKeyOf(e.admissionNumber)];
                return { name: e.name, admissionNumber: String(e.admissionNumber), hasPin: !!x, locked: !!(x && x.locked_until && new Date(x.locked_until).getTime() > Date.now()) };
            }),
            setupNeeded: !!acc.error
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Body: { className } = new PINs for the whole class, or { className, admissionNumber } = reset one student.
// The PINs are returned ONCE (only their scrambled form is stored).
app.post('/api/teacher/student-pins', requireTeacherAuth, async function(req, res) {
    try {
        var b = req.body || {};
        var cls = String(b.className || '').trim();
        if (!cls) return res.status(400).json({ error: 'Choose a class first.' });
        var entries = await studentRosterEntries(req.teacherEmail, cls);
        var only = b.admissionNumber ? admKeyOf(b.admissionNumber) : null;
        var targets = only ? entries.filter(function(e) { return admKeyOf(e.admissionNumber) === only; }) : entries;
        if (!targets.length) return res.status(400).json({ error: only ? 'That student is not on this class roster.' : 'The class roster is empty. Add students first.' });
        var now = new Date().toISOString(), rows = [], out = [];
        targets.forEach(function(e) {
            var pin = randomPin();
            rows.push({ teacher_email: req.teacherEmail, class_name: cls, admission_key: admKeyOf(e.admissionNumber), admission_number: String(e.admissionNumber), name: String(e.name),
                pin_hash: bcrypt.hashSync(pin, 8), pin_fail: 0, pin_locks: 0, locked_until: null, updated_at: now });
            out.push({ name: String(e.name), admissionNumber: String(e.admissionNumber), pin: pin });
        });
        var up = await supabase.from('cleverment_student_accounts').upsert(rows, { onConflict: 'teacher_email,class_name,admission_key' });
        if (up.error) return res.status(500).json({ error: 'Could not save the PINs. Please run supabase_student_accounts.sql in Supabase first. (' + up.error.message + ')' });
        res.json({ pins: out });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Lets ONE student take an assessment again (for example after a network failure).
// The earlier result stays visible until the student submits again, then it is replaced.
app.post('/api/teacher/results/:id/allow-retake', requireTeacherAuth, async function(req, res) {
    try {
        var id = req.params.id;
        var allow = !(req.body && req.body.allow === false);
        var { data: existing, error: fetchError } = await supabase
            .from('cleverment_results')
            .select('id, teacher_email, assessment_code, admission_number, student_name')
            .eq('id', id)
            .maybeSingle();
        if (fetchError) return res.status(500).json({ error: fetchError.message });
        if (!existing || existing.teacher_email !== req.teacherEmail) {
            return res.status(403).json({ error: 'Not authorized to change this result.' });
        }
        var { error } = await supabase.from('cleverment_results').update({ retake_allowed: allow }).eq('id', id);
        if (error) {
            return res.status(500).json({ error: 'Could not allow the retake. Please run supabase_update1.sql in Supabase first. (' + error.message + ')' });
        }
        if (allow) cmN('onRetakeAllowed', existing);
        if (allow) {
            var rk = liveSessionKey(existing.assessment_code, existing.admission_number);
            delete quizSessionCache[rk];
            delete pendingProgress[rk];
            // Clear the finished attempt record so the new attempt is tracked (and auto-submitted) normally.
            try {
                await supabase.from('cleverment_quiz_sessions').delete()
                    .eq('code', String(existing.assessment_code || '').toUpperCase())
                    .eq('admission_key', String(existing.admission_number || '').toLowerCase());
            } catch (e) { /* table may not exist */ }
        }
        res.json({ success: true, retakeAllowed: allow });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/results/:id/allow-retake', requireAdminAuth, async function(req, res) {
    try {
        var allow = !(req.body && req.body.allow === false);
        var { data: existing, error: fetchError } = await supabase
            .from('cleverment_results')
            .select('id, teacher_email, assessment_code, admission_number')
            .eq('id', req.params.id)
            .maybeSingle();
        if (fetchError) return res.status(500).json({ error: fetchError.message });
        if (!existing) return res.status(404).json({ error: 'Result not found.' });
        var { error } = await supabase.from('cleverment_results').update({ retake_allowed: allow }).eq('id', req.params.id);
        if (error) {
            return res.status(500).json({ error: 'Could not allow the retake. Please run supabase_update1.sql in Supabase first. (' + error.message + ')' });
        }
        if (allow) cmN('onRetakeAllowed', existing);
        if (allow) {
            var rk2 = liveSessionKey(existing.assessment_code, existing.admission_number);
            delete quizSessionCache[rk2];
            delete pendingProgress[rk2];
            try {
                await supabase.from('cleverment_quiz_sessions').delete()
                    .eq('code', String(existing.assessment_code || '').toUpperCase())
                    .eq('admission_key', String(existing.admission_number || '').toLowerCase());
            } catch (e) { /* table may not exist */ }
        }
        res.json({ success: true, retakeAllowed: allow });
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
        if (!req.adminActingAsTeacher && (data || []).length) cmN('onTeacherDo', 'delete', req.teacherEmail, (data || []).length + ' results');
        res.json({ success: true, deleted: (data || []).length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/teacher/results', requireTeacherAuth, async function(req, res) {
    try {
        var { error } = await supabase.from('cleverment_results').delete().eq('teacher_email', req.teacherEmail);
        if (error) return res.status(500).json({ error: error.message });
        if (!req.adminActingAsTeacher) cmN('onTeacherDo', 'delete', req.teacherEmail, 'all results');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// ADMIN: MANAGE ALL ASSESSMENTS & RESULTS
// ============================================================

// Admin-only overview endpoints: return live students and access attempts across every teacher.
app.get('/api/admin/live', requireAdminAuth, async function(req, res) {
    try {
        var cutoff = Date.now() - 60 * 1000;
        Object.keys(activeSessions).forEach(function(key) {
            if (new Date(activeSessions[key].lastSeen).getTime() < cutoff) delete activeSessions[key];
        });
        var { data: teachers } = await supabase.from('cleverment_teachers').select('email, name');
        var names = {};
        (teachers || []).forEach(function(t) { names[String(t.email || '').toLowerCase()] = t.name || ''; });
        var { data: assessments, error } = await supabase.from('cleverment_assessments').select('code, teacher_email, teacher_name, subject, class_name');
        if (error) return res.status(500).json({ error: error.message });
        var assessmentByCode = {};
        (assessments || []).forEach(function(a) { assessmentByCode[a.code] = a; });
        var live = Object.keys(activeSessions).map(function(k) {
            var session = activeSessions[k];
            var a = assessmentByCode[session.code] || {};
            return Object.assign({}, session, { lastMessage: lastLiveMessageFor(k), teacherEmail: a.teacher_email || '', teacherName: a.teacher_name || names[String(a.teacher_email || '').toLowerCase()] || 'Unknown teacher' });
        }).sort(function(a,b) { return a.startedAt < b.startedAt ? -1 : 1; });
        res.json({ live: live });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/live/message', requireAdminAuth, async function(req, res) {
    await handleLiveMessage(req, res, 'admin', 'admin', null);
});

app.get('/api/admin/access-logs', requireAdminAuth, async function(req, res) {
    try {
        var { data, error } = await supabase.from('cleverment_access_logs').select('id, timestamp, teacher_email, code, subject, class_name, student_name, admission_number, status, message, source').order('timestamp', { ascending: false }).limit(1000);
        if (error) return res.status(500).json({ error: 'Could not load access logs. Make sure the cleverment_access_logs table exists in Supabase.' });
        var { data: teachers } = await supabase.from('cleverment_teachers').select('email, name');
        var names = {};
        (teachers || []).forEach(function(t) { names[String(t.email || '').toLowerCase()] = t.name || ''; });
        var logs = (data || []).map(function(row) { var email = String(row.teacher_email || '').toLowerCase(); return { id: row.id, timestamp: row.timestamp, teacherEmail: row.teacher_email || '', teacherName: names[email] || 'Unknown teacher', code: row.code || '', subject: row.subject || '', className: row.class_name || '', studentName: row.student_name || '', admissionNumber: row.admission_number || '', status: row.status || '', message: row.message || '', source: row.source || 'student' }; });
        res.json({ logs: logs });
    } catch (e) { res.status(500).json({ error: 'Could not load access logs.' }); }
});

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
    assessmentRowCache = {};
    presenceAssessmentCache = {};
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

// Notifications: phone alerts (Web Push) + real-time in-app alerts. Needs supabase_notifications.sql.
try {
    cmNotify = require('./notify')(app, {
        supabase: supabase, jwt: jwt, JWT_SECRET: JWT_SECRET, rateLimit: rateLimit, clientIp: clientIp,
        getActiveSessions: function() { return activeSessions; }
    });
} catch (e) { console.error('Notifications could not start:', e.message); }

// Live watching: slow-refresh pictures + tap to watch and listen (see watch.js).
try {
    require('./watch')(app, {
        rateLimit: rateLimit, clientIp: clientIp,
        getActiveSessions: function() { return activeSessions; },
        getAssessment: getAssessmentRowCached, liveSessionKey: liveSessionKey,
        requireTeacherAuth: requireTeacherAuth
    });
} catch (e) { console.error('Live watching could not start:', e.message); }

// Live Quiz Competition (see competition.js). Needs supabase_competition.sql to save results.
require('./competition')(app, { supabase: supabase, rateLimit: rateLimit, requireTeacherAuth: requireTeacherAuth, requireStudentAuth: requireStudentAuth, studentFromRequest: studentFromRequest });

app.get('/', function(req, res) {
    cmN('maybeTick');
    res.send('CleverMent backend is running.');
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log('CleverMent backend listening on port ' + PORT);
    // Auto-submit attempts whose time ran out while the student was away.
    setTimeout(autoSubmitExpiredSessions, 5000);
    setInterval(autoSubmitExpiredSessions, 30 * 1000);
});
