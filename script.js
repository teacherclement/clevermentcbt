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
    window.history.pushState({ page: page }, '', newURL);
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
            document.getElementById('teacherDashboard').style.display = 'block';
            document.getElementById('teacherDashboardName').textContent = 'Welcome, ' + currentTeacher.name + '!';
            document.getElementById('teacherDashboardEmail').textContent = currentTeacher.email;
            renderTeacherDashboard();
            renderTeacherPublishedList();
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
            document.getElementById('adminDashboard').style.display = 'block';
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
                renderTeacherDashboard();
                renderCSVHistory();
            }
            if (savedPage === 'adminDashboard') {
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

var SUPABASE_URL = 'https://tcodtuqirkzzpxggxqaa.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjb2R0dXFpcmt6enB4Z2d4cWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDk2MDEsImV4cCI6MjEwMjc4NTYwMX0.CN-kWafaN37VW9YCw6kLdetzBEl_DddPbdh1MeOl02k';

if (typeof supabase !== 'undefined' && supabase.createClient) {
    var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (typeof supabaseJs !== 'undefined' && supabaseJs.createClient) {
    var supabaseClient = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    var supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    if (!supabaseClient) {
        console.error('Supabase not loaded!');
    }
}

var supabase = supabaseClient;

// ============================================================
// EMAILJS CONNECTION (for teacher password reset emails)
// ============================================================

var EMAILJS_PUBLIC_KEY = 'TYGhhsvmb4Qa-ng08';
var EMAILJS_SERVICE_ID = 'service_ukp1egq';
var EMAILJS_TEMPLATE_ID = 'uf0nyrb';

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
        await supabase
            .from('cleverment_teacher_activity')
            .insert([{
                teacher_email: teacherEmail,
                action: action,
                details: details || '',
                created_at: new Date().toISOString()
            }]);
    } catch(e) { console.error('Activity log error:', e); }
}

// ============================================================
// CSV HISTORY FUNCTIONS
// ============================================================

