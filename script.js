// Admin teacher-workspace mode: teacher API calls use the selected teacher scope.
// The server independently validates the admin JWT and selected teacher before allowing access.
var adminActAsTeacher = (function(){ try { return localStorage.getItem('cleverment_admin_act_as_teacher') || ''; } catch(e) { return ''; } })();
(function installAdminTeacherFetchScope(){
    if (typeof window === 'undefined' || !window.fetch || window.__clevermentTeacherScopeFetchInstalled) return;
    var nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var selectedEmail = '';
        try { selectedEmail = localStorage.getItem('cleverment_admin_act_as_teacher') || ''; } catch(e) {}
        if (selectedEmail && url.indexOf('/api/teacher/') !== -1) {
            init = init ? Object.assign({}, init) : {};
            var headers = {};
            if (init.headers) {
                if (typeof Headers !== 'undefined' && init.headers instanceof Headers) init.headers.forEach(function(v,k){ headers[k] = v; });
                else if (Array.isArray(init.headers)) init.headers.forEach(function(pair){ headers[pair[0]] = pair[1]; });
                else Object.keys(init.headers).forEach(function(k){ headers[k] = init.headers[k]; });
            } else if (input && input.headers) {
                if (typeof Headers !== 'undefined' && input.headers instanceof Headers) input.headers.forEach(function(v,k){ headers[k] = v; });
                else if (!Array.isArray(input.headers)) Object.keys(input.headers).forEach(function(k){ headers[k] = input.headers[k]; });
            }
            headers['X-CleverMent-Act-As-Teacher'] = selectedEmail;
            init.headers = headers;
        }
        return nativeFetch(input, init);
    };
    window.__clevermentTeacherScopeFetchInstalled = true;
})();

// Brand icons: browser tab icon and home-screen icon use the CleverMent logo files.
(function setBrandIcons(){
    try {
        var apple = document.querySelector('link[rel="apple-touch-icon"]');
        if (!apple) { apple = document.createElement('link'); apple.rel = 'apple-touch-icon'; document.head.appendChild(apple); }
        apple.href = 'apple-touch-icon.png';
        var fav = document.querySelector('link[rel="icon"]');
        if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
        fav.type = 'image/png'; fav.href = 'favicon-64.png';
    } catch (e) {}
})();

// ============================================================
// READ CODE FROM URL
// ============================================================

function getCodeFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('code');
}

// ============================================================
// URL PARAMETER FUNCTIONS
// ============================================================

function getPageFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('page');
}

function updateURL(page) {
    var newURL = window.location.pathname + '?page=' + page;
    var curState = window.history.state;
    if (cmNavSuppress || (curState && curState.page === page && !curState.section)) {
        window.history.replaceState({ page: page }, '', newURL); // same screen again, or navigating by back/forward: no new history entry
    } else {
        window.history.pushState({ page: page }, '', newURL);
    }
    // Remember where the person was, so a logged-in teacher/admin can be
    // returned to their dashboard if the app is re-opened without ?page=.
    try { localStorage.setItem('cleverment_last_page', page); } catch (e) {}
}

// If the app is opened without a ?page= in the address (home-screen icon,
// a plain link, or a reload that lost it) and a teacher/admin is still logged
// in, put them back on their dashboard instead of the landing screen.
// Logging out overwrites the remembered page, so this never fires after logout.
function resumeSignedInDashboard() {
    var last = '';
    try { last = localStorage.getItem('cleverment_last_page') || ''; } catch (e) {}
    var target = '';
    if (last === 'teacher-dashboard' && currentTeacher && localStorage.getItem('cleverment_teacher_token')) {
        target = 'teacher-dashboard';
    } else if (last === 'admin-dashboard' && localStorage.getItem('cleverment_admin_session') === 'true' && localStorage.getItem('cleverment_admin_token')) {
        target = 'admin-dashboard';
    }
    if (!target) return false;
    window.history.replaceState({ page: target }, '', window.location.pathname + '?page=' + target);
    showPageFromURL(target);
    return true;
}

// Dashboard branding lives inside each dashboard sidebar. Hide the global
// landing/header branding while a teacher or admin dashboard is active so
// the same logo/tagline is not duplicated above the dashboard.
function setDashboardHeaderVisible(visible) {
    var header = document.querySelector('.header');
    if (header) header.style.display = visible ? 'block' : 'none';
}

function showPageFromURL(page) {
    var sections = ['landingPage', 'studentAccess', 'studentAssessmentView', 'teacherAuth', 'teacherDashboard', 'adminAuth', 'adminDashboard', 'studentCertificateSection', 'studentResultsSection'];
    for (var i = 0; i < sections.length; i++) {
        var el = document.getElementById(sections[i]);
        if (el) el.style.display = 'none';
    }
    
    document.querySelector('.header').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    
    if (page === 'landing' || page === '') {
        document.getElementById('landingPage').style.display = 'block';
    } else if (page === 'student') {
        document.getElementById('studentAccess').style.display = 'block';
    } else if (page === 'student-assessment') {
        document.getElementById('studentAssessmentView').style.display = 'block';
        document.getElementById('studentInfoForm').style.display = 'block';
    } else if (page === 'results') {
        document.getElementById('studentResultsSection').style.display = 'block';
    } else if (page === 'certificate') {
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.footer').style.display = 'none';
        document.getElementById('studentCertificateSection').style.display = 'block';
    } else if (page === 'teacher') {
        document.getElementById('teacherAuth').style.display = 'block';
        showTeacherLoginForm();
    } else if (page === 'teacher-dashboard') {
        if (currentTeacher) {
            setDashboardHeaderVisible(false);
            document.getElementById('teacherDashboard').style.display = 'block';
            restoreDashSidebarState('teacherDashboard');
            if (adminActAsTeacher || localStorage.getItem('cleverment_admin_act_as_teacher')) {
                adminActAsTeacher = localStorage.getItem('cleverment_admin_act_as_teacher') || adminActAsTeacher;
                document.getElementById('teacherDashboardName').textContent = 'Admin Workspace — ' + currentTeacher.name;
                document.getElementById('teacherDashboardEmail').textContent = currentTeacher.email + ' · You are acting on behalf of this teacher';
                var workspaceExit = document.getElementById('teacherDashboardExitButton');
                if (workspaceExit) { workspaceExit.textContent = '← Back to Admin'; workspaceExit.onclick = returnToAdminDashboard; }
            } else {
                document.getElementById('teacherDashboardName').textContent = 'Welcome, ' + currentTeacher.name + '!';
                document.getElementById('teacherDashboardEmail').textContent = currentTeacher.email;
            }
            renderTeacherDashboard();
            renderTeacherPublishedList();
            populateTeacherQuestionBankSelect();
            renderCSVHistory();
        } else {
            document.getElementById('teacherAuth').style.display = 'block';
            showTeacherLoginForm();
            updateURL('teacher');
        }
    } else if (page === 'admin') {
        document.getElementById('adminAuth').style.display = 'block';
    } else if (page === 'admin-dashboard') {
        if (localStorage.getItem('cleverment_admin_session') === 'true') {
            setDashboardHeaderVisible(false);
            document.getElementById('adminDashboard').style.display = 'block';
            restoreDashSidebarState('adminDashboard');
            renderAdminDashboard();
        } else {
            document.getElementById('adminAuth').style.display = 'block';
            updateURL('admin');
        }
    }
}

// ============================================================
// SAVE AND RESTORE PAGE STATE (Legacy)
// ============================================================

function savePageState() {
    var currentPage = '';
    if (document.getElementById('studentAccess').style.display === 'block') currentPage = 'studentAccess';
    else if (document.getElementById('studentAssessmentView').style.display === 'block') currentPage = 'studentAssessmentView';
    else if (document.getElementById('teacherAuth').style.display === 'block') currentPage = 'teacherAuth';
    else if (document.getElementById('teacherDashboard').style.display === 'block') currentPage = 'teacherDashboard';
    else if (document.getElementById('adminAuth').style.display === 'block') currentPage = 'adminAuth';
    else if (document.getElementById('adminDashboard').style.display === 'block') currentPage = 'adminDashboard';
    else if (document.getElementById('landingPage').style.display === 'block') currentPage = 'landingPage';
    
    if (currentPage) {
        localStorage.setItem('cleverment_current_page', currentPage);
    }
}

function restorePageState() {
    var savedPage = localStorage.getItem('cleverment_current_page');
    if (savedPage) {
        var sections = ['#landingPage', '#studentAccess', '#studentAssessmentView', '#teacherAuth', '#teacherDashboard', '#adminAuth', '#adminDashboard'];
        for (var i = 0; i < sections.length; i++) {
            var el = document.querySelector(sections[i]);
            if (el) el.style.display = 'none';
        }
        var target = document.getElementById(savedPage);
        if (target) {
            target.style.display = 'block';
            if (savedPage === 'teacherDashboard' && currentTeacher) {
                setDashboardHeaderVisible(false);
                renderTeacherDashboard();
                renderCSVHistory();
            }
            if (savedPage === 'adminDashboard') {
                setDashboardHeaderVisible(false);
                renderAdminDashboard();
            }
        }
    }
}

function saveStateAndNavigate(pageId) {
    localStorage.setItem('cleverment_current_page', pageId);
}

// ============================================================
// SUPABASE CONNECTION
// ============================================================

// The website no longer holds any database key. Every query below goes to our own server (/api/db/query),
// which checks who is asking before it touches the database. The calls look exactly like before.
var supabaseClient = (function() {
    var methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is', 'order', 'limit', 'range', 'single', 'maybeSingle'];
    function Query(table) { this._table = table; this._ops = []; }
    methods.forEach(function(m) {
        Query.prototype[m] = function() { this._ops.push({ m: m, a: Array.prototype.slice.call(arguments) }); return this; };
    });
    Query.prototype.then = function(onOk, onErr) { return cmDbRun(this._table, this._ops).then(onOk, onErr); };
    return { from: function(table) { return new Query(table); } };
})();

async function cmDbRun(table, ops) {
    var headers = { 'Content-Type': 'application/json' };
    var adminToken = null, teacherToken = null, actAs = null;
    try {
        adminToken = localStorage.getItem('cleverment_admin_token');
        teacherToken = localStorage.getItem('cleverment_teacher_token');
        actAs = localStorage.getItem('cleverment_admin_act_as_teacher');
    } catch (e) {}
    var page = '';
    try { page = (typeof getPageFromURL === 'function' && getPageFromURL()) || ''; } catch (e) {}
    var onAdminPage = /^admin/.test(page);
    var token = null;
    if (adminToken && actAs && !onAdminPage) { token = adminToken; headers['X-CleverMent-Act-As-Teacher'] = actAs; }
    else if (onAdminPage) token = adminToken || teacherToken;
    else token = teacherToken || adminToken;
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
        var res = await fetch(BACKEND_URL + '/api/db/query', { method: 'POST', headers: headers, body: JSON.stringify({ table: table, ops: ops }) });
        var json = await res.json();
        if (!res.ok) return { data: null, error: { message: json.error || 'Request failed.' } };
        return { data: json.data === undefined ? null : json.data, error: json.error || null };
    } catch (e) {
        return { data: null, error: { message: 'Network error.' } };
    }
}

var supabase = supabaseClient;

// ============================================================
// FAQ PAGE
// ============================================================

var WHATSAPP_SUPPORT_NUMBER = '2349069959358';

var DEFAULT_FAQS = [
    // ---------- TEACHER FAQS ----------
    { category: 'teacher', question: 'How do I create a teacher account?', answer: 'On the landing page, tap "I\'m a Teacher", then "Sign Up". Enter your name, email, and a password. You\'ll be logged in immediately after signing up.' },
    { category: 'teacher', question: 'I forgot my password. How do I get back in?', answer: 'On the teacher login screen, tap "Forgot password?". Enter your account email and a reset link will be emailed to you. The link is valid for 1 hour. Open it, set a new password, and log in as normal.' },
    { category: 'teacher', question: 'What format should my CSV file be in?', answer: 'Each row is one question, with columns in this order: Question, Option A, Option B, Option C, Option D, Correct Answer, Image URL (optional).\n\nThe Correct Answer column should contain the letter (A, B, C, or D) of the correct option.\n\nIf any cell contains a comma (like "5,000" or a sentence with a comma in it), wrap that whole cell in double quotes so it doesn\'t get split into the wrong columns.' },
    { category: 'teacher', question: 'Can I add images to my questions?', answer: 'Yes. After uploading your CSV or loading a Question Bank, click “Review Questions & Add Images” to attach an image directly to any question. Images are stored by CleverMent and do not require Google Drive sharing links. You can also use the optional 7th CSV column for an image URL.' },
    { category: 'teacher', question: 'Can I include maths equations or symbols in questions?', answer: 'Plain symbols like ×, ÷, ±, √, π, ½, ² work fine typed directly into a cell. For a properly typeset equation, wrap it in single dollar signs, e.g. $x^2 + 5x - 6 = 0$, or double dollar signs for a larger standalone equation, e.g. $$\\frac{a}{b} = \\frac{c}{d}$$.' },
    { category: 'teacher', question: 'What is the Question Bank, and how do I use it?', answer: 'The Question Bank lets you save a set of questions under a name so you can reuse it later without re-uploading the CSV each time. After uploading a CSV, click "Save Current as Question Bank" and give it a name. Later, pick it from the dropdown and click "Load Selected" before publishing. You can also delete a saved bank you no longer need. Question banks sync to your account, so they show up no matter which device or browser you log in from.' },
    { category: 'teacher', question: 'How do I publish an assessment, step by step?', answer: '1. Log in and go to your dashboard.\n2. Choose the Subject and Class.\n3. Upload a CSV or load a saved Question Bank.\n4. Set a Time Limit, Pass Mark, and optionally an Available From/Until window.\n5. Turn on Shuffle, Camera/Noise Monitoring, or turn off "Show Results & Certificate" if this is a real exam.\n6. Add your name and signature for the certificate (optional).\n7. Click Publish Assessment. You\'ll get a unique code to share with students.' },
    { category: 'teacher', question: 'What does "Shuffle Questions & Answer Options" do?', answer: 'When turned on, each student sees the questions in a different random order, and the A/B/C/D options within each question are also shuffled independently for each student. This makes it much harder for students sitting near each other to copy answers by position or letter.' },
    { category: 'teacher', question: 'What is "Available From / Until" for?', answer: 'This lets you schedule exactly when an assessment code will work. Leave both blank for a code that works any time. Set them if you want the assessment to only be accessible during a specific exam window - students trying the code before or after will see a message saying it isn\'t open.' },
    { category: 'teacher', question: 'What is "Pass Mark" and how is it used?', answer: 'This is the percentage a student needs to be marked as having passed. It defaults to 50% but you can set any value per assessment. Students see a Pass/Fail badge based on this number, and your dashboard\'s "Pass Rate" statistic uses each assessment\'s own pass mark rather than one fixed number.' },
    { category: 'teacher', question: 'What does turning off "Show Results & Certificate to Student" do?', answer: 'This is for real exams and tests where students shouldn\'t see their score right away. When off, a student just sees "Assessment Submitted Successfully" after clicking submit - no score, no corrections, no certificate. You (and admin) can still see their actual score on your Results Dashboard as normal; this setting only affects what the student sees.' },
    { category: 'teacher', question: 'What do Camera Monitoring and Noise Monitoring actually do?', answer: 'When turned on for an assessment, students must allow camera and/or microphone access before starting. The app checks live, in the browser, that a face stays visible and that background noise stays low. Nothing is ever recorded or saved - only a pass/fail check happens live. A student gets two warnings; a third violation ends and submits their assessment automatically as "submitted due to misconduct". This is a helpful deterrent, not perfect proctoring - poor lighting or a noisy shared environment can occasionally cause false warnings.' },
    { category: 'teacher', question: 'What is a Class Roster, and how do I set one up?', answer: 'A roster is the list of students expected in a class, with their admission numbers. Go to "Class Roster" on your dashboard, pick a class, and click "Download Roster Template" - this gives you a spreadsheet pre-labeled for that class. Fill in each student\'s Name and Admission Number, save the file, then upload it back using "Upload Roster". Once a class has a roster, only students whose admission number is on that list can take assessments published for that class - anyone else is blocked with a message to contact you.' },
    { category: 'teacher', question: 'Do I have to set up a roster for every class?', answer: 'No. Rostering is optional. If you never upload a roster for a class, any student with a valid assessment code can take it - no restriction. Only classes where you\'ve uploaded a roster get the "must be on the list" restriction.' },
    { category: 'teacher', question: 'How does the app stop a student from submitting an assessment twice?', answer: 'Each submission is checked against that assessment\'s existing results by admission number. If that admission number has already submitted for that specific assessment code, they\'re blocked with a message telling them to contact you if it\'s a mistake.' },
    { category: 'teacher', question: 'What do "Tab Switches" and "Cam/Noise Flags" mean on my results table?', answer: '"Tab Switches" counts how many times a student switched away from the browser tab/app during their assessment - useful context, though refreshing the page can sometimes register as one switch too, so treat a count of 1 loosely. "Cam/Noise Flags" counts camera/microphone monitoring violations, only relevant for assessments where you turned that on.' },
    { category: 'teacher', question: 'What is Question Analytics & Attendance?', answer: 'On your dashboard, pick any of your published assessments from the dropdown to see: which questions students get wrong most often (great for knowing what to re-teach), and - if you\'ve uploaded a roster for that class - who has and hasn\'t submitted yet, by name and admission number.' },
    { category: 'teacher', question: 'How do I download certificates for a whole class at once?', answer: 'In the Question Analytics section, pick the assessment, then click "Download All Certificates (ZIP)". It generates a certificate for every student who submitted and packages them into one ZIP file. This can take a minute or two for a large class - a progress message will show while it works.' },
    { category: 'teacher', question: 'My account says "Paused" - what do I do?', answer: 'A paused account needs to be reactivated with a small payment before you can log in again. When you try to log in, you\'ll see a "Pay Now to Reactivate" button - this takes you to a secure Flutterwave payment page. Once payment is confirmed, your account is unpaused automatically, usually within moments.' },
    { category: 'teacher', question: 'Where can I see my CSV upload history?', answer: 'Your dashboard keeps a history of CSV files you\'ve uploaded, so you can reuse one with "Use Again" instead of finding the original file again, or delete old ones you don\'t need.' },

    // ---------- STUDENT FAQS ----------
    { category: 'student', question: 'How do I take an assessment?', answer: 'On the landing page, tap "I\'m a Student", then enter the assessment code your teacher gave you. Once it\'s accepted, enter your name and admission number, then tap Start Assessment.' },
    { category: 'student', question: 'Why do I need to enter my admission number?', answer: 'Your admission number uniquely identifies you and is used to make sure you can only submit an assessment once, and (if your teacher has set one up) to check you\'re on the class roster for that assessment. If you don\'t know your admission number, ask your teacher.' },
    { category: 'student', question: 'It says I\'m "not found on the class roster" - what does that mean?', answer: 'Your teacher has uploaded a specific list of students allowed to take this assessment, and your admission number wasn\'t on it. Double-check you typed it correctly. If it\'s still not working, contact your teacher - it may need to be added to the list.' },
    { category: 'student', question: 'It says I\'ve "already submitted this assessment" but I haven\'t.', answer: 'This usually means someone already submitted using the same admission number, which could be a typo on your entry or someone else\'s. Double-check the number you\'re entering, and if it still won\'t work, contact your teacher.' },
    { category: 'student', question: 'The assessment code isn\'t working.', answer: 'Make sure you\'ve typed it exactly as given (it auto-formats as you type). If it\'s still rejected, the assessment may not be open yet, may have already closed, or the code may be wrong - check with your teacher.' },
    { category: 'student', question: 'Why are my questions or options in a different order than my classmate\'s?', answer: 'Some assessments have shuffling turned on by the teacher, which gives each student their own random order of questions and answer choices. This is normal and doesn\'t affect your score.' },
    { category: 'student', question: 'What happens if I switch to another app or tab during the assessment?', answer: 'It gets recorded and a small warning banner appears. It won\'t end your assessment by itself, but your teacher can see how many times it happened.' },
    { category: 'student', question: 'The assessment wants to use my camera and microphone - is that normal?', answer: 'Yes, if your teacher has turned on monitoring for this assessment. You\'ll see a red notice explaining this before it starts. Keep your face visible to the camera and stay somewhere quiet for the whole assessment. You\'ll get a warning if either check fails - after two warnings, a third violation ends and submits your assessment automatically.' },
    { category: 'student', question: 'I got a monitoring warning even though I didn\'t do anything wrong.', answer: 'Camera checks can occasionally be thrown off by dim lighting, and noise checks by background sound you can\'t fully control (other students nearby, a fan, etc.). Try to sit somewhere brighter and quieter if possible. If your assessment ends due to this, let your teacher know - they can see this happened and use their judgment.' },
    { category: 'student', question: 'My camera/microphone stopped working after I refreshed the page.', answer: 'A page refresh can disconnect the camera/microphone. You\'ll see a "Resume Monitoring & Continue" button - tap it and allow access again to keep going. Your answers and progress are not lost.' },
    { category: 'student', question: 'I submitted my assessment but don\'t see my score.', answer: 'Some assessments (usually real exams or tests) are set by the teacher to hide results immediately - you\'ll just see "Assessment Submitted Successfully". Your teacher has your actual score and will share it with you separately.' },
    { category: 'student', question: 'How do I download my certificate?', answer: 'If your teacher has results/certificates turned on for that assessment, you\'ll see "Download Certificate" buttons right after your results are shown. If you don\'t see them, that assessment likely has results hidden by the teacher (see above).' },
    { category: 'student', question: 'What happens when the timer runs out?', answer: 'Your assessment is submitted automatically with whatever answers you\'ve given so far - you don\'t need to do anything.' }
];

var faqCache = [];
var faqCurrentCategory = 'teacher';
var faqPreviousPageState = null;

async function ensureFaqsSeeded() {
    try {
        var { data, error } = await supabase.from('cleverment_faqs').select('id').limit(1);
        if (error) return { ok: false, error: error.message };
        if (data && data.length > 0) return { ok: true, alreadyHadContent: true };

        var rows = DEFAULT_FAQS.map(function(f, i) {
            return {
                category: f.category,
                question: f.question,
                answer: f.answer,
                video_url: f.video_url || null,
                sort_order: i
            };
        });
        var { error: insertError } = await supabase.from('cleverment_faqs').insert(rows);
        if (insertError) return { ok: false, error: insertError.message };
        return { ok: true, alreadyHadContent: false };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function loadFaqs() {
    try {
        var { data, error } = await supabase
            .from('cleverment_faqs')
            .select('*')
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true });
        if (error) return [];
        return data || [];
    } catch (e) {
        return [];
    }
}

function explainFaqSeedError(message) {
    if (/row-level security|permission denied|rls/i.test(message || '')) {
        return 'Could not load FAQs: Row Level Security is still blocking writes on the cleverment_faqs table. Go to that table in Supabase and turn OFF "Enable RLS" (Table Editor -> cleverment_faqs -> the RLS toggle near the top), then reopen this page.';
    }
    return 'Could not load FAQs (' + message + '). Please check the cleverment_faqs table exists in Supabase with the right columns, then try again.';
}

async function openFaqPage() {
    // Remember what was visible so the Back button can return to it.
    var sections = ['landingPage', 'studentAccess', 'studentAssessmentView', 'teacherAuth', 'teacherDashboard', 'adminAuth', 'adminDashboard'];
    faqPreviousPageState = null;
    for (var i = 0; i < sections.length; i++) {
        var el = document.getElementById(sections[i]);
        if (el && el.style.display === 'block') {
            faqPreviousPageState = sections[i];
            el.style.display = 'none';
        }
    }

    document.getElementById('faqPage').style.display = 'block';
    document.getElementById('faqSearchInput').value = '';
    faqCurrentCategory = 'teacher';
    setFaqTabStyles();

    var container = document.getElementById('faqAccordionContainer');
    container.innerHTML = '<p class="helper-text">Loading...</p>';

    var seedResult = await ensureFaqsSeeded();
    if (!seedResult.ok) {
        container.innerHTML = '<p style="color:#dc3545; font-weight:600;">' + explainFaqSeedError(seedResult.error) + '</p>';
        return;
    }
    faqCache = await loadFaqs();
    renderFaqAccordion();
}

function closeFaqPage() {
    document.getElementById('faqPage').style.display = 'none';
    if (faqPreviousPageState) {
        document.getElementById(faqPreviousPageState).style.display = 'block';
    } else {
        document.getElementById('landingPage').style.display = 'block';
    }
}

function setFaqCategory(category) {
    faqCurrentCategory = category;
    setFaqTabStyles();
    renderFaqAccordion();
}

function setFaqTabStyles() {
    var teacherTab = document.getElementById('faqTabTeacher');
    var studentTab = document.getElementById('faqTabStudent');
    if (!teacherTab || !studentTab) return;
    teacherTab.className = faqCurrentCategory === 'teacher' ? 'primary-btn' : 'secondary-btn';
    studentTab.className = faqCurrentCategory === 'student' ? 'primary-btn' : 'secondary-btn';
}

function filterFaqs() {
    renderFaqAccordion();
}

function renderFaqAccordion() {
    var container = document.getElementById('faqAccordionContainer');
    var searchTerm = document.getElementById('faqSearchInput').value.trim().toLowerCase();

    var filtered = faqCache.filter(function(f) { return f.category === faqCurrentCategory; });

    if (searchTerm) {
        filtered = filtered.filter(function(f) {
            return f.question.toLowerCase().indexOf(searchTerm) !== -1 ||
                   f.answer.toLowerCase().indexOf(searchTerm) !== -1;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="helper-text">No matching questions found. Try a different search, or use the WhatsApp link below.</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var f = filtered[i];
        var answerHtml = f.answer.split('\n').map(function(line) {
            return line ? '<p style="margin:0 0 8px 0;">' + line + '</p>' : '';
        }).join('');
        var videoHtml = f.video_url ? '<a href="' + f.video_url + '" target="_blank" rel="noopener" style="display:inline-block; margin-top:6px; color:#2d6cdf; font-weight:600; text-decoration:none;">🎥 Watch Video</a>' : '';

        html += '<div class="faq-item" style="background:white; border:1.5px solid #eef2f6; border-radius:10px; margin-bottom:10px; overflow:hidden;">' +
            '<button onclick="toggleFaqItem(' + f.id + ')" style="width:100%; text-align:left; background:none; border:none; padding:14px 16px; font-weight:600; font-size:15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; color:#1a1a2e;">' +
            '<span>' + f.question + '</span><span id="faqChevron' + f.id + '" style="margin-left:10px; color:#6b7a8f;">▼</span></button>' +
            '<div id="faqAnswer' + f.id + '" style="display:none; padding:0 16px 16px; color:#4a5568; font-size:14px; line-height:1.5;">' + answerHtml + videoHtml + '</div>' +
            '</div>';
    }
    container.innerHTML = html;
}

function toggleFaqItem(id) {
    var answerEl = document.getElementById('faqAnswer' + id);
    var chevronEl = document.getElementById('faqChevron' + id);
    var isOpen = answerEl.style.display === 'block';
    answerEl.style.display = isOpen ? 'none' : 'block';
    chevronEl.textContent = isOpen ? '▼' : '▲';
}

// ============================================================
// ADMIN: MANAGE FAQs
// ============================================================

var adminFaqCache = [];
var adminFaqEditingId = null;

async function renderAdminFaqList() {
    var container = document.getElementById('adminFaqList');
    if (!container) return;
    container.innerHTML = '<p class="helper-text">Loading...</p>';

    var seedResult = await ensureFaqsSeeded();
    if (!seedResult.ok) {
        container.innerHTML = '<p style="color:#dc3545; font-weight:600;">' + explainFaqSeedError(seedResult.error) + '</p>';
        return;
    }
    adminFaqCache = await loadFaqs();

    var teacherFaqs = adminFaqCache.filter(function(f) { return f.category === 'teacher'; });
    var studentFaqs = adminFaqCache.filter(function(f) { return f.category === 'student'; });

    var html = '<h4 style="margin:0 0 8px 0;">Teacher FAQs (' + teacherFaqs.length + ')</h4>';
    html += buildAdminFaqRows(teacherFaqs);
    html += '<h4 style="margin:16px 0 8px 0;">Student FAQs (' + studentFaqs.length + ')</h4>';
    html += buildAdminFaqRows(studentFaqs);

    container.innerHTML = html;
}

function buildAdminFaqRows(list) {
    if (list.length === 0) return '<p class="helper-text">None yet.</p>';
    var html = '';
    for (var i = 0; i < list.length; i++) {
        var f = list[i];
        html += '<div style="background:white; padding:10px 14px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">' +
            '<span style="flex:1; min-width:180px;">' + f.question + (f.video_url ? ' 🎥' : '') + '</span>' +
            '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
            '<button onclick="moveFaqEntry(' + f.id + ', \'up\')" class="secondary-btn" style="font-size:12px; padding:4px 10px;">↑</button>' +
            '<button onclick="moveFaqEntry(' + f.id + ', \'down\')" class="secondary-btn" style="font-size:12px; padding:4px 10px;">↓</button>' +
            '<button onclick="openFaqEditForm(' + f.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 10px;">Edit</button>' +
            '<button onclick="deleteFaqEntry(' + f.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 10px; background:#dc3545; color:white;">Delete</button>' +
            '</div></div>';
    }
    return html;
}

function openFaqAddForm() {
    adminFaqEditingId = null;
    document.getElementById('faqFormTitle').textContent = 'Add New FAQ';
    document.getElementById('faqFormCategory').value = 'teacher';
    document.getElementById('faqFormQuestion').value = '';
    document.getElementById('faqFormAnswer').value = '';
    document.getElementById('faqFormVideoUrl').value = '';
    document.getElementById('faqFormOverlay').style.display = 'flex';
}

function openFaqEditForm(id) {
    var entry = adminFaqCache.filter(function(f) { return f.id === id; })[0];
    if (!entry) return;
    adminFaqEditingId = id;
    document.getElementById('faqFormTitle').textContent = 'Edit FAQ';
    document.getElementById('faqFormCategory').value = entry.category;
    document.getElementById('faqFormQuestion').value = entry.question;
    document.getElementById('faqFormAnswer').value = entry.answer;
    document.getElementById('faqFormVideoUrl').value = entry.video_url || '';
    document.getElementById('faqFormOverlay').style.display = 'flex';
}

function closeFaqForm() {
    document.getElementById('faqFormOverlay').style.display = 'none';
}

async function saveFaqForm() {
    var category = document.getElementById('faqFormCategory').value;
    var question = document.getElementById('faqFormQuestion').value.trim();
    var answer = document.getElementById('faqFormAnswer').value.trim();
    var videoUrl = document.getElementById('faqFormVideoUrl').value.trim();

    if (!question || !answer) {
        alert('Please fill in both the question and the answer.');
        return;
    }

    try {
        if (adminFaqEditingId) {
            var { error } = await supabase
                .from('cleverment_faqs')
                .update({ category: category, question: question, answer: answer, video_url: videoUrl || null })
                .eq('id', adminFaqEditingId);
            if (error) { alert('Error: ' + error.message); return; }
        } else {
            var maxOrder = adminFaqCache.filter(function(f) { return f.category === category; })
                .reduce(function(max, f) { return Math.max(max, f.sort_order || 0); }, -1);
            var { error: insertError } = await supabase
                .from('cleverment_faqs')
                .insert([{ category: category, question: question, answer: answer, video_url: videoUrl || null, sort_order: maxOrder + 1 }]);
            if (insertError) { alert('Error: ' + insertError.message); return; }
        }
        closeFaqForm();
        renderAdminFaqList();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function deleteFaqEntry(id) {
    if (!confirm('Delete this FAQ? This cannot be undone.')) return;
    try {
        var { error } = await supabase.from('cleverment_faqs').delete().eq('id', id);
        if (error) { alert('Error: ' + error.message); return; }
        renderAdminFaqList();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function moveFaqEntry(id, direction) {
    var entry = adminFaqCache.filter(function(f) { return f.id === id; })[0];
    if (!entry) return;
    var siblings = adminFaqCache.filter(function(f) { return f.category === entry.category; })
        .sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var index = siblings.findIndex(function(f) { return f.id === id; });
    var swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    var other = siblings[swapIndex];
    var thisOrder = entry.sort_order || 0;
    var otherOrder = other.sort_order || 0;

    try {
        await supabase.from('cleverment_faqs').update({ sort_order: otherOrder }).eq('id', entry.id);
        await supabase.from('cleverment_faqs').update({ sort_order: thisOrder }).eq('id', other.id);
        renderAdminFaqList();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// ============================================================
// EMAILJS CONNECTION (for teacher password reset emails)
// ============================================================

var EMAILJS_PUBLIC_KEY = 'TYGhhsvmb4Qa-ng08';
var EMAILJS_SERVICE_ID = 'service_ukp1egq';
var EMAILJS_TEMPLATE_ID = 'template_q8w0apk';

// ============================================================
// BACKEND API (teacher/admin auth + Flutterwave payments)
// Everything else in this file still talks to Supabase directly.
// ============================================================

var BACKEND_URL = 'https://clevermentcbt-backend.onrender.com';
// Wake the free-plan server early so the first CleverBot message is not slow.
try { fetch(BACKEND_URL + '/', { mode: 'no-cors', cache: 'no-store' }).catch(function(){}); } catch (e) {}


if (typeof emailjs !== 'undefined' && emailjs.init) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
} else {
    console.error('EmailJS failed to load - password reset emails will not send.');
}

// ============================================================
// TEACHER ACTIVITY LOG
// ============================================================

async function logTeacherActivity(teacherEmail, action, details) {
    try {
        var activityDetails = details || '';
        if (adminActAsTeacher || (function(){ try { return !!localStorage.getItem('cleverment_admin_act_as_teacher'); } catch(e) { return false; } })()) {
            activityDetails = '[ADMIN ACTION ON BEHALF OF ' + String(teacherEmail || adminActAsTeacher || '').toLowerCase() + '] ' + activityDetails;
        }
        await supabase
            .from('cleverment_teacher_activity')
            .insert([{
                teacher_email: teacherEmail,
                action: action,
                details: activityDetails,
                created_at: new Date().toISOString()
            }]);
    } catch(e) { console.error('Activity log error:', e); }
}

// ============================================================
// CSV HISTORY FUNCTIONS
// ============================================================

async function saveCSVHistory(teacherEmail, filename, questions, subject, className, settings) {
    try {
        var row = {
            teacher_email: teacherEmail,
            filename: filename,
            question_count: questions.length,
            subject: subject,
            class_name: className,
            file_content: questions,
            created_at: new Date().toISOString()
        };
        // Settings (time, pass mark, shuffle...) are stored too so "Use Again"
        // can restore the whole assessment. If the database column has not been
        // added yet, fall back to saving without it.
        var result = await supabase
            .from('cleverment_csv_history')
            .insert([Object.assign({}, row, { settings: settings || null })]);
        if (result && result.error) {
            await supabase.from('cleverment_csv_history').insert([row]);
        }
    } catch(e) { console.error('CSV history error:', e); }
}

async function getCSVHistory(teacherEmail) {
    try {
        var { data, error } = await supabase
            .from('cleverment_csv_history')
            .select('*')
            .eq('teacher_email', teacherEmail)
            .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
    } catch(e) { return []; }
}

async function deleteCSVHistory(id) {
    try {
        var { error } = await supabase
            .from('cleverment_csv_history')
            .delete()
            .eq('id', id);
        return !error;
    } catch(e) { return false; }
}

async function getCSVHistoryById(id) {
    try {
        var { data, error } = await supabase
            .from('cleverment_csv_history')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) return null;
        return data;
    } catch(e) { return null; }
}

// ============================================================
// RENDER CSV HISTORY
// ============================================================

function renderCSVHistory() {
    var container = document.getElementById('csvHistoryList');
    if (!container) return;
    
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    
    getCSVHistory(teacherEmail).then(function(history) {
        if (!history || history.length === 0) {
            container.innerHTML = '<p class="helper-text">No CSV files uploaded yet.</p>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < history.length; i++) {
            var item = history[i];
            var date = new Date(item.created_at).toLocaleString();
            html += '<div style="background:white; padding:12px 16px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                '<div><strong>' + item.filename + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + item.question_count + ' questions' + (item.subject ? ' | ' + item.subject : '') + ')</span><br><span style="color:#8a9aa8; font-size:11px;">Uploaded: ' + date + '</span></div>' +
                '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                '<button onclick="reuseCSV(' + item.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#2d6cdf; color:white;">Use Again</button>' +
                '<button onclick="deleteCSVEntry(' + item.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#dc3545; color:white;">Delete</button>' +
                '</div></div>';
        }
        container.innerHTML = html;
    });
}

function setSelectValueEnsuringOption(selectEl, value, label) {
    if (!selectEl) return;
    var found = false;
    for (var i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === String(value)) { found = true; break; }
    }
    if (!found) {
        var opt = document.createElement('option');
        opt.value = String(value);
        opt.textContent = label || String(value);
        selectEl.appendChild(opt);
    }
    selectEl.value = String(value);
}

// Puts every saved publish setting back into the publish form.
function applyTeacherPublishSettings(st) {
    if (!st) return;
    if (document.getElementById('teacherTimerSelect') && st.timeLimit !== undefined && st.timeLimit !== null) {
        cmTpSet('teacherTimerSelect', Math.round(Number(st.timeLimit) / 60));
    }
    var pass = document.getElementById('teacherPassMark');
    if (pass && st.passMark !== undefined && st.passMark !== null) pass.value = st.passMark;
    var map = {
        teacherShuffleQuestions: 'shuffle',
        teacherCameraMonitoring: 'cameraMonitoring',
        teacherNoiseMonitoring: 'noiseMonitoring',
        teacherShowResults: 'showResults'
    };
    for (var id in map) {
        var el = document.getElementById(id);
        if (el && st[map[id]] !== undefined && st[map[id]] !== null) el.checked = !!st[map[id]];
    }
    var nameInput = document.getElementById('teacherCertName');
    if (nameInput && st.certName) nameInput.value = st.certName;
}

function reuseCSV(id) {
    getCSVHistoryById(id).then(function(item) {
        if (!item || !item.file_content) {
            alert('Could not load this saved assessment. Please try again.');
            return;
        }
        teacherQuestions = JSON.parse(JSON.stringify(item.file_content));
        var fileInput = document.getElementById('teacherCsvFile');
        if (fileInput) fileInput.value = '';

        if (item.subject) {
            var subjectSelect = document.getElementById('teacherSubjectSelect');
            var customSubject = document.getElementById('teacherCustomSubject');
            var found = false;
            for (var i = 0; i < subjectSelect.options.length; i++) {
                if (subjectSelect.options[i].value === item.subject) {
                    subjectSelect.value = item.subject;
                    found = true;
                    break;
                }
            }
            if (!found) {
                subjectSelect.value = 'Other';
                customSubject.value = item.subject;
                document.querySelector('.custom-subject-wrapper-teacher').style.display = 'block';
            } else {
                document.querySelector('.custom-subject-wrapper-teacher').style.display = 'none';
            }
        }

        if (item.class_name) {
            var classSelect = document.getElementById('teacherClassSelect');
            var customClass = document.getElementById('teacherCustomClass');
            var foundClass = false;
            for (var j = 0; j < classSelect.options.length; j++) {
                if (classSelect.options[j].value === item.class_name) {
                    classSelect.value = item.class_name;
                    foundClass = true;
                    break;
                }
            }
            if (!foundClass) {
                classSelect.value = 'Other';
                customClass.value = item.class_name;
                document.querySelector('.custom-class-wrapper-teacher').style.display = 'block';
            } else {
                document.querySelector('.custom-class-wrapper-teacher').style.display = 'none';
            }
        }

        applyTeacherPublishSettings(item.settings);

        // Take the teacher straight to the publish form with everything filled in.
        var note = document.getElementById('teacherLoadedSourceNote');
        if (note) {
            note.textContent = '\u2713 Loaded "' + item.filename + '" with ' + teacherQuestions.length + ' questions' +
                (item.settings ? ' and all its saved settings' : ' (older upload: only subject and class were saved)') +
                '. No file needed - review and tap Publish Assessment.';
            note.style.display = 'block';
        }
        var navBtn = document.querySelector('#teacherDashboard [data-target="uploadSection"]');
        showTeacherSection('uploadSection', navBtn || undefined);
        if (note && note.scrollIntoView) {
            setTimeout(function() { note.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
        }
    });
}

function deleteCSVEntry(id) {
    if (!confirm('Delete this CSV history entry?')) return;
    deleteCSVHistory(id).then(function(success) {
        if (success) {
            renderCSVHistory();
            alert('Deleted successfully.');
        } else {
            alert('Failed to delete.');
        }
    });
}

// ============================================================
// GLOBAL VARIABLES
// ============================================================

var currentAssessment = null;
var currentAssessmentCode = '';
var studentQuestions = [];
var studentCurrentIndex = 0;
var studentAnswers = [];
var studentTimerInterval = null;
var studentTimeRemaining = 0;
var studentTimeLimit = 0;
var studentQuizStartedAt = 0;
var studentFastAnswerWarnings = 0;
var studentQuestionShownAt = 0;
var studentRecentPickGaps = [];
var studentFastWarningOpen = false;
var studentProgressTimer = null;
var studentProgressDebounce = null;
var studentQuizEndsAt = 0;
var studentName = '';
var studentAdmissionNumber = '';
var preloadedImageCache = {};
var studentTabSwitchCount = 0;
var studentProctorStrikes = 0;
var proctorMediaStream = null;
var proctorFaceCheckInterval = null;
var proctorAudioCheckInterval = null;
var proctorAudioContext = null;
var proctorConsecutiveNoFace = 0;
var proctorConsecutiveLoudNoise = 0;
var faceApiReady = false;
var studentEndReason = 'normal';
var studentClass = '';
var studentSubject = '';
var studentIsTimeUp = false;
var studentScore = 0;
var studentCorrect = 0;
var studentTotal = 0;
var studentTimeTaken = '';

var teacherQuestions = [];
var currentTeacher = null;
var publishedAssessments = [];

// ============================================================
// LANDING PAGE NAVIGATION
// ============================================================

function backToLanding() {
    var sections = ['#landingPage', '#studentAccess', '#studentAssessmentView', '#teacherAuth', '#teacherDashboard', '#adminAuth', '#adminDashboard'];
    for (var i = 0; i < sections.length; i++) {
        var el = document.querySelector(sections[i]);
        if (el) el.style.display = 'none';
    }
    document.getElementById('landingPage').style.display = 'block';
    updateURL('landing');
}

function showStudentAccess() {
    var sections = ['#landingPage', '#studentAccess', '#studentAssessmentView', '#teacherAuth', '#teacherDashboard', '#adminAuth', '#adminDashboard'];
    for (var i = 0; i < sections.length; i++) {
        var el = document.querySelector(sections[i]);
        if (el) el.style.display = 'none';
    }
    document.getElementById('studentAccess').style.display = 'block';
    document.getElementById('assessmentCode').value = '';
    updateURL('student');
}

function showTeacherLogin() {
    if (currentTeacher && localStorage.getItem('cleverment_teacher_token')) {
        showPageFromURL('teacher-dashboard');
        updateURL('teacher-dashboard');
        return;
    }
    var sections = ['#landingPage', '#studentAccess', '#studentAssessmentView', '#teacherAuth', '#teacherDashboard', '#adminAuth', '#adminDashboard'];
    for (var i = 0; i < sections.length; i++) {
        var el = document.querySelector(sections[i]);
        if (el) el.style.display = 'none';
    }
    document.getElementById('teacherAuth').style.display = 'block';
    showTeacherLoginForm();
    updateURL('teacher');
}

function showAdminLogin() {
    if (localStorage.getItem('cleverment_admin_session') === 'true' && localStorage.getItem('cleverment_admin_token')) {
        showPageFromURL('admin-dashboard');
        updateURL('admin-dashboard');
        return;
    }
    var sections = ['#landingPage', '#studentAccess', '#studentAssessmentView', '#teacherAuth', '#teacherDashboard', '#adminAuth', '#adminDashboard'];
    for (var i = 0; i < sections.length; i++) {
        var el = document.querySelector(sections[i]);
        if (el) el.style.display = 'none';
    }
    document.getElementById('adminAuth').style.display = 'block';
    document.getElementById('adminPassword').value = '';
    updateURL('admin');
}

// ============================================================
// TEACHER LOGIN/SIGNUP TOGGLE
// ============================================================

function showTeacherLoginForm() {
    document.getElementById('teacherLoginForm').style.display = 'block';
    document.getElementById('teacherSignupForm').style.display = 'none';
    document.getElementById('teacherForgotPasswordForm').style.display = 'none';
    document.getElementById('teacherResetPasswordForm').style.display = 'none';
    document.getElementById('teacherReactivateForm').style.display = 'none';
    document.getElementById('paymentCallbackSection').style.display = 'none';
    document.getElementById('teacherAuthTabs').style.display = 'flex';
    document.getElementById('teacherLoginTab').className = 'primary-btn';
    document.getElementById('teacherSignupTab').className = 'secondary-btn';
}

function showTeacherSignupForm() {
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'block';
    document.getElementById('teacherForgotPasswordForm').style.display = 'none';
    document.getElementById('teacherResetPasswordForm').style.display = 'none';
    document.getElementById('teacherReactivateForm').style.display = 'none';
    document.getElementById('paymentCallbackSection').style.display = 'none';
    document.getElementById('teacherAuthTabs').style.display = 'flex';
    document.getElementById('teacherLoginTab').className = 'secondary-btn';
    document.getElementById('teacherSignupTab').className = 'primary-btn';
}

function showForgotPasswordForm() {
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'none';
    document.getElementById('teacherResetPasswordForm').style.display = 'none';
    document.getElementById('teacherReactivateForm').style.display = 'none';
    document.getElementById('paymentCallbackSection').style.display = 'none';
    document.getElementById('teacherForgotPasswordForm').style.display = 'block';
    document.getElementById('teacherAuthTabs').style.display = 'none';
}

var pendingReactivationEmail = null;

async function showReactivationForm() {
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'none';
    document.getElementById('teacherForgotPasswordForm').style.display = 'none';
    document.getElementById('teacherResetPasswordForm').style.display = 'none';
    document.getElementById('paymentCallbackSection').style.display = 'none';
    document.getElementById('teacherReactivateForm').style.display = 'block';
    document.getElementById('teacherAuthTabs').style.display = 'none';

    try {
        var { data } = await supabase
            .from('cleverment_settings')
            .select('value')
            .eq('key', 'reactivation_fee')
            .maybeSingle();
        var fee = data && data.value ? Number(data.value) : 2500;
        document.getElementById('reactivateFeeDisplay').textContent = '₦' + fee.toLocaleString();
    } catch (e) {
        // Leave the default ₦2,500 shown if this lookup fails.
    }
}

async function startReactivationPayment() {
    var token = localStorage.getItem('cleverment_teacher_token');
    if (!token) {
        alert('Please log in again to reactivate your account.');
        showTeacherLoginForm();
        return;
    }

    var btn = document.getElementById('teacherReactivateBtn');
    btn.disabled = true;
    btn.textContent = 'Preparing payment...';

    try {
        var res = await fetch(BACKEND_URL + '/api/payment/initiate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Could not start payment. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Pay Now to Reactivate';
            return;
        }

        window.location.href = data.link;
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again.');
        btn.disabled = false;
        btn.textContent = 'Pay Now to Reactivate';
    }
}

async function checkForPaymentCallback() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('page') !== 'payment-callback') return false;

    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('teacherAuth').style.display = 'block';
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'none';
    document.getElementById('teacherForgotPasswordForm').style.display = 'none';
    document.getElementById('teacherResetPasswordForm').style.display = 'none';
    document.getElementById('teacherReactivateForm').style.display = 'none';
    document.getElementById('teacherAuthTabs').style.display = 'none';
    document.getElementById('paymentCallbackSection').style.display = 'block';

    var titleEl = document.getElementById('paymentCallbackTitle');
    var msgEl = document.getElementById('paymentCallbackMessage');
    var backBtn = document.getElementById('paymentCallbackBackBtn');

    var status = params.get('status');
    var transactionId = params.get('transaction_id');

    if (status !== 'successful' || !transactionId) {
        titleEl.textContent = 'Payment Not Completed';
        msgEl.textContent = 'It looks like the payment was cancelled or did not go through. You can try again from the login screen.';
        backBtn.style.display = 'block';
        return true;
    }

    try {
        var res = await fetch(BACKEND_URL + '/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: transactionId })
        });
        var data = await res.json();

        if (res.ok && data.success) {
            titleEl.textContent = 'Payment Successful!';
            msgEl.textContent = 'Your account has been reactivated. You can now log in as usual.';
        } else {
            titleEl.textContent = 'Could Not Verify Payment';
            msgEl.textContent = (data.error || 'Something went wrong verifying your payment.') + ' If you were charged, please contact support.';
        }
    } catch (e) {
        titleEl.textContent = 'Could Not Verify Payment';
        msgEl.textContent = 'Could not reach the server to verify your payment. If you were charged, please try refreshing this page in a moment.';
    }

    backBtn.style.display = 'block';
    return true;
}

// ============================================================
// PASSWORD VISIBILITY TOGGLE
// ============================================================

function togglePasswordVisibility(inputId, buttonId) {
    var input = document.getElementById(inputId);
    var button = document.getElementById(buttonId);
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = 'Hide';
    } else {
        input.type = 'password';
        button.textContent = 'Show';
    }
}

// ============================================================
// DOM CONTENT LOADED
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    var savedTeacherSession = localStorage.getItem('cleverment_teacher_session');
    if (savedTeacherSession) {
        try {
            currentTeacher = JSON.parse(savedTeacherSession);
        } catch (e) {
            currentTeacher = null;
        }
    }

    var teacherClassSelect = document.getElementById('teacherClassSelect');
    var teacherCustomWrapper = document.querySelector('.custom-class-wrapper-teacher');
    var teacherCustomInput = document.getElementById('teacherCustomClass');
    if (teacherClassSelect) {
        teacherClassSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                teacherCustomWrapper.style.display = 'block';
                teacherCustomInput.focus();
            } else {
                teacherCustomWrapper.style.display = 'none';
                teacherCustomInput.value = '';
            }
        });
    }

    var rosterClassSelect = document.getElementById('rosterClassSelect');
    var rosterCustomWrapper = document.querySelector('.custom-class-wrapper-roster');
    var rosterCustomInput = document.getElementById('rosterCustomClass');
    if (rosterClassSelect) {
        rosterClassSelect.addEventListener('change', async function() {
            var statusEl = document.getElementById('rosterUploadStatus');
            statusEl.style.display = 'none';
            document.getElementById('rosterEditStatus').style.display = 'none';

            if (this.value === 'Other') {
                rosterCustomWrapper.style.display = 'block';
                rosterCustomInput.focus();
                document.getElementById('rosterEditWrapper').style.display = 'none';
                return;
            }
            rosterCustomWrapper.style.display = 'none';
            rosterCustomInput.value = '';
            var className = this.value;
            if (!className) {
                document.getElementById('rosterEditWrapper').style.display = 'none';
                return;
            }

            await loadRosterForEditing(className);
        });
    }

    if (rosterCustomInput) {
        rosterCustomInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') { event.preventDefault(); loadCustomRosterClass(); }
        });
        rosterCustomInput.addEventListener('change', function() {
            // Keep the class name editable; loading is explicit to avoid querying on every keystroke.
        });
    }

    var teacherSubjectSelect = document.getElementById('teacherSubjectSelect');
    var teacherSubjWrapper = document.querySelector('.custom-subject-wrapper-teacher');
    var teacherSubjInput = document.getElementById('teacherCustomSubject');
    if (teacherSubjectSelect) {
        teacherSubjectSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                teacherSubjWrapper.style.display = 'block';
                teacherSubjInput.focus();
            } else {
                teacherSubjWrapper.style.display = 'none';
                teacherSubjInput.value = '';
            }
        });
        teacherSubjectSelect.addEventListener('input', function() {
            var options = this.querySelectorAll('option');
            var found = false;
            options.forEach(function(opt) {
                if (opt.value.toLowerCase() === this.value.toLowerCase()) {
                    found = true;
                }
            }.bind(this));
            if (!found && this.value.trim() !== '') {
                teacherSubjWrapper.style.display = 'block';
                teacherSubjInput.value = this.value;
            } else if (!found && this.value.trim() === '') {
                teacherSubjWrapper.style.display = 'none';
                teacherSubjInput.value = '';
            }
        });
    }

    var signatureInput = document.getElementById('teacherCertSignature');
    if (signatureInput) {
        signatureInput.addEventListener('change', handleSignatureFileChosen);
    }

    // Choosing a different CSV file means the teacher no longer wants the
    // questions loaded from CSV history / question bank.
    var csvFileInput = document.getElementById('teacherCsvFile');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                teacherQuestions = [];
                var note = document.getElementById('teacherLoadedSourceNote');
                if (note) note.style.display = 'none';
            }
        });
    }

    loadTeachers();
    populateTeacherQuestionBankSelect();
    renderTeacherPublishedList();
    renderAdminTeacherList();

    var tClass = document.getElementById('teacherAdminFilterClass');
    var tSubject = document.getElementById('teacherAdminFilterSubject');
    var tSort = document.getElementById('teacherAdminFilterSort');
    if (tClass) tClass.addEventListener('change', applyTeacherFilters);
    if (tSubject) tSubject.addEventListener('change', applyTeacherFilters);
    if (tSort) tSort.addEventListener('change', applyTeacherFilters);

    var aTeacher = document.getElementById('adminResultsFilterTeacher');
    var aClass = document.getElementById('adminResultsFilterClass');
    var aSubject = document.getElementById('adminResultsFilterSubject');
    if (aTeacher) aTeacher.addEventListener('change', applyAdminFilters);
    if (aClass) aClass.addEventListener('change', applyAdminFilters);
    if (aSubject) aSubject.addEventListener('change', applyAdminFilters);

    var aAssessmentTeacher = document.getElementById('adminAssessmentFilterTeacher');
    if (aAssessmentTeacher) aAssessmentTeacher.addEventListener('change', applyAdminAssessmentFilter);

    var codeInputEl = document.getElementById('assessmentCode');
    if (codeInputEl) {
        codeInputEl.addEventListener('input', function() {
            var raw = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
            var formatted = raw;
            if (raw.length > 6) {
                formatted = raw.slice(0, 3) + '-' + raw.slice(3, 6) + '-' + raw.slice(6);
            } else if (raw.length > 3) {
                formatted = raw.slice(0, 3) + '-' + raw.slice(3);
            }
            this.value = formatted;
        });
    }

    var codeFromURL = getCodeFromURL();

    checkForPaymentCallback().then(function(paymentHandled) {
        if (paymentHandled) return;

        checkForPasswordResetToken().then(function(handled) {
            if (handled) return;

            restoreQuizState().then(function(quizWasRestored) {
                if (!quizWasRestored) {
                    var page = getPageFromURL();
                    if (page) showPageFromURL(page);
                    else if (!getCodeFromURL()) resumeSignedInDashboard();
                    // A student opening the shared assessment link. This now runs
                    // only AFTER the saved-attempt check, so it can never cover
                    // up (or reset) an assessment that is already in progress.
                    if (codeFromURL) {
                        var codeInput = document.getElementById('assessmentCode');
                        if (codeInput) codeInput.value = codeFromURL;
                        verifyAssessmentCode();
                    }
                }
            });
        });
    });
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (document.getElementById('studentAccess').style.display === 'block') {
            verifyAssessmentCode();
        }
        if (document.getElementById('adminAuth').style.display === 'block') {
            adminLogin();
        }
    }
});

// ============================================================
// TEACHER AUTHENTICATION
// ============================================================
// Signup, login, password reset, and admin login all now go
// through the backend server (see BACKEND_URL above), which
// handles password hashing and issues a session token. This
// replaced the old client-side bcrypt setup entirely - nothing
// password-related happens in the browser anymore.
// ============================================================

// ============================================================
// FORGOT PASSWORD (teachers) - generates a random, time-limited
// token, emails a reset link via EmailJS, and validates that
// token when the teacher opens the link.
// ============================================================

function generateResetToken() {
    var bytes = new Uint8Array(24);
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(bytes);
    } else {
        for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var token = '';
    for (var j = 0; j < bytes.length; j++) {
        token += bytes[j].toString(16).padStart(2, '0');
    }
    return token;
}

async function requestPasswordReset() {
    var emailInput = document.getElementById('teacherForgotEmail');
    var btn = document.getElementById('teacherForgotSubmitBtn');
    var email = emailInput.value.trim().toLowerCase();

    if (!email) {
        alert('Please enter your email.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        var res = await fetch(BACKEND_URL + '/api/auth/teacher/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Something went wrong. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
            return;
        }

        // The backend only includes resetToken/email when an account
        // actually exists - if it doesn't, we still show the same
        // generic success message below either way.
        if (data.resetToken) {
            var resetLink = window.location.origin + window.location.pathname + '?page=reset-password&token=' + data.resetToken;

            if (typeof emailjs === 'undefined') {
                alert('The email-sending library failed to load (check your internet connection), so no reset email could be sent. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Send Reset Link';
                return;
            }

            try {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                    email: data.email,
                    link: resetLink
                });
            } catch (emailError) {
                console.error('EmailJS send failed:', emailError);
                var emailErrMsg = (emailError && (emailError.text || emailError.message)) || 'Unknown error';
                alert('The reset link was created, but the email could not be sent (' + emailErrMsg + '). Please try again, or contact your admin if this keeps happening.');
                btn.disabled = false;
                btn.textContent = 'Send Reset Link';
                return;
            }
        }

        alert('If an account exists with that email, a reset link has been sent. Please check your inbox (and spam folder).');
        showTeacherLoginForm();
    } catch (e) {
        console.error('Password reset request failed:', e);
        alert('Could not reach the server. Please check your connection and try again.');
    }

    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
}

var pendingResetToken = null;

async function checkForPasswordResetToken() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');
    if (params.get('page') !== 'reset-password' || !token) return false;

    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('teacherAuth').style.display = 'block';
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'none';
    document.getElementById('teacherForgotPasswordForm').style.display = 'none';
    document.getElementById('teacherReactivateForm').style.display = 'none';
    document.getElementById('paymentCallbackSection').style.display = 'none';
    document.getElementById('teacherAuthTabs').style.display = 'none';

    pendingResetToken = token;
    document.getElementById('teacherResetPasswordForm').style.display = 'block';
    return true;
}

async function submitNewPassword() {
    var pass = document.getElementById('teacherNewPassword').value;
    var confirmPass = document.getElementById('teacherNewPasswordConfirm').value;
    var btn = document.getElementById('teacherResetSubmitBtn');

    if (!pendingResetToken) {
        alert('This reset link is no longer valid. Please request a new one.');
        return;
    }
    if (!pass || pass.length < 6) {
        alert('Please enter a password (at least 6 characters).');
        return;
    }
    if (pass !== confirmPass) {
        alert('Passwords do not match.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        var res = await fetch(BACKEND_URL + '/api/auth/teacher/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: pendingResetToken, newPassword: pass })
        });
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Could not reset your password. Please request a new link.');
            btn.disabled = false;
            btn.textContent = 'Set New Password';
            return;
        }

        alert('Password updated! You can now log in with your new password.');
        pendingResetToken = null;
        updateURL('teacher');
        showPageFromURL('teacher');
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again.');
        btn.disabled = false;
        btn.textContent = 'Set New Password';
        btn.disabled = false;
        btn.textContent = 'Set New Password';
    }
}

async function teacherSignup() {
    var name = document.getElementById('teacherSignupName').value.trim();
    var email = document.getElementById('teacherSignupEmail').value.trim();
    var password = document.getElementById('teacherSignupPassword').value;
    var confirm = document.getElementById('teacherSignupConfirm').value;

    if (!name) { alert('Please enter your full name.'); return; }
    if (!email) { alert('Please enter your email.'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { alert('Passwords do not match.'); return; }

    try {
        var res = await fetch(BACKEND_URL + '/api/auth/teacher/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, email: email, password: password })
        });
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Could not create your account. Please try again.');
            return;
        }

        alert('Account created successfully! You can now login.');
        logTeacherActivity(email, 'signup', 'Teacher account created');

        showTeacherLoginForm();
        document.getElementById('teacherLoginEmail').value = email;
        document.getElementById('teacherLoginPassword').value = '';
        document.getElementById('teacherSignupName').value = '';
        document.getElementById('teacherSignupEmail').value = '';
        document.getElementById('teacherSignupPassword').value = '';
        document.getElementById('teacherSignupConfirm').value = '';
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again (the server may take up to a minute to wake up if it has been idle).');
    }
}

async function teacherLogin() {
    var email = document.getElementById('teacherLoginEmail').value.trim();
    var password = document.getElementById('teacherLoginPassword').value;

    if (!email || !password) {
        alert('Please enter your email and password.');
        return;
    }

    var loginBtn = document.querySelector('#teacherLoginForm button.primary-btn');
    if (loginBtn) loginBtn.textContent = 'Logging in...';

    try {
        var res = await fetch(BACKEND_URL + '/api/auth/teacher/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });
        var data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Invalid email or password.');
            return;
        }

        if (data.paused) {
            localStorage.setItem('cleverment_teacher_token', data.token);
            pendingReactivationEmail = email;
            showReactivationForm();
            return;
        }

        currentTeacher = data.teacher;
        localStorage.setItem('cleverment_teacher_session', JSON.stringify(currentTeacher));
        localStorage.setItem('cleverment_teacher_token', data.token);

        logTeacherActivity(email, 'login', 'Teacher logged in');

        document.getElementById('teacherAuth').style.display = 'none';
        document.getElementById('teacherDashboard').style.display = 'block';
        setDashboardHeaderVisible(false);
        document.getElementById('teacherDashboardName').textContent = 'Welcome, ' + currentTeacher.name + '!';
        document.getElementById('teacherDashboardEmail').textContent = currentTeacher.email;
        renderTeacherDashboard();
        renderTeacherPublishedList();
        populateTeacherQuestionBankSelect();
        renderCSVHistory();
        updateURL('teacher-dashboard');
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again (the server may take up to a minute to wake up if it has been idle).');
    } finally {
        if (loginBtn) loginBtn.textContent = 'Login';
    }
}

function teacherLogout() {
    if (adminActAsTeacher || localStorage.getItem('cleverment_admin_act_as_teacher')) {
        returnToAdminDashboard();
        return;
    }
    currentTeacher = null;
    localStorage.removeItem('cleverment_teacher_session');
    localStorage.removeItem('cleverment_teacher_token');
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('teacherAuth').style.display = 'block';
    setDashboardHeaderVisible(true);
    showTeacherLoginForm();
    document.getElementById('teacherLoginPassword').value = '';
    updateURL('teacher');
}

function loadTeachers() {}

// ============================================================
// TEACHER: QUESTION BANK
// ============================================================

// ============================================================
// CUSTOM PROMPT MODAL (replaces window.prompt(), which silently
// fails to show anything in iOS standalone/home-screen PWA mode
// and in many embedded WebViews - this is why "Save Current as
// Question Bank" looked broken)
// ============================================================

function showCustomPrompt(message, defaultValue) {
    return new Promise(function(resolve) {
        var overlay = document.getElementById('customPromptOverlay');
        var msgEl = document.getElementById('customPromptMessage');
        var input = document.getElementById('customPromptInput');
        var okBtn = document.getElementById('customPromptOK');
        var cancelBtn = document.getElementById('customPromptCancel');

        if (!overlay || !msgEl || !input || !okBtn || !cancelBtn) {
            // Fallback: modal markup missing for some reason.
            resolve(window.prompt(message, defaultValue || ''));
            return;
        }

        msgEl.textContent = message;
        input.value = defaultValue || '';
        overlay.style.display = 'flex';
        setTimeout(function() {
            input.focus();
            input.select();
        }, 50);

        function cleanup(result) {
            overlay.style.display = 'none';
            okBtn.removeEventListener('click', onOK);
            cancelBtn.removeEventListener('click', onCancel);
            input.removeEventListener('keydown', onKeydown);
            resolve(result);
        }
        function onOK() { cleanup(input.value); }
        function onCancel() { cleanup(null); }
        function onKeydown(e) {
            if (e.key === 'Enter') { onOK(); }
            else if (e.key === 'Escape') { onCancel(); }
        }

        okBtn.addEventListener('click', onOK);
        cancelBtn.addEventListener('click', onCancel);
        input.addEventListener('keydown', onKeydown);
    });
}

// ============================================================
// MATH RENDERING (KaTeX): wrap an equation in single $...$ for
// inline math, or $$...$$ for a standalone/display equation, in
// any question, option, or CSV cell. Plain Unicode symbols
// (×, ÷, √, π, ½, ², ≤, ≥) already display fine on their own and
// don't need $ delimiters.
// ============================================================

// ============================================================
// QUESTION IMAGE PRELOADING (student quiz) - warms the browser's
// image cache for every question in the assessment as soon as it
// starts, instead of only fetching an image the moment its
// question is reached. This is what fixed images taking up to a
// minute to appear mid-quiz on slow connections.
// ============================================================

function studentPreloadImages() {
    for (var i = 0; i < studentQuestions.length; i++) {
        var url = studentQuestions[i].image;
        if (url && url.trim() !== '' && !preloadedImageCache[url]) {
            var img = new Image();
            img.src = url;
            preloadedImageCache[url] = img;
        }
    }
}

function renderMathIn(el) {
    if (!el || typeof renderMathInElement !== 'function') return;
    try {
        renderMathInElement(el, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false
        });
    } catch (e) {
        // If a malformed equation slips through, leave the plain text as-is.
    }
}

var teacherQuestionBanksCache = [];

async function getQuestionBanksFromDatabase() {
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    try {
        var { data, error } = await supabase
            .from('cleverment_question_banks')
            .select('*')
            .eq('teacher_email', teacherEmail)
            .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
    } catch (e) {
        return [];
    }
}

async function populateTeacherQuestionBankSelect() {
    var select = document.getElementById('teacherQuestionBankSelect');
    if (!select) return;
    var banks = await getQuestionBanksFromDatabase();
    teacherQuestionBanksCache = banks;
    select.innerHTML = '<option value="">-- Select a saved question set --</option>';
    for (var i = 0; i < banks.length; i++) {
        var option = document.createElement('option');
        option.value = banks[i].name;
        var qCount = (banks[i].questions && banks[i].questions.length) || 0;
        option.textContent = banks[i].name + ' (' + qCount + ' questions)';
        select.appendChild(option);
    }
}

function teacherLoadFromBank() {
    var select = document.getElementById('teacherQuestionBankSelect');
    var name = select.value;
    if (!name) {
        alert('Please select a question bank to load.');
        return;
    }
    var bank = teacherQuestionBanksCache.filter(function(b) { return b.name === name; })[0];
    var data = bank ? bank.questions : null;
    if (data && data.length > 0) {
        teacherQuestions = JSON.parse(JSON.stringify(data));
        alert('Loaded ' + teacherQuestions.length + ' questions from "' + name + '". You can now publish this assessment.');
        var hint = document.querySelector('#uploadSection .helper-text');
        if (hint) {
            hint.textContent = '✓ ' + teacherQuestions.length + ' questions loaded from bank. Click "Publish Assessment" to publish.';
            hint.style.color = '#2d9c5c';
            hint.style.fontWeight = '600';
        }
    } else {
        alert('No questions found in this bank.');
    }
}

async function saveTeacherQuestionBank(name, questions) {
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    var existing = teacherQuestionBanksCache.filter(function(b) { return b.name === name; })[0];

    try {
        if (existing) {
            var { error: updateError } = await supabase
                .from('cleverment_question_banks')
                .update({ questions: questions })
                .eq('id', existing.id);
            if (updateError) throw updateError;
        } else {
            var { error: insertError } = await supabase
                .from('cleverment_question_banks')
                .insert([{ teacher_email: teacherEmail, name: name, questions: questions }]);
            if (insertError) throw insertError;
        }
        return true;
    } catch (e) {
        alert('Error saving question bank: ' + e.message);
        return false;
    }
}

async function teacherSaveToBank() {
    if (teacherQuestions.length === 0) {
        var fileInput = document.getElementById('teacherCsvFile');
        var file = fileInput.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = async function(e) {
                var parsed = parseTeacherCSV(e.target.result);
                if (parsed.length > 0) {
                    teacherQuestions = parsed;
                    var name = await showCustomPrompt('Enter a name for this question bank:', 'My Question Bank');
                    if (name && name.trim() !== '') {
                        var saved = await saveTeacherQuestionBank(name.trim(), JSON.parse(JSON.stringify(teacherQuestions)));
                        if (saved) {
                            await populateTeacherQuestionBankSelect();
                            alert('Question bank "' + name.trim() + '" saved with ' + teacherQuestions.length + ' questions.');
                            teacherQuestions = [];
                        }
                    }
                } else {
                    alert('No questions found in CSV. Please check the format.');
                }
            };
            reader.readAsText(file);
            return;
        }
        alert('No questions to save. Please upload a CSV file first.');
        return;
    }

    var name = await showCustomPrompt('Enter a name for this question bank:', 'My Question Bank');
    if (name && name.trim() !== '') {
        var saved = await saveTeacherQuestionBank(name.trim(), JSON.parse(JSON.stringify(teacherQuestions)));
        if (saved) {
            await populateTeacherQuestionBankSelect();
            alert('Question bank "' + name.trim() + '" saved with ' + teacherQuestions.length + ' questions.');
            teacherQuestions = [];
        }
    }
}

async function teacherDeleteBank() {
    var select = document.getElementById('teacherQuestionBankSelect');
    var name = select.value;
    if (!name) { alert('Please select a question bank to delete.'); return; }
    if (!confirm('Delete question bank "' + name + '"? This cannot be undone.')) return;

    var bank = teacherQuestionBanksCache.filter(function(b) { return b.name === name; })[0];
    if (!bank) { alert('Could not find that question bank.'); return; }

    try {
        var { error } = await supabase
            .from('cleverment_question_banks')
            .delete()
            .eq('id', bank.id);
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
        await populateTeacherQuestionBankSelect();
        alert('Question bank "' + name + '" deleted.');
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// ============================================================
// TEACHER: PUBLISH ASSESSMENT
// ============================================================

function parseTeacherCSV(csvText) {
    var lines = csvText.split('\n');
    var result = [];
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line === '') continue;
        var cols = [];
        var current = '';
        var inQuotes = false;
        for (var j = 0; j < line.length; j++) {
            var char = line[j];
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) {
                cols.push(current.trim());
                current = '';
            } else { current += char; }
        }
        cols.push(current.trim());
        if (cols.length >= 6) {
            result.push({
                question: cols[0].replace(/^"|"$/g, ''),
                options: [
                    cols[1].replace(/^"|"$/g, ''),
                    cols[2].replace(/^"|"$/g, ''),
                    cols[3].replace(/^"|"$/g, ''),
                    cols[4].replace(/^"|"$/g, '')
                ],
                correctAnswer: cols[5].replace(/^"|"$/g, '').toUpperCase().trim(),
                image: cols.length > 6 ? cols[6].replace(/^"|"$/g, '').trim() : '',
                explanation: cols.length > 7 ? cols[7].replace(/^"|"$/g, '').trim() : ''
            });
        }
    }
    return result;
}

function getPublishedAssessmentsLocal() {
    var stored = localStorage.getItem('cleverment_published');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { return []; }
    }
    return [];
}

async function savePublishedAssessmentToDatabase(assessment) {
    var teacherToken = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/assessments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + teacherToken
            },
            body: JSON.stringify({
                teacherName: assessment.teacherName,
                teacherSignature: assessment.teacherSignature,
                subject: assessment.subject,
                className: assessment.className,
                questions: assessment.questions,
                timeLimit: assessment.timeLimit,
                shuffle: assessment.shuffle,
                cameraMonitoring: assessment.cameraMonitoring,
                noiseMonitoring: assessment.noiseMonitoring,
                showResults: assessment.showResults,
                availableFrom: assessment.availableFrom,
                availableUntil: assessment.availableUntil,
                passMark: assessment.passMark
            })
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not publish assessment.'));
            return null;
        }
        return data.assessment.code;
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again.');
        return null;
    }
}


// ============================================================
// TEACHER PROFILE: signature + certificate name saved once
// ============================================================

var teacherProfile = { loaded: false, email: '', certName: '', signature: '' };

async function loadTeacherProfile(force) {
    var email = currentTeacher ? currentTeacher.email : '';
    var token = localStorage.getItem('cleverment_teacher_token');
    if (!email || !token) return;
    if (teacherProfile.loaded && teacherProfile.email === email && !force) {
        applyTeacherProfileToForm();
        return;
    }
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var data = await res.json();
        if (res.ok) {
            teacherProfile = {
                loaded: true,
                email: email,
                certName: data.certName || '',
                signature: data.signature || ''
            };
        }
    } catch (e) { /* offline: the form simply shows no saved signature */ }
    applyTeacherProfileToForm();
}

function applyTeacherProfileToForm() {
    var box = document.getElementById('signatureSavedBox');
    var img = document.getElementById('signaturePreviewImg');
    if (box && img) {
        if (teacherProfile.signature) {
            img.src = teacherProfile.signature;
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    }
    var nameInput = document.getElementById('teacherCertName');
    if (nameInput && !nameInput.value.trim() && teacherProfile.certName) {
        nameInput.value = teacherProfile.certName;
    }
}

async function saveTeacherProfile(fields) {
    var token = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(fields)
        });
        var data = await res.json();
        if (!res.ok) {
            alert(data.error || 'Could not save your profile.');
            return false;
        }
        return true;
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again.');
        return false;
    }
}

// Shrinks the signature image (keeps transparency) so it stays small and quick.
function prepareSignatureImage(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function() { reject(new Error('Could not read that image.')); };
        reader.onload = function(e) {
            var img = new Image();
            img.onerror = function() { reject(new Error('That file is not a valid image.')); };
            img.onload = function() {
                var maxW = 600, maxH = 240;
                var scale = Math.min(1, maxW / img.width, maxH / img.height);
                var w = Math.max(1, Math.round(img.width * scale));
                var h = Math.max(1, Math.round(img.height * scale));
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function handleSignatureFileChosen() {
    var input = this;
    var file = input.files && input.files[0];
    if (!file) return;
    try {
        if (!/^image\//i.test(file.type)) {
            alert('Please choose an image file (PNG or JPG).');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            alert('That image is too large. Please choose one under 8 MB.');
            return;
        }
        var dataUrl = await prepareSignatureImage(file);
        var ok = await saveTeacherProfile({ signature: dataUrl });
        if (ok) {
            teacherProfile.signature = dataUrl;
            teacherProfile.loaded = true;
            teacherProfile.email = currentTeacher ? currentTeacher.email : teacherProfile.email;
            applyTeacherProfileToForm();
        }
    } catch (err) {
        alert(err.message || 'Could not use that image.');
    } finally {
        input.value = '';
    }
}

async function removeSavedSignature() {
    if (!confirm('Remove your saved signature? New certificates will have no signature until you upload one again.')) return;
    var ok = await saveTeacherProfile({ signature: '' });
    if (ok) {
        teacherProfile.signature = '';
        applyTeacherProfileToForm();
    }
}

function teacherPublishAssessment() {
    var subjectSelect = document.getElementById('teacherSubjectSelect');
    var customInput = document.getElementById('teacherCustomSubject');
    var subject;
    if (subjectSelect.value === 'Other') {
        subject = customInput.value.trim();
        if (!subject) {
            alert('Please enter a custom subject name!');
            customInput.focus();
            return;
        }
    } else {
        subject = subjectSelect.value.trim();
        if (!subject) {
            alert('Please select a subject!');
            subjectSelect.focus();
            return;
        }
    }

    var classSelect = document.getElementById('teacherClassSelect');
    var customClassInput = document.getElementById('teacherCustomClass');
    var className;
    if (classSelect.value === 'Other') {
        className = customClassInput.value.trim();
        if (!className) {
            alert('Please enter a custom class name.');
            return;
        }
    } else {
        className = classSelect.value.trim();
        if (!className) {
            alert('Please select a class.');
            return;
        }
    }

    var teacherCertName = document.getElementById('teacherCertName').value.trim();

    var availableFromRaw = document.getElementById('teacherAvailableFrom').value;
    var availableUntilRaw = document.getElementById('teacherAvailableUntil').value;
    if (availableFromRaw && availableUntilRaw && new Date(availableUntilRaw) <= new Date(availableFromRaw)) {
        alert('"Available Until" must be after "Available From".');
        return;
    }

    // The signature comes from the teacher's saved profile - no upload needed
    // each time.
    function goPublish() {
        proceedWithPublish(subject, className, teacherCertName, teacherProfile.signature || '');
    }
    if (!teacherProfile.loaded) {
        loadTeacherProfile().then(goPublish);
    } else {
        goPublish();
    }
}

function proceedWithPublish(subject, className, teacherCertName, teacherSignature) {
    if (teacherQuestions.length === 0) {
        var fileInput = document.getElementById('teacherCsvFile');
        var file = fileInput.files[0];
        if (!file) {
            alert('Please upload a CSV file or load from Question Bank.');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var parsed = parseTeacherCSV(e.target.result);
            if (parsed.length > 0) {
                teacherQuestions = parsed;
                doPublish(subject, className, teacherCertName, teacherSignature);
            } else {
                alert('No questions found in CSV. Check format.');
            }
        };
        reader.readAsText(file);
        return;
    }

    doPublish(subject, className, teacherCertName, teacherSignature);
}

async function doPublish(subject, className, teacherCertName, teacherSignature) {
    if (teacherQuestions.length === 0) {
        alert('No questions available. Please upload or load questions.');
        return;
    }

    var timeLimit = parseInt(document.getElementById('teacherTimerSelect').value) * 60;
    var shuffle = document.getElementById('teacherShuffleQuestions').checked;
    var cameraMonitoring = document.getElementById('teacherCameraMonitoring').checked;
    var noiseMonitoring = document.getElementById('teacherNoiseMonitoring').checked;
    var showResults = document.getElementById('teacherShowResults').checked;
    var passMarkRaw = parseInt(document.getElementById('teacherPassMark').value);
    var passMark = (isNaN(passMarkRaw) || passMarkRaw < 0 || passMarkRaw > 100) ? 50 : passMarkRaw;
    var availableFromRaw = document.getElementById('teacherAvailableFrom').value;
    var availableUntilRaw = document.getElementById('teacherAvailableUntil').value;
    var availableFrom = availableFromRaw ? new Date(availableFromRaw).toISOString() : null;
    var availableUntil = availableUntilRaw ? new Date(availableUntilRaw).toISOString() : null;

    var assessment = {
        teacherEmail: currentTeacher ? currentTeacher.email : 'unknown',
        teacherName: teacherCertName || currentTeacher?.name || 'Unknown Teacher',
        teacherSignature: teacherSignature || '',
        subject: subject,
        className: className,
        questions: JSON.parse(JSON.stringify(teacherQuestions)),
        timeLimit: timeLimit,
        shuffle: shuffle,
        cameraMonitoring: cameraMonitoring,
        noiseMonitoring: noiseMonitoring,
        showResults: showResults,
        passMark: passMark,
        questionLimit: parseInt((document.getElementById('teacherQuestionLimit') || {}).value, 10) || 0,
        negativeMarking: Number((document.getElementById('teacherNegativeMarking') || {}).value) || 0,
        accessMode: (document.getElementById('teacherAccessMode') || {}).value || 'code',
        availableFrom: availableFrom,
        availableUntil: availableUntil
    };

    var code = await savePublishedAssessmentToDatabase(assessment);
    if (!code) return; // publish failed - the error was already shown

    logTeacherActivity(assessment.teacherEmail, 'publish_assessment', 'Published: ' + subject + ' | Class: ' + className + ' | Code: ' + code);

    if (teacherQuestions.length > 0) {
        var filename = subject + '_' + className + '_' + new Date().toISOString().slice(0,10) + '.csv';
        saveCSVHistory(assessment.teacherEmail, filename, teacherQuestions, subject, className, {
            timeLimit: timeLimit,
            shuffle: shuffle,
            cameraMonitoring: cameraMonitoring,
            noiseMonitoring: noiseMonitoring,
            showResults: showResults,
            passMark: passMark,
            certName: teacherCertName || ''
        });
    }

    var published = getPublishedAssessmentsLocal();
    published.push({
        id: Date.now(),
        code: code,
        teacherEmail: currentTeacher ? currentTeacher.email : 'unknown',
        teacherName: teacherCertName || currentTeacher?.name || 'Unknown Teacher',
        teacherSignature: teacherSignature || '',
        subject: subject,
        className: className,
        questions: JSON.parse(JSON.stringify(teacherQuestions)),
        timeLimit: timeLimit,
        shuffle: shuffle,
        cameraMonitoring: cameraMonitoring,
        noiseMonitoring: noiseMonitoring,
        showResults: showResults,
        passMark: passMark,
        availableFrom: availableFrom,
        availableUntil: availableUntil,
        date: new Date().toLocaleString()
    });
    // Cap this local backup - it's only used if the Supabase fetch
    // fails, and each entry can carry a full question set plus a
    // base64-encoded signature image, so it's the fastest thing in
    // the app to fill up a browser's storage quota if left uncapped.
    if (published.length > 20) {
        published = published.slice(published.length - 20);
    }
    localStorage.setItem('cleverment_published', JSON.stringify(published));


    teacherQuestions = [];
    document.getElementById('teacherCsvFile').value = '';
    document.getElementById('teacherSubjectSelect').value = '';
    document.getElementById('teacherCustomSubject').value = '';
    document.querySelector('.custom-subject-wrapper-teacher').style.display = 'none';
    // Remember the certificate name for next time (the signature is already saved).
    if (teacherCertName && teacherCertName !== teacherProfile.certName) {
        teacherProfile.certName = teacherCertName;
        saveTeacherProfile({ certName: teacherCertName });
    }
    document.getElementById('teacherCertName').value = teacherProfile.certName || '';
    document.getElementById('teacherCertSignature').value = '';
    var loadedNote = document.getElementById('teacherLoadedSourceNote');
    if (loadedNote) loadedNote.style.display = 'none';

    alert('Assessment published successfully!\n\nAssessment Code: ' + code + '\n\nShare this code with your students.');

    renderTeacherPublishedList();
}

// ============================================================
// TEACHER: VIEW PUBLISHED ASSESSMENTS
// ============================================================

function getMonitoringBadge(a) {
    if (!a.cameraMonitoring && !a.noiseMonitoring) return '';
    var parts = [];
    if (a.cameraMonitoring) parts.push('📷 Camera');
    if (a.noiseMonitoring) parts.push('🎙 Noise');
    return ' <span style="background:#fdecec; color:#dc3545; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">' + parts.join(' + ') + ' Monitored</span>';
}

function getAvailabilityLabel(a) {
    if (!a.availableFrom && !a.availableUntil) {
        return { text: 'Always available', color: '#6b7a8f' };
    }
    var now = new Date();
    if (a.availableFrom && now < new Date(a.availableFrom)) {
        return { text: 'Opens ' + formatDate(new Date(a.availableFrom)), color: '#e67e22' };
    }
    if (a.availableUntil && now > new Date(a.availableUntil)) {
        return { text: 'Closed since ' + formatDate(new Date(a.availableUntil)), color: '#dc3545' };
    }
    if (a.availableUntil) {
        return { text: 'Live now - closes ' + formatDate(new Date(a.availableUntil)), color: '#2d9c5c' };
    }
    return { text: 'Live now', color: '#2d9c5c' };
}

var publishedSelectedIds = {};

function publishedToggle(id, checked) {
    if (checked) publishedSelectedIds[String(id)] = true; else delete publishedSelectedIds[String(id)];
    publishedUpdateBar();
}
function publishedUpdateBar() {
    var n = Object.keys(publishedSelectedIds).length;
    var btn = document.getElementById('publishedBulkDeleteBtn');
    var all = document.getElementById('publishedSelectAll');
    if (btn) { btn.disabled = n === 0; btn.textContent = n ? 'Delete selected (' + n + ')' : 'Delete selected'; btn.style.opacity = n ? '1' : '.5'; }
    if (all) {
        var total = (teacherAssessmentsCache || []).length;
        all.checked = total > 0 && n === total;
    }
}
function publishedSelectAll(checked) {
    publishedSelectedIds = {};
    var list = teacherAssessmentsCache || [];
    if (checked) list.forEach(function(a) { publishedSelectedIds[String(a.id)] = true; });
    document.querySelectorAll('.published-pick').forEach(function(cb) { cb.checked = !!checked; });
    publishedUpdateBar();
}
async function publishedDeleteSelected() {
    var ids = Object.keys(publishedSelectedIds);
    if (!ids.length) { alert('Select at least one assessment first.'); return; }
    if (!confirm('Delete the ' + ids.length + ' selected assessment(s)? This cannot be undone.')) return;
    var teacherToken = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/assessments/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + teacherToken },
            body: JSON.stringify({ ids: ids.map(function(x) { var n = Number(x); return Number.isFinite(n) ? n : x; }) })
        });
        var data = await res.json();
        if (!res.ok) { alert('Error: ' + (data.error || 'Could not delete the assessments.')); return; }
    } catch (e) {
        alert('Could not reach the server. Please check your connection.');
        return;
    }
    publishedSelectedIds = {};
    renderTeacherPublishedList();
}

async function renderTeacherPublishedList() {
    var container = document.getElementById('teacherPublishedList');
    if (!container) return;

    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    var filtered = await getTeacherAssessmentsFromBackend();
    teacherAssessmentsCache = filtered;
    cmRefreshPublishedCharts();

    populateTeacherAnalyticsSelect(filtered);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="helper-text">No assessments published yet.</p>';
        return;
    }

    var stillThere = {};
    filtered.forEach(function(x) { stillThere[String(x.id)] = true; });
    Object.keys(publishedSelectedIds).forEach(function(k) { if (!stillThere[k]) delete publishedSelectedIds[k]; });

    var html = '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:10px;">' +
        '<label style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:14px; cursor:pointer;"><input type="checkbox" id="publishedSelectAll" onchange="publishedSelectAll(this.checked)" style="width:18px; height:18px;"> Select all</label>' +
        '<button type="button" id="publishedBulkDeleteBtn" onclick="publishedDeleteSelected()" class="secondary-btn" style="font-size:13px; padding:6px 14px; background:#dc3545; color:white; opacity:.5;" disabled>Delete selected</button></div>';
    for (var i = 0; i < filtered.length; i++) {
        var a = filtered[i];
        var timeDisplay = a.timeLimit > 0 ? Math.floor(a.timeLimit / 60) + ' min' : 'No limit';
        var avail = getAvailabilityLabel(a);
        html += '<div style="background:white; padding:12px 16px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
            '<div style="display:flex; align-items:flex-start; gap:10px;"><input type="checkbox" class="published-pick" aria-label="Select this assessment" ' + (publishedSelectedIds[String(a.id)] ? 'checked ' : '') + 'onchange="publishedToggle(' + a.id + ', this.checked)" style="width:18px; height:18px; margin-top:3px; flex:0 0 auto;"><div><strong>' + a.subject + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + a.className + ' | ' + a.questions.length + ' questions | ' + timeDisplay + ')</span>' + getMonitoringBadge(a) + '<br>' +
            '<span style="color:' + avail.color + '; font-size:12px; font-weight:600;">' + avail.text + '</span></div></div>' +
            '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
            '<span style="background:#eef6ff; padding:4px 12px; border-radius:6px; font-weight:600; font-size:13px; color:#2d6cdf;">Code: ' + a.code + '</span>' +
            '<button onclick="copyAssessmentCode(\'' + a.code + '\')" class="secondary-btn" style="font-size:12px; padding:4px 12px;">Copy Code</button>' +
            '<button onclick="shareAssessmentOnWhatsApp(' + a.id + ')" class="secondary-btn whatsapp-share-btn" aria-label="Share assessment code on WhatsApp"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg> Share</button>' +
            '<button onclick="openAssessmentEditor(' + a.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#2d6cdf; color:white;">Edit Assessment</button>' +
            '<button onclick="deletePublishedAssessment(' + a.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#dc3545; color:white;">Delete</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
    publishedUpdateBar();
}


// ============================================================
// TEACHER: EDIT PUBLISHED ASSESSMENT QUESTIONS
// ============================================================
// Edits update only the existing assessment's question set. The
// assessment ID/code and all other settings remain unchanged.
// Existing submitted results are never recalculated or modified.
var currentAssessmentBeingEdited = null;
var assessmentEditorDraftMode = false;
var assessmentImageUploadQuestionIndex = -1;


// ============================================================
// EDIT ASSESSMENT: settings panel (class, subject, certificate name, time,
// pass mark, monitoring, shuffle, show results) shown above the questions.
// ============================================================

function aeOptionsFromSource(sourceId, current) {
    var src = document.getElementById(sourceId);
    var html = '';
    var found = false;
    if (src) {
        for (var i = 0; i < src.options.length; i++) {
            var o = src.options[i];
            if (!o.value || o.value === 'Other') continue;
            var sel = (o.value === current);
            if (sel) found = true;
            html += '<option value="' + escapeAssessmentEditorHtml(o.value) + '"' + (sel ? ' selected' : '') + '>' + escapeAssessmentEditorHtml(o.textContent) + '</option>';
        }
    }
    if (!found && current) {
        html = '<option value="' + escapeAssessmentEditorHtml(current) + '" selected>' + escapeAssessmentEditorHtml(current) + '</option>' + html;
    }
    html += '<option value="__other">Other (type a new name)...</option>';
    return html;
}

function aeToggleOther(selectEl, inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    input.style.display = selectEl.value === '__other' ? 'block' : 'none';
    if (selectEl.value === '__other') input.focus();
}

function renderAssessmentEditorSettings(a) {
    var box = document.getElementById('assessmentEditorSettings');
    if (!box) return;

    var minutes = Math.round((Number(a.timeLimit) || 0) / 60);
    function toggle(id, label, desc, checked) {
        return '<label class="assessment-settings-toggle" for="' + id + '">' +
            '<span>' + label + (desc ? '<br><span style="font-weight:400; color:#6b7a8f; font-size:12px;">' + desc + '</span>' : '') + '</span>' +
            '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '></label>';
    }

    box.innerHTML =
        '<div class="assessment-settings-box">' +
            '<h4>Assessment Settings</h4>' +
            '<p class="helper-text" style="margin:0;">Change anything below, edit the questions if you like, then tap Save Changes. The assessment code stays the same.</p>' +
            '<div class="assessment-settings-grid">' +
                '<div><label for="aeSubject">Subject</label>' +
                    '<select id="aeSubject" class="form-input" onchange="aeToggleOther(this, \'aeSubjectOther\')">' + aeOptionsFromSource('teacherSubjectSelect', a.subject) + '</select>' +
                    '<input id="aeSubjectOther" class="form-input" style="display:none; margin-top:6px;" placeholder="Type the subject name"></div>' +
                '<div><label for="aeClass">Class</label>' +
                    '<select id="aeClass" class="form-input" onchange="aeToggleOther(this, \'aeClassOther\')">' + aeOptionsFromSource('teacherClassSelect', a.className) + '</select>' +
                    '<input id="aeClassOther" class="form-input" style="display:none; margin-top:6px;" placeholder="Type the class name"></div>' +
                '<div><label for="aeCertName">Teacher\'s name on certificate</label>' +
                    '<input id="aeCertName" class="form-input" value="' + escapeAssessmentEditorHtml(a.teacherName || '') + '"></div>' +
                '<div><label for="aeTime">Time limit</label>' +
                    cmTimePickerHtml('aeTime') + '</div>' +
                '<div><label for="aePassMark">Pass mark (%)</label>' +
                    '<input id="aePassMark" type="number" min="0" max="100" class="form-input" value="' + (a.passMark !== undefined && a.passMark !== null ? a.passMark : 50) + '"></div>' +
                '<div><label for="aeQuestionLimit">Questions per student (0 = all)</label>' +
                    '<input id="aeQuestionLimit" type="number" min="0" class="form-input" value="' + (a.questionLimit || 0) + '"></div>' +
                '<div><label for="aeNegative">Negative marking</label>' +
                    '<select id="aeNegative" class="form-input">' + [['0','None'],['0.25','Minus 1/4 mark per wrong answer'],['0.33','Minus 1/3 mark per wrong answer'],['0.5','Minus 1/2 mark per wrong answer'],['1','Minus 1 mark per wrong answer']].map(function(o) { return '<option value="' + o[0] + '"' + (Number(a.negativeMarking || 0) === Number(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
            '</div>' +
            '<div class="assessment-settings-toggles">' +
                toggle('aeCamera', 'Live monitoring: Camera', 'Checks the student stays visible on camera', a.cameraMonitoring) +
                toggle('aeNoise', 'Live monitoring: Noise', 'Warns if the surroundings are noisy', a.noiseMonitoring) +
                toggle('aeShuffle', 'Shuffle questions &amp; options', '', a.shuffle) +
                toggle('aeShowResults', 'Show results &amp; certificate to student', '', a.showResults !== false) +
            '</div>' +
        '</div>';
    box.style.display = 'block';
    cmTpInit('aeTime', minutes);
}

// Reads the settings panel. Returns { error } or { settings }.
function collectAssessmentEditorSettings() {
    function pick(selectId, otherId, label) {
        var sel = document.getElementById(selectId);
        if (!sel) return { error: label + ' is missing.' };
        var v = sel.value;
        if (v === '__other') v = (document.getElementById(otherId).value || '').trim();
        if (!v) return { error: 'Please enter the ' + label.toLowerCase() + '.' };
        return { value: v };
    }
    var subject = pick('aeSubject', 'aeSubjectOther', 'Subject');
    if (subject.error) return { error: subject.error };
    var cls = pick('aeClass', 'aeClassOther', 'Class');
    if (cls.error) return { error: cls.error };

    var pm = parseInt(document.getElementById('aePassMark').value, 10);
    if (isNaN(pm) || pm < 0 || pm > 100) return { error: 'Pass mark must be a number from 0 to 100.' };

    return {
        settings: {
            subject: subject.value,
            className: cls.value,
            teacherName: (document.getElementById('aeCertName').value || '').trim(),
            timeLimit: (parseInt(document.getElementById('aeTime').value, 10) || 0) * 60,
            passMark: pm,
            cameraMonitoring: document.getElementById('aeCamera').checked,
            noiseMonitoring: document.getElementById('aeNoise').checked,
            shuffle: document.getElementById('aeShuffle').checked,
            showResults: document.getElementById('aeShowResults').checked,
            questionLimit: parseInt(document.getElementById('aeQuestionLimit').value, 10) || 0,
            negativeMarking: Number(document.getElementById('aeNegative').value) || 0
        }
    };
}

function openAssessmentEditor(assessmentId) {
    var assessment = null;
    for (var i = 0; i < teacherAssessmentsCache.length; i++) {
        if (String(teacherAssessmentsCache[i].id) === String(assessmentId)) {
            assessment = teacherAssessmentsCache[i];
            break;
        }
    }

    if (!assessment) {
        alert('Could not find that published assessment. Please refresh the Published Assessments section and try again.');
        return;
    }

    assessmentEditorDraftMode = false;
    currentAssessmentBeingEdited = JSON.parse(JSON.stringify(assessment));
    renderAssessmentEditor();
    renderAssessmentEditorSettings(currentAssessmentBeingEdited);
    loadEditorFlagCounts();
    var modal = document.getElementById('assessmentEditorModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

async function openTeacherQuestionImageEditor() {
    if (!teacherQuestions || teacherQuestions.length === 0) {
        var fileInput = document.getElementById('teacherCsvFile');
        var file = fileInput && fileInput.files ? fileInput.files[0] : null;
        if (!file) {
            alert('Please upload a CSV file or load a Question Bank first.');
            return;
        }
        try {
            var text = await file.text();
            var parsed = parseTeacherCSV(text);
            if (!parsed.length) {
                alert('No questions found in the CSV. Please check the format.');
                return;
            }
            teacherQuestions = parsed;
        } catch (e) {
            alert('Could not read the CSV file. Please try again.');
            return;
        }
    }

    assessmentEditorDraftMode = true;
    var draftSettingsBox = document.getElementById('assessmentEditorSettings');
    if (draftSettingsBox) { draftSettingsBox.style.display = 'none'; draftSettingsBox.innerHTML = ''; }
    currentAssessmentBeingEdited = {
        id: null,
        code: '',
        subject: 'New Assessment',
        className: '',
        teacherEmail: currentTeacher ? currentTeacher.email : '',
        questions: JSON.parse(JSON.stringify(teacherQuestions))
    };
    renderAssessmentEditor();
    var modal = document.getElementById('assessmentEditorModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeAssessmentEditor() {
    var modal = document.getElementById('assessmentEditorModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    var settingsBoxToClear = document.getElementById('assessmentEditorSettings');
    if (settingsBoxToClear) { settingsBoxToClear.style.display = 'none'; settingsBoxToClear.innerHTML = ''; }
    currentAssessmentBeingEdited = null;
    assessmentEditorDraftMode = false;
    assessmentImageUploadQuestionIndex = -1;
    var input = document.getElementById('assessmentImageUploadInput');
    if (input) input.value = '';
}

function escapeAssessmentEditorHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderAssessmentEditor() {
    var list = document.getElementById('assessmentEditorList');
    var title = document.getElementById('assessmentEditorTitle');
    var subtitle = document.getElementById('assessmentEditorSubtitle');
    var saveBtn = document.getElementById('assessmentEditorSaveBtn');
    if (!list || !currentAssessmentBeingEdited) return;

    var a = currentAssessmentBeingEdited;
    if (assessmentEditorDraftMode) {
        title.textContent = 'Review Questions & Add Images';
        if (subtitle) subtitle.textContent = 'These are the questions you are preparing to publish. Add or replace images now; nothing is published until you click Publish Assessment.';
        if (saveBtn) saveBtn.textContent = 'Save Question Draft';
    } else {
        title.textContent = 'Edit Assessment — ' + a.subject + ' (' + a.code + ')';
        if (subtitle) subtitle.textContent = 'Update the settings and questions, then save. The assessment code does not change. If you change a correct answer, you will be asked whether to re-grade the results already submitted.';
        if (saveBtn) saveBtn.textContent = 'Save Changes';
    }

    var questions = a.questions || [];
    var html = '';

    for (var i = 0; i < questions.length; i++) {
        var q = questions[i] || {};
        var opts = Array.isArray(q.options) ? q.options.slice(0, 4) : ['', '', '', ''];
        while (opts.length < 4) opts.push('');
        var imageUrl = String(q.image || '').trim();
        var imagePreview = imageUrl ?
            '<div class="assessment-editor-image-preview"><img src="' + escapeAssessmentEditorHtml(imageUrl) + '" alt="Question image" onerror="this.parentElement.classList.add(\"broken\"); this.style.display=\"none\";"><span class="assessment-editor-image-broken-text">Image could not be displayed.</span></div>' :
            '<div class="assessment-editor-no-image">No image attached</div>';

        html += '<div class="assessment-editor-card" data-question-index="' + i + '">' +
            '<div class="assessment-editor-card-head">' +
                '<strong>Question ' + (i + 1) + '</strong>' +
                (assessmentEditorDraftMode ? '' : '<button type="button" class="assessment-editor-credit" onclick="creditAllForQuestion(' + i + ')">Credit all students</button>') +
                '<button type="button" class="assessment-editor-delete" onclick="deleteAssessmentEditorQuestion(' + i + ')">Delete</button>' +
            '</div>' +
            '<label>Question</label>' +
            '<textarea class="form-input assessment-editor-question" rows="3">' + escapeAssessmentEditorHtml(q.question) + '</textarea>' +
            '<div class="assessment-editor-options">' +
                '<div><label>Option A</label><input class="form-input assessment-editor-option" value="' + escapeAssessmentEditorHtml(opts[0]) + '"></div>' +
                '<div><label>Option B</label><input class="form-input assessment-editor-option" value="' + escapeAssessmentEditorHtml(opts[1]) + '"></div>' +
                '<div><label>Option C</label><input class="form-input assessment-editor-option" value="' + escapeAssessmentEditorHtml(opts[2]) + '"></div>' +
                '<div><label>Option D</label><input class="form-input assessment-editor-option" value="' + escapeAssessmentEditorHtml(opts[3]) + '"></div>' +
            '</div>' +
            '<div class="assessment-editor-bottom">' +
                '<div style="flex:1; min-width:180px;"><label>Correct Answer</label>' +
                    '<select class="form-input assessment-editor-correct">' +
                        '<option value="A"' + (String(q.correctAnswer || '').toUpperCase() === 'A' ? ' selected' : '') + '>A</option>' +
                        '<option value="B"' + (String(q.correctAnswer || '').toUpperCase() === 'B' ? ' selected' : '') + '>B</option>' +
                        '<option value="C"' + (String(q.correctAnswer || '').toUpperCase() === 'C' ? ' selected' : '') + '>C</option>' +
                        '<option value="D"' + (String(q.correctAnswer || '').toUpperCase() === 'D' ? ' selected' : '') + '>D</option>' +
                    '</select>' +
                '</div>' +
                '<div class="assessment-editor-image-box">' +
                    '<label>Question Image (optional)</label>' +
                    imagePreview +
                    '<div class="assessment-editor-image-actions">' +
                        '<button type="button" class="secondary-btn" onclick="chooseAssessmentImage(' + i + ')">📷 ' + (imageUrl ? 'Change Image' : 'Upload Image') + '</button>' +
                        (imageUrl ? '<button type="button" class="assessment-editor-remove-image" onclick="removeAssessmentImage(' + i + ')">Remove</button>' : '') +
                    '</div>' +
                    '<input class="form-input assessment-editor-image" value="' + escapeAssessmentEditorHtml(imageUrl) + '" placeholder="Or paste an image URL (optional)">' +
                    '<p class="helper-text" style="margin:5px 0 0;">JPG, PNG, WEBP or GIF • max 5 MB</p>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    if (!questions.length) {
        html = '<p class="helper-text">No questions yet. Click "Add Question" to create one.</p>';
    }

    list.innerHTML = html;
}

function chooseAssessmentImage(index) {
    if (!currentAssessmentBeingEdited) return;
    syncAssessmentEditorFromDOM();
    assessmentImageUploadQuestionIndex = index;
    var input = document.getElementById('assessmentImageUploadInput');
    if (!input) return;
    input.value = '';
    input.click();
}

function removeAssessmentImage(index) {
    if (!currentAssessmentBeingEdited) return;
    syncAssessmentEditorFromDOM();
    if (!currentAssessmentBeingEdited.questions[index]) return;
    currentAssessmentBeingEdited.questions[index].image = '';
    renderAssessmentEditor();
}

async function handleAssessmentImageUpload(input) {
    if (!input || !input.files || !input.files[0] || !currentAssessmentBeingEdited) return;
    var index = assessmentImageUploadQuestionIndex;
    var file = input.files[0];
    input.value = '';

    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
        alert('Please choose a JPG, PNG, WEBP or GIF image.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large. Please choose an image no larger than 5 MB.');
        return;
    }
    if (index < 0 || !currentAssessmentBeingEdited.questions[index]) return;

    var reader = new FileReader();
    reader.onload = async function(e) {
        var teacherToken = localStorage.getItem('cleverment_teacher_token');
        var card = document.querySelector('#assessmentEditorList .assessment-editor-card[data-question-index="' + index + '"]');
        var uploadButton = card ? card.querySelector('.assessment-editor-image-actions button') : null;
        var oldText = uploadButton ? uploadButton.textContent : '';
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.textContent = 'Uploading...';
        }

        try {
            var res = await fetch(BACKEND_URL + '/api/teacher/assessment-images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + teacherToken
                },
                body: JSON.stringify({ dataUrl: e.target.result })
            });
            var data = await res.json();
            if (!res.ok || !data.url) {
                throw new Error(data.error || 'Image upload failed.');
            }
            syncAssessmentEditorFromDOM();
            currentAssessmentBeingEdited.questions[index].image = data.url;
            renderAssessmentEditor();
        } catch (err) {
            alert('Could not upload the image: ' + (err.message || 'Please try again.'));
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.textContent = oldText || 'Upload Image';
            }
        }
    };
    reader.readAsDataURL(file);
}

function syncAssessmentEditorFromDOM() {
    if (!currentAssessmentBeingEdited) return;

    var cards = document.querySelectorAll('#assessmentEditorList .assessment-editor-card');
    var questions = [];

    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var options = card.querySelectorAll('.assessment-editor-option');
        var q = {
            question: (card.querySelector('.assessment-editor-question') || {}).value || '',
            options: [
                options[0] ? options[0].value : '',
                options[1] ? options[1].value : '',
                options[2] ? options[2].value : '',
                options[3] ? options[3].value : ''
            ],
            correctAnswer: (card.querySelector('.assessment-editor-correct') || {}).value || '',
            image: (card.querySelector('.assessment-editor-image') || {}).value || ''
        };
        questions.push(q);
    }

    currentAssessmentBeingEdited.questions = questions;
}

function addAssessmentEditorQuestion() {
    if (!currentAssessmentBeingEdited) return;
    syncAssessmentEditorFromDOM();

    currentAssessmentBeingEdited.questions.push({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 'A',
        image: ''
    });

    renderAssessmentEditor();

    setTimeout(function() {
        var cards = document.querySelectorAll('#assessmentEditorList .assessment-editor-card');
        if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
}

function deleteAssessmentEditorQuestion(index) {
    if (!currentAssessmentBeingEdited) return;
    syncAssessmentEditorFromDOM();

    if (currentAssessmentBeingEdited.questions.length <= 1) {
        alert('An assessment must contain at least one question.');
        return;
    }

    if (!confirm('Delete Question ' + (index + 1) + '?')) return;

    currentAssessmentBeingEdited.questions.splice(index, 1);
    renderAssessmentEditor();
}

async function saveAssessmentEditorChanges() {
    if (!currentAssessmentBeingEdited) return;

    syncAssessmentEditorFromDOM();

    var questions = currentAssessmentBeingEdited.questions || [];
    if (!questions.length) {
        alert('An assessment must contain at least one question.');
        return;
    }

    for (var i = 0; i < questions.length; i++) {
        var q = questions[i];
        if (!String(q.question || '').trim()) {
            alert('Question ' + (i + 1) + ' is empty.');
            return;
        }
        if (!Array.isArray(q.options) || q.options.length < 4 ||
            q.options.some(function(o) { return !String(o || '').trim(); })) {
            alert('Question ' + (i + 1) + ' must have all four options (A–D).');
            return;
        }
        if (!/^[ABCD]$/.test(String(q.correctAnswer || '').toUpperCase())) {
            alert('Question ' + (i + 1) + ' must have a correct answer of A, B, C or D.');
            return;
        }
        q.correctAnswer = String(q.correctAnswer).toUpperCase();
    }

    if (assessmentEditorDraftMode) {
        teacherQuestions = JSON.parse(JSON.stringify(questions));
        closeAssessmentEditor();
        alert('Question draft saved. Your images and edits will be included when you publish this assessment.');
        return;
    }

    var collected = collectAssessmentEditorSettings();
    if (collected.error) {
        alert(collected.error);
        var sb = document.getElementById('assessmentEditorSettings');
        if (sb && sb.scrollIntoView) sb.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    var editedSettings = collected.settings;

    // If any correct answer was changed, offer to re-grade the results already submitted.
    var doRegrade = false;
    var originalAssessment = null;
    for (var oa = 0; oa < teacherAssessmentsCache.length; oa++) {
        if (String(teacherAssessmentsCache[oa].id) === String(currentAssessmentBeingEdited.id)) { originalAssessment = teacherAssessmentsCache[oa]; break; }
    }
    if (originalAssessment) {
        var changedNums = keyChangedQuestionNumbers(originalAssessment.questions || [], questions);
        var existingResultCount = teacherResultsCache.filter(function(r) { return r.assessmentCode === originalAssessment.code; }).length;
        if (changedNums.length > 0 && existingResultCount > 0) {
            doRegrade = confirm('You changed the correct answer for question' + (changedNums.length === 1 ? ' ' : 's ') + changedNums.join(', ') + '.\n\n' +
                existingResultCount + ' student result(s) already exist for this assessment.\n\n' +
                'OK = save AND re-grade those results with the new answer(s).\nCancel = save only (old scores stay as they are).');
        }
    }

    var teacherToken = localStorage.getItem('cleverment_teacher_token');
    var saveBtn = document.getElementById('assessmentEditorSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/assessments/' + encodeURIComponent(currentAssessmentBeingEdited.id), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + teacherToken
            },
            body: JSON.stringify(Object.assign({ questions: questions, regrade: doRegrade }, editedSettings))
        });

        var data = await res.json();
        if (!res.ok) {
            alert('Could not save changes: ' + (data.error || 'Unknown error.'));
            return;
        }

        var updated = normalizeAssessmentRow(data.assessment);

        // Update the in-memory cache without changing the assessment code.
        for (var j = 0; j < teacherAssessmentsCache.length; j++) {
            if (String(teacherAssessmentsCache[j].id) === String(updated.id)) {
                teacherAssessmentsCache[j] = updated;
                break;
            }
        }

        // Keep the local fallback copy consistent as well.
        var localPublished = getPublishedAssessmentsLocal();
        for (var k = 0; k < localPublished.length; k++) {
            if (String(localPublished[k].id) === String(updated.id) ||
                String(localPublished[k].code) === String(updated.code)) {
                localPublished[k].questions = JSON.parse(JSON.stringify(updated.questions));
                localPublished[k].code = updated.code;
                localPublished[k].subject = updated.subject;
                localPublished[k].className = updated.className;
                localPublished[k].teacherName = updated.teacherName;
                localPublished[k].timeLimit = updated.timeLimit;
                localPublished[k].passMark = updated.passMark;
                localPublished[k].shuffle = updated.shuffle;
                localPublished[k].cameraMonitoring = updated.cameraMonitoring;
                localPublished[k].noiseMonitoring = updated.noiseMonitoring;
                localPublished[k].showResults = updated.showResults;
                break;
            }
        }
        localStorage.setItem('cleverment_published', JSON.stringify(localPublished));

        logTeacherActivity(updated.teacherEmail, 'edit_assessment', 'Edited assessment: ' + updated.subject + ' | Class: ' + updated.className + ' | Code: ' + updated.code);

        closeAssessmentEditor();
        await renderTeacherPublishedList();
        var regradeNote = ' Existing submitted results were not changed.';
        if (data.regrade && !data.regrade.error) {
            regradeNote = ' Re-graded ' + data.regrade.updated + ' result(s)' + (data.regrade.scoreChanged ? ' (' + data.regrade.scoreChanged + ' score(s) changed).' : ' (no scores changed).');
            reloadTeacherResultsCache();
        } else if (data.regrade && data.regrade.error) {
            regradeNote = ' The questions were saved, but re-grading failed: ' + data.regrade.error;
        }
        alert('Assessment updated successfully. The assessment code remains ' + updated.code + '.' + regradeNote);
    } catch (e) {
        alert('Could not save changes. Please check your connection and try again.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
}

// ============================================================
// QUESTION ANALYTICS: aggregates every submission's per-question
// answers (matched by question text, since shuffle means position
// isn't stable across students) to show which questions students
// get wrong most often for a given assessment code.
// ============================================================

// ============================================================
// CLASS ROSTERS (for "who hasn't taken it yet" attendance check)
// ============================================================

async function getRosterForClass(teacherEmail, className) {
    try {
        var { data, error } = await supabase
            .from('cleverment_rosters')
            .select('*')
            .eq('teacher_email', teacherEmail)
            .eq('class_name', className)
            .maybeSingle();
        if (error || !data) return null;
        var entries = data.student_names || [];
        // Normalize: older rosters (before admission numbers existed) were
        // saved as plain strings. Treat those as needing re-upload rather
        // than guessing an admission number for them.
        return entries.filter(function(e) { return e && typeof e === 'object' && e.admissionNumber; });
    } catch (e) {
        return null;
    }
}

// ============================================================
// ROSTER EDITING (in-app, no spreadsheet round-trip needed)
// ============================================================

var currentRosterEditClass = '';
var currentRosterEditEntries = [];

var currentRosterEditPhotoKeys = {};   // admission keys that already have a picture saved on the server
var rosterPhotoTargetIndex = -1;

function rosterKey(a) { return String(a || '').trim().toLowerCase(); }
function rosterLooseKey(a) { return String(a || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

async function loadCustomRosterClass() {
    var input = document.getElementById('rosterCustomClass');
    var className = input ? input.value.trim() : '';
    if (!className) {
        alert('Enter the custom class name first.');
        if (input) input.focus();
        return;
    }
    var statusEl = document.getElementById('rosterUploadStatus');
    if (statusEl) statusEl.style.display = 'none';
    var editStatus = document.getElementById('rosterEditStatus');
    if (editStatus) editStatus.style.display = 'none';
    await loadRosterForEditing(className);
}

async function loadRosterForEditing(className) {
    currentRosterEditClass = className;
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    var roster = await getRosterForClass(teacherEmail, className);
    var photos = await getRosterPhotoMap(className, true);
    currentRosterEditPhotoKeys = {};
    Object.keys(photos).forEach(function(k) { currentRosterEditPhotoKeys[k] = true; });
    currentRosterEditEntries = roster ? roster.map(function(e) {
        var p = photos[rosterKey(e.admissionNumber)] || '';
        return { name: e.name || '', admissionNumber: e.admissionNumber || '', parentPhone: e.parentPhone || '', photo: p, photoDirty: false };
    }) : [];

    document.getElementById('rosterEditWrapper').style.display = 'block';
    var bulkStatus = document.getElementById('rosterPhotoBulkStatus');
    if (bulkStatus) bulkStatus.style.display = 'none';
    renderRosterEditList();
}

function syncRosterEditEntriesFromDOM() {
    var rows = document.querySelectorAll('#rosterEditList .roster-edit-row');
    var entries = [];
    for (var i = 0; i < rows.length; i++) {
        var nameInput = rows[i].querySelector('.roster-edit-name');
        var admInput = rows[i].querySelector('.roster-edit-admission');
        var old = currentRosterEditEntries[i] || {};
        var parentInput = rows[i].querySelector('.roster-edit-parent');
        entries.push({ name: nameInput.value, admissionNumber: admInput.value, parentPhone: parentInput ? parentInput.value : (old.parentPhone || ''), photo: old.photo || '', photoDirty: !!old.photoDirty });
    }
    currentRosterEditEntries = entries;
}

function renderRosterEditList() {
    var container = document.getElementById('rosterEditList');
    if (currentRosterEditEntries.length === 0) {
        container.innerHTML = '<p class="helper-text">No students yet. Upload a spreadsheet above, or add students one by one below.</p>';
        return;
    }

    var cameraIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    var html = '';
    for (var i = 0; i < currentRosterEditEntries.length; i++) {
        var entry = currentRosterEditEntries[i];
        html += '<div class="roster-edit-row" style="display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">' +
            '<div class="roster-photo-cell">' +
                '<button type="button" class="roster-photo-btn" onclick="pickRosterPhoto(' + i + ')" aria-label="Add or change picture">' +
                    (entry.photo ? '<img src="' + entry.photo + '" alt="">' : cameraIcon) + '</button>' +
                (entry.photo ? '<button type="button" class="roster-photo-remove" onclick="removeRosterPhoto(' + i + ')" aria-label="Remove picture">&times;</button>' : '') +
            '</div>' +
            '<input type="text" class="roster-edit-name form-input" style="flex:2; min-width:130px;" placeholder="Student Name" value="' + escapeHtmlAttr(entry.name) + '">' +
            '<input type="text" class="roster-edit-admission form-input" style="flex:1; min-width:110px;" placeholder="Admission Number" value="' + escapeHtmlAttr(entry.admissionNumber) + '">' +
            '<input type="tel" class="roster-edit-parent form-input" style="flex:1; min-width:120px;" placeholder="Parent phone (optional)" value="' + escapeHtmlAttr(entry.parentPhone || '') + '">' +
            '<button onclick="deleteRosterEditRow(' + i + ')" class="secondary-btn" style="background:#dc3545; color:white; padding:8px 12px;">✕</button>' +
            '</div>';
    }
    container.innerHTML = html;
}

function escapeHtmlAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addRosterEditRow() {
    syncRosterEditEntriesFromDOM();
    currentRosterEditEntries.push({ name: '', admissionNumber: '', parentPhone: '', photo: '', photoDirty: false });
    renderRosterEditList();
    var rows = document.querySelectorAll('#rosterEditList .roster-edit-row');
    var lastRow = rows[rows.length - 1];
    if (lastRow) lastRow.querySelector('.roster-edit-name').focus();
}

function deleteRosterEditRow(index) {
    syncRosterEditEntriesFromDOM();
    currentRosterEditEntries.splice(index, 1);
    renderRosterEditList();
}

// Shrinks a photo to a passport-style 240 x 300 JPEG (about 15-25 KB), centred and cropped to fill the frame.
function rosterPrepareStudentPhoto(file) {
    return new Promise(function(resolve, reject) {
        if (!/^image\//i.test(file.type || '') && !/\.(jpe?g|png|webp|heic)$/i.test(file.name || '')) {
            reject(new Error('That file is not a picture.'));
            return;
        }
        var reader = new FileReader();
        reader.onerror = function() { reject(new Error('Could not read that picture.')); };
        reader.onload = function(e) {
            var img = new Image();
            img.onerror = function() { reject(new Error('Could not open that picture.')); };
            img.onload = function() {
                var W = 240, H = 300;
                var scale = Math.max(W / img.width, H / img.height);
                var sw = W / scale, sh = H / scale;
                var sx = (img.width - sw) / 2;
                var sy = Math.max(0, (img.height - sh) * 0.25); // faces sit in the upper part of a portrait
                var canvas = document.createElement('canvas');
                canvas.width = W;
                canvas.height = H;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, W, H);
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
                var out = canvas.toDataURL('image/jpeg', 0.85);
                if (out.length > 150000) out = canvas.toDataURL('image/jpeg', 0.7);
                resolve(out);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function pickRosterPhoto(index) {
    rosterPhotoTargetIndex = index;
    var picker = document.getElementById('rosterPhotoPicker');
    if (picker) { picker.value = ''; picker.click(); }
}

async function onRosterPhotoPicked(input) {
    var file = input.files && input.files[0];
    var idx = rosterPhotoTargetIndex;
    if (!file || idx < 0) return;
    try {
        var photo = await rosterPrepareStudentPhoto(file);
        syncRosterEditEntriesFromDOM();
        if (currentRosterEditEntries[idx]) {
            currentRosterEditEntries[idx].photo = photo;
            currentRosterEditEntries[idx].photoDirty = true;
        }
        renderRosterEditList();
        var st = document.getElementById('rosterEditStatus');
        if (st) { st.style.display = 'block'; st.textContent = 'Picture added. Tap Save Changes to keep it.'; }
    } catch (e) {
        alert(e.message || 'Could not use that picture.');
    } finally {
        input.value = '';
        rosterPhotoTargetIndex = -1;
    }
}

function removeRosterPhoto(index) {
    syncRosterEditEntriesFromDOM();
    if (currentRosterEditEntries[index]) {
        currentRosterEditEntries[index].photo = '';
        currentRosterEditEntries[index].photoDirty = true;
    }
    renderRosterEditList();
}

// Many pictures at once: each file is matched to a student by its file name, which must be the admission number
// (2024-001.jpg matches 2024/001 - slashes, dashes and spaces are ignored).
async function handleBulkRosterPhotos(input) {
    var files = Array.prototype.slice.call(input.files || [], 0, 100);
    var status = document.getElementById('rosterPhotoBulkStatus');
    if (!currentRosterEditClass) { alert('Please select a class first.'); input.value = ''; return; }
    if (files.length === 0) return;
    syncRosterEditEntriesFromDOM();

    var byKey = {};
    currentRosterEditEntries.forEach(function(e, i) {
        var k = rosterLooseKey(e.admissionNumber);
        if (k) (byKey[k] = byKey[k] || []).push(i);
    });

    status.style.display = 'block';
    var matched = 0, unmatched = [], failed = [];
    for (var f = 0; f < files.length; f++) {
        status.textContent = 'Reading pictures... ' + (f + 1) + ' of ' + files.length;
        var base = files[f].name.replace(/\.[^.]+$/, '');
        var idxs = byKey[rosterLooseKey(base)];
        if (!idxs) { unmatched.push(files[f].name); continue; }
        try {
            var photo = await rosterPrepareStudentPhoto(files[f]);
            idxs.forEach(function(i) { currentRosterEditEntries[i].photo = photo; currentRosterEditEntries[i].photoDirty = true; });
            matched++;
        } catch (e) {
            failed.push(files[f].name);
        }
    }
    renderRosterEditList();
    var text = 'Matched ' + matched + ' of ' + files.length + ' picture' + (files.length === 1 ? '' : 's') + '.';
    if (unmatched.length) text += ' No student has an admission number matching: ' + unmatched.slice(0, 8).join(', ') + (unmatched.length > 8 ? ' and ' + (unmatched.length - 8) + ' more' : '') + '.';
    if (failed.length) text += ' Could not read: ' + failed.slice(0, 5).join(', ') + '.';
    text += matched ? ' Now tap Save Changes below to keep them.' : '';
    status.textContent = text;
    input.value = '';
}

// Sends added / changed / removed pictures to the server in small groups. Returns a short message.
async function saveRosterPhotoChanges(className) {
    var finalKeys = {};
    var upserts = [];
    currentRosterEditEntries.forEach(function(e) {
        var key = rosterKey(e.admissionNumber);
        if (!key || !e.photo) return;
        finalKeys[key] = true;
        if (e.photoDirty || !currentRosterEditPhotoKeys[key]) upserts.push({ admissionNumber: e.admissionNumber.trim(), photo: e.photo });
    });
    var removals = [];
    Object.keys(currentRosterEditPhotoKeys).forEach(function(k) {
        if (!finalKeys[k]) removals.push({ admissionNumber: k, photo: '' });
    });
    var all = upserts.concat(removals);
    if (all.length === 0) return '';

    var token = localStorage.getItem('cleverment_teacher_token');
    for (var i = 0; i < all.length; i += 40) {
        var res = await fetch(BACKEND_URL + '/api/teacher/roster-photos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ className: className, photos: all.slice(i, i + 40) })
        });
        var data = await res.json().catch(function() { return {}; });
        if (!res.ok) throw new Error(data.error || 'Could not save the pictures.');
    }
    currentRosterEditPhotoKeys = finalKeys;
    currentRosterEditEntries.forEach(function(e) { e.photoDirty = false; });
    delete rosterPhotoCache[className];
    return upserts.length + ' picture' + (upserts.length === 1 ? '' : 's') + ' saved' + (removals.length ? ', ' + removals.length + ' removed' : '') + '.';
}

async function saveRosterEdits() {
    if (!currentRosterEditClass) {
        alert('Please select a class first.');
        return;
    }
    syncRosterEditEntriesFromDOM();

    var cleaned = [];
    for (var i = 0; i < currentRosterEditEntries.length; i++) {
        var name = currentRosterEditEntries[i].name.trim();
        var admissionNumber = currentRosterEditEntries[i].admissionNumber.trim();
        if (!name && !admissionNumber) continue; // skip fully blank rows
        if (!name || !admissionNumber) {
            alert('Every student needs both a Name and an Admission Number. Please fill in the incomplete row, or remove it.');
            return;
        }
        var pp = String(currentRosterEditEntries[i].parentPhone || '').trim();
        cleaned.push(pp ? { name: name, admissionNumber: admissionNumber, parentPhone: pp } : { name: name, admissionNumber: admissionNumber });
    }

    var statusEl = document.getElementById('rosterEditStatus');
    statusEl.style.display = 'block';
    statusEl.textContent = 'Saving...';

    var saved = await saveClassRosterEntries(currentRosterEditClass, cleaned);
    if (!saved) {
        statusEl.textContent = 'Could not save. Please try again.';
        return;
    }
    var photoMessage = '';
    try {
        photoMessage = await saveRosterPhotoChanges(currentRosterEditClass);
    } catch (e) {
        statusEl.textContent = 'The names were saved, but the pictures were not: ' + e.message;
        renderRosterEditList();
        return;
    }
    renderRosterEditList();
    statusEl.textContent = 'Saved: ' + cleaned.length + ' student(s) on the roster for ' + currentRosterEditClass + '.' + (photoMessage ? ' ' + photoMessage : '');
}

function downloadRosterTemplate() {
    var classSelect = document.getElementById('rosterClassSelect');
    var customInput = document.getElementById('rosterCustomClass');
    var className = classSelect.value === 'Other' ? customInput.value.trim() : classSelect.value;
    if (!className) {
        alert('Please select or enter a class first.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('The spreadsheet library failed to load. Please check your connection and try again.');
        return;
    }

    var worksheetData = [
        ['CleverMent Class Roster Template - ' + className],
        ['Fill in one row per student below. Do not change the column headers.'],
        [],
        ['Name', 'Admission Number']
    ];
    var ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, className.replace(/[\\/:*?"<>|]/g, '_') + '_Roster_Template.xlsx');
}

async function saveClassRosterEntries(className, entries) {
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    try {
        var { data: existing } = await supabase
            .from('cleverment_rosters')
            .select('id')
            .eq('teacher_email', teacherEmail)
            .eq('class_name', className)
            .maybeSingle();

        if (existing && existing.id) {
            var { error: updateError } = await supabase
                .from('cleverment_rosters')
                .update({ student_names: entries, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (updateError) {
                alert('Supabase Error: ' + updateError.message);
                return false;
            }
        } else {
            var { error: insertError } = await supabase
                .from('cleverment_rosters')
                .insert([{ teacher_email: teacherEmail, class_name: className, student_names: entries }]);
            if (insertError) {
                alert('Supabase Error: ' + insertError.message);
                return false;
            }
        }
        return true;
    } catch (e) {
        alert('Error: ' + e.message);
        return false;
    }
}

function handleRosterFileUpload() {
    var classSelect = document.getElementById('rosterClassSelect');
    var customInput = document.getElementById('rosterCustomClass');
    var className = classSelect.value === 'Other' ? customInput.value.trim() : classSelect.value;
    if (!className) {
        alert('Please select or enter a class first.');
        return;
    }

    var fileInput = document.getElementById('rosterFileInput');
    var file = fileInput.files[0];
    if (!file) {
        alert('Please choose a filled-in roster file first.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('The spreadsheet library failed to load. Please check your connection and try again.');
        return;
    }

    var statusEl = document.getElementById('rosterUploadStatus');
    statusEl.textContent = 'Reading file...';
    statusEl.style.display = 'block';

    var reader = new FileReader();
    reader.onload = async function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            var entries = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                if (!row || row.length === 0) continue;
                var name = (row[0] || '').toString().trim();
                var admissionNumber = (row[1] || '').toString().trim();
                if (!name || !admissionNumber) continue;
                if (name.toLowerCase() === 'name') continue; // skip header row wherever it lands
                entries.push({ name: name, admissionNumber: admissionNumber });
            }

            if (entries.length === 0) {
                statusEl.textContent = 'No valid rows found. Make sure both Name and Admission Number columns are filled in.';
                return;
            }

            statusEl.textContent = 'Saving ' + entries.length + ' student(s)...';
            var saved = await saveClassRosterEntries(className, entries);
            if (saved) {
                statusEl.textContent = 'Roster saved for ' + className + ': ' + entries.length + ' student(s). Students not on this list cannot take assessments published for this class.';
                fileInput.value = '';
            } else {
                statusEl.textContent = 'Could not save the roster. Please try again.';
            }
        } catch (err) {
            statusEl.textContent = 'Could not read that file. Please make sure it\'s the downloaded template with your edits.';
        }
    };
    reader.readAsArrayBuffer(file);
}

function populateTeacherAnalyticsSelect(assessments) {
    var select = document.getElementById('teacherAnalyticsSelect');
    if (!select) return;
    var currentVal = select.value;
    select.innerHTML = '<option value="">-- Select an assessment --</option>';
    for (var i = 0; i < assessments.length; i++) {
        var a = assessments[i];
        var opt = document.createElement('option');
        opt.value = a.code;
        opt.textContent = a.subject + ' - ' + a.className + ' (' + a.code + ')';
        select.appendChild(opt);
    }
    if (currentVal && assessments.some(function(a) { return a.code === currentVal; })) {
        select.value = currentVal;
    }
}

async function getQuestionAnalyticsForCode(code) {
    try {
        var { data, error } = await supabase
            .from('cleverment_results')
            .select('answers')
            .eq('assessment_code', code);
        if (error) return null;

        var stats = {};
        var order = [];
        var attemptsWithData = 0;

        for (var i = 0; i < (data || []).length; i++) {
            var answers = data[i].answers;
            if (!answers || !Array.isArray(answers) || answers.length === 0) continue;
            attemptsWithData++;
            for (var j = 0; j < answers.length; j++) {
                var qText = answers[j].question;
                if (!qText) continue;
                if (!stats[qText]) {
                    stats[qText] = { wrong: 0, total: 0 };
                    order.push(qText);
                }
                stats[qText].total++;
                if (!answers[j].isCorrect) stats[qText].wrong++;
            }
        }

        if (attemptsWithData === 0) {
            return { hasData: false, questions: [], totalAttempts: (data || []).length };
        }

        var list = order.map(function(q) {
            var s = stats[q];
            return {
                question: q,
                wrong: s.wrong,
                total: s.total,
                wrongPct: Math.round((s.wrong / s.total) * 100)
            };
        });
        list.sort(function(a, b) { return b.wrongPct - a.wrongPct; });

        return { hasData: true, questions: list, totalAttempts: attemptsWithData };
    } catch (e) {
        return null;
    }
}

async function getAttendanceForAssessment(assessment) {
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    var roster = await getRosterForClass(teacherEmail, assessment.className);
    if (!roster || roster.length === 0) return { hasRoster: false };

    var submittedAdmissionNumbers = [];
    try {
        var { data, error } = await supabase
            .from('cleverment_results')
            .select('admission_number')
            .eq('assessment_code', assessment.code);
        if (!error && data) {
            submittedAdmissionNumbers = data.map(function(r) { return (r.admission_number || '').trim().toLowerCase(); });
        }
    } catch (e) {
        // If this fails, still show the roster with nothing marked as submitted
        // rather than hiding the roster entirely.
    }

    var missing = roster.filter(function(entry) {
        return submittedAdmissionNumbers.indexOf((entry.admissionNumber || '').trim().toLowerCase()) === -1;
    });

    return {
        hasRoster: true,
        total: roster.length,
        submittedCount: roster.length - missing.length,
        missing: missing
    };
}

function renderAttendanceBlock(assessment, attendance) {
    if (!attendance.hasRoster) {
        return '<p class="helper-text" style="margin-bottom:14px;">No roster uploaded for "' + assessment.className + '" - add one above so only listed students can take this assessment, and to see who\'s missing.</p>';
    }
    var html = '<div style="background:white; padding:12px 16px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:14px;">' +
        '<p style="margin:0 0 8px 0; font-weight:700;">Attendance: ' + attendance.submittedCount + '/' + attendance.total + ' submitted</p>';
    if (attendance.missing.length > 0) {
        var names = attendance.missing.map(function(e) { return e.name + ' (' + e.admissionNumber + ')'; });
        html += '<p style="margin:0 0 4px 0; font-size:13px; color:#6b7a8f;">Haven\'t taken it yet:</p>' +
            '<p style="margin:0; font-size:13px; color:#dc3545;">' + names.join(', ') + '</p>';
    } else {
        html += '<p style="margin:0; font-size:13px; color:#2d9c5c;">Everyone on the roster has submitted.</p>';
    }
    html += '</div>';
    return html;
}

async function loadTeacherAnalytics() {
    var select = document.getElementById('teacherAnalyticsSelect');
    var container = document.getElementById('teacherAnalyticsContainer');
    if (!select || !container) return;
    cmRenderChartPanel('cmHostAnalytics', []);
    renderFlaggedQuestions(select.value);
    renderQuestionQuality(select.value);

    var code = select.value;
    if (!code) {
        container.innerHTML = '<p class="helper-text">Pick an assessment above to see its question breakdown.</p>';
        return;
    }

    container.innerHTML = '<p class="helper-text">Loading...</p>';

    var assessment = teacherAssessmentsCache.filter(function(a) { return a.code === code; })[0];
    var attendanceHtml = '';
    if (assessment) {
        var attendance = await getAttendanceForAssessment(assessment);
        attendanceHtml = renderAttendanceBlock(assessment, attendance);
    }

    var analytics = await getQuestionAnalyticsForCode(code);

    if (!analytics) {
        container.innerHTML = attendanceHtml + '<p class="helper-text">Could not load question analytics right now. Please try again.</p>';
        renderMathIn(container);
        return;
    }

    if (!analytics.hasData) {
        if (analytics.totalAttempts === 0) {
            container.innerHTML = attendanceHtml + '<p class="helper-text">No one has taken this assessment yet.</p>';
        } else {
            container.innerHTML = attendanceHtml + '<p class="helper-text">No detailed answer data yet for this assessment\'s attempts. New submissions from now on will build this breakdown automatically (older submissions made before this feature won\'t have it).</p>';
        }
        renderMathIn(container);
        return;
    }

    var html = attendanceHtml + '<p class="helper-text" style="margin-bottom:10px;">Based on ' + analytics.totalAttempts + ' attempt(s), worst-performing questions first:</p>';
    for (var i = 0; i < analytics.questions.length; i++) {
        var q = analytics.questions[i];
        var barColor = q.wrongPct >= 60 ? '#dc3545' : (q.wrongPct >= 30 ? '#e67e22' : '#2d9c5c');
        html += '<div style="background:white; padding:12px 16px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:8px;">' +
            '<p style="margin:0 0 6px 0;"><strong>Q' + (i + 1) + ':</strong> ' + q.question + '</p>' +
            '<div style="display:flex; align-items:center; gap:10px;">' +
            '<div style="flex:1; background:#eef2f6; border-radius:6px; height:8px; overflow:hidden;">' +
            '<div style="width:' + q.wrongPct + '%; background:' + barColor + '; height:100%;"></div>' +
            '</div>' +
            '<span style="font-size:13px; font-weight:600; color:' + barColor + '; white-space:nowrap;">' + q.wrong + '/' + q.total + ' wrong (' + q.wrongPct + '%)</span>' +
            '</div></div>';
    }
    container.innerHTML = html + cmAvgTimeHtml(code, assessment);
    cmRenderChartPanel('cmHostAnalytics', cmAnalyticsSources(code, analytics));
    renderMathIn(container);
}


// ---- Student pictures on certificates made by the teacher (results table, analytics ZIP) ----
var rosterPhotoCache = {};

async function getRosterPhotoMap(className, forceFresh) {
    var cached = rosterPhotoCache[className];
    if (!forceFresh && cached && Date.now() - cached.t < 5 * 60 * 1000) return cached.map;
    var token = localStorage.getItem('cleverment_teacher_token');
    var map = {};
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/roster-photos?className=' + encodeURIComponent(className), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var data = await res.json();
        if (res.ok && data.photos) map = data.photos;
    } catch (e) { /* no pictures available: certificates simply have none */ }
    rosterPhotoCache[className] = { map: map, t: Date.now() };
    return map;
}

async function attachRosterPhoto(certData, className, admissionNumber) {
    certData.admissionNumber = admissionNumber || '';
    if (!className || !admissionNumber) return certData;
    var map = await getRosterPhotoMap(className);
    var photo = map[String(admissionNumber).trim().toLowerCase()];
    if (photo) certData.studentPhoto = photo;
    return certData;
}

function generateCertificatePDFBlob(data) {
    return new Promise(function(resolve, reject) {
        var tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position:fixed; left:-9999px; top:0; width:297mm; height:210mm; margin:0; padding:0; background:white; z-index:-1; overflow:hidden;';
        var cleanCert = buildCertificateElement(data);
        tempDiv.appendChild(cleanCert);
        document.body.appendChild(tempDiv);

        waitForCertificateImages(cleanCert, 4000).then(function() {
            return html2canvas(cleanCert, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: 297 * 3.779,
                height: 210 * 3.779,
                logging: false
            });
        }).then(function(canvas) {
            var imgData = canvas.toDataURL('image/jpeg', 0.95);
            var jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            if (!jsPDFCtor) {
                throw new Error('jsPDF library not found.');
            }
            var pdf = new jsPDFCtor('landscape', 'mm', 'a4');
            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
            var blob = pdf.output('blob');
            document.body.removeChild(tempDiv);
            resolve(blob);
        }).catch(function(error) {
            document.body.removeChild(tempDiv);
            reject(error);
        });
    });
}

async function teacherDownloadAllCertificates() {
    var select = document.getElementById('teacherAnalyticsSelect');
    var btn = document.getElementById('teacherBulkCertBtn');
    if (!select || !select.value) {
        alert('Please select an assessment above first.');
        return;
    }

    var code = select.value;
    var assessment = teacherAssessmentsCache.filter(function(a) { return a.code === code; })[0];
    if (!assessment) {
        alert('Could not find that assessment. Try reopening the dashboard and picking it again.');
        return;
    }

    var JSZipLib = window.JSZip;
    if (!JSZipLib) {
        alert('The zip library failed to load. Please check your internet connection and try again.');
        return;
    }

    var results;
    try {
        var { data, error } = await supabase
            .from('cleverment_results')
            .select('student_name, score')
            .eq('assessment_code', code);
        if (error) {
            alert('Supabase Error: ' + error.message);
            return;
        }
        results = data || [];
    } catch (e) {
        alert('Error: ' + e.message);
        return;
    }

    if (results.length === 0) {
        alert('No submissions yet for this assessment.');
        return;
    }

    if (!confirm('Generate certificates for all ' + results.length + ' student(s) who took this assessment? This may take a minute for a large class.')) {
        return;
    }

    btn.disabled = true;
    var zip = new JSZipLib();
    var usedNames = {};
    var failedCount = 0;

    for (var i = 0; i < results.length; i++) {
        btn.textContent = 'Generating ' + (i + 1) + ' of ' + results.length + '...';
        var r = results[i];
        var certData = {
            studentName: r.student_name || 'Student',
            subject: assessment.subject,
            score: r.score,
            teacherName: assessment.teacherName,
            teacherSignature: assessment.teacherSignature,
            code: assessment.code,
            dateObj: new Date()
        };
        await attachRosterPhoto(certData, assessment.className, r.admission_number);
        try {
            var blob = await generateCertificatePDFBlob(certData);
            var safeName = (r.student_name || 'Student').replace(/[\\/:*?"<>|]/g, '_').trim() || 'Student';
            var filename = safeName;
            if (usedNames.hasOwnProperty(filename)) {
                usedNames[filename]++;
                filename = filename + '_' + usedNames[filename];
            } else {
                usedNames[filename] = 0;
            }
            zip.file('Certificate-' + filename + '.pdf', blob);
        } catch (e) {
            console.error('Failed to generate certificate for', r.student_name, e);
            failedCount++;
        }
    }

    btn.textContent = 'Packaging ZIP...';
    try {
        var zipBlob = await zip.generateAsync({ type: 'blob' });
        var url = URL.createObjectURL(zipBlob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (assessment.subject + '_' + assessment.className + '_Certificates').replace(/[\\/:*?"<>|]/g, '_') + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (failedCount > 0) {
            alert(failedCount + ' certificate(s) could not be generated and were skipped. The rest are in the ZIP.');
        }
    } catch (e) {
        alert('Error creating the ZIP file: ' + e.message);
    }

    btn.disabled = false;
    btn.textContent = 'Download All Certificates (ZIP)';
}

function copyAssessmentCode(code) {
    navigator.clipboard.writeText(code).then(function() {
        alert('Assessment code copied: ' + code);
    }).catch(function() {
        showCustomPrompt('Copy this code:', code);
    });
}

async function deletePublishedAssessment(id) {
    if (!confirm('Delete this assessment? This cannot be undone.')) return;
    var teacherToken = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/assessments/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + teacherToken }
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not delete assessment.'));
            return;
        }
    } catch (e) {
        alert('Could not reach the server. Please check your connection.');
        return;
    }
    renderTeacherPublishedList();
}

// ============================================================
// VERIFY ASSESSMENT CODE (Student)
// ============================================================

function showAssessmentForm() {
    cmLoadSchoolForAssessment(currentAssessmentCode);
    // Students who arrive through a shared link never pressed "I'm a Student", so the Welcome page
    // is still showing. Hide it for the whole assessment (it used to stay on screen until the end).
    var landing = document.getElementById('landingPage');
    if (landing) landing.style.display = 'none';
    document.getElementById('studentAccess').style.display = 'none';
    document.getElementById('studentAssessmentView').style.display = 'block';
    document.getElementById('studentInfoForm').style.display = 'block';
    document.getElementById('studentQuizSection').style.display = 'none';
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';

    document.getElementById('studentAssessmentTitle').textContent = 'Assessment: ' + currentAssessment.subject;
    document.getElementById('studentAssessmentSubject').textContent = 'Class: ' + currentAssessment.className + ' | ' + currentAssessment.questions.length + ' questions';
    document.getElementById('studentNameInput').value = '';
    document.getElementById('studentAdmissionNumber').value = '';
    document.getElementById('studentNameInput').focus();
    updateURL('student-assessment');

    loadRosterForNameAutocomplete();
}

var currentClassRosterForAutocomplete = [];

async function loadRosterForNameAutocomplete() {
    currentClassRosterForAutocomplete = [];
    if (!currentAssessment) return;
    currentClassRosterForAutocomplete = []; // suggestions are fetched from the server as the student types
}

var nameSuggestTimer = null;
var nameSuggestSeq = 0;

// Suggestions now come from the server (the roster is no longer readable from the browser).
function showNameSuggestions() {
    var input = document.getElementById('studentNameInput');
    var box = document.getElementById('studentNameSuggestions');
    var typed = input.value.trim();
    if (typed.length < 2 || !currentAssessmentCode) { box.style.display = 'none'; return; }
    if (nameSuggestTimer) clearTimeout(nameSuggestTimer);
    var seq = ++nameSuggestSeq;
    nameSuggestTimer = setTimeout(async function() {
        try {
            var res = await fetch(BACKEND_URL + '/api/quiz/roster-suggest?code=' + encodeURIComponent(currentAssessmentCode) + '&q=' + encodeURIComponent(typed));
            if (!res.ok) { box.style.display = 'none'; return; }
            var data = await res.json();
            if (seq !== nameSuggestSeq) return; // a newer keystroke is already being handled
            var matches = data.matches || [];
            if (matches.length === 0) { box.style.display = 'none'; return; }
            var html = '';
            for (var i = 0; i < matches.length; i++) {
                var entry = matches[i];
                html += '<div onmousedown="selectNameSuggestion(\'' + escapeJsString(entry.name) + '\', \'' + escapeJsString(entry.admissionNumber) + '\')" ' +
                    'ontouchstart="selectNameSuggestion(\'' + escapeJsString(entry.name) + '\', \'' + escapeJsString(entry.admissionNumber) + '\')" ' +
                    'style="padding:10px 14px; cursor:pointer; border-bottom:1px solid #eef2f6;" ' +
                    'onmouseover="this.style.background=\'#eef6ff\'" onmouseout="this.style.background=\'white\'">' +
                    '<strong>' + escapeHtml(entry.name) + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + escapeHtml(entry.admissionNumber) + ')</span>' +
                    '</div>';
            }
            box.innerHTML = html;
            box.style.display = 'block';
        } catch (e) { /* suggestions are a convenience only */ }
    }, 250);
}

function selectNameSuggestion(name, admissionNumber) {
    document.getElementById('studentNameInput').value = name;
    document.getElementById('studentAdmissionNumber').value = admissionNumber;
    document.getElementById('studentNameSuggestions').style.display = 'none';
}

function hideNameSuggestionsDelayed() {
    // A short delay so a click on a suggestion (onmousedown) fires before
    // this blur-triggered hide would otherwise remove it from the DOM.
    setTimeout(function() {
        document.getElementById('studentNameSuggestions').style.display = 'none';
    }, 150);
}

function escapeJsString(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function backToStudentAccess() {
    studentStopTimer();
    clearQuizState();
    stopProctorMonitoring();
    stopStudentPresence();
    preloadedImageCache = {};
    var helpBtn1 = document.getElementById('needHelpBtn');
    if (helpBtn1) helpBtn1.style.display = 'block';
    var whatsappBtn1 = document.getElementById('whatsappFloatBtn');
    if (whatsappBtn1) whatsappBtn1.style.display = 'inline-flex';
    document.getElementById('studentAssessmentView').style.display = 'none';
    document.getElementById('studentAccess').style.display = 'block';
    document.getElementById('assessmentCode').value = '';
    updateURL('student');
}



// ============================================================
// RELIABLE NETWORK CALLS FOR STUDENTS
// A sleeping server or a weak phone connection often fails the first try. Instead of showing an error
// straight away, try again a few times and tell the student what is happening.
// ============================================================

function showConnectBanner(text) {
    var el = document.getElementById('connectBanner');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
}

function hideConnectBanner() {
    var el = document.getElementById('connectBanner');
    if (el) el.style.display = 'none';
}

async function fetchWithRetry(url, options, cfg) {
    cfg = cfg || {};
    var attempts = cfg.attempts || 5;
    var baseDelay = cfg.baseDelay || 2000;
    var label = cfg.label || '';
    for (var i = 1; ; i++) {
        try {
            var res = await fetch(url, options);
            // 502/503/504 come from the hosting proxy while the server is waking up or restarting.
            if (res.status === 502 || res.status === 503 || res.status === 504) throw new Error('server_busy');
            if (label && i > 1) hideConnectBanner();
            return res;
        } catch (e) {
            if (i >= attempts) {
                if (label) hideConnectBanner();
                throw e;
            }
            if (label) {
                showConnectBanner(label + '... attempt ' + (i + 1) + ' of ' + attempts + '. The server may be waking up, so this can take up to a minute. Please wait.');
            }
            await new Promise(function(resolve) { setTimeout(resolve, Math.min(baseDelay * i, 12000)); });
        }
    }
}

function reportStudentAccessNetworkError(code, studentName, admissionNumber, source) {
    try {
        var payload = JSON.stringify({
            code: code || '',
            studentName: studentName || '',
            admissionNumber: admissionNumber || '',
            source: source || 'student'
        });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(BACKEND_URL + '/api/quiz/access-log-client', new Blob([payload], { type: 'application/json' }));
        } else {
            fetch(BACKEND_URL + '/api/quiz/access-log-client', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true
            }).catch(function() {});
        }
    } catch (e) {}
}

function cmStudentAuthHeader() {
    var t = null;
    try { t = localStorage.getItem('cleverment_student_token'); } catch (e) {}
    return t ? { 'Authorization': 'Bearer ' + t } : {};
}

async function verifyAssessmentCode(opts) {
    opts = opts || {};
    var codeFromURL = opts.code ? '' : getCodeFromURL();
    var code = opts.code ? String(opts.code).trim().toUpperCase() : (codeFromURL || document.getElementById('assessmentCode').value.trim().toUpperCase());

    if (!code) {
        alert('Please enter the assessment code provided by your teacher.');
        return;
    }

    try {
        var res = await fetchWithRetry(BACKEND_URL + '/api/quiz/assessment/' + encodeURIComponent(code), { headers: cmStudentAuthHeader() }, { attempts: 6, label: 'Connecting to CleverMent' });
        var data = await res.json();

        if (!res.ok) {
            if (data.reason === 'login_required' && opts.silent) {
                alert(data.error || 'This assessment is not for your class.');
                return false;
            } else if (data.reason === 'login_required') {
                openStudentLogin();
                var loginStatus = document.getElementById('slStatus');
                if (loginStatus) loginStatus.textContent = data.error || 'Please log in with your name and PIN to access this class assessment.';
                return;
            } else if (data.error === 'not_yet_open') {
                alert('This assessment is not open yet. It becomes available on ' + formatDate(new Date(data.availableFrom)) + '.');
            } else if (data.error === 'closed') {
                alert('This assessment window has closed. It was available until ' + formatDate(new Date(data.availableUntil)) + '.');
            } else {
                alert('Invalid assessment code. Please check with your teacher.');
            }
            return false;
        }

        currentAssessment = {
            id: data.id,
            code: data.code,
            teacherEmail: data.teacherEmail,
            teacherName: data.teacherName,
            teacherSignature: data.teacherSignature,
            subject: data.subject,
            className: data.className,
            questions: data.questions, // already stripped of correct answers by the server
            timeLimit: data.timeLimit,
            shuffle: data.shuffle,
            cameraMonitoring: data.cameraMonitoring,
            noiseMonitoring: data.noiseMonitoring,
            showResults: data.showResults,
            passMark: data.passMark
        };
        currentAssessmentCode = code;
        window.assessmentTeacherName = data.teacherName;
        window.assessmentTeacherSignature = data.teacherSignature;

        if (opts.silent) return true;
        if (codeFromURL) {
            document.getElementById('studentAccess').style.display = 'none';
            showAssessmentForm();
            document.getElementById('assessmentCode').value = code;
        } else {
            showAssessmentForm();
        }
        return true;
    } catch (e) {
        reportStudentAccessNetworkError(code, '', '', 'assessment_code');
        hideConnectBanner();
        alert('We could not reach the server after several tries.\n\nPlease check that your phone has internet or data, then try again in a minute. If it keeps happening, tell your teacher.');
    }
}

// ============================================================
// STUDENT QUIZ FUNCTIONS
// ============================================================

// ============================================================
// STUDENT QUIZ STATE PERSISTENCE (survive page refresh)
// ============================================================

function saveQuizState() {
    if (!currentAssessment) return;
    var state = {
        currentAssessment: currentAssessment,
        currentAssessmentCode: currentAssessmentCode,
        studentQuestions: studentQuestions,
        studentCurrentIndex: studentCurrentIndex,
        studentAnswers: studentAnswers,
        studentTimeRemaining: studentTimeRemaining,
        studentTimeLimit: studentTimeLimit,
        studentName: studentName,
        studentAdmissionNumber: studentAdmissionNumber,
        studentQuizStartedAt: studentQuizStartedAt,
        studentQuizEndsAt: studentQuizEndsAt,
        studentClass: studentClass,
        studentSubject: studentSubject,
        studentIsTimeUp: studentIsTimeUp,
        studentTabSwitchCount: studentTabSwitchCount,
        studentProctorStrikes: studentProctorStrikes,
        studentFastAnswerWarnings: studentFastAnswerWarnings,
        studentQuestionMs: studentQuestionMs,
        studentActiveOrigIndex: studentActiveOrigIndex,
        studentQuestionClockStart: studentQuestionClockStart,
        assessmentTeacherName: window.assessmentTeacherName || '',
        assessmentTeacherSignature: window.assessmentTeacherSignature || ''
    };
    try {
        localStorage.setItem('cleverment_quiz_state', JSON.stringify(state));
    } catch (e) {
        // Storage full or unavailable - fail silently, not critical
    }
}

function clearQuizState() {
    localStorage.removeItem('cleverment_quiz_state');
}

async function restoreQuizState() {
    // The student chose "Leave the assessment" with the back button: show the code page this one time.
    // The saved attempt (and its deadline) is kept, so entering the same code again resumes it.
    try {
        if (sessionStorage.getItem('cm_skip_restore_once')) {
            sessionStorage.removeItem('cm_skip_restore_once');
            return false;
        }
    } catch (e) {}
    var saved = localStorage.getItem('cleverment_quiz_state');
    if (!saved) return false;

    var state;
    try {
        state = JSON.parse(saved);
    } catch (e) {
        return false;
    }
    if (!state || !state.currentAssessment || !state.studentQuestions || state.studentQuestions.length === 0) {
        clearQuizState();
        return false;
    }

    // The assessment timer is based on an absolute deadline, not on how long
    // this page has remained open. This means closing the page, refreshing,
    // switching apps, or leaving the browser in the background does NOT pause
    // the assessment clock. Older saved states are supported by deriving the
    // deadline from their original start time.
    var savedStartedAt = Number(state.studentQuizStartedAt || 0);
    var savedEndsAt = Number(state.studentQuizEndsAt || 0);
    var savedLimit = Number(state.studentTimeLimit || 0);
    if (!savedEndsAt && savedStartedAt && savedLimit > 0) {
        savedEndsAt = savedStartedAt + (savedLimit * 1000);
    }
    if (!savedStartedAt || (savedLimit > 0 && !savedEndsAt)) {
        clearQuizState();
        return false;
    }

    // Before restoring, ask the backend whether this student is still eligible.
    // This prevents a submitted attempt from being resurrected from localStorage.
    if (!state.currentAssessmentCode || !state.studentAdmissionNumber) {
        clearQuizState();
        return false;
    }
    try {
        var eligibilityRes = await fetchWithRetry(BACKEND_URL + '/api/quiz/start-check', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, cmStudentAuthHeader()),
            body: JSON.stringify({
                code: state.currentAssessmentCode,
                // The server's start-check REQUIRES the student's name (it also
                // checks it against the class roster). Without it the server
                // always answered "missing_details", so every refresh threw the
                // student back to the name page and erased their progress.
                studentName: state.studentName || '',
                admissionNumber: state.studentAdmissionNumber
            })
        }, { attempts: 2, baseDelay: 1500 });
        var eligibility = await eligibilityRes.json().catch(function() { return {}; });
        if (!eligibilityRes.ok || !eligibility.allowed) {
            // If this saved attempt has reached its own deadline, keep the
            // local answers long enough to submit them automatically. A closed
            // assessment window must not strand a timed-out student. For other
            // rejection reasons (especially already_submitted), discard it.
            var deadlineExpired = savedLimit > 0 && savedEndsAt && Date.now() >= savedEndsAt;
            if (deadlineExpired && eligibility.reason === 'already_submitted') {
                // Time ran out while the student was away and the server has
                // already submitted their saved answers for them.
                clearQuizState();
                showAutoSubmittedNotice();
                return true;
            }
            if (!(deadlineExpired && eligibility.reason === 'closed')) {
                clearQuizState();
                return false;
            }
        }
    } catch (e) {
        // Do not resurrect an old quiz when its server-side status cannot be verified.
        clearQuizState();
        return false;
    }

    currentAssessment = state.currentAssessment;
    currentAssessmentCode = state.currentAssessmentCode;
    studentQuestions = state.studentQuestions;
    studentCurrentIndex = state.studentCurrentIndex || 0;
    studentAnswers = state.studentAnswers || new Array(studentQuestions.length).fill(null);
    studentTimeLimit = state.studentTimeLimit || 0;
    studentQuizEndsAt = savedEndsAt;
    studentTimeRemaining = studentTimeLimit > 0 && studentQuizEndsAt ? Math.max(0, Math.ceil((studentQuizEndsAt - Date.now()) / 1000)) : 0;
    studentName = state.studentName || '';
    studentAdmissionNumber = state.studentAdmissionNumber || '';
    studentQuizStartedAt = Number(state.studentQuizStartedAt || 0);
    studentClass = state.studentClass || '';
    studentSubject = state.studentSubject || '';
    studentIsTimeUp = state.studentIsTimeUp || false;
    studentTabSwitchCount = state.studentTabSwitchCount || 0;
    studentProctorStrikes = state.studentProctorStrikes || 0;
    studentFastAnswerWarnings = state.studentFastAnswerWarnings || 0;
    studentQuestionMs = state.studentQuestionMs || {};
    studentActiveOrigIndex = (typeof state.studentActiveOrigIndex === 'number') ? state.studentActiveOrigIndex : -1;
    studentQuestionClockStart = state.studentQuestionClockStart || 0;
    var restoredPhoto = '';
    try { restoredPhoto = localStorage.getItem('cleverment_student_photo') || ''; } catch (e) {}
    studentPhoto = (typeof eligibility !== 'undefined' && eligibility && eligibility.photo) ? eligibility.photo : restoredPhoto;
    window.assessmentTeacherName = state.assessmentTeacherName || '';
    window.assessmentTeacherSignature = state.assessmentTeacherSignature || '';

    var helpBtn = document.getElementById('needHelpBtn');
    if (helpBtn) helpBtn.style.display = 'none';

    document.querySelector('.header').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('studentAccess').style.display = 'none';
    document.getElementById('studentAssessmentView').style.display = 'block';
    document.getElementById('studentInfoForm').style.display = 'none';
    document.getElementById('studentQuizSection').style.display = 'block';
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';
    var tabWarningRestore = document.getElementById('studentTabSwitchWarning');
    if (tabWarningRestore) tabWarningRestore.style.display = studentTabSwitchCount > 0 ? 'block' : 'none';

    document.getElementById('studentQuizTitle').textContent = studentSubject;
    document.getElementById('studentQuizDisplay').textContent = 'Student: ' + studentName + ' | Class: ' + studentClass;
    studentRenderAvatar();

    var display = document.getElementById('studentTimerDisplay');
    if (studentTimeLimit > 0) {
        var mins = Math.floor(studentTimeRemaining / 60);
        var secs = studentTimeRemaining % 60;
        display.textContent = String(Math.max(mins, 0)).padStart(2, '0') + ':' + String(Math.max(secs, 0)).padStart(2, '0');
    } else {
        display.textContent = '∞';
    }
    display.classList.remove('warning', 'expired');
    studentRefreshTimerRing();

    studentCreateQuestionBoxes();
    studentPreloadImages();
    studentDisplayQuestion();
    studentUpdateNavigationButtons();

    if (studentTimeLimit > 0 && studentTimeRemaining <= 0) {
        studentIsTimeUp = false; // reset so studentTimeUp() will run its normal flow once
        studentTimeUp();
    } else if (!studentIsTimeUp) {
        studentStartTimer();
    }

    updateURL('student-assessment');
    startStudentPresence();
    startStudentProgressSync();

    if (currentAssessment.cameraMonitoring || currentAssessment.noiseMonitoring) {
        document.getElementById('proctorResumeOverlay').style.display = 'flex';
    }

    return true;
}

// ============================================================
// TAB-SWITCH DETECTION (student quiz) - doesn't block or
// auto-submit, since visibility changes can have innocent causes
// (a notification, a phone call). Instead it counts them and
// reports the count to the teacher alongside the result, so a
// teacher can use their judgment rather than the app guessing.
// ============================================================

function registerTabSwitch() {
    var quizVisible = document.getElementById('studentQuizSection') &&
        document.getElementById('studentQuizSection').style.display === 'block';
    if (!quizVisible || studentIsTimeUp) return;

    studentTabSwitchCount++;
    var warning = document.getElementById('studentTabSwitchWarning');
    if (warning) warning.style.display = 'block';
    saveQuizState();
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        registerTabSwitch();
        syncStudentProgress(true);
    } else {
        studentCheckDeadlineNow();
    }
});
window.addEventListener('pageshow', studentCheckDeadlineNow);
window.addEventListener('pagehide', function() { syncStudentProgress(true); });

// ============================================================
// CAMERA & NOISE MONITORING (student quiz) - optional, per
// assessment, toggled by the teacher. Nothing is ever recorded,
// stored, or uploaded: face detection and noise level checks run
// live in the browser and only their pass/fail result is ever
// used. Two warnings, then the assessment auto-submits.
// ============================================================

var FACEAPI_JS_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
var FACEAPI_MODELS_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights/';

function loadFaceApiIfNeeded() {
    return new Promise(function(resolve, reject) {
        if (faceApiReady && typeof faceapi !== 'undefined') {
            resolve();
            return;
        }
        if (typeof faceapi !== 'undefined') {
            faceapi.nets.tinyFaceDetector.loadFromUri(FACEAPI_MODELS_URL).then(function() {
                faceApiReady = true;
                resolve();
            }).catch(reject);
            return;
        }
        var script = document.createElement('script');
        script.src = FACEAPI_JS_URL;
        script.onload = function() {
            faceapi.nets.tinyFaceDetector.loadFromUri(FACEAPI_MODELS_URL).then(function() {
                faceApiReady = true;
                resolve();
            }).catch(reject);
        };
        script.onerror = function() {
            reject(new Error('Could not load the face-detection library.'));
        };
        document.head.appendChild(script);
    });
}

function showProctorWarningScreen() {
    var cam = currentAssessment.cameraMonitoring;
    var noise = currentAssessment.noiseMonitoring;
    var rules = document.getElementById('proctorWarningRules');

    if (cam && noise) {
        rules.textContent = 'This assessment uses your camera and microphone to check that you stay visible and in a quiet place. Keep your face in view of the camera at all times, and make sure your surroundings are quiet.';
    } else if (cam) {
        rules.textContent = 'This assessment uses your camera to check that you stay visible. Keep your face in view of the camera at all times.';
    } else {
        rules.textContent = 'This assessment uses your microphone to check that you stay in a quiet place. Make sure your surroundings are quiet.';
    }

    document.getElementById('studentInfoForm').style.display = 'none';
    document.getElementById('proctorWarningScreen').style.display = 'block';
    document.getElementById('proctorPermissionError').style.display = 'none';
    var btn = document.getElementById('proctorUnderstandBtn');
    btn.disabled = false;
    btn.textContent = 'I UNDERSTAND, START ASSESSMENT';
}

// Asks for the camera and/or microphone ONE AT A TIME so we can tell the student exactly which one was refused.
async function cmRequestProctorMedia(needsCamera, needsAudio) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        var u = new Error('unsupported'); u.cmWhich = 'browser'; throw u;
    }
    var tracks = [];
    try {
        if (needsCamera) {
            try {
                var vs = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
                tracks = tracks.concat(vs.getTracks());
            } catch (e1) { e1.cmWhich = 'camera'; throw e1; }
        }
        if (needsAudio) {
            try {
                var as = await navigator.mediaDevices.getUserMedia({ audio: true });
                tracks = tracks.concat(as.getTracks());
            } catch (e2) { e2.cmWhich = 'microphone'; throw e2; }
        }
    } catch (err) {
        tracks.forEach(function(t) { try { t.stop(); } catch (x) {} });
        throw err;
    }
    return new MediaStream(tracks);
}

function cmProctorErrorText(e) {
    var which = (e && e.cmWhich) || 'camera or microphone';
    var name = (e && e.name) || '';
    var head = 'This assessment cannot be opened. ';
    if (which === 'browser') return head + 'Your browser cannot use the camera/microphone here. Open CleverMent in Chrome (Android) or Safari (iPhone) and make sure the page address starts with https.';
    if (which === 'detector') return head + 'The camera check could not load. Check that your phone has internet, then tap Try again.';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return head + 'No ' + which + ' was found on this device. This assessment needs a working ' + which + '.';
    if (name === 'NotReadableError' || name === 'TrackStartError') return head + 'Your ' + which + ' is being used by another app. Close the other app, then tap Try again.';
    return head + 'You did not allow access to your ' + which + '. Your teacher turned on live monitoring for this assessment, so ' + which + ' access is required. To fix this: tap the lock or settings icon next to the web address, set ' + which + ' to Allow for this site, then tap Try again. If it still fails, reload the page.';
}

async function dismissProctorWarningAndBegin() {
    var btn = document.getElementById('proctorUnderstandBtn');
    var errorBox = document.getElementById('proctorPermissionError');
    errorBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Requesting access...';

    var needsCamera = currentAssessment.cameraMonitoring;
    var needsAudio = currentAssessment.noiseMonitoring;

    try {
        if (needsCamera) {
            btn.textContent = 'Loading face detector...';
            try { await loadFaceApiIfNeeded(); } catch (fe) { fe.cmWhich = 'detector'; throw fe; }
        }

        btn.textContent = 'Requesting camera/mic access...';
        proctorMediaStream = await cmRequestProctorMedia(needsCamera, needsAudio);

        document.getElementById('proctorWarningScreen').style.display = 'none';
        proceedToStartQuiz();
    } catch (e) {
        console.error('Proctor setup failed:', e);
        errorBox.textContent = cmProctorErrorText(e);
        errorBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'TRY AGAIN';
        try { errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {}
    }
}

function startProctorMonitoring() {
    proctorConsecutiveNoFace = 0;
    proctorConsecutiveLoudNoise = 0;
    if (proctorMediaStream) {
        proctorMediaStream.getTracks().forEach(function(t) {
            t.onended = function() {
                var ov = document.getElementById('proctorResumeOverlay');
                if (ov && !studentIsTimeUp) {
                    var b = document.getElementById('proctorResumeBtn'); if (b) { b.disabled = false; b.textContent = 'Allow access & Continue'; }
                    ov.style.display = 'flex';
                }
            };
        });
    }

    if (currentAssessment.cameraMonitoring && proctorMediaStream) {
        var previewVideo = document.getElementById('proctorCameraPreview');
        previewVideo.srcObject = proctorMediaStream;
        document.getElementById('proctorCameraPreviewBox').style.display = 'block';

        proctorFaceCheckInterval = setInterval(function() {
            runFaceCheck(previewVideo);
        }, 3000);
    }

    if (currentAssessment.noiseMonitoring && proctorMediaStream) {
        document.getElementById('proctorAudioIndicator').style.display = 'block';
        try {
            var AudioCtx = window.AudioContext || window.webkitAudioContext;
            proctorAudioContext = new AudioCtx();
            var source = proctorAudioContext.createMediaStreamSource(proctorMediaStream);
            var analyser = proctorAudioContext.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            var dataArray = new Uint8Array(analyser.frequencyBinCount);

            proctorAudioCheckInterval = setInterval(function() {
                analyser.getByteTimeDomainData(dataArray);
                var sum = 0;
                for (var i = 0; i < dataArray.length; i++) {
                    var val = (dataArray[i] - 128) / 128;
                    sum += val * val;
                }
                var rms = Math.sqrt(sum / dataArray.length);
                if (rms > 0.12) {
                    proctorConsecutiveLoudNoise++;
                    if (proctorConsecutiveLoudNoise >= 3) {
                        proctorConsecutiveLoudNoise = 0;
                        registerProctorViolation('Excessive background noise detected.');
                    }
                } else {
                    proctorConsecutiveLoudNoise = 0;
                }
            }, 1000);
        } catch (e) {
            console.error('Noise monitoring could not start:', e);
        }
    }
}

async function runFaceCheck(videoEl) {
    if (!faceApiReady || !videoEl || videoEl.readyState < 2) return;
    try {
        // Very forgiving settings after real-world testing showed the
        // previous tuning was still too sensitive in normal dim rooms.
        // This trades some strictness for far fewer false positives.
        var options = new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.1 });
        var detection = await faceapi.detectSingleFace(videoEl, options);
        if (!detection) {
            proctorConsecutiveNoFace++;
            // Requires 8 consecutive misses (about 24 seconds at the
            // current 3-second check interval) before it counts as a
            // real violation.
            if (proctorConsecutiveNoFace >= 8) {
                proctorConsecutiveNoFace = 0;
                registerProctorViolation('Your face was not visible in the camera.');
            }
        } else {
            proctorConsecutiveNoFace = 0;
        }
    } catch (e) {
        // A single failed detection frame isn't worth acting on.
    }
}

function registerProctorViolation(reason) {
    var quizVisible = document.getElementById('studentQuizSection') &&
        document.getElementById('studentQuizSection').style.display === 'block';
    if (!quizVisible || studentIsTimeUp) return;

    studentProctorStrikes++;
    saveQuizState();

    if (studentProctorStrikes >= 3) {
        endQuizForProctorViolation();
        return;
    }

    showProctorViolationModal(reason, studentProctorStrikes);
}

function showProctorViolationModal(reason, strikeCount) {
    var overlay = document.getElementById('proctorViolationOverlay');
    document.getElementById('proctorViolationReason').textContent = reason;
    document.getElementById('proctorViolationCount').textContent = 'Warning ' + strikeCount + ' of 2. One more violation and this assessment will end automatically.';
    overlay.style.display = 'flex';
}

function dismissProctorViolationModal() {
    document.getElementById('proctorViolationOverlay').style.display = 'none';
}

function stopProctorMonitoring() {
    if (proctorFaceCheckInterval) {
        clearInterval(proctorFaceCheckInterval);
        proctorFaceCheckInterval = null;
    }
    if (proctorAudioCheckInterval) {
        clearInterval(proctorAudioCheckInterval);
        proctorAudioCheckInterval = null;
    }
    if (proctorAudioContext) {
        try { proctorAudioContext.close(); } catch (e) {}
        proctorAudioContext = null;
    }
    if (proctorMediaStream) {
        proctorMediaStream.getTracks().forEach(function(track) { track.stop(); });
        proctorMediaStream = null;
    }
    var previewBox = document.getElementById('proctorCameraPreviewBox');
    if (previewBox) previewBox.style.display = 'none';
    var audioIndicator = document.getElementById('proctorAudioIndicator');
    if (audioIndicator) audioIndicator.style.display = 'none';
}

function endQuizForProctorViolation() {
    stopProctorMonitoring();
    studentStopTimer();
    studentEndReason = 'misconduct';
    document.getElementById('proctorViolationOverlay').style.display = 'none';
    studentSubmitQuiz();
}

async function resumeProctorMonitoringAfterRefresh() {
    var btn = document.getElementById('proctorResumeBtn');
    btn.disabled = true;
    btn.textContent = 'Requesting access...';

    var needsCamera = currentAssessment.cameraMonitoring;
    var needsAudio = currentAssessment.noiseMonitoring;

    try {
        if (needsCamera) { try { await loadFaceApiIfNeeded(); } catch (fe) { fe.cmWhich = 'detector'; throw fe; } }
        proctorMediaStream = await cmRequestProctorMedia(needsCamera, needsAudio);
        document.getElementById('proctorResumeOverlay').style.display = 'none';
        startProctorMonitoring();
    } catch (e) {
        alert(cmProctorErrorText(e).replace('This assessment cannot be opened. ', 'You cannot continue this assessment. '));
        btn.disabled = false;
        btn.textContent = 'Resume Monitoring & Continue';
    }
}

function shuffleOptionsForQuestion(q) {
    if (!q.options || q.options.length < 2) return q;

    var indices = [];
    for (var i = 0; i < q.options.length; i++) indices.push(i);
    for (var k = indices.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1));
        var temp = indices[k]; indices[k] = indices[j]; indices[j] = temp;
    }

    var newOptions = [];
    for (var m = 0; m < indices.length; m++) {
        newOptions.push(q.options[indices[m]]);
    }

    // No correctAnswer letter to keep in sync anymore - the server
    // grades by comparing option TEXT, so shuffled order alone is
    // all that's needed here.
    q.options = newOptions;
    return q;
}

// If a roster has been uploaded for this teacher+class, only admission
// numbers on that roster may take the assessment. If no roster exists
// for this class at all, everyone is allowed through (unrestricted) -
// rostering is opt-in, not a default requirement.
async function checkStudentOnRoster(teacherEmail, className, admissionNumber) {
    var roster = await getRosterForClass(teacherEmail, className);
    if (!roster || roster.length === 0) return true; // no roster set up - no restriction
    var normalized = admissionNumber.trim().toLowerCase();
    return roster.some(function(entry) {
        return (entry.admissionNumber || '').trim().toLowerCase() === normalized;
    });
}

async function hasAlreadyAttempted(assessmentCode, admissionNumberToCheck) {
    try {
        var { data, error } = await supabase
            .from('cleverment_results')
            .select('id')
            .eq('assessment_code', assessmentCode)
            .ilike('admission_number', admissionNumberToCheck.trim())
            .limit(1);
        if (error) return false; // fail open - a check error should never block a legitimate student
        return !!(data && data.length > 0);
    } catch (e) {
        return false;
    }
}

async function startStudentQuiz() {
    var nameInput = document.getElementById('studentNameInput');
    var admissionInput = document.getElementById('studentAdmissionNumber');

    studentName = nameInput.value.trim();
    if (!studentName) {
        alert('Please enter your name!');
        nameInput.focus();
        return;
    }

    studentAdmissionNumber = admissionInput.value.trim();
    if (await cmResumeSavedAttempt()) return; // a started attempt is never restarted (the timer must not reset)
    if (!studentAdmissionNumber) {
        alert('Please enter your admission number!');
        admissionInput.focus();
        return;
    }

    if (!currentAssessment) {
        alert('No assessment loaded. Please enter the assessment code again.');
        return;
    }

    studentClass = currentAssessment.className;

    var startBtn = document.getElementById('studentStartQuizBtn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Checking...';
    }

    try {
        var eligibilityRes = await fetchWithRetry(BACKEND_URL + '/api/quiz/start-check', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, cmStudentAuthHeader()),
            body: JSON.stringify({
                code: currentAssessmentCode,
                studentName: studentName,
                admissionNumber: studentAdmissionNumber
            })
        }, { attempts: 5, label: 'Checking your details' });
        var eligibility = await eligibilityRes.json().catch(function() { return {}; });

        if (!eligibilityRes.ok || !eligibility.allowed) {
            if (eligibility.reason === 'invalid_name') {
                alert('Unable to start assessment: the name you entered does not match the class roster. Please check your name and try again.');
            } else if (eligibility.reason === 'invalid_admission') {
                alert('Unable to start assessment: the admission number you entered does not match the class roster. Please check it and try again.');
            } else if (eligibility.reason === 'invalid_name_and_admission' || eligibility.reason === 'not_on_roster') {
                alert('Unable to start assessment: your name and/or admission number do not match the class roster. Please check your details and try again.');
            } else if (eligibility.reason === 'already_submitted') {
                alert('A student with admission number "' + studentAdmissionNumber + '" has already submitted this assessment (Code: ' + currentAssessmentCode + '). Each student can only take a given assessment once. If this is a mistake, please contact your teacher.');
            } else if (eligibility.reason === 'not_yet_open' || eligibility.reason === 'closed') {
                alert(eligibility.error || 'This assessment is not currently available.');
            } else {
                alert(eligibility.error || 'We could not verify your eligibility to start this assessment. Please try again.');
            }
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = 'Start Assessment';
            }
            return;
        }
        setStudentPhoto(eligibility.photo || '');
    } catch (e) {
        reportStudentAccessNetworkError(currentAssessmentCode, studentName, studentAdmissionNumber, 'start_check');
        alert('Could not verify your assessment status. Please check your connection and try again.');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Assessment';
        }
        return;
    }

    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Assessment';
    }

    if (currentAssessment.cameraMonitoring || currentAssessment.noiseMonitoring) {
        showProctorWarningScreen();
        return;
    }

    proceedToStartQuiz();
}

function proceedToStartQuiz() {
    studentQuizStartedAt = Date.now();
    studentQuizEndsAt = 0;
    var helpBtn = document.getElementById('needHelpBtn');
    if (helpBtn) helpBtn.style.display = 'none';

    studentSubject = currentAssessment.subject;
    studentQuestions = JSON.parse(JSON.stringify(currentAssessment.questions));
    studentTimeLimit = currentAssessment.timeLimit || 0;
    studentQuizEndsAt = studentTimeLimit > 0 ? studentQuizStartedAt + (studentTimeLimit * 1000) : 0;
    studentTimeRemaining = studentTimeLimit;

    if (currentAssessment.shuffle) {
        var shuffled = [];
        var indices = [];
        for (var i = 0; i < studentQuestions.length; i++) {
            indices.push(i);
        }
        for (var k = indices.length - 1; k > 0; k--) {
            var j = Math.floor(Math.random() * (k + 1));
            var temp = indices[k];
            indices[k] = indices[j];
            indices[j] = temp;
        }
        for (var m = 0; m < indices.length; m++) {
            shuffled.push(studentQuestions[indices[m]]);
        }
        studentQuestions = shuffled;

        for (var n = 0; n < studentQuestions.length; n++) {
            studentQuestions[n] = shuffleOptionsForQuestion(studentQuestions[n]);
        }
    }

    // Random pool: each student gets a different random selection of the questions.
    var poolLimit = parseInt(currentAssessment.questionLimit, 10) || 0;
    if (poolLimit > 0 && poolLimit < studentQuestions.length) {
        var pick = studentQuestions.slice();
        for (var pk = pick.length - 1; pk > 0; pk--) {
            var pj = Math.floor(Math.random() * (pk + 1));
            var ptmp = pick[pk]; pick[pk] = pick[pj]; pick[pj] = ptmp;
        }
        studentQuestions = pick.slice(0, poolLimit);
    }
    studentCurrentIndex = 0;
    studentAnswers = new Array(studentQuestions.length).fill(null);
    studentIsTimeUp = false;
    // A previous student's submission may have disabled the shared Submit button.
    // Always restore the button to a clean state when a new attempt begins.
    var freshSubmitBtn = document.getElementById('studentSubmitBtn');
    if (freshSubmitBtn) {
        freshSubmitBtn.disabled = false;
        freshSubmitBtn.textContent = 'Submit';
        freshSubmitBtn.removeAttribute('aria-busy');
    }
    studentTabSwitchCount = 0;
    studentProctorStrikes = 0;
    studentFastAnswerWarnings = 0;
    studentRecentPickGaps = [];
    studentQuestionMs = {};
    studentActiveOrigIndex = -1;
    studentQuestionClockStart = 0;
    studentFlagged = {};
    studentFlaggedFor = '';
    studentReviewMarks = {};
    studentReviewFor = '';
    try { localStorage.removeItem('cleverment_flags_' + currentAssessmentCode + '_' + String(studentAdmissionNumber || '').toLowerCase()); } catch (e) {}
    studentEndReason = 'normal';

    document.getElementById('studentInfoForm').style.display = 'none';
    document.getElementById('studentQuizSection').style.display = 'block';
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';
    var tabWarning = document.getElementById('studentTabSwitchWarning');
    if (tabWarning) tabWarning.style.display = 'none';

    document.getElementById('studentQuizTitle').textContent = studentSubject;
    document.getElementById('studentQuizDisplay').textContent = 'Student: ' + studentName + ' | Class: ' + studentClass;
    studentRenderAvatar();

    var display = document.getElementById('studentTimerDisplay');
    if (studentTimeLimit > 0) {
        var mins = Math.floor(studentTimeLimit / 60);
        var secs = studentTimeLimit % 60;
        display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        studentRefreshTimerRing(studentTimeLimit);
    } else {
        studentRefreshTimerRing();
        display.textContent = '∞';
    }
    display.classList.remove('warning', 'expired');

    studentCreateQuestionBoxes();
    studentPreloadImages();
    studentDisplayQuestion();
    studentUpdateNavigationButtons();
    studentStartTimer();
    updateURL('student-assessment');
    saveQuizState();
    startStudentPresence();
    startStudentProgressSync();

    if (currentAssessment.cameraMonitoring || currentAssessment.noiseMonitoring) {
        startProctorMonitoring();
    }
}

function studentCreateQuestionBoxes() {
    var container = document.getElementById('studentQuestionBoxes');
    container.innerHTML = '';
    for (var i = 0; i < studentQuestions.length; i++) {
        var box = document.createElement('div');
        box.className = 'q-box';
        box.id = 'student-qbox-' + i;
        box.textContent = i + 1;
        box.onclick = (function(index) {
            return function() {
                studentGoToQuestion(index);
            };
        })(i);
        container.appendChild(box);
    }
}

function studentGoToQuestion(index) {
    if (index >= 0 && index < studentQuestions.length) {
        studentCurrentIndex = index;
        studentDisplayQuestion();
        studentUpdateNavigationButtons();
        studentUpdateQuestionBoxes();
    }
}

function studentUpdateQuestionBoxes() {
    for (var i = 0; i < studentQuestions.length; i++) {
        var box = document.getElementById('student-qbox-' + i);
        if (!box) continue;
        box.classList.remove('answered', 'current');
        if (studentAnswers[i] !== null) {
            box.classList.add('answered');
        }
        if (i === studentCurrentIndex) {
            box.classList.add('current');
        }
    }
}

function studentDisplayQuestion() {
    var q = studentQuestions[studentCurrentIndex];
    studentQuestionShownAt = Date.now();
    studentTrackQuestionSwitch(q);
    studentUpdateFlagButton();
    studentUpdateReviewButton();
    document.getElementById('studentQuestionText').textContent = (studentCurrentIndex + 1) + '. ' + q.question;
    document.getElementById('studentProgress').textContent = 'Q' + (studentCurrentIndex + 1) + ' of ' + studentQuestions.length;

    var imageContainer = document.getElementById('studentQuestionImageContainer');
    var imageElement = document.getElementById('studentQuestionImage');
    var imageLoading = document.getElementById('studentQuestionImageLoading');
    if (q.image && q.image.trim() !== '') {
        imageContainer.style.display = 'block';
        imageElement.alt = 'Question image';

        if (preloadedImageCache[q.image] && preloadedImageCache[q.image].complete) {
            // Already warmed up by studentPreloadImages() - shows instantly.
            imageElement.style.display = 'block';
            if (imageLoading) imageLoading.style.display = 'none';
            imageElement.src = q.image;
        } else {
            imageElement.style.display = 'none';
            if (imageLoading) {
                imageLoading.style.display = 'block';
                imageLoading.textContent = '';
                var spinnerHTML = '<div style="width:28px; height:28px; margin:0 auto 8px; border:3px solid #eef2f6; border-top-color:#2d6cdf; border-radius:50%; animation:cm-spin 0.8s linear infinite;"></div>Loading image...';
                imageLoading.innerHTML = spinnerHTML;
            }
            imageElement.onload = function() {
                imageElement.style.display = 'block';
                if (imageLoading) imageLoading.style.display = 'none';
            };
            imageElement.onerror = function() {
                if (imageLoading) imageLoading.textContent = 'Image could not be loaded.';
            };
            imageElement.src = q.image;
        }
    } else {
        imageContainer.style.display = 'none';
        imageElement.style.display = 'block';
        imageElement.src = '';
    }

    var container = document.getElementById('studentOptionsContainer');
    container.innerHTML = '';

    var letters = ['A', 'B', 'C', 'D'];
    for (var i = 0; i < q.options.length; i++) {
        var div = document.createElement('div');
        div.className = 'option';
        div.textContent = letters[i] + '. ' + q.options[i];
        div.dataset.index = i;

        if (studentAnswers[studentCurrentIndex] === letters[i]) {
            div.classList.add('selected');
        }

        div.onclick = (function(index) {
            return function() {
                if (!studentIsTimeUp) studentSelectOption(index);
            };
        })(i);

        container.appendChild(div);
    }

    renderMathIn(document.getElementById('studentQuestionText'));
    renderMathIn(container);

    studentUpdateQuestionBoxes();
    studentUpdateNavigationButtons();
}

function studentSelectOption(index) {
    if (studentIsTimeUp || studentFastWarningOpen) return;
    var letters = ['A', 'B', 'C', 'D'];
    var wasFirstAnswer = studentAnswers[studentCurrentIndex] === null;
    studentAnswers[studentCurrentIndex] = letters[index];

    var options = document.querySelectorAll('#studentOptionsContainer .option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('selected');
        if (i === index) {
            options[i].classList.add('selected');
        }
    }

    studentUpdateQuestionBoxes();
    saveQuizState();
    queueStudentProgressSync();
    studentCheckFastAnswer(wasFirstAnswer);

    if (studentCurrentIndex < studentQuestions.length - 1) {
        setTimeout(function() {
            studentCurrentIndex++;
            studentDisplayQuestion();
            studentUpdateNavigationButtons();
            saveQuizState();
        }, 300);
    }
}

function studentPrevQuestion() {
    if (studentCurrentIndex > 0) {
        studentCurrentIndex--;
        studentDisplayQuestion();
        studentUpdateNavigationButtons();
        saveQuizState();
    }
}

function studentNextQuestion() {
    if (studentCurrentIndex < studentQuestions.length - 1) {
        studentCurrentIndex++;
        studentDisplayQuestion();
        studentUpdateNavigationButtons();
        saveQuizState();
    }
}

function studentUpdateNavigationButtons() {
    document.getElementById('studentPrevBtn').disabled = (studentCurrentIndex === 0);
    document.getElementById('studentNextBtn').disabled = (studentCurrentIndex === studentQuestions.length - 1);
}

// ============================================================
// SERVER PROGRESS SAVE + DEADLINE CHECK
// The browser saves the student's answers on the server every few seconds.
// If the student leaves and the time runs out, the server submits those
// answers automatically (see /api/quiz/progress in server.js).
// ============================================================

function studentQuizIsOnScreen() {
    var sec = document.getElementById('studentQuizSection');
    return !!sec && sec.style.display === 'block';
}

function studentCheckDeadlineNow() {
    if (studentIsTimeUp || !studentQuizIsOnScreen()) return;
    if (studentTimeLimit > 0 && studentQuizEndsAt && Date.now() >= studentQuizEndsAt) {
        studentTimeUp();
    }
}

function buildStudentAnswersPayload() {
    studentAccrueQuestionTime();
    var letters = ['A', 'B', 'C', 'D'];
    var payload = [];
    for (var i = 0; i < studentQuestions.length; i++) {
        var q = studentQuestions[i];
        var letterIdx = letters.indexOf(studentAnswers[i]);
        var selectedText = letterIdx !== -1 ? (q.options[letterIdx] || null) : null;
        payload.push({ originalIndex: q.originalIndex, selectedOptionText: selectedText, ms: Math.round(studentQuestionMs[q.originalIndex] || 0) });
    }
    return payload;
}

function syncStudentProgress(useKeepalive) {
    if (studentIsTimeUp || !currentAssessmentCode || !studentName || !studentAdmissionNumber) return;
    if (!studentQuestions || studentQuestions.length === 0 || !studentQuizIsOnScreen()) return;
    try {
        fetch(BACKEND_URL + '/api/quiz/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: !!useKeepalive,
            body: JSON.stringify({
                code: currentAssessmentCode,
                studentName: studentName,
                admissionNumber: studentAdmissionNumber,
                answers: buildStudentAnswersPayload(),
                tabSwitches: studentTabSwitchCount,
                proctorViolations: studentProctorStrikes,
                fastAnswerWarnings: studentFastAnswerWarnings
            })
        }).catch(function() { /* offline - the next sync will catch up */ });
    } catch (e) { /* never let a background save disturb the quiz */ }
}

function queueStudentProgressSync() {
    if (studentProgressDebounce) clearTimeout(studentProgressDebounce);
    studentProgressDebounce = setTimeout(function() { syncStudentProgress(false); }, 8000);
}

function startStudentProgressSync() {
    stopStudentProgressSync();
    syncStudentProgress(false);
    studentProgressTimer = setInterval(function() { syncStudentProgress(false); }, 20000);
}

function stopStudentProgressSync() {
    if (studentProgressTimer) { clearInterval(studentProgressTimer); studentProgressTimer = null; }
    if (studentProgressDebounce) { clearTimeout(studentProgressDebounce); studentProgressDebounce = null; }
}

// Shown when a student comes back after their time ended and the server has
// already submitted their saved answers.
function showAutoSubmittedNotice() {
    stopStudentProgressSync();
    document.querySelector('.header').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('studentAccess').style.display = 'none';
    document.getElementById('studentAssessmentView').style.display = 'block';
    document.getElementById('studentInfoForm').style.display = 'none';
    document.getElementById('studentQuizSection').style.display = 'none';
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';
    studentEndReason = 'timeup';
    renderSimpleSubmittedScreen();
    updateURL('results');
}

// ============================================================
// FAST-ANSWER DETECTION
// If a student picks answers faster than the question could realistically
// be read, show a warning and flag the result for the teacher.
// ============================================================

function studentCheckFastAnswer(wasFirstAnswer) {
    if (!wasFirstAnswer || !studentQuestionShownAt) return;
    var q = studentQuestions[studentCurrentIndex];
    if (!q) return;
    var text = (q.question || '') + ' ' + (q.options || []).join(' ');
    var words = text.trim().split(/\s+/).length;
    // About 0.12s per word, never less than 1.5s and never more than 5s.
    var minReadMs = Math.min(5000, Math.max(1500, words * 120));
    var gap = Date.now() - studentQuestionShownAt;

    studentRecentPickGaps.push(gap < minReadMs);
    if (studentRecentPickGaps.length > 4) studentRecentPickGaps.shift();

    var fastCount = 0;
    for (var i = 0; i < studentRecentPickGaps.length; i++) {
        if (studentRecentPickGaps[i]) fastCount++;
    }
    // 3 hurried answers out of the last 4 triggers the warning.
    if (fastCount >= 3 && !studentFastWarningOpen) {
        studentRecentPickGaps = [];
        studentFastAnswerWarnings++;
        saveQuizState();
        syncStudentProgress(false);
        showFastAnswerWarning();
    }
}

function showFastAnswerWarning() {
    var overlay = document.getElementById('fastAnswerOverlay');
    if (!overlay || studentIsTimeUp) return;
    studentFastWarningOpen = true;
    overlay.style.display = 'flex';
    var btn = document.getElementById('fastAnswerOkBtn');
    var left = 4;
    btn.disabled = true;
    btn.textContent = 'Please read (' + left + ')';
    var iv = setInterval(function() {
        left--;
        if (left <= 0) {
            clearInterval(iv);
            btn.disabled = false;
            btn.textContent = 'I will read carefully';
        } else {
            btn.textContent = 'Please read (' + left + ')';
        }
    }, 1000);
}

function dismissFastAnswerWarning() {
    var overlay = document.getElementById('fastAnswerOverlay');
    if (overlay) overlay.style.display = 'none';
    studentFastWarningOpen = false;
    studentQuestionShownAt = Date.now();
}

// ============================================================
// STUDENT TIMER
// ============================================================


// ============================================================
// CIRCULAR TIMER + STUDENT PICTURE
// ============================================================

var studentPhoto = '';

function setStudentPhoto(photo) {
    studentPhoto = photo || '';
    try {
        if (studentPhoto) localStorage.setItem('cleverment_student_photo', studentPhoto);
        else localStorage.removeItem('cleverment_student_photo');
    } catch (e) { /* storage full or blocked - the picture is a bonus */ }
}

function studentInitials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    var first = parts[0].charAt(0);
    var second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + second).toUpperCase();
}

// Shows the student's picture beside their name, or a circle with their initials when there is no picture.
function studentRenderAvatar() {
    cmLoadSchoolForAssessment(currentAssessmentCode);
    var img = document.getElementById('studentAvatarImg');
    var ini = document.getElementById('studentAvatarInitials');
    if (!img || !ini) return;
    if (studentPhoto) {
        img.src = studentPhoto;
        img.style.display = 'block';
        ini.style.display = 'none';
    } else {
        img.style.display = 'none';
        img.removeAttribute('src');
        ini.textContent = studentInitials(studentName);
        ini.style.display = 'flex';
    }
}

// Colours the ring and sets how much of it is left.
// green: plenty of time | yellow: 30% left | red: last 10% (or the last minute) - and it pulses.
function studentRefreshTimerRing(remaining) {
    var ring = document.getElementById('studentTimerRing');
    var arc = document.getElementById('studentTimerArc');
    var noLimit = document.getElementById('studentNoTimeLimit');
    if (!ring || !arc) return;
    var limit = studentTimeLimit;
    if (!limit) {
        ring.style.display = 'none';
        if (noLimit) noLimit.style.display = 'inline';
        return;
    }
    ring.style.display = '';
    if (noLimit) noLimit.style.display = 'none';
    if (typeof remaining !== 'number') {
        remaining = studentQuizEndsAt ? Math.max(0, Math.ceil((studentQuizEndsAt - Date.now()) / 1000)) : limit;
    }
    remaining = Math.max(0, Math.min(limit, remaining));
    var circumference = 2 * Math.PI * 44;
    arc.style.strokeDasharray = String(circumference);
    arc.style.strokeDashoffset = String(circumference * (1 - remaining / limit));

    var redAt = Math.max(limit * 0.10, Math.min(60, limit * 0.2));
    var state = 'ok';
    if (remaining <= redAt) state = 'danger';
    else if (remaining <= limit * 0.30) state = 'caution';
    ring.classList.remove('ok', 'caution', 'danger', 'pulse');
    ring.classList.add(state);
    if (state === 'danger' && remaining > 0) ring.classList.add('pulse');
    var display = document.getElementById('studentTimerDisplay');
    if (display) display.classList.toggle('long', display.textContent.length > 5);
}

function studentStartTimer() {
    if (studentTimerInterval) clearInterval(studentTimerInterval);
    if (studentTimeLimit === 0) {
        document.getElementById('studentTimerDisplay').textContent = '∞';
        studentRefreshTimerRing();
        return;
    }

    // The deadline is absolute. setInterval is only responsible for updating
    // the display; it is NOT the source of truth for elapsed time. Therefore
    // browser throttling/backgrounding cannot pause the assessment.
    if (!studentQuizEndsAt) {
        studentQuizEndsAt = Date.now() + (studentTimeLimit * 1000);
    }

    function tick() {
        var remaining = Math.max(0, Math.ceil((studentQuizEndsAt - Date.now()) / 1000));
        studentTimeRemaining = remaining;
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        var display = document.getElementById('studentTimerDisplay');
        if (display) {
            display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
            // The colour now belongs to the ring; the digits just follow it.
            display.classList.remove('warning');
        }
        studentRefreshTimerRing(remaining);

        if (remaining <= 0) {
            if (display) {
                display.classList.add('expired');
                display.classList.remove('warning');
            }
            studentTimeUp();
            return;
        }
        saveQuizState();
    }

    tick();
    if (studentIsTimeUp) return;
    studentTimerInterval = setInterval(tick, 1000);
}

function studentStopTimer() {
    if (studentTimerInterval) {
        clearInterval(studentTimerInterval);
        studentTimerInterval = null;
    }
}

function studentGetTimeTaken() {
    var totalSeconds;
    if (studentTimeLimit > 0 && studentQuizStartedAt) {
        totalSeconds = Math.max(0, Math.min(studentTimeLimit, Math.floor((Date.now() - studentQuizStartedAt) / 1000)));
    } else {
        totalSeconds = Math.max(0, studentTimeLimit - studentTimeRemaining);
    }
    var mins = Math.floor(totalSeconds / 60);
    var secs = totalSeconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function studentTimeUp() {
    if (studentIsTimeUp) return;
    studentIsTimeUp = true;
    studentEndReason = 'timeup';
    studentTimeRemaining = 0;
    studentStopTimer();
    var fastOverlay = document.getElementById('fastAnswerOverlay');
    if (fastOverlay) fastOverlay.style.display = 'none';
    studentFastWarningOpen = false;
    var display = document.getElementById('studentTimerDisplay');
    if (display) {
        display.textContent = '00:00';
        display.classList.add('expired');
        display.classList.remove('warning');
    }
    studentRefreshTimerRing(0);

    var overlay = document.createElement('div');
    overlay.className = 'time-up-overlay';
    overlay.id = 'studentTimeUpOverlay';
    overlay.innerHTML = `
        <div class="time-up-box">
            <h2>Time is Up</h2>
            <p>Your assessment time has ended.<br>Submitting your answers automatically...</p>
            <div class="time-up-spinner" aria-label="Submitting"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Do not ask for permission. studentSubmitQuiz() skips the unanswered
    // question confirmation when studentIsTimeUp is true.
    setTimeout(function() {
        studentSubmitQuiz();
    }, 150);
}

// ============================================================
// STUDENT SUBMIT QUIZ
// ============================================================

function getAllResultsLocal() {
    var stored = localStorage.getItem('cleverment_all_results');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { return []; }
    }
    return [];
}

// ============================================================
// RESULTS & ASSESSMENTS: SHARED DATABASE READS (so every
// teacher/admin dashboard sees the same data, on any device)
// ============================================================

function normalizeResultRow(r) {
    return {
        id: r.id,
        teacherEmail: r.teacher_email,
        studentName: r.student_name,
        admissionNumber: r.admission_number || '',
        className: r.class_name,
        subject: r.subject,
        score: r.score,
        correctAnswers: r.correct_answers,
        totalQuestions: r.total_questions,
        timeTaken: r.time_taken,
        assessmentCode: r.assessment_code,
        tabSwitches: r.tab_switches || 0,
        proctorViolations: r.proctor_violations || 0,
        fastAnswerWarnings: r.fast_answer_warnings || 0,
        retakeAllowed: !!r.retake_allowed,
        createdAt: r.created_at || '',
        qTimes: Array.isArray(r.answers) ? r.answers.map(function(a) { return (a && typeof a.timeSeconds === 'number') ? a.timeSeconds : null; }) : [],
        qCorrect: Array.isArray(r.answers) ? r.answers.map(function(a) { return a && a.isCorrect ? 1 : 0; }) : [],
        date: r.created_at ? new Date(r.created_at).toLocaleString() : ''
    };
}

async function getAllResultsFromDatabase() {
    try {
        var { data, error } = await supabase
            .from('cleverment_results')
            .select('*')
            .order('id', { ascending: false });
        if (error || !data) return getAllResultsLocal();
        return data.map(normalizeResultRow);
    } catch (e) {
        return getAllResultsLocal();
    }
}

function normalizeAssessmentRow(a) {
    return {
        id: a.id,
        code: a.code,
        teacherEmail: a.teacher_email,
        teacherName: a.teacher_name || 'Unknown Teacher',
        teacherSignature: a.teacher_signature || '',
        subject: a.subject,
        className: a.class_name,
        questions: a.questions,
        timeLimit: a.time_limit,
        shuffle: a.shuffle,
        cameraMonitoring: a.camera_monitoring || false,
        noiseMonitoring: a.noise_monitoring || false,
        showResults: a.show_results !== false,
        passMark: (a.pass_mark !== null && a.pass_mark !== undefined) ? a.pass_mark : 50,
        questionLimit: parseInt(a.question_limit, 10) || 0,
        negativeMarking: Number(a.negative_marking) || 0,
        availableFrom: a.available_from || null,
        availableUntil: a.available_until || null,
        date: a.created_at ? new Date(a.created_at).toLocaleString() : ''
    };
}

async function getTeacherAssessmentsFromBackend() {
    var teacherToken = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/assessments', {
            headers: { 'Authorization': 'Bearer ' + teacherToken }
        });
        var data = await res.json();
        if (!res.ok) return getPublishedAssessmentsLocal();
        return (data.assessments || []).map(normalizeAssessmentRow);
    } catch (e) {
        return getPublishedAssessmentsLocal();
    }
}

async function getAdminAssessmentsFromBackend() {
    var adminToken = localStorage.getItem('cleverment_admin_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/assessments', {
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        var data = await res.json();
        if (!res.ok) return [];
        return (data.assessments || []).map(normalizeAssessmentRow);
    } catch (e) {
        return [];
    }
}

async function adminDeleteAssessment(id) {
    if (!confirm('Delete this assessment? Students will no longer be able to take it with its code.')) return;
    var adminToken = localStorage.getItem('cleverment_admin_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/assessments/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not delete assessment.'));
            return;
        }
        alert('Assessment deleted.');
        renderAdminAssessmentList();
    } catch (e) {
        alert('Could not reach the server. Please check your connection.');
    }
}

var studentAutoSubmitRetries = 0;

async function studentSubmitQuiz() {
    // Note: the "Time is Up / Submitting" overlay is only removed once the
    // submission has actually gone through, so a timed-out student never sees
    // a half-finished screen or a confirmation prompt.
    studentStopTimer();

    var unansweredIndexes = [];
    for (var ua = 0; ua < studentAnswers.length; ua++) {
        if (studentAnswers[ua] === null) unansweredIndexes.push(ua);
    }
    var unanswered = unansweredIndexes.length > 0;
    if (unanswered && !studentIsTimeUp && studentEndReason !== 'misconduct') {
        var count = unansweredIndexes.length;
        var firstUnanswered = unansweredIndexes[0];
        alert('Unable to submit assessment. Please complete all ' + count + ' unanswered question(s) before submitting. You will be taken to the first unanswered question.');
        studentCurrentIndex = firstUnanswered;
        studentDisplayQuestion();
        studentUpdateNavigationButtons();
        studentUpdateQuestionBoxes();
        var questionArea = document.getElementById('studentQuestionText');
        if (questionArea && questionArea.scrollIntoView) {
            questionArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        saveQuizState();
        studentStartTimer();
        return;
    }

    var submitBtn = document.getElementById('studentSubmitBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

    var letters = ['A', 'B', 'C', 'D'];
    studentAccrueQuestionTime();
    var answersPayload = [];
    for (var i = 0; i < studentQuestions.length; i++) {
        var q = studentQuestions[i];
        var userLetter = studentAnswers[i];
        var letterIdx = letters.indexOf(userLetter);
        var selectedText = letterIdx !== -1 ? (q.options[letterIdx] || null) : null;
        answersPayload.push({ originalIndex: q.originalIndex, selectedOptionText: selectedText, ms: Math.round(studentQuestionMs[q.originalIndex] || 0) });
    }

    studentTimeTaken = studentGetTimeTaken();

    var data;
    try {
        var res = await fetch(BACKEND_URL + '/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: currentAssessmentCode,
                studentName: studentName,
                admissionNumber: studentAdmissionNumber,
                answers: answersPayload,
                tabSwitches: studentTabSwitchCount,
                proctorViolations: studentProctorStrikes,
                fastAnswerWarnings: studentFastAnswerWarnings,
                shownIndices: studentQuestions.map(function(q) { return q.originalIndex; }),
                timeTaken: studentTimeTaken
            })
        });
        data = await res.json();
        if (!res.ok) {
            if (studentIsTimeUp || studentEndReason === 'misconduct') {
                // Automatic submissions never ask the student for anything.
                if (res.status === 409) {
                    // The server already submitted this attempt for them.
                    clearQuizState();
                    stopProctorMonitoring();
                    stopStudentPresence();
                    stopStudentProgressSync();
                    var doneOverlay = document.getElementById('studentTimeUpOverlay');
                    if (doneOverlay) doneOverlay.remove();
                    document.getElementById('studentQuizSection').style.display = 'none';
                    renderSimpleSubmittedScreen();
                    updateURL('results');
                    return;
                }
                if (studentAutoSubmitRetries < 8) {
                    studentAutoSubmitRetries++;
                    setTimeout(studentSubmitQuiz, 3000);
                }
                return;
            }
            alert('Could not submit your assessment: ' + (data.error || 'Unknown error') + '\n\nYour answers are still here - please try Submit again.');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; }
            if (!studentIsTimeUp && studentEndReason !== 'misconduct') studentStartTimer();
            return;
        }
    } catch (e) {
        if (studentIsTimeUp || studentEndReason === 'misconduct') {
            // No pop-ups for automatic submissions: keep retrying quietly.
            // (The server also holds the saved answers and will submit them.)
            if (studentAutoSubmitRetries < 8) {
                studentAutoSubmitRetries++;
                setTimeout(studentSubmitQuiz, 3000);
            }
            return;
        }
        cmScheduleOfflineSubmit();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; }
        if (!studentIsTimeUp && studentEndReason !== 'misconduct') studentStartTimer();
        return;
    }

    clearQuizState();
    stopProctorMonitoring();
    stopStudentPresence();
    stopStudentProgressSync();
    studentAutoSubmitRetries = 0;
    cmClearOfflineSubmit();
    var timeUpOverlayDone = document.getElementById('studentTimeUpOverlay');
    if (timeUpOverlayDone) timeUpOverlayDone.remove();

    var helpBtn = document.getElementById('needHelpBtn');
    if (helpBtn) helpBtn.style.display = 'block';
    var whatsappBtn = document.getElementById('whatsappFloatBtn');
    if (whatsappBtn) whatsappBtn.style.display = 'inline-flex';

    studentScore = data.score;
    studentCorrect = data.correctAnswers;
    studentTotal = data.totalQuestions;
    var corrections = data.corrections || [];

    document.getElementById('studentQuizSection').style.display = 'none';

    if (!data.showResults) {
        renderSimpleSubmittedScreen();
        updateURL('results');
        return;
    }

    document.getElementById('studentResultsSection').style.display = 'block';
    document.getElementById('studentCertificateSection').style.display = 'none';

    var endBanner = document.getElementById('studentEndReasonBanner');
    if (studentEndReason === 'misconduct') {
        endBanner.textContent = 'This assessment was submitted due to misconduct (a monitoring violation).';
        endBanner.style.display = 'block';
    } else if (studentEndReason === 'timeup') {
        endBanner.textContent = 'Time was up - this assessment was submitted automatically.';
        endBanner.style.display = 'block';
    } else {
        endBanner.style.display = 'none';
    }

    var grade = getGrade(studentScore);
    var passed = data.passed;
    var passMark = data.passMark;

    document.getElementById('studentScoreDisplay').innerHTML = `
        <span class="grade">${grade}</span>
        ${studentScore}% (${studentCorrect}/${studentTotal})<br>
        <span style="display:inline-block; margin-top:6px; padding:4px 14px; border-radius:20px; font-weight:700; font-size:13px; background:${passed ? '#e6f7ec' : '#fdecec'}; color:${passed ? '#1f8a4c' : '#c0392b'};">${passed ? 'PASSED' : 'NOT PASSED'} (Pass mark: ${passMark}%)</span><br>
        <span class="result-details">
            Class: ${studentClass} | Student: ${studentName} | Subject: ${studentSubject} | Time: ${studentTimeTaken}
        </span>
    `;

    var container = document.getElementById('studentCorrectionsContainer');
    container.innerHTML = '<h3>Corrections</h3>';
    for (var j = 0; j < corrections.length; j++) {
        var item = corrections[j];
        var div = document.createElement('div');
        div.className = 'correction-item';
        div.innerHTML = `
            <p><strong>Q${j + 1}:</strong> ${item.question}</p>
            <p>Your answer: <strong style="color:${item.isCorrect ? '#2d9c5c' : '#dc3545'}">${item.userAnswerText || 'Not answered'}</strong></p>
            ${!item.isCorrect ? '<p>Correct answer: <strong style="color:#2d9c5c">' + item.correctAnswerText + '</strong></p>' : ''}
            ${item.explanation ? '<p class="explain">&#128161; ' + escapeHtml(item.explanation) + '</p>' : ''}
            <p>${item.isCorrect ? 'Correct' : 'Wrong'}</p>
        `;
        container.appendChild(div);
        renderMathIn(div);
    }
    
    updateURL('results');
}

function renderSimpleSubmittedScreen() {
    var msgEl = document.getElementById('studentSimpleSubmittedMessage');
    if (studentEndReason === 'misconduct') {
        msgEl.textContent = 'Assessment has been submitted due to misconduct.';
    } else if (studentEndReason === 'timeup') {
        msgEl.textContent = 'Time was up - your assessment has been submitted automatically.';
    } else {
        msgEl.textContent = 'Assessment Submitted Successfully.';
    }
    document.getElementById('studentSimpleSubmittedScreen').style.display = 'block';
}

// ============================================================
// STUDENT CERTIFICATE
// ============================================================

function getGrade(score) {
    if (score >= 80) return 'Excellent';
    else if (score >= 65) return 'Very Good';
    else if (score >= 50) return 'Good';
    else if (score >= 40) return 'Fair';
    else return 'Needs Improvement';
}

function formatDate(date) {
    var d = new Date(date);
    var day = d.getDate();
    var month = d.toLocaleString('default', { month: 'long' });
    var year = d.getFullYear();
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var seconds = d.getSeconds();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    var suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return day + suffix + ' ' + month + ' ' + year + ', ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
}

// ============================================================
// CERTIFICATE BUILDING (shared by single-student download and
// the teacher's bulk ZIP download below)
// ============================================================

function buildCertificateElement(data) {
    var cleanCert = document.createElement('div');
    cleanCert.style.width = '297mm';
    cleanCert.style.height = '210mm';
    cleanCert.style.position = 'relative';
    cleanCert.style.overflow = 'hidden';
    cleanCert.style.background = 'radial-gradient(circle at center, #ffffff 0%, #fdfcf9 65%, #f7f3e8 100%)';
    cleanCert.style.boxSizing = 'border-box';
    cleanCert.style.margin = '0';
    cleanCert.style.padding = '0';

    // ----- BORDERS -----
    var border1 = document.createElement('div');
    border1.style.cssText = 'position:absolute; top:7mm; left:7mm; right:7mm; bottom:7mm; border:3.5mm solid #1a1a2e; z-index:1;';
    cleanCert.appendChild(border1);

    var border2 = document.createElement('div');
    border2.style.cssText = 'position:absolute; top:11mm; left:11mm; right:11mm; bottom:11mm; border:1.8mm solid #C9A84C; z-index:2;';
    cleanCert.appendChild(border2);

    var border3 = document.createElement('div');
    border3.style.cssText = 'position:absolute; top:14mm; left:14mm; right:14mm; bottom:14mm; border:0.45mm solid #1a1a2e; z-index:3;';
    cleanCert.appendChild(border3);

    // ----- CORNERS -----
    var corners = [
        {top:'6mm', left:'6mm', bw:'2mm 0 0 2mm'},
        {top:'6mm', right:'6mm', bw:'2mm 2mm 0 0'},
        {bottom:'6mm', left:'6mm', bw:'0 0 2mm 2mm'},
        {bottom:'6mm', right:'6mm', bw:'0 2mm 2mm 0'}
    ];
    for (var i = 0; i < corners.length; i++) {
        var c = document.createElement('div');
        c.style.cssText = 'position:absolute; width:26mm; height:26mm; border-color:#C9A84C; border-style:solid; z-index:4;';
        if (corners[i].top) c.style.top = corners[i].top;
        if (corners[i].left) c.style.left = corners[i].left;
        if (corners[i].right) c.style.right = corners[i].right;
        if (corners[i].bottom) c.style.bottom = corners[i].bottom;
        c.style.borderWidth = corners[i].bw;
        cleanCert.appendChild(c);
    }

    // ----- WATERMARK -----
    var wm = document.createElement('div');
    wm.style.cssText = 'position:absolute; width:145mm; height:145mm; border-radius:50%; border:0.5mm solid rgba(201,168,76,0.07); top:50%; left:50%; transform:translate(-50%, -50%); z-index:0;';
    cleanCert.appendChild(wm);

    // ----- CONTENT -----
    var content = document.createElement('div');
    content.style.cssText = 'position:absolute; z-index:10; top:17mm; left:50%; transform:translateX(-50%); width:235mm; height:174mm; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center;';

    var logo = document.createElement('img');
    logo.src = data.schoolLogo || (window.cmActiveSchool && window.cmActiveSchool.logo) || 'logo.png';
    logo.style.cssText = 'width:42mm; height:27mm; object-fit:contain; display:block; margin:0 0 2mm 0';
    content.appendChild(logo);
    var certSchool = (window.cmActiveSchool && window.cmActiveSchool.name) || '';
    if (certSchool) {
        var schoolLine = document.createElement('div');
        schoolLine.textContent = certSchool;
        schoolLine.style.cssText = 'font-family:Georgia,serif; font-size:13pt; font-weight:bold; letter-spacing:1px; color:#444; margin:0 0 2mm 0;';
        content.appendChild(schoolLine);
    }

    var h1 = document.createElement('div');
    h1.textContent = 'CERTIFICATE';
    h1.style.cssText = 'font-size:32pt; font-weight:bold; color:#1a1a2e; letter-spacing:4px; font-family:Georgia,serif;';
    content.appendChild(h1);

    var h2 = document.createElement('div');
    h2.textContent = 'Of Achievement';
    h2.style.cssText = 'font-size:18pt; color:#C9A84C; letter-spacing:2px; font-weight:bold; font-family:Georgia,serif; margin:1mm 0 3mm;';
    content.appendChild(h2);

    var divLine = document.createElement('div');
    divLine.style.cssText = 'width:65mm; height:1.2mm; background:#C9A84C; margin:0 auto 4mm; position:relative;';
    var d1 = document.createElement('span');
    d1.textContent = '◆';
    d1.style.cssText = 'position:absolute; top:-5px; left:-12px; color:#C9A84C; font-size:9px;';
    var d2 = document.createElement('span');
    d2.textContent = '◆';
    d2.style.cssText = 'position:absolute; top:-5px; right:-12px; color:#C9A84C; font-size:9px;';
    divLine.appendChild(d1);
    divLine.appendChild(d2);
    content.appendChild(divLine);

    var p1 = document.createElement('div');
    p1.textContent = 'This is to certify that';
    p1.style.cssText = 'font-size:14pt; color:#555; font-family:Georgia,serif; margin:0 0 3mm;';
    content.appendChild(p1);

    var nameEl = document.createElement('div');
    nameEl.textContent = data.studentName || 'Student Name';
    nameEl.style.cssText = 'font-size:29pt; font-weight:bold; color:#1a1a2e; padding:0 18mm 2.5mm; min-width:120mm; border-bottom:1.2mm solid #C9A84C; font-family:Georgia,serif; margin:0;';
    content.appendChild(nameEl);

    var p2 = document.createElement('div');
    p2.textContent = 'has successfully completed the assessment in';
    p2.style.cssText = 'font-size:13.5pt; color:#555; font-family:Georgia,serif; margin:4mm 0 2mm;';
    content.appendChild(p2);

    var subEl = document.createElement('div');
    subEl.textContent = data.subject || 'Subject';
    subEl.style.cssText = 'font-size:21pt; font-weight:bold; color:#1a1a2e; font-family:Georgia,serif; margin:0 0 3mm;';
    content.appendChild(subEl);

    var p3 = document.createElement('div');
    p3.textContent = 'with an average score of';
    p3.style.cssText = 'font-size:13.5pt; color:#555; font-family:Georgia,serif; margin:0 0 1mm;';
    content.appendChild(p3);

    var scoreEl = document.createElement('div');
    var grade = getGrade(data.score || 0);
    scoreEl.textContent = (data.score || 0) + '% - ' + grade;
    scoreEl.style.cssText = 'font-size:19pt; font-weight:bold; color:#1a1a2e; font-family:Georgia,serif; margin:0;';
    content.appendChild(scoreEl);

    var bottom = document.createElement('div');
    bottom.style.cssText = 'width:190mm; display:flex; justify-content:space-between; align-items:flex-end; margin-top:4mm;';

    var teacherDiv = document.createElement('div');
    teacherDiv.style.cssText = 'width:70mm; text-align:center;';
    var tLabel = document.createElement('div');
    tLabel.textContent = 'Teacher';
    tLabel.style.cssText = 'font-size:11pt; color:#555; font-family:Georgia,serif; margin-bottom:2mm;';
    teacherDiv.appendChild(tLabel);
    var tName = document.createElement('div');
    tName.textContent = data.teacherName || 'Unknown Teacher';
    tName.style.cssText = 'font-size:13pt; font-weight:bold; padding-bottom:2mm; border-bottom:0.5mm solid #1a1a2e; font-family:Georgia,serif;';
    teacherDiv.appendChild(tName);
    bottom.appendChild(teacherDiv);

    var sigDiv = document.createElement('div');
    sigDiv.style.cssText = 'width:70mm; text-align:center;';
    var sLabel = document.createElement('div');
    sLabel.textContent = 'Signature';
    sLabel.style.cssText = 'font-size:11pt; color:#555; font-family:Georgia,serif; margin-bottom:2mm;';
    sigDiv.appendChild(sLabel);
    var sigImg = document.createElement('img');
    var sigUrl = data.teacherSignature || '';
    if (sigUrl) {
        sigImg.src = sigUrl;
        sigImg.style.cssText = 'height:15mm; max-width:55mm; object-fit:contain; display:block; margin:0 auto 1mm;';
    } else {
        sigImg.style.display = 'none';
    }
    sigDiv.appendChild(sigImg);
    var sLine = document.createElement('div');
    sLine.style.cssText = 'border-bottom:0.5mm solid #1a1a2e; height:2mm;';
    sigDiv.appendChild(sLine);
    bottom.appendChild(sigDiv);
    content.appendChild(bottom);

    var footer = document.createElement('div');
    footer.style.cssText = 'position:absolute; z-index:20; bottom:17mm; left:20mm; right:20mm; display:flex; justify-content:space-between; align-items:center; border-top:0.5mm solid #C9A84C; padding-top:3mm; font-size:8.5pt; color:#555; font-family:Georgia,serif;';

    var dateEl = document.createElement('div');
    dateEl.innerHTML = 'Issued on: <strong style="color:#1a1a2e;">' + formatDate(data.dateObj || new Date()) + '</strong>';
    footer.appendChild(dateEl);

    var idEl = document.createElement('div');
    var certId = 'CERT-' + String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);
    idEl.innerHTML = 'Certificate ID: <strong style="color:#1a1a2e;">' + certId + '</strong>';
    footer.appendChild(idEl);

    var codeEl = document.createElement('div');
    codeEl.innerHTML = 'Code: <strong style="color:#1a1a2e;">' + (data.code || 'CODE-0000') + '</strong>';
    footer.appendChild(codeEl);

    cleanCert.appendChild(content);
    cleanCert.appendChild(footer);

    // Student picture: passport-style portrait with a gold frame, top-right inside the inner border
    // (an empty corner, clear of the logo, the title and the student's name).
    if (data.studentPhoto) {
        var photoWrap = document.createElement('div');
        photoWrap.style.cssText = 'position:absolute; z-index:15; top:22mm; right:27mm; width:36mm; text-align:center;';
        var frame = document.createElement('div');
        frame.style.cssText = 'width:30mm; height:38mm; padding:1mm; background:#ffffff; border:1.2mm solid #C9A84C; box-shadow:0 0.8mm 2.2mm rgba(0,0,0,0.22); box-sizing:content-box; margin:0 auto;';
        var pimg = document.createElement('img');
        pimg.src = data.studentPhoto;
        pimg.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
        frame.appendChild(pimg);
        photoWrap.appendChild(frame);
        if (data.admissionNumber) {
            var cap = document.createElement('div');
            cap.textContent = 'Adm. No: ' + data.admissionNumber;
            cap.style.cssText = 'font-size:8pt; color:#555; font-family:Georgia,serif; margin-top:2.2mm; white-space:nowrap;';
            photoWrap.appendChild(cap);
        }
        cleanCert.appendChild(photoWrap);
    }
    return cleanCert;
}

function waitForCertificateImages(container, timeoutMs) {
    var imgs = container.querySelectorAll('img');
    var promises = [];
    for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].complete) continue;
        promises.push(new Promise(function(resolve) {
            imgs[i].onload = resolve;
            imgs[i].onerror = resolve;
        }));
    }
    if (promises.length === 0) return Promise.resolve();
    return Promise.race([
        Promise.all(promises),
        new Promise(function(resolve) { setTimeout(resolve, timeoutMs || 4000); })
    ]);
}

// ============================================================
// DOWNLOAD CERTIFICATE AS PDF (One Click - CLEAN)
// ============================================================

function downloadCertificatePDF() {
    var tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed; left:-9999px; top:0; width:297mm; height:210mm; margin:0; padding:0; background:white; z-index:-1; overflow:hidden;';

    var cleanCert = buildCertificateElement({
        studentName: studentName,
        subject: studentSubject,
        score: studentScore,
        teacherName: window.assessmentTeacherName,
        teacherSignature: window.assessmentTeacherSignature,
        code: currentAssessmentCode,
        studentPhoto: studentPhoto,
        admissionNumber: studentAdmissionNumber,
        dateObj: new Date()
    });
    tempDiv.appendChild(cleanCert);
    document.body.appendChild(tempDiv);

    waitForCertificateImages(cleanCert, 4000).then(function() {
        return html2canvas(cleanCert, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 297 * 3.779,
            height: 210 * 3.779,
            logging: false
        });
    }).then(function(canvas) {
        var imgData = canvas.toDataURL('image/jpeg', 0.98);
        var jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDFCtor) {
            throw new Error('jsPDF library not found. Please check that jspdf.umd.min.js loaded correctly.');
        }
        var pdf = new jsPDFCtor('landscape', 'mm', 'a4');
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
        pdf.save('Certificate-' + studentName + '.pdf');
        document.body.removeChild(tempDiv);
    }).catch(function(error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF: ' + error.message);
        document.body.removeChild(tempDiv);
    });
}

// ============================================================
// DOWNLOAD CERTIFICATE AS IMAGE (One Click - CLEAN)
// ============================================================

function downloadCertificateImage() {
    var tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed; left:-9999px; top:0; width:297mm; height:210mm; margin:0; padding:0; background:white; z-index:-1; overflow:hidden;';

    var cleanCert = buildCertificateElement({
        studentName: studentName,
        subject: studentSubject,
        score: studentScore,
        teacherName: window.assessmentTeacherName,
        teacherSignature: window.assessmentTeacherSignature,
        code: currentAssessmentCode,
        studentPhoto: studentPhoto,
        admissionNumber: studentAdmissionNumber,
        dateObj: new Date()
    });
    tempDiv.appendChild(cleanCert);
    document.body.appendChild(tempDiv);

    waitForCertificateImages(cleanCert, 4000).then(function() {
        return html2canvas(cleanCert, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 297 * 3.779,
            height: 210 * 3.779,
            logging: false
        });
    }).then(function(canvas) {
        var link = document.createElement('a');
        link.download = 'Certificate-' + studentName + '.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(tempDiv);
    }).catch(function(error) {
        if (tempDiv.parentNode) document.body.removeChild(tempDiv);
        alert('Could not create the certificate image: ' + (error && error.message ? error.message : error));
    });
}

function studentPrintCertificate() {
    var certificate = document.getElementById('studentCertificatePreview');
    var printContents = certificate.innerHTML;
    
    var printWindow = window.open('', '_blank', 'width=900,height=600');
    printWindow.document.write('<style>body { margin: 0; padding: 0; background: white; } .certificate { margin: 0 auto; } .print-btn { display: none !important; }</style>');
    printWindow.document.write('<html><head><title>Certificate</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        @page {
            size: A4 landscape;
            margin: 0;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .certificate {
            width: 297mm;
            height: 210mm;
            position: relative;
            overflow: hidden;
            background: radial-gradient(circle at center, #ffffff 0%, #fdfcf9 65%, #f7f3e8 100%);
            box-sizing: border-box;
            margin: 0;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        #studentCertificatePreview {
            display: block;
            margin: 0;
            padding: 0;
            width: 297mm;
            height: 210mm;
        }
        img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        div {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        @media print {
            html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
            }
            .certificate {
                width: 297mm;
                height: 210mm;
                margin: 0;
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            #studentCertificatePreview {
                width: 297mm;
                height: 210mm;
                margin: 0;
                padding: 0;
            }
        }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div id="studentCertificatePreview">');
    printWindow.document.write(printContents);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(function() {
        printWindow.focus();
        printWindow.print();
    }, 1000);
}

function studentBackToResults() {
    document.querySelector('.header').style.display = 'block';
    document.querySelector('.footer').style.display = 'block';
    
    document.getElementById('studentCertificateSection').style.display = 'none';
    document.getElementById('studentResultsSection').style.display = 'block';
    updateURL('results');
}

function studentResetQuiz() {
    studentStopTimer();
    stopStudentProgressSync();
    studentFastWarningOpen = false;
    var fastOv = document.getElementById('fastAnswerOverlay');
    if (fastOv) fastOv.style.display = 'none';
    studentFastAnswerWarnings = 0;
    studentRecentPickGaps = [];
    clearQuizState();
    stopProctorMonitoring();
    stopStudentPresence();
    preloadedImageCache = {};
    var helpBtn2 = document.getElementById('needHelpBtn');
    if (helpBtn2) helpBtn2.style.display = 'block';
    var whatsappBtn2 = document.getElementById('whatsappFloatBtn');
    if (whatsappBtn2) whatsappBtn2.style.display = 'inline-flex';
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentSimpleSubmittedScreen').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';
    document.getElementById('studentQuizSection').style.display = 'none';
    document.getElementById('proctorWarningScreen').style.display = 'none';
    // Go back to the page where a NEW assessment code is entered (not the
    // name / admission-number page of the assessment that was just finished).
    document.getElementById('studentInfoForm').style.display = 'none';
    document.getElementById('studentAssessmentView').style.display = 'none';
    document.getElementById('studentAccess').style.display = 'block';
    var newCodeInput = document.getElementById('assessmentCode');
    if (newCodeInput) { newCodeInput.value = ''; }
    document.getElementById('studentNameInput').value = '';
    document.getElementById('studentAdmissionNumber').value = '';
    studentQuestions = [];
    studentAnswers = [];
    studentCurrentIndex = 0;
    studentTimeRemaining = 0;
    studentIsTimeUp = false;
    var resetSubmitBtn = document.getElementById('studentSubmitBtn');
    if (resetSubmitBtn) {
        resetSubmitBtn.disabled = false;
        resetSubmitBtn.textContent = 'Submit';
        resetSubmitBtn.removeAttribute('aria-busy');
    }
    document.getElementById('studentTimerDisplay').textContent = '00:00';
    document.getElementById('studentTimerDisplay').classList.remove('warning', 'expired');
    setStudentPhoto('');
    var ringReset = document.getElementById('studentTimerRing');
    if (ringReset) ringReset.classList.remove('caution', 'danger', 'pulse');
    updateURL('student');
}

// ============================================================
// TEACHER: VIEW RESULTS
// ============================================================

var teacherResultsCache = [];
var teacherAssessmentsCache = [];

async function attachPassMarks(results, isAdmin) {
    var assessments = isAdmin ? await getAdminAssessmentsFromBackend() : await getTeacherAssessmentsFromBackend();
    var codeToPassMark = {};
    for (var i = 0; i < assessments.length; i++) {
        codeToPassMark[assessments[i].code] = (assessments[i].passMark !== null && assessments[i].passMark !== undefined) ? assessments[i].passMark : 50;
    }
    for (var j = 0; j < results.length; j++) {
        results[j].passMark = codeToPassMark.hasOwnProperty(results[j].assessmentCode) ? codeToPassMark[results[j].assessmentCode] : 50;
    }
    return results;
}

async function renderTeacherDashboard() {
    cmLoadMySchool();
    try { var pingToken = localStorage.getItem('cleverment_teacher_token'); if (pingToken) fetch(BACKEND_URL + '/api/teacher/ping', { method: 'POST', headers: { 'Authorization': 'Bearer ' + pingToken } }).catch(function() {}); } catch (e) {}
    loadTeacherProfile();
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    var allResults = await getAllResultsFromDatabase();
    var filtered = allResults.filter(function(r) { return r.teacherEmail === teacherEmail; });
    filtered = await attachPassMarks(filtered, false);
    teacherResultsCache = filtered;

    var classSelect = document.getElementById('teacherAdminFilterClass');
    if (classSelect) {
        var classes = ['all'];
        for (var i = 0; i < filtered.length; i++) {
            if (classes.indexOf(filtered[i].className) === -1) {
                classes.push(filtered[i].className);
            }
        }
        classSelect.innerHTML = '';
        for (var j = 0; j < classes.length; j++) {
            var opt = document.createElement('option');
            opt.value = classes[j];
            opt.textContent = classes[j] === 'all' ? 'All Classes' : classes[j];
            classSelect.appendChild(opt);
        }
    }

    var subjectSelect = document.getElementById('teacherAdminFilterSubject');
    if (subjectSelect) {
        var subjects = ['all'];
        for (var k = 0; k < filtered.length; k++) {
            if (subjects.indexOf(filtered[k].subject) === -1) {
                subjects.push(filtered[k].subject);
            }
        }
        subjectSelect.innerHTML = '';
        for (var l = 0; l < subjects.length; l++) {
            var opt2 = document.createElement('option');
            opt2.value = subjects[l];
            opt2.textContent = subjects[l] === 'all' ? 'All Subjects' : subjects[l];
            subjectSelect.appendChild(opt2);
        }
    }

    applyTeacherFilters();
    showTeacherSection('teacherOverviewPanel');
}

// The results the teacher is CURRENTLY looking at (class + subject filters
// applied, then sorted). Display, Export CSV, Clear and the multi-select tools
// all use this one list, so they always act on exactly what is on screen.
function getTeacherFilteredResults() {
    var filtered = teacherResultsCache.slice();

    var filterClass = document.getElementById('teacherAdminFilterClass');
    var filterSubject = document.getElementById('teacherAdminFilterSubject');
    var filterSort = document.getElementById('teacherAdminFilterSort');

    if (filterClass && filterClass.value !== 'all') {
        filtered = filtered.filter(function(r) { return r.className === filterClass.value; });
    }
    if (filterSubject && filterSubject.value !== 'all') {
        filtered = filtered.filter(function(r) { return r.subject === filterSubject.value; });
    }

    if (filterSort) {
        if (filterSort.value === 'recent') { filtered.sort(function(a,b) { return b.id - a.id; }); }
        else if (filterSort.value === 'score-high') { filtered.sort(function(a,b) { return b.score - a.score; }); }
        else if (filterSort.value === 'score-low') { filtered.sort(function(a,b) { return a.score - b.score; }); }
        else if (filterSort.value === 'name') { filtered.sort(function(a,b) { return a.studentName.localeCompare(b.studentName); }); }
    }
    return filtered;
}

function teacherFilterIsActive() {
    var c = document.getElementById('teacherAdminFilterClass');
    var su = document.getElementById('teacherAdminFilterSubject');
    return !!((c && c.value !== 'all') || (su && su.value !== 'all'));
}

function teacherFilterDescription() {
    var c = document.getElementById('teacherAdminFilterClass');
    var su = document.getElementById('teacherAdminFilterSubject');
    var parts = [];
    if (c && c.value !== 'all') parts.push('Class: ' + c.value);
    if (su && su.value !== 'all') parts.push('Subject: ' + su.value);
    return parts.join(', ');
}

var teacherSelectedResultIds = {};

function applyTeacherFilters() {
    var filtered = getTeacherFilteredResults();

    // Forget selections that are no longer visible, so a hidden result can
    // never be deleted by accident.
    var visibleIds = {};
    for (var vi = 0; vi < filtered.length; vi++) visibleIds[String(filtered[vi].id)] = true;
    for (var sid in teacherSelectedResultIds) {
        if (!visibleIds[sid]) delete teacherSelectedResultIds[sid];
    }

    var total = filtered.length;
    var totalScore = 0;
    var passed = 0;
    var classesSet = {};
    for (var i = 0; i < filtered.length; i++) {
        totalScore += filtered[i].score;
        var pm = (filtered[i].passMark !== null && filtered[i].passMark !== undefined) ? filtered[i].passMark : 50;
        if (filtered[i].score >= pm) passed++;
        classesSet[filtered[i].className] = true;
    }

    var statTotal = document.getElementById('teacherStatTotalStudents');
    var statAvg = document.getElementById('teacherStatAvgScore');
    var statPass = document.getElementById('teacherStatPassRate');
    var statClasses = document.getElementById('teacherStatClasses');

    if (statTotal) statTotal.textContent = total;
    if (statAvg) statAvg.textContent = total > 0 ? Math.round(totalScore / total) + '%' : '0%';
    if (statPass) statPass.textContent = total > 0 ? Math.round((passed / total) * 100) + '%' : '0%';
    if (statClasses) statClasses.textContent = Object.keys(classesSet).length;
    cmRefreshTeacherCharts(filtered);

    var tbody = document.getElementById('teacherResultsTableBody');
    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; color:#6b7a8f; padding:40px;">No results found.</td></tr>';
        refreshTeacherSelectionUI();
        return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
        var item = filtered[j];
        var scoreClass = item.score >= 70 ? 'score-high' : (item.score >= 50 ? 'score-mid' : 'score-low');
        var tabSwitchCell = item.tabSwitches > 0 ? '<span style="color:#e67e22; font-weight:600;">' + item.tabSwitches + '</span>' : '0';
        var proctorCell = item.proctorViolations > 0 ? '<span style="color:#dc3545; font-weight:600;">' + item.proctorViolations + '</span>' : '0';
        var isSel = !!teacherSelectedResultIds[String(item.id)];
        html += '<tr class="' + (isSel ? 'result-row-selected' : '') + '"><td class="select-cell"><input type="checkbox" class="result-select-box"' + (isSel ? ' checked' : '') + ' onchange="teacherToggleResultSelected(' + item.id + ', this)" aria-label="Select result"></td><td>' + (j+1) + '</td><td>' + item.className + '</td><td>' + escapeHtml(item.studentName) + resultRetakeBadgeHtml(item) + (item.fastAnswerWarnings > 0 ? '<br><span style=\"display:inline-block; margin-top:3px; padding:1px 7px; border-radius:10px; background:#fff3cd; color:#8a6d00; font-size:11px; font-weight:700;\" title=\"Student answered too quickly to have read the questions\">&#9888; Fast answering x' + item.fastAnswerWarnings + '</span>' : '') + '</td><td>' + (item.admissionNumber || '') + '</td><td>' + item.subject + '</td><td class="' + scoreClass + '">' + item.score + '%</td><td>' + item.correctAnswers + '/' + item.totalQuestions + '</td><td>' + item.timeTaken + '</td><td>' + tabSwitchCell + '</td><td>' + proctorCell + '</td><td>' + item.date + '</td><td class="result-action-cell"><button class="result-action-btn" onclick="openResultActions(\'teacher\',' + item.id + ')">⋮ Take Action</button></td></tr>';
    }
    tbody.innerHTML = html;
    refreshTeacherSelectionUI();
}


// ============================================================
// ALLOW RETAKE
// ============================================================

function resultRetakeBadgeHtml(item) {
    if (!item.retakeAllowed) return '';
    return '<br><span style="display:inline-block; margin-top:3px; padding:1px 7px; border-radius:10px; background:#e3f1ff; color:#1d5fbf; font-size:11px; font-weight:700;" title="This student may submit this assessment again. The new result will replace this one.">&#8635; Retake allowed</span>';
}

// Reloads the teacher's results from the database and redraws the table (keeps the current filters).
async function reloadTeacherResultsCache() {
    var email = currentTeacher ? currentTeacher.email : 'unknown';
    var all = await getAllResultsFromDatabase();
    var mine = all.filter(function(r) { return r.teacherEmail === email; });
    mine = await attachPassMarks(mine, false);
    teacherResultsCache = mine;
    rebuildTeacherFilterOptions();
    applyTeacherFilters();
}

async function allowRetakeForSelectedResult() {
    if (!pendingResultAction || !pendingResultAction.result) return;
    var role = pendingResultAction.role;
    var result = pendingResultAction.result;
    closeResultActions();

    var allow = !result.retakeAllowed;
    var question = allow
        ? 'Allow ' + result.studentName + ' to take "' + result.subject + '" again?\n\nTheir current result (' + result.score + '%) stays on the table until they submit again; then the new result replaces it.'
        : 'Cancel the retake permission for ' + result.studentName + '? Their current result will count again.';
    if (!confirm(question)) return;

    var token = role === 'admin' ? localStorage.getItem('cleverment_admin_token') : localStorage.getItem('cleverment_teacher_token');
    var endpoint = BACKEND_URL + '/api/' + (role === 'admin' ? 'admin' : 'teacher') + '/results/' + encodeURIComponent(result.id) + '/allow-retake';
    try {
        var res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ allow: allow })
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not change the retake permission.'));
            return;
        }
        result.retakeAllowed = allow;
        if (role === 'admin') renderAdminResults(); else applyTeacherFilters();
        if (allow) {
            alert('Done. ' + result.studentName + ' can now enter the assessment code again and retake it.');
        }
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again.');
    }
}

// ============================================================
// RE-GRADE / CREDIT HELPERS (editor)
// ============================================================

function cbNormText(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }

// Numbers (1-based, in the edited list) of questions whose correct answer letter was changed.
function keyChangedQuestionNumbers(oldQs, newQs) {
    var used = {};
    var out = [];
    (newQs || []).forEach(function(nq, j) {
        var oi = -1;
        for (var i = 0; i < oldQs.length; i++) {
            if (!used[i] && cbNormText(oldQs[i].question) === cbNormText(nq.question)) { oi = i; break; }
        }
        if (oi === -1 && oldQs[j] && !used[j]) {
            var stillThere = newQs.some(function(x) { return cbNormText(x.question) === cbNormText(oldQs[j].question); });
            if (!stillThere) oi = j;
        }
        if (oi === -1) return;
        used[oi] = true;
        if (String(oldQs[oi].correctAnswer || '').toUpperCase() !== String(nq.correctAnswer || '').toUpperCase()) out.push(j + 1);
    });
    return out;
}

async function creditAllForQuestion(index) {
    if (!currentAssessmentBeingEdited || assessmentEditorDraftMode) return;
    syncAssessmentEditorFromDOM();
    var q = (currentAssessmentBeingEdited.questions || [])[index];
    if (!q) return;
    var saved = null;
    for (var i = 0; i < teacherAssessmentsCache.length; i++) {
        if (String(teacherAssessmentsCache[i].id) === String(currentAssessmentBeingEdited.id)) { saved = teacherAssessmentsCache[i]; break; }
    }
    var inSaved = saved && (saved.questions || []).some(function(x) { return cbNormText(x.question) === cbNormText(q.question); });
    if (!inSaved) {
        alert('Please save your changes first (tap Save Changes), then give credit for this question.');
        return;
    }
    if (!confirm('Give EVERY student who took this assessment full credit for Question ' + (index + 1) + '?\n\nTheir scores are updated right away. Use this when a question was wrong or unclear.')) return;

    var token = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/assessments/' + encodeURIComponent(currentAssessmentBeingEdited.id) + '/credit-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ question: q.question })
        });
        var data = await res.json();
        if (!res.ok) { alert('Could not give credit: ' + (data.error || 'Unknown error.')); return; }
        var r = data.regrade || {};
        alert('Done. ' + (r.updated || 0) + ' result(s) were updated' + (r.scoreChanged ? ' (' + r.scoreChanged + ' score(s) went up).' : '.'));
        reloadTeacherResultsCache();
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again.');
    }
}

// ============================================================
// SHARE CODE ON WHATSAPP
// ============================================================

function shareAssessmentOnWhatsApp(assessmentId) {
    var a = null;
    for (var i = 0; i < teacherAssessmentsCache.length; i++) {
        if (String(teacherAssessmentsCache[i].id) === String(assessmentId)) { a = teacherAssessmentsCache[i]; break; }
    }
    if (!a) { alert('Could not find that assessment. Please refresh and try again.'); return; }

    function when(iso) {
        try { return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
    }
    var link = window.location.origin + window.location.pathname + '?code=' + encodeURIComponent(a.code);
    var lines = [];
    lines.push('\uD83D\uDCDD *' + a.subject + '* assessment - ' + a.className);
    lines.push('Assessment code: *' + a.code + '*');
    lines.push('Open this link (the code is filled in for you):');
    lines.push(link);
    if (a.timeLimit) lines.push('\u23F1 Time: ' + Math.round(a.timeLimit / 60) + ' minutes');
    if (a.availableFrom) lines.push('\uD83D\uDCC5 Opens: ' + when(a.availableFrom));
    if (a.availableUntil) lines.push('\uD83D\uDCC5 Closes: ' + when(a.availableUntil));
    lines.push('Good luck!');

    var url = 'https://wa.me/?text=' + encodeURIComponent(lines.join('\n'));
    var win = window.open(url, '_blank');
    if (!win) window.location.href = url;
}

// ============================================================
// BACKUP & EXPORT
// ============================================================

function cbDownloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
}

function backupSafeName(t) {
    return String(t || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Untitled';
}

function backupResultsCsv(results) {
    var head = ['Assessment Code', 'Class', 'Student', 'Admission No.', 'Subject', 'Score %', 'Correct', 'Total', 'Time Taken', 'Tab Switches', 'Cam/Noise Flags', 'Fast Answer Warnings', 'Date'];
    var out = [head.map(csvCell).join(',')];
    results.forEach(function(r) {
        out.push([r.assessmentCode, r.className, r.studentName, r.admissionNumber, r.subject, r.score, r.correctAnswers, r.totalQuestions, r.timeTaken, r.tabSwitches || 0, r.proctorViolations || 0, r.fastAnswerWarnings || 0, r.date].map(csvCell).join(','));
    });
    return out.join('\n');
}

// Questions in the CleverMent upload format (every question and option in double quotes), ready to publish again.
function backupQuestionsCsv(questions) {
    var rows = ['Question,Option A,Option B,Option C,Option D,Correct Answer,Image URL'];
    (questions || []).forEach(function(q) {
        var o = Array.isArray(q.options) ? q.options : [];
        rows.push([cbQuoteCell(q.question), cbQuoteCell(o[0]), cbQuoteCell(o[1]), cbQuoteCell(o[2]), cbQuoteCell(o[3]), String(q.correctAnswer || '').toUpperCase(), q.image ? csvCell(q.image) : ''].join(','));
    });
    return rows.join('\n');
}

async function loadBackupData() {
    var email = currentTeacher ? currentTeacher.email : 'unknown';
    var assessments = await getTeacherAssessmentsFromBackend();
    teacherAssessmentsCache = assessments;
    var all = await getAllResultsFromDatabase();
    var results = all.filter(function(r) { return r.teacherEmail === email; });
    return { email: email, assessments: assessments, results: results };
}

function setBackupStatus(text, isError) {
    var el = document.getElementById('backupStatus');
    if (!el) return;
    el.style.color = isError ? '#dc3545' : '#6b7a8f';
    el.textContent = text;
}

function showLastBackupTime() {
    var el = document.getElementById('backupLastTime');
    if (!el) return;
    var email = currentTeacher ? currentTeacher.email : 'unknown';
    var last = localStorage.getItem('cleverment_last_backup_' + email);
    el.textContent = last ? 'Last backup downloaded: ' + new Date(last).toLocaleString() : 'You have not downloaded a backup on this device yet.';
}

async function teacherDownloadAllResultsCsv() {
    setBackupStatus('Preparing your results...', false);
    try {
        var data = await loadBackupData();
        if (data.results.length === 0) { setBackupStatus('You have no results to export yet.', true); return; }
        cbDownloadBlob(new Blob([backupResultsCsv(data.results)], { type: 'text/csv' }), 'CleverMent-all-results-' + new Date().toISOString().slice(0, 10) + '.csv');
        setBackupStatus('Downloaded ' + data.results.length + ' result(s).', false);
    } catch (e) {
        setBackupStatus('Could not prepare the file: ' + e.message, true);
    }
}

async function teacherDownloadBackupZip() {
    if (typeof JSZip === 'undefined') {
        setBackupStatus('The ZIP tool did not load. Please check your internet connection and refresh the page.', true);
        return;
    }
    var btn = document.getElementById('backupZipBtn');
    if (btn) btn.disabled = true;
    setBackupStatus('Collecting your assessments and results...', false);
    try {
        var data = await loadBackupData();
        var zip = new JSZip();
        var today = new Date().toISOString().slice(0, 10);

        zip.file('results.csv', backupResultsCsv(data.results));

        var head = ['Code', 'Subject', 'Class', 'Questions', 'Time (minutes)', 'Pass mark %', 'Shuffle', 'Camera monitoring', 'Noise monitoring', 'Show results to student', 'Certificate name', 'Available from', 'Available until'];
        var summary = [head.map(csvCell).join(',')];
        var used = {};
        data.assessments.forEach(function(a) {
            summary.push([a.code, a.subject, a.className, (a.questions || []).length, a.timeLimit ? Math.round(a.timeLimit / 60) : 0, a.passMark, a.shuffle ? 'Yes' : 'No', a.cameraMonitoring ? 'Yes' : 'No', a.noiseMonitoring ? 'Yes' : 'No', a.showResults === false ? 'No' : 'Yes', a.teacherName || '', a.availableFrom || '', a.availableUntil || ''].map(csvCell).join(','));
            var base = backupSafeName(a.subject + '-' + a.className + '-' + a.code);
            var name = 'questions/' + base + '.csv';
            var n = 2;
            while (used[name]) { name = 'questions/' + base + '-' + n + '.csv'; n++; }
            used[name] = true;
            zip.file(name, backupQuestionsCsv(a.questions));
        });
        zip.file('assessments.csv', summary.join('\n'));

        zip.file('README.txt',
            'CleverMent backup - ' + today + '\n' +
            'Teacher: ' + data.email + '\n\n' +
            'results.csv      every student result (' + data.results.length + ')\n' +
            'assessments.csv  your assessments and their settings (' + data.assessments.length + ')\n' +
            'questions/       one CSV per assessment, in the CleverMent upload format.\n' +
            '                 To use one again: Publish Assessment > upload the CSV file.\n\n' +
            'Student certificates are not stored in the backup; they can be downloaded again from the results table.\n');

        setBackupStatus('Building the ZIP...', false);
        var blob = await zip.generateAsync({ type: 'blob' });
        cbDownloadBlob(blob, 'CleverMent-backup-' + today + '.zip');
        localStorage.setItem('cleverment_last_backup_' + data.email, new Date().toISOString());
        showLastBackupTime();
        setBackupStatus('Backup downloaded: ' + data.assessments.length + ' assessment(s) and ' + data.results.length + ' result(s).', false);
    } catch (e) {
        setBackupStatus('Could not create the backup: ' + e.message, true);
    } finally {
        if (btn) btn.disabled = false;
    }
}

var pendingResultAction = null;

function openResultActions(role, resultId) {
    var result = null;
    var cache = role === 'admin' ? adminResultsCache : teacherResultsCache;
    for (var i = 0; i < cache.length; i++) {
        if (String(cache[i].id) === String(resultId)) {
            result = cache[i];
            break;
        }
    }
    if (!result) {
        alert('Could not find this result. Please refresh the dashboard and try again.');
        return;
    }

    pendingResultAction = { role: role, result: result };
    var overlay = document.getElementById('resultActionOverlay');
    var message = document.getElementById('resultActionMessage');
    if (message) {
        message.textContent = result.studentName + ' — ' + result.subject + ' (' + result.score + '%)';
    }
    var retakeBtn = document.getElementById('resultActionRetake');
    if (retakeBtn) retakeBtn.textContent = result.retakeAllowed ? 'Cancel Retake Permission' : 'Allow Retake';
    if (overlay) overlay.style.display = 'flex';
}

function closeResultActions() {
    var overlay = document.getElementById('resultActionOverlay');
    if (overlay) overlay.style.display = 'none';
    pendingResultAction = null;
}

async function downloadResultCertificate() {
    if (!pendingResultAction || !pendingResultAction.result) return;
    var role = pendingResultAction.role;
    var result = pendingResultAction.result;
    closeResultActions();

    try {
        var assessments;
        if (role === 'teacher') {
            assessments = teacherAssessmentsCache && teacherAssessmentsCache.length
                ? teacherAssessmentsCache
                : await getTeacherAssessmentsFromBackend();
        } else {
            assessments = await getAdminAssessmentsFromBackend();
        }

        var assessment = null;
        for (var i = 0; i < assessments.length; i++) {
            if (assessments[i].code === result.assessmentCode) {
                assessment = assessments[i];
                break;
            }
        }

        if (!assessment) {
            alert('Could not find the assessment details needed to create this certificate.');
            return;
        }

        var singleCertData = {
            studentName: result.studentName,
            subject: result.subject,
            score: result.score,
            teacherName: assessment.teacherName,
            teacherSignature: assessment.teacherSignature,
            code: assessment.code,
            dateObj: new Date()
        };
        await attachRosterPhoto(singleCertData, result.className, result.admissionNumber);
        var blob = await generateCertificatePDFBlob(singleCertData);

        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Certificate-' + (result.studentName || 'Student').replace(/[\\/:*?"<>|]/g, '_') + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {
        console.error('Result certificate generation error:', e);
        alert('Error generating certificate: ' + e.message);
    }
}

async function deleteSelectedResult() {
    if (!pendingResultAction || !pendingResultAction.result) return;
    var role = pendingResultAction.role;
    var result = pendingResultAction.result;
    closeResultActions();

    if (!confirm('Delete the result for ' + result.studentName + '? This cannot be undone.')) return;

    var token = role === 'admin'
        ? localStorage.getItem('cleverment_admin_token')
        : localStorage.getItem('cleverment_teacher_token');
    var endpoint = role === 'admin'
        ? BACKEND_URL + '/api/admin/results/' + encodeURIComponent(result.id)
        : BACKEND_URL + '/api/teacher/results/' + encodeURIComponent(result.id);

    try {
        var res = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not delete this result.'));
            return;
        }

        var localResults = getAllResultsLocal();
        localResults = localResults.filter(function(r) { return String(r.id) !== String(result.id); });
        localStorage.setItem('cleverment_all_results', JSON.stringify(localResults));

        if (role === 'admin') {
            adminResultsCache = adminResultsCache.filter(function(r) { return String(r.id) !== String(result.id); });
            renderAdminResults();
        } else {
            teacherResultsCache = teacherResultsCache.filter(function(r) { return String(r.id) !== String(result.id); });
            renderTeacherDashboard();
        }
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again.');
    }
}

function setupResultActionModal() {
    var downloadBtn = document.getElementById('resultActionDownload');
    var deleteBtn = document.getElementById('resultActionDelete');
    var cancelBtn = document.getElementById('resultActionCancel');
    var overlay = document.getElementById('resultActionOverlay');
    if (downloadBtn) downloadBtn.onclick = downloadResultCertificate;
    if (deleteBtn) deleteBtn.onclick = deleteSelectedResult;
    var retakeBtnEl = document.getElementById('resultActionRetake');
    if (retakeBtnEl) retakeBtnEl.onclick = allowRetakeForSelectedResult;
    var timesBtnEl = document.getElementById('resultActionTimes');
    if (timesBtnEl) timesBtnEl.onclick = showQuestionTimesForSelected;
    if (cancelBtn) cancelBtn.onclick = closeResultActions;
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeResultActions();
        });
    }
}

function csvCell(value) {
    return '"' + String(value === null || value === undefined ? '' : value).replace(/"/g, '""') + '"';
}

// Updates the Export / Clear button labels and the multi-select bar.
function refreshTeacherSelectionUI() {
    var filtered = getTeacherFilteredResults();
    var active = teacherFilterIsActive();

    var exportBtn = document.getElementById('teacherExportBtn');
    var clearBtn = document.getElementById('teacherClearBtn');
    if (exportBtn) exportBtn.textContent = active ? 'Export CSV (' + filtered.length + ')' : 'Export CSV';
    if (clearBtn) clearBtn.textContent = active ? 'Clear Filtered (' + filtered.length + ')' : 'Clear All';

    var count = 0;
    for (var i = 0; i < filtered.length; i++) {
        if (teacherSelectedResultIds[String(filtered[i].id)]) count++;
    }
    var bar = document.getElementById('teacherBulkBar');
    var label = document.getElementById('teacherBulkCount');
    if (bar) bar.style.display = count > 0 ? 'flex' : 'none';
    if (label) label.textContent = count + ' selected';

    var all = document.getElementById('teacherSelectAll');
    if (all) {
        all.checked = filtered.length > 0 && count === filtered.length;
        all.indeterminate = count > 0 && count < filtered.length;
    }
}

function teacherToggleResultSelected(id, checkbox) {
    if (checkbox.checked) teacherSelectedResultIds[String(id)] = true;
    else delete teacherSelectedResultIds[String(id)];
    var row = checkbox.closest ? checkbox.closest('tr') : null;
    if (row) row.classList.toggle('result-row-selected', checkbox.checked);
    refreshTeacherSelectionUI();
}

function teacherToggleSelectAll(checked) {
    var filtered = getTeacherFilteredResults();
    for (var i = 0; i < filtered.length; i++) {
        if (checked) teacherSelectedResultIds[String(filtered[i].id)] = true;
        else delete teacherSelectedResultIds[String(filtered[i].id)];
    }
    applyTeacherFilters();
}

function teacherClearSelection() {
    teacherSelectedResultIds = {};
    applyTeacherFilters();
}

function getTeacherSelectedResults() {
    var out = [];
    var filtered = getTeacherFilteredResults();
    for (var i = 0; i < filtered.length; i++) {
        if (teacherSelectedResultIds[String(filtered[i].id)]) out.push(filtered[i]);
    }
    return out;
}

// Exports ONLY what the filters currently show.
function teacherExportResults() {
    var filtered = getTeacherFilteredResults();
    if (filtered.length === 0) { alert('No results to export.'); return; }

    var headers = ['Class', 'Student', 'Admission No.', 'Subject', 'Score', 'Correct', 'Total', 'Time Taken', 'Tab Switches', 'Cam/Noise Flags', 'Fast Answer Warnings', 'Date'];
    var csv = headers.join(',') + '\n';
    for (var i = 0; i < filtered.length; i++) {
        var r = filtered[i];
        var row = [csvCell(r.className), csvCell(r.studentName), csvCell(r.admissionNumber || ''), csvCell(r.subject), r.score, r.correctAnswers, r.totalQuestions, csvCell(r.timeTaken), r.tabSwitches || 0, r.proctorViolations || 0, r.fastAnswerWarnings || 0, csvCell(r.date)];
        csv += row.join(',') + '\n';
    }
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    var tag = teacherFilterIsActive() ? '_filtered' : '';
    a.download = 'cleverment_teacher_results' + tag + '_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Deletes the given results (by id) on the server, then refreshes the view.
async function teacherDeleteResultsByIds(ids) {
    var teacherToken = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/results/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + teacherToken },
            body: JSON.stringify({ ids: ids })
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not delete the results.'));
            return false;
        }
    } catch (e) {
        alert('Could not reach the server. Please check your connection.');
        return false;
    }

    var gone = {};
    for (var i = 0; i < ids.length; i++) gone[String(ids[i])] = true;
    teacherResultsCache = teacherResultsCache.filter(function(r) { return !gone[String(r.id)]; });
    for (var k in gone) delete teacherSelectedResultIds[k];
    try {
        var local = getAllResultsLocal().filter(function(r) { return !gone[String(r.id)]; });
        localStorage.setItem('cleverment_all_results', JSON.stringify(local));
    } catch (e) {}
    rebuildTeacherFilterOptions();
    applyTeacherFilters();
    return true;
}

// Re-lists the class/subject filter choices from what is left, keeping the
// teacher's current choice if it still exists.
function rebuildTeacherFilterOptions() {
    function rebuild(selectId, field, allLabel) {
        var el = document.getElementById(selectId);
        if (!el) return;
        var current = el.value;
        var values = [];
        for (var i = 0; i < teacherResultsCache.length; i++) {
            var v = teacherResultsCache[i][field];
            if (values.indexOf(v) === -1) values.push(v);
        }
        el.innerHTML = '';
        var all = document.createElement('option');
        all.value = 'all';
        all.textContent = allLabel;
        el.appendChild(all);
        for (var j = 0; j < values.length; j++) {
            var o = document.createElement('option');
            o.value = values[j];
            o.textContent = values[j];
            el.appendChild(o);
        }
        el.value = (current === 'all' || values.indexOf(current) !== -1) ? current : 'all';
    }
    rebuild('teacherAdminFilterClass', 'className', 'All Classes');
    rebuild('teacherAdminFilterSubject', 'subject', 'All Subjects');
}

// "Clear All" / "Clear Filtered": removes ONLY the results currently shown.
async function teacherClearResults() {
    var filtered = getTeacherFilteredResults();
    if (filtered.length === 0) { alert('There are no results to clear.'); return; }

    var active = teacherFilterIsActive();
    var message = active
        ? 'Delete the ' + filtered.length + ' result(s) currently shown (' + teacherFilterDescription() + ')?\n\nResults outside this filter will NOT be touched. This cannot be undone.'
        : 'Delete ALL ' + filtered.length + ' of your results? This cannot be undone!';
    if (!confirm(message)) return;

    var ids = filtered.map(function(r) { return r.id; });
    await teacherDeleteResultsByIds(ids);
}

async function teacherDeleteSelectedResults() {
    var picked = getTeacherSelectedResults();
    if (picked.length === 0) { alert('Select at least one result first.'); return; }
    if (!confirm('Delete the ' + picked.length + ' selected result(s)? This cannot be undone.')) return;
    await teacherDeleteResultsByIds(picked.map(function(r) { return r.id; }));
}

// Certificates for every selected student: one PDF each, bundled in a ZIP.
async function teacherDownloadSelectedCertificates() {
    var picked = getTeacherSelectedResults();
    if (picked.length === 0) { alert('Select at least one result first.'); return; }
    var MAX_CERTS = 40;
    if (picked.length > MAX_CERTS) {
        alert('Please select up to ' + MAX_CERTS + ' students at a time. Phones can run out of memory when making many certificates at once.');
        return;
    }
    if (typeof JSZip === 'undefined') {
        alert('The ZIP tool did not load. Please check your internet connection and refresh the page.');
        return;
    }

    var btn = document.getElementById('teacherBulkCertBtn');
    var btnLabel = btn ? btn.querySelector('span') : null;
    var originalLabel = btnLabel ? btnLabel.textContent : '';
    if (btn) btn.disabled = true;

    try {
        var assessments = (teacherAssessmentsCache && teacherAssessmentsCache.length)
            ? teacherAssessmentsCache
            : await getTeacherAssessmentsFromBackend();
        var byCode = {};
        for (var a = 0; a < assessments.length; a++) byCode[assessments[a].code] = assessments[a];

        var zip = new JSZip();
        var usedNames = {};
        var made = 0;
        var skipped = 0;
        var singleBlob = null;
        var singleName = '';

        for (var i = 0; i < picked.length; i++) {
            var r = picked[i];
            if (btnLabel) btnLabel.textContent = 'Preparing ' + (i + 1) + '/' + picked.length + '...';
            var assessment = byCode[r.assessmentCode];
            if (!assessment) { skipped++; continue; }

            var bulkCertData = {
                studentName: r.studentName,
                subject: r.subject,
                score: r.score,
                teacherName: assessment.teacherName,
                teacherSignature: assessment.teacherSignature,
                code: assessment.code,
                dateObj: new Date()
            };
            await attachRosterPhoto(bulkCertData, r.className, r.admissionNumber);
            var blob = await generateCertificatePDFBlob(bulkCertData);

            var base = 'Certificate-' + String(r.studentName || 'Student').replace(/[\\/:*?"<>|]/g, '_') +
                (r.admissionNumber ? '-' + String(r.admissionNumber).replace(/[\\/:*?"<>|]/g, '_') : '');
            var name = base + '.pdf';
            var n = 2;
            while (usedNames[name]) { name = base + '-' + n + '.pdf'; n++; }
            usedNames[name] = true;
            zip.file(name, blob);
            singleBlob = blob;
            singleName = name;
            made++;
        }

        if (made === 0) {
            alert('Could not find the assessment details needed to create these certificates.');
            return;
        }

        var outBlob, outName;
        if (made === 1) {
            outBlob = singleBlob;
            outName = singleName;
        } else {
            if (btnLabel) btnLabel.textContent = 'Zipping...';
            outBlob = await zip.generateAsync({ type: 'blob' });
            outName = 'Certificates-' + new Date().toISOString().slice(0, 10) + '.zip';
        }

        var url = URL.createObjectURL(outBlob);
        var link = document.createElement('a');
        link.href = url;
        link.download = outName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function() { URL.revokeObjectURL(url); }, 2000);

        if (skipped > 0) {
            alert(skipped + ' certificate(s) could not be made because their assessment no longer exists.');
        }
    } catch (e) {
        console.error('Bulk certificate error:', e);
        alert('Error generating certificates: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
        if (btnLabel) btnLabel.textContent = originalLabel || 'Download certificates';
    }
}

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

async function adminLogin() {
    var password = document.getElementById('adminPassword').value;
    if (!password) {
        alert('Please enter the admin password.');
        return;
    }

    var loginBtn = document.querySelector('#adminAuth button.primary-btn');
    if (loginBtn) loginBtn.textContent = 'Logging in...';

    try {
        var res = await fetch(BACKEND_URL + '/api/auth/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password, code: (document.getElementById('adminTotpCode') || {}).value || '' })
        });
        var data = await res.json();

        if (!res.ok) {
            if (data.needsCode) {
                var wrap = document.getElementById('adminTotpWrap');
                if (wrap) { wrap.style.display = 'block'; var ci = document.getElementById('adminTotpCode'); if (ci) ci.focus(); }
            }
            alert(data.error || 'Incorrect admin password.');
            return;
        }

        localStorage.setItem('cleverment_admin_session', 'true');
        localStorage.setItem('cleverment_admin_token', data.token);
        document.getElementById('adminAuth').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        setDashboardHeaderVisible(false);
        renderAdminDashboard();
        updateURL('admin-dashboard');
        if (data.weakPassword) {
            setTimeout(function() { alert('Security tip: your admin password is short. Change ADMIN_PASSWORD in Render to 12 or more characters (a few random words work well). Open Admin > Security for more.'); }, 600);
        }
        if (data.security && data.security.failedAttempts > 0) {
            var when = data.security.lastFailedAt ? new Date(data.security.lastFailedAt).toLocaleString() : '';
            setTimeout(function() {
                alert('Security notice: ' + data.security.failedAttempts + ' wrong admin password attempt(s) were made since your last login' + (when ? ' (the latest at ' + when + ')' : '') + '.\n\nIf that was not you, change the ADMIN_PASSWORD in your Render settings to a long, new password.');
            }, 300);
        }
    } catch (e) {
        alert('Could not reach the server. Please check your connection and try again (the server may take up to a minute to wake up if it has been idle).');
    } finally {
        if (loginBtn) loginBtn.textContent = 'Login';
    }
}

function adminLogout() {
    localStorage.removeItem('cleverment_admin_session');
    localStorage.removeItem('cleverment_admin_token');
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminAuth').style.display = 'block';
    setDashboardHeaderVisible(true);
    document.getElementById('adminPassword').value = '';
    updateURL('admin');
}

async function renderAdminDashboard() {
    setTimeout(function() { cmAdminPanelOpened('adminOverviewPanel'); }, 300);
    renderAdminReactivationFee();
    renderAdminTeacherList();
    loadAdminTeacherWorkspaceOptions();
    renderAdminAssessmentList();
    renderAdminResults();
    renderAdminActivityLog();
    renderAdminFileList();
    renderAdminFaqList();
    showAdminSection('adminOverviewPanel');
}

async function loadAdminTeacherWorkspaceOptions() {
    var select = document.getElementById('adminSelectTeacherWorkspace');
    var status = document.getElementById('adminSelectTeacherStatus');
    if (!select) return;
    select.innerHTML = '<option value="">Loading teachers...</option>';
    try {
        var token = localStorage.getItem('cleverment_admin_token');
        var response = await fetch(BACKEND_URL + '/api/admin/teachers', { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load teachers.');
        var teachers = data.teachers || [];
        select.innerHTML = '<option value="">Choose a teacher...</option>';
        teachers.forEach(function(t) {
            var opt = document.createElement('option');
            opt.value = t.email;
            opt.textContent = (t.name || 'Unnamed teacher') + ' — ' + t.email + (t.paused ? ' (paused)' : '');
            opt.dataset.name = t.name || '';
            opt.dataset.id = t.id;
            select.appendChild(opt);
        });
        if (status) status.textContent = teachers.length ? 'Select a teacher to manage assessments, class rosters, results, analytics, CSV history, and teacher settings in their workspace.' : 'No teachers are registered yet.';
    } catch (e) {
        select.innerHTML = '<option value="">Could not load teachers</option>';
        if (status) status.textContent = e.message || 'Could not load teachers.';
    }
}

async function startAdminTeacherWorkspace() {
    var select = document.getElementById('adminSelectTeacherWorkspace');
    var status = document.getElementById('adminSelectTeacherStatus');
    var email = select ? String(select.value || '').trim().toLowerCase() : '';
    if (!email) { alert('Please select a teacher first.'); return; }
    var opt = select.options[select.selectedIndex];
    var adminToken = localStorage.getItem('cleverment_admin_token');
    if (!adminToken || localStorage.getItem('cleverment_admin_session') !== 'true') { alert('Your administrator session has expired. Please log in again.'); return; }
    try {
        var response = await fetch(BACKEND_URL + '/api/admin/teachers', { headers: { 'Authorization': 'Bearer ' + adminToken } });
        var data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not verify selected teacher.');
        var teacher = (data.teachers || []).find(function(t){ return String(t.email || '').toLowerCase() === email; });
        if (!teacher) throw new Error('The selected teacher could not be found. Refresh the teacher list and try again.');
        if (!localStorage.getItem('cleverment_admin_workspace_started')) {
            localStorage.setItem('cleverment_admin_previous_teacher_token', localStorage.getItem('cleverment_teacher_token') || '__none__');
            localStorage.setItem('cleverment_admin_previous_teacher_session', localStorage.getItem('cleverment_teacher_session') || '__none__');
            localStorage.setItem('cleverment_admin_workspace_started', '1');
        }
        adminActAsTeacher = email;
        localStorage.setItem('cleverment_admin_act_as_teacher', email);
        localStorage.setItem('cleverment_teacher_token', adminToken);
        currentTeacher = { id: teacher.id, name: teacher.name || 'Teacher', email: teacher.email };
        localStorage.setItem('cleverment_teacher_session', JSON.stringify(currentTeacher));
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('teacherAuth').style.display = 'none';
        document.getElementById('teacherDashboard').style.display = 'block';
        setDashboardHeaderVisible(false);
        var heading = document.getElementById('teacherDashboardName');
        var emailLine = document.getElementById('teacherDashboardEmail');
        if (heading) heading.textContent = 'Admin Workspace — ' + currentTeacher.name;
        if (emailLine) emailLine.textContent = currentTeacher.email + ' · You are acting on behalf of this teacher';
        var exit = document.getElementById('teacherDashboardExitButton');
        if (exit) { exit.textContent = '← Back to Admin'; exit.onclick = returnToAdminDashboard; }
        if (status) status.textContent = '';
        await renderTeacherDashboard();
        await renderTeacherPublishedList();
        populateTeacherQuestionBankSelect();
        renderCSVHistory();
        updateURL('teacher-dashboard');
    } catch (e) { alert(e.message || 'Could not open teacher workspace.'); }
}

function returnToAdminDashboard() {
    try { stopTeacherLivePolling(); } catch(e) {}
    adminActAsTeacher = '';
    localStorage.removeItem('cleverment_admin_act_as_teacher');
    var oldToken = localStorage.getItem('cleverment_admin_previous_teacher_token');
    var oldSession = localStorage.getItem('cleverment_admin_previous_teacher_session');
    if (oldToken === '__none__' || oldToken === null) localStorage.removeItem('cleverment_teacher_token');
    else if (oldToken) localStorage.setItem('cleverment_teacher_token', oldToken);
    if (oldSession === '__none__' || oldSession === null) localStorage.removeItem('cleverment_teacher_session');
    else if (oldSession) localStorage.setItem('cleverment_teacher_session', oldSession);
    localStorage.removeItem('cleverment_admin_previous_teacher_token');
    localStorage.removeItem('cleverment_admin_previous_teacher_session');
    localStorage.removeItem('cleverment_admin_workspace_started');
    currentTeacher = null;
    var saved = localStorage.getItem('cleverment_teacher_session');
    if (saved) { try { currentTeacher = JSON.parse(saved); } catch(e) {} }
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    setDashboardHeaderVisible(false);
    var exit = document.getElementById('teacherDashboardExitButton');
    if (exit) { exit.textContent = 'Logout'; exit.onclick = teacherLogout; }
    updateURL('admin-dashboard');
    renderAdminDashboard();
}

async function renderAdminReactivationFee() {
    var input = document.getElementById('adminReactivationFeeInput');
    if (!input) return;
    try {
        var { data } = await supabase
            .from('cleverment_settings')
            .select('value')
            .eq('key', 'reactivation_fee')
            .maybeSingle();
        input.value = data && data.value ? data.value : 2500;
    } catch (e) {
        input.value = 2500;
    }
}

async function saveReactivationFee() {
    var input = document.getElementById('adminReactivationFeeInput');
    var fee = parseInt(input.value, 10);
    if (isNaN(fee) || fee < 0) {
        alert('Please enter a valid amount.');
        return;
    }
    try {
        var { data: existing } = await supabase
            .from('cleverment_settings')
            .select('key')
            .eq('key', 'reactivation_fee')
            .maybeSingle();

        var error;
        if (existing) {
            var res = await supabase
                .from('cleverment_settings')
                .update({ value: String(fee) })
                .eq('key', 'reactivation_fee');
            error = res.error;
        } else {
            var res2 = await supabase
                .from('cleverment_settings')
                .insert([{ key: 'reactivation_fee', value: String(fee) }]);
            error = res2.error;
        }

        if (error) {
            alert('Error: ' + error.message);
            return;
        }
        alert('Reactivation fee updated to ₦' + fee.toLocaleString() + '.');
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function renderAdminTeacherList() {
    var container = document.getElementById('adminTeacherList');
    if (!container) return;

    var adminToken = localStorage.getItem('cleverment_admin_token');
    if (!adminToken) {
        container.innerHTML = '<p class="helper-text" style="color:#dc3545;">Admin session missing - please log out and log in again.</p>';
        return;
    }

    try {
        var res = await fetch(BACKEND_URL + '/api/admin/teachers', {
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        var data = await res.json();
        if (!res.ok) {
            container.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + (data.error || 'Could not load teachers.') + '</p>';
            return;
        }
        var teachers = data.teachers || [];

        if (teachers.length === 0) {
            container.innerHTML = '<p class="helper-text">No teachers registered yet.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < teachers.length; i++) {
            var isPaused = teachers[i].paused ? true : false;
            var pauseText = isPaused ? 'Unpause' : 'Pause';
            var pauseColor = isPaused ? '#2d9c5c' : '#e67e22';
            html += '<div style="background:white; padding:10px 16px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                '<div><strong>' + teachers[i].name + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + teachers[i].email + ')</span>' +
                (isPaused ? ' <span style="color:#dc3545; font-size:12px; font-weight:600;">[PAUSED]</span>' : '') +
                '<br><span style="color:#6b7a8f; font-size:12px;">' + cmLoginText(teachers[i]) + '</span>' +
                '</div>' +
                '<div style="display:flex; gap:6px;">' +
                '<button onclick="adminPauseTeacher(' + teachers[i].id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:' + pauseColor + '; color:white;">' + pauseText + '</button>' +
                '<button onclick="adminDeleteTeacher(' + teachers[i].id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#dc3545; color:white;">Remove</button>' +
                '</div></div>';
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p class="helper-text" style="color:#dc3545;">Could not reach the server. Please check your connection.</p>';
    }
}

var adminAssessmentsCache = [];

async function renderAdminAssessmentList() {
    var container = document.getElementById('adminAssessmentList');
    if (!container) return;

    var assessments = await getAdminAssessmentsFromBackend();
    adminAssessmentsCache = assessments;

    var teacherSelect = document.getElementById('adminAssessmentFilterTeacher');
    if (teacherSelect) {
        var currentVal = teacherSelect.value || 'all';
        var teachers = ['all'];
        for (var i = 0; i < assessments.length; i++) {
            if (teachers.indexOf(assessments[i].teacherEmail) === -1) {
                teachers.push(assessments[i].teacherEmail);
            }
        }
        teacherSelect.innerHTML = '';
        for (var j = 0; j < teachers.length; j++) {
            var opt = document.createElement('option');
            opt.value = teachers[j];
            opt.textContent = teachers[j] === 'all' ? 'All Teachers' : teachers[j];
            teacherSelect.appendChild(opt);
        }
        if (teachers.indexOf(currentVal) !== -1) {
            teacherSelect.value = currentVal;
        }
    }

    applyAdminAssessmentFilter();
}

function applyAdminAssessmentFilter() {
    var container = document.getElementById('adminAssessmentList');
    if (!container) return;

    var teacherSelect = document.getElementById('adminAssessmentFilterTeacher');
    var filtered = adminAssessmentsCache.slice();
    if (teacherSelect && teacherSelect.value !== 'all') {
        filtered = filtered.filter(function(a) { return a.teacherEmail === teacherSelect.value; });
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="helper-text">No assessments published yet.</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var a = filtered[i];
        var timeDisplay = a.timeLimit > 0 ? Math.floor(a.timeLimit / 60) + ' min' : 'No limit';
        var avail = getAvailabilityLabel(a);
        html += '<div style="background:white; padding:12px 16px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
            '<div><strong>' + a.subject + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + a.className + ' | ' + a.questions.length + ' questions | ' + timeDisplay + ')</span>' + getMonitoringBadge(a) + '<br>' +
            '<span style="color:#6b7a8f; font-size:12px;">Teacher: ' + a.teacherEmail + (a.date ? ' | Published: ' + a.date : '') + '</span><br>' +
            '<span style="color:' + avail.color + '; font-size:12px; font-weight:600;">' + avail.text + '</span></div>' +
            '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
            '<span style="background:#eef6ff; padding:4px 12px; border-radius:6px; font-weight:600; font-size:13px; color:#2d6cdf;">Code: ' + a.code + '</span>' +
            '<button onclick="adminDeleteAssessment(' + a.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#dc3545; color:white;">Delete</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
}

async function adminPauseTeacher(id) {
    if (!confirm('Pause/unpause this teacher?')) return;
    var adminToken = localStorage.getItem('cleverment_admin_token');

    try {
        var res = await fetch(BACKEND_URL + '/api/admin/teachers/' + id + '/pause', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not update teacher.'));
            return;
        }
        alert(data.paused ? 'Teacher paused.' : 'Teacher unpaused.');
        renderAdminTeacherList();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function adminDeleteTeacher(id) {
    if (!confirm('Delete this teacher? This will permanently remove their account and all their data.')) return;
    var adminToken = localStorage.getItem('cleverment_admin_token');

    try {
        var res = await fetch(BACKEND_URL + '/api/admin/teachers/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not delete teacher.'));
            return;
        }
        alert('Teacher deleted successfully.');
        renderAdminTeacherList();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

var adminResultsCache = [];

async function renderAdminResults() {
    var results = await getAllResultsFromDatabase();
    results = await attachPassMarks(results, true);
    adminResultsCache = results;

    var teacherSelect = document.getElementById('adminResultsFilterTeacher');
    if (teacherSelect) {
        var teachers = ['all'];
        for (var i = 0; i < results.length; i++) {
            if (teachers.indexOf(results[i].teacherEmail) === -1) {
                teachers.push(results[i].teacherEmail);
            }
        }
        teacherSelect.innerHTML = '';
        for (var j = 0; j < teachers.length; j++) {
            var opt = document.createElement('option');
            opt.value = teachers[j];
            opt.textContent = teachers[j] === 'all' ? 'All Teachers' : teachers[j];
            teacherSelect.appendChild(opt);
        }
    }

    var classSelect = document.getElementById('adminResultsFilterClass');
    if (classSelect) {
        var classes = ['all'];
        for (var k = 0; k < results.length; k++) {
            if (classes.indexOf(results[k].className) === -1) {
                classes.push(results[k].className);
            }
        }
        classSelect.innerHTML = '';
        for (var l = 0; l < classes.length; l++) {
            var opt2 = document.createElement('option');
            opt2.value = classes[l];
            opt2.textContent = classes[l] === 'all' ? 'All Classes' : classes[l];
            classSelect.appendChild(opt2);
        }
    }

    var subjectSelect = document.getElementById('adminResultsFilterSubject');
    if (subjectSelect) {
        var subjects = ['all'];
        for (var m = 0; m < results.length; m++) {
            if (subjects.indexOf(results[m].subject) === -1) {
                subjects.push(results[m].subject);
            }
        }
        subjectSelect.innerHTML = '';
        for (var n = 0; n < subjects.length; n++) {
            var opt3 = document.createElement('option');
            opt3.value = subjects[n];
            opt3.textContent = subjects[n] === 'all' ? 'All Subjects' : subjects[n];
            subjectSelect.appendChild(opt3);
        }
    }

    applyAdminFilters();
}

function applyAdminFilters() {
    var filterTeacher = document.getElementById('adminResultsFilterTeacher');
    var filterClass = document.getElementById('adminResultsFilterClass');
    var filterSubject = document.getElementById('adminResultsFilterSubject');

    var filtered = adminResultsCache.slice();
    if (filterTeacher && filterTeacher.value !== 'all') {
        filtered = filtered.filter(function(r) { return r.teacherEmail === filterTeacher.value; });
    }
    if (filterClass && filterClass.value !== 'all') {
        filtered = filtered.filter(function(r) { return r.className === filterClass.value; });
    }
    if (filterSubject && filterSubject.value !== 'all') {
        filtered = filtered.filter(function(r) { return r.subject === filterSubject.value; });
    }

    var total = filtered.length;
    var totalScore = 0;
    var passed = 0;
    var teachersSet = {};
    for (var i = 0; i < filtered.length; i++) {
        totalScore += filtered[i].score;
        var pmAdmin = (filtered[i].passMark !== null && filtered[i].passMark !== undefined) ? filtered[i].passMark : 50;
        if (filtered[i].score >= pmAdmin) passed++;
        teachersSet[filtered[i].teacherEmail] = true;
    }

    var statTotal = document.getElementById('adminStatTotalStudents');
    var statAvg = document.getElementById('adminStatAvgScore');
    var statPass = document.getElementById('adminStatPassRate');
    var statTeachers = document.getElementById('adminStatTeachers');

    if (statTotal) statTotal.textContent = total;
    if (statAvg) statAvg.textContent = total > 0 ? Math.round(totalScore / total) + '%' : '0%';
    if (statPass) statPass.textContent = total > 0 ? Math.round((passed / total) * 100) + '%' : '0%';
    if (statTeachers) statTeachers.textContent = Object.keys(teachersSet).length;

    var tbody = document.getElementById('adminResultsTableBody');
    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; color:#6b7a8f; padding:40px;">No results found.</td></tr>';
        return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
        var item = filtered[j];
        var scoreClass = item.score >= 70 ? 'score-high' : (item.score >= 50 ? 'score-mid' : 'score-low');
        var tabSwitchCell = item.tabSwitches > 0 ? '<span style="color:#e67e22; font-weight:600;">' + item.tabSwitches + '</span>' : '0';
        var proctorCell = item.proctorViolations > 0 ? '<span style="color:#dc3545; font-weight:600;">' + item.proctorViolations + '</span>' : '0';
        html += '<tr><td>' + (j+1) + '</td><td>' + item.teacherEmail + '</td><td>' + item.className + '</td><td>' + escapeHtml(item.studentName) + resultRetakeBadgeHtml(item) + (item.fastAnswerWarnings > 0 ? '<br><span style=\"display:inline-block; margin-top:3px; padding:1px 7px; border-radius:10px; background:#fff3cd; color:#8a6d00; font-size:11px; font-weight:700;\" title=\"Student answered too quickly to have read the questions\">&#9888; Fast answering x' + item.fastAnswerWarnings + '</span>' : '') + '</td><td>' + (item.admissionNumber || '') + '</td><td>' + item.subject + '</td><td class="' + scoreClass + '">' + item.score + '%</td><td>' + item.correctAnswers + '/' + item.totalQuestions + '</td><td>' + tabSwitchCell + '</td><td>' + proctorCell + '</td><td>' + item.date + '</td><td class="result-action-cell"><button class="result-action-btn" onclick="openResultActions(\'admin\',' + item.id + ')">⋮ Take Action</button></td></tr>';
    }
    tbody.innerHTML = html;
}

function adminExportAllResults() {
    var results = adminResultsCache;
    if (results.length === 0) { alert('No results to export.'); return; }

    var headers = ['Teacher', 'Class', 'Student', 'Admission No.', 'Subject', 'Score', 'Correct', 'Total', 'Tab Switches', 'Date'];
    var csv = headers.join(',') + '\n';
    for (var i = 0; i < results.length; i++) {
        var row = ['"' + results[i].teacherEmail + '"', '"' + results[i].className + '"', '"' + results[i].studentName + '"', '"' + (results[i].admissionNumber || '') + '"', '"' + results[i].subject + '"', results[i].score, results[i].correctAnswers, results[i].totalQuestions, results[i].tabSwitches || 0, '"' + results[i].date + '"'];
        csv += row.join(',') + '\n';
    }
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cleverment_all_results_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function adminClearAllResults() {
    if (!confirm('Delete ALL results from ALL teachers? This cannot be undone!')) return;
    var adminToken = localStorage.getItem('cleverment_admin_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/results', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        var data = await res.json();
        if (!res.ok) {
            alert('Error: ' + (data.error || 'Could not clear results.'));
            return;
        }
    } catch (e) {
        alert('Could not reach the server. Please check your connection.');
        return;
    }
    localStorage.setItem('cleverment_all_results', JSON.stringify([]));
    renderAdminResults();
}

// ============================================================
// ADMIN: VIEW TEACHER ACTIVITY
// ============================================================

async function getTeacherActivity() {
    try {
        var { data, error } = await supabase
            .from('cleverment_teacher_activity')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) return [];
        return data || [];
    } catch(e) { return []; }
}

async function renderAdminActivityLog() {
    var container = document.getElementById('adminActivityLog');
    if (!container) return;
    var activities = await getTeacherActivity();
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="helper-text">No activity recorded yet.</p>';
        return;
    }
    // Resolve the teacher's display name from the registered-teacher list, then show name before email.
    var teacherNames = {};
    try {
        var adminToken = localStorage.getItem('cleverment_admin_token') || '';
        var response = await fetch(BACKEND_URL + '/api/admin/teachers', { headers: { 'Authorization': 'Bearer ' + adminToken } });
        if (response.ok) {
            var teacherData = await response.json();
            (teacherData.teachers || []).forEach(function(t) {
                if (t.email) teacherNames[String(t.email).toLowerCase()] = t.name || '';
            });
        }
    } catch (e) { /* If lookup fails, still show the email clearly. */ }
    var html = '';
    for (var i = 0; i < activities.length; i++) {
        var item = activities[i] || {};
        var email = String(item.teacher_email || 'Unknown email');
        var teacherName = teacherNames[email.toLowerCase()] || 'Teacher name unavailable';
        var date = item.created_at ? new Date(item.created_at).toLocaleString() : '';
        var action = String(item.action || 'activity').replace(/_/g, ' ');
        var actionColor = '#2d6cdf';
        if (item.action === 'signup') actionColor = '#2d9c5c';
        else if (item.action === 'publish_assessment') actionColor = '#e67e22';
        else if (item.action === 'login') actionColor = '#6f42c1';
        html += '<div style="background:white; padding:10px 14px; border-radius:8px; border-left:4px solid ' + actionColor + '; margin-bottom:6px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
            '<div><strong>' + escapeHtml(teacherName) + '</strong> <span style="color:#6b7a8f; font-size:12px;">(' + escapeHtml(email) + ')</span> <span style="color:#1a1a2e;">' + escapeHtml(action) + '</span>' +
            (item.details ? ' <span style="color:#6b7a8f; font-size:13px;">' + escapeHtml(item.details) + '</span>' : '') +
            '</div><span style="color:#8a9aa8; font-size:11px;">' + escapeHtml(date) + '</span></div>';
    }
    container.innerHTML = html;
}

// ============================================================
// ADMIN: MANAGE TEACHER FILES
// ============================================================

async function getAllCSVFiles() {
    try {
        var { data, error } = await supabase
            .from('cleverment_csv_history')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
    } catch(e) { return []; }
}

async function renderAdminFileList() {
    var container = document.getElementById('adminFileList');
    if (!container) return;
    
    var files = await getAllCSVFiles();
    if (!files || files.length === 0) {
        container.innerHTML = '<p class="helper-text">No files uploaded by teachers yet.</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < files.length; i++) {
        var item = files[i];
        var date = new Date(item.created_at).toLocaleString();
        html += '<div style="background:white; padding:10px 14px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
            '<div><strong>' + item.filename + '</strong><br><span style="color:#6b7a8f; font-size:12px;">Teacher: ' + item.teacher_email + ' | ' + item.question_count + ' questions | ' + date + '</span></div>' +
            '<button onclick="adminDeleteFile(' + item.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#dc3545; color:white;">Delete</button></div>';
    }
    container.innerHTML = html;
}

async function adminDeleteFile(id) {
    if (!confirm('Delete this file from teacher\'s history?')) return;
    var success = await deleteCSVHistory(id);
    if (success) {
        renderAdminFileList();
        alert('File deleted successfully.');
    } else {
        alert('Failed to delete file.');
    }
}

// ============================================================
// REGISTER SERVICE WORKER (PWA)
// ============================================================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
            console.log('Service Worker registered successfully!');
            // Ask the browser to check for a newer sw.js on every load,
            // so deployed updates are picked up quickly.
            registration.update();
        })
        .catch(function(error) {
            console.log('Service Worker registration failed:', error);
        });

    // If a new service worker takes control (i.e. we just got an update),
    // reload once so the page uses the fresh files instead of stale ones.
    var refreshingAfterSWUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (refreshingAfterSWUpdate) return;
        refreshingAfterSWUpdate = true;
        window.location.reload();
    });
}

// ============================================================
// (Removed: legacy "SAVE PAGE STATE" beforeunload/load handlers.
// They tracked page visibility separately from the URL- and
// localStorage-based restore logic used elsewhere in this file,
// and could run after that logic on page load and silently
// override it — e.g. re-showing a quiz screen without rebuilding
// its questions, answers, or timer. Superseded by
// restoreQuizState() and the teacher/admin session restore in
// the DOMContentLoaded handler above.)
// ============================================================

// ============================================================
// DASHBOARD SIDEBAR NAVIGATION
// Shows one dashboard section at a time; the sidebar collapses
// into a slide-in menu on small screens.
// ============================================================

function toggleDashSidebar(dashboardId) {
    var layout = document.querySelector('#' + dashboardId + ' .dash-layout');
    if (!layout) return;
    var opening = !layout.classList.contains('sidebar-open');
    layout.classList.toggle('sidebar-open', opening);
    var trigger = document.querySelector('#' + dashboardId + ' .dashboard-menu-top');
    if (trigger) trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
    document.body.classList.toggle('cm-menu-open', opening);
}

// Desktop sidebar collapse: icon-only mode with a compact CleverMent logo.
// The state is remembered separately for the teacher and admin dashboards.
function toggleDashSidebarCollapse(dashboardId, btn) {
    var root = document.getElementById(dashboardId);
    if (!root) return;
    var layout = root.querySelector('.dash-layout');
    if (!layout) return;

    var collapsed = layout.classList.toggle('sidebar-collapsed');
    var key = dashboardId === 'teacherDashboard'
        ? 'cleverment_teacher_sidebar_collapsed'
        : 'cleverment_admin_sidebar_collapsed';

    try {
        localStorage.setItem(key, collapsed ? 'true' : 'false');
    } catch (e) {}

    if (btn) {
        btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        btn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        var icon = btn.querySelector('span');
        if (icon) icon.textContent = collapsed ? '›' : '‹';
    }
}

function restoreDashSidebarState(dashboardId) {
    var root = document.getElementById(dashboardId);
    if (!root) return;
    var layout = root.querySelector('.dash-layout');
    if (!layout) return;

    var key = dashboardId === 'teacherDashboard'
        ? 'cleverment_teacher_sidebar_collapsed'
        : 'cleverment_admin_sidebar_collapsed';
    var collapsed = false;
    try {
        collapsed = localStorage.getItem(key) === 'true';
    } catch (e) {}

    layout.classList.toggle('sidebar-collapsed', collapsed);
    var btn = root.querySelector('.sidebar-collapse-toggle');
    if (btn) {
        btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        btn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        var icon = btn.querySelector('span');
        if (icon) icon.textContent = collapsed ? '›' : '‹';
    }
}

function showDashSection(dashboardId, panelId, btn) {
    var root = document.getElementById(dashboardId);
    if (!root) return;
    var layout = root.querySelector('.dash-layout');
    if (!layout) return;

    var panels = layout.querySelectorAll('.dash-panel');
    for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
    var panel = document.getElementById(panelId);
    if (panel) panel.classList.add('active');

    var items = layout.querySelectorAll('.dash-nav-item');
    for (var j = 0; j < items.length; j++) {
        var isTarget = btn ? (items[j] === btn) : (items[j].getAttribute('data-target') === panelId);
        if (isTarget) items[j].classList.add('active');
        else items[j].classList.remove('active');
    }

    // Close the mobile slide-in menu after picking a section.
    layout.classList.remove('sidebar-open');
    cmPushSection(dashboardId, panelId);
}

// ============================================================
// CLASS POSITIONS, BROADSHEET AND STUDENT PROGRESS
// (Teacher dashboard. Admin gets them too through "Select Teacher".)
// ============================================================

var teacherResultsLoadedOnce = false;

function posOrdinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function posRound1(x) { return Math.round(x * 10) / 10; }

// Sorts best-first and gives positions. Equal values share a position (1st, 2nd, 2nd, 4th).
function posAssignRanks(rows, key) {
    rows.sort(function(a, b) { return b[key] - a[key]; });
    var lastVal = null, lastPos = 0;
    rows.forEach(function(r, i) {
        if (r[key] === lastVal) {
            r.position = lastPos;
        } else {
            r.position = i + 1;
            lastPos = i + 1;
            lastVal = r[key];
        }
    });
    return rows;
}

function posStudentKey(r) {
    var adm = String(r.admissionNumber || '').trim().toLowerCase();
    return adm || ('name:' + String(r.studentName || '').trim().toLowerCase());
}

function posResultTime(r) {
    var t = Date.parse(r.createdAt || '');
    return isNaN(t) ? (Number(r.id) || 0) : t;
}

function posSubjectKey(s) { return String(s || '').trim().toLowerCase(); }

// ---- Subject position: one assessment, ranked by score ----
function buildSubjectPositions(results) {
    var rows = results.map(function(r) {
        return {
            name: r.studentName,
            admission: r.admissionNumber || '',
            score: Number(r.score) || 0,
            correct: r.correctAnswers,
            total: r.totalQuestions,
            passMark: (r.passMark !== null && r.passMark !== undefined) ? Number(r.passMark) : 50
        };
    });
    posAssignRanks(rows, 'score');
    var n = rows.length;
    var sum = rows.reduce(function(a, r) { return a + r.score; }, 0);
    var passed = rows.filter(function(r) { return r.score >= r.passMark; }).length;
    return {
        rows: rows,
        stats: {
            students: n,
            average: n ? posRound1(sum / n) : 0,
            highest: n ? rows[0].score : 0,
            lowest: n ? rows[n - 1].score : 0,
            passed: passed,
            passRate: n ? Math.round(passed / n * 100) : 0
        }
    };
}

// ---- Class broadsheet: every student x every subject, ranked by average ----
// method: 'average' | 'latest' | 'highest' (used when a subject has more than one assessment)
function buildBroadsheet(results, className, method) {
    var inClass = results.filter(function(r) { return r.className === className; });
    var subjects = [];
    var subjectIndex = {};
    var students = {};

    inClass.forEach(function(r) {
        var sk = posSubjectKey(r.subject);
        if (!subjectIndex.hasOwnProperty(sk)) {
            subjectIndex[sk] = subjects.length;
            subjects.push({ key: sk, label: String(r.subject || '').trim() });
        }
        var k = posStudentKey(r);
        var st = students[k] || (students[k] = { key: k, name: r.studentName, admission: r.admissionNumber || '', nameTime: -1, scores: {} });
        var t = posResultTime(r);
        if (t >= st.nameTime) { st.name = r.studentName; st.nameTime = t; }
        (st.scores[sk] = st.scores[sk] || []).push({ score: Number(r.score) || 0, t: t });
    });
    subjects.sort(function(a, b) { return a.label.localeCompare(b.label); });

    function choose(list) {
        if (method === 'latest') {
            return list.slice().sort(function(a, b) { return b.t - a.t; })[0].score;
        }
        if (method === 'highest') {
            return Math.max.apply(null, list.map(function(x) { return x.score; }));
        }
        return posRound1(list.reduce(function(a, x) { return a + x.score; }, 0) / list.length);
    }

    var rows = Object.keys(students).map(function(k) {
        var st = students[k];
        var cells = {};
        var total = 0, taken = 0;
        subjects.forEach(function(sj) {
            if (st.scores[sj.key]) {
                var v = choose(st.scores[sj.key]);
                cells[sj.key] = v;
                total += v;
                taken++;
            } else {
                cells[sj.key] = null;
            }
        });
        return { name: st.name, admission: st.admission, cells: cells, total: posRound1(total), taken: taken, average: taken ? posRound1(total / taken) : 0 };
    });
    posAssignRanks(rows, 'average');

    // Class average per subject (and overall).
    var subjectAverages = {};
    subjects.forEach(function(sj) {
        var vals = rows.map(function(r) { return r.cells[sj.key]; }).filter(function(v) { return v !== null; });
        subjectAverages[sj.key] = vals.length ? posRound1(vals.reduce(function(a, b) { return a + b; }, 0) / vals.length) : null;
    });
    var overall = rows.length ? posRound1(rows.reduce(function(a, r) { return a + r.average; }, 0) / rows.length) : 0;
    return { subjects: subjects, rows: rows, subjectAverages: subjectAverages, overallAverage: overall, classSize: rows.length };
}

// ---- One student's history across assessments ----
function buildStudentHistory(results, opts) {
    opts = opts || {};
    var list = results.filter(function(r) {
        if (opts.subject && opts.subject !== 'all' && posSubjectKey(r.subject) !== opts.subject) return false;
        var t = posResultTime(r);
        if (opts.fromTs && t < opts.fromTs) return false;
        if (opts.toTs && t > opts.toTs) return false;
        return true;
    }).map(function(r) {
        var pm = (r.passMark !== null && r.passMark !== undefined) ? Number(r.passMark) : 50;
        var score = Number(r.score) || 0;
        return { t: posResultTime(r), subject: r.subject, className: r.className, code: r.assessmentCode, score: score, passMark: pm, passed: score >= pm, correct: r.correctAnswers, total: r.totalQuestions };
    });
    list.sort(function(a, b) { return a.t - b.t; });

    var n = list.length;
    var avg = n ? posRound1(list.reduce(function(a, x) { return a + x.score; }, 0) / n) : 0;
    var trend = { label: 'Not enough results yet', diff: 0, kind: 'none' };
    if (n >= 4) {
        var half = Math.floor(n / 2);
        var early = list.slice(0, half), late = list.slice(n - half);
        var ea = early.reduce(function(a, x) { return a + x.score; }, 0) / early.length;
        var la = late.reduce(function(a, x) { return a + x.score; }, 0) / late.length;
        var diff = posRound1(la - ea);
        if (diff >= 3) trend = { label: 'Improving (+' + diff + ' points)', diff: diff, kind: 'up' };
        else if (diff <= -3) trend = { label: 'Declining (' + diff + ' points)', diff: diff, kind: 'down' };
        else trend = { label: 'Steady', diff: diff, kind: 'flat' };
    }
    var bySubject = {};
    list.forEach(function(x) {
        var k = posSubjectKey(x.subject);
        var s = bySubject[k] || (bySubject[k] = { label: x.subject, sum: 0, count: 0 });
        s.sum += x.score; s.count++;
    });
    var subjectAverages = Object.keys(bySubject).map(function(k) {
        return { key: k, label: bySubject[k].label, average: posRound1(bySubject[k].sum / bySubject[k].count), count: bySubject[k].count };
    }).sort(function(a, b) { return b.average - a.average; });

    return {
        list: list,
        stats: {
            count: n,
            average: avg,
            highest: n ? Math.max.apply(null, list.map(function(x) { return x.score; })) : 0,
            lowest: n ? Math.min.apply(null, list.map(function(x) { return x.score; })) : 0,
            passed: list.filter(function(x) { return x.passed; }).length
        },
        trend: trend,
        subjectAverages: subjectAverages
    };
}

// ---------- shared helpers ----------

async function ensureTeacherDataForReports(force) {
    if (force || !teacherResultsLoadedOnce || !teacherResultsCache.length) {
        await reloadTeacherResultsCache();
        teacherResultsLoadedOnce = true;
    }
    if (force || !teacherAssessmentsCache || !teacherAssessmentsCache.length) {
        teacherAssessmentsCache = await getTeacherAssessmentsFromBackend();
    }
}

function posEsc(t) { return escapeHtml(String(t === null || t === undefined ? '' : t)); }

function posTodayLabel() {
    return new Date().toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

// Plain-ASCII-safe text for the PDF fonts (accents are dropped rather than printed as garbage).
function pdfSafe(t) {
    var s = String(t === null || t === undefined ? '' : t);
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return s.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?');
}

// Draws a simple paginated table. cfg: { orientation, title, lines[], headers[], rows[][], weights[], align[], highlightRows{index:true}, footerRows[][] }
function pdfBuildTable(cfg) {
    var Ctor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!Ctor) throw new Error('The PDF tool did not load. Please check your internet connection and refresh the page.');
    var pdf = new Ctor(cfg.orientation || 'portrait', 'mm', 'a4');
    var pageW = pdf.internal.pageSize.getWidth();
    var pageH = pdf.internal.pageSize.getHeight();
    var m = 12;
    var usable = pageW - 2 * m;
    var sum = cfg.weights.reduce(function(a, b) { return a + b; }, 0);
    var widths = cfg.weights.map(function(w) { return w / sum * usable; });
    var rowH = 7;

    function fit(text, w) {
        var t = pdfSafe(text);
        if (pdf.getTextWidth(t) <= w - 3) return t;
        while (t.length > 1 && pdf.getTextWidth(t + '..') > w - 3) t = t.slice(0, -1);
        return t + '..';
    }
    function drawRow(cells, y, opts) {
        opts = opts || {};
        if (opts.fill) { pdf.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]); pdf.rect(m, y, usable, rowH, 'F'); }
        pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        pdf.setFontSize(8.5);
        if (opts.color) pdf.setTextColor(opts.color[0], opts.color[1], opts.color[2]); else pdf.setTextColor(30, 35, 50);
        var x = m;
        cells.forEach(function(c, i) {
            var al = (cfg.align && cfg.align[i]) || 'left';
            var txt = fit(c, widths[i]);
            var tx = al === 'left' ? x + 1.5 : (al === 'center' ? x + widths[i] / 2 : x + widths[i] - 1.5);
            pdf.text(txt, tx, y + 4.8, { align: al });
            x += widths[i];
        });
    }

    // Title block
    var y = m;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(201, 168, 76);
    pdf.text('CleverMent', m, y + 3);
    y += 8;
    pdf.setFontSize(16);
    pdf.setTextColor(23, 32, 51);
    pdf.text(pdfSafe(cfg.title), m, y + 3);
    y += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(90, 100, 120);
    (cfg.lines || []).forEach(function(l) { pdf.text(pdfSafe(l), m, y + 3); y += 5; });
    y += 3;

    function drawHeader() {
        drawRow(cfg.headers, y, { fill: [23, 32, 51], color: [255, 255, 255], bold: true });
        y += rowH;
    }
    drawHeader();

    var all = cfg.rows.map(function(r, i) { return { cells: r, i: i }; });
    all.forEach(function(item) {
        if (y + rowH > pageH - 14) { pdf.addPage(); y = m; drawHeader(); }
        var fill = (cfg.highlightRows && cfg.highlightRows[item.i]) ? [255, 246, 214] : (item.i % 2 === 1 ? [243, 245, 250] : null);
        drawRow(item.cells, y, { fill: fill });
        y += rowH;
    });
    (cfg.footerRows || []).forEach(function(r) {
        if (y + rowH > pageH - 14) { pdf.addPage(); y = m; drawHeader(); }
        drawRow(r, y, { fill: [226, 232, 244], bold: true });
        y += rowH;
    });

    var pages = pdf.internal.getNumberOfPages();
    for (var p = 1; p <= pages; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(130, 140, 160);
        pdf.text('Generated by CleverMent on ' + posTodayLabel(), m, pageH - 7);
        pdf.text('Page ' + p + ' of ' + pages, pageW - m, pageH - 7, { align: 'right' });
    }
    return pdf;
}

function posDownloadBlob(blob, name) { cbDownloadBlob(blob, name); }

// ============================================================
// POSITIONS PANEL
// ============================================================

var posState = { tab: 'subject', subject: null, broad: null };

async function initPositionsPanel(force) {
    var status = document.getElementById('posLoadStatus');
    if (status) status.textContent = 'Loading...';
    try {
        await ensureTeacherDataForReports(!!force);
    } catch (e) {
        if (status) status.textContent = 'Could not load your data: ' + e.message;
        return;
    }
    if (status) status.textContent = '';

    // Assessments that have at least one result come first.
    var counts = {};
    teacherResultsCache.forEach(function(r) { counts[r.assessmentCode] = (counts[r.assessmentCode] || 0) + 1; });
    var sel = document.getElementById('posAssessmentSelect');
    var prevAssessment = sel ? sel.value : '';
    if (sel) {
        var list = (teacherAssessmentsCache || []).slice().sort(function(a, b) {
            return (counts[b.code] ? 1 : 0) - (counts[a.code] ? 1 : 0) || String(a.subject).localeCompare(String(b.subject));
        });
        sel.innerHTML = list.length ? '' : '<option value="">No assessments yet</option>';
        list.forEach(function(a) {
            var n = counts[a.code] || 0;
            var o = document.createElement('option');
            o.value = a.code;
            o.textContent = a.subject + ' - ' + a.className + ' - ' + a.code + ' (' + n + ' result' + (n === 1 ? '' : 's') + ')';
            sel.appendChild(o);
        });
        if (prevAssessment && list.some(function(a) { return a.code === prevAssessment; })) sel.value = prevAssessment;
    }

    var classSel = document.getElementById('posClassSelect');
    var prevClass = classSel ? classSel.value : '';
    if (classSel) {
        var classes = [];
        teacherResultsCache.forEach(function(r) { if (classes.indexOf(r.className) === -1) classes.push(r.className); });
        classes.sort();
        classSel.innerHTML = classes.length ? '' : '<option value="">No results yet</option>';
        classes.forEach(function(c) {
            var o = document.createElement('option');
            o.value = c; o.textContent = c;
            classSel.appendChild(o);
        });
        if (prevClass && classes.indexOf(prevClass) !== -1) classSel.value = prevClass;
    }
    posSwitchTab(posState.tab);
}

function posSwitchTab(tab) {
    posState.tab = tab;
    var subj = document.getElementById('posSubjectPane');
    var cls = document.getElementById('posClassPane');
    if (subj) subj.style.display = tab === 'subject' ? 'block' : 'none';
    if (cls) cls.style.display = tab === 'class' ? 'block' : 'none';
    var t1 = document.getElementById('posTabSubject'), t2 = document.getElementById('posTabClass');
    if (t1) t1.classList.toggle('active', tab === 'subject');
    if (t2) t2.classList.toggle('active', tab === 'class');
    if (tab === 'subject') renderSubjectPositions(); else renderBroadsheet();
}

function posStatChip(label, value) {
    return '<div class="pos-chip"><div class="pos-chip-value">' + posEsc(value) + '</div><div class="pos-chip-label">' + posEsc(label) + '</div></div>';
}

function renderSubjectPositions() {
    var sel = document.getElementById('posAssessmentSelect');
    var box = document.getElementById('posSubjectResult');
    if (!sel || !box) return;
    var code = sel.value;
    var assessment = (teacherAssessmentsCache || []).filter(function(a) { return a.code === code; })[0];
    var results = teacherResultsCache.filter(function(r) { return r.assessmentCode === code; });
    if (!assessment || results.length === 0) {
        posState.subject = null;
        cmRenderPosSubject(null);
        box.innerHTML = '<p class="helper-text">No students have submitted this assessment yet.</p>';
        return;
    }
    var data = buildSubjectPositions(results);
    posState.subject = { assessment: assessment, data: data };
    cmRenderPosSubject(data);

    var html = '<div class="pos-chips">' +
        posStatChip('Students', data.stats.students) +
        posStatChip('Class average', data.stats.average + '%') +
        posStatChip('Highest', data.stats.highest + '%') +
        posStatChip('Lowest', data.stats.lowest + '%') +
        posStatChip('Pass rate', data.stats.passRate + '%') +
        '</div>' +
        '<div class="scrollable-panel"><table class="pos-table"><thead><tr><th>Position</th><th>Student</th><th>Admission No.</th><th>Score</th><th>Correct</th><th>Remark</th></tr></thead><tbody>';
    data.rows.forEach(function(r) {
        var pass = r.score >= r.passMark;
        html += '<tr class="' + (r.position <= 3 ? 'pos-top-' + r.position : '') + '"><td class="pos-rank">' + posOrdinal(r.position) + '</td><td>' + posEsc(r.name) + '</td><td>' + posEsc(r.admission) + '</td><td><strong>' + r.score + '%</strong></td><td>' + posEsc(r.correct) + '/' + posEsc(r.total) + '</td><td><span class="pos-remark ' + (pass ? 'pass' : 'fail') + '">' + (pass ? 'Pass' : 'Fail') + '</span></td></tr>';
    });
    html += '</tbody></table></div>';
    box.innerHTML = html;
}

function renderBroadsheet() {
    var classSel = document.getElementById('posClassSelect');
    var methodSel = document.getElementById('posMethodSelect');
    var box = document.getElementById('posClassResult');
    if (!classSel || !box) return;
    var cls = classSel.value;
    if (!cls) { posState.broad = null; cmRenderPosClass(null); box.innerHTML = '<p class="helper-text">No results yet.</p>'; return; }
    var data = buildBroadsheet(teacherResultsCache, cls, methodSel ? methodSel.value : 'average');
    posState.broad = { className: cls, method: methodSel ? methodSel.value : 'average', data: data };
    cmRenderPosClass(data);
    if (data.rows.length === 0) { box.innerHTML = '<p class="helper-text">No results for this class yet.</p>'; return; }

    var html = '<div class="pos-chips">' +
        posStatChip('Students', data.classSize) +
        posStatChip('Subjects', data.subjects.length) +
        posStatChip('Class average', data.overallAverage + '%') +
        '</div>' +
        '<div class="scrollable-panel"><table class="pos-table"><thead><tr><th>Pos.</th><th>Student</th><th>Adm. No.</th>';
    data.subjects.forEach(function(s) { html += '<th>' + posEsc(s.label) + '</th>'; });
    html += '<th>Total</th><th>Average</th><th>Grade</th><th></th></tr></thead><tbody>';
    data.rows.forEach(function(r, ri) {
        html += '<tr class="' + (r.position <= 3 ? 'pos-top-' + r.position : '') + '"><td class="pos-rank">' + posOrdinal(r.position) + '</td><td>' + posEsc(r.name) + '</td><td>' + posEsc(r.admission) + '</td>';
        data.subjects.forEach(function(s) {
            var v = r.cells[s.key];
            html += '<td>' + (v === null ? '<span class="pos-missing">-</span>' : v) + '</td>';
        });
        html += '<td>' + r.total + '</td><td><strong>' + r.average + '%</strong></td><td><span class="grade-chip g-' + cmGradeFor(r.average).g + '">' + cmGradeFor(r.average).g + '</span></td><td><button type="button" class="wa-parent-btn" onclick="posWhatsAppParent(' + ri + ')" aria-label="Send result to parent on WhatsApp" title="Send to parent on WhatsApp"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg></button></td></tr>';
    });
    html += '<tr class="pos-footer-row"><td></td><td>Class average</td><td></td>';
    data.subjects.forEach(function(s) { var v = data.subjectAverages[s.key]; html += '<td>' + (v === null ? '-' : v) + '</td>'; });
    html += '<td></td><td>' + data.overallAverage + '%</td><td></td><td></td></tr></tbody></table></div>' +
        '<p class="helper-text" style="margin-top:8px;">Position is by average score. A subject a student did not take is left out of their average. Students with equal averages share a position.</p>';
    box.innerHTML = html;
}

function posMethodLabel(m) {
    return m === 'latest' ? 'latest assessment' : (m === 'highest' ? 'highest score' : 'average score');
}

function posDownloadSubjectPdf() {
    if (!posState.subject) { alert('Choose an assessment that has results first.'); return; }
    var a = posState.subject.assessment, d = posState.subject.data;
    try {
        var pdf = pdfBuildTable({
            orientation: 'portrait',
            title: a.subject + ' - Subject Positions',
            lines: ['Class: ' + a.className + '   |   Code: ' + a.code + '   |   Date: ' + posTodayLabel(),
                    'Students: ' + d.stats.students + '   |   Class average: ' + d.stats.average + '%   |   Highest: ' + d.stats.highest + '%   |   Lowest: ' + d.stats.lowest + '%   |   Pass rate: ' + d.stats.passRate + '%'],
            headers: ['Pos.', 'Student', 'Admission No.', 'Score', 'Correct', 'Remark'],
            weights: [9, 38, 18, 10, 12, 10],
            align: ['center', 'left', 'left', 'center', 'center', 'center'],
            rows: d.rows.map(function(r) { return [posOrdinal(r.position), r.name, r.admission, r.score + '%', r.correct + '/' + r.total, r.score >= r.passMark ? 'Pass' : 'Fail']; }),
            highlightRows: (function() { var h = {}; d.rows.forEach(function(r, i) { if (r.position <= 3) h[i] = true; }); return h; })()
        });
        posDownloadBlob(pdf.output('blob'), 'Positions-' + backupSafeName(a.subject + '-' + a.className) + '.pdf');
    } catch (e) {
        alert('Could not create the PDF: ' + e.message);
    }
}

function posExportSubjectCsv() {
    if (!posState.subject) { alert('Choose an assessment that has results first.'); return; }
    var a = posState.subject.assessment, d = posState.subject.data;
    var out = [['Position', 'Student', 'Admission No.', 'Score %', 'Correct', 'Total', 'Remark'].map(csvCell).join(',')];
    d.rows.forEach(function(r) { out.push([posOrdinal(r.position), r.name, r.admission, r.score, r.correct, r.total, r.score >= r.passMark ? 'Pass' : 'Fail'].map(csvCell).join(',')); });
    posDownloadBlob(new Blob([out.join('\n')], { type: 'text/csv' }), 'Positions-' + backupSafeName(a.subject + '-' + a.className) + '.csv');
}

function posBroadsheetTable() {
    var b = posState.broad;
    var d = b.data;
    var headers = ['Pos.', 'Student', 'Adm. No.'].concat(d.subjects.map(function(s) { return s.label; }), ['Total', 'Average', 'Grade']);
    var rows = d.rows.map(function(r) {
        return [posOrdinal(r.position), r.name, r.admission].concat(d.subjects.map(function(s) { var v = r.cells[s.key]; return v === null ? '-' : String(v); }), [String(r.total), r.average + '%', cmGradeFor(r.average).g]);
    });
    var footer = [['', 'Class average', ''].concat(d.subjects.map(function(s) { var v = d.subjectAverages[s.key]; return v === null ? '-' : String(v); }), ['', d.overallAverage + '%', cmGradeFor(d.overallAverage).g])];
    return { headers: headers, rows: rows, footer: footer };
}

function posDownloadBroadsheetPdf() {
    if (!posState.broad || posState.broad.data.rows.length === 0) { alert('Choose a class that has results first.'); return; }
    var b = posState.broad, d = b.data, t = posBroadsheetTable();
    try {
        var weights = [7, 30, 15].concat(d.subjects.map(function() { return 12; }), [10, 11, 8]);
        var align = ['center', 'left', 'left'].concat(d.subjects.map(function() { return 'center'; }), ['center', 'center', 'center']);
        var pdf = pdfBuildTable({
            orientation: d.subjects.length > 3 ? 'landscape' : 'portrait',
            title: b.className + ' - Class Broadsheet',
            lines: ['Students: ' + d.classSize + '   |   Subjects: ' + d.subjects.length + '   |   Class average: ' + d.overallAverage + '%   |   Date: ' + posTodayLabel(),
                    'Where a subject has more than one assessment, the ' + posMethodLabel(b.method) + ' is used. Position is by average score.'],
            headers: t.headers, rows: t.rows, footerRows: t.footer, weights: weights, align: align,
            highlightRows: (function() { var h = {}; d.rows.forEach(function(r, i) { if (r.position <= 3) h[i] = true; }); return h; })()
        });
        posDownloadBlob(pdf.output('blob'), 'Broadsheet-' + backupSafeName(b.className) + '.pdf');
    } catch (e) {
        alert('Could not create the PDF: ' + e.message);
    }
}

function posExportBroadsheetCsv() {
    if (!posState.broad || posState.broad.data.rows.length === 0) { alert('Choose a class that has results first.'); return; }
    var t = posBroadsheetTable();
    var out = [t.headers.map(csvCell).join(',')];
    t.rows.concat(t.footer).forEach(function(r) { out.push(r.map(csvCell).join(',')); });
    posDownloadBlob(new Blob([out.join('\n')], { type: 'text/csv' }), 'Broadsheet-' + backupSafeName(posState.broad.className) + '.csv');
}

// ============================================================
// STUDENT PROGRESS PANEL
// ============================================================

var progState = { key: null, history: null, student: null };

async function initProgressPanel(force) {
    var status = document.getElementById('progLoadStatus');
    if (status) status.textContent = 'Loading...';
    try {
        await ensureTeacherDataForReports(!!force);
    } catch (e) {
        if (status) status.textContent = 'Could not load your data: ' + e.message;
        return;
    }
    if (status) status.textContent = '';
    progSearchChanged();
    if (progState.key) renderStudentProgress();
}

function progStudentList() {
    var map = {};
    teacherResultsCache.forEach(function(r) {
        var k = posStudentKey(r);
        var s = map[k] || (map[k] = { key: k, name: r.studentName, admission: r.admissionNumber || '', count: 0, nameTime: -1, className: r.className });
        var t = posResultTime(r);
        if (t >= s.nameTime) { s.name = r.studentName; s.nameTime = t; s.className = r.className; }
        s.count++;
    });
    return Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return String(a.name).localeCompare(String(b.name)); });
}

function progSearchChanged() {
    var input = document.getElementById('progSearch');
    var box = document.getElementById('progMatches');
    if (!input || !box) return;
    var q = input.value.trim().toLowerCase();
    var students = progStudentList();
    if (students.length === 0) { box.innerHTML = '<p class="helper-text">No results yet, so there is no student history to show.</p>'; return; }
    var matches = q ? students.filter(function(s) { return String(s.name).toLowerCase().indexOf(q) !== -1 || String(s.admission).toLowerCase().indexOf(q) !== -1; }) : students;
    var shown = matches.slice(0, 15);
    if (shown.length === 0) { box.innerHTML = '<p class="helper-text">No student matches "' + posEsc(input.value) + '".</p>'; return; }
    var html = '<div class="prog-matches">';
    shown.forEach(function(s) {
        html += '<button type="button" class="prog-match' + (progState.key === s.key ? ' active' : '') + '" data-key="' + posEsc(s.key) + '" onclick="progSelectStudent(this.getAttribute(\'data-key\'))">' +
            '<strong>' + posEsc(s.name) + '</strong><span>' + posEsc(s.admission || 'no admission no.') + ' &middot; ' + posEsc(s.className) + ' &middot; ' + s.count + ' result' + (s.count === 1 ? '' : 's') + '</span></button>';
    });
    if (matches.length > shown.length) html += '<p class="helper-text" style="margin:6px 0 0;">Showing ' + shown.length + ' of ' + matches.length + '. Type more of the name to narrow it down.</p>';
    html += '</div>';
    box.innerHTML = html;
}

function progSelectStudent(key) {
    progState.key = key;
    var subjectSel = document.getElementById('progSubject');
    if (subjectSel) subjectSel.value = 'all';
    var period = document.getElementById('progPeriod');
    if (period) period.value = 'all';
    progSearchChanged();
    renderStudentProgress();
    var detail = document.getElementById('progDetail');
    if (detail && detail.scrollIntoView) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function progPeriodRange() {
    var period = document.getElementById('progPeriod');
    var v = period ? period.value : 'all';
    var now = Date.now();
    if (v === '30') return { fromTs: now - 30 * 86400000, toTs: 0 };
    if (v === '90') return { fromTs: now - 90 * 86400000, toTs: 0 };
    if (v === 'custom') {
        var f = (document.getElementById('progFrom') || {}).value;
        var t = (document.getElementById('progTo') || {}).value;
        return { fromTs: f ? new Date(f + 'T00:00:00').getTime() : 0, toTs: t ? new Date(t + 'T23:59:59').getTime() : 0 };
    }
    return { fromTs: 0, toTs: 0 };
}

function progShortDate(t) {
    try { return new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
}

function progChartSvg(list) {
    if (list.length === 0) return '';
    var W = 600, H = 230, L = 38, R = 14, T = 14, B = 34;
    var plotW = W - L - R, plotH = H - T - B;
    function x(i) { return L + (list.length === 1 ? plotW / 2 : (i / (list.length - 1)) * plotW); }
    function y(v) { return T + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH; }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="prog-chart" role="img" aria-label="Score history chart">';
    [0, 25, 50, 75, 100].forEach(function(g) {
        svg += '<line x1="' + L + '" y1="' + y(g) + '" x2="' + (W - R) + '" y2="' + y(g) + '" stroke="#e2e8f0" stroke-width="1"/>' +
            '<text x="' + (L - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="#6b7a8f">' + g + '</text>';
    });
    var pts = list.map(function(p, i) { return x(i) + ',' + y(p.score); }).join(' ');
    if (list.length > 1) svg += '<polyline points="' + pts + '" fill="none" stroke="#2d6cdf" stroke-width="2.5" stroke-linejoin="round"/>';
    var every = Math.max(1, Math.ceil(list.length / 6));
    list.forEach(function(p, i) {
        svg += '<circle cx="' + x(i) + '" cy="' + y(p.score) + '" r="5" fill="' + (p.passed ? '#2d9c5c' : '#dc3545') + '" stroke="#fff" stroke-width="1.5"><title>' + posEsc(p.subject) + ': ' + p.score + '% (' + progShortDate(p.t) + ')</title></circle>';
        if (i % every === 0 || i === list.length - 1) {
            svg += '<text x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="10.5" fill="#6b7a8f">' + posEsc(progShortDate(p.t)) + '</text>';
        }
    });
    svg += '</svg>';
    return svg;
}

function progCurrentStudent() {
    if (!progState.key) return null;
    var rows = teacherResultsCache.filter(function(r) { return posStudentKey(r) === progState.key; });
    if (rows.length === 0) return null;
    var latest = rows.slice().sort(function(a, b) { return posResultTime(b) - posResultTime(a); })[0];
    return { name: latest.studentName, admission: latest.admissionNumber || '', className: latest.className, rows: rows };
}

function renderStudentProgress() {
    var detail = document.getElementById('progDetail');
    if (!detail) return;
    var st = progCurrentStudent();
    if (!st) { detail.style.display = 'none'; progState.history = null; return; }
    detail.style.display = 'block';

    // Subject choices come from everything this student has taken.
    var subjectSel = document.getElementById('progSubject');
    var currentSubject = subjectSel ? subjectSel.value : 'all';
    var subjects = [];
    st.rows.forEach(function(r) { var k = posSubjectKey(r.subject); if (!subjects.some(function(s) { return s.key === k; })) subjects.push({ key: k, label: r.subject }); });
    subjects.sort(function(a, b) { return String(a.label).localeCompare(String(b.label)); });
    if (subjectSel) {
        subjectSel.innerHTML = '<option value="all">All subjects</option>' + subjects.map(function(s) { return '<option value="' + posEsc(s.key) + '">' + posEsc(s.label) + '</option>'; }).join('');
        subjectSel.value = subjects.some(function(s) { return s.key === currentSubject; }) ? currentSubject : 'all';
    }
    var customBox = document.getElementById('progCustomRange');
    var periodSel = document.getElementById('progPeriod');
    if (customBox && periodSel) customBox.style.display = periodSel.value === 'custom' ? 'flex' : 'none';

    var range = progPeriodRange();
    var hist = buildStudentHistory(st.rows, { subject: subjectSel ? subjectSel.value : 'all', fromTs: range.fromTs, toTs: range.toTs });
    progState.history = hist;
    progState.student = st;

    document.getElementById('progStudentName').textContent = st.name;
    document.getElementById('progStudentMeta').textContent = (st.admission ? 'Admission No. ' + st.admission + ' \u00B7 ' : '') + st.className;

    var s = hist.stats;
    var trendClass = hist.trend.kind === 'up' ? 'pos-trend-up' : (hist.trend.kind === 'down' ? 'pos-trend-down' : '');
    document.getElementById('progCards').innerHTML =
        posStatChip('Assessments', s.count) + posStatChip('Average', s.average + '%') + posStatChip('Highest', s.highest + '%') + posStatChip('Lowest', s.lowest + '%') +
        '<div class="pos-chip ' + trendClass + '"><div class="pos-chip-value" style="font-size:15px;">' + posEsc(hist.trend.label) + '</div><div class="pos-chip-label">Trend</div></div>';

    var chartBox = document.getElementById('progChart');
    var tableBox = document.getElementById('progTable');
    var subjBox = document.getElementById('progSubjectBars');
    if (hist.list.length === 0) {
        chartBox.innerHTML = '<p class="helper-text">No results for this student in the chosen period or subject.</p>';
        cmRenderChartPanel('cmHostProgress', []);
        tableBox.innerHTML = '';
        subjBox.innerHTML = '';
        return;
    }
    chartBox.innerHTML = '';
    cmRenderProgressChart(hist);

    subjBox.innerHTML = '<h4 style="margin:14px 0 8px;">Average by subject</h4>' + hist.subjectAverages.map(function(sa) {
        return '<div class="prog-bar-row"><div class="prog-bar-label">' + posEsc(sa.label) + '</div><div class="prog-bar-track"><div class="prog-bar-fill" style="width:' + Math.max(2, Math.min(100, sa.average)) + '%"></div></div><div class="prog-bar-value">' + sa.average + '%</div></div>';
    }).join('');

    var rows = hist.list.slice().reverse();
    var html = '<div class="scrollable-panel"><table class="pos-table"><thead><tr><th>Date</th><th>Subject</th><th>Code</th><th>Score</th><th>Correct</th><th>Remark</th></tr></thead><tbody>';
    rows.forEach(function(r) {
        html += '<tr><td>' + posEsc(progShortDate(r.t)) + '</td><td>' + posEsc(r.subject) + '</td><td>' + posEsc(r.code) + '</td><td><strong>' + r.score + '%</strong></td><td>' + posEsc(r.correct) + '/' + posEsc(r.total) + '</td><td><span class="pos-remark ' + (r.passed ? 'pass' : 'fail') + '">' + (r.passed ? 'Pass' : 'Fail') + '</span></td></tr>';
    });
    tableBox.innerHTML = html + '</tbody></table></div>';
}

function progPeriodText() {
    var period = document.getElementById('progPeriod');
    var v = period ? period.value : 'all';
    if (v === '30') return 'Last 30 days';
    if (v === '90') return 'Last 90 days';
    if (v === 'custom') {
        var f = (document.getElementById('progFrom') || {}).value, t = (document.getElementById('progTo') || {}).value;
        return (f || 'start') + ' to ' + (t || 'today');
    }
    return 'All time';
}

function progDownloadPdf() {
    if (!progState.history || progState.history.list.length === 0) { alert('There are no results to put in a report for this selection.'); return; }
    var st = progState.student, h = progState.history;
    var subjectSel = document.getElementById('progSubject');
    var subjectText = subjectSel && subjectSel.value !== 'all' ? subjectSel.options[subjectSel.selectedIndex].textContent : 'All subjects';
    try {
        var rows = h.list.slice().reverse().map(function(r) { return [progShortDate(r.t), r.subject, r.code, r.score + '%', r.correct + '/' + r.total, r.passed ? 'Pass' : 'Fail']; });
        var footer = [['', 'Average', '', h.stats.average + '%', '', '']];
        var pdf = pdfBuildTable({
            orientation: 'portrait',
            title: 'Student Progress Report',
            lines: ['Student: ' + st.name + (st.admission ? '   |   Admission No.: ' + st.admission : '') + '   |   Class: ' + st.className,
                    'Period: ' + progPeriodText() + '   |   Subjects: ' + subjectText,
                    'Assessments: ' + h.stats.count + '   |   Average: ' + h.stats.average + '%   |   Highest: ' + h.stats.highest + '%   |   Lowest: ' + h.stats.lowest + '%   |   Trend: ' + h.trend.label],
            headers: ['Date', 'Subject', 'Code', 'Score', 'Correct', 'Remark'],
            weights: [12, 30, 22, 10, 11, 10],
            align: ['left', 'left', 'left', 'center', 'center', 'center'],
            rows: rows,
            footerRows: footer
        });
        posDownloadBlob(pdf.output('blob'), 'Progress-' + backupSafeName(st.name) + '.pdf');
    } catch (e) {
        alert('Could not create the PDF: ' + e.message);
    }
}


// ============================================================
// CHARTS (one tool used by every dashboard)
// Each dashboard supplies a list of "sources" (what can be charted); the person picks the chart TYPE
// ("Select graph to view") and, where there is more than one source, WHAT to chart. Default: histogram.
// ============================================================

var CM_CHART_TYPES = [
    { id: 'histogram', label: 'Histogram' },
    { id: 'bar', label: 'Bar graph' },
    { id: 'hbar', label: 'Horizontal bar graph' },
    { id: 'line', label: 'Line graph' },
    { id: 'area', label: 'Area graph' },
    { id: 'pie', label: 'Pie chart' },
    { id: 'doughnut', label: 'Doughnut chart' },
    { id: 'radar', label: 'Radar chart' },
    { id: 'polar', label: 'Polar area chart' },
    { id: 'scatter', label: 'Scatter plot' }
];
var CM_PALETTE = ['#2d6cdf', '#2d9c5c', '#f0a500', '#dc3545', '#7b4dc0', '#13a8b4', '#e0637a', '#8a9a5b', '#c9a84c', '#4c6a92'];
var cmChartState = {};

function cmPalette(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(CM_PALETTE[i % CM_PALETTE.length]);
    return out;
}

function cmRound1(x) { return Math.round(x * 10) / 10; }

// ---- data builders: each returns { labels, values, unit, max? } ----
function cmBins(values) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    values.forEach(function(v) {
        var b = Math.min(9, Math.max(0, Math.floor((Number(v) || 0) / 10)));
        counts[b]++;
    });
    return { labels: ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'], values: counts, unit: 'students' };
}

function cmLimit(entries, limit) {
    if (entries.length <= limit) return entries;
    return entries.slice(0, limit);
}

function cmCountBy(items, keyFn, limit) {
    var map = {};
    items.forEach(function(it) { var k = String(keyFn(it) || 'Unknown'); map[k] = (map[k] || 0) + 1; });
    var entries = Object.keys(map).map(function(k) { return [k, map[k]]; }).sort(function(a, b) { return b[1] - a[1]; });
    entries = cmLimit(entries, limit || 15);
    return { labels: entries.map(function(e) { return e[0]; }), values: entries.map(function(e) { return e[1]; }), unit: 'count' };
}

function cmAvgBy(items, keyFn, valFn, limit, unit) {
    var map = {};
    items.forEach(function(it) {
        var k = String(keyFn(it) || 'Unknown');
        var m = map[k] || (map[k] = { sum: 0, n: 0 });
        m.sum += Number(valFn(it)) || 0; m.n++;
    });
    var entries = Object.keys(map).map(function(k) { return [k, cmRound1(map[k].sum / map[k].n)]; }).sort(function(a, b) { return b[1] - a[1]; });
    entries = cmLimit(entries, limit || 15);
    var out = { labels: entries.map(function(e) { return e[0]; }), values: entries.map(function(e) { return e[1]; }), unit: unit || '%' };
    if (out.unit === '%') out.max = 100;
    return out;
}

function cmDayLabel(d) { return d.toLocaleDateString([], { day: 'numeric', month: 'short' }); }

function cmByDay(items, dateFn) {
    var map = {};
    items.forEach(function(it) {
        var t = Date.parse(dateFn(it) || '');
        if (isNaN(t)) return;
        var d = new Date(t); d.setHours(0, 0, 0, 0);
        var k = d.getTime();
        map[k] = (map[k] || 0) + 1;
    });
    var keys = Object.keys(map).map(Number).sort(function(a, b) { return a - b; }).slice(-30);
    return { labels: keys.map(function(k) { return cmDayLabel(new Date(k)); }), values: keys.map(function(k) { return map[k]; }), unit: 'count' };
}

function cmPassed(r) { return Number(r.score) >= ((r.passMark !== null && r.passMark !== undefined) ? Number(r.passMark) : 50); }

// What can be charted from a list of results.
function cmResultSources(results, opts) {
    opts = opts || {};
    var list = [
        { id: 'dist', label: 'Score distribution', data: function() { return cmBins(results.map(function(r) { return r.score; })); } },
        { id: 'subject', label: 'Average score by subject', data: function() { return cmAvgBy(results, function(r) { return r.subject; }, function(r) { return r.score; }); } },
        { id: 'class', label: 'Average score by class', data: function() { return cmAvgBy(results, function(r) { return r.className; }, function(r) { return r.score; }); } },
        { id: 'passfail', label: 'Pass vs fail', data: function() { var p = results.filter(cmPassed).length; return { labels: ['Passed', 'Failed'], values: [p, results.length - p], unit: 'students' }; } },
        { id: 'time', label: 'Submissions over time', data: function() { return cmByDay(results, function(r) { return r.createdAt; }); } },
        { id: 'assess', label: 'Results per assessment', data: function() { return cmCountBy(results, function(r) { return r.assessmentCode; }); } }
    ];
    if (opts.students) {
        list.push({ id: 'student', label: 'Score per student', data: function() {
            var rows = results.slice(0, 40);
            return { labels: rows.map(function(r) { return r.studentName; }), values: rows.map(function(r) { return Number(r.score) || 0; }), unit: '%', max: 100 };
        } });
    }
    if (opts.admin) {
        list.push({ id: 'teacherCount', label: 'Results per teacher', data: function() { return cmCountBy(results, function(r) { return r.teacherEmail; }); } });
        list.push({ id: 'teacherAvg', label: 'Average score per teacher', data: function() { return cmAvgBy(results, function(r) { return r.teacherEmail; }, function(r) { return r.score; }); } });
    }
    return list;
}

function cmAccessLabel(s) { return typeof accessLogStatusLabel === 'function' ? accessLogStatusLabel(s) : (s || 'Unknown'); }

function cmAccessSources(logs) {
    return [
        { id: 'status', label: 'Attempts by outcome', data: function() { return cmCountBy(logs, function(l) { return cmAccessLabel(l.status); }); } },
        { id: 'day', label: 'Attempts per day', data: function() { return cmByDay(logs, function(l) { return l.timestamp; }); } },
        { id: 'code', label: 'Attempts per assessment', data: function() { return cmCountBy(logs, function(l) { return l.code; }); } },
        { id: 'class', label: 'Attempts per class', data: function() { return cmCountBy(logs, function(l) { return l.className; }); } }
    ];
}

// ---- drawing ----
function cmAxes(d, horizontal) {
    var valueAxis = { beginAtZero: true, title: { display: !!d.unit, text: d.unit || '' } };
    if (d.max) valueAxis.suggestedMax = d.max;
    var labelAxis = { ticks: { maxRotation: 60, autoSkip: true } };
    return horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis };
}

function cmChartConfig(type, d) {
    var labels = d.labels, values = d.values, colors = cmPalette(values.length);
    var round = ['pie', 'doughnut', 'polar'].indexOf(type) !== -1;
    var options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: round || type === 'radar' ? round : false } } };
    var ds = { label: d.unit || 'value', data: values };
    if (type === 'histogram') {
        ds.backgroundColor = '#2d6cdf'; ds.borderColor = '#ffffff'; ds.borderWidth = 1; ds.barPercentage = 1; ds.categoryPercentage = 1;
        options.scales = cmAxes(d, false);
        return { type: 'bar', data: { labels: labels, datasets: [ds] }, options: options };
    }
    if (type === 'bar' || type === 'hbar') {
        ds.backgroundColor = colors; ds.borderRadius = 4;
        if (type === 'hbar') options.indexAxis = 'y';
        options.scales = cmAxes(d, type === 'hbar');
        return { type: 'bar', data: { labels: labels, datasets: [ds] }, options: options };
    }
    if (type === 'line' || type === 'area') {
        ds.borderColor = '#2d6cdf'; ds.backgroundColor = 'rgba(45,108,223,0.2)'; ds.tension = 0.3; ds.pointRadius = 4; ds.fill = type === 'area';
        options.scales = cmAxes(d, false);
        return { type: 'line', data: { labels: labels, datasets: [ds] }, options: options };
    }
    if (type === 'pie' || type === 'doughnut') {
        ds.backgroundColor = colors; ds.borderColor = '#ffffff'; ds.borderWidth = 2;
        return { type: type, data: { labels: labels, datasets: [ds] }, options: options };
    }
    if (type === 'polar') {
        ds.backgroundColor = colors.map(function(c) { return c + 'cc'; });
        return { type: 'polarArea', data: { labels: labels, datasets: [ds] }, options: options };
    }
    if (type === 'radar') {
        ds.borderColor = '#2d6cdf'; ds.backgroundColor = 'rgba(45,108,223,0.25)'; ds.pointBackgroundColor = '#2d6cdf';
        options.scales = { r: { beginAtZero: true, suggestedMax: d.max || undefined } };
        return { type: 'radar', data: { labels: labels, datasets: [ds] }, options: options };
    }
    // scatter
    ds.data = values.map(function(v, i) { return { x: i + 1, y: v }; });
    ds.backgroundColor = '#2d6cdf'; ds.pointRadius = 5;
    options.scales = {
        x: { ticks: { stepSize: 1, callback: function(v) { return labels[v - 1] || ''; } } },
        y: { beginAtZero: true, title: { display: !!d.unit, text: d.unit || '' }, suggestedMax: d.max || undefined }
    };
    return { type: 'scatter', data: { datasets: [ds] }, options: options };
}

function cmDrawChart(hostId) {
    var st = cmChartState[hostId];
    var host = document.getElementById(hostId);
    if (!st || !host) return;
    var wrap = host.querySelector('.cm-canvas-wrap');
    var canvas = host.querySelector('canvas');
    var empty = host.querySelector('.cm-empty');
    if (st.chart) { try { st.chart.destroy(); } catch (e) {} st.chart = null; }
    var src = st.sources.filter(function(s) { return s.id === st.source; })[0] || st.sources[0];
    var d = null;
    try { d = src.data(); } catch (e) { d = null; }
    var hasData = d && d.values && d.values.length > 0 && d.values.some(function(v) { return Number(v) > 0; });
    if (!hasData) {
        wrap.style.display = 'none';
        empty.style.display = 'block';
        empty.textContent = 'Nothing to chart yet for this view.';
        return;
    }
    if (typeof Chart === 'undefined') {
        wrap.style.display = 'none';
        empty.style.display = 'block';
        empty.textContent = 'Charts could not load. Please check your internet connection and refresh the page.';
        return;
    }
    empty.style.display = 'none';
    wrap.style.display = st.hidden ? 'none' : 'block';
    st.chart = new Chart(canvas, cmChartConfig(st.type, d));
}

// Builds (or updates) the chart panel inside host element `hostId`. Pass an empty list to clear it.
function cmRenderChartPanel(hostId, sources) {
    var host = document.getElementById(hostId);
    if (!host) return;
    var st = cmChartState[hostId] || (cmChartState[hostId] = { type: 'histogram', source: null, hidden: false, chart: null });
    st.sources = (sources || []).filter(Boolean);
    if (st.sources.length === 0) {
        if (st.chart) { try { st.chart.destroy(); } catch (e) {} st.chart = null; }
        host.innerHTML = '';
        return;
    }
    if (!st.sources.some(function(s) { return s.id === st.source; })) st.source = st.sources[0].id;

    if (!host.querySelector('.cm-chart')) {
        host.innerHTML =
            '<div class="cm-chart">' +
                '<div class="cm-chart-controls">' +
                    '<label>Select graph to view<select class="form-input cm-type">' +
                        CM_CHART_TYPES.map(function(t) { return '<option value="' + t.id + '">' + t.label + '</option>'; }).join('') +
                    '</select></label>' +
                    '<label class="cm-source-label">Show<select class="form-input cm-source"></select></label>' +
                    '<button type="button" class="secondary-btn cm-toggle">Hide chart</button>' +
                '</div>' +
                '<div class="cm-canvas-wrap"><canvas></canvas></div>' +
                '<p class="cm-empty helper-text" style="display:none;"></p>' +
            '</div>';
        host.querySelector('.cm-type').addEventListener('change', function() { st.type = this.value; cmDrawChart(hostId); });
        host.querySelector('.cm-source').addEventListener('change', function() { st.source = this.value; cmDrawChart(hostId); });
        host.querySelector('.cm-toggle').addEventListener('click', function() {
            st.hidden = !st.hidden;
            this.textContent = st.hidden ? 'Show chart' : 'Hide chart';
            host.querySelector('.cm-canvas-wrap').style.display = st.hidden ? 'none' : 'block';
            if (!st.hidden) cmDrawChart(hostId);
        });
    }
    host.querySelector('.cm-type').value = st.type;
    var srcSel = host.querySelector('.cm-source');
    srcSel.innerHTML = st.sources.map(function(s) { return '<option value="' + s.id + '">' + escapeHtml(s.label) + '</option>'; }).join('');
    srcSel.value = st.source;
    host.querySelector('.cm-source-label').style.display = st.sources.length > 1 ? '' : 'none';
    cmDrawChart(hostId);
}

// ---------- teacher dashboards ----------
function cmRefreshTeacherCharts(filtered) {
    cmRenderChartPanel('cmHostTeacherOverview', cmResultSources(filtered));
    cmRenderChartPanel('cmHostTeacherResults', cmResultSources(filtered, { students: true }));
}

function cmRefreshPublishedCharts() {
    var list = teacherAssessmentsCache || [];
    if (list.length === 0) { cmRenderChartPanel('cmHostPublished', []); return; }
    var results = teacherResultsCache || [];
    cmRenderChartPanel('cmHostPublished', [
        { id: 'results', label: 'Results per assessment', data: function() { return cmCountBy(results.filter(function(r) { return list.some(function(a) { return a.code === r.assessmentCode; }); }), function(r) { return r.assessmentCode; }); } },
        { id: 'avg', label: 'Average score per assessment', data: function() { return cmAvgBy(results, function(r) { return r.assessmentCode; }, function(r) { return r.score; }); } },
        { id: 'questions', label: 'Questions per assessment', data: function() { return { labels: list.slice(0, 15).map(function(a) { return a.code; }), values: list.slice(0, 15).map(function(a) { return (a.questions || []).length; }), unit: 'questions' }; } },
        { id: 'time', label: 'Time limit per assessment (minutes)', data: function() { return { labels: list.slice(0, 15).map(function(a) { return a.code; }), values: list.slice(0, 15).map(function(a) { return Math.round((a.timeLimit || 0) / 60); }), unit: 'minutes' }; } }
    ]);
}

function cmRenderProgressChart(hist) {
    var list = hist.list;
    cmRenderChartPanel('cmHostProgress', [
        { id: 'time', label: 'Scores over time', data: function() { return { labels: list.map(function(p) { return progShortDate(p.t) + ' ' + p.subject; }), values: list.map(function(p) { return p.score; }), unit: '%', max: 100 }; } },
        { id: 'subject', label: 'Average by subject', data: function() { return { labels: hist.subjectAverages.map(function(s) { return s.label; }), values: hist.subjectAverages.map(function(s) { return s.average; }), unit: '%', max: 100 }; } },
        { id: 'passfail', label: 'Pass vs fail', data: function() { var p = list.filter(function(x) { return x.passed; }).length; return { labels: ['Passed', 'Failed'], values: [p, list.length - p], unit: 'assessments' }; } },
        { id: 'dist', label: 'Score distribution', data: function() { var b = cmBins(list.map(function(x) { return x.score; })); b.unit = 'assessments'; return b; } }
    ]);
}

function cmRenderPosSubject(data) {
    if (!data) { cmRenderChartPanel('cmHostPosSubject', []); return; }
    cmRenderChartPanel('cmHostPosSubject', [
        { id: 'student', label: 'Score per student', data: function() { var r = data.rows.slice(0, 40); return { labels: r.map(function(x) { return x.name; }), values: r.map(function(x) { return x.score; }), unit: '%', max: 100 }; } },
        { id: 'dist', label: 'Score distribution', data: function() { return cmBins(data.rows.map(function(x) { return x.score; })); } },
        { id: 'passfail', label: 'Pass vs fail', data: function() { return { labels: ['Passed', 'Failed'], values: [data.stats.passed, data.stats.students - data.stats.passed], unit: 'students' }; } }
    ]);
}

function cmRenderPosClass(data) {
    if (!data || data.rows.length === 0) { cmRenderChartPanel('cmHostPosClass', []); return; }
    cmRenderChartPanel('cmHostPosClass', [
        { id: 'student', label: 'Average per student', data: function() { var r = data.rows.slice(0, 40); return { labels: r.map(function(x) { return x.name; }), values: r.map(function(x) { return x.average; }), unit: '%', max: 100 }; } },
        { id: 'subject', label: 'Class average per subject', data: function() { return { labels: data.subjects.map(function(s) { return s.label; }), values: data.subjects.map(function(s) { return data.subjectAverages[s.key] || 0; }), unit: '%', max: 100 }; } },
        { id: 'dist', label: 'Average distribution', data: function() { return cmBins(data.rows.map(function(x) { return x.average; })); } },
        { id: 'passfail', label: 'Pass vs fail (by average)', data: function() { var p = data.rows.filter(function(x) { return x.average >= 50; }).length; return { labels: ['Average 50% or more', 'Below 50%'], values: [p, data.rows.length - p], unit: 'students' }; } }
    ]);
}

// ---------- per-question time ----------
function cmFmtSec(s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Average seconds per question across all results of one assessment that have timing data.
function cmAvgQuestionTimes(code) {
    var rs = (teacherResultsCache || []).filter(function(r) { return r.assessmentCode === code && Array.isArray(r.qTimes) && r.qTimes.some(function(t) { return typeof t === 'number'; }); });
    var n = 0;
    rs.forEach(function(r) { n = Math.max(n, r.qTimes.length); });
    var avgs = [];
    for (var i = 0; i < n; i++) {
        var sum = 0, c = 0;
        rs.forEach(function(r) { if (typeof r.qTimes[i] === 'number') { sum += r.qTimes[i]; c++; } });
        avgs.push(c ? cmRound1(sum / c) : 0);
    }
    return { avgs: avgs, attempts: rs.length };
}

function cmAvgTimeHtml(code, assessment) {
    var t = cmAvgQuestionTimes(code);
    if (t.attempts === 0) return '';
    var max = Math.max.apply(null, t.avgs.concat([1]));
    var html = '<h4 style="margin:18px 0 6px;">Average time per question</h4><p class="helper-text" style="margin:0 0 8px;">Based on ' + t.attempts + ' attempt(s) with timing data.</p>';
    t.avgs.forEach(function(a, i) {
        var q = assessment && assessment.questions && assessment.questions[i] ? String(assessment.questions[i].question || '') : '';
        if (q.length > 80) q = q.slice(0, 80) + '...';
        html += '<div class="prog-bar-row"><div class="prog-bar-label" style="flex-basis:46%;" title="' + escapeHtml(q) + '">Q' + (i + 1) + (q ? ': ' + escapeHtml(q) : '') + '</div><div class="prog-bar-track"><div class="prog-bar-fill" style="width:' + Math.max(2, a / max * 100) + '%"></div></div><div class="prog-bar-value" style="flex-basis:52px;">' + cmFmtSec(a) + '</div></div>';
    });
    return html;
}

function cmAnalyticsSources(code, analytics) {
    var t = cmAvgQuestionTimes(code);
    var results = (teacherResultsCache || []).filter(function(r) { return r.assessmentCode === code; });
    var list = [];
    if (analytics && analytics.questions) {
        list.push({ id: 'missed', label: 'Most missed questions (% wrong)', data: function() { return { labels: analytics.questions.map(function(q, i) { return 'Q' + (i + 1); }), values: analytics.questions.map(function(q) { return q.wrongPct; }), unit: '% wrong', max: 100 }; } });
    }
    if (t.attempts > 0) {
        list.push({ id: 'time', label: 'Average time per question (seconds)', data: function() { return { labels: t.avgs.map(function(a, i) { return 'Q' + (i + 1); }), values: t.avgs, unit: 'seconds' }; } });
    }
    list.push({ id: 'dist', label: 'Score distribution', data: function() { return cmBins(results.map(function(r) { return r.score; })); } });
    return list;
}

function closeQuestionTimes() {
    var o = document.getElementById('questionTimesOverlay');
    if (o) o.style.display = 'none';
}

function showQuestionTimesForSelected() {
    if (!pendingResultAction || !pendingResultAction.result) return;
    var result = pendingResultAction.result;
    closeResultActions();
    var overlay = document.getElementById('questionTimesOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.getElementById('qtTitle').textContent = result.studentName + ' - ' + result.subject;
    var times = Array.isArray(result.qTimes) ? result.qTimes : [];
    var has = times.some(function(t) { return typeof t === 'number'; });
    var summary = document.getElementById('qtSummary');
    var table = document.getElementById('qtTable');
    if (!has) {
        summary.textContent = 'Time per question was not recorded for this result (it was taken before this feature was added).';
        table.innerHTML = '';
        cmRenderChartPanel('cmHostQTimes', []);
        return;
    }
    var total = times.reduce(function(a, t) { return a + (typeof t === 'number' ? t : 0); }, 0);
    summary.textContent = 'Total time taken: ' + result.timeTaken + '. The time on every question below adds up to ' + cmFmtSec(total) + '.';
    var assessment = (teacherAssessmentsCache || []).filter(function(a) { return a.code === result.assessmentCode; })[0];
    var correct = Array.isArray(result.qCorrect) ? result.qCorrect : [];
    var html = '<table class="pos-table"><thead><tr><th>Q</th><th>Question</th><th>Time</th><th>Answer</th></tr></thead><tbody>';
    times.forEach(function(t, i) {
        var q = assessment && assessment.questions && assessment.questions[i] ? String(assessment.questions[i].question || '') : '';
        if (q.length > 70) q = q.slice(0, 70) + '...';
        html += '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(q) + '</td><td><strong>' + cmFmtSec(t) + '</strong></td><td>' + (correct[i] ? '<span class="pos-remark pass">Right</span>' : '<span class="pos-remark fail">Wrong</span>') + '</td></tr>';
    });
    html += '<tr class="pos-footer-row"><td></td><td>Total</td><td>' + cmFmtSec(total) + '</td><td></td></tr></tbody></table>';
    table.innerHTML = html;
    cmRenderChartPanel('cmHostQTimes', [
        { id: 'time', label: 'Time per question (seconds)', data: function() { return { labels: times.map(function(t, i) { return 'Q' + (i + 1); }), values: times.map(function(t) { return t || 0; }), unit: 'seconds' }; } },
        { id: 'share', label: 'Share of total time (%)', data: function() { return { labels: times.map(function(t, i) { return 'Q' + (i + 1); }), values: times.map(function(t) { return total ? cmRound1((t || 0) / total * 100) : 0; }), unit: '% of time' }; } },
        { id: 'rw', label: 'Average time: right vs wrong answers', data: function() {
            var rs = 0, rc = 0, ws = 0, wc = 0;
            times.forEach(function(t, i) { if (correct[i]) { rs += t || 0; rc++; } else { ws += t || 0; wc++; } });
            return { labels: ['Right answers', 'Wrong answers'], values: [rc ? cmRound1(rs / rc) : 0, wc ? cmRound1(ws / wc) : 0], unit: 'seconds per question' };
        } }
    ]);
}

// ---------- admin dashboards ----------
var cmAdminCache = { t: 0, results: null, teachers: [], assessments: [] };

async function cmLoadAdminData(needResults) {
    var token = localStorage.getItem('cleverment_admin_token') || '';
    var headers = { 'Authorization': 'Bearer ' + token };
    var fresh = Date.now() - cmAdminCache.t < 60000;
    if (!fresh) {
        try {
            var tr = await fetch(BACKEND_URL + '/api/admin/teachers', { headers: headers });
            if (tr.ok) cmAdminCache.teachers = (await tr.json()).teachers || [];
        } catch (e) {}
        try {
            var ar = await fetch(BACKEND_URL + '/api/admin/assessments', { headers: headers });
            if (ar.ok) cmAdminCache.assessments = (await ar.json()).assessments || [];
        } catch (e) {}
        cmAdminCache.t = Date.now();
        cmAdminCache.results = null;
    }
    if (needResults && !cmAdminCache.results) {
        var all = (typeof adminResultsCache !== 'undefined' && adminResultsCache && adminResultsCache.length) ? adminResultsCache : await attachPassMarks(await getAllResultsFromDatabase(), true);
        cmAdminCache.results = all;
    }
    return cmAdminCache;
}

function cmAdminFilteredResults(all) {
    function val(id) { var el = document.getElementById(id); return el ? el.value : 'all'; }
    var t = val('adminResultsFilterTeacher'), c = val('adminResultsFilterClass'), s = val('adminResultsFilterSubject');
    return all.filter(function(r) {
        return (t === 'all' || r.teacherEmail === t) && (c === 'all' || r.className === c) && (s === 'all' || r.subject === s);
    });
}

async function cmAdminPanelOpened(panelId) {
    try {
        if (panelId === 'adminOverviewPanel') {
            var d = await cmLoadAdminData(true);
            var src = cmResultSources(d.results, { admin: true });
            src.push({ id: 'assessTeacher', label: 'Assessments per teacher', data: function() { return cmCountBy(d.assessments, function(a) { return a.teacher_email || a.teacherEmail; }); } });
            cmRenderChartPanel('cmHostAdminOverview', src);
        } else if (panelId === 'adminResultsSection') {
            var d2 = await cmLoadAdminData(true);
            cmRenderChartPanel('cmHostAdminResults', cmResultSources(cmAdminFilteredResults(d2.results), { admin: true, students: true }));
        } else if (panelId === 'adminTeachersSection') {
            var d3 = await cmLoadAdminData(true);
            var names = {};
            d3.teachers.forEach(function(t) { names[String(t.email || '').toLowerCase()] = t.name || t.email; });
            function nm(e) { return names[String(e || '').toLowerCase()] || e; }
            cmRenderChartPanel('cmHostAdminTeachers', [
                { id: 'results', label: 'Results per teacher', data: function() { return cmCountBy(d3.results, function(r) { return nm(r.teacherEmail); }); } },
                { id: 'avg', label: 'Average score per teacher', data: function() { return cmAvgBy(d3.results, function(r) { return nm(r.teacherEmail); }, function(r) { return r.score; }); } },
                { id: 'assess', label: 'Assessments per teacher', data: function() { return cmCountBy(d3.assessments, function(a) { return nm(a.teacher_email || a.teacherEmail); }); } },
                { id: 'status', label: 'Active vs paused teachers', data: function() { var p = d3.teachers.filter(function(t) { return t.paused; }).length; return { labels: ['Active', 'Paused'], values: [d3.teachers.length - p, p], unit: 'teachers' }; } },
                { id: 'signups', label: 'Teachers registered over time', data: function() { return cmByDay(d3.teachers, function(t) { return t.created_at; }); } }
            ]);
        } else if (panelId === 'adminAssessmentsSection') {
            var d4 = await cmLoadAdminData(true);
            cmRenderChartPanel('cmHostAdminAssessments', [
                { id: 'results', label: 'Results per assessment', data: function() { return cmCountBy(d4.results, function(r) { return r.assessmentCode; }); } },
                { id: 'avg', label: 'Average score per assessment', data: function() { return cmAvgBy(d4.results, function(r) { return r.assessmentCode; }, function(r) { return r.score; }); } },
                { id: 'teacher', label: 'Assessments per teacher', data: function() { return cmCountBy(d4.assessments, function(a) { return a.teacher_email || a.teacherEmail; }); } },
                { id: 'subject', label: 'Assessments per subject', data: function() { return cmCountBy(d4.assessments, function(a) { return a.subject; }); } },
                { id: 'class', label: 'Assessments per class', data: function() { return cmCountBy(d4.assessments, function(a) { return a.class_name || a.className; }); } },
                { id: 'questions', label: 'Questions per assessment', data: function() { var l = d4.assessments.slice(0, 15); return { labels: l.map(function(a) { return a.code; }), values: l.map(function(a) { return (a.questions || []).length; }), unit: 'questions' }; } }
            ]);
        } else if (panelId === 'adminActivitySection') {
            var acts = await getTeacherActivity();
            var dd = await cmLoadAdminData(false);
            var nmap = {};
            dd.teachers.forEach(function(t) { nmap[String(t.email || '').toLowerCase()] = t.name || t.email; });
            cmRenderChartPanel('cmHostAdminActivity', acts && acts.length ? [
                { id: 'type', label: 'Actions by type', data: function() { return cmCountBy(acts, function(a) { return String(a.action || 'activity').replace(/_/g, ' '); }); } },
                { id: 'day', label: 'Activity per day', data: function() { return cmByDay(acts, function(a) { return a.created_at; }); } },
                { id: 'teacher', label: 'Activity per teacher', data: function() { return cmCountBy(acts, function(a) { return nmap[String(a.teacher_email || '').toLowerCase()] || a.teacher_email; }); } }
            ] : []);
        }
    } catch (e) {
        /* a chart problem must never break the dashboard */
    }
}

function cmInitListeners() {
    var res = document.getElementById('adminResultsSection');
    if (res) res.addEventListener('change', function() { setTimeout(function() { cmAdminPanelOpened('adminResultsSection'); }, 150); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cmInitListeners); else cmInitListeners();

// ---------- per-question time tracking (student side) ----------
// Time on each question is measured in real clock time, including time spent on the page after leaving, so the
// server can scale the numbers to add up exactly to the total time taken.
var studentQuestionMs = {};
var studentActiveOrigIndex = -1;
var studentQuestionClockStart = 0;

function studentAccrueQuestionTime() {
    if (studentActiveOrigIndex < 0 || !studentQuestionClockStart) return;
    var now = Date.now();
    var d = now - studentQuestionClockStart;
    if (d > 0) studentQuestionMs[studentActiveOrigIndex] = (studentQuestionMs[studentActiveOrigIndex] || 0) + d;
    studentQuestionClockStart = now;
}

function studentTrackQuestionSwitch(q) {
    if (!q) return;
    studentAccrueQuestionTime();
    studentActiveOrigIndex = q.originalIndex;
    if (!studentQuestionClockStart) studentQuestionClockStart = Date.now();
}



// ============================================================
// REFRESH BUTTONS on every teacher and admin page
// (Access Attempts pages already have their own.)
// ============================================================

var CM_REFRESH_ACTIONS = {
    // teacher
    teacherOverviewPanel: function() { return renderTeacherDashboard(); },
    liveSection: function() { return loadTeacherLive(); },
    uploadSection: function() { populateTeacherQuestionBankSelect(); return loadTeacherProfile(true); },
    publishedSection: function() { return renderTeacherPublishedList(); },
    rosterSection: function() { if (currentRosterEditClass) return loadRosterForEditing(currentRosterEditClass); },
    analyticsSection: async function() { await reloadTeacherResultsCache(); return loadTeacherAnalytics(); },
    positionsSection: function() { return initPositionsPanel(true); },
    progressSection: function() { return initProgressPanel(true); },
    backupSection: function() { showLastBackupTime(); },
    csvHistorySection: function() { return renderCSVHistory(); },
    adminSection: function() { return reloadTeacherResultsCache(); },
    // admin
    adminOverviewPanel: async function() { cmAdminCache.t = 0; await renderAdminDashboard(); },
    adminFeeSection: function() { return renderAdminReactivationFee(); },
    adminSecuritySection: function() { return loadAdminSecurity(); },
    adminSchoolsSection: function() { return loadAdminSchools(); },
    schoolSection: function() { return loadSchoolPanel(); },
    adminOptionsSection: function() { return loadAdminOptions(); },
    adminAnnounceSection: function() { return loadAdminAnnouncements(); },
    adminFaqSection: async function() { if (typeof loadFaqs === 'function') await loadFaqs(); return renderAdminFaqList(); },
    adminLiveSection: function() { return loadAdminLive(); },
    adminSelectTeacherSection: function() { return loadAdminTeacherWorkspaceOptions(); },
    adminTeachersSection: async function() { cmAdminCache.t = 0; await renderAdminTeacherList(); await cmAdminPanelOpened('adminTeachersSection'); },
    adminAssessmentsSection: async function() { cmAdminCache.t = 0; await renderAdminAssessmentList(); await cmAdminPanelOpened('adminAssessmentsSection'); },
    adminActivitySection: async function() { cmAdminCache.t = 0; await renderAdminActivityLog(); await cmAdminPanelOpened('adminActivitySection'); },
    adminResultsSection: async function() { cmAdminCache.t = 0; await renderAdminResults(); await cmAdminPanelOpened('adminResultsSection'); }
};

function cmInjectRefreshButtons() {
    Object.keys(CM_REFRESH_ACTIONS).forEach(function(panelId) {
        var panel = document.getElementById(panelId);
        if (!panel || panel.getAttribute('data-refresh-added')) return;
        panel.setAttribute('data-refresh-added', '1');
        var bar = document.createElement('div');
        bar.className = 'cm-refresh-bar';
        bar.innerHTML = '<span class="cm-refresh-status"></span><button type="button" class="cm-refresh-btn" aria-label="Refresh this page">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg><span>Refresh</span></button>';
        var btn = bar.querySelector('.cm-refresh-btn');
        var status = bar.querySelector('.cm-refresh-status');
        btn.addEventListener('click', async function() {
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Refreshing...';
            status.textContent = '';
            try {
                await CM_REFRESH_ACTIONS[panelId]();
                status.textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            } catch (e) {
                status.textContent = 'Could not refresh. Please try again.';
            }
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Refresh';
        });
        panel.insertBefore(bar, panel.firstChild);
    });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cmInjectRefreshButtons); else cmInjectRefreshButtons();


// ============================================================
// ADMIN: TEACHER LAST LOGIN / LAST ACTIVE
// ============================================================
function cmAgo(iso) {
    var t = Date.parse(iso || '');
    if (isNaN(t)) return '';
    var sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 90) return 'just now';
    var min = Math.round(sec / 60); if (min < 60) return min + ' min ago';
    var hr = Math.round(min / 60); if (hr < 24) return hr + ' hour' + (hr === 1 ? '' : 's') + ' ago';
    var day = Math.round(hr / 24); if (day < 60) return day + ' day' + (day === 1 ? '' : 's') + ' ago';
    var mon = Math.round(day / 30); return mon + ' months ago';
}
function cmLoginText(t) {
    function line(label, iso) {
        if (!iso) return label + ': <b>Never</b>';
        return label + ': <b>' + new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + '</b> (' + cmAgo(iso) + ')';
    }
    return line('Last login', t.last_login_at) + ' &middot; ' + line('Last active', t.last_active_at);
}

// ============================================================
// STUDENT: FLAG A QUESTION
// ============================================================
var FLAG_CATEGORY_LABELS = {
    incomplete: 'Incomplete question',
    no_correct: 'No correct answer among the options',
    multiple_correct: 'More than one correct answer',
    typo: 'Wrong wording or typing mistake',
    missing_media: 'Picture or diagram missing',
    symbols: 'Maths symbols not showing properly',
    out_of_syllabus: 'Not taught / out of syllabus',
    duplicate: 'Duplicate question',
    other: 'Other'
};
var studentFlagged = {};
var studentFlaggedFor = '';

function studentFlagStorageKey() { return 'cleverment_flags_' + currentAssessmentCode + '_' + String(studentAdmissionNumber || '').toLowerCase(); }

function studentLoadFlagsIfNeeded() {
    var k = studentFlagStorageKey();
    if (studentFlaggedFor === k) return;
    studentFlaggedFor = k;
    try { studentFlagged = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { studentFlagged = {}; }
}

function studentUpdateFlagButton() {
    var btn = document.getElementById('studentFlagBtn');
    var q = studentQuestions[studentCurrentIndex];
    if (!btn || !q) return;
    studentLoadFlagsIfNeeded();
    var flagged = !!studentFlagged[q.originalIndex];
    btn.classList.toggle('flagged', flagged);
    var label = btn.querySelector('span');
    if (label) label.textContent = flagged ? 'Reported' : 'Report a problem';
    btn.setAttribute('aria-label', flagged ? 'You reported this question' : 'Report a problem with this question');
}

function openQuestionFlagDialog() {
    var q = studentQuestions[studentCurrentIndex];
    if (!q) return;
    studentLoadFlagsIfNeeded();
    var overlay = document.getElementById('questionFlagOverlay');
    var list = document.getElementById('flagReasonList');
    var current = studentFlagged[q.originalIndex] || '';
    list.innerHTML = Object.keys(FLAG_CATEGORY_LABELS).map(function(id) {
        return '<label class="flag-reason"><input type="radio" name="flagReason" value="' + id + '"' + (current === id ? ' checked' : '') + '><span>' + FLAG_CATEGORY_LABELS[id] + '</span></label>';
    }).join('');
    document.getElementById('flagNote').value = '';
    document.getElementById('flagCount').textContent = '0/150';
    document.getElementById('flagStatus').textContent = current ? 'You already reported this question. Choose a different reason to change it.' : '';
    document.getElementById('flagStatus').style.color = '#6b7a8f';
    document.getElementById('flagQuestionLabel').textContent = 'Question ' + (studentCurrentIndex + 1);
    document.getElementById('flagSendBtn').disabled = false;
    overlay.style.display = 'flex';
}

function closeQuestionFlagDialog() {
    var o = document.getElementById('questionFlagOverlay');
    if (o) o.style.display = 'none';
}

async function sendQuestionFlag() {
    var q = studentQuestions[studentCurrentIndex];
    var picked = document.querySelector('#flagReasonList input[name="flagReason"]:checked');
    var status = document.getElementById('flagStatus');
    if (!q) return;
    if (!picked) { status.style.color = '#dc3545'; status.textContent = 'Please choose a reason.'; return; }
    var btn = document.getElementById('flagSendBtn');
    btn.disabled = true;
    status.style.color = '#6b7a8f';
    status.textContent = 'Sending...';
    try {
        var res = await fetchWithRetry(BACKEND_URL + '/api/quiz/flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: currentAssessmentCode,
                studentName: studentName,
                admissionNumber: studentAdmissionNumber,
                questionIndex: q.originalIndex,
                category: picked.value,
                note: document.getElementById('flagNote').value
            })
        }, { attempts: 2, baseDelay: 1500 });
        var data = await res.json();
        if (!res.ok) { status.style.color = '#dc3545'; status.textContent = data.error || 'Could not send your report.'; btn.disabled = false; return; }
        studentFlagged[q.originalIndex] = picked.value;
        try { localStorage.setItem(studentFlagStorageKey(), JSON.stringify(studentFlagged)); } catch (e) {}
        studentUpdateFlagButton();
        status.style.color = '#2d9c5c';
        status.textContent = '\u2713 Thank you. Your teacher will see this report.';
        setTimeout(closeQuestionFlagDialog, 1100);
    } catch (e) {
        status.style.color = '#dc3545';
        status.textContent = 'Could not reach the server. Please try again.';
        btn.disabled = false;
    }
}

// ============================================================
// TEACHER: FLAGGED QUESTIONS
// ============================================================
var editorFlagCounts = {};

async function fetchAssessmentFlags(code) {
    var token = localStorage.getItem('cleverment_teacher_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/assessments/' + encodeURIComponent(code) + '/flags', { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        return res.ok ? (data.flags || []) : [];
    } catch (e) { return []; }
}

function groupFlagsByQuestion(flags) {
    var map = {};
    flags.forEach(function(f) {
        var g = map[f.question_index] || (map[f.question_index] = { index: f.question_index, text: f.question_text, count: 0, cats: {}, students: [], resolved: true });
        g.count++;
        g.cats[f.category] = (g.cats[f.category] || 0) + 1;
        g.students.push(f);
        if (!f.resolved) g.resolved = false;
    });
    return Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return b.count - a.count || a.index - b.index; });
}

async function renderFlaggedQuestions(code) {
    var host = document.getElementById('flaggedQuestionsHost');
    if (!host) return;
    if (!code) { host.innerHTML = ''; cmRenderChartPanel('cmHostFlags', []); return; }
    var flags = await fetchAssessmentFlags(code);
    var groups = groupFlagsByQuestion(flags);
    if (groups.length === 0) {
        host.innerHTML = '<div class="flag-box"><h4 style="margin:0 0 4px;">Flagged questions</h4><p class="helper-text" style="margin:0;">No student has flagged a question in this assessment.</p></div>';
        cmRenderChartPanel('cmHostFlags', []);
        return;
    }
    var html = '<div class="flag-box"><h4 style="margin:0 0 4px;">Flagged questions</h4><p class="helper-text" style="margin:0 0 8px;">' + flags.length + ' report(s) on ' + groups.length + ' question(s).</p>' +
        '<div class="scrollable-panel"><table class="pos-table"><thead><tr><th>Q</th><th>Question</th><th>Flags</th><th>Reasons</th><th>Flagged by</th><th></th></tr></thead><tbody>';
    groups.forEach(function(g) {
        var reasons = Object.keys(g.cats).map(function(k) { return escapeHtml(FLAG_CATEGORY_LABELS[k] || k) + ' (' + g.cats[k] + ')'; }).join('<br>');
        var who = g.students.map(function(f) {
            var tip = (FLAG_CATEGORY_LABELS[f.category] || f.category) + (f.note ? ' - ' + f.note : '');
            return '<span title="' + escapeHtml(tip) + '">' + escapeHtml(f.student_name) + '</span>' + (f.note ? '<div class="flag-note">&ldquo;' + escapeHtml(f.note) + '&rdquo;</div>' : '');
        }).join('<br>');
        var q = String(g.text || ''); if (q.length > 90) q = q.slice(0, 90) + '...';
        html += '<tr style="' + (g.resolved ? 'opacity:.55;' : '') + '"><td>' + (g.index + 1) + '</td><td>' + escapeHtml(q) + '</td><td><span class="flag-count">' + g.count + '</span></td><td>' + reasons + '</td><td>' + who + '</td>' +
            '<td><button type="button" class="secondary-btn" style="font-size:12px; padding:5px 10px;" onclick="resolveFlaggedQuestion(\'' + escapeHtml(code) + '\',' + g.index + ',' + (g.resolved ? 'false' : 'true') + ')">' + (g.resolved ? 'Reopen' : 'Mark resolved') + '</button></td></tr>';
    });
    host.innerHTML = html + '</tbody></table></div><div id="cmHostFlags" class="cm-host"></div></div>';
    cmRenderChartPanel('cmHostFlags', [
        { id: 'perq', label: 'Flags per question', data: function() { return { labels: groups.map(function(g) { return 'Q' + (g.index + 1); }), values: groups.map(function(g) { return g.count; }), unit: 'flags' }; } },
        { id: 'reason', label: 'Flags by reason', data: function() { var m = {}; flags.forEach(function(f) { var l = FLAG_CATEGORY_LABELS[f.category] || f.category; m[l] = (m[l] || 0) + 1; }); return { labels: Object.keys(m), values: Object.keys(m).map(function(k) { return m[k]; }), unit: 'flags' }; } }
    ]);
}

async function resolveFlaggedQuestion(code, questionIndex, resolved) {
    var token = localStorage.getItem('cleverment_teacher_token');
    try {
        await fetch(BACKEND_URL + '/api/teacher/assessments/' + encodeURIComponent(code) + '/flags/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ questionIndex: questionIndex, resolved: resolved })
        });
    } catch (e) {}
    renderFlaggedQuestions(code);
}

// Flag counts beside each question in Edit Assessment.
async function loadEditorFlagCounts() {
    if (!currentAssessmentBeingEdited || assessmentEditorDraftMode) return;
    var flags = await fetchAssessmentFlags(currentAssessmentBeingEdited.code);
    editorFlagCounts = {};
    flags.forEach(function(f) { var k = cbNormText(f.question_text); editorFlagCounts[k] = (editorFlagCounts[k] || 0) + 1; });
    applyEditorFlagBadges();
}

function applyEditorFlagBadges() {
    var list = document.getElementById('assessmentEditorList');
    if (!list || !currentAssessmentBeingEdited) return;
    var strongs = list.querySelectorAll('strong');
    Array.prototype.forEach.call(strongs, function(el) {
        var m = /^Question (\d+)$/.exec(el.textContent.trim());
        if (!m) return;
        var q = currentAssessmentBeingEdited.questions[Number(m[1]) - 1];
        var n = q ? (editorFlagCounts[cbNormText(q.question)] || 0) : 0;
        var old = el.nextSibling;
        if (old && old.classList && old.classList.contains('flag-badge')) old.remove();
        if (n > 0) {
            var b = document.createElement('span');
            b.className = 'flag-badge';
            b.textContent = '\u2691 ' + n + ' flag' + (n === 1 ? '' : 's');
            el.parentNode.insertBefore(b, el.nextSibling);
        }
    });
}



// ============================================================
// BACK / FORWARD BUTTONS + KEYBOARD SHORTCUTS
// ============================================================
var cmNavSuppress = false;

function cmVisible(id) {
    var el = document.getElementById(id);
    return !!el && el.style.display === 'block';
}

// Each dashboard section is a step in the browser history, so the device back button returns to the previous section.
function cmPushSection(dashboardId, panelId) {
    if (cmNavSuppress) return;
    var page = dashboardId === 'adminDashboard' ? 'admin-dashboard' : 'teacher-dashboard';
    var cur = window.history.state;
    if (cur && cur.page === page && cur.section === panelId) return;
    var isFirst = panelId === 'teacherOverviewPanel' || panelId === 'adminOverviewPanel';
    var url = window.location.pathname + '?page=' + page;
    if (cur && cur.page === page && !cur.section && isFirst) {
        window.history.replaceState({ page: page, section: panelId }, '', url);
    } else {
        window.history.pushState({ page: page, section: panelId }, '', url);
    }
    try { localStorage.setItem('cleverment_last_page', page); } catch (e) {}
}

function cmLeaveAssessmentNow() {
    try { syncStudentProgress(true); } catch (e) {}
    try { sessionStorage.setItem('cm_skip_restore_once', '1'); } catch (e) {}
    window.location.replace(window.location.pathname + '?page=student');
}

// If this device holds an unfinished attempt of the SAME assessment by the SAME student, resume it
// instead of starting again, so leaving and coming back can never reset the timer.
async function cmResumeSavedAttempt() {
    try {
        var raw = localStorage.getItem('cleverment_quiz_state');
        if (!raw) return false;
        var st = JSON.parse(raw);
        if (!st || st.currentAssessmentCode !== currentAssessmentCode) return false;
        var adm = String(studentAdmissionNumber || '').trim().toLowerCase();
        var savedAdm = String(st.studentAdmissionNumber || '').trim().toLowerCase();
        if (!adm || (savedAdm && savedAdm !== adm)) return false;
        return await restoreQuizState();
    } catch (e) { return false; }
}

function cmOnPopState(e) {
    var state = (e && e.state) || {};
    var page = state.page || getPageFromURL() || 'landing';
    var path = window.location.pathname;

    // During an assessment the back button asks first.
    if (typeof studentQuizIsOnScreen === 'function' && studentQuizIsOnScreen() && !studentIsTimeUp) {
        window.history.pushState({ page: 'student-assessment' }, '', path + '?page=student-assessment');
        if (confirm('Leave the assessment?\n\nYour timer keeps running. You can come back with the same link or code and carry on where you stopped.')) {
            cmLeaveAssessmentNow();
        }
        return;
    }

    cmNavSuppress = true;
    try {
        ['studentLoginPage', 'studentAreaPage', 'studentMenuOpen'].forEach(function(id) { var e0 = document.getElementById(id); if (e0) e0.style.display = 'none'; });
        var teacherIn = !!currentTeacher;
        var adminIn = false;
        try { adminIn = !!localStorage.getItem('cleverment_admin_token'); } catch (err) {}
        // Signed-in people go back to the Welcome page, not to a login form.
        if ((page === 'teacher' && teacherIn) || (page === 'admin' && adminIn)) {
            page = 'landing';
            window.history.replaceState({ page: 'landing' }, '', path + '?page=landing');
        }
        var resultsOpen = cmVisible('studentResultsSection') || cmVisible('studentCertificateSection');
        if (resultsOpen && (page === 'student' || page === 'student-assessment' || page === 'results')) {
            studentResetQuiz(); // finished assessment: back goes to the code page
            return;
        }
        if (page === 'student' && cmVisible('studentAssessmentView')) {
            backToStudentAccess();
            return;
        }
        if (page === 'student-assessment' && !currentAssessment) page = 'student';
        showPageFromURL(page);
        if (state.section && page === 'teacher-dashboard' && typeof showTeacherSection === 'function') showTeacherSection(state.section, null);
        if (state.section && page === 'admin-dashboard' && typeof showAdminSection === 'function') showAdminSection(state.section, null);
    } catch (err) {
        /* navigation must never throw at the person */
    } finally {
        cmNavSuppress = false;
    }
}
window.addEventListener('popstate', cmOnPopState);

// Keyboard (computers): A-D or 1-4 choose an option, P or left arrow = previous, N or right arrow = next.
function cmOnQuizKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (typeof studentQuizIsOnScreen !== 'function' || !studentQuizIsOnScreen() || studentIsTimeUp || studentFastWarningOpen) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    var ids = ['questionFlagOverlay', 'fastAnswerOverlay', 'proctorResumeOverlay'];
    for (var i = 0; i < ids.length; i++) {
        var o = document.getElementById(ids[i]);
        if (o && o.style.display && o.style.display !== 'none') return;
    }
    var key = String(e.key || '');
    var k = key.length === 1 ? key.toLowerCase() : key;
    var optionKeys = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
    if (optionKeys.hasOwnProperty(k)) {
        var q = studentQuestions[studentCurrentIndex];
        if (q && q.options && q.options[optionKeys[k]] !== undefined) { e.preventDefault(); studentSelectOption(optionKeys[k]); }
        return;
    }
    if (k === 'p' || k === 'ArrowLeft') { e.preventDefault(); studentPrevQuestion(); return; }
    if (k === 'n' || k === 'ArrowRight') { e.preventDefault(); studentNextQuestion(); }
}
document.addEventListener('keydown', cmOnQuizKey);



// ============================================================
// ADMIN: SECURITY PAGE
// ============================================================
async function loadAdminSecurity() {
    var box = document.getElementById('adminSecurityBox');
    if (!box) return;
    var token = localStorage.getItem('cleverment_admin_token');
    box.innerHTML = '<p class="helper-text">Checking...</p>';
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/security', { headers: { 'Authorization': 'Bearer ' + token } });
        var d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Could not load.');
        var html = '<div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 6px;">Two-step login</h4>';
        if (d.totpEnabled) {
            html += '<p style="margin:0;">&#10003; <b>On.</b> Logging in as admin needs your password and a 6-digit code from your authenticator app.</p>';
        } else {
            html += '<p class="helper-text" style="margin:0 0 8px;"><b>Off.</b> To turn it on:</p><ol class="helper-text" style="margin:0 0 8px 18px; padding:0;">' +
                '<li>Install an authenticator app (Google Authenticator, Microsoft Authenticator or Authy).</li>' +
                '<li>In the app choose "Enter a setup key" and type this key: <b style="user-select:all; font-size:15px; letter-spacing:1px;">' + escapeHtml(d.setup.secret) + '</b></li>' +
                '<li>In Render, open your backend service, then Environment, and add a variable named <b>ADMIN_TOTP_SECRET</b> with that same key. Save.</li>' +
                '<li>From then on, admin login also asks for the 6-digit code.</li></ol>' +
                '<p class="helper-text" style="margin:0;">Do the Render step soon: this page shows a new key each time until the variable is saved.</p>';
        }
        html += '</div><div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 6px;">Admin password</h4><p style="margin:0;">' +
            (d.weakPassword ? '&#9888; Your password is short. Use 12 or more characters (ADMIN_PASSWORD in Render).' : '&#10003; Length is good.') + '</p></div>';
        html += '<div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 6px;">Database lock check</h4>';
        if (!d.exposure.configured) {
            html += '<p class="helper-text" style="margin:0;">To run this check, add a variable named <b>SUPABASE_ANON_KEY</b> in Render (the public "anon" key from Supabase, Project Settings, API). Then tap Refresh.</p>';
        } else {
            html += d.exposure.tables.map(function(t) {
                var ok = t.status === 'protected';
                return '<p style="margin:2px 0;">' + (ok ? '&#10003; Protected' : (t.status === 'exposed' ? '&#9888; <b>EXPOSED</b>' : '? Could not check')) + ' &mdash; ' + escapeHtml(t.table.replace('cleverment_', '')) + '</p>';
            }).join('');
            if (d.exposure.tables.some(function(t) { return t.status === 'exposed'; })) {
                html += '<p class="helper-text" style="margin:8px 0 0;color:#b4232f;">Run supabase_lockdown.sql in Supabase (SQL Editor) to lock these down.</p>';
            }
        }
        box.innerHTML = html + '</div><div class="flag-box" id="adminBackupBox" style="border-color:#cfe1ff;"><h4 style="margin:0 0 6px;">Backups</h4><p class="helper-text">Loading...</p></div>';
        loadAdminBackups();
    } catch (e) {
        box.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message || 'Could not load.') + '</p>';
    }
}



// ============================================================
// DELIVERY A: mark for review, summary before submit, offline-safe submit
// ============================================================
var studentReviewMarks = {};
var studentReviewFor = '';
function studentReviewKey() { return 'cleverment_review_' + currentAssessmentCode + '_' + String(studentAdmissionNumber || '').toLowerCase(); }
function studentLoadReviewIfNeeded() {
    var k = studentReviewKey();
    if (studentReviewFor === k) return;
    studentReviewFor = k;
    try { studentReviewMarks = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { studentReviewMarks = {}; }
}
function cmApplyReviewMarks() {
    studentLoadReviewIfNeeded();
    for (var i = 0; i < studentQuestions.length; i++) {
        var box = document.getElementById('student-qbox-' + i);
        if (box) box.classList.toggle('review', !!studentReviewMarks[studentQuestions[i].originalIndex]);
    }
}
function studentUpdateReviewButton() {
    var btn = document.getElementById('studentReviewBtn');
    var q = studentQuestions[studentCurrentIndex];
    if (!btn || !q) return;
    studentLoadReviewIfNeeded();
    var on = !!studentReviewMarks[q.originalIndex];
    btn.classList.toggle('marked', on);
    var span = btn.querySelector('span');
    if (span) span.textContent = on ? 'Marked for review' : 'Mark for review';
    cmApplyReviewMarks();
}
function studentToggleReview() {
    var q = studentQuestions[studentCurrentIndex];
    if (!q) return;
    studentLoadReviewIfNeeded();
    if (studentReviewMarks[q.originalIndex]) delete studentReviewMarks[q.originalIndex]; else studentReviewMarks[q.originalIndex] = true;
    try { localStorage.setItem(studentReviewKey(), JSON.stringify(studentReviewMarks)); } catch (e) {}
    studentUpdateReviewButton();
}
var __cmOrigBoxes = studentUpdateQuestionBoxes;
studentUpdateQuestionBoxes = function() { __cmOrigBoxes(); cmApplyReviewMarks(); };

function studentJumpTo(i) {
    closeSubmitReview();
    studentCurrentIndex = i;
    studentDisplayQuestion();
    studentUpdateQuestionBoxes();
    try { saveQuizState(); } catch (e) {}
}
function closeSubmitReview() {
    var o = document.getElementById('submitReviewOverlay');
    if (o) o.style.display = 'none';
}
// Submit button: show a quick summary first when something is unanswered or marked for review.
function studentRequestSubmit() {
    studentLoadReviewIfNeeded();
    var unanswered = [], marked = [];
    studentQuestions.forEach(function(q, i) {
        if (studentAnswers[i] === null) unanswered.push(i);
        if (studentReviewMarks[q.originalIndex]) marked.push(i);
    });
    if (!unanswered.length && !marked.length) { studentSubmitQuiz(); return; }
    function chips(list) { return list.map(function(i) { return '<button type="button" class="review-chip" onclick="studentJumpTo(' + i + ')">' + (i + 1) + '</button>'; }).join(''); }
    var html = '<p style="margin:0 0 10px;"><b>' + (studentQuestions.length - unanswered.length) + '</b> of <b>' + studentQuestions.length + '</b> questions answered.</p>';
    if (unanswered.length) html += '<p class="helper-text" style="margin:8px 0 4px;">Not answered (tap to go there):</p><div>' + chips(unanswered) + '</div>';
    if (marked.length) html += '<p class="helper-text" style="margin:10px 0 4px;">Marked for review:</p><div>' + chips(marked) + '</div>';
    document.getElementById('submitReviewBody').innerHTML = html;
    document.getElementById('submitReviewOverlay').style.display = 'flex';
}

// If the network drops while submitting, keep the answers safe, say so, and keep trying.
var cmOfflineSubmitTimer = null;
var cmOfflineSubmitTries = 0;
function cmScheduleOfflineSubmit() {
    if (cmOfflineSubmitTries >= 60) {
        cmOfflineSubmitTries = 0;
        hideConnectBanner();
        alert('Still no connection. Your answers are saved on this phone. Please connect to the internet and tap Submit again.');
        return;
    }
    cmOfflineSubmitTries++;
    showConnectBanner('No network. Your answers are saved on this phone and will be sent automatically when the connection returns. Please keep this page open.');
    if (cmOfflineSubmitTimer) clearTimeout(cmOfflineSubmitTimer);
    cmOfflineSubmitTimer = setTimeout(function() { cmOfflineSubmitTimer = null; studentSubmitQuiz(); }, 10000);
}
function cmClearOfflineSubmit() {
    if (cmOfflineSubmitTimer) clearTimeout(cmOfflineSubmitTimer);
    cmOfflineSubmitTimer = null;
    cmOfflineSubmitTries = 0;
    hideConnectBanner();
}
window.addEventListener('online', function() {
    if (cmOfflineSubmitTimer) { clearTimeout(cmOfflineSubmitTimer); cmOfflineSubmitTimer = null; studentSubmitQuiz(); }
});

// ---------- admin: backups card (Security page) ----------
function cmBackupLabel(name) {
    var m = name.match(/^backup-(\d{4})-(\d\d)-(\d\d)-(\d\d)-(\d\d)/);
    if (!m) return name;
    return new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5])).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
async function loadAdminBackups() {
    var box = document.getElementById('adminBackupBox');
    if (!box) return;
    var token = localStorage.getItem('cleverment_admin_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/backups', { headers: { 'Authorization': 'Bearer ' + token } });
        var d = await res.json();
        var list = d.backups || [];
        var html = '<h4 style="margin:0 0 6px;">Backups</h4><p class="helper-text" style="margin:0 0 8px;">The server saves a private backup every week and keeps the newest 8. Old logs and sessions are cleaned up automatically.</p>' +
            '<button type="button" class="primary-btn" id="backupNowBtn" onclick="runAdminBackupNow()">Back up now</button><p id="backupNowStatus" class="helper-text" style="margin:8px 0;"></p>';
        if (!list.length) html += '<p class="helper-text">No backup yet. The first one is made automatically soon after the server starts, or tap Back up now.</p>';
        list.forEach(function(b) {
            html += '<div class="prog-bar-row"><div class="prog-bar-label" style="flex-basis:60%;">' + escapeHtml(cmBackupLabel(b.name)) + (b.size ? ' &middot; ' + (b.size > 1048576 ? (b.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b.size / 1024)) + ' KB') : '') + '</div>' +
                '<button type="button" class="secondary-btn" style="font-size:12px; padding:5px 10px;" data-name="' + escapeHtml(b.name) + '" onclick="downloadAdminBackup(this.getAttribute(\'data-name\'))">Download</button></div>';
        });
        box.innerHTML = html;
    } catch (e) {
        box.innerHTML = '<h4 style="margin:0 0 6px;">Backups</h4><p class="helper-text" style="color:#dc3545;">Could not load backups.</p>';
    }
}
async function runAdminBackupNow() {
    var btn = document.getElementById('backupNowBtn'), st = document.getElementById('backupNowStatus');
    var token = localStorage.getItem('cleverment_admin_token');
    btn.disabled = true; st.textContent = 'Backing up... this can take a minute.';
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/backups/run', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
        var d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Backup failed.');
        await loadAdminBackups();
        var st2 = document.getElementById('backupNowStatus'); if (st2) st2.textContent = 'Backup saved.';
    } catch (e) {
        st.textContent = e.message; btn.disabled = false;
    }
}
async function downloadAdminBackup(name) {
    var token = localStorage.getItem('cleverment_admin_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/backups/url?name=' + encodeURIComponent(name), { headers: { 'Authorization': 'Bearer ' + token } });
        var d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Could not prepare the download.');
        window.open(d.url, '_blank');
    } catch (e) { alert(e.message); }
}



// ============================================================
// DELIVERY B: grades, report cards, parent WhatsApp, question quality, Excel
// ============================================================
// Simple letter grades by percentage.
function cmGradeFor(pct) {
    pct = Number(pct) || 0;
    if (pct >= 70) return { g: 'A', remark: 'Excellent' };
    if (pct >= 60) return { g: 'B', remark: 'Very good' };
    if (pct >= 50) return { g: 'C', remark: 'Good' };
    if (pct >= 45) return { g: 'D', remark: 'Fair' };
    if (pct >= 40) return { g: 'E', remark: 'Weak pass' };
    return { g: 'F', remark: 'Needs urgent attention' };
}

function cmPhoneForWhatsApp(raw) {
    var d = String(raw || '').replace(/[^0-9]/g, '');
    if (d.length === 11 && d.charAt(0) === '0') d = '234' + d.slice(1);   // Nigerian numbers written 0803...
    return d.length >= 10 && d.length <= 15 ? d : '';
}

function cmReportLines(student, data, className) {
    var g = cmGradeFor(student.average);
    var lines = [];
    data.subjects.forEach(function(s) {
        var v = student.cells[s.key];
        if (v !== null && v !== undefined) lines.push([s.label, v + '%', cmGradeFor(v).g, cmGradeFor(v).remark]);
    });
    return { lines: lines, grade: g };
}

async function posRosterPhones(className) {
    var email = currentTeacher ? currentTeacher.email : 'unknown';
    var roster = await getRosterForClass(email, className);
    var map = {};
    (roster || []).forEach(function(e) { if (e.parentPhone) map[rosterKey(e.admissionNumber)] = e.parentPhone; });
    return map;
}

async function posWhatsAppParent(rowIndex) {
    var b = posState.broad;
    if (!b || !b.data.rows[rowIndex]) return;
    var st = b.data.rows[rowIndex];
    var phones = await posRosterPhones(b.className);
    var phone = cmPhoneForWhatsApp(phones[rosterKey(st.admission)]);
    if (!phone) { alert('No parent phone number is saved for ' + st.name + '. Add it in Class Roster (the "Parent phone" box), then try again.'); return; }
    var rep = cmReportLines(st, b.data, b.className);
    var text = '\uD83D\uDCD8 *Result report* - ' + st.name + ' (' + b.className + ')\n' +
        'Average: *' + st.average + '%* - Grade *' + rep.grade.g + '* (' + rep.grade.remark + ')\n' +
        'Position: ' + posOrdinal(st.position) + ' of ' + b.data.classSize + '\n' +
        rep.lines.map(function(l) { return '\u2022 ' + l[0] + ': ' + l[1] + ' (' + l[2] + ')'; }).join('\n') + '\n' +
        'From ' + (currentTeacher && currentTeacher.name ? currentTeacher.name : 'your child\'s teacher') + ' via CleverMent';
    var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
    var win = window.open(url, '_blank');
    if (!win) window.location.href = url;
}

// One report card PDF per student, bundled in a ZIP.
async function posDownloadReportCards() {
    var b = posState.broad;
    if (!b || b.data.rows.length === 0) { alert('Choose a class that has results first.'); return; }
    if (typeof JSZip === 'undefined') { alert('The ZIP tool did not load. Please check your internet connection and refresh.'); return; }
    var zip = new JSZip(), used = {}, teacher = currentTeacher && currentTeacher.name ? currentTeacher.name : '';
    try {
        b.data.rows.forEach(function(st) {
            var rep = cmReportLines(st, b.data, b.className);
            var pdf = pdfBuildTable({
                orientation: 'portrait',
                title: 'Student Report Card',
                lines: ['Student: ' + st.name + (st.admission ? '   |   Admission No.: ' + st.admission : '') + '   |   Class: ' + b.className,
                        'Position: ' + posOrdinal(st.position) + ' of ' + b.data.classSize + '   |   Average: ' + st.average + '%   |   Overall grade: ' + rep.grade.g + ' (' + rep.grade.remark + ')',
                        (teacher ? 'Teacher: ' + teacher + '   |   ' : '') + 'Date: ' + posTodayLabel()],
                headers: ['Subject', 'Score', 'Grade', 'Remark'],
                weights: [40, 14, 12, 34],
                align: ['left', 'center', 'center', 'left'],
                rows: rep.lines,
                footerRows: [['Average', st.average + '%', rep.grade.g, rep.grade.remark]]
            });
            var base = 'Report-' + backupSafeName(st.name + (st.admission ? '-' + st.admission : ''));
            var name = base + '.pdf', n = 2;
            while (used[name]) { name = base + '-' + n + '.pdf'; n++; }
            used[name] = true;
            zip.file(name, pdf.output('arraybuffer'));
        });
        var blob = await zip.generateAsync({ type: 'blob' });
        posDownloadBlob(blob, 'Report-cards-' + backupSafeName(b.className) + '.zip');
    } catch (e) {
        alert('Could not create the report cards: ' + e.message);
    }
}

// ---------- Excel ----------
function cmDownloadXlsx(fileName, header, rows) {
    if (typeof XLSX === 'undefined') { alert('The Excel tool did not load. Please check your internet connection and refresh.'); return; }
    var sheet = XLSX.utils.aoa_to_sheet([header].concat(rows));
    sheet['!cols'] = header.map(function(h, i) {
        var w = String(h).length;
        rows.forEach(function(r) { w = Math.max(w, String(r[i] === undefined || r[i] === null ? '' : r[i]).length); });
        return { wch: Math.min(40, w + 2) };
    });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'CleverMent');
    XLSX.writeFile(wb, fileName);
}
function teacherExportResultsXlsx() {
    var filtered = getTeacherFilteredResults();
    if (filtered.length === 0) { alert('No results to export.'); return; }
    cmDownloadXlsx('CleverMent-results-' + new Date().toISOString().slice(0, 10) + '.xlsx',
        ['Class', 'Student', 'Admission No.', 'Subject', 'Score %', 'Grade', 'Correct', 'Total', 'Time Taken', 'Tab Switches', 'Cam/Noise Flags', 'Fast Answer Warnings', 'Date'],
        filtered.map(function(r) { return [r.className, r.studentName, r.admissionNumber || '', r.subject, Number(r.score), cmGradeFor(r.score).g, r.correctAnswers, r.totalQuestions, r.timeTaken, r.tabSwitches || 0, r.proctorViolations || 0, r.fastAnswerWarnings || 0, r.date]; }));
}
function posExportSubjectXlsx() {
    if (!posState.subject) { alert('Choose an assessment that has results first.'); return; }
    var a = posState.subject.assessment, d = posState.subject.data;
    cmDownloadXlsx('Positions-' + backupSafeName(a.subject + '-' + a.className) + '.xlsx', ['Position', 'Student', 'Admission No.', 'Score %', 'Grade', 'Correct', 'Total', 'Remark'],
        d.rows.map(function(r) { return [posOrdinal(r.position), r.name, r.admission, r.score, cmGradeFor(r.score).g, r.correct, r.total, r.score >= r.passMark ? 'Pass' : 'Fail']; }));
}
function posExportBroadsheetXlsx() {
    if (!posState.broad || posState.broad.data.rows.length === 0) { alert('Choose a class that has results first.'); return; }
    var t = posBroadsheetTable();
    cmDownloadXlsx('Broadsheet-' + backupSafeName(posState.broad.className) + '.xlsx', t.headers, t.rows.concat(t.footer));
}

// ---------- Question quality report ----------
// For each question: % who got it right, and how well it separates strong from weak students
// (top 27% of students vs bottom 27%).
function cmQuestionQuality(results) {
    var n = results.length;
    var sorted = results.slice().sort(function(a, b) { return (Number(b.score) || 0) - (Number(a.score) || 0); });
    var k = Math.max(1, Math.floor(n * 0.27));
    var top = sorted.slice(0, k), bottom = sorted.slice(n - k);
    var count = 0;
    results.forEach(function(r) { count = Math.max(count, (r.qCorrect || []).length); });
    var out = [];
    for (var i = 0; i < count; i++) {
        var right = 0, tr = 0, br = 0;
        results.forEach(function(r) { if (r.qCorrect && r.qCorrect[i]) right++; });
        top.forEach(function(r) { if (r.qCorrect && r.qCorrect[i]) tr++; });
        bottom.forEach(function(r) { if (r.qCorrect && r.qCorrect[i]) br++; });
        var p = right / n, d = (tr - br) / k;
        var verdict = 'Good question', level = 'good';
        if (n >= 10 && d < 0) { verdict = 'Check the answer key: weaker students did better than strong ones'; level = 'bad'; }
        else if (p < 0.2) { verdict = 'Very hard'; level = 'warn'; }
        else if (p > 0.9) { verdict = 'Very easy'; level = 'warn'; }
        else if (n >= 10 && d < 0.1) { verdict = 'Does not separate strong from weak students'; level = 'warn'; }
        out.push({ index: i, percent: Math.round(p * 100), discrimination: Math.round(d * 100) / 100, verdict: verdict, level: level });
    }
    return out;
}

async function renderQuestionQuality(code) {
    var host = document.getElementById('qualityReportHost');
    if (!host) return;
    if (!code) { host.innerHTML = ''; return; }
    try { await ensureTeacherDataForReports(); } catch (e) {}
    var assessment = (teacherAssessmentsCache || []).filter(function(a) { return a.code === code; })[0];
    var results = (teacherResultsCache || []).filter(function(r) { return r.assessmentCode === code && Array.isArray(r.qCorrect) && r.qCorrect.length > 0; });
    if (!assessment) { host.innerHTML = ''; return; }
    var title = '<h4 style="margin:0 0 4px;">Question quality report</h4>';
    if (assessment.questionLimit > 0) { host.innerHTML = '<div class="flag-box" style="border-color:#cfe1ff;">' + title + '<p class="helper-text" style="margin:0;">Not available for assessments that give each student a random selection of questions.</p></div>'; return; }
    if (results.length < 5) { host.innerHTML = '<div class="flag-box" style="border-color:#cfe1ff;">' + title + '<p class="helper-text" style="margin:0;">Needs at least 5 submitted results (this one has ' + results.length + ').</p></div>'; return; }
    var q = cmQuestionQuality(results);
    var html = '<div class="flag-box" style="border-color:#cfe1ff;">' + title + '<p class="helper-text" style="margin:0 0 8px;">Based on ' + results.length + ' students. "Separates" compares the top and bottom 27% of students: closer to 1 is better.</p>' +
        '<div class="scrollable-panel"><table class="pos-table"><thead><tr><th>Q</th><th>Question</th><th>% right</th><th>Separates</th><th>Verdict</th></tr></thead><tbody>';
    q.forEach(function(x) {
        var text = assessment.questions && assessment.questions[x.index] ? String(assessment.questions[x.index].question || '') : '';
        if (text.length > 70) text = text.slice(0, 70) + '...';
        html += '<tr><td>' + (x.index + 1) + '</td><td>' + escapeHtml(text) + '</td><td><strong>' + x.percent + '%</strong></td><td>' + x.discrimination + '</td><td><span class="quality-' + x.level + '">' + escapeHtml(x.verdict) + '</span></td></tr>';
    });
    host.innerHTML = html + '</tbody></table></div></div>';
}



// ============================================================
// SCHOOLS (branding, school panel, platform-admin schools page)
// ============================================================
var cmSchoolCache = {};

function cmApplySchoolBrand(school) {
    var bar = document.getElementById('schoolBrandBar');
    if (!school) { cmClearSchoolBrand(); return; }
    window.cmActiveSchool = school;
    document.documentElement.style.setProperty('--cm-primary', school.primaryColor || '#2d6cdf');
    document.documentElement.style.setProperty('--cm-accent', school.accentColor || '#C9A84C');
    document.body.classList.add('school-branded');
    var hl = document.getElementById('schoolHeaderLogo');
    if (hl) {
        if (school.logo) { hl.src = school.logo; hl.style.display = 'block'; }
        else { hl.removeAttribute('src'); hl.style.display = 'none'; }
    }
    if (bar) {
        bar.innerHTML = (school.logo ? '<img src="' + school.logo + '" alt="">' : '') + '<span>' + escapeHtml(school.name) + '</span>';
        bar.style.display = 'flex';
    }
}
function cmClearSchoolBrand() {
    window.cmActiveSchool = null;
    document.documentElement.style.removeProperty('--cm-primary');
    document.documentElement.style.removeProperty('--cm-accent');
    document.body.classList.remove('school-branded');
    var hl2 = document.getElementById('schoolHeaderLogo');
    if (hl2) { hl2.removeAttribute('src'); hl2.style.display = 'none'; }
    var bar = document.getElementById('schoolBrandBar');
    if (bar) { bar.style.display = 'none'; bar.innerHTML = ''; }
}

// Student side: the school of the teacher who published the assessment.
async function cmLoadSchoolForAssessment(code) {
    if (!code) return;
    var key = 'a:' + String(code).toUpperCase();
    if (cmSchoolCache.hasOwnProperty(key)) { cmApplySchoolBrand(cmSchoolCache[key]); return; }
    try {
        var res = await fetch(BACKEND_URL + '/api/school/for-assessment?code=' + encodeURIComponent(code));
        var data = await res.json();
        cmSchoolCache[key] = data.school || null;
        cmApplySchoolBrand(cmSchoolCache[key]);
    } catch (e) { /* branding is a bonus */ }
}
// Dedicated school link: https://your-site/?school=oakwood
async function cmLoadSchoolBySlug(slug) {
    if (!slug) return;
    try {
        var res = await fetch(BACKEND_URL + '/api/school/public?slug=' + encodeURIComponent(slug));
        var data = await res.json();
        if (data.school) {
            try { sessionStorage.setItem('cm_school_slug', slug); } catch (e) {}
            cmApplySchoolBrand(data.school);
            document.body.classList.add('school-link');
        }
    } catch (e) {}
}
(function cmInitSchoolLink() {
    var slug = '';
    try { slug = new URLSearchParams(window.location.search).get('school') || ''; } catch (e) {}
    if (!slug) { try { slug = sessionStorage.getItem('cm_school_slug') || ''; } catch (e) {} }
    if (slug) cmLoadSchoolBySlug(slug);
})();

// Teacher side: my school (shows the School menu to school admins and heads).
var cmMySchoolInfo = null;
async function cmLoadMySchool() {
    var token = localStorage.getItem('cleverment_teacher_token');
    var nav = document.querySelector('#teacherDashboard [data-target="schoolSection"]');
    if (nav) nav.style.display = 'none';
    if (!token) return;
    try {
        var res = await fetch(BACKEND_URL + '/api/school/me', { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) { cmMySchoolInfo = null; return; }
        var d = await res.json();
        cmMySchoolInfo = d.school ? d : null;
        if (d.school) {
            cmApplySchoolBrand(d.school);
            if (nav && (d.role === 'admin' || d.role === 'head')) nav.style.display = '';
        } else if (window.cmActiveSchool) {
            cmClearSchoolBrand();
        }
    } catch (e) {}
}

function cmSchoolLink(slug) { return window.location.origin + window.location.pathname + '?school=' + encodeURIComponent(slug); }
function cmCopyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function() { alert('Copied.'); }, function() { prompt('Copy this link:', text); });
    else prompt('Copy this link:', text);
}

async function loadSchoolPanel() {
    var box = document.getElementById('schoolBox');
    if (!box) return;
    var token = localStorage.getItem('cleverment_teacher_token');
    box.innerHTML = '<p class="helper-text">Loading...</p>';
    try {
        var res = await fetch(BACKEND_URL + '/api/school/me', { headers: { 'Authorization': 'Bearer ' + token } });
        var d = await res.json();
        if (!res.ok || !d.school) { box.innerHTML = '<p class="helper-text">You are not part of a school.</p>'; return; }
        cmMySchoolInfo = d;
        var sc = d.school, isAdmin = d.role === 'admin';
        var link = cmSchoolLink(sc.slug);
        var html = '<div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 6px;">' + escapeHtml(sc.name) + '</h4>' +
            '<p class="helper-text" style="margin:0 0 6px;">Your role: <b>' + (isAdmin ? 'School admin' : 'Head teacher (view results)') + '</b></p>' +
            '<p class="helper-text" style="margin:0 0 6px;">Link for your students (shows your school\'s name, logo and colours):</p>' +
            '<p style="margin:0 0 8px; word-break:break-all; user-select:all;"><b>' + escapeHtml(link) + '</b></p>' +
            '<button type="button" class="secondary-btn" onclick="cmCopyText(\'' + escapeHtml(link) + '\')">Copy link</button> ' +
            '<button type="button" class="secondary-btn whatsapp-share-btn" onclick="window.open(\'https://wa.me/?text=\' + encodeURIComponent(\'Open ' + escapeHtml(sc.name).replace(/'/g, '') + ' on CleverMent: ' + escapeHtml(link) + '\'), \'_blank\')">Share on WhatsApp</button></div>';
        if (isAdmin) {
            html += '<div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 8px;">Branding</h4>' +
                '<label class="live-msg-label" for="schoolNameInput">School name</label><input id="schoolNameInput" class="form-input" value="' + escapeHtml(sc.name) + '">' +
                '<div class="pos-selects" style="margin-top:8px;"><div><label class="live-msg-label" for="schoolPrimary">Main colour</label><input type="color" id="schoolPrimary" value="' + escapeHtml(sc.primaryColor) + '" style="width:100%;height:42px;"></div>' +
                '<div><label class="live-msg-label" for="schoolAccent">Second colour</label><input type="color" id="schoolAccent" value="' + escapeHtml(sc.accentColor) + '" style="width:100%;height:42px;"></div></div>' +
                '<label class="live-msg-label" for="schoolLogoFile" style="margin-top:8px;">Logo ' + (sc.logo ? '(a logo is saved; choose a file to replace it)' : '') + '</label><input type="file" id="schoolLogoFile" accept="image/*" class="form-input">' +
                '<p id="schoolBrandStatus" class="helper-text" style="margin:8px 0 0;"></p>' +
                '<button type="button" class="primary-btn" style="margin-top:8px;" onclick="saveSchoolBranding()">Save branding</button></div>';
        }
        html += '<div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 8px;">Teachers (' + d.teachers.length + ')</h4>';
        d.teachers.forEach(function(t) {
            html += '<div class="prog-bar-row"><div class="prog-bar-label" style="flex-basis:70%;"><b>' + escapeHtml(t.name) + '</b> <span class="helper-text">' + escapeHtml(t.email) + ' &middot; ' + escapeHtml(t.role) + (t.lastLogin ? ' &middot; last login ' + escapeHtml(cmAgo(t.lastLogin)) : '') + '</span></div>' +
                (isAdmin && t.role !== 'admin' ? '<button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;background:#dc3545;color:#fff;" data-email="' + escapeHtml(t.email) + '" onclick="removeSchoolTeacher(this.getAttribute(\'data-email\'))">Remove</button>' : '') + '</div>';
        });
        if (isAdmin) {
            html += '<h4 style="margin:14px 0 6px;">Add a teacher</h4><p class="helper-text" style="margin:0 0 6px;">If they already have a CleverMent account, just enter their email. Otherwise also enter a name and a password (8+ characters) to create one.</p>' +
                '<input id="schoolAddEmail" class="form-input" placeholder="Teacher email" style="margin-bottom:6px;"><input id="schoolAddName" class="form-input" placeholder="Name (new accounts only)" style="margin-bottom:6px;"><input id="schoolAddPass" type="text" class="form-input" placeholder="Password (new accounts only)" style="margin-bottom:6px;">' +
                '<select id="schoolAddRole" class="form-input" style="margin-bottom:8px;"><option value="teacher">Teacher</option><option value="head">Head teacher (can view all school results)</option></select>' +
                '<p id="schoolAddStatus" class="helper-text"></p><button type="button" class="primary-btn" onclick="addSchoolTeacher()">Add to school</button>';
        }
        html += '</div><div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 6px;">School results</h4><div id="cmHostSchool" class="cm-host"></div></div>';
        box.innerHTML = html;
        // charts of the whole school's results
        try {
            var rr = await fetch(BACKEND_URL + '/api/school/results', { headers: { 'Authorization': 'Bearer ' + token } });
            var rd = await rr.json();
            var rows = (rd.results || []).map(normalizeResultRow);
            var withMarks = await attachPassMarks(rows, true);
            cmRenderChartPanel('cmHostSchool', withMarks.length ? cmResultSources(withMarks, { admin: true }) : []);
        } catch (e) {}
    } catch (e) {
        box.innerHTML = '<p class="helper-text" style="color:#dc3545;">Could not load your school.</p>';
    }
}
async function saveSchoolBranding() {
    var token = localStorage.getItem('cleverment_teacher_token');
    var st = document.getElementById('schoolBrandStatus');
    var body = { name: document.getElementById('schoolNameInput').value, primaryColor: document.getElementById('schoolPrimary').value, accentColor: document.getElementById('schoolAccent').value };
    var file = document.getElementById('schoolLogoFile').files[0];
    try {
        if (file) body.logo = await prepareSignatureImage(file);
        st.textContent = 'Saving...';
        var res = await fetch(BACKEND_URL + '/api/school/branding', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(body) });
        var d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Could not save.');
        cmApplySchoolBrand(d.school);
        st.textContent = 'Saved.';
        loadSchoolPanel();
    } catch (e) { st.style.color = '#dc3545'; st.textContent = e.message; }
}
async function addSchoolTeacher() {
    var token = localStorage.getItem('cleverment_teacher_token');
    var st = document.getElementById('schoolAddStatus');
    st.style.color = '#6b7a8f'; st.textContent = 'Adding...';
    try {
        var res = await fetch(BACKEND_URL + '/api/school/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ email: document.getElementById('schoolAddEmail').value, name: document.getElementById('schoolAddName').value, password: document.getElementById('schoolAddPass').value, role: document.getElementById('schoolAddRole').value }) });
        var d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Could not add.');
        loadSchoolPanel();
    } catch (e) { st.style.color = '#dc3545'; st.textContent = e.message; }
}
async function removeSchoolTeacher(email) {
    if (!confirm('Remove ' + email + ' from the school? Their account and results stay; they become an independent teacher.')) return;
    var token = localStorage.getItem('cleverment_teacher_token');
    try { await fetch(BACKEND_URL + '/api/school/teachers/remove', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ email: email }) }); } catch (e) {}
    loadSchoolPanel();
}

// ---------- platform admin ----------
async function loadAdminSchools() {
    var box = document.getElementById('adminSchoolsBox');
    if (!box) return;
    var token = localStorage.getItem('cleverment_admin_token');
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/schools', { headers: { 'Authorization': 'Bearer ' + token } });
        var d = await res.json();
        var html = '<div class="flag-box" style="border-color:#cfe1ff;"><h4 style="margin:0 0 8px;">Create a school</h4>' + (d.setupNeeded ? '<p class="helper-text" style="color:#b4232f;">Run supabase_schools.sql in Supabase first.</p>' : '') +
            '<input id="newSchoolName" class="form-input" placeholder="School name" style="margin-bottom:6px;"><input id="newSchoolSlug" class="form-input" placeholder="Link name, e.g. oakwood (letters and numbers)" style="margin-bottom:6px;">' +
            '<div class="pos-selects"><div><label class="live-msg-label">Main colour</label><input type="color" id="newSchoolPrimary" value="#2d6cdf" style="width:100%;height:42px;"></div><div><label class="live-msg-label">Second colour</label><input type="color" id="newSchoolAccent" value="#C9A84C" style="width:100%;height:42px;"></div></div>' +
            '<label class="live-msg-label" style="margin-top:8px;">Logo (optional)</label><input type="file" id="newSchoolLogo" accept="image/*" class="form-input">' +
            '<h4 style="margin:12px 0 6px;">School admin</h4><input id="newSchoolAdminEmail" class="form-input" placeholder="School admin email" style="margin-bottom:6px;"><input id="newSchoolAdminName" class="form-input" placeholder="Name (if a new account)" style="margin-bottom:6px;"><input id="newSchoolAdminPass" class="form-input" placeholder="Password (new accounts, 8+ characters)" style="margin-bottom:8px;">' +
            '<p id="newSchoolStatus" class="helper-text"></p><button type="button" class="primary-btn" onclick="createSchoolAdminPanel()">Create school</button></div>';
        (d.schools || []).forEach(function(sc) {
            html += '<div class="flag-box" style="border-color:' + (sc.active ? '#cfe1ff' : '#f3b5ba') + ';">' +
                '<div style="display:flex;align-items:center;gap:10px;">' + (sc.logo ? '<img src="' + sc.logo + '" alt="" style="height:38px;max-width:90px;object-fit:contain;">' : '') + '<h4 style="margin:0;flex:1;">' + escapeHtml(sc.name) + (sc.active ? '' : ' <span style="color:#b4232f;">(inactive)</span>') + '</h4>' +
                '<span style="width:18px;height:18px;border-radius:50%;background:' + escapeHtml(sc.primaryColor) + ';display:inline-block;"></span><span style="width:18px;height:18px;border-radius:50%;background:' + escapeHtml(sc.accentColor) + ';display:inline-block;"></span></div>' +
                '<p class="helper-text" style="margin:6px 0; word-break:break-all;">Student link: <b>' + escapeHtml(cmSchoolLink(sc.slug)) + '</b></p>' +
                '<p class="helper-text" style="margin:0 0 6px;">' + sc.members.map(function(m) { return escapeHtml(m.name) + ' (' + escapeHtml(m.role) + ')'; }).join(', ') + '</p>' +
                '<button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;" onclick="toggleSchoolActive(' + sc.id + ',' + (sc.active ? 'false' : 'true') + ')">' + (sc.active ? 'Deactivate' : 'Activate') + '</button> ' +
                '<button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;" onclick="addSchoolMemberAdmin(' + sc.id + ')">Add teacher</button></div>';
        });
        box.innerHTML = html;
    } catch (e) { box.innerHTML = '<p class="helper-text" style="color:#dc3545;">Could not load schools.</p>'; }
}
async function createSchoolAdminPanel() {
    var token = localStorage.getItem('cleverment_admin_token'), st = document.getElementById('newSchoolStatus');
    var body = { name: document.getElementById('newSchoolName').value, slug: document.getElementById('newSchoolSlug').value, primaryColor: document.getElementById('newSchoolPrimary').value, accentColor: document.getElementById('newSchoolAccent').value,
        adminEmail: document.getElementById('newSchoolAdminEmail').value, adminName: document.getElementById('newSchoolAdminName').value, adminPassword: document.getElementById('newSchoolAdminPass').value };
    try {
        var f = document.getElementById('newSchoolLogo').files[0];
        if (f) body.logo = await prepareSignatureImage(f);
        st.style.color = '#6b7a8f'; st.textContent = 'Creating...';
        var res = await fetch(BACKEND_URL + '/api/admin/schools', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(body) });
        var d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Could not create the school.');
        loadAdminSchools();
    } catch (e) { st.style.color = '#dc3545'; st.textContent = e.message; }
}
async function toggleSchoolActive(id, active) {
    var token = localStorage.getItem('cleverment_admin_token');
    try { await fetch(BACKEND_URL + '/api/admin/schools/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ active: active }) }); } catch (e) {}
    loadAdminSchools();
}
async function addSchoolMemberAdmin(id) {
    var email = prompt('Teacher email:'); if (!email) return;
    var role = (prompt('Role: type teacher, head or admin', 'teacher') || 'teacher').trim().toLowerCase();
    var name = '', pass = '';
    var token = localStorage.getItem('cleverment_admin_token');
    async function send() {
        var res = await fetch(BACKEND_URL + '/api/admin/schools/' + id + '/members', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ email: email, role: role, name: name, password: pass }) });
        return { ok: res.ok, d: await res.json() };
    }
    var r = await send();
    if (!r.ok && /no CleverMent account/.test(r.d.error || '')) {
        name = prompt('New account. Teacher name:') || ''; pass = prompt('Password (8+ characters):') || '';
        r = await send();
    }
    if (!r.ok) alert(r.d.error || 'Could not add.');
    loadAdminSchools();
}



// ============================================================
// STUDENT ACCOUNTS: log in with name + PIN, student home, To do / Done
// ============================================================
// Students' requests to the quiz API carry their login, so roster-only assessments can be opened.
(function cmStudentAuthFetch() {
    var orig = window.fetch.bind(window);
    window.fetch = function(url, opts) {
        try {
            if (typeof url === 'string' && url.indexOf(BACKEND_URL + '/api/quiz/') === 0) {
                var t = localStorage.getItem('cleverment_student_token');
                if (t) {
                    opts = Object.assign({}, opts || {});
                    opts.headers = Object.assign({}, opts.headers || {}, { 'Authorization': 'Bearer ' + t });
                }
            }
        } catch (e) {}
        return orig(url, opts);
    };
})();

var slChosen = null, slTimer = null, saTodo = [], saClosed = [], saDone = [];

function studentShowOnly(id) {
    ['landingPage', 'studentAccess', 'studentAssessmentView', 'studentLoginPage', 'studentAreaPage'].forEach(function(x) {
        var el = document.getElementById(x);
        if (el) el.style.display = (x === id) ? 'block' : 'none';
    });
    var menuButton = document.getElementById('studentMenuOpen');
    if (menuButton) menuButton.style.display = id === 'studentAreaPage' ? 'inline-flex' : 'none';
    if (id !== 'studentAreaPage') studentMenuToggle(false);
}
async function studentLoginLoadClasses() {
    var sel = document.getElementById('slClass');
    if (!sel) return;
    var seen = {}, list = [];
    function add(c) { c = String(c || '').trim(); if (c && c !== 'Other' && c.indexOf('--') !== 0 && !seen[c.toLowerCase()]) { seen[c.toLowerCase()] = 1; list.push(c); } }
    var src = document.getElementById('teacherClassSelect') || document.getElementById('rosterClassSelect');
    if (src) Array.prototype.forEach.call(src.options, function(o) { add(o.value); });
    (cmCustomOptions && cmCustomOptions.classes || []).forEach(add);
    try { var r = await fetch(BACKEND_URL + '/api/student/classes'); var d = await r.json(); (d.classes || []).forEach(add); } catch (e) {}
    var keep = sel.value;
    sel.innerHTML = '<option value="">-- Select your class --</option>' + list.map(function(c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; }).join('');
    sel.value = keep;
}
function studentLoginClassChanged() {
    slChosen = null;
    document.getElementById('slName').value = '';
    document.getElementById('slChosen').textContent = '';
    document.getElementById('slSuggest').innerHTML = '';
}
function openStudentLogin() {
    studentLoginLoadClasses();
    var cs = document.getElementById('slClass'); if (cs) cs.value = '';
    slChosen = null;
    document.getElementById('slName').value = '';
    document.getElementById('slPin').value = '';
    document.getElementById('slChosen').textContent = '';
    document.getElementById('slSuggest').innerHTML = '';
    document.getElementById('slStatus').textContent = '';
    studentShowOnly('studentLoginPage');
}
function studentLoginBack() { studentShowOnly('landingPage'); }

function studentLoginSuggest() {
    clearTimeout(slTimer);
    slChosen = null;
    document.getElementById('slChosen').textContent = '';
    var q = document.getElementById('slName').value.trim();
    var box = document.getElementById('slSuggest');
    var cls = document.getElementById('slClass').value;
    if (!cls) { box.innerHTML = q.length ? '<p class="helper-text">Choose your class first.</p>' : ''; return; }
    if (q.length < 2) { box.innerHTML = ''; return; }
    slTimer = setTimeout(async function() {
        try {
            var r = await fetch(BACKEND_URL + '/api/student/suggest?q=' + encodeURIComponent(q) + '&className=' + encodeURIComponent(cls));
            var d = await r.json();
            var matches = d.matches || [];
            if (!matches.length) {
                box.innerHTML = '<p class="helper-text">No student found with that name. Check the spelling, or ask your teacher whether your PIN is ready.</p>';
                return;
            }
            box.innerHTML = matches.map(function(m, i) {
                return '<button type="button" data-i="' + i + '">' + escapeHtml(m.name) + ' <span>(' + escapeHtml(m.admissionNumber) + ' · ' + escapeHtml(m.className) + ')</span></button>';
            }).join('');
            box.querySelectorAll('button').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    slChosen = matches[Number(btn.getAttribute('data-i'))];
                    document.getElementById('slName').value = slChosen.name;
                    box.innerHTML = '';
                    document.getElementById('slChosen').textContent = 'Logging in as ' + slChosen.name + ' (' + slChosen.admissionNumber + ')';
                    document.getElementById('slPin').focus();
                });
            });
        } catch (e) {}
    }, 300);
}

async function studentLoginSubmit() {
    var st = document.getElementById('slStatus');
    var pin = document.getElementById('slPin').value.trim();
    if (!slChosen) { st.style.color = '#dc3545'; st.textContent = 'Type your name, then tap your name in the list.'; return; }
    if (!/^[0-9]{4}$/.test(pin)) { st.style.color = '#dc3545'; st.textContent = 'Enter your 4-digit PIN.'; return; }
    st.style.color = '#6b7a8f'; st.textContent = 'Logging in...';
    try {
        var r = await fetch(BACKEND_URL + '/api/student/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teacherEmail: slChosen.teacherEmail, className: slChosen.className, admissionNumber: slChosen.admissionNumber, pin: pin })
        });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not log in.');
        localStorage.setItem('cleverment_student_token', d.token);
        localStorage.setItem('cleverment_student_profile', JSON.stringify(d.student));
        document.getElementById('slPin').value = '';
        st.textContent = '';
        openStudentArea();
    } catch (e) {
        st.style.color = '#dc3545';
        st.textContent = e.message || 'Could not log in.';
    }
}

function studentLogout() {
    localStorage.removeItem('cleverment_student_token');
    localStorage.removeItem('cleverment_student_profile');
    saTodo = []; saClosed = []; saDone = [];
    studentShowOnly('landingPage');
}

async function openStudentArea() {
    studentShowOnly('studentAreaPage');
    studentAreaShow('home');
    await loadStudentProfile();
    await loadStudentAssessments();
}

function studentAreaShow(p) {
    var map = { home: 'saPanelHome', todo: 'saPanelTodo', closed: 'saPanelClosed', done: 'saPanelDone', review: 'saPanelReview', progress: 'saPanelProgress', certs: 'saPanelCerts', study: 'saPanelStudy', messages: 'saPanelMessages', profile: 'saPanelProfile', learn: 'saPanelLearn' };
    Object.keys(map).forEach(function(k) {
        var el = document.getElementById(map[k]);
        if (el) el.style.display = (k === p) ? 'block' : 'none';
    });
    if (p === 'progress') renderStudentProgress();
    if (p === 'certs') renderStudentCerts();
    if (p === 'study') renderStudentStudy();
    if (p === 'learn') learnHome();
    if (p === 'messages') studentMsgLoad();
    if (p === 'profile') renderStudentProfilePanel();
    var activeNav = (p === 'review') ? 'done' : p;
    document.querySelectorAll('.sa-nav button').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-p') === activeNav); });
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) studentMenuToggle(false);
}

function studentMenuToggle(open) {
    var page = document.getElementById('studentAreaPage');
    var trigger = document.getElementById('studentMenuOpen');
    if (!page) return;
    var shouldOpen = (typeof open === 'boolean') ? open : !page.classList.contains('sa-sidebar-open');
    page.classList.toggle('sa-sidebar-open', shouldOpen);
    if (trigger) trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    document.body.classList.toggle('cm-menu-open', shouldOpen);
}
function studentSidebarToggle() { studentMenuToggle(false); }

function renderStudentProfile(me) {
    saMe = me;
    var box = document.getElementById('saProfile');
    var ini = String(me.name || '?').split(/\s+/).filter(Boolean).map(function(w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
    box.innerHTML = '<div class="sa-avatar">' + (me.photo ? '<img src="' + me.photo + '" alt="">' : '<span>' + escapeHtml(ini) + '</span>') + '</div>' +
        '<div><div class="sa-name">' + escapeHtml(me.name) + '</div>' +
        '<div class="helper-text">Admission No. ' + escapeHtml(me.admissionNumber) + ' · ' + escapeHtml(me.className) + '</div>' +
        (me.school && me.school.name ? '<div class="helper-text">' + escapeHtml(me.school.name) + '</div>' : '') +
        (me.teacherName ? '<div class="helper-text">Teacher: ' + escapeHtml(me.teacherName) + '</div>' : '') + '</div>';
    if (me.school) cmApplySchoolBrand(me.school);
}

async function loadStudentProfile() {
    var t = localStorage.getItem('cleverment_student_token');
    try {
        var r = await fetch(BACKEND_URL + '/api/student/me', { headers: { 'Authorization': 'Bearer ' + t } });
        if (r.status === 401) { studentLogout(); return null; }
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load your profile.');
        renderStudentProfile(d);
        return d;
    } catch (e) {
        document.getElementById('saProfile').innerHTML = '<p class="helper-text">Could not load your profile. Check your connection and try again.</p>';
        return null;
    }
}

async function loadStudentAssessments() {
    var t = localStorage.getItem('cleverment_student_token');
    try {
        var r = await fetch(BACKEND_URL + '/api/student/assessments', { headers: { 'Authorization': 'Bearer ' + t } });
        if (r.status === 401) { studentLogout(); return; }
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load assessments.');
        var allTodo = d.todo || [];
        saTodo = allTodo.filter(function(x) { return x.status !== 'closed'; });
        saClosed = allTodo.filter(function(x) { return x.status === 'closed'; });
        saDone = d.done || [];
        renderStudentTodo(saTodo);
        renderStudentClosed(saClosed);
        studentMsgBadge();
        cmShowAnnouncements('students', 'saAnnounce');
        renderStudentDone(saDone);
        document.getElementById('saPanelHome').innerHTML =
            '<h2 style="margin:0 0 6px;color:#172033;">Your learning overview</h2>' +
            '<p class="helper-text" style="margin:0 0 18px;">Keep track of assessments assigned to you and review your completed work.</p>' +
            '<div class="sa-summary-grid">' +
            '<div class="sa-summary-card"><span>Available assessments</span><strong>' + saTodo.length + '</strong><button type="button" class="secondary-btn" onclick="studentAreaShow(\'todo\')">View assessments</button></div>' +
            '<div class=\"sa-summary-card\"><span>Closed assessments</span><strong>' + saClosed.length + '</strong><button type=\"button\" class=\"secondary-btn\" onclick=\"studentAreaShow(\'closed\')\">View closed</button></div>' +
            '<div class="sa-summary-card"><span>Completed assessments</span><strong>' + saDone.length + '</strong><button type="button" class="secondary-btn" onclick="studentAreaShow(\'done\')">View history</button></div>' +
            '<div class="sa-summary-card"><span>Learning tip</span><strong style="font-size:18px;">Be prepared</strong><p class="helper-text">Check the time limit and instructions before starting each assessment.</p></div>' +
            '</div><h3 style="margin:22px 0 10px;">Quick actions</h3>' +
            '<div class="sa-quick-actions"><button type="button" class="primary-btn" onclick="studentAreaShow(\'todo\')">Find an assessment</button><button type="button" class="secondary-btn" onclick="studentAreaShow(\'done\')">Review my results</button><button type="button" class="secondary-btn" onclick="loadStudentAssessments()">Refresh dashboard</button></div>';
    } catch (e) {
        document.getElementById('saPanelTodo').innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message || 'Could not load.') + '</p>';
    }
}

function renderStudentTodo(list) {
    var el = document.getElementById('saPanelTodo');
    if (!list.length) { el.innerHTML = '<h2>Available Assessments</h2><p class="helper-text">You are all caught up. New assessments from your teacher will appear here.</p><button type="button" class="secondary-btn" onclick="loadStudentAssessments()">Refresh list</button>'; return; }
    el.innerHTML = list.map(function(x) {
        var label = x.status === 'upcoming' ? 'Opens soon' : (x.status === 'closed' ? 'Closed' : 'Start');
        var meta = escapeHtml(x.className) + ' · ' + x.questionCount + ' questions' + (x.timeLimit ? ' · ' + Math.round(x.timeLimit / 60) + ' min' : '') +
            (x.until ? ' · closes ' + escapeHtml(new Date(x.until).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) : '');
        return '<div class="sa-card"><div><b>' + escapeHtml(x.subject) + '</b><div class="helper-text">' + meta + '</div></div>' +
            (x.status === 'open' ? '<button type="button" class="primary-btn" data-code="' + escapeHtml(x.code) + '" onclick="studentAreaStart(this.getAttribute(\'data-code\'))">' + label + '</button>' : '<span class="sa-badge">' + label + '</span>') + '</div>';
    }).join('');
}

function renderStudentClosed(list) {
    var el = document.getElementById('saPanelClosed');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<h2>Closed Assessments</h2><p class="helper-text">Assessments whose time has ended and that you did not take will appear here.</p>'; return; }
    el.innerHTML = '<h2 style="margin:0 0 12px;">Closed Assessments</h2><p class="helper-text" style="margin:0 0 12px;">These assessments are no longer open. Ask your teacher if you missed one.</p>' + list.map(function(x) {
        var meta = escapeHtml(x.className) + ' · ' + x.questionCount + ' questions' + (x.timeLimit ? ' · ' + Math.round(x.timeLimit / 60) + ' min' : '') +
            (x.until ? ' · closed ' + escapeHtml(new Date(x.until).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })) : '');
        return '<div class="sa-card"><div><b>' + escapeHtml(x.subject) + '</b><div class="helper-text">' + meta + '</div></div><span class="sa-badge">Closed</span></div>';
    }).join('');
}

function renderStudentDone(list) {
    var el = document.getElementById('saPanelDone');
    if (!list.length) { el.innerHTML = '<h2>Assessment History</h2><p class="helper-text">Completed assessments and available results will appear here.</p>'; return; }
    el.innerHTML = '<h2 style="margin:0 0 12px;">Assessment History</h2><p class="helper-text" style="margin:0 0 12px;">Tap an assessment to see the correct answers and download its certificate.</p>' + list.map(function(x) {
        var when = x.date ? new Date(x.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        var right = x.score === null ? '<span class="sa-badge">Submitted</span>' :
            '<span class="pos-remark ' + (x.passed ? 'pass' : 'fail') + '">' + x.score + '% · ' + (x.passed ? 'Pass' : 'Fail') + '</span>';
        if (x.canReview && x.code) {
            return '<div class="sa-card sa-card-click" role="button" tabindex="0" onclick="studentHistoryOpen(\'' + escapeHtml(String(x.code)).replace(/'/g, '') + '\')" onkeydown="if(event.key===\'Enter\'){studentHistoryOpen(\'' + escapeHtml(String(x.code)).replace(/'/g, '') + '\');}">' +
                '<div><b>' + escapeHtml(x.subject) + '</b><div class="helper-text">' + escapeHtml(when) + '</div></div>' +
                '<div class="sa-card-actions">' + right + '<span class="sa-badge">View answers</span></div></div>';
        }
        return '<div class="sa-card"><div><b>' + escapeHtml(x.subject) + '</b><div class="helper-text">' + escapeHtml(when) + '</div></div>' + right + '</div>';
    }).join('');
}

// ---- History: open one finished assessment (correct answers + certificate) ----
var saReviewData = null;

function studentHistoryBack() { studentAreaShow('done'); }

async function studentHistoryOpen(code) {
    var t = localStorage.getItem('cleverment_student_token');
    var scoreBox = document.getElementById('saReviewScore');
    var corrBox = document.getElementById('saReviewCorrections');
    saReviewData = null;
    scoreBox.innerHTML = '<span class="result-details">Loading your result...</span>';
    corrBox.innerHTML = '';
    studentAreaShow('review');
    try {
        var r = await fetch(BACKEND_URL + '/api/student/result/' + encodeURIComponent(code), { headers: { 'Authorization': 'Bearer ' + t } });
        if (r.status === 401) { studentLogout(); return; }
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load this result.');
        saReviewData = d;
        var grade = getGrade(d.score);
        scoreBox.innerHTML =
            '<span class="grade">' + escapeHtml(grade) + '</span>' +
            d.score + '% (' + d.correctAnswers + '/' + d.totalQuestions + ')<br>' +
            '<span style="display:inline-block; margin-top:6px; padding:4px 14px; border-radius:20px; font-weight:700; font-size:13px; background:' + (d.passed ? '#e6f7ec' : '#fdecec') + '; color:' + (d.passed ? '#1f8a4c' : '#c0392b') + ';">' + (d.passed ? 'PASSED' : 'NOT PASSED') + ' (Pass mark: ' + d.passMark + '%)</span><br>' +
            '<span class="result-details">Class: ' + escapeHtml(d.className || '') + ' | Student: ' + escapeHtml(d.studentName || '') + ' | Subject: ' + escapeHtml(d.subject || '') + (d.timeTaken ? ' | Time: ' + escapeHtml(d.timeTaken) : '') + '</span>';
        corrBox.innerHTML = '<h3>Corrections</h3>';
        var corrections = d.corrections || [];
        if (!corrections.length) {
            corrBox.innerHTML += '<p class="helper-text">The correct answers for this assessment are not available.</p>';
        }
        for (var j = 0; j < corrections.length; j++) {
            var item = corrections[j];
            var div = document.createElement('div');
            div.className = 'correction-item';
            div.innerHTML =
                '<p><strong>Q' + (j + 1) + ':</strong> ' + item.question + '</p>' +
                '<p>Your answer: <strong style="color:' + (item.isCorrect ? '#2d9c5c' : '#dc3545') + '">' + (item.userAnswerText || 'Not answered') + '</strong></p>' +
                (!item.isCorrect ? '<p>Correct answer: <strong style="color:#2d9c5c">' + item.correctAnswerText + '</strong></p>' : '') +
                (item.explanation ? '<p class="explain">&#128161; ' + escapeHtml(item.explanation) + '</p>' : '') +
                '<p>' + (item.isCorrect ? 'Correct' : 'Wrong') + '</p>';
            corrBox.appendChild(div);
            if (typeof renderMathIn === 'function') renderMathIn(div);
        }
    } catch (e) {
        scoreBox.innerHTML = '<span class="result-details" style="color:#dc3545;">' + escapeHtml(e.message || 'Could not load this result.') + '</span>';
    }
}

// Certificate for the opened History result (PDF or image) - same design as the one given after submitting.
function studentHistoryDownload(kind) {
    var d = saReviewData;
    if (!d) { alert('Please wait for the result to finish loading.'); return; }
    var tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed; left:-9999px; top:0; width:297mm; height:210mm; margin:0; padding:0; background:white; z-index:-1; overflow:hidden;';
    var cleanCert = buildCertificateElement({
        studentName: d.studentName,
        subject: d.subject,
        score: d.score,
        teacherName: d.teacherName,
        teacherSignature: d.teacherSignature,
        code: d.code,
        studentPhoto: d.photo || '',
        admissionNumber: d.admissionNumber,
        dateObj: d.date ? new Date(d.date) : new Date()
    });
    tempDiv.appendChild(cleanCert);
    document.body.appendChild(tempDiv);
    var cleanup = function() { if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv); };
    waitForCertificateImages(cleanCert, 4000).then(function() {
        return html2canvas(cleanCert, { scale: 3, useCORS: true, backgroundColor: '#ffffff', width: 297 * 3.779, height: 210 * 3.779, logging: false });
    }).then(function(canvas) {
        if (kind === 'image') {
            var link = document.createElement('a');
            link.download = 'Certificate-' + d.studentName + '-' + d.subject + '.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            var jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            if (!jsPDFCtor) throw new Error('jsPDF library not found. Please check that jspdf.umd.min.js loaded correctly.');
            var pdf = new jsPDFCtor('landscape', 'mm', 'a4');
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 297, 210);
            pdf.save('Certificate-' + d.studentName + '-' + d.subject + '.pdf');
        }
        cleanup();
    }).catch(function(error) {
        cleanup();
        alert('Could not create the certificate: ' + (error && error.message ? error.message : error));
    });
}

// Starts an assessment from the "To do" list using the student's own name and admission number.
async function studentAreaStart(code) {
    var prof = {};
    try { prof = JSON.parse(localStorage.getItem('cleverment_student_profile') || '{}'); } catch (e) {}
    try {
        var ok = await verifyAssessmentCode({ silent: true, code: code });
        if (!ok) return; // the reason was already shown; the student stays on the dashboard
        studentShowOnly('studentAssessmentView');
        showAssessmentForm();
        var info = document.getElementById('studentInfoForm');
        if (info) info.style.display = 'none';
        document.getElementById('studentNameInput').value = prof.name || '';
        document.getElementById('studentAdmissionNumber').value = prof.admissionNumber || '';
        await startStudentQuiz();
        var quiz = document.getElementById('studentQuizSection');
        if (!quiz || quiz.style.display === 'none') openStudentArea();
    } catch (e) {
        alert('Could not start this assessment. Please try again.');
        openStudentArea();
    }
}

// Logged-in students stay logged in on this phone until they tap Log out.
setTimeout(function() {
    try {
        if (localStorage.getItem('cleverment_student_token') && !getCodeFromURL()) openStudentArea();
    } catch (e) {}
}, 900);

// ============================================================
// TEACHER: STUDENT PINS (inside Class Roster)
// ============================================================
var cmLastPins = [], cmLastPinsClass = '';

async function loadPinPanel(cls) {
    var body = document.getElementById('pinPanelBody');
    if (!body) return;
    if (!cls) { body.innerHTML = ''; return; }
    if (cls !== cmLastPinsClass) { cmLastPins = []; cmLastPinsClass = cls; }
    body.innerHTML = '<p class="helper-text">Loading...</p>';
    try {
        var r = await fetch(BACKEND_URL + '/api/teacher/student-pins?className=' + encodeURIComponent(cls), { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('cleverment_teacher_token') } });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load PINs.');
        var have = d.students.filter(function(s) { return s.hasPin; }).length;
        var html = '<p class="helper-text" style="margin:0 0 8px;"><b>' + have + '</b> of ' + d.students.length + ' students have a PIN.' +
            (d.setupNeeded ? ' <span style="color:#b4232f;">Run supabase_student_accounts.sql in Supabase first.</span>' : '') + '</p><div id="pinResultHost"></div>';
        html += '<div class="scrollable-panel"><table class="pos-table"><thead><tr><th>Name</th><th>Admission No.</th><th>PIN</th><th></th></tr></thead><tbody>';
        d.students.forEach(function(s) {
            var status = s.hasPin ? (s.locked ? '<span class="pos-remark fail">Locked</span>' : '<span class="pos-remark pass">Set</span>') : '<span class="pos-missing">Not set</span>';
            html += '<tr><td>' + escapeHtml(s.name) + '</td><td>' + escapeHtml(s.admissionNumber) + '</td><td>' + status + '</td><td>' +
                '<button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;" data-adm="' + escapeHtml(s.admissionNumber) + '" onclick="resetStudentPin(this.getAttribute(\'data-adm\'))">' + (s.hasPin ? 'Reset PIN' : 'Set PIN') + '</button></td></tr>';
        });
        body.innerHTML = html + '</tbody></table></div>';
        renderLastPins();
    } catch (e) {
        body.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message || 'Could not load.') + '</p>';
    }
}

async function cmPinRequest(body) {
    try {
        var r = await fetch(BACKEND_URL + '/api/teacher/student-pins', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('cleverment_teacher_token') },
            body: JSON.stringify(body)
        });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not create PINs.');
        cmLastPins = d.pins || [];
        cmLastPinsClass = body.className;
        await loadPinPanel(body.className);
    } catch (e) { alert(e.message); }
}

async function generateAllStudentPins() {
    var cls = currentRosterEditClass;
    if (!cls) { alert('Choose a class first.'); return; }
    if (!confirm('Generate NEW PINs for every student in ' + cls + '?\n\nAny PIN they already have will stop working. Print or export the list straight away.')) return;
    await cmPinRequest({ className: cls });
}

async function resetStudentPin(adm) {
    var cls = currentRosterEditClass;
    if (!confirm('Give ' + adm + ' a new PIN? The old one will stop working.')) return;
    await cmPinRequest({ className: cls, admissionNumber: adm });
}

function renderLastPins() {
    var host = document.getElementById('pinResultHost');
    if (!host || !cmLastPins.length) return;
    host.innerHTML = '<div class="flag-box" style="border-color:#f0d28a;background:#fffdf4;"><b>New PINs: write them down or print now. They cannot be shown again.</b>' +
        '<div class="scrollable-panel" style="margin-top:6px;"><table class="pos-table"><thead><tr><th>Name</th><th>Admission No.</th><th>PIN</th></tr></thead><tbody>' +
        cmLastPins.map(function(p) { return '<tr><td>' + escapeHtml(p.name) + '</td><td>' + escapeHtml(p.admissionNumber) + '</td><td><b style="font-size:16px;letter-spacing:2px;">' + escapeHtml(p.pin) + '</b></td></tr>'; }).join('') +
        '</tbody></table></div><button type="button" class="primary-btn" style="margin-top:8px;" onclick="printStudentPins()">Print</button> ' +
        '<button type="button" class="secondary-btn" style="margin-top:8px;" onclick="exportStudentPinsCsv()">Export CSV</button></div>';
}

function printStudentPins() {
    var w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to print.'); return; }
    var rows = cmLastPins.map(function(p) { return '<tr><td>' + escapeHtml(p.name) + '</td><td>' + escapeHtml(p.admissionNumber) + '</td><td style="font-size:18px;font-weight:bold;letter-spacing:3px;">' + escapeHtml(p.pin) + '</td></tr>'; }).join('');
    w.document.write('<html><head><title>Student PINs</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:left}h2{margin:0 0 6px}</style></head><body><h2>CleverMent login PINs - ' + escapeHtml(cmLastPinsClass) + '</h2><p>Log in with your name and this 4-digit PIN.</p><table><tr><th>Name</th><th>Admission No.</th><th>PIN</th></tr>' + rows + '</table></body></html>');
    w.document.close();
    w.focus();
    w.print();
}

function exportStudentPinsCsv() {
    var lines = ['Name,Admission No.,PIN'].concat(cmLastPins.map(function(p) { return csvCell(p.name) + ',' + csvCell(p.admissionNumber) + ',' + csvCell(p.pin); }));
    cbDownloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), 'PINs-' + backupSafeName(cmLastPinsClass) + '.csv');
}

(function cmHookRosterPins() {
    var orig = loadRosterForEditing;
    loadRosterForEditing = async function(cls) { await orig(cls); loadPinPanel(cls); };
})();


function showTeacherSection(panelId, btn) {
    showDashSection('teacherDashboard', panelId, btn);
    if (typeof cmShowAnnouncements === 'function') { cmShowAnnouncements('teachers', 'teacherAnnounce'); teacherMsgBadge(); }
    if (panelId === 'analyticsSection' && typeof loadTeacherAnalytics === 'function') {
        loadTeacherAnalytics();
    }
    if (panelId === 'accessLogsSection') {
        loadTeacherAccessLogs();
    }
    if (panelId === 'positionsSection') {
        initPositionsPanel();
    }
    if (panelId === 'schoolSection') {
        loadSchoolPanel();
    }
    if (panelId === 'progressSection') {
        initProgressPanel();
    }
    if (panelId === 'messagesSection') teacherMsgInit();
    if (panelId === 'insightsSection') insightsInit();
    if (panelId === 'liveSection') {
        startTeacherLivePolling();
    } else {
        stopTeacherLivePolling();
    }
}

function showAdminSection(panelId, btn) {
    showDashSection('adminDashboard', panelId, btn);
    if (panelId === 'adminAccessLogsSection') loadAdminAccessLogs();
    cmAdminPanelOpened(panelId);
    if (panelId === 'adminSecuritySection') loadAdminSecurity();
    if (panelId === 'adminSchoolsSection') loadAdminSchools();
    if (panelId === 'adminLiveSection') startAdminLivePolling();
    else stopAdminLivePolling();
}


// ============================================================
// TEACHER: STUDENT ACCESS LOGS
// ============================================================
// Safely turns text into HTML-safe text (so a student's name can never inject
// markup into the teacher's table). loadTeacherAccessLogs() below depends on
// this; it was previously missing, which made the panel load forever.
function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function accessLogStatusLabel(status) {
    var labels = {
        successful_access: 'Successful access',
        duplicate_attempt: 'Duplicate attempt',
        invalid_name: 'Invalid name',
        invalid_admission: 'Invalid admission number',
        invalid_name_and_admission: 'Invalid name & admission number',
        network_error: 'Network/server error',
        not_yet_open: 'Not yet open',
        closed: 'Assessment closed'
    };
    return labels[status] || status || 'Unknown';
}

function accessLogStatusClass(status) {
    if (status === 'successful_access') return 'cm-access-success';
    if (status === 'duplicate_attempt') return 'cm-access-warning';
    if (status === 'not_yet_open' || status === 'closed') return 'cm-access-info';
    return 'cm-access-error';
}

async function loadTeacherAccessLogs() {
    var container = document.getElementById('teacherAccessLogsContainer');
    if (!container) return;
    var token = localStorage.getItem('cleverment_teacher_token');
    if (!token) {
        container.innerHTML = '<p class="helper-text" style="color:#dc3545;">Teacher session missing. Please log in again.</p>';
        return;
    }
    container.innerHTML = '<p class="helper-text">Loading access attempts...</p>';
    try {
        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 10000) : null;
        var fetchOptions = {
            headers: { 'Authorization': 'Bearer ' + token }
        };
        if (controller) fetchOptions.signal = controller.signal;
        var res = await fetch(BACKEND_URL + '/api/teacher/access-logs', fetchOptions);
        if (timeoutId) clearTimeout(timeoutId);
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load access logs.');
        var logs = data.logs || [];
        cmRenderChartPanel('cmHostTeacherAccess', cmAccessSources(logs));
        if (!logs.length) {
            container.innerHTML = '<p class="helper-text">No student access attempts have been recorded yet.</p>';
            return;
        }
        var html = '<div style="overflow-x:auto; -webkit-overflow-scrolling:touch;"><table class="teacher-access-log-table"><thead><tr>' +
            '<th>Date & Time</th><th>Assessment</th><th>Student Name</th><th>Admission No.</th><th>Status</th><th>Details</th>' +
            '</tr></thead><tbody>';
        for (var i = 0; i < logs.length; i++) {
            var x = logs[i];
            html += '<tr>' +
                '<td style="white-space:nowrap;">' + escapeHtml(new Date(x.timestamp).toLocaleString()) + '</td>' +
                '<td><strong>' + escapeHtml(x.code || '') + '</strong><br><span style="font-size:12px;color:#6b7a8f;">' + escapeHtml((x.subject || '') + (x.className ? ' • ' + x.className : '')) + '</span></td>' +
                '<td>' + escapeHtml(x.studentName || '—') + '</td>' +
                '<td>' + escapeHtml(x.admissionNumber || '—') + '</td>' +
                '<td><span class="cm-access-status ' + accessLogStatusClass(x.status) + '">' + escapeHtml(accessLogStatusLabel(x.status)) + '</span></td>' +
                '<td style="min-width:260px;">' + escapeHtml(x.message || '') + '</td>' +
                '</tr>';
        }
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) {
        var msg = (e && e.name === 'AbortError')
            ? 'The access log is taking too long to respond. Tap Refresh to try again.'
            : ('Could not load access attempts: ' + (e.message || 'Unknown error'));
        container.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(msg) + '</p>';
    }
}

// ============================================================
// LIVE PRESENCE (student heartbeat)
// While a quiz is in progress, the app pings the backend every
// 20s so the teacher's "Live Now" panel can show who is currently
// taking an assessment. Stops on submit/exit; a student counts as
// live for 60s after their last ping, so brief network drops
// don't flicker them off the list.
// ============================================================

var studentPresenceInterval = null;

var studentPendingMessageAcks = [];
var studentSeenMessageIds = {};
var studentAudioCtx = null;

function sendPresenceHeartbeat() {
    if (!currentAssessmentCode || !studentName || !studentAdmissionNumber) return;
    var acksBeingSent = studentPendingMessageAcks.slice(0, 50);
    fetch(BACKEND_URL + '/api/quiz/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: currentAssessmentCode,
            studentName: studentName,
            admissionNumber: studentAdmissionNumber,
            ackIds: acksBeingSent
        })
    }).then(function(res) {
        if (!res.ok) return null;
        return res.json();
    }).then(function(data) {
        if (!data) return;
        // The server has the confirmations now.
        studentPendingMessageAcks = studentPendingMessageAcks.filter(function(id) {
            return acksBeingSent.indexOf(id) === -1;
        });
        if (data.messages && data.messages.length) handleIncomingTeacherMessages(data.messages);
    }).catch(function() {
        // Offline or server asleep - the next heartbeat retries.
    });
}

// ---- Messages from the teacher / admin, shown while the quiz continues ----

function unlockStudentAudio() {
    try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!studentAudioCtx) studentAudioCtx = new AC();
        if (studentAudioCtx.state === 'suspended') studentAudioCtx.resume();
    } catch (e) { /* sound is a bonus - never break the quiz */ }
}
// Browsers only allow sound after the person has touched the page once. Students
// tap answers constantly, so the first tap unlocks the chime.
['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function(ev) {
    document.addEventListener(ev, unlockStudentAudio, { passive: true });
});

function playMessageChime() {
    try {
        unlockStudentAudio();
        var ctx = studentAudioCtx;
        if (!ctx) return;
        var now = ctx.currentTime;
        [[784, 0], [1047, 0.2]].forEach(function(n) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = n[0];
            gain.gain.setValueAtTime(0.0001, now + n[1]);
            gain.gain.exponentialRampToValueAtTime(0.3, now + n[1] + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + n[1]);
            osc.stop(now + n[1] + 0.5);
        });
    } catch (e) { /* ignore */ }
}

function handleIncomingTeacherMessages(messages) {
    var gotNew = false;
    for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        if (!m || !m.id) continue;
        // Always (re)confirm so the sender sees "Seen", but only show each message once.
        if (studentPendingMessageAcks.indexOf(m.id) === -1) studentPendingMessageAcks.push(m.id);
        if (studentSeenMessageIds[m.id]) continue;
        studentSeenMessageIds[m.id] = true;
        showTeacherMessage(m);
        gotNew = true;
    }
    if (gotNew) {
        playMessageChime();
        // Confirm straight away so the teacher sees "Seen" without waiting.
        sendPresenceHeartbeat();
    }
}

function showTeacherMessage(m) {
    var stack = document.getElementById('liveMessageStack');
    if (!stack) return;

    var card = document.createElement('div');
    card.className = 'live-msg-card';
    card.setAttribute('role', 'status');

    var icon = document.createElement('div');
    icon.className = 'live-msg-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    var body = document.createElement('div');
    body.className = 'live-msg-body';
    var from = document.createElement('div');
    from.className = 'live-msg-from';
    from.textContent = m.from === 'admin' ? 'Message from the school admin' : 'Message from your teacher';
    var text = document.createElement('div');
    text.className = 'live-msg-text';
    text.textContent = m.text;
    body.appendChild(from);
    body.appendChild(text);

    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'live-msg-ok';
    ok.textContent = 'Got it';
    function remove() { if (card.parentNode) card.parentNode.removeChild(card); }
    ok.addEventListener('click', remove);

    card.appendChild(icon);
    card.appendChild(body);
    card.appendChild(ok);
    stack.insertBefore(card, stack.firstChild);

    // Keep at most 3 on screen; tidy up after 90 seconds.
    while (stack.children.length > 3) stack.removeChild(stack.lastChild);
    setTimeout(remove, 90000);
}

function clearLiveMessageBanners() {
    var stack = document.getElementById('liveMessageStack');
    if (stack) stack.innerHTML = '';
}

function startStudentPresence() {
    stopStudentPresence();
    sendPresenceHeartbeat();
    // Every 10 seconds: keeps "Live Now" fresh and delivers teacher messages quickly.
    studentPresenceInterval = setInterval(sendPresenceHeartbeat, 10000);
}

function stopStudentPresence() {
    if (studentPresenceInterval) {
        clearInterval(studentPresenceInterval);
        studentPresenceInterval = null;
    }
    clearLiveMessageBanners();
    studentPendingMessageAcks = [];
}

// ============================================================
// TEACHER: "Live Now" panel - polls the backend for students
// currently taking this teacher's assessments.
// ============================================================

var teacherLiveInterval = null;

async function loadTeacherLive() {
    var container = document.getElementById('teacherLiveContainer');
    if (!container) return;
    var token = localStorage.getItem('cleverment_teacher_token');
    if (!token) return;
    try {
        var res = await fetch(BACKEND_URL + '/api/teacher/live', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var data = await res.json();
        if (!res.ok) {
            container.innerHTML = '<p class="helper-text">Could not load live data. Please try again.</p>';
            return;
        }
        renderTeacherLive(data.live || []);
    } catch (e) {
        // Transient network error - keep showing the previous list.
    }
}

var liveListCache = { teacher: [], admin: [] };

function liveLastMessageHtml(s) {
    if (!s.lastMessage) return '';
    var t = String(s.lastMessage.text || '');
    if (t.length > 70) t = t.slice(0, 70) + '...';
    return '<br><span class="live-last-msg">&#9993; ' + escapeHtml(t) + ' &mdash; ' +
        (s.lastMessage.seenAt ? '<b style="color:#2d9c5c;">&#10003; Seen</b>' : '<span style="color:#b7791f;">sent, waiting for student</span>') + '</span>';
}

function liveMessageButtonHtml(role, s) {
    return '<button type="button" class="live-msg-btn" data-role="' + role + '" data-mode="one" data-code="' + escapeHtml(s.code || '') + '" data-adm="' + escapeHtml(s.admissionNumber || '') + '" data-name="' + escapeHtml(s.studentName || '') + '" onclick="openLiveMessageDialogFromBtn(this)" aria-label="Send a message to ' + escapeHtml(s.studentName || 'student') + '">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '<span>Message</span></button>';
}

function liveMessageAllButtonHtml(role, count) {
    return '<div class="live-toolbar"><button type="button" class="live-msg-all-btn" data-role="' + role + '" data-mode="all" onclick="openLiveMessageDialogFromBtn(this)">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '<span>Message all students (' + count + ')</span></button></div>';
}

function renderTeacherLive(list) {
    var container = document.getElementById('teacherLiveContainer');
    if (!container) return;
    liveListCache.teacher = list || [];
    if (!list || list.length === 0) {
        container.innerHTML = '<p class="helper-text">No students are taking your assessments right now.</p>';
        return;
    }
    var html = liveMessageAllButtonHtml('teacher', list.length);
    for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var elapsedMs = Date.now() - new Date(s.startedAt).getTime();
        var elapsedMin = Math.max(1, Math.round(elapsedMs / 60000));
        html += '<div class="live-item">' +
            '<span class="live-dot"></span>' +
            '<div style="flex:1; min-width:160px;"><strong>' + escapeHtml(s.studentName) + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + escapeHtml(s.admissionNumber) + ')</span><br>' +
            '<span style="color:#6b7a8f; font-size:13px;">' + escapeHtml(s.subject) + ' - ' + escapeHtml(s.className) + ' | Code: ' + escapeHtml(s.code) + '</span>' +
            liveLastMessageHtml(s) + '</div>' +
            '<span style="font-size:13px; color:#2d9c5c; font-weight:600; white-space:nowrap;">in progress ~' + elapsedMin + ' min</span>' +
            liveMessageButtonHtml('teacher', s) +
            '</div>';
    }
    container.innerHTML = html;
}


// ============================================================
// LIVE MESSAGE DIALOG (teacher + admin): pick a ready-made message or write
// your own, then send it to one student or to everyone taking an assessment.
// ============================================================

var LIVE_MESSAGE_PRESETS = [
    "I can see you are currently doing your assessment. Well done!",
    "Make sure you do your assessment carefully. Don't rush!",
    "Please read each question fully before choosing an answer.",
    "Keep going - you are doing great!",
    "Remember to watch the time and manage it wisely.",
    "Please stay on this page until you submit your assessment.",
    "Please keep your eyes on your own screen.",
    "Do not switch to other apps or tabs during the assessment.",
    "If a question is hard, move on and come back to it later.",
    "Take a deep breath and stay calm. You can do this!",
    "Please review your answers before you submit.",
    "Time is running out. Check any unanswered questions now.",
    "Make sure every question has an answer before you submit.",
    "Stay focused. Your best effort matters.",
    "Please keep quiet so others can concentrate.",
    "Your assessment is being monitored live. Please be honest in your work.",
    "Don't pick answers too fast. Think about each option carefully.",
    "If you have a problem with your device or network, tell the supervisor in the room.",
    "Almost there! Finish strong.",
    "Please put away your notes and any other devices."
];

var liveMessageTarget = null;

function openLiveMessageDialogFromBtn(btn) {
    var role = btn.getAttribute('data-role') === 'admin' ? 'admin' : 'teacher';
    if (btn.getAttribute('data-mode') === 'all') {
        openLiveMessageDialog({ role: role, mode: 'all', count: (liveListCache[role] || []).length });
    } else {
        openLiveMessageDialog({
            role: role,
            mode: 'one',
            code: btn.getAttribute('data-code') || '',
            admissionNumber: btn.getAttribute('data-adm') || '',
            studentName: btn.getAttribute('data-name') || 'this student'
        });
    }
}

function openLiveMessageDialog(target) {
    liveMessageTarget = target;
    var title = document.getElementById('liveMsgTitle');
    var to = document.getElementById('liveMsgTo');
    if (target.mode === 'all') {
        title.textContent = 'Message all students';
        to.textContent = 'To: everyone taking an assessment right now (' + target.count + ')';
    } else {
        title.textContent = 'Message student';
        to.textContent = 'To: ' + target.studentName;
    }
    var sel = document.getElementById('liveMsgPreset');
    var html = '<option value="">Choose a message...</option>';
    for (var i = 0; i < LIVE_MESSAGE_PRESETS.length; i++) {
        html += '<option value="' + i + '">' + escapeHtml(LIVE_MESSAGE_PRESETS[i]) + '</option>';
    }
    html += '<option value="__custom">Write my own message...</option>';
    sel.innerHTML = html;
    sel.value = '';
    document.getElementById('liveMsgText').value = '';
    document.getElementById('liveMsgStatus').textContent = '';
    updateLiveMsgCount();
    document.getElementById('liveMsgSendBtn').disabled = false;
    document.getElementById('liveMessageOverlay').style.display = 'flex';
}

function closeLiveMessageDialog() {
    document.getElementById('liveMessageOverlay').style.display = 'none';
    liveMessageTarget = null;
}

function onLivePresetChange(sel) {
    var ta = document.getElementById('liveMsgText');
    if (sel.value === '__custom') {
        ta.value = '';
        ta.focus();
    } else if (sel.value !== '') {
        ta.value = LIVE_MESSAGE_PRESETS[parseInt(sel.value, 10)] || '';
    }
    updateLiveMsgCount();
}

function updateLiveMsgCount() {
    var ta = document.getElementById('liveMsgText');
    document.getElementById('liveMsgCount').textContent = ta.value.length + '/300';
}

async function sendLiveMessage() {
    if (!liveMessageTarget) return;
    var text = document.getElementById('liveMsgText').value.replace(/\s+/g, ' ').trim();
    var status = document.getElementById('liveMsgStatus');
    if (!text) { status.style.color = '#dc3545'; status.textContent = 'Please choose a message or write your own.'; return; }
    if (text.length > 300) { status.style.color = '#dc3545'; status.textContent = 'That message is too long (300 characters at most).'; return; }

    var role = liveMessageTarget.role;
    var token = localStorage.getItem(role === 'admin' ? 'cleverment_admin_token' : 'cleverment_teacher_token');
    var body = { text: text, target: liveMessageTarget.mode };
    if (liveMessageTarget.mode === 'one') {
        body.code = liveMessageTarget.code;
        body.admissionNumber = liveMessageTarget.admissionNumber;
    }
    var btn = document.getElementById('liveMsgSendBtn');
    btn.disabled = true;
    status.style.color = '#6b7a8f';
    status.textContent = 'Sending...';
    try {
        var res = await fetch(BACKEND_URL + '/api/' + role + '/live/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(body)
        });
        var data = await res.json();
        if (!res.ok) {
            status.style.color = '#dc3545';
            status.textContent = data.error || 'Could not send the message.';
            btn.disabled = false;
            return;
        }
        status.style.color = '#2d9c5c';
        status.textContent = '\u2713 Sent to ' + data.sent + ' student' + (data.sent === 1 ? '' : 's') + '. It appears on their screen within a few seconds.';
        if (role === 'admin') loadAdminLive(); else loadTeacherLive();
        setTimeout(closeLiveMessageDialog, 1600);
    } catch (e) {
        status.style.color = '#dc3545';
        status.textContent = 'Could not reach the server. Please try again.';
        btn.disabled = false;
    }
}

function startTeacherLivePolling() {
    stopTeacherLivePolling();
    loadTeacherLive();
    teacherLiveInterval = setInterval(loadTeacherLive, 8000);
}

function stopTeacherLivePolling() {
    if (teacherLiveInterval) {
        clearInterval(teacherLiveInterval);
        teacherLiveInterval = null;
    }
}


// ============================================================
// ADMIN: ALL-STUDENT LIVE PRESENCE AND ACCESS LOGS
// ============================================================
var adminLiveInterval = null;

async function loadAdminLive() {
    var container = document.getElementById('adminLiveContainer');
    if (!container) return;
    var token = localStorage.getItem('cleverment_admin_token');
    if (!token) { container.innerHTML = '<p class="helper-text">Admin session missing. Please log in again.</p>'; return; }
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/live', { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load live students.');
        var list = data.live || [];
        liveListCache.admin = list;
        if (!list.length) { container.innerHTML = '<p class="helper-text">No students are taking assessments right now.</p>'; return; }
        var html = liveMessageAllButtonHtml('admin', list.length);
        list.forEach(function(s) {
            var elapsedMin = Math.max(1, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000));
            html += '<div class="live-item"><span class="live-dot"></span><div style="flex:1;min-width:160px;"><strong>' + escapeHtml(s.studentName || 'Unknown student') + '</strong> <span style="color:#6b7a8f;font-size:13px;">(' + escapeHtml(s.admissionNumber || '—') + ')</span><br><span style="color:#6b7a8f;font-size:13px;">' + escapeHtml(s.subject || '') + ' - ' + escapeHtml(s.className || '') + ' | Code: ' + escapeHtml(s.code || '') + '</span>' + (s.teacherName || s.teacherEmail ? '<br><span style="font-size:12px;color:#6b7a8f;">Teacher: ' + escapeHtml(s.teacherName || 'Unknown') + (s.teacherEmail ? ' (' + escapeHtml(s.teacherEmail) + ')' : '') + '</span>' : '') + liveLastMessageHtml(s) + '</div><span style="font-size:13px;color:#2d9c5c;font-weight:600;white-space:nowrap;">in progress ~' + elapsedMin + ' min</span>' + liveMessageButtonHtml('admin', s) + '</div>';
        });
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message || 'Could not load live data.') + '</p>'; }
}
function startAdminLivePolling() { stopAdminLivePolling(); loadAdminLive(); adminLiveInterval = setInterval(loadAdminLive, 8000); }
function stopAdminLivePolling() { if (adminLiveInterval) { clearInterval(adminLiveInterval); adminLiveInterval = null; } }

async function loadAdminAccessLogs() {
    var container = document.getElementById('adminAccessLogsContainer');
    if (!container) return;
    var token = localStorage.getItem('cleverment_admin_token');
    if (!token) { container.innerHTML = '<p class="helper-text">Admin session missing. Please log in again.</p>'; return; }
    container.innerHTML = '<p class="helper-text">Loading access logs...</p>';
    try {
        var res = await fetch(BACKEND_URL + '/api/admin/access-logs', { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load access logs.');
        var logs = data.logs || [];
        cmRenderChartPanel('cmHostAdminAccess', cmAccessSources(logs));
        if (!logs.length) { container.innerHTML = '<p class="helper-text">No student access attempts have been recorded yet.</p>'; return; }
        var html = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><table class="teacher-access-log-table"><thead><tr><th>Date & Time</th><th>Teacher</th><th>Assessment</th><th>Student Name</th><th>Admission No.</th><th>Status</th><th>Details</th></tr></thead><tbody>';
        logs.forEach(function(x) {
            html += '<tr><td style="white-space:nowrap;">' + escapeHtml(x.timestamp ? new Date(x.timestamp).toLocaleString() : '') + '</td><td><strong>' + escapeHtml(x.teacherName || 'Unknown teacher') + '</strong><br><span style="font-size:12px;color:#6b7a8f;">' + escapeHtml(x.teacherEmail || '') + '</span></td><td><strong>' + escapeHtml(x.code || '') + '</strong><br><span style="font-size:12px;color:#6b7a8f;">' + escapeHtml((x.subject || '') + (x.className ? ' • ' + x.className : '')) + '</span></td><td>' + escapeHtml(x.studentName || '—') + '</td><td>' + escapeHtml(x.admissionNumber || '—') + '</td><td><span class="cm-access-status ' + accessLogStatusClass(x.status) + '">' + escapeHtml(accessLogStatusLabel(x.status)) + '</span></td><td style="min-width:220px;">' + escapeHtml(x.message || '') + '</td></tr>';
        });
        container.innerHTML = html + '</tbody></table></div>';
    } catch (e) { container.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message || 'Could not load access logs.') + '</p>'; }
}


// Result action modal wiring
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupResultActionModal);
} else {
    setupResultActionModal();
}

// ============================================================
// CLEVERBOT HELPERS - markdown display + CleverMent CSV tools
// (top-level so they can be tested on their own)
// ============================================================

// Escapes text so it can never become live HTML (XSS-safe).
function cbEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Bold / italic / inline code / links / math inside one line of ALREADY-ESCAPED text.
function cbInline(escaped) {
    var stash = [];
    function keep(html) { stash.push(html); return '\u0001' + (stash.length - 1) + '\u0002'; }
    var s = escaped;
    s = s.replace(/`([^`\n]+)`/g, function (_, c) { return keep('<code class="cb-inline">' + c + '</code>'); });
    // Math is kept exactly as written so KaTeX can draw it afterwards.
    s = s.replace(/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\s)[^$\n]*?[^\s$]\$(?!\d)|\$[^\s$]\$(?!\d)/g, function (m) { return keep(m); });
    s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, function (_, t, u) {
        return keep('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>');
    });
    s = s.replace(/\*\*([^\s*](?:[^*]*?[^\s*])?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^\w])__([^\s_](?:[^_]*?[^\s_])?)__(?!\w)/g, '$1<strong>$2</strong>');
    s = s.replace(/(^|[^*\w])\*([^\s*](?:[^*]*?[^\s*])?)\*(?![*\w])/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^\w])_([^\s_](?:[^_]*?[^\s_])?)_(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    s = s.replace(/\u0001(\d+)\u0002/g, function (_, i) { return stash[+i]; });
    return s;
}

// Same comma/quote logic CleverMent's own importer (parseTeacherCSV) uses.
function cbSplitCsvLine(line) {
    var cols = [], cur = '', q = false;
    for (var j = 0; j < line.length; j++) {
        var ch = line[j];
        if (ch === '"') { q = !q; cur += ch; }
        else if (ch === ',' && !q) { cols.push(cur); cur = ''; }
        else cur += ch;
    }
    cols.push(cur);
    return cols;
}

// Does this text look like CleverMent question CSV?
function cleverBotLooksLikeCsv(code) {
    var lines = String(code || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length < 2) return false;
    if (/^"?question"?\s*,\s*"?option\s*a/i.test(lines[0])) return true;
    var ok = 0;
    lines.forEach(function (l) {
        var c = cbSplitCsvLine(l);
        if (c.length >= 6 && /^"?\s*[A-Da-d]\s*"?$/.test(c[5].trim())) ok++;
    });
    return ok >= 2 && ok / lines.length >= 0.6;
}

// Makes the CSV safe to import: guarantees the header row (the importer always
// skips line 1), a capital answer letter, and 7 columns. Drops chatter lines.
function cbQuoteCell(v) {
    v = String(v === undefined || v === null ? '' : v).trim();
    if (v.length >= 2 && v.charAt(0) === '"' && v.charAt(v.length - 1) === '"') v = v.slice(1, -1);
    // The importer cannot read a quote inside a quoted cell, so any stray one becomes an apostrophe.
    v = v.replace(/""/g, "'").replace(/"/g, "'").replace(/\s+/g, ' ').trim();
    return '"' + v + '"';
}

function cleverBotNormalizeCsv(code) {
    var HEADER = 'Question,Option A,Option B,Option C,Option D,Correct Answer,';
    var lines = String(code || '').replace(/\r\n?/g, '\n').split('\n')
        .map(function (l) { return l.replace(/\s+$/, ''); })
        .filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return '';
    // Any header-looking line (even one after stray chatter) is replaced by the standard one.
    var body = lines.filter(function (l) { return !/^\s*"?question"?\s*,\s*"?option\s*a/i.test(l); });
    var rows = [];
    body.forEach(function (l) {
        var c = cbSplitCsvLine(l);
        if (c.length < 6) return;
        var ans = c[5].trim().replace(/^"|"$/g, '').trim();
        if (/^[a-d]$/i.test(ans)) ans = ans.toUpperCase();
        // Question + four options always wrapped in double quotes; answer is a bare capital letter.
        var image = c.length > 6 ? c[6].trim().replace(/^"|"$/g, '').trim() : '';
        rows.push([cbQuoteCell(c[0]), cbQuoteCell(c[1]), cbQuoteCell(c[2]), cbQuoteCell(c[3]), cbQuoteCell(c[4]), ans, image].join(','));
    });
    return [HEADER].concat(rows).join('\n');
}

function cbCodeBlock(lang, code, finalize) {
    var csv = lang === 'csv' ? code.split('\n').length >= 2 : cleverBotLooksLikeCsv(code);
    if (csv && finalize) code = cleverBotNormalizeCsv(code);
    var label = csv ? 'CleverMent CSV' : (lang || 'text');
    return '<div class="cb-code' + (csv ? ' cb-csv' : '') + '"><div class="cb-code-head"><span class="cb-lang">' + cbEsc(label) + '</span>' +
        '<span class="cb-actions"><button type="button" class="cb-btn" data-cb="copy">Copy</button>' +
        (csv ? '<button type="button" class="cb-btn" data-cb="download">Download .csv</button>' : '') +
        '</span></div><pre><code>' + cbEsc(code) + '</code></pre></div>';
}

function cbList(items) {
    var html = '', stack = [];
    function open(it) {
        var tag = it.ordered ? 'ol' : 'ul';
        html += '<' + tag + (it.ordered && it.start && it.start !== 1 ? ' start="' + it.start + '"' : '') + '>';
        stack.push({ indent: it.indent, tag: tag });
    }
    items.forEach(function (it) {
        while (stack.length && it.indent < stack[stack.length - 1].indent) html += '</li></' + stack.pop().tag + '>';
        var top = stack[stack.length - 1];
        if (!top || it.indent > top.indent) { open(it); html += '<li>' + cbInline(cbEsc(it.text)); }
        else if (top.tag !== (it.ordered ? 'ol' : 'ul')) { html += '</li></' + stack.pop().tag + '>'; open(it); html += '<li>' + cbInline(cbEsc(it.text)); }
        else html += '</li><li>' + cbInline(cbEsc(it.text));
    });
    while (stack.length) html += '</li></' + stack.pop().tag + '>';
    return html;
}

function cbTableCells(line) {
    var t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return t.split('|').map(function (c) { return c.trim(); });
}

// Turns the assistant's Markdown into safe HTML. opts.final = streaming finished.
function cleverBotRenderMarkdown(raw, opts) {
    opts = opts || {};
    var lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [], i = 0;
    var isBlank = function (l) { return /^\s*$/.test(l); };
    var listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
    var tableSep = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
    function startsBlock(l, next) {
        return /^\s*(```|~~~)/.test(l) || /^\s{0,3}#{1,6}\s+\S/.test(l) || /^\s{0,3}(-{3,}|\*{3,})\s*$/.test(l) ||
            /^\s*>/.test(l) || listRe.test(l) || (l.indexOf('|') !== -1 && next !== undefined && tableSep.test(next));
    }
    while (i < lines.length) {
        var line = lines[i];
        if (isBlank(line)) { i++; continue; }

        var fm = line.match(/^\s*(```|~~~)\s*([\w+#.-]*)\s*$/);
        if (fm) {
            var fence = fm[1], lang = (fm[2] || '').toLowerCase(), buf = [];
            i++;
            while (i < lines.length && lines[i].replace(/\s+$/, '').replace(/^\s+/, '') !== fence) { buf.push(lines[i]); i++; }
            i++;
            out.push(cbCodeBlock(lang, buf.join('\n'), !!opts.final));
            continue;
        }
        var hm = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
        if (hm) { out.push('<div class="cb-h cb-h' + hm[1].length + '">' + cbInline(cbEsc(hm[2])) + '</div>'); i++; continue; }
        if (/^\s{0,3}(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
        if (/^\s*>/.test(line)) {
            var q = [];
            while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
            out.push('<blockquote>' + q.map(function (l) { return cbInline(cbEsc(l)); }).join('<br>') + '</blockquote>');
            continue;
        }
        if (line.indexOf('|') !== -1 && i + 1 < lines.length && tableSep.test(lines[i + 1])) {
            var head = cbTableCells(line); i += 2;
            var rowsHtml = '';
            while (i < lines.length && lines[i].indexOf('|') !== -1 && !isBlank(lines[i])) {
                rowsHtml += '<tr>' + cbTableCells(lines[i]).map(function (c) { return '<td>' + cbInline(cbEsc(c)) + '</td>'; }).join('') + '</tr>'; i++;
            }
            out.push('<div class="cb-table-wrap"><table><thead><tr>' + head.map(function (c) { return '<th>' + cbInline(cbEsc(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>');
            continue;
        }
        var lm = line.match(listRe);
        if (lm) {
            var items = [];
            while (i < lines.length) {
                var m2 = lines[i].match(listRe);
                if (m2) {
                    var ordered = /\d/.test(m2[2]);
                    items.push({ indent: m2[1].replace(/\t/g, '    ').length, ordered: ordered, start: ordered ? parseInt(m2[2], 10) : 0, text: m2[3] });
                    i++;
                } else if (!isBlank(lines[i]) && /^\s{2,}\S/.test(lines[i]) && items.length) {
                    items[items.length - 1].text += ' ' + lines[i].trim(); i++;
                } else break;
            }
            out.push(cbList(items));
            continue;
        }
        var para = [];
        while (i < lines.length && !isBlank(lines[i]) && !(para.length && startsBlock(lines[i], lines[i + 1]))) { para.push(lines[i]); i++; }
        out.push('<p>' + para.map(function (l) { return cbInline(cbEsc(l)); }).join('<br>') + '</p>');
    }
    return out.join('');
}

// What the Copy button should copy: if the whole reply is one code block
// (e.g. the CSV), copy ONLY the code - never the ``` marks.
function cleverBotCopyValue(raw) {
    var t = String(raw || '').trim();
    var m = t.match(/^(```|~~~)[\w+#.-]*\s*\n([\s\S]*?)\n\s*\1\s*$/);
    if (m) {
        var inner = m[2];
        return cleverBotLooksLikeCsv(inner) ? cleverBotNormalizeCsv(inner) : inner;
    }
    return t;
}

// ============================================================
// CLEVERBOT - floating answer-only AI assistant
// ============================================================
(function initCleverBot(){
    var floatBtn = document.getElementById('cleverBotFloat');
    var panel = document.getElementById('cleverBotPanel');
    var closeBtn = document.getElementById('cleverBotClose');
    var messages = document.getElementById('cleverBotMessages');
    var input = document.getElementById('cleverBotInput');
    var sendBtn = document.getElementById('cleverBotSend');
    var attachBtn = document.getElementById('cleverBotAttach');
    var fileInput = document.getElementById('cleverBotFileInput');
    var micBtn = document.getElementById('cleverBotMic');
    var attachBox = document.getElementById('cleverBotAttachments');
    if (!floatBtn || !panel || !messages || !input) return;

    // One robot icon for the floating button and the chat header (replaces the old dark oval / sparkle).
    var BOT_ICON_SVG = '<svg viewBox="0 0 32 32" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M16 8V5"/><circle cx="16" cy="3.8" r="1.6" fill="#fff" stroke="none"/>' +
        '<rect x="6" y="8" width="20" height="15" rx="5"/>' +
        '<circle cx="12" cy="15" r="2" fill="#fff" stroke="none"/><circle cx="20" cy="15" r="2" fill="#fff" stroke="none"/>' +
        '<path d="M12.5 19.3c1 .8 2.2 1.2 3.5 1.2s2.5-.4 3.5-1.2"/>' +
        '<path d="M3 14v5M29 14v5"/></svg>';
    floatBtn.innerHTML = BOT_ICON_SVG;
    var headerAvatar = panel.querySelector('.cleverbot-avatar');
    if (headerAvatar) headerAvatar.innerHTML = BOT_ICON_SVG;

    var botHistory = [];
    var pendingFiles = [];
    var recorder = null;
    var audioChunks = [];
    var drag = { active:false, moved:false, dx:0, dy:0 };

    function addMessage(text, role) {
        var el = document.createElement('div');
        el.className = 'cleverbot-msg ' + (role || 'bot');

        if (role === 'bot') {
            var body = document.createElement('div');
            body.className = 'cleverbot-msg-body';
            body.textContent = text;
            el.appendChild(body);

            var copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'cleverbot-copy';
            copyBtn.setAttribute('aria-label', 'Copy CleverBot response');
            copyBtn.title = 'Copy entire response';
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg><span>Copy</span>';
            copyBtn.addEventListener('click', function(){
                var value = String(text || '');
                function copied(){
                    copyBtn.classList.add('copied');
                    copyBtn.querySelector('span').textContent = 'Copied';
                    setTimeout(function(){
                        copyBtn.classList.remove('copied');
                        copyBtn.querySelector('span').textContent = 'Copy';
                    }, 1400);
                }
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(value).then(copied).catch(function(){ fallbackCopy(value, copied); });
                } else {
                    fallbackCopy(value, copied);
                }
            });
            el.appendChild(copyBtn);
        } else {
            el.textContent = text;
        }

        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
        if (role === 'user' || role === 'bot') botHistory.push({ role: role === 'bot' ? 'assistant' : 'user', text: text });
        return el;
    }

    function fallbackCopy(text, done) {
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        try { document.execCommand('copy'); if (done) done(); } catch (e) {}
        document.body.removeChild(area);
    }
    function addTyping(){
        var el=document.createElement('div'); el.className='cleverbot-msg bot'; el.id='cleverBotTyping';
        el.innerHTML='<span class="cleverbot-typing-label">Typing</span><span class="cleverbot-typing"><span></span><span></span><span></span></span>'; messages.appendChild(el); messages.scrollTop=messages.scrollHeight; return el;
    }

    function cleanBotText(text){
        // Formatting is now rendered properly, so nothing is stripped here.
        // (Stripping "__" used to destroy fill-in blanks such as _____ .)
        return String(text || '');
    }
    // Draws equations (KaTeX) inside a chat reply. Code blocks such as the CSV box are skipped automatically.
    function cbRenderMath(el){
        if (typeof renderMathInElement !== 'function') return;
        try {
            renderMathInElement(el, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        } catch (e) {}
    }
    function renderBotBody(target, text, final){
        target.raw = text;
        target.body.classList.add('md');
        target.body.innerHTML = cleverBotRenderMarkdown(text, { final: !!final });
        clearTimeout(target.mathTimer);
        if (final) cbRenderMath(target.body);
        else target.mathTimer = setTimeout(function(){ cbRenderMath(target.body); }, 400);
    }
    function copyText(value, done){
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done).catch(function(){ fallbackCopy(value, done); });
        else fallbackCopy(value, done);
    }
    function createStreamingMessage(){
        var el=document.createElement('div'); el.className='cleverbot-msg bot';
        var body=document.createElement('div'); body.className='cleverbot-msg-body'; body.textContent=''; el.appendChild(body);
        var copyBtn=document.createElement('button'); copyBtn.type='button'; copyBtn.className='cleverbot-copy';
        copyBtn.setAttribute('aria-label','Copy CleverBot response'); copyBtn.title='Copy entire response';
        copyBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg><span>Copy</span>';
        copyBtn.style.display='none';
        var streamTarget={el:el, body:body, copyBtn:copyBtn, raw:''};
        copyBtn.addEventListener('click',function(){
            var value=cleverBotCopyValue(streamTarget.raw || body.textContent || '');
            function copied(){ copyBtn.classList.add('copied'); copyBtn.querySelector('span').textContent='Copied'; setTimeout(function(){copyBtn.classList.remove('copied');copyBtn.querySelector('span').textContent='Copy';},1400); }
            if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(copied).catch(function(){fallbackCopy(value,copied);}); else fallbackCopy(value,copied);
        });
        el.appendChild(copyBtn); messages.appendChild(el); messages.scrollTop=messages.scrollHeight;
        return streamTarget;
    }

    // The AI can stream data to the backend in chunks, but a hosting proxy can
    // sometimes deliver several chunks together. We therefore render the
    // received text through a small client-side typewriter queue as well. This
    // guarantees that CleverBot visibly "types" its answer even when the
    // network hands the browser a whole response at once.
    function createTextStreamer(target){
        var queue='';
        var displayed='';
        var timer=null;
        var finished=false;
        var resolveDone;
        var donePromise=new Promise(function(resolve){ resolveDone=resolve; });
        var speed=12; // characters per tick; visibly progressive without feeling slow

        function tick(){
            if (queue.length > 0) {
                var take=Math.min(speed, queue.length);
                displayed += queue.slice(0,take);
                queue = queue.slice(take);
                renderBotBody(target, cleanBotText(displayed), false);
                messages.scrollTop=messages.scrollHeight;
                timer=setTimeout(tick, 22);
                return;
            }
            timer=null;
            if (finished) finish();
        }
        function push(text){
            queue += cleanBotText(text || '');
            if (!timer) tick();
        }
        function finish(){
            finished=true;
            if (queue.length > 0) {
                if (!timer) tick();
                return;
            }
            renderBotBody(target, cleanBotText(displayed).trim(), true);
            renderMathIn(target.body);
            if (target.copyBtn) target.copyBtn.style.display = target.raw ? 'inline-flex' : 'none';
            if (resolveDone) { var r=resolveDone; resolveDone=null; r(cleanBotText(displayed).trim()); }
        }
        function getText(){ return cleanBotText(displayed).trim(); }
        return {push:push, finish:finish, getText:getText, done:donePromise};
    }

    async function consumeCleverBotStream(res, target, onActivity){
        if(!res.ok){
            var errorText=await res.text();
            var errorMsg='CleverBot is temporarily unavailable.';
            try { var parsed=JSON.parse(errorText); errorMsg=parsed.error||errorMsg; } catch(e) { if(errorText) errorMsg=errorText; }
            throw new Error(errorMsg);
        }
        var reader=res.body && res.body.getReader ? res.body.getReader() : null;
        if(!reader){ throw new Error('This browser does not support streamed CleverBot responses.'); }
        var decoder=new TextDecoder('utf-8'); var buffer='';
        var streamer=createTextStreamer(target);
        while(true){
            var part=await reader.read();
            if(onActivity) onActivity();
            if(part.done) break;
            buffer += decoder.decode(part.value,{stream:true});
            var events=buffer.split(/\r?\n\r?\n/); buffer=events.pop()||'';
            events.forEach(function(event){
                event.split(/\r?\n/).forEach(function(line){
                    if(line.indexOf('data:')!==0) return;
                    var raw=line.slice(5).trim(); if(!raw) return;
                    try{
                        var obj=JSON.parse(raw);
                        if(obj.error) throw new Error(obj.error);
                        if(obj.status){
                            if(!target.statusEl){ target.statusEl=document.createElement('div'); target.statusEl.className='cleverbot-status'; target.el.insertBefore(target.statusEl, target.copyBtn); }
                            target.statusEl.textContent=obj.status; target.statusEl.dataset.temp=obj.temp?'1':'';
                            messages.scrollTop=messages.scrollHeight;
                        }
                        if(obj.text){
                            if(target.statusEl && target.statusEl.dataset.temp==='1'){ target.statusEl.parentNode && target.statusEl.parentNode.removeChild(target.statusEl); target.statusEl=null; }
                            streamer.push(obj.text);
                        }
                    }catch(e){ if(e && e.message && !/Unexpected token|JSON/.test(e.message)) throw e; }
                });
            });
        }
        buffer += decoder.decode();
        if(buffer.indexOf('data:')===0){
            try{
                var obj=JSON.parse(buffer.slice(5).trim());
                if(obj.error) throw new Error(obj.error);
                if(obj.text) streamer.push(obj.text);
            }catch(e){ if(e && e.message && !/Unexpected token|JSON/.test(e.message)) throw e; }
        }
        if(target.statusEl && target.statusEl.parentNode){ target.statusEl.parentNode.removeChild(target.statusEl); target.statusEl=null; }
        streamer.finish();
        // Do not expose the Copy button until the visible typewriter animation
        // has finished. This also ensures the final text is what gets copied.
        return await streamer.done;
    }
    function isStudentAssessment(){
        var assessment = document.getElementById('studentAssessmentView');
        var quiz = document.getElementById('studentQuizSection');
        return (assessment && getComputedStyle(assessment).display !== 'none') || (quiz && getComputedStyle(quiz).display !== 'none');
    }
    function updateVisibility(){
        var hidden = isStudentAssessment();
        // Students taking an assessment must not be distracted: hide the WhatsApp button (see style.css).
        document.body.classList.toggle('cb-assessment-active', !!hidden);
        floatBtn.style.display = hidden ? 'none' : 'flex';
        floatBtn.style.pointerEvents = hidden ? 'none' : 'auto';
        floatBtn.setAttribute('aria-hidden', hidden ? 'true' : 'false');
        if (hidden) {
            panel.hidden = true;
            panel.style.pointerEvents = 'none';
        } else {
            panel.style.pointerEvents = 'auto';
        }
    }
    function getContext(){
        var page = new URLSearchParams(window.location.search).get('page') || 'landing';
        var parts = ['Page: ' + page];
        var active = document.querySelector('.dash-section.active, .dashboard-section.active, [data-active="true"]');
        if (active) parts.push('Visible section: ' + (active.getAttribute('id') || active.textContent.slice(0,200)));
        var heading = document.querySelector('#teacherDashboardName, #adminDashboardName');
        if (heading && heading.textContent) parts.push('Dashboard greeting: ' + heading.textContent);
        var visible = document.querySelector('#teacherDashboard, #adminDashboard');
        if (visible && getComputedStyle(visible).display !== 'none') {
            var text = visible.innerText || '';
            parts.push('Current dashboard text excerpt: ' + text.replace(/\s+/g,' ').slice(0,3000));
        }
        return parts.join('\n');
    }
    var lastWarmPing=0;
    function openBot(){
        if (isStudentAssessment()) return;
        panel.hidden=false;
        if (Date.now()-lastWarmPing>240000) { lastWarmPing=Date.now(); try { fetch(BACKEND_URL+'/',{mode:'no-cors',cache:'no-store'}).catch(function(){}); } catch(e){} }
        if (!messages.dataset.greeted) {
            addMessage('Hello! 👋 I’m CleverBot, your CleverMent assistant. How can I be of help today?', 'bot');
            messages.dataset.greeted='1';
        }
        setTimeout(function(){ input.focus(); }, 50);
    }
    function closeBot(){ panel.hidden=true; }
    floatBtn.addEventListener('click', function(){ if (!drag.moved) openBot(); });
    closeBtn.addEventListener('click', closeBot);

    function renderAttachments(){
        attachBox.innerHTML='';
        if (!pendingFiles.length){ attachBox.hidden=true; return; }
        attachBox.hidden=false;
        pendingFiles.forEach(function(f,i){
            var chip=document.createElement('span'); chip.className='cleverbot-attachment-chip';
            chip.textContent=(f.name||'Attachment').slice(0,28);
            var x=document.createElement('button'); x.type='button'; x.textContent='×'; x.setAttribute('aria-label','Remove attachment');
            x.onclick=function(){ pendingFiles.splice(i,1); renderAttachments(); };
            chip.appendChild(x); attachBox.appendChild(chip);
        });
    }
    function fileToBase64(file){
        return new Promise(function(resolve,reject){
            var r=new FileReader(); r.onload=function(){ resolve(String(r.result).split(',')[1] || ''); }; r.onerror=reject; r.readAsDataURL(file);
        });
    }

    async function extractPdfText(file){
        if (!window.pdfjsLib) return '';
        var buffer = await file.arrayBuffer();
        var pdf = await window.pdfjsLib.getDocument({data: buffer}).promise;
        var chunks = [];
        var maxChars = 1400000;
        for (var pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
            var page = await pdf.getPage(pageNo);
            var content = await page.getTextContent();
            var pageText = content.items.map(function(item){ return item.str || ''; }).join(' ');
            if (pageText.trim()) chunks.push('PAGE ' + pageNo + '\n' + pageText.trim());
            if (chunks.join('\n\n').length >= maxChars) break;
        }
        return chunks.join('\n\n').slice(0, maxChars);
    }
    // Renders the first pages of a PDF to JPEG pictures (used for scanned PDFs).
    async function renderPdfPages(file, maxPages){
        if (!window.pdfjsLib) return [];
        var buffer = await file.arrayBuffer();
        var pdf = await window.pdfjsLib.getDocument({data: buffer}).promise;
        var out = [];
        var total = Math.min(pdf.numPages, maxPages || 10);
        for (var n = 1; n <= total; n++) {
            var page = await pdf.getPage(n);
            var base = page.getViewport({scale: 1});
            var scale = Math.min(2, 1600 / Math.max(base.width, base.height));
            var vp = page.getViewport({scale: scale});
            var canvas = document.createElement('canvas');
            canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
            await page.render({canvasContext: canvas.getContext('2d'), viewport: vp}).promise;
            var dataUrl = canvas.toDataURL('image/jpeg', 0.72);
            out.push({name: file.name + ' (page ' + n + ')', mimeType: 'image/jpeg', data: dataUrl.split(',')[1]});
            canvas.width = 0; canvas.height = 0;
        }
        return out;
    }
    fileInput.addEventListener('change', function(){
        var files=Array.prototype.slice.call(fileInput.files||[]);
        files.forEach(function(f){
            if (pendingFiles.length>=4) return;
            if (f.size>8*1024*1024) { addMessage('I could not attach “'+f.name+'” because it is larger than 8 MB.','system'); return; }
            pendingFiles.push(f);
        });
        fileInput.value=''; renderAttachments();
    });
    attachBtn.addEventListener('click', function(){ fileInput.click(); });

    // Copy / Download buttons inside code blocks (one listener for all messages).
    messages.addEventListener('click', function(e){
        var btn = e.target && e.target.closest ? e.target.closest('[data-cb]') : null;
        if (!btn) return;
        var box = btn.closest('.cb-code');
        var codeEl = box && box.querySelector('pre code');
        if (!codeEl) return;
        var code = codeEl.textContent || '';
        var label = btn.textContent;
        function flash(text){
            btn.textContent = text;
            setTimeout(function(){ btn.textContent = label; }, 1400);
        }
        if (btn.getAttribute('data-cb') === 'download') {
            var csv = cleverBotNormalizeCsv(code);
            var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'cleverment_questions_' + new Date().toISOString().slice(0,10) + '.csv';
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            setTimeout(function(){ URL.revokeObjectURL(link.href); }, 1500);
            flash('Downloaded');
            return;
        }
        var value = btn.closest('.cb-csv') ? cleverBotNormalizeCsv(code) : code;
        copyText(value, function(){ flash('Copied'); });
    });

    // Reads the text out of Word / PowerPoint / Excel / text files in the browser,
    // because the AI service cannot open those formats directly.
    async function extractFileText(file){
        var name = (file.name || '').toLowerCase();
        if (/\.(txt|csv|md|json)$/.test(name) || /^text\//.test(file.type || '')) return await file.text();
        var buffer = await file.arrayBuffer();
        if (/\.(xlsx|xls)$/.test(name)) {
            if (!window.XLSX) return '';
            var wb = window.XLSX.read(buffer, { type: 'array' });
            return wb.SheetNames.map(function(n){ return 'SHEET ' + n + '\n' + window.XLSX.utils.sheet_to_csv(wb.Sheets[n]); }).join('\n\n');
        }
        if (!window.JSZip) return '';
        var zip = await window.JSZip.loadAsync(buffer);
        function xmlToText(xml, paragraphEnd){
            return xml.replace(paragraphEnd, '\n').replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n').replace(/<\/w:tc>/g, '\t')
                .replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
        }
        if (/\.docx$/.test(name)) {
            var doc = zip.file('word/document.xml');
            if (!doc) return '';
            return xmlToText(await doc.async('string'), /<\/w:p>/g).replace(/\n{3,}/g, '\n\n');
        }
        if (/\.pptx$/.test(name)) {
            var slideNames = Object.keys(zip.files).filter(function(k){ return /^ppt\/slides\/slide\d+\.xml$/.test(k); })
                .sort(function(a, b){ return parseInt(a.match(/(\d+)\.xml/)[1], 10) - parseInt(b.match(/(\d+)\.xml/)[1], 10); });
            var parts = [];
            for (var si = 0; si < slideNames.length; si++) {
                var slideXml = await zip.file(slideNames[si]).async('string');
                var slideText = xmlToText(slideXml, /<\/a:p>/g).replace(/\n{3,}/g, '\n\n').trim();
                if (slideText) parts.push('SLIDE ' + (si + 1) + '\n' + slideText);
            }
            return parts.join('\n\n');
        }
        return '';
    }
    var lastAttachments = null; // the most recent file(s), kept so follow-ups like "10 more" still see them
    var FOLLOW_UP_RE = /\b(file|files|image|picture|photo|document|doc|pdf|attached|attachment|above|same|more|another|again|next|rest|remaining|previous|earlier|format|csv|questions?|mcqs?|redo|regenerate|replace|change|fix|harder|easier|summar\w*|explain|this|that|these|those|it|them|page|chapter|slide|diagram|figure|table)\b/i;

    async function sendMessage(){
        var text=input.value.trim();
        if (!text && !pendingFiles.length) return;
        var files=pendingFiles.slice(); pendingFiles=[]; renderAttachments();
        if (text) addMessage(text,'user');
        files.forEach(function(f){ addMessage('📎 '+f.name,'user'); });
        input.value=''; input.style.height='auto'; sendBtn.disabled=true;
        var typing=addTyping();
        var streamMessage=null;
        var coldTimer=null, hardTimer=null, watchdog=null, lastActivity=Date.now();
        var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
        try {
            var attachments=[];
            var totalRawBytes=0;
            for (var i=0;i<files.length;i++) {
                var file=files[i];
                totalRawBytes += file.size || 0;
                if (totalRawBytes > 16*1024*1024) {
                    throw new Error('The attached files are too large together. Please attach one file at a time or use smaller files.');
                }
                var mime=file.type||'application/octet-stream';
                if (mime === 'application/pdf' || /\.pdf$/i.test(file.name||'')) {
                    var pdfText='';
                    try { pdfText=await extractPdfText(file); } catch (pdfErr) { pdfText=''; }
                    if (pdfText.trim()) {
                        attachments.push({name:file.name,mimeType:'text/plain',text:pdfText});
                        continue;
                    }
                    // No selectable text (a scan or photo): read the pages as pictures instead.
                    addMessage('“'+file.name+'” has no selectable text, so I am reading its pages as pictures.','system');
                    var pageImages=[];
                    try { pageImages=await renderPdfPages(file,10); } catch (renderErr) { pageImages=[]; }
                    if (pageImages.length) { pageImages.forEach(function(p){ attachments.push(p); }); continue; }
                    addMessage('I could not read “'+file.name+'”. Please try a smaller file, or attach photos (JPG/PNG) of the pages.','system');
                    continue;
                }
                var lowerName=(file.name||'').toLowerCase();
                if (/\.(docx|pptx|xlsx|xls|txt|csv|md|json)$/.test(lowerName) || mime==='text/plain' || mime==='text/csv') {
                    var fileText='';
                    try { fileText=await extractFileText(file); } catch (extractErr) { fileText=''; }
                    if (fileText.trim()) attachments.push({name:file.name,mimeType:'text/plain',text:fileText.slice(0,1000000)});
                    else addMessage('I could not find any readable text in “'+file.name+'”. If it is a scan or only pictures, please attach it as a PDF or image instead.','system');
                    continue;
                }
                if (/\.(doc|ppt)$/.test(lowerName)) {
                    addMessage('“'+file.name+'” is an old Word/PowerPoint format that I cannot read. Please save it as .docx / .pptx or PDF and attach it again.','system');
                    continue;
                }
                if (mime==='application/octet-stream' || !mime) {
                    var guess={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',heic:'image/heic',heif:'image/heif'}[(lowerName.split('.').pop()||'')];
                    if (guess) mime=guess;
                }
                if (!(/^image\//.test(mime) || mime==='application/pdf')) {
                    addMessage('I cannot read “'+file.name+'” (unsupported file type). Please attach a PDF, image, Word, PowerPoint, Excel or text file.','system');
                    continue;
                }
                attachments.push({name:file.name,mimeType:mime,data:await fileToBase64(file)});
            }
            // Keep the file for follow-up messages ("now give me 10 more"), re-sending it when the new message refers to it.
            if (attachments.length) {
                lastAttachments={items:attachments.slice(), names:files.map(function(f){return f.name;})};
            } else if (lastAttachments && lastAttachments.items.length && text && FOLLOW_UP_RE.test(text)) {
                var binaryChars=0;
                lastAttachments.items.forEach(function(it){ if (it.data) binaryChars += it.data.length; });
                var reusable=lastAttachments.items.filter(function(it){ return binaryChars <= 12000000 || !it.data; });
                if (reusable.length) {
                    attachments=reusable.slice();
                    addMessage('Using your earlier file: '+lastAttachments.names.join(', '),'system');
                }
            }
            if (!attachments.length && !text) {
                if (typing.parentNode) typing.parentNode.removeChild(typing);
                return;
            }
            var history=botHistory.slice(-20);
            history=history.filter(function(h){ return !(h.role==='user' && /^📎 /.test(h.text)); });
            coldTimer=setTimeout(function(){ var l=typing.querySelector('.cleverbot-typing-label'); if(l) l.textContent='Waking up the server (can take up to a minute)'; },6000);
            if (ctrl) hardTimer=setTimeout(function(){ ctrl.abort(); },300000);
            var res=await fetch(BACKEND_URL+'/api/cleverbot/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:history,context:getContext(),attachments:attachments}),signal:ctrl?ctrl.signal:undefined});
            clearTimeout(coldTimer);
            if (typing.parentNode) typing.parentNode.removeChild(typing);
            streamMessage=createStreamingMessage();
            // The server sends a heartbeat every second; 30 seconds of total silence means the connection died.
            lastActivity=Date.now();
            watchdog=setInterval(function(){ if(Date.now()-lastActivity>30000 && ctrl) ctrl.abort(); },5000);
            var reply=await consumeCleverBotStream(res,streamMessage,function(){ lastActivity=Date.now(); });
            if(!reply){ streamMessage.el.parentNode && streamMessage.el.parentNode.removeChild(streamMessage.el); addMessage('I’m sorry, I could not generate a response.','bot'); }
            else botHistory.push({role:'assistant',text:reply});
        } catch(e){
            if (typing.parentNode) typing.parentNode.removeChild(typing);
            if(streamMessage && streamMessage.el.parentNode) streamMessage.el.parentNode.removeChild(streamMessage.el);
            var shown=(e && e.name==='AbortError') ? 'CleverBot took too long to respond. Please try again.' : (e.message||'I could not connect to CleverBot right now. Please check your internet connection and try again.');
            addMessage(shown,'bot');
        } finally { clearTimeout(coldTimer); clearTimeout(hardTimer); clearInterval(watchdog); sendBtn.disabled=false; input.focus(); }
    }
    sendBtn.addEventListener('click',sendMessage);
    input.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} });
    input.addEventListener('input',function(){ input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,100)+'px'; });

    // Voice input uses the browser's built-in speech recognition (no server or AI key involved).
    var micIdleHtml = micBtn.innerHTML;
    var micStopHtml = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/></svg>';
    var recognition = null, recognizing = false;
    micBtn.addEventListener('click', function(){
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { addMessage('Voice input is not supported by this browser. Please type your message, or try Google Chrome.','system'); return; }
        if (recognizing && recognition) { recognition.stop(); return; }
        recognition = new SR();
        recognition.lang = navigator.language || 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;
        var heard = '';
        recognition.onstart = function(){ recognizing = true; micBtn.classList.add('recording'); micBtn.innerHTML = micStopHtml; };
        recognition.onresult = function(e){
            var t = '';
            for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
            heard = t; input.value = t;
            input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        };
        recognition.onerror = function(e){
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') addMessage('Microphone access was not granted. Please allow microphone access and try again.','system');
            else if (e.error !== 'aborted' && e.error !== 'no-speech') addMessage('I could not recognize the speech. Please try again.','system');
        };
        recognition.onend = function(){
            recognizing = false; micBtn.classList.remove('recording'); micBtn.innerHTML = micIdleHtml;
            if (heard.trim()) sendMessage();
        };
        try { recognition.start(); } catch (err) { recognizing = false; }
    });

    // Draggable floating icon; position persists locally.
    function restorePosition(){
        try{var p=JSON.parse(localStorage.getItem('cleverbot_float_position'));if(p&&typeof p.left==='number'&&typeof p.top==='number'){floatBtn.style.left=p.left+'px';floatBtn.style.top=p.top+'px';floatBtn.style.right='auto';floatBtn.style.bottom='auto';}}catch(e){}
    }
    function savePosition(){localStorage.setItem('cleverbot_float_position',JSON.stringify({left:parseFloat(floatBtn.style.left),top:parseFloat(floatBtn.style.top)}));}
    function beginDrag(e){
        drag.active=true;drag.moved=false;var r=floatBtn.getBoundingClientRect();drag.dx=(e.clientX-r.left);drag.dy=(e.clientY-r.top);floatBtn.setPointerCapture(e.pointerId);
    }
    function moveDrag(e){
        if(!drag.active)return;var x=e.clientX-drag.dx,y=e.clientY-drag.dy;var maxX=window.innerWidth-floatBtn.offsetWidth,maxY=window.innerHeight-floatBtn.offsetHeight;x=Math.max(4,Math.min(x,maxX-4));y=Math.max(4,Math.min(y,maxY-4));if(Math.abs(e.movementX)+Math.abs(e.movementY)>2)drag.moved=true;floatBtn.style.left=x+'px';floatBtn.style.top=y+'px';floatBtn.style.right='auto';floatBtn.style.bottom='auto';
    }
    function endDrag(){if(!drag.active)return;drag.active=false;if(drag.moved)savePosition();setTimeout(function(){drag.moved=false;},0);}
    floatBtn.addEventListener('pointerdown',beginDrag);floatBtn.addEventListener('pointermove',moveDrag);floatBtn.addEventListener('pointerup',endDrag);floatBtn.addEventListener('pointercancel',endDrag);
    restorePosition(); updateVisibility();
    setInterval(updateVisibility,700);
})();


// ============================================================
// STUDENT: PROGRESS, CERTIFICATES, STUDY, MESSAGES, PROFILE
// ============================================================
var saMe = null;
function stAuth() { return { 'Authorization': 'Bearer ' + localStorage.getItem('cleverment_student_token') }; }
function stScored() { return (saDone || []).filter(function(x) { return x.score !== null && x.score !== undefined; }); }

function renderStudentProgress() {
    var el = document.getElementById('saPanelProgress');
    var list = stScored().slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
    if (!list.length) { el.innerHTML = '<h2>My Progress</h2><p class="helper-text">Your progress will appear after you complete an assessment whose results are available.</p>'; return; }
    var sum = 0, pass = 0, subj = {};
    list.forEach(function(x) { sum += Number(x.score); if (x.passed) pass++; var k = x.subject || 'Other'; (subj[k] = subj[k] || []).push(Number(x.score)); });
    var avg = Math.round(sum / list.length), rate = Math.round(pass / list.length * 100);
    var W = 320, H = 140, pad = 22, pts = list.map(function(x, i) { return [list.length === 1 ? W / 2 : pad + i * (W - 2 * pad) / (list.length - 1), H - pad - (Number(x.score) / 100) * (H - 2 * pad)]; });
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:520px;background:#fff;border:1.5px solid #eef2f6;border-radius:12px;">' +
        '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#cfd8e6"/><line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (H - pad) + '" stroke="#cfd8e6"/>' +
        '<polyline fill="none" stroke="#2d6cdf" stroke-width="2.5" points="' + pts.map(function(q) { return q[0] + ',' + q[1]; }).join(' ') + '"/>' +
        pts.map(function(q, i) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.5" fill="#2d6cdf"><title>' + escapeHtml(list[i].subject) + ': ' + list[i].score + '%</title></circle>'; }).join('') +
        '<text x="4" y="' + (pad + 4) + '" font-size="10" fill="#6b7a8f">100</text><text x="8" y="' + (H - pad + 4) + '" font-size="10" fill="#6b7a8f">0</text></svg>';
    var bars = Object.keys(subj).map(function(k) {
        var a = Math.round(subj[k].reduce(function(x, y) { return x + y; }, 0) / subj[k].length);
        return '<div style="margin:8px 0;"><div style="display:flex;justify-content:space-between;font-size:14px;"><b>' + escapeHtml(k) + '</b><span>' + a + '%</span></div><div class="cm-bar"><i style="width:' + a + '%"></i></div></div>';
    }).join('');
    el.innerHTML = '<h2>My Progress</h2><div class="cm-stat-row"><div class="cm-stat"><span>Average score</span><strong>' + avg + '%</strong></div><div class="cm-stat"><span>Pass rate</span><strong>' + rate + '%</strong></div><div class="cm-stat"><span>Assessments</span><strong>' + list.length + '</strong></div></div>' +
        '<h3 style="margin:6px 0;">Score trend</h3>' + svg + '<h3 style="margin:16px 0 4px;">Average by subject</h3>' + bars;
}

function renderStudentCerts() {
    var el = document.getElementById('saPanelCerts');
    var list = (saDone || []).filter(function(x) { return x.canReview && x.code; });
    if (!list.length) { el.innerHTML = '<h2>Certificates</h2><p class="helper-text">Certificates for your completed assessments will appear here.</p>'; return; }
    el.innerHTML = '<h2 style="margin:0 0 6px;">Certificates</h2><p class="helper-text" style="margin:0 0 8px;">Download the certificate for any assessment you completed.</p>' + list.map(function(x) {
        var when = x.date ? new Date(x.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        var c = escapeHtml(String(x.code)).replace(/'/g, '');
        return '<div class="sa-card"><div><b>' + escapeHtml(x.subject) + '</b><div class="helper-text">' + escapeHtml(when) + ' · ' + x.score + '%</div></div><div class="sa-card-actions"><button type="button" class="secondary-btn" onclick="studentCertDownload(\'' + c + '\',\'pdf\')">PDF</button><button type="button" class="secondary-btn" onclick="studentCertDownload(\'' + c + '\',\'image\')">Image</button></div></div>';
    }).join('');
}
async function studentCertDownload(code, kind) {
    try {
        var r = await fetch(BACKEND_URL + '/api/student/result/' + encodeURIComponent(code), { headers: stAuth() });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load the certificate.');
        saReviewData = d;
        studentHistoryDownload(kind);
    } catch (e) { alert(e.message); }
}

var STUDY_TIPS = ['Study in short sessions (20-30 minutes) with a 5-minute break.', 'After each assessment, read the corrections and try the questions you missed again.', 'Explain a topic aloud in your own words. If you get stuck, that is what to revise.', 'Practise a little every day instead of cramming the night before.', 'Sleep well and eat before an assessment; a rested brain recalls more.', 'Read each question twice before choosing an answer, and manage your time.'];
var studyCards = [], studyIdx = 0;
function renderStudentStudy() {
    var el = document.getElementById('saPanelStudy');
    var weak = '';
    var sc = {}; stScored().forEach(function(x) { (sc[x.subject] = sc[x.subject] || []).push(Number(x.score)); });
    var worst = null, wa = 101; Object.keys(sc).forEach(function(k) { var a = sc[k].reduce(function(p, q) { return p + q; }, 0) / sc[k].length; if (a < wa) { wa = a; worst = k; } });
    if (worst) weak = '<div class="cm-tip"><b>Focus area:</b> your lowest average is in ' + escapeHtml(worst) + ' (' + Math.round(wa) + '%). Spend a little extra time there.</div>';
    el.innerHTML = '<h2>Study &amp; Practice</h2>' + weak + '<h3 style="margin:14px 0 4px;">Study tips</h3>' + STUDY_TIPS.map(function(t) { return '<div class="cm-tip">' + escapeHtml(t) + '</div>'; }).join('') +
        '<h3 style="margin:16px 0 4px;">Practise my mistakes</h3><p class="helper-text">Questions you got wrong in past assessments. Try to answer, then check.</p><button type="button" class="primary-btn" onclick="studyStart()">Start practice</button><div id="studyHost"></div>';
}
async function studyStart() {
    var host = document.getElementById('studyHost');
    host.innerHTML = '<p class="helper-text">Loading your questions...</p>';
    var recent = (saDone || []).filter(function(x) { return x.canReview && x.code; }).slice(0, 6);
    var all = [];
    await Promise.all(recent.map(function(x) {
        return fetch(BACKEND_URL + '/api/student/result/' + encodeURIComponent(x.code), { headers: stAuth() }).then(function(r) { return r.ok ? r.json() : null; }).then(function(d) {
            if (d && Array.isArray(d.corrections)) d.corrections.forEach(function(c) { if (!c.isCorrect && c.question) all.push({ subject: d.subject, q: c.question, a: c.correctAnswerText, why: c.explanation || '' }); });
        }).catch(function() {});
    }));
    if (!all.length) { host.innerHTML = '<p class="helper-text">No mistakes to practise yet. Great job, or complete more assessments first.</p>'; return; }
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = all[i]; all[i] = all[j]; all[j] = t; }
    studyCards = all.slice(0, 10); studyIdx = 0; studyShow(false);
}
function studyShow(reveal) {
    var host = document.getElementById('studyHost');
    if (studyIdx >= studyCards.length) { host.innerHTML = '<div class="cm-flash"><b>Practice complete!</b><br><button type="button" class="primary-btn" style="margin-top:8px;" onclick="studyStart()">Practise again</button></div>'; return; }
    var c = studyCards[studyIdx];
    host.innerHTML = '<div class="cm-flash"><div class="helper-text">' + escapeHtml(c.subject || '') + ' · ' + (studyIdx + 1) + ' of ' + studyCards.length + '</div><p>' + c.q + '</p>' +
        (reveal ? '<p>Correct answer: <b style="color:#2d9c5c">' + c.a + '</b></p>' + (c.why ? '<div class="explain">' + escapeHtml(c.why) + '</div>' : '') + '<button type="button" class="primary-btn" onclick="studyIdx++;studyShow(false)">Next</button>' : '<button type="button" class="secondary-btn" onclick="studyShow(true)">Show answer</button>') + '</div>';
    if (typeof renderMathIn === 'function') renderMathIn(host);
}

function cmBubbles(list, meSender) {
    if (!list.length) return '<p class="helper-text">No messages yet.</p>';
    return '<div class="cm-bubbles" id="cmBubbleBox">' + list.map(function(m) {
        var when = new Date(m.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
        return '<div class="cm-bubble ' + (m.sender === meSender ? 'me' : 'them') + '">' + escapeHtml(m.body) + '<small>' + escapeHtml(when) + '</small></div>';
    }).join('') + '</div>';
}
function cmScrollBubbles() { var b = document.getElementById('cmBubbleBox'); if (b) b.scrollTop = b.scrollHeight; }
async function studentMsgBadge() {
    try {
        var r = await fetch(BACKEND_URL + '/api/student/messages/unread', { headers: stAuth() });
        var d = await r.json();
        var b = document.querySelector('.sa-nav button[data-p="messages"] span');
        if (!b) return;
        b.innerHTML = 'Messages' + (d.unread ? '<span class="cm-dot">' + d.unread + '</span>' : '');
        studentMsgBar(d.unread || 0);
    } catch (e) {}
}
async function studentMsgLoad() {
    var el = document.getElementById('saPanelMessages');
    el.innerHTML = '<h2>Messages</h2><p class="helper-text">Loading...</p>';
    try {
        var r = await fetch(BACKEND_URL + '/api/student/messages', { headers: stAuth() });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load messages.');
        el.innerHTML = '<h2>Messages</h2>' + (d.setupNeeded ? '<p class="helper-text">Messaging is not set up yet.</p>' : cmBubbles(d.messages || [], 'student') +
            '<textarea id="stMsgInput" class="cm-compose" maxlength="1000" placeholder="Write a reply to your teacher..."></textarea><button type="button" class="primary-btn" style="margin-top:8px;" onclick="studentMsgSend()">Send reply</button>');
        cmScrollBubbles(); studentMsgBadge();
    } catch (e) { el.innerHTML = '<h2>Messages</h2><p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message) + '</p>'; }
}
async function studentMsgSend() {
    var inp = document.getElementById('stMsgInput');
    var body = (inp.value || '').trim();
    if (!body) return;
    try {
        var r = await fetch(BACKEND_URL + '/api/student/messages', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, stAuth()), body: JSON.stringify({ body: body }) });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not send.');
        studentMsgLoad();
    } catch (e) { alert(e.message); }
}

function renderStudentProfilePanel() {
    var el = document.getElementById('saPanelProfile');
    var m = saMe || {};
    var ini = String(m.name || '?').split(/\s+/).filter(Boolean).map(function(w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
    el.innerHTML = '<h2>My Profile</h2><div style="display:flex;align-items:center;gap:14px;margin:8px 0 14px;"><div class="sa-avatar">' + (m.photo ? '<img src="' + m.photo + '" alt="">' : '<span>' + escapeHtml(ini) + '</span>') + '</div><div><div class="sa-name">' + escapeHtml(m.name || '') + '</div></div></div>' +
        '<div class="cm-trow"><b>Class</b><span>' + escapeHtml(m.className || '') + '</span></div><div class="cm-trow"><b>Admission No.</b><span>' + escapeHtml(m.admissionNumber || '') + '</span></div>' +
        (m.teacherName ? '<div class="cm-trow"><b>Teacher</b><span>' + escapeHtml(m.teacherName) + '</span></div>' : '') + (m.school && m.school.name ? '<div class="cm-trow"><b>School</b><span>' + escapeHtml(m.school.name) + '</span></div>' : '') +
        '<p class="helper-text">To change your name, class or photo, ask your teacher.</p><h3 style="margin:16px 0 6px;">Change my PIN</h3>' +
        '<div class="form-group"><label>Current PIN</label><input id="pinCur" class="form-input" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits"></div>' +
        '<div class="form-group"><label>New PIN</label><input id="pinNew" class="form-input" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits"></div>' +
        '<div class="form-group"><label>Confirm new PIN</label><input id="pinNew2" class="form-input" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits"></div><button type="button" class="primary-btn" onclick="studentChangePin()">Change PIN</button>';
}
async function studentChangePin() {
    var c = document.getElementById('pinCur').value, n = document.getElementById('pinNew').value, n2 = document.getElementById('pinNew2').value;
    if (!/^[0-9]{4}$/.test(c) || !/^[0-9]{4}$/.test(n)) { alert('A PIN must be exactly 4 digits.'); return; }
    if (n !== n2) { alert('The new PIN and the confirmation do not match.'); return; }
    try {
        var r = await fetch(BACKEND_URL + '/api/student/change-pin', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, stAuth()), body: JSON.stringify({ currentPin: c, newPin: n }) });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not change the PIN.');
        alert('Your PIN has been changed. Use the new PIN next time you log in.');
        renderStudentProfilePanel();
    } catch (e) { alert(e.message); }
}

// ============================================================
// TEACHER: MESSAGES (bulk, selected students, single student)
// ============================================================
var msgSelected = {}, msgStudents = [];
function tmAuth() { return { 'Authorization': 'Bearer ' + localStorage.getItem('cleverment_teacher_token') }; }
function teacherMsgInit() {
    var sel = document.getElementById('msgClassSelect'), src = document.getElementById('rosterClassSelect');
    if (sel && src && !sel.options.length) { sel.innerHTML = src.innerHTML; }
}
async function teacherMsgLoadStudents() {
    var cls = document.getElementById('msgClassSelect').value;
    var host = document.getElementById('msgListHost');
    msgSelected = {};
    if (!cls) { host.innerHTML = ''; return; }
    host.innerHTML = '<p class="helper-text">Loading...</p>';
    try {
        var r = await fetch(BACKEND_URL + '/api/teacher/messages/students?className=' + encodeURIComponent(cls), { headers: tmAuth() });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load students.');
        msgStudents = d.students || [];
        teacherMsgRenderList(d.setupNeeded);
    } catch (e) { host.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message) + '</p>'; }
}
function teacherMsgRenderList(setupNeeded) {
    var host = document.getElementById('msgListHost');
    if (!msgStudents.length) { host.innerHTML = '<p class="helper-text">No students on this class roster yet.</p>'; return; }
    var n = Object.keys(msgSelected).length;
    host.innerHTML = (setupNeeded ? '<p class="helper-text" style="color:#b4232f;">Run supabase_messages.sql in Supabase first.</p>' : '') +
        '<textarea id="msgCompose" class="cm-compose" maxlength="1000" placeholder="Write your message..."></textarea>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px;"><button type="button" class="primary-btn" onclick="teacherMsgSend(true)">Send to whole class</button><button type="button" class="secondary-btn" id="msgSelBtn" onclick="teacherMsgSend(false)">Send to selected (' + n + ')</button></div>' +
        '<label style="display:flex;gap:8px;align-items:center;font-weight:600;margin-bottom:6px;"><input type="checkbox" onchange="teacherMsgAll(this.checked)" ' + (n === msgStudents.length ? 'checked' : '') + ' style="width:18px;height:18px;"> Select all</label>' +
        msgStudents.map(function(s) {
            var a = escapeHtml(s.admissionNumber);
            return '<div class="cm-trow"><input type="checkbox" class="msg-pick" data-adm="' + a + '" ' + (msgSelected[s.admissionNumber] ? 'checked ' : '') + 'onchange="teacherMsgPick(this)" style="width:18px;height:18px;"><div style="flex:1;min-width:0;"><b>' + escapeHtml(s.name) + '</b>' + (s.unread ? '<span class="cm-dot">' + s.unread + '</span>' : '') +
                '<div class="helper-text" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(s.lastMessage || 'No messages yet') + '</div></div><button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;" data-adm="' + a + '" onclick="teacherMsgOpen(this.getAttribute(\'data-adm\'))">Open</button></div>';
        }).join('') + '<div id="msgThreadHost"></div>';
}
function teacherMsgPick(cb) {
    var a = cb.getAttribute('data-adm');
    var real = (msgStudents.filter(function(s) { return escapeHtml(s.admissionNumber) === a; })[0] || {}).admissionNumber || a;
    if (cb.checked) msgSelected[real] = true; else delete msgSelected[real];
    var b = document.getElementById('msgSelBtn'); if (b) b.textContent = 'Send to selected (' + Object.keys(msgSelected).length + ')';
}
function teacherMsgAll(on) {
    msgSelected = {}; if (on) msgStudents.forEach(function(s) { msgSelected[s.admissionNumber] = true; });
    document.querySelectorAll('.msg-pick').forEach(function(c) { c.checked = !!on; });
    var b = document.getElementById('msgSelBtn'); if (b) b.textContent = 'Send to selected (' + Object.keys(msgSelected).length + ')';
}
async function teacherMsgPost(payload) {
    var r = await fetch(BACKEND_URL + '/api/teacher/messages', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tmAuth()), body: JSON.stringify(payload) });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Could not send.');
    return d;
}
async function teacherMsgSend(all) {
    var cls = document.getElementById('msgClassSelect').value, body = (document.getElementById('msgCompose').value || '').trim();
    var adms = Object.keys(msgSelected);
    if (!body) { alert('Type a message first.'); return; }
    if (!all && !adms.length) { alert('Select at least one student.'); return; }
    if (!confirm(all ? 'Send this message to the whole class (' + msgStudents.length + ' students)?' : 'Send this message to ' + adms.length + ' selected student(s)?')) return;
    try {
        var d = await teacherMsgPost({ className: cls, body: body, all: !!all, admissionNumbers: adms });
        alert('Message sent to ' + d.sent + ' student(s).');
        teacherMsgLoadStudents();
    } catch (e) { alert(e.message); }
}
var msgOpenAdm = '';
async function teacherMsgOpen(adm) {
    msgOpenAdm = adm;
    var cls = document.getElementById('msgClassSelect').value, host = document.getElementById('msgThreadHost');
    var st = msgStudents.filter(function(s) { return s.admissionNumber === adm; })[0] || {};
    host.innerHTML = '<p class="helper-text">Loading...</p>';
    try {
        var r = await fetch(BACKEND_URL + '/api/teacher/messages/thread?className=' + encodeURIComponent(cls) + '&admissionNumber=' + encodeURIComponent(adm), { headers: tmAuth() });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load.');
        host.innerHTML = '<div class="flag-box" style="margin-top:14px;"><h4 style="margin:0 0 8px;">Conversation with ' + escapeHtml(st.name || adm) + '</h4>' + cmBubbles(d.messages || [], 'teacher') +
            '<textarea id="msgReply" class="cm-compose" maxlength="1000" placeholder="Message ' + escapeHtml(st.name || 'student') + '..."></textarea><button type="button" class="primary-btn" style="margin-top:8px;" onclick="teacherMsgReply()">Send to this student</button></div>';
        cmScrollBubbles(); host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) { host.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message) + '</p>'; }
}
async function teacherMsgReply() {
    var body = (document.getElementById('msgReply').value || '').trim();
    if (!body) return;
    try {
        await teacherMsgPost({ className: document.getElementById('msgClassSelect').value, body: body, admissionNumbers: [msgOpenAdm] });
        await teacherMsgOpen(msgOpenAdm);
    } catch (e) { alert(e.message); }
}


// ============================================================
// CLASSES & SUBJECTS ADDED BY THE ADMIN
// ============================================================
var cmCustomOptions = { classes: [], subjects: [] };
function cmFillSelect(sel, values) {
    var have = {};
    Array.prototype.forEach.call(sel.options, function(o) { have[o.value.toLowerCase()] = true; });
    var other = null;
    Array.prototype.forEach.call(sel.options, function(o) { if (o.value === 'Other') other = o; });
    values.forEach(function(v) {
        if (have[String(v).toLowerCase()]) return;
        var o = document.createElement('option'); o.value = v; o.textContent = v;
        if (other) sel.insertBefore(o, other); else sel.appendChild(o);
        have[String(v).toLowerCase()] = true;
    });
}
function cmApplyCustomOptions() {
    document.querySelectorAll('select').forEach(function(sel) {
        var vals = Array.prototype.map.call(sel.options, function(o) { return o.value; });
        if (vals.indexOf('Primary 1') !== -1) cmFillSelect(sel, cmCustomOptions.classes);
        if (vals.indexOf('Mathematics') !== -1) cmFillSelect(sel, cmCustomOptions.subjects);
    });
}
async function cmLoadCustomOptions() {
    try {
        var r = await fetch(BACKEND_URL + '/api/options');
        var d = await r.json();
        cmCustomOptions = { classes: d.classes || [], subjects: d.subjects || [] };
        cmApplyCustomOptions();
    } catch (e) {}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cmLoadCustomOptions); else cmLoadCustomOptions();

function adminAuthJson() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('cleverment_admin_token') }; }
async function loadAdminOptions() {
    await cmLoadCustomOptions();
    var draw = function(id, list, kind) {
        var el = document.getElementById(id); if (!el) return;
        el.innerHTML = list.length ? list.map(function(v) {
            return '<div class="cm-trow"><span style="flex:1;">' + escapeHtml(v) + '</span><button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;" data-v="' + escapeHtml(v) + '" onclick="adminOptionDelete(\'' + kind + '\', this.getAttribute(\'data-v\'))">Remove</button></div>';
        }).join('') : '<p class="helper-text">Nothing added yet.</p>';
    };
    draw('optClassList', cmCustomOptions.classes, 'class');
    draw('optSubjectList', cmCustomOptions.subjects, 'subject');
}
async function adminOptionAdd(kind) {
    var inp = document.getElementById(kind === 'class' ? 'optNewClass' : 'optNewSubject');
    var v = (inp.value || '').trim();
    if (!v) { alert('Type a name first.'); return; }
    try {
        var r = await fetch(BACKEND_URL + '/api/admin/options', { method: 'POST', headers: adminAuthJson(), body: JSON.stringify({ kind: kind, value: v }) });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not add.');
        inp.value = '';
        await loadAdminOptions();
    } catch (e) { alert(e.message); }
}
async function adminOptionDelete(kind, value) {
    if (!confirm('Remove "' + value + '" from the list? Assessments already using it are not affected.')) return;
    try {
        var r = await fetch(BACKEND_URL + '/api/admin/options/delete', { method: 'POST', headers: adminAuthJson(), body: JSON.stringify({ kind: kind, value: value }) });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not remove.');
        alert('Removed. It will disappear from the drop-downs the next time a page is opened.');
        await loadAdminOptions();
    } catch (e) { alert(e.message); }
}

// ============================================================
// TIME LIMIT PICKER: two rollers (hours, minutes). Minimum 1 minute.
// ============================================================
var CM_TP_ROW = 44;
function cmTpItems(max) { var h = ''; for (var i = 0; i <= max; i++) h += '<div class="cm-roll-item" data-v="' + i + '">' + (i < 10 ? '0' + i : i) + '</div>'; return h; }
function cmTimePickerHtml(id) {
    return '<div class="cm-tp" id="' + id + 'Box"><label class="cm-tp-none"><input type="checkbox" id="' + id + 'None" onchange="cmTpNoneChanged(\'' + id + '\')"> No time limit</label>' +
        '<div class="cm-tp-rollers"><div class="cm-tp-col"><div class="cm-roll" data-kind="h">' + cmTpItems(23) + '</div><span class="cm-tp-unit">h</span></div>' +
        '<div class="cm-tp-col"><div class="cm-roll" data-kind="m">' + cmTpItems(59) + '</div><span class="cm-tp-unit">m</span></div><div class="cm-tp-band"></div></div>' +
        '<input type="hidden" id="' + id + '" value="10"></div>';
}
function cmTpRolls(id) { var box = document.getElementById(id + 'Box'); return box ? box.querySelectorAll('.cm-roll') : []; }
function cmTpRead(id) {
    var r = cmTpRolls(id); if (r.length < 2) return 0;
    var h = Math.round(r[0].scrollTop / CM_TP_ROW), m = Math.round(r[1].scrollTop / CM_TP_ROW);
    return Math.max(0, Math.min(23, h)) * 60 + Math.max(0, Math.min(59, m));
}
function cmTpPaint(id) {
    var r = cmTpRolls(id);
    Array.prototype.forEach.call(r, function(roll) {
        var idx = Math.round(roll.scrollTop / CM_TP_ROW);
        Array.prototype.forEach.call(roll.children, function(c, i) { c.classList.toggle('on', i === idx); });
    });
}
function cmTpScrollTo(id, minutes) {
    var r = cmTpRolls(id); if (r.length < 2) return;
    r[0].scrollTop = Math.floor(minutes / 60) * CM_TP_ROW;
    r[1].scrollTop = (minutes % 60) * CM_TP_ROW;
    cmTpPaint(id);
}
function cmTpStore(id) {
    var none = document.getElementById(id + 'None').checked, hid = document.getElementById(id);
    var total = cmTpRead(id);
    if (!none && total < 1) { total = 1; cmTpScrollTo(id, 1); }   // never less than 1 minute
    hid.value = none ? '0' : String(total);
    cmTpPaint(id);
}
function cmTpNoneChanged(id) {
    var none = document.getElementById(id + 'None').checked;
    var box = document.getElementById(id + 'Box'); if (box) box.classList.toggle('off', none);
    if (!none && Number(document.getElementById(id).value) < 1) cmTpScrollTo(id, 10);
    cmTpStore(id);
}
function cmTpSet(id, minutes) {
    var hid = document.getElementById(id); if (!hid) return;
    minutes = Math.max(0, Math.round(Number(minutes) || 0));
    var none = document.getElementById(id + 'None'); none.checked = minutes === 0;
    document.getElementById(id + 'Box').classList.toggle('off', minutes === 0);
    hid.value = String(minutes);
    hid.setAttribute('data-want', String(minutes === 0 ? 10 : minutes));
    cmTpScrollTo(id, minutes === 0 ? 10 : minutes);
}
function cmTpInit(id, minutes) {
    var box = document.getElementById(id + 'Box'); if (!box) return;
    var timers = {};
    Array.prototype.forEach.call(cmTpRolls(id), function(roll) {
        roll.addEventListener('scroll', function() {
            clearTimeout(timers[roll.getAttribute('data-kind')]);
            timers[roll.getAttribute('data-kind')] = setTimeout(function() { cmTpStore(id); }, 120);
        });
    });
    // when the picker becomes visible (it starts inside a hidden tab), put the rollers on the saved value
    if (window.ResizeObserver) {
        new ResizeObserver(function() {
            var hid = document.getElementById(id); if (!hid || !box.offsetParent) return;
            var want = Number(hid.value) === 0 ? Number(hid.getAttribute('data-want') || 10) : Number(hid.value);
            var r = cmTpRolls(id);
            if (r.length && (Math.round(r[0].scrollTop / CM_TP_ROW) * 60 + Math.round(r[1].scrollTop / CM_TP_ROW)) !== want) cmTpScrollTo(id, want);
        }).observe(box);
    }
    cmTpSet(id, minutes);
}
(function mountPublishTimer() {
    var host = document.getElementById('teacherTimerHost');
    if (!host) return;
    host.innerHTML = cmTimePickerHtml('teacherTimerSelect');
    cmTpInit('teacherTimerSelect', 10);
})();


// ============================================================
// "YOU HAVE A NEW MESSAGE" BARS (student and teacher)
// ============================================================
function studentMsgBar(n) {
    var bar = document.getElementById('saNewMsgBar'); if (!bar) return;
    var onMsgs = document.getElementById('saPanelMessages') && document.getElementById('saPanelMessages').style.display === 'block';
    bar.style.display = (n > 0 && !onMsgs) ? 'flex' : 'none';
    var t = bar.querySelector('span'); if (t) t.textContent = n > 1 ? 'You have ' + n + ' new messages. Tap to read.' : 'You have a new message. Tap to read.';
}
setInterval(function() {
    var area = document.getElementById('studentAreaPage');
    if (area && area.style.display !== 'none' && localStorage.getItem('cleverment_student_token') && !document.hidden) studentMsgBadge();
}, 45000);

async function teacherMsgBadge() {
    var dash = document.getElementById('teacherDashboard');
    var bar = document.getElementById('teacherNewMsgBar');
    if (!dash || !bar || dash.style.display === 'none' || !localStorage.getItem('cleverment_teacher_token')) return;
    try {
        var r = await fetch(BACKEND_URL + '/api/teacher/messages/unread', { headers: tmAuth() });
        var d = await r.json();
        var n = d.unread || 0;
        var onMsgs = document.getElementById('messagesSection') && document.getElementById('messagesSection').classList.contains('active');
        bar.style.display = (n > 0 && !onMsgs) ? 'flex' : 'none';
        var t = bar.querySelector('span');
        if (t) t.textContent = n > 1 ? 'You have ' + n + ' new messages from students. Tap to read.' : 'You have a new message from a student. Tap to read.';
    } catch (e) {}
}
function teacherOpenMessages() {
    var btn = document.querySelector('#teacherDashboard .dash-nav-item[data-target="messagesSection"]');
    showTeacherSection('messagesSection', btn);
    var bar = document.getElementById('teacherNewMsgBar'); if (bar) bar.style.display = 'none';
}
setInterval(function() { if (!document.hidden) teacherMsgBadge(); }, 45000);
setTimeout(teacherMsgBadge, 2500);


// ============================================================
// ANNOUNCEMENTS (admin posts, teachers and students see them)
// ============================================================
async function cmShowAnnouncements(audience, hostId) {
    var host = document.getElementById(hostId); if (!host) return;
    try {
        var r = await fetch(BACKEND_URL + '/api/announcements?audience=' + audience);
        var d = await r.json();
        var hidden = {}; try { hidden = JSON.parse(sessionStorage.getItem('cm_ann_hidden') || '{}'); } catch (e) {}
        host.innerHTML = (d.announcements || []).filter(function(a) { return !hidden[a.id]; }).map(function(a) {
            return '<div class="cm-announce">&#128226; <span>' + escapeHtml(a.message) + '</span><button type="button" aria-label="Dismiss" onclick="cmHideAnnouncement(' + a.id + ', this)">&times;</button></div>';
        }).join('');
    } catch (e) {}
}
function cmHideAnnouncement(id, btn) {
    var h = {}; try { h = JSON.parse(sessionStorage.getItem('cm_ann_hidden') || '{}'); } catch (e) {}
    h[id] = true; sessionStorage.setItem('cm_ann_hidden', JSON.stringify(h));
    if (btn && btn.parentNode) btn.parentNode.remove();
}
async function loadAdminAnnouncements() {
    var el = document.getElementById('annList'); if (!el) return;
    el.innerHTML = '<p class="helper-text">Loading...</p>';
    try {
        var r = await fetch(BACKEND_URL + '/api/admin/announcements', { headers: adminAuthJson() });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load.');
        if (d.setupNeeded) { el.innerHTML = '<p class="helper-text" style="color:#b4232f;">Run supabase_announcements.sql in Supabase first.</p>'; return; }
        var names = { all: 'Teachers and students', teachers: 'Teachers', students: 'Students' };
        el.innerHTML = (d.announcements || []).length ? d.announcements.map(function(a) {
            return '<div class="cm-trow"><div style="flex:1;"><div>' + escapeHtml(a.message) + '</div><div class="helper-text">' + escapeHtml(names[a.audience] || a.audience) + ' · ' + escapeHtml(new Date(a.created_at).toLocaleDateString()) + '</div></div><button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;" onclick="adminAnnounceDelete(' + a.id + ')">Remove</button></div>';
        }).join('') : '<p class="helper-text">No announcements yet.</p>';
    } catch (e) { el.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message) + '</p>'; }
}
async function adminAnnounceAdd() {
    var t = (document.getElementById('annText').value || '').trim();
    if (!t) { alert('Type the announcement first.'); return; }
    try {
        var r = await fetch(BACKEND_URL + '/api/admin/announcements', { method: 'POST', headers: adminAuthJson(), body: JSON.stringify({ message: t, audience: document.getElementById('annAudience').value }) });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not post.');
        document.getElementById('annText').value = '';
        loadAdminAnnouncements();
    } catch (e) { alert(e.message); }
}
async function adminAnnounceDelete(id) {
    if (!confirm('Remove this announcement?')) return;
    try {
        await fetch(BACKEND_URL + '/api/admin/announcements/delete', { method: 'POST', headers: adminAuthJson(), body: JSON.stringify({ id: id }) });
        loadAdminAnnouncements();
    } catch (e) { alert('Could not remove it.'); }
}
setTimeout(function() { if (document.getElementById('teacherDashboard') && document.getElementById('teacherDashboard').style.display !== 'none') cmShowAnnouncements('teachers', 'teacherAnnounce'); }, 3000);
setInterval(function() {
    if (document.hidden) return;
    var t = document.getElementById('teacherDashboard'), a = document.getElementById('studentAreaPage');
    if (t && t.style.display !== 'none') cmShowAnnouncements('teachers', 'teacherAnnounce');
    if (a && a.style.display !== 'none') cmShowAnnouncements('students', 'saAnnounce');
}, 120000);

// ============================================================
// TEACHER INSIGHTS
// ============================================================
async function insightsInit() {
    var cs = document.getElementById('insClassSelect'), src = document.getElementById('rosterClassSelect');
    if (cs && src && !cs.options.length) cs.innerHTML = src.innerHTML;
    var as = document.getElementById('insAssessSelect');
    try {
        var list = await getTeacherAssessmentsFromBackend();
        as.innerHTML = '<option value="">-- Choose an assessment --</option>' + (list || []).map(function(a) {
            return '<option value="' + escapeHtml(a.code) + '">' + escapeHtml(a.subject) + ' · ' + escapeHtml(a.className || '') + ' (' + escapeHtml(a.code) + ')</option>';
        }).join('');
    } catch (e) {}
}
async function insightsLoadQuestions() {
    var code = document.getElementById('insAssessSelect').value, el = document.getElementById('insQuestions');
    if (!code) { el.innerHTML = ''; return; }
    el.innerHTML = '<p class="helper-text">Analysing...</p>';
    try {
        var r = await fetch(BACKEND_URL + '/api/teacher/insights/questions?code=' + encodeURIComponent(code), { headers: tmAuth() });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load.');
        if (!d.questions.length) { el.innerHTML = '<p class="helper-text">No question details yet. Results appear after students submit.</p>'; return; }
        el.innerHTML = '<p class="helper-text">Based on ' + d.students + ' submission(s). Hardest first.</p>' + d.questions.map(function(q) {
            var col = q.correctPct < 40 ? '#dc3545' : (q.correctPct < 70 ? '#e0a100' : '#2d9c5c');
            return '<div class="cm-flash" style="margin:8px 0;padding:12px;"><div style="display:flex;justify-content:space-between;gap:8px;"><b style="color:' + col + ';">' + q.correctPct + '% correct</b><span class="helper-text">' + q.attempts + ' answered</span></div><div style="margin:6px 0;">' + q.question + '</div>' +
                (q.commonWrong ? '<div class="helper-text">Most common wrong answer: <b>' + escapeHtml(q.commonWrong) + '</b> (' + q.commonWrongCount + ')</div>' : '') + '</div>';
        }).join('');
        if (typeof renderMathIn === 'function') renderMathIn(el);
    } catch (e) { el.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message) + '</p>'; }
}
async function insightsLoadAttention() {
    var cls = document.getElementById('insClassSelect').value, el = document.getElementById('insAttention');
    if (!cls) { el.innerHTML = ''; return; }
    el.innerHTML = '<p class="helper-text">Loading...</p>';
    try {
        var r = await fetch(BACKEND_URL + '/api/teacher/insights/attention?className=' + encodeURIComponent(cls), { headers: tmAuth() });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not load.');
        if (!d.students.length) { el.innerHTML = '<p class="helper-text">Great news: no student in this class needs attention right now (' + d.total + ' on the roster).</p>'; return; }
        el.innerHTML = d.students.map(function(s) {
            var info = s.taken === 0 ? 'No assessment taken yet' : 'Average ' + s.average + '% over ' + s.taken + ' assessment(s)';
            return '<div class="cm-trow"><div style="flex:1;min-width:0;"><b>' + escapeHtml(s.name) + '</b><div class="helper-text">' + escapeHtml(info) + '</div></div><button type="button" class="secondary-btn" style="font-size:12px;padding:5px 10px;" data-adm="' + escapeHtml(s.admissionNumber) + '" onclick="insightsMessage(this.getAttribute(\'data-adm\'))">Message</button></div>';
        }).join('');
    } catch (e) { el.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(e.message) + '</p>'; }
}
async function insightsMessage(adm) {
    var cls = document.getElementById('insClassSelect').value;
    var btn = document.querySelector('#teacherDashboard .dash-nav-item[data-target="messagesSection"]');
    showTeacherSection('messagesSection', btn);
    var sel = document.getElementById('msgClassSelect');
    sel.value = cls;
    await teacherMsgLoadStudents();
    teacherMsgOpen(adm);
}


// ============================================================
// MY LEARNING SPACE (lessons + practice from the learning/ folder)
// ============================================================
var learnIndex = null, learnCur = {}, learnRun = null;
function learnEl() { return document.getElementById('saPanelLearn'); }
function learnLoadScript(src) {
    return new Promise(function(resolve, reject) {
        var sc = document.createElement('script'); sc.src = src; sc.onload = resolve;
        sc.onerror = function() { reject(new Error('missing-file:' + src)); };
        document.head.appendChild(sc);
    });
}
async function learnLoadGen() {
    if (!(window.CMLearnGen && window.CMLearnGen.list().length > 50)) {
        await learnLoadScript('learning-generators.js?v=4');
        window.CMLearnGen.topics = window.CMLearnGen.list();
    }
    if (!window.CMLearnEn) { try { await learnLoadScript('learning-english.js?v=1'); } catch (eEn) {} }
}
function learnFail(e) {
    var m = String((e && e.message) || e || '');
    if (m.indexOf('missing-file') === 0 || m.indexOf('JSON') >= 0 || m.indexOf('Unexpected token') >= 0)
        return 'The learning files were not found on the website. The two files learning-index.json and learning-generators.js must be uploaded to the frontend GitHub repository (next to index.html), then redeployed.';
    return 'Could not load. Check your connection and try again.';
}
function learnProgress() { try { return JSON.parse(localStorage.getItem('cm_learn_progress') || '{}'); } catch (e) { return {}; } }
function learnSaveProgress(id, score, total) {
    var p = learnProgress(), t = p[id] || { attempts: 0, best: 0 };
    t.attempts++; t.last = Math.round(score / total * 100); t.best = Math.max(t.best, t.last); p[id] = t;
    try { localStorage.setItem('cm_learn_progress', JSON.stringify(p)); } catch (e) {}
}
function learnCard(title, sub, onclick, soon) {
    return '<div class="sa-card' + (soon ? '' : ' sa-card-click') + '" data-s="' + escapeHtml((title + ' ' + (sub || '')).toLowerCase()) + '"' + (soon ? '' : ' role="button" tabindex="0" onclick="' + onclick + '"') + '><div><b>' + escapeHtml(title) + '</b>' + (sub ? '<div class="helper-text">' + escapeHtml(sub) + '</div>' : '') + '</div>' + (soon ? '<span class="sa-badge">Coming soon</span>' : '') + '</div>';
}
function learnSearchBox(ph, fn) { return '<input type="search" id="learnSearch" class="form-input learn-search" placeholder="' + ph + '" oninput="' + fn + '(this.value)" autocomplete="off">'; }
function learnFilter(q) {
    q = String(q || '').toLowerCase().trim();
    var shown = 0;
    document.querySelectorAll('#learnList .sa-card').forEach(function(c) { var ok = !q || c.getAttribute('data-s').indexOf(q) >= 0; c.style.display = ok ? '' : 'none'; if (ok) shown++; });
    document.querySelectorAll('#learnList .learn-strand').forEach(function(h) { var any = false, n = h.nextElementSibling; while (n && !n.classList.contains('learn-strand')) { if (n.style.display !== 'none') any = true; n = n.nextElementSibling; } h.style.display = any ? '' : 'none'; });
    var e = document.getElementById('learnEmpty'); if (e) e.style.display = shown ? 'none' : 'block';
}
async function learnHome() {
    var el = learnEl(); el.innerHTML = '<h2>My Learning Space</h2><p class="helper-text">Loading...</p>';
    try {
        if (!learnIndex) { var r = await fetch('learning-index.json?v=5'); if (!r.ok) throw new Error('missing-file:index'); learnIndex = await r.json(); }
        el.innerHTML = '<h2>My Learning Space</h2><p class="helper-text">Search for a class, subject or topic, or tap a class below.</p>' + learnSearchBox('Search class, subject or topic...', 'learnGlobalSearch') +
            '<div id="learnList" class="learn-scroll">' + learnIndex.classes.map(function(c) {
                var ready = c.subjects && c.subjects.length;
                return learnCard(c.name, (c.tracks || []).join(' \u00B7 ') || c.level, "learnClass('" + c.key + "')", false).replace('</div></div>', '</div>' + (ready ? '' : '<span class="sa-badge">Coming soon</span>') + '</div>');
            }).join('') + '</div><p id="learnEmpty" class="helper-text" style="display:none;">Nothing found.</p>';
    } catch (e) { el.innerHTML = '<h2>My Learning Space</h2><p class="helper-text" style="color:#dc3545;">' + escapeHtml(learnFail(e)) + '</p><button type="button" class="secondary-btn" onclick="learnIndex=null;learnHome()">Try again</button>'; }
}
function learnGlobalSearch(q) {
    q = String(q || '').toLowerCase().trim();
    var list = document.getElementById('learnList'); if (!list) return;
    if (q.length < 2) { learnHome(); return; }
    var out = [];
    learnIndex.classes.forEach(function(c) {
        if (c.name.toLowerCase().indexOf(q) >= 0) out.push(learnCard(c.name, 'Class', "learnClass('" + c.key + "')", false));
        (c.subjects || []).forEach(function(sb) {
            if (sb.name.toLowerCase().indexOf(q) >= 0) out.push(learnCard(sb.name, c.name, "learnGo('" + c.key + "','" + sb.key + "')", false));
            sb.topics.forEach(function(t) { if (t.status === 'ready' && t.title.toLowerCase().indexOf(q) >= 0 && out.length < 60) out.push(learnCard(t.title, c.name + ' \u203A ' + sb.name, "learnGo('" + c.key + "','" + sb.key + "','" + t.id + "')", false)); });
        });
    });
    list.innerHTML = out.length ? out.join('') : '<p class="helper-text">Nothing found. Try another word.</p>';
}
function learnGo(ck, sk, tid) {
    learnCur = { cls: learnIndex.classes.filter(function(c) { return c.key === ck; })[0] };
    learnSubject(sk);
    if (tid) learnTopic(tid);
}
function learnClass(key) {
    var c = learnIndex.classes.filter(function(x) { return x.key === key; })[0]; learnCur = { cls: c };
    var el = learnEl();
    var back = '<button type="button" class="secondary-btn" onclick="learnHome()">&larr; All classes</button>';
    if (!c.subjects || !c.subjects.length) { el.innerHTML = back + '<h2>' + escapeHtml(c.name) + '</h2><p class="helper-text">Lessons and practice for this class are being prepared. Please check back soon.</p>'; return; }
    el.innerHTML = back + '<h2>' + escapeHtml(c.name) + '</h2>' + learnSearchBox('Search subjects...', 'learnFilter') + '<div id="learnList" class="learn-scroll">' + c.subjects.map(function(sb) { return learnCard(sb.name, (sb.tracks || []).join(' \u00B7 '), "learnSubject('" + sb.key + "')", false); }).join('') + '</div><p id="learnEmpty" class="helper-text" style="display:none;">Nothing found.</p>';
}
function learnSubject(key) {
    var c = learnCur.cls, sub = c.subjects.filter(function(x) { return x.key === key; })[0]; learnCur.sub = sub;
    var prog = learnProgress(), last = '';
    var ready = sub.topics.filter(function(t) { return t.status === 'ready'; }).length;
    learnEl().innerHTML = '<button type="button" class="secondary-btn" onclick="learnClass(\'' + c.key + '\')">&larr; ' + escapeHtml(c.name) + '</button><h2>' + escapeHtml(sub.name) + '</h2><p class="helper-text">' + ready + ' of ' + sub.topics.length + ' topics are ready to practise.</p>' + learnSearchBox('Search topics...', 'learnFilter') +
        '<div id="learnList" class="learn-scroll">' + sub.topics.map(function(t) {
            var head = '';
            if (t.strand && t.strand !== last) { last = t.strand; head = '<h3 class="learn-strand">' + escapeHtml(t.strand) + '</h3>'; }
            var p = prog[t.id];
            if (t.status !== 'ready') return head + learnCard(t.title, '', '', true);
            return head + learnCard(t.title, p ? 'Best score: ' + p.best + '% \u00B7 ' + p.attempts + ' practice(s)' : 'Not practised yet', "learnTopic('" + t.id + "')", false);
        }).join('') + '</div><p id="learnEmpty" class="helper-text" style="display:none;">Nothing found.</p>';
}
function learnLessonHtml(L) {
    var e = escapeHtml, h = '<h3>What is it?</h3><p>' + e(L.i) + '</p>' + (L.d || '') +
        '<div class="cm-tip" style="border-left-color:#2d9c5c;"><b>In real life:</b> ' + e(L.r) + '</div>' +
        '<h3>Key points</h3><ul>' + L.k.map(function(x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>';
    if (L.e) h += '<h3>Worked example</h3><div class="cm-flash" style="padding:12px;"><p><b>' + e(L.e[0]) + '</b></p><ol>' + L.e[1].map(function(x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ol><p>Answer: <b style="color:#2d9c5c;">' + e(L.e[2]) + '</b></p></div>';
    return h;
}
async function learnTopic(id) {
    var t = learnCur.sub.topics.filter(function(x) { return x.id === id; })[0]; learnCur.topic = t;
    var el = learnEl(); el.innerHTML = '<p class="helper-text">Loading lesson...</p>';
    try {
        await learnLoadGen();
        var d;
        if (!window.learnLessons) { try { var rl = await fetch('learning-lessons.json?v=1'); window.learnLessons = rl.ok ? await rl.json() : {}; } catch (e0) { window.learnLessons = {}; } }
        var NL = window.learnLessons[t.id] || (window.CMLearnEn && window.CMLearnEn.lessons[t.id]);
        if (NL) { d = { title: t.title, summary: t.strand || '', objectives: [], html: learnLessonHtml(NL) }; }
        else if (t.lesson) { d = t.lesson; }
        else {
            d = { title: t.title, summary: t.strand || '', objectives: [], html: '<h3>Key idea</h3><p>' + escapeHtml(t.note || '') + '</p>' };
        }
        d = Object.assign({}, d);
        var extra = '';
        if (t.steps && t.steps.length) extra += '<h3>How to do it, step by step</h3><ol>' + t.steps.map(function(x) { return '<li>' + escapeHtml(x) + '</li>'; }).join('') + '</ol>';
        var shown = {}, exs = [], tries = [3, 41, 87, 150, 233, 311, 420, 555];
        for (var q = 0; q < tries.length && exs.length < 4; q++) {
            var ex = window.CMLearnGen.get(t.id, tries[q]);
            if (ex && !shown[ex.q]) { shown[ex.q] = 1; exs.push(ex); }
        }
        if (exs.length) extra += '<h3>Worked examples</h3>' + exs.map(function(ex, i) {
            return '<div class="cm-flash" style="padding:12px;"><b>Example ' + (i + 1) + '</b>' + (ex.svg || '') + '<p>' + escapeHtml(ex.q) + '</p><p>Answer: <b style="color:#2d9c5c;">' + escapeHtml(ex.options[ex.answer]) + '</b></p><div class="explain"><b>Working:</b> ' + escapeHtml(ex.explain) + '</div></div>';
        }).join('');
        if (t.mistake) extra += '<div class="cm-tip" style="border-left-color:#dc3545;"><b>Common mistake:</b> ' + escapeHtml(t.mistake) + '</div>';
        extra += '<div class="cm-tip"><b>Remember:</b> ' + (String(t.id).indexOf('p6-eng-') === 0 ? 'read the whole sentence or passage carefully, say each answer in your head, and choose the one that sounds and reads right.' : 'read the question carefully, write your working, and check your answer by estimating or doing the opposite operation.') + '</div>';
        d.html += extra;
        el.innerHTML = '<button type="button" class="secondary-btn" onclick="learnSubject(\'' + learnCur.sub.key + '\')">&larr; ' + escapeHtml(learnCur.sub.name) + '</button><h2>' + escapeHtml(d.title) + '</h2><p class="helper-text">' + escapeHtml(d.summary || '') + '</p>' +
            (d.objectives && d.objectives.length ? '<div class="cm-flash"><b>By the end you can:</b><ul>' + d.objectives.map(function(o) { return '<li>' + escapeHtml(o) + '</li>'; }).join('') + '</ul></div>' : '') +
            '<div class="cm-lesson">' + d.html + '</div>' +
            '<div class="cm-flash"><h3 style="margin:0 0 6px;">Practise this topic</h3><p class="helper-text">Question pool: ' + (window.CMLearnGen.poolOf ? window.CMLearnGen.poolOf(t.id) : window.CMLearnGen.POOL) + '. How many do you want to answer?</p>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' + [10, 20, 30, 50, 100].map(function(n) { return '<button type="button" class="secondary-btn" onclick="document.getElementById(\'lnCount\').value=' + n + '">' + n + '</button>'; }).join('') + '</div>' +
            '<input id="lnCount" type="number" class="form-input" min="1" max="' + (window.CMLearnGen.poolOf ? window.CMLearnGen.poolOf(t.id) : window.CMLearnGen.POOL) + '" value="20" style="max-width:140px;"> <button type="button" class="primary-btn" onclick="learnStart()">Start practice</button></div>';
        renderMathIn(el);
    } catch (e) { el.innerHTML = '<p class="helper-text" style="color:#dc3545;">' + escapeHtml(learnFail(e)) + '</p>'; }
}
function learnStart() {
    var G = window.CMLearnGen, PL = G.poolOf ? G.poolOf(learnCur.topic.id) : G.POOL, n = Math.max(1, Math.min(PL, parseInt(document.getElementById('lnCount').value, 10) || 20));
    var idx = []; for (var i = 0; i < PL; i++) idx.push(i);
    for (var j = idx.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var tmp = idx[j]; idx[j] = idx[k]; idx[k] = tmp; }
    var qs = [], seen = {};
    for (var m = 0; m < idx.length && qs.length < n; m++) { var q = G.get(learnCur.topic.id, idx[m]); if (q && !seen[q.q + q.options.join()]) { seen[q.q + q.options.join()] = 1; qs.push(q); } }
    learnRun = { qs: qs, i: 0, score: 0, wrong: [] }; learnShow();
}
function learnShow() {
    var R = learnRun, el = learnEl();
    if (R.i >= R.qs.length) {
        learnSaveProgress(learnCur.topic.id, R.score, R.qs.length);
        var pc = Math.round(R.score / R.qs.length * 100);
        el.innerHTML = '<h2>Practice complete</h2><div class="cm-stat-row"><div class="cm-stat"><span>Score</span><strong>' + pc + '%</strong></div><div class="cm-stat"><span>Correct</span><strong>' + R.score + '/' + R.qs.length + '</strong></div></div>' +
            '<p>' + (pc >= 80 ? 'Excellent work!' : (pc >= 50 ? 'Good effort. Practise again to improve.' : 'Read the lesson again, then try once more.')) + '</p>' +
            (R.wrong.length ? '<h3>Review your mistakes</h3>' + R.wrong.map(function(q, n) { return '<div class="correction-item"><p><strong>Q:</strong> ' + (q.svg || '') + escapeHtml(q.q) + '</p><p>Correct answer: <strong style="color:#2d9c5c">' + escapeHtml(q.options[q.answer]) + '</strong></p><p class="explain">' + escapeHtml(q.explain) + '</p></div>'; }).join('') : '') +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"><button type="button" class="primary-btn" onclick="learnTopic(\'' + learnCur.topic.id + '\')">Back to lesson</button><button type="button" class="secondary-btn" onclick="learnStart()">Practise again</button></div>';
        renderMathIn(el);
        return;
    }
    var q = R.qs[R.i], letters = ['A', 'B', 'C', 'D'];
    el.innerHTML = '<div class="learn-top"><span id="learnProgressTxt">Question ' + (R.i + 1) + ' of ' + R.qs.length + '</span><span>Score: ' + R.score + '</span></div>' +
        '<div class="learn-bar"><i style="width:' + Math.round(R.i / R.qs.length * 100) + '%"></i></div>' +
        '<div id="learnQuestionBox"><div id="learnQuestionText">' + (q.svg || '') + escapeHtml(q.q) + '</div><div id="learnOptions">' +
        q.options.map(function(o, ix) { return '<div class="option" role="button" tabindex="0" onclick="learnAnswer(' + ix + ')">' + letters[ix] + '. ' + escapeHtml(o) + '</div>'; }).join('') + '</div><div id="lnFeed"></div></div>' +
        '<button type="button" class="secondary-btn" onclick="learnTopic(\'' + learnCur.topic.id + '\')">Stop practice</button>';
    renderMathIn(el);
}
function learnAnswer(ix) {
    var R = learnRun, q = R.qs[R.i];
    if (R.answered) return; R.answered = true;
    var ok = ix === q.answer;
    document.querySelectorAll('#learnOptions .option').forEach(function(b, i) { b.style.pointerEvents = 'none'; if (i === q.answer) b.classList.add('correct'); else if (i === ix) b.classList.add('wrong'); });
    if (ok) R.score++; else R.wrong.push(q);
    document.getElementById('lnFeed').innerHTML = '<p class="learn-verdict" style="color:' + (ok ? '#2d9c5c' : '#dc3545') + ';">' + (ok ? 'Correct!' : 'Not correct.') + '</p><div class="explain">' + escapeHtml(q.explain) + '</div><button type="button" class="primary-btn" style="margin-top:10px;" onclick="learnRun.answered=false;learnRun.i++;learnShow()">' + (R.i + 1 >= R.qs.length ? 'See results' : 'Next question') + '</button>';
    renderMathIn(document.getElementById('lnFeed'));
}