async function saveCSVHistory(teacherEmail, filename, questions, subject, className) {
    try {
        await supabase
            .from('cleverment_csv_history')
            .insert([{
                teacher_email: teacherEmail,
                filename: filename,
                question_count: questions.length,
                subject: subject,
                class_name: className,
                file_content: questions,
                created_at: new Date().toISOString()
            }]);
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

function reuseCSV(id) {
    getCSVHistoryById(id).then(function(item) {
        if (item && item.file_content) {
            teacherQuestions = JSON.parse(JSON.stringify(item.file_content));
            alert('Loaded ' + teacherQuestions.length + ' questions from "' + item.filename + '". You can now publish this assessment.');
            
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
                }
            }
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
var studentName = '';
var preloadedImageCache = {};
var studentTabSwitchCount = 0;
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
var ADMIN_PASSWORD = 'cleverment2026';

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
    document.getElementById('assessmentCode').focus();
    updateURL('student');
}

function showTeacherLogin() {
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
    document.getElementById('teacherAuthTabs').style.display = 'flex';
    document.getElementById('teacherLoginTab').className = 'primary-btn';
    document.getElementById('teacherSignupTab').className = 'secondary-btn';
}

function showTeacherSignupForm() {
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'block';
    document.getElementById('teacherForgotPasswordForm').style.display = 'none';
    document.getElementById('teacherResetPasswordForm').style.display = 'none';
    document.getElementById('teacherAuthTabs').style.display = 'flex';
    document.getElementById('teacherLoginTab').className = 'secondary-btn';
    document.getElementById('teacherSignupTab').className = 'primary-btn';
}

function showForgotPasswordForm() {
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'none';
    document.getElementById('teacherResetPasswordForm').style.display = 'none';
    document.getElementById('teacherForgotPasswordForm').style.display = 'block';
    document.getElementById('teacherAuthTabs').style.display = 'none';
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

    var classSelect = document.getElementById('studentClassInput');
    var customWrapper = document.querySelector('.custom-class-wrapper-student');
    var customInput = document.getElementById('studentCustomClass');
    if (classSelect) {
        classSelect.addEventListener('change', function() {
            if (this.value === 'Other') {
                customWrapper.style.display = 'block';
                customInput.focus();
            } else {
                customWrapper.style.display = 'none';
                customInput.value = '';
            }
        });
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
            if (this.value === 'Other') {
                rosterCustomWrapper.style.display = 'block';
                rosterCustomInput.focus();
                document.getElementById('rosterNamesTextarea').value = '';
                return;
            }
            rosterCustomWrapper.style.display = 'none';
            rosterCustomInput.value = '';
            var className = this.value;
            var textarea = document.getElementById('rosterNamesTextarea');
            if (!className) {
                textarea.value = '';
                return;
            }
            textarea.value = 'Loading...';
            var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
            var names = await getRosterForClass(teacherEmail, className);
            textarea.value = names ? names.join('\n') : '';
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
        signatureInput.addEventListener('change', function(e) {
            var preview = document.getElementById('signaturePreview');
            var img = document.getElementById('signaturePreviewImg');
            if (this.files && this.files[0]) {
                var reader = new FileReader();
                reader.onload = function(event) {
                    img.src = event.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(this.files[0]);
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
    if (codeFromURL) {
        setTimeout(function() {
            var codeInput = document.getElementById('assessmentCode');
            if (codeInput) {
                codeInput.value = codeFromURL;
            }
            verifyAssessmentCode();
        }, 500);
    }

    checkForPasswordResetToken().then(function(handled) {
        if (handled) return;

        var quizWasRestored = restoreQuizState();

        if (!quizWasRestored) {
            var page = getPageFromURL();
            if (page) {
                showPageFromURL(page);
            }
        }
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

// ============================================================
// PASSWORD HASHING (bcrypt) - teacher passwords used to be
// stored in plain text in the "password_hash" column despite its
// name. New signups are hashed properly. Existing accounts are
// migrated automatically and silently the next time that teacher
// logs in successfully, using the password they just typed in
// (which is discarded afterward) - no manual migration needed.
// ============================================================

function getBcryptLib() {
    return (window.dcodeIO && window.dcodeIO.bcrypt) || window.bcrypt || null;
}

function isBcryptHash(value) {
    return typeof value === 'string' && /^\$2[aby]?\$\d{2}\$/.test(value);
}

function hashPassword(plainPassword) {
    var bcryptLib = getBcryptLib();
    if (!bcryptLib) {
        console.error('bcrypt library failed to load - storing password unhashed as a last resort.');
        return plainPassword;
    }
    var salt = bcryptLib.genSaltSync(10);
    return bcryptLib.hashSync(plainPassword, salt);
}

function verifyPassword(plainPassword, storedValue) {
    if (isBcryptHash(storedValue)) {
        var bcryptLib = getBcryptLib();
        if (!bcryptLib) return false;
        try {
            return bcryptLib.compareSync(plainPassword, storedValue);
        } catch (e) {
            return false;
        }
    }
    // Legacy account: storedValue is still the old plain-text password.
    return storedValue === plainPassword;
}

async function migrateTeacherPasswordIfNeeded(teacherId, plainPassword, currentStoredValue) {
    if (isBcryptHash(currentStoredValue)) return;
    try {
        var newHash = hashPassword(plainPassword);
        await supabase
            .from('cleverment_teachers')
            .update({ password_hash: newHash })
            .eq('id', teacherId);
    } catch (e) {
        // Non-critical - it'll just try again on their next login.
    }
}

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
        var teachers = await getAllTeachersFromDatabase();
        var teacher = teachers.filter(function(t) { return t.email.toLowerCase() === email; })[0];

        // Always show the same message whether or not the email exists,
        // so this can't be used to check which emails have accounts.
        if (teacher) {
            var token = generateResetToken();
            var expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

            var { error: updateError } = await supabase
                .from('cleverment_teachers')
                .update({ reset_token: token, reset_token_expiry: expiry })
                .eq('id', teacher.id);

            if (updateError) {
                if (/column .*does not exist/i.test(updateError.message || '')) {
                    alert('Password reset isn\'t set up yet on the database side. Please contact your admin.');
                    btn.disabled = false;
                    btn.textContent = 'Send Reset Link';
                    return;
                }
                throw updateError;
            }

            var resetLink = window.location.origin + window.location.pathname + '?page=reset-password&token=' + token;

            if (typeof emailjs !== 'undefined') {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                    email: teacher.email,
                    link: resetLink
                });
            }
        }

        alert('If an account exists with that email, a reset link has been sent. Please check your inbox (and spam folder).');
        showTeacherLoginForm();
    } catch (e) {
        console.error('Password reset request failed:', e);
        alert('Something went wrong sending the reset email. Please try again in a moment.');
    }

    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
}

var pendingResetTeacherId = null;

async function checkForPasswordResetToken() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');
    if (params.get('page') !== 'reset-password' || !token) return false;

    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('teacherAuth').style.display = 'block';
    document.getElementById('teacherLoginForm').style.display = 'none';
    document.getElementById('teacherSignupForm').style.display = 'none';
    document.getElementById('teacherForgotPasswordForm').style.display = 'none';
    document.getElementById('teacherAuthTabs').style.display = 'none';

    var resetSection = document.getElementById('teacherResetPasswordForm');

    try {
        var teachers = await getAllTeachersFromDatabase();
        var teacher = teachers.filter(function(t) {
            return t.reset_token === token && t.reset_token_expiry && new Date(t.reset_token_expiry) > new Date();
        })[0];

        if (!teacher) {
            resetSection.innerHTML = '<h2>Reset Link Invalid</h2><p class="helper-text">This reset link is invalid or has expired. Please request a new one.</p><button onclick="showPageFromURL(\'teacher\')" class="primary-btn full-width" style="margin-top:12px;">Back to Login</button>';
            resetSection.style.display = 'block';
            return true;
        }

        pendingResetTeacherId = teacher.id;
        resetSection.style.display = 'block';
    } catch (e) {
        resetSection.innerHTML = '<p class="helper-text">Could not verify this reset link right now. Please try again shortly.</p>';
        resetSection.style.display = 'block';
    }

    return true;
}

async function submitNewPassword() {
    var pass = document.getElementById('teacherNewPassword').value;
    var confirmPass = document.getElementById('teacherNewPasswordConfirm').value;
    var btn = document.getElementById('teacherResetSubmitBtn');

    if (!pendingResetTeacherId) {
        alert('This reset link is no longer valid. Please request a new one.');
        return;
    }
    if (!pass || pass.length < 4) {
        alert('Please enter a password (at least 4 characters).');
        return;
    }
    if (pass !== confirmPass) {
        alert('Passwords do not match.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        var newHash = hashPassword(pass);
        var { error } = await supabase
            .from('cleverment_teachers')
            .update({ password_hash: newHash, reset_token: null, reset_token_expiry: null })
            .eq('id', pendingResetTeacherId);

        if (error) {
            alert('Supabase Error: ' + error.message);
            btn.disabled = false;
            btn.textContent = 'Set New Password';
            return;
        }

        alert('Password updated! You can now log in with your new password.');
        pendingResetTeacherId = null;
        updateURL('teacher');
        showPageFromURL('teacher');
    } catch (e) {
        alert('Error: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Set New Password';
    }
}

function getTeachersLocal() {
    var stored = localStorage.getItem('cleverment_teachers');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { return []; }
    }
    return [];
}

function saveTeachersLocal(teachers) {
    localStorage.setItem('cleverment_teachers', JSON.stringify(teachers));
}

async function saveTeacherToDatabase(teacher) {
    try {
        var { data, error } = await supabase
            .from('cleverment_teachers')
            .insert([{
                name: teacher.name,
                email: teacher.email,
                password_hash: hashPassword(teacher.password)
            }]);
        if (error) {
            alert('Supabase Error: ' + error.message);
            return false;
        }
        return true;
    } catch(e) {
        alert('Error: ' + e.message);
        return false;
    }
}

async function getTeacherFromDatabase(email) {
    try {
        var { data, error } = await supabase
            .from('cleverment_teachers')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        if (error) return null;
        return data;
    } catch(e) { return null; }
}

async function getAllTeachersFromDatabase() {
    try {
        var { data, error } = await supabase
            .from('cleverment_teachers')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return [];
        return data || [];
    } catch(e) { return []; }
}

function teacherSignup() {
    var name = document.getElementById('teacherSignupName').value.trim();
    var email = document.getElementById('teacherSignupEmail').value.trim();
    var password = document.getElementById('teacherSignupPassword').value;
    var confirm = document.getElementById('teacherSignupConfirm').value;

    if (!name) { alert('Please enter your full name.'); return; }
    if (!email) { alert('Please enter your email.'); return; }
    if (password.length < 6) { alert('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { alert('Passwords do not match.'); return; }

    getTeacherFromDatabase(email).then(function(existing) {
        if (existing) {
            alert('A teacher with this email already exists. Please login.');
            return;
        }

        var teacher = {
            name: name,
            email: email,
            password: password
        };

        saveTeacherToDatabase(teacher).then(function(success) {
            if (success) {
                alert('Account created successfully! You can now login.');
                logTeacherActivity(email, 'signup', 'Teacher account created');
                var teachers = getTeachersLocal();
                teachers.push({
                    id: Date.now(),
                    name: name,
                    email: email,
                    password: hashPassword(password),
                    date: new Date().toLocaleString()
                });
                saveTeachersLocal(teachers);
                
                showTeacherLoginForm();
                document.getElementById('teacherLoginEmail').value = email;
                document.getElementById('teacherLoginPassword').value = '';
                document.getElementById('teacherSignupName').value = '';
                document.getElementById('teacherSignupEmail').value = '';
                document.getElementById('teacherSignupPassword').value = '';
                document.getElementById('teacherSignupConfirm').value = '';
            }
        });
    });
}

function teacherLogin() {
    var email = document.getElementById('teacherLoginEmail').value.trim();
    var password = document.getElementById('teacherLoginPassword').value;

    if (!email || !password) {
        alert('Please enter your email and password.');
        return;
    }

    getTeacherFromDatabase(email).then(function(teacher) {
        if (!teacher) {
            var teachers = getTeachersLocal();
            var found = null;
            for (var i = 0; i < teachers.length; i++) {
                if (teachers[i].email === email && verifyPassword(password, teachers[i].password)) {
                    found = teachers[i];
                    break;
                }
            }
            if (found) {
                currentTeacher = found;
                localStorage.setItem('cleverment_teacher_session', JSON.stringify(currentTeacher));
                logTeacherActivity(email, 'login', 'Teacher logged in (local backup)');
                document.getElementById('teacherAuth').style.display = 'none';
                document.getElementById('teacherDashboard').style.display = 'block';
                document.getElementById('teacherDashboardName').textContent = 'Welcome, ' + found.name + '!';
                document.getElementById('teacherDashboardEmail').textContent = found.email;
                renderTeacherDashboard();
                renderTeacherPublishedList();
                renderCSVHistory();
                updateURL('teacher-dashboard');
            } else {
                alert('Invalid email or password. Please try again.');
            }
            return;
        }

        if (teacher.paused === true) {
            alert('Your account has been paused. Please contact the admin on Whatsapp: +2349069959358 to reactivate. YOU MAY NEED TO PAY A TOKEN OF ₦2,500');
            return;
        }

        if (!verifyPassword(password, teacher.password_hash)) {
            alert('Invalid email or password. Please try again.');
            return;
        }

        migrateTeacherPasswordIfNeeded(teacher.id, password, teacher.password_hash);

        currentTeacher = {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email
        };
        localStorage.setItem('cleverment_teacher_session', JSON.stringify(currentTeacher));

        logTeacherActivity(email, 'login', 'Teacher logged in');

        document.getElementById('teacherAuth').style.display = 'none';
        document.getElementById('teacherDashboard').style.display = 'block';
        document.getElementById('teacherDashboardName').textContent = 'Welcome, ' + teacher.name + '!';
        document.getElementById('teacherDashboardEmail').textContent = teacher.email;
        renderTeacherDashboard();
        renderTeacherPublishedList();
        renderCSVHistory();
        updateURL('teacher-dashboard');
    });
}

function teacherLogout() {
    currentTeacher = null;
    localStorage.removeItem('cleverment_teacher_session');
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('teacherAuth').style.display = 'block';
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

function getQuestionBanks() {
    var stored = localStorage.getItem('cleverment_banks');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { return {}; }
    }
    return {};
}

function populateTeacherQuestionBankSelect() {
    var select = document.getElementById('teacherQuestionBankSelect');
    var banks = getQuestionBanks();
    var names = Object.keys(banks);
    select.innerHTML = '<option value="">-- Select a saved question set --</option>';
    for (var i = 0; i < names.length; i++) {
        var option = document.createElement('option');
        option.value = names[i];
        option.textContent = names[i] + ' (' + banks[names[i]].length + ' questions)';
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
    var banks = getQuestionBanks();
    var data = banks[name];
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
                        var banks = getQuestionBanks();
                        banks[name.trim()] = JSON.parse(JSON.stringify(teacherQuestions));
                        localStorage.setItem('cleverment_banks', JSON.stringify(banks));
                        populateTeacherQuestionBankSelect();
                        alert('Question bank "' + name.trim() + '" saved with ' + teacherQuestions.length + ' questions.');
                        teacherQuestions = [];
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
        var banks = getQuestionBanks();
        banks[name.trim()] = JSON.parse(JSON.stringify(teacherQuestions));
        localStorage.setItem('cleverment_banks', JSON.stringify(banks));
        populateTeacherQuestionBankSelect();
        alert('Question bank "' + name.trim() + '" saved with ' + teacherQuestions.length + ' questions.');
        teacherQuestions = [];
    }
}

function teacherDeleteBank() {
    var select = document.getElementById('teacherQuestionBankSelect');
    var name = select.value;
    if (!name) { alert('Please select a question bank to delete.'); return; }
    if (confirm('Delete question bank "' + name + '"? This cannot be undone.')) {
        var banks = getQuestionBanks();
        delete banks[name];
        localStorage.setItem('cleverment_banks', JSON.stringify(banks));
        populateTeacherQuestionBankSelect();
        alert('Question bank "' + name + '" deleted.');
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
                image: cols.length > 6 ? cols[6].replace(/^"|"$/g, '').trim() : ''
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

// ============================================================
// GENERIC INSERT-WITH-FALLBACK: several optional columns
// (available_from, available_until, pass_mark, tab_switches,
// answers) may not exist yet if a Supabase migration hasn't been
// run. Rather than one-off retry logic per table, this strips
// whichever specific column Postgres says is missing and retries,
// one column at a time, so a submission or publish never fails
// just because a newer feature's column isn't there yet.
// ============================================================

async function insertWithColumnFallback(table, payload) {
    var attemptPayload = Object.assign({}, payload);
    for (var attempt = 0; attempt < 6; attempt++) {
        try {
            var { data, error } = await supabase.from(table).insert([attemptPayload]);
            if (!error) return { success: true };
            var match = /column ["']?([a-zA-Z0-9_]+)["']? .*does not exist/i.exec(error.message || '');
            if (match && Object.prototype.hasOwnProperty.call(attemptPayload, match[1])) {
                delete attemptPayload[match[1]];
                console.warn(table + ': column "' + match[1] + '" not found in Supabase - saved without it. Add that column to enable the related feature.');
                continue;
            }
            return { success: false, error: error };
        } catch (e) {
            return { success: false, error: e };
        }
    }
    return { success: false, error: { message: 'Too many missing columns - could not save.' } };
}

async function savePublishedAssessmentToDatabase(assessment) {
    var payload = {
        teacher_email: assessment.teacherEmail,
        teacher_name: assessment.teacherName || 'Unknown Teacher',
        teacher_signature: assessment.teacherSignature || '',
        subject: assessment.subject,
        class_name: assessment.className,
        code: assessment.code,
        questions: assessment.questions,
        time_limit: assessment.timeLimit,
        shuffle: assessment.shuffle,
        available_from: assessment.availableFrom,
        available_until: assessment.availableUntil,
        pass_mark: assessment.passMark
    };
    var result = await insertWithColumnFallback('cleverment_assessments', payload);
    if (!result.success) {
        alert('Supabase Error: ' + result.error.message);
        return false;
    }
    return true;
}

async function getAssessmentByCodeFromDatabase(code) {
    try {
        var { data, error } = await supabase
            .from('cleverment_assessments')
            .select('*')
            .eq('code', code)
            .maybeSingle();
        if (error) return null;
        return data;
    } catch(e) { return null; }
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
    var signatureInput = document.getElementById('teacherCertSignature');
    var teacherSignature = '';

    var availableFromRaw = document.getElementById('teacherAvailableFrom').value;
    var availableUntilRaw = document.getElementById('teacherAvailableUntil').value;
    if (availableFromRaw && availableUntilRaw && new Date(availableUntilRaw) <= new Date(availableFromRaw)) {
        alert('"Available Until" must be after "Available From".');
        return;
    }

    if (signatureInput.files && signatureInput.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            teacherSignature = e.target.result;
            proceedWithPublish(subject, className, teacherCertName, teacherSignature);
        };
        reader.readAsDataURL(signatureInput.files[0]);
    } else {
        proceedWithPublish(subject, className, teacherCertName, teacherSignature);
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
    var passMarkRaw = parseInt(document.getElementById('teacherPassMark').value);
    var passMark = (isNaN(passMarkRaw) || passMarkRaw < 0 || passMarkRaw > 100) ? 50 : passMarkRaw;
    var availableFromRaw = document.getElementById('teacherAvailableFrom').value;
    var availableUntilRaw = document.getElementById('teacherAvailableUntil').value;
    var availableFrom = availableFromRaw ? new Date(availableFromRaw).toISOString() : null;
    var availableUntil = availableUntilRaw ? new Date(availableUntilRaw).toISOString() : null;

    var code = subject.substring(0, 3).toUpperCase() + '-' + className.substring(0, 3).toUpperCase() + '-' + String(Date.now()).slice(-3);

    var assessment = {
        teacherEmail: currentTeacher ? currentTeacher.email : 'unknown',
        teacherName: teacherCertName || currentTeacher?.name || 'Unknown Teacher',
        teacherSignature: teacherSignature || '',
        subject: subject,
        className: className,
        code: code,
        questions: JSON.parse(JSON.stringify(teacherQuestions)),
        timeLimit: timeLimit,
        shuffle: shuffle,
        passMark: passMark,
        availableFrom: availableFrom,
        availableUntil: availableUntil
    };

    await savePublishedAssessmentToDatabase(assessment);
    logTeacherActivity(assessment.teacherEmail, 'publish_assessment', 'Published: ' + subject + ' | Class: ' + className + ' | Code: ' + code);

    if (teacherQuestions.length > 0) {
        var filename = subject + '_' + className + '_' + new Date().toISOString().slice(0,10) + '.csv';
        saveCSVHistory(assessment.teacherEmail, filename, teacherQuestions, subject, className);
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
    document.getElementById('teacherCertName').value = '';
    document.getElementById('teacherCertSignature').value = '';
    document.getElementById('signaturePreview').style.display = 'none';

    alert('Assessment published successfully!\n\nAssessment Code: ' + code + '\n\nShare this code with your students.');

    renderTeacherPublishedList();
}

// ============================================================
// TEACHER: VIEW PUBLISHED ASSESSMENTS
// ============================================================

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

async function renderTeacherPublishedList() {
    var container = document.getElementById('teacherPublishedList');
    if (!container) return;

    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    var allAssessments = await getAllAssessmentsFromDatabase();
    var filtered = allAssessments.filter(function(a) { return a.teacherEmail === teacherEmail; });
    teacherAssessmentsCache = filtered;

    populateTeacherAnalyticsSelect(filtered);

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
            '<div><strong>' + a.subject + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + a.className + ' | ' + a.questions.length + ' questions | ' + timeDisplay + ')</span><br>' +
            '<span style="color:' + avail.color + '; font-size:12px; font-weight:600;">' + avail.text + '</span></div>' +
            '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
            '<span style="background:#eef6ff; padding:4px 12px; border-radius:6px; font-weight:600; font-size:13px; color:#2d6cdf;">Code: ' + a.code + '</span>' +
            '<button onclick="copyAssessmentCode(\'' + a.code + '\')" class="secondary-btn" style="font-size:12px; padding:4px 12px;">Copy Code</button>' +
            '<button onclick="deletePublishedAssessment(' + a.id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#dc3545; color:white;">Delete</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
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
        return data.student_names || [];
    } catch (e) {
        return null;
    }
}

async function saveClassRoster() {
    var classSelect = document.getElementById('rosterClassSelect');
    var customInput = document.getElementById('rosterCustomClass');
    var className = classSelect.value === 'Other' ? customInput.value.trim() : classSelect.value;
    if (!className) {
        alert('Please select or enter a class.');
        return;
    }

    var textarea = document.getElementById('rosterNamesTextarea');
    var names = textarea.value.split('\n').map(function(n) { return n.trim(); }).filter(function(n) { return n.length > 0; });
    if (names.length === 0) {
        alert('Please enter at least one student name.');
        return;
    }

    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';

    try {
        var { data: existing, error: fetchError } = await supabase
            .from('cleverment_rosters')
            .select('id')
            .eq('teacher_email', teacherEmail)
            .eq('class_name', className)
            .maybeSingle();

        if (existing && existing.id) {
            var { error: updateError } = await supabase
                .from('cleverment_rosters')
                .update({ student_names: names, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (updateError) {
                alert('Supabase Error: ' + updateError.message);
                return;
            }
        } else {
            var { error: insertError } = await supabase
                .from('cleverment_rosters')
                .insert([{ teacher_email: teacherEmail, class_name: className, student_names: names }]);
            if (insertError) {
                alert('Supabase Error: ' + insertError.message);
                return;
            }
        }
        alert('Roster saved for ' + className + ' (' + names.length + ' student' + (names.length === 1 ? '' : 's') + ').');
    } catch (e) {
        alert('Error: ' + e.message);
    }
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
    if (!roster) return { hasRoster: false };

    var submittedNames = [];
    try {
        var { data, error } = await supabase
            .from('cleverment_results')
            .select('student_name')
            .eq('assessment_code', assessment.code);
        if (!error && data) {
            submittedNames = data.map(function(r) { return (r.student_name || '').trim().toLowerCase(); });
        }
    } catch (e) {
        // If this fails, still show the roster with nothing marked as submitted
        // rather than hiding the roster entirely.
    }

    var missing = roster.filter(function(name) {
        return submittedNames.indexOf(name.trim().toLowerCase()) === -1;
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
        return '<p class="helper-text" style="margin-bottom:14px;">No roster saved for "' + assessment.className + '" - add one above to see who\'s missing.</p>';
    }
    var html = '<div style="background:white; padding:12px 16px; border-radius:8px; border:1.5px solid #eef2f6; margin-bottom:14px;">' +
        '<p style="margin:0 0 8px 0; font-weight:700;">Attendance: ' + attendance.submittedCount + '/' + attendance.total + ' submitted</p>';
    if (attendance.missing.length > 0) {
        html += '<p style="margin:0 0 4px 0; font-size:13px; color:#6b7a8f;">Haven\'t taken it yet:</p>' +
            '<p style="margin:0; font-size:13px; color:#dc3545;">' + attendance.missing.join(', ') + '</p>';
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
    container.innerHTML = html;
    renderMathIn(container);
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
    try {
        var { error } = await supabase
            .from('cleverment_assessments')
            .delete()
            .eq('id', id);
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
    } catch (e) {
        alert('Error: ' + e.message);
        return;
    }
    renderTeacherPublishedList();
}

// ============================================================
// VERIFY ASSESSMENT CODE (Student)
// ============================================================

function showAssessmentForm() {
    document.getElementById('studentAccess').style.display = 'none';
    document.getElementById('studentAssessmentView').style.display = 'block';
    document.getElementById('studentInfoForm').style.display = 'block';
    document.getElementById('studentQuizSection').style.display = 'none';
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';

    document.getElementById('studentAssessmentTitle').textContent = 'Assessment: ' + currentAssessment.subject;
    document.getElementById('studentAssessmentSubject').textContent = 'Class: ' + currentAssessment.className + ' | ' + currentAssessment.questions.length + ' questions';
    document.getElementById('studentNameInput').value = '';
    document.getElementById('studentClassInput').value = '';
    document.getElementById('studentNameInput').focus();
    updateURL('student-assessment');
}

function backToStudentAccess() {
    studentStopTimer();
    clearQuizState();
    preloadedImageCache = {};
    document.getElementById('studentAssessmentView').style.display = 'none';
    document.getElementById('studentAccess').style.display = 'block';
    document.getElementById('assessmentCode').value = '';
    updateURL('student');
}

function getAssessmentWindowBlockMessage(assessment) {
    var now = new Date();
    if (assessment.availableFrom) {
        var from = new Date(assessment.availableFrom);
        if (!isNaN(from.getTime()) && now < from) {
            return 'This assessment is not open yet. It becomes available on ' + formatDate(from) + '.';
        }
    }
    if (assessment.availableUntil) {
        var until = new Date(assessment.availableUntil);
        if (!isNaN(until.getTime()) && now > until) {
            return 'This assessment window has closed. It was available until ' + formatDate(until) + '.';
        }
    }
    return null;
}

function verifyAssessmentCode() {
    var codeFromURL = getCodeFromURL();
    var code = codeFromURL || document.getElementById('assessmentCode').value.trim().toUpperCase();
    
    if (!code) {
        alert('Please enter the assessment code provided by your teacher.');
        return;
    }

    getAssessmentByCodeFromDatabase(code).then(function(found) {
        if (found) {
            currentAssessment = {
                id: found.id,
                code: found.code,
                teacherEmail: found.teacher_email,
                teacherName: found.teacher_name || 'Unknown Teacher',
                teacherSignature: found.teacher_signature || '',
                subject: found.subject,
                className: found.class_name,
                questions: found.questions,
                timeLimit: found.time_limit,
                shuffle: found.shuffle,
                passMark: (found.pass_mark !== null && found.pass_mark !== undefined) ? found.pass_mark : 50,
                availableFrom: found.available_from || null,
                availableUntil: found.available_until || null
            };
            currentAssessmentCode = code;
            window.assessmentTeacherName = found.teacher_name || 'Unknown Teacher';
            window.assessmentTeacherSignature = found.teacher_signature || '';

            var blockMsg = getAssessmentWindowBlockMessage(currentAssessment);
            if (blockMsg) {
                alert(blockMsg);
                currentAssessment = null;
                currentAssessmentCode = '';
                return;
            }

            if (codeFromURL) {
                document.getElementById('studentAccess').style.display = 'none';
                showAssessmentForm();
                document.getElementById('assessmentCode').value = code;
            } else {
                showAssessmentForm();
            }
            return;
        }

        var published = getPublishedAssessmentsLocal();
        var foundLocal = null;
        for (var i = 0; i < published.length; i++) {
            if (published[i].code === code) {
                foundLocal = published[i];
                break;
            }
        }

        if (foundLocal) {
            currentAssessment = foundLocal;
            currentAssessmentCode = code;
            window.assessmentTeacherName = foundLocal.teacherName || 'Unknown Teacher';
            window.assessmentTeacherSignature = foundLocal.teacherSignature || '';

            var blockMsgLocal = getAssessmentWindowBlockMessage(currentAssessment);
            if (blockMsgLocal) {
                alert(blockMsgLocal);
                currentAssessment = null;
                currentAssessmentCode = '';
                return;
            }

            if (codeFromURL) {
                document.getElementById('studentAccess').style.display = 'none';
                showAssessmentForm();
                document.getElementById('assessmentCode').value = code;
            } else {
                showAssessmentForm();
            }
        } else {
            alert('Invalid assessment code. Please check with your teacher.');
        }
    });
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
        studentClass: studentClass,
        studentSubject: studentSubject,
        studentIsTimeUp: studentIsTimeUp,
        studentTabSwitchCount: studentTabSwitchCount,
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

function restoreQuizState() {
    var saved = localStorage.getItem('cleverment_quiz_state');
    if (!saved) return false;

    var state;
    try {
        state = JSON.parse(saved);
    } catch (e) {
        return false;
    }
    if (!state || !state.currentAssessment || !state.studentQuestions || state.studentQuestions.length === 0) {
        return false;
    }

    currentAssessment = state.currentAssessment;
    currentAssessmentCode = state.currentAssessmentCode;
    studentQuestions = state.studentQuestions;
    studentCurrentIndex = state.studentCurrentIndex || 0;
    studentAnswers = state.studentAnswers || new Array(studentQuestions.length).fill(null);
    studentTimeRemaining = state.studentTimeRemaining || 0;
    studentTimeLimit = state.studentTimeLimit || 0;
    studentName = state.studentName || '';
    studentClass = state.studentClass || '';
    studentSubject = state.studentSubject || '';
    studentIsTimeUp = state.studentIsTimeUp || false;
    studentTabSwitchCount = state.studentTabSwitchCount || 0;
    window.assessmentTeacherName = state.assessmentTeacherName || '';
    window.assessmentTeacherSignature = state.assessmentTeacherSignature || '';

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

    var display = document.getElementById('studentTimerDisplay');
    if (studentTimeLimit > 0) {
        var mins = Math.floor(studentTimeRemaining / 60);
        var secs = studentTimeRemaining % 60;
        display.textContent = String(Math.max(mins, 0)).padStart(2, '0') + ':' + String(Math.max(secs, 0)).padStart(2, '0');
    } else {
        display.textContent = '∞';
    }
    display.classList.remove('warning', 'expired');

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
    if (document.hidden) registerTabSwitch();
});

function shuffleOptionsForQuestion(q) {
    var letters = ['A', 'B', 'C', 'D'];
    var correctIndex = letters.indexOf(q.correctAnswer);
    if (correctIndex === -1 || correctIndex >= q.options.length) return q;

    var indices = [];
    for (var i = 0; i < q.options.length; i++) indices.push(i);
    for (var k = indices.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1));
        var temp = indices[k]; indices[k] = indices[j]; indices[j] = temp;
    }

    var newOptions = [];
    var newCorrectIndex = 0;
    for (var m = 0; m < indices.length; m++) {
        newOptions.push(q.options[indices[m]]);
        if (indices[m] === correctIndex) newCorrectIndex = m;
    }

    q.options = newOptions;
    q.correctAnswer = letters[newCorrectIndex];
    return q;
}

async function hasAlreadyAttempted(assessmentCode, nameToCheck) {
    try {
        var { data, error } = await supabase
            .from('cleverment_results')
            .select('id')
            .eq('assessment_code', assessmentCode)
            .ilike('student_name', nameToCheck.trim())
            .limit(1);
        if (error) return false; // fail open - a check error should never block a legitimate student
        return !!(data && data.length > 0);
    } catch (e) {
        return false;
    }
}

async function startStudentQuiz() {
    var nameInput = document.getElementById('studentNameInput');
    var classSelect = document.getElementById('studentClassInput');
    var customInput = document.getElementById('studentCustomClass');

    studentName = nameInput.value.trim();
    if (!studentName) {
        alert('Please enter your name!');
        nameInput.focus();
        return;
    }

    if (classSelect.value === 'Other') {
        studentClass = customInput.value.trim();
        if (!studentClass) {
            alert('Please enter your class name!');
            customInput.focus();
            return;
        }
    } else {
        studentClass = classSelect.value.trim();
        if (!studentClass) {
            alert('Please select your class!');
            classSelect.focus();
            return;
        }
    }

    if (!currentAssessment) {
        alert('No assessment loaded. Please enter the assessment code again.');
        return;
    }

    var startBtn = document.getElementById('studentStartQuizBtn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Checking...';
    }

    var alreadyAttempted = await hasAlreadyAttempted(currentAssessmentCode, studentName);

    if (alreadyAttempted) {
        alert('"' + studentName + '" has already submitted this assessment (Code: ' + currentAssessmentCode + '). Each student can only take a given assessment once. If this is a mistake, please contact your teacher.');
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

    studentSubject = currentAssessment.subject;
    studentQuestions = JSON.parse(JSON.stringify(currentAssessment.questions));
    studentTimeLimit = currentAssessment.timeLimit || 0;
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

    studentCurrentIndex = 0;
    studentAnswers = new Array(studentQuestions.length).fill(null);
    studentIsTimeUp = false;
    studentTabSwitchCount = 0;

    document.getElementById('studentInfoForm').style.display = 'none';
    document.getElementById('studentQuizSection').style.display = 'block';
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';
    var tabWarning = document.getElementById('studentTabSwitchWarning');
    if (tabWarning) tabWarning.style.display = 'none';

    document.getElementById('studentQuizTitle').textContent = studentSubject;
    document.getElementById('studentQuizDisplay').textContent = 'Student: ' + studentName + ' | Class: ' + studentClass;

    var display = document.getElementById('studentTimerDisplay');
    if (studentTimeLimit > 0) {
        var mins = Math.floor(studentTimeLimit / 60);
        var secs = studentTimeLimit % 60;
        display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    } else {
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
    if (studentIsTimeUp) return;
    var letters = ['A', 'B', 'C', 'D'];
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
// STUDENT TIMER
// ============================================================

function studentStartTimer() {
    if (studentTimerInterval) clearInterval(studentTimerInterval);
    if (studentTimeLimit === 0) {
        document.getElementById('studentTimerDisplay').textContent = '∞';
        return;
    }
    studentTimerInterval = setInterval(function() {
        studentTimeRemaining--;
        var mins = Math.floor(studentTimeRemaining / 60);
        var secs = studentTimeRemaining % 60;
        var display = document.getElementById('studentTimerDisplay');
        display.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        if (studentTimeRemaining <= studentTimeLimit * 0.2 && studentTimeRemaining > 0) {
            display.classList.add('warning');
        } else {
            display.classList.remove('warning');
        }
        if (studentTimeRemaining <= 0) {
            display.classList.add('expired');
            display.classList.remove('warning');
            studentTimeUp();
        }
        saveQuizState();
    }, 1000);
}

function studentStopTimer() {
    if (studentTimerInterval) {
        clearInterval(studentTimerInterval);
        studentTimerInterval = null;
    }
}

function studentGetTimeTaken() {
    var totalSeconds = studentTimeLimit - studentTimeRemaining;
    var mins = Math.floor(totalSeconds / 60);
    var secs = totalSeconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function studentTimeUp() {
    if (studentIsTimeUp) return;
    studentIsTimeUp = true;
    studentStopTimer();
    var overlay = document.createElement('div');
    overlay.className = 'time-up-overlay';
    overlay.id = 'studentTimeUpOverlay';
    overlay.innerHTML = `
        <div class="time-up-box">
            <h2>Time is Up</h2>
            <p>Your time for this assessment has expired.<br>Your answers will be submitted automatically.</p>
            <button onclick="studentSubmitQuiz()">Submit Now</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

// ============================================================
// STUDENT SUBMIT QUIZ
// ============================================================

function saveResultLocal(result) {
    var results = getAllResultsLocal();
    results.push({
        id: Date.now(),
        teacherEmail: result.teacherEmail,
        className: result.className,
        studentName: result.studentName,
        subject: result.subject,
        score: result.score,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        timeTaken: result.timeTaken,
        assessmentCode: result.assessmentCode,
        tabSwitches: result.tabSwitches || 0,
        date: new Date().toLocaleString()
    });
    // Cap this local backup so it can't grow forever and eventually
    // hit the browser's storage quota. Supabase is the real source
    // of truth now; this is only an offline-fallback safety net.
    if (results.length > 300) {
        results = results.slice(results.length - 300);
    }
    localStorage.setItem('cleverment_all_results', JSON.stringify(results));
}

function getAllResultsLocal() {
    var stored = localStorage.getItem('cleverment_all_results');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) { return []; }
    }
    return [];
}

async function saveResultToDatabase(result) {
    var payload = {
        teacher_email: result.teacherEmail,
        student_name: result.studentName,
        class_name: result.className,
        subject: result.subject,
        score: result.score,
        correct_answers: result.correctAnswers,
        total_questions: result.totalQuestions,
        time_taken: result.timeTaken,
        assessment_code: result.assessmentCode,
        tab_switches: result.tabSwitches || 0,
        answers: result.answers || null
    };
    var outcome = await insertWithColumnFallback('cleverment_results', payload);
    if (!outcome.success) {
        alert('Supabase Error: ' + outcome.error.message);
        return false;
    }
    return true;
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
        className: r.class_name,
        subject: r.subject,
        score: r.score,
        correctAnswers: r.correct_answers,
        totalQuestions: r.total_questions,
        timeTaken: r.time_taken,
        assessmentCode: r.assessment_code,
        tabSwitches: r.tab_switches || 0,
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
        passMark: (a.pass_mark !== null && a.pass_mark !== undefined) ? a.pass_mark : 50,
        availableFrom: a.available_from || null,
        availableUntil: a.available_until || null,
        date: a.created_at ? new Date(a.created_at).toLocaleString() : ''
    };
}

async function getAllAssessmentsFromDatabase() {
    try {
        var { data, error } = await supabase
            .from('cleverment_assessments')
            .select('*')
            .order('id', { ascending: false });
        if (error || !data) return getPublishedAssessmentsLocal();
        return data.map(normalizeAssessmentRow);
    } catch (e) {
        return getPublishedAssessmentsLocal();
    }
}

async function adminDeleteAssessment(id) {
    if (!confirm('Delete this assessment? Students will no longer be able to take it with its code.')) return;
    try {
        var { error } = await supabase
            .from('cleverment_assessments')
            .delete()
            .eq('id', id);
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
        alert('Assessment deleted.');
        renderAdminAssessmentList();
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

function studentSubmitQuiz() {
    var overlay = document.getElementById('studentTimeUpOverlay');
    if (overlay) overlay.remove();
    studentStopTimer();

    var unanswered = studentAnswers.some(function(ans) { return ans === null; });
    if (unanswered && !studentIsTimeUp) {
        var count = studentAnswers.filter(function(ans) { return ans === null; }).length;
        var confirmSubmit = confirm('You have ' + count + ' unanswered question(s). Submit anyway?');
        if (!confirmSubmit) {
            studentStartTimer();
            return;
        }
    }

    clearQuizState();

    var correct = 0;
    var corrections = [];
    var letters = ['A', 'B', 'C', 'D'];
    for (var i = 0; i < studentQuestions.length; i++) {
        var q = studentQuestions[i];
        var userAns = studentAnswers[i];
        var isCorrect = userAns === q.correctAnswer;
        if (isCorrect) correct++;
        var userAnsIdx = letters.indexOf(userAns);
        var correctAnsIdx = letters.indexOf(q.correctAnswer);
        corrections.push({
            question: q.question,
            userAnswer: userAns || 'Not answered',
            userAnswerText: userAnsIdx !== -1 ? (q.options[userAnsIdx] || '') : '',
            correctAnswer: q.correctAnswer,
            correctAnswerText: correctAnsIdx !== -1 ? (q.options[correctAnsIdx] || '') : '',
            isCorrect: isCorrect
        });
    }

    studentScore = Math.round((correct / studentQuestions.length) * 100);
    studentCorrect = correct;
    studentTotal = studentQuestions.length;
    studentTimeTaken = studentGetTimeTaken();

    var result = {
        teacherEmail: currentAssessment.teacherEmail || 'unknown',
        studentName: studentName,
        className: studentClass,
        subject: studentSubject,
        score: studentScore,
        correctAnswers: correct,
        totalQuestions: studentQuestions.length,
        timeTaken: studentTimeTaken,
        assessmentCode: currentAssessmentCode,
        tabSwitches: studentTabSwitchCount,
        answers: corrections
    };

    saveResultToDatabase(result);
    saveResultLocal(result);

    document.getElementById('studentQuizSection').style.display = 'none';
    document.getElementById('studentResultsSection').style.display = 'block';
    document.getElementById('studentCertificateSection').style.display = 'none';

    var grade = getGrade(studentScore);
    var passMark = (currentAssessment.passMark !== null && currentAssessment.passMark !== undefined) ? currentAssessment.passMark : 50;
    var passed = studentScore >= passMark;

    document.getElementById('studentScoreDisplay').innerHTML = `
        <span class="grade">${grade}</span>
        ${studentScore}% (${correct}/${studentQuestions.length})<br>
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
            <p>Your answer: <strong style="color:${item.isCorrect ? '#2d9c5c' : '#dc3545'}">${item.userAnswer}${item.userAnswerText ? ' - ' + item.userAnswerText : ''}</strong></p>
            ${!item.isCorrect ? '<p>Correct answer: <strong style="color:#2d9c5c">' + item.correctAnswer + (item.correctAnswerText ? ' - ' + item.correctAnswerText : '') + '</strong></p>' : ''}
            <p>${item.isCorrect ? 'Correct' : 'Wrong'}</p>
        `;
        container.appendChild(div);
        renderMathIn(div);
    }
    
    updateURL('results');
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
    logo.src = 'https://i.postimg.cc/q73QqsQR/cleverment-logo.jpg';
    logo.style.cssText = 'width:27mm; height:27mm; object-fit:contain; display:block; margin:0 0 2mm 0; background:#ffffff;';
    content.appendChild(logo);

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
    // Create a temporary container
    var tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '297mm';
    tempDiv.style.height = '210mm';
    tempDiv.style.margin = '0';
    tempDiv.style.padding = '0';
    tempDiv.style.background = 'white';
    tempDiv.style.zIndex = '-1';
    tempDiv.style.overflow = 'hidden';
    
    // Build the certificate from scratch (same as above but for image)
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
    logo.src = 'https://i.postimg.cc/q73QqsQR/cleverment-logo.jpg';
    logo.style.cssText = 'width:27mm; height:27mm; object-fit:contain; display:block; margin:0 0 2mm 0; background:#ffffff;';
    content.appendChild(logo);
    
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
    nameEl.textContent = studentName || 'Student Name';
    nameEl.style.cssText = 'font-size:29pt; font-weight:bold; color:#1a1a2e; padding:0 18mm 2.5mm; min-width:120mm; border-bottom:1.2mm solid #C9A84C; font-family:Georgia,serif; margin:0;';
    content.appendChild(nameEl);
    
    var p2 = document.createElement('div');
    p2.textContent = 'has successfully completed the assessment in';
    p2.style.cssText = 'font-size:13.5pt; color:#555; font-family:Georgia,serif; margin:4mm 0 2mm;';
    content.appendChild(p2);
    
    var subEl = document.createElement('div');
    subEl.textContent = studentSubject || 'Subject';
    subEl.style.cssText = 'font-size:21pt; font-weight:bold; color:#1a1a2e; font-family:Georgia,serif; margin:0 0 3mm;';
    content.appendChild(subEl);
    
    var p3 = document.createElement('div');
    p3.textContent = 'with an average score of';
    p3.style.cssText = 'font-size:13.5pt; color:#555; font-family:Georgia,serif; margin:0 0 1mm;';
    content.appendChild(p3);
    
    var scoreEl = document.createElement('div');
    var grade = getGrade(studentScore || 0);
    scoreEl.textContent = (studentScore || 0) + '% - ' + grade;
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
    tName.textContent = window.assessmentTeacherName || 'Unknown Teacher';
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
    var sigUrl = window.assessmentTeacherSignature || '';
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
    dateEl.innerHTML = 'Issued on: <strong style="color:#1a1a2e;">' + formatDate(new Date()) + '</strong>';
    footer.appendChild(dateEl);
    
    var idEl = document.createElement('div');
    var certId = 'CERT-' + String(Date.now()).slice(-6);
    idEl.innerHTML = 'Certificate ID: <strong style="color:#1a1a2e;">' + certId + '</strong>';
    footer.appendChild(idEl);
    
    var codeEl = document.createElement('div');
    codeEl.innerHTML = 'Code: <strong style="color:#1a1a2e;">' + (currentAssessmentCode || 'CODE-0000') + '</strong>';
    footer.appendChild(codeEl);
    
    cleanCert.appendChild(content);
    cleanCert.appendChild(footer);
    tempDiv.appendChild(cleanCert);
    document.body.appendChild(tempDiv);
    
    // --- Generate Image ---
    setTimeout(function() {
        html2canvas(cleanCert, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 297 * 3.779,
            height: 210 * 3.779,
            logging: false
        }).then(function(canvas) {
            var link = document.createElement('a');
            link.download = 'Certificate-' + studentName + '.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            document.body.removeChild(tempDiv);
        });
    }, 500);
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
    clearQuizState();
    preloadedImageCache = {};
    document.getElementById('studentResultsSection').style.display = 'none';
    document.getElementById('studentCertificateSection').style.display = 'none';
    document.getElementById('studentQuizSection').style.display = 'none';
    document.getElementById('studentInfoForm').style.display = 'block';
    document.getElementById('studentNameInput').value = '';
    document.getElementById('studentClassInput').value = '';
    document.getElementById('studentCustomClass').value = '';
    document.querySelector('.custom-class-wrapper-student').style.display = 'none';
    studentQuestions = [];
    studentAnswers = [];
    studentCurrentIndex = 0;
    studentTimeRemaining = 0;
    studentIsTimeUp = false;
    document.getElementById('studentTimerDisplay').textContent = '00:00';
    document.getElementById('studentTimerDisplay').classList.remove('warning', 'expired');
    updateURL('student');
}

// ============================================================
// TEACHER: VIEW RESULTS
// ============================================================

var teacherResultsCache = [];
var teacherAssessmentsCache = [];

async function attachPassMarks(results) {
    var assessments = await getAllAssessmentsFromDatabase();
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
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    var allResults = await getAllResultsFromDatabase();
    var filtered = allResults.filter(function(r) { return r.teacherEmail === teacherEmail; });
    filtered = await attachPassMarks(filtered);
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
}

function applyTeacherFilters() {
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

    var tbody = document.getElementById('teacherResultsTableBody');
    if (!tbody) return;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#6b7a8f; padding:40px;">No results found.</td></tr>';
        return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
        var item = filtered[j];
        var scoreClass = item.score >= 70 ? 'score-high' : (item.score >= 50 ? 'score-mid' : 'score-low');
        var tabSwitchCell = item.tabSwitches > 0 ? '<span style="color:#e67e22; font-weight:600;">' + item.tabSwitches + '</span>' : '0';
        html += '<tr><td>' + (j+1) + '</td><td>' + item.className + '</td><td>' + item.studentName + '</td><td>' + item.subject + '</td><td class="' + scoreClass + '">' + item.score + '%</td><td>' + item.correctAnswers + '/' + item.totalQuestions + '</td><td>' + item.timeTaken + '</td><td>' + tabSwitchCell + '</td><td>' + item.date + '</td></tr>';
    }
    tbody.innerHTML = html;
}

function teacherExportResults() {
    var filtered = teacherResultsCache;
    if (filtered.length === 0) { alert('No results to export.'); return; }

    var headers = ['Class', 'Student', 'Subject', 'Score', 'Correct', 'Total', 'Time Taken', 'Tab Switches', 'Date'];
    var csv = headers.join(',') + '\n';
    for (var i = 0; i < filtered.length; i++) {
        var row = ['"' + filtered[i].className + '"', '"' + filtered[i].studentName + '"', '"' + filtered[i].subject + '"', filtered[i].score, filtered[i].correctAnswers, filtered[i].totalQuestions, filtered[i].timeTaken, filtered[i].tabSwitches || 0, '"' + filtered[i].date + '"'];
        csv += row.join(',') + '\n';
    }
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cleverment_teacher_results_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function teacherClearResults() {
    if (!confirm('Delete all your results? This cannot be undone!')) return;
    var teacherEmail = currentTeacher ? currentTeacher.email : 'unknown';
    try {
        var { error } = await supabase
            .from('cleverment_results')
            .delete()
            .eq('teacher_email', teacherEmail);
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
    } catch (e) {
        alert('Error: ' + e.message);
        return;
    }
    var localResults = getAllResultsLocal();
    var filtered = localResults.filter(function(r) { return r.teacherEmail !== teacherEmail; });
    localStorage.setItem('cleverment_all_results', JSON.stringify(filtered));
    renderTeacherDashboard();
}

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

function adminLogin() {
    var password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('cleverment_admin_session', 'true');
        document.getElementById('adminAuth').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        renderAdminDashboard();
        updateURL('admin-dashboard');
    } else {
        alert('Invalid admin password.');
    }
}

function adminLogout() {
    localStorage.removeItem('cleverment_admin_session');
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminAuth').style.display = 'block';
    document.getElementById('adminPassword').value = '';
    updateURL('admin');
}

async function renderAdminDashboard() {
    renderAdminTeacherList();
    renderAdminAssessmentList();
    renderAdminResults();
    renderAdminActivityLog();
    renderAdminFileList();
}

async function renderAdminTeacherList() {
    var container = document.getElementById('adminTeacherList');
    if (!container) return;
    
    var teachers = await getAllTeachersFromDatabase();
    
    if (!teachers || teachers.length === 0) {
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
            '</div>' +
            '<div style="display:flex; gap:6px;">' +
            '<button onclick="adminPauseTeacher(' + teachers[i].id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:' + pauseColor + '; color:white;">' + pauseText + '</button>' +
            '<button onclick="adminDeleteTeacher(' + teachers[i].id + ')" class="secondary-btn" style="font-size:12px; padding:4px 12px; background:#dc3545; color:white;">Remove</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
}

var adminAssessmentsCache = [];

async function renderAdminAssessmentList() {
    var container = document.getElementById('adminAssessmentList');
    if (!container) return;

    var assessments = await getAllAssessmentsFromDatabase();
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
            '<div><strong>' + a.subject + '</strong> <span style="color:#6b7a8f; font-size:13px;">(' + a.className + ' | ' + a.questions.length + ' questions | ' + timeDisplay + ')</span><br>' +
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

    var teachers = await getAllTeachersFromDatabase();
    var teacher = null;
    for (var i = 0; i < teachers.length; i++) {
        if (teachers[i].id === id) {
            teacher = teachers[i];
            break;
        }
    }
    
    if (!teacher) {
        alert('Teacher not found.');
        return;
    }
    
    var newPaused = !teacher.paused;
    
    try {
        var { error } = await supabase
            .from('cleverment_teachers')
            .update({ paused: newPaused })
            .eq('id', id);
        
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
        
        alert(newPaused ? 'Teacher paused.' : 'Teacher unpaused.');
        renderAdminTeacherList();
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

async function adminDeleteTeacher(id) {
    if (!confirm('Delete this teacher? This will permanently remove their account and all their data.')) return;
    
    try {
        var { error } = await supabase
            .from('cleverment_teachers')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
        
        var teachers = getTeachersLocal();
        var filtered = teachers.filter(function(t) { return t.id !== id; });
        saveTeachersLocal(filtered);
        
        alert('Teacher deleted successfully.');
        renderAdminTeacherList();
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

function adminDeleteAllTeachers() {
    if (!confirm('Delete ALL teachers? This cannot be undone!')) return;
    saveTeachersLocal([]);
    renderAdminTeacherList();
}

var adminResultsCache = [];

async function renderAdminResults() {
    var results = await getAllResultsFromDatabase();
    results = await attachPassMarks(results);
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
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#6b7a8f; padding:40px;">No results found.</td></tr>';
        return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
        var item = filtered[j];
        var scoreClass = item.score >= 70 ? 'score-high' : (item.score >= 50 ? 'score-mid' : 'score-low');
        var tabSwitchCell = item.tabSwitches > 0 ? '<span style="color:#e67e22; font-weight:600;">' + item.tabSwitches + '</span>' : '0';
        html += '<tr><td>' + (j+1) + '</td><td>' + item.teacherEmail + '</td><td>' + item.className + '</td><td>' + item.studentName + '</td><td>' + item.subject + '</td><td class="' + scoreClass + '">' + item.score + '%</td><td>' + item.correctAnswers + '/' + item.totalQuestions + '</td><td>' + tabSwitchCell + '</td><td>' + item.date + '</td></tr>';
    }
    tbody.innerHTML = html;
}

function adminExportAllResults() {
    var results = adminResultsCache;
    if (results.length === 0) { alert('No results to export.'); return; }

    var headers = ['Teacher', 'Class', 'Student', 'Subject', 'Score', 'Correct', 'Total', 'Tab Switches', 'Date'];
    var csv = headers.join(',') + '\n';
    for (var i = 0; i < results.length; i++) {
        var row = ['"' + results[i].teacherEmail + '"', '"' + results[i].className + '"', '"' + results[i].studentName + '"', '"' + results[i].subject + '"', results[i].score, results[i].correctAnswers, results[i].totalQuestions, results[i].tabSwitches || 0, '"' + results[i].date + '"'];
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
    try {
        var { error } = await supabase
            .from('cleverment_results')
            .delete()
            .neq('id', -1);
        if (error) {
            alert('Error: ' + error.message);
            return;
        }
    } catch (e) {
        alert('Error: ' + e.message);
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
    
    var html = '';
    for (var i = 0; i < activities.length; i++) {
        var item = activities[i];
        var date = new Date(item.created_at).toLocaleString();
        var actionColor = '#2d6cdf';
        if (item.action === 'signup') actionColor = '#2d9c5c';
        else if (item.action === 'publish_assessment') actionColor = '#e67e22';
        else if (item.action === 'login') actionColor = '#6f42c1';
        
        html += '<div style="background:white; padding:10px 14px; border-radius:8px; border-left:4px solid ' + actionColor + '; margin-bottom:6px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
            '<div><strong>' + item.teacher_email + '</strong> <span style="color:#1a1a2e;">' + item.action.replace(/_/g, ' ') + '</span>' +
            (item.details ? ' <span style="color:#6b7a8f; font-size:13px;">' + item.details + '</span>' : '') +
            '</div><span style="color:#8a9aa8; font-size:11px;">' + date + '</span></div>';
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
