// ============================================================
// CLEVERMENT FAQ - ROBUST KNOWLEDGE BASE
// ============================================================

var SUPABASE_URL_FAQ = 'https://tcodtuqirkzzpxggxqaa.supabase.co';
var SUPABASE_ANON_KEY_FAQ = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjb2R0dXFpcmt6enB4Z2d4cWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMDk2MDEsImV4cCI6MjEwMjc4NTYwMX0.CN-kWafaN37VW9YCw6kLdetzBEl_DddPbdh1MeOl02k';
var supabaseFAQ = null;
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseFAQ = supabase.createClient(SUPABASE_URL_FAQ, SUPABASE_ANON_KEY_FAQ);
    }
} catch(e){ console.warn('Supabase FAQ not ready', e); }

var currentFaqTab = 'teacher';

// ================= DEFAULT FAQ DATA =================
var defaultFAQs = {
    teacher: [
        {
            category: "Getting Started",
            q: "What is CleverMent and how does it work?",
            a: `<p><strong>CleverMent</strong> is a Smart Assessment Platform built for teachers and students from Primary to University level.</p>
            <p><strong>Flow:</strong></p>
            <ol>
                <li>Teacher signs up / logs in</li>
                <li>Teacher uploads questions via CSV or loads from Question Bank</li>
                <li>Teacher fills Subject, Class, Timer, Shuffle, Monitoring, Pass Mark, Availability, Certificate details and clicks <b>Publish</b></li>
                <li>System generates a code like <code>MAT-PRI-865</code></li>
                <li>Teacher shares code with students</li>
                <li>Students enter code → take quiz → get instant score, corrections & certificate</li>
                <li>Teacher views results, analytics, attendance in dashboard</li>
            </ol>`
        },
        {
            category: "Teacher Account",
            q: "How do I create a teacher account?",
            a: `<p>On the landing page, click <b>I'm a Teacher</b> → <b>Sign Up</b> tab.</p>
            <ol>
                <li>Enter Full Name, Email, Password, Confirm Password</li>
                <li>Click Sign Up</li>
                <li>You will get "Account created successfully!"</li>
                <li>Now login with your email and password</li>
            </ol>
            <p>Your session is saved in browser so you stay logged in.</p>`
        },
        {
            category: "Teacher Account",
            q: "How do I log in, log out, and stay logged in?",
            a: `<p><b>Login:</b> Landing → I'm a Teacher → Enter Email/Password → Login. You'll be redirected to <code>?page=teacher-dashboard</code>.</p>
            <p><b>Stay logged in:</b> We save <code>cleverment_teacher_session</code> and token in localStorage. Closing browser doesn't log you out.</p>
            <p><b>Logout:</b> In teacher dashboard, click Logout button. This clears session and takes you back to login page.</p>`
        },
        {
            category: "Teacher Account",
            q: "I forgot my password - how do I reset it?",
            a: `<p>On Teacher login page, click <b>Forgot Password?</b></p>
            <ol>
                <li>Enter your registered email</li>
                <li>Click Send Reset Link</li>
                <li>Our backend sends you an email via EmailJS with a reset link containing a time-limited token</li>
                <li>Open the link → Enter New Password → Confirm → Submit</li>
                <li>Login with new password</li>
            </ol>
            <p><i>Check spam folder if you don't see email.</i></p>`
        },
        {
            category: "Teacher Account",
            q: "My account is paused / needs reactivation - what do I do?",
            a: `<p>Admin can pause accounts. If you try to login and see reactivation screen:</p>
            <ol>
                <li>You'll see fee amount (set by Admin in <code>cleverment_settings</code>)</li>
                <li>Click <b>Pay to Reactivate</b> → Flutterwave payment modal</li>
                <li>After successful payment, backend verifies via callback</li>
                <li>Your account is unpaused automatically</li>
            </ol>`
        },
        {
            category: "Creating Questions",
            q: "What is the exact CSV format for questions?",
            a: `<p>CSV must have header row in this order (7 columns minimum):</p>
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin:10px 0;">
                <tr style="background:#f8fafc; font-weight:600;"><td style="border:1px solid #eef2f6; padding:6px;">question</td><td style="border:1px solid #eef2f6; padding:6px;">optionA</td><td style="border:1px solid #eef2f6; padding:6px;">optionB</td><td style="border:1px solid #eef2f6; padding:6px;">optionC</td><td style="border:1px solid #eef2f6; padding:6px;">optionD</td><td style="border:1px solid #eef2f6; padding:6px;">correctAnswer</td><td style="border:1px solid #eef2f6; padding:6px;">image (optional)</td></tr>
                <tr><td style="border:1px solid #eef2f6; padding:6px;">What is 2+2?</td><td style="border:1px solid #eef2f6; padding:6px;">3</td><td style="border:1px solid #eef2f6; padding:6px;">4</td><td style="border:1px solid #eef2f6; padding:6px;">5</td><td style="border:1px solid #eef2f6; padding:6px;">6</td><td style="border:1px solid #eef2f6; padding:6px;">B</td><td style="border:1px solid #eef2f6; padding:6px;">https://...</td></tr>
            </table>
            <ul>
                <li><b>correctAnswer</b> must be A, B, C, or D (case-insensitive)</li>
                <li><b>image</b> can be empty or a direct image URL</li>
                <li>Wrap text with commas in double quotes: <code>"What is the capital, of Nigeria?"</code></li>
                <li>Use UTF-8, save as .csv</li>
                <li>You can add math with <code>$x^2$</code> inside any cell - KaTeX will render it</li>
            </ul>`
        },
        {
            category: "Creating Questions",
            q: "Can I use math equations and symbols in questions?",
            a: `<p>Yes! KaTeX is built-in.</p>
            <ul>
                <li>Inline math: wrap in single dollars → <code>$E = mc^2$</code> renders as E = mc²</li>
                <li>Display math: double dollars → <code>$$\\frac{a}{b}$$</code></li>
                <li>Unicode works too: × ÷ √ π ½ ² ≤ ≥ etc.</li>
                <li>Works in question text, options, and even CSV cells</li>
            </ul>
            <p>Example: <code>What is $\\sqrt{16}$?</code></p>`
        },
        {
            category: "Creating Questions",
            q: "How do I add images to questions?",
            a: `<p>In CSV, 7th column is image URL. Upload image to postimg.cc, imgur, or your drive (public link) and paste link.</p>
            <p>In quiz, images are preloaded via <code>studentPreloadImages()</code> as soon as assessment starts, so they appear instantly instead of taking a minute to load.</p>
            <p>Student view shows image below question text with loading spinner if needed.</p>`
        },
        {
            category: "Creating Questions",
            q: "What is Question Bank and how do I use it?",
            a: `<p>Question Bank lets you save question sets for reuse, so you don't re-upload CSV every time.</p>
            <ol>
                <li><b>Save:</b> After uploading CSV (or loading one), click <b>Save Current as Question Bank</b> → Enter name e.g., "JSS2 Maths - Algebra" → OK. Saved to <code>cleverment_question_banks</code> table with your teacher_email.</li>
                <li><b>Load:</b> Select from dropdown <b>-- Select a saved question set --</b> → Click <b>Load</b>. It fills teacherQuestions and shows "✓ X questions loaded"</li>
                <li><b>Delete:</b> Select a bank → Click Delete → Confirm</li>
            </ol>
            <p>All banks are per-teacher (filtered by teacher_email).</p>`
        },
        {
            category: "Publishing Assessment",
            q: "Step-by-step: How to publish an assessment?",
            a: `<ol>
                <li>Login as Teacher → Dashboard</li>
                <li>In <b>Upload Section</b>: Choose <b>Subject</b> (or Other → custom), <b>Class</b> (or Other → custom)</li>
                <li>Set <b>Timer</b> (5 mins to 3 hours, or 0 for no limit), <b>Pass Mark %</b> (default 50%)</li>
                <li>Optional: Set <b>Available From / Until</b> datetime - controls when students can access</li>
                <li>Toggle: <b>Shuffle Questions</b> (randomizes order per student), <b>Camera Monitoring</b>, <b>Noise Monitoring</b></li>
                <li>Enter <b>Certificate Name</b> (your name on certificate) and upload <b>Signature Image</b> (preview shown)</li>
                <li>Upload CSV or Load from Question Bank</li>
                <li>Click <b>Publish Assessment</b></li>
                <li>You'll see alert: <code>Assessment published! Code: MAT-JSS2-123</code> → Code is copied and shown in Published List</li>
            </ol>
            <p>Data saved to <code>cleverment_assessments</code> + localStorage fallback + CSV history.</p>`
        },
        {
            category: "Publishing Assessment",
            q: "What do Shuffle, Camera, Noise, Pass Mark, and Availability mean?",
            a: `<ul>
                <li><b>Shuffle Questions & Options:</b> If checked, both question order and A-D options shuffle per student via <code>shuffleOptionsForQuestion()</code>. Correct answer mapping is preserved.</li>
                <li><b>Camera Monitoring:</b> If enabled, requests camera permission before quiz. Uses face-api to check face visible every 3 seconds. 2 consecutive fails = 1 strike.</li>
                <li><b>Noise Monitoring:</b> If enabled, uses AudioContext analyser, RMS > 0.12 for 3 seconds = 1 strike.</li>
                <li><b>Pass Mark:</b> Percentage to be considered PASSED on certificate/results. Default 50%.</li>
                <li><b>Available From/Until:</b> If set, students can only access within window. Otherwise always available. Logic in <code>getAssessmentWindowBlockMessage()</code></li>
                <li><b>Certificate Name/Signature:</b> Printed at bottom of student certificate.</li>
            </ul>`
        },
        {
            category: "Publishing Assessment",
            q: "How is the assessment code generated and shared?",
            a: `<p>Code format: <code>SUBJECT-CLASS-RANDOM</code> e.g., <code>MAT-PRI-865</code> or <code>ENG-SSS3-123</code></p>
            <ul>
                <li>First 3 letters of subject uppercase</li>
                <li>Class code (PRI, JSS, SSS, UNI etc.)</li>
                <li>Last 3 digits of Date.now()</li>
            </ul>
            <p><b>To share:</b> In Published List, click <b>Copy Code</b> button → <code>navigator.clipboard.writeText(code)</code>. Share via WhatsApp, SMS, or board.</p>
            <p>Students enter this exact code on Student Access page. Input is auto-uppercased, max 11 chars.</p>`
        },
        {
            category: "Managing Published",
            q: "Where do I see my published assessments and what do badges mean?",
            a: `<p>Dashboard → <b>Published Assessments</b> section → scrollable panel.</p>
            <p>Each item shows: Subject | Class | X questions | Time | Monitoring badges | Availability badge | Date | Teacher email</p>
            <ul>
                <li><span style="background:#e8f5e9; color:#2d9c5c; padding:2px 6px; border-radius:4px;">Live now</span> - Currently within availability window</li>
                <li><span style="background:#fff3e0; color:#e67e22; padding:2px 6px; border-radius:4px;">Upcoming</span> - Not yet started</li>
                <li><span style="background:#fdecec; color:#dc3545; padding:2px 6px; border-radius:4px;">Expired</span> - Past Until date</li>
                <li>📷 / 🎙️ icons if monitoring enabled</li>
            </ul>
            <p>Filtered by your teacher_email only (via <code>teacherAssessmentsCache</code>).</p>`
        },
        {
            category: "Managing Published",
            q: "How do I delete a published assessment?",
            a: `<p>In Published List, click <b>Delete</b> next to assessment → Confirm.</p>
            <p>This deletes from <code>cleverment_assessments</code> table via Supabase <code>.delete().eq('id', id)</code> and from localStorage <code>cleverment_published</code>.</p>
            <p><b>Note:</b> Results already submitted for that code remain in results table - they are not deleted automatically. Delete results separately if needed.</p>
            <p>There is no edit - to edit, delete and republish with corrections.</p>`
        },
        {
            category: "Class Roster",
            q: "What is Class Roster and Attendance tracking?",
            a: `<p>Roster = list of all student names in a class, so you know who hasn't taken assessment.</p>
            <ol>
                <li>Dashboard → <b>Class Roster</b> section</li>
                <li>Select Class (e.g., Primary 2)</li>
                <li>Textarea appears - enter one name per line: <br><code>John Doe<br>Jane Smith<br>...</code></li>
                <li>Click <b>Save Roster</b> → Saves to <code>cleverment_rosters</code> table (teacher_email + class_name)</li>
            </ol>
            <p>Then in Analytics, when you pick an assessment code, it compares roster vs <code>student_name</code> from results to show: Present, Absent, with counts.</p>
            <p>Functions: <code>getRosterForClass()</code>, <code>saveClassRoster()</code>, <code>getAttendanceForAssessment()</code></p>`
        },
        {
            category: "Analytics",
            q: "What is Question Analytics and how does it help?",
            a: `<p>Analytics aggregates every submission's per-question answers (matched by question text, since shuffle means position isn't stable).</p>
            <p>Dashboard → <b>Analytics</b> → Select assessment code from dropdown <code>teacherAnalyticsSelect</code> → Click <b>Load Analytics</b></p>
            <p>It shows:</p>
            <ul>
                <li>Attendance block: Who took it, who didn't (from roster)</li>
                <li>Based on X attempts, worst-performing questions first</li>
                <li>Each question: Wrong count / Total, Wrong % bar (red if >=60%, orange if >=40%, green otherwise)</li>
            </ul>
            <p>Function: <code>getQuestionAnalyticsForCode(code)</code> reads from <code>cleverment_results.answers</code></p>`
        },
        {
            category: "Analytics",
            q: "How do I download all certificates as ZIP?",
            a: `<p>In Analytics section, after selecting an assessment code, click <b>Download All Certificates (ZIP)</b></p>
            <ol>
                <li>It fetches all results for that assessment_code from <code>cleverment_results</code></li>
                <li>For each student, calls <code>generateCertificatePDFBlob()</code> which builds certificate DOM via <code>buildCertificateElement()</code> with html2canvas → jsPDF blob</li>
                <li>Adds each PDF to JSZip with unique name handling <code>usedNames</code></li>
                <li>Downloads <code>certificates_CODE_date.zip</code></li>
            </ol>
            <p>Button text changes to "Generating 1 of 20..." during process.</p>`
        },
        {
            category: "Results Dashboard",
            q: "How to view, filter, and export results?",
            a: `<p>Dashboard → <b>Results</b> section → Table shows all your results (filtered by teacher_email)</p>
            <p><b>Stats cards:</b> Total Students, Average Score, Pass Rate (based on passMark), Classes count</p>
            <p><b>Filters:</b></p>
            <ul>
                <li>Class dropdown: built from unique classNames in your results</li>
                <li>Subject dropdown: unique subjects</li>
                <li>Sort: Newest, Oldest, Highest Score, Lowest Score</li>
            </ul>
            <p>Function <code>applyTeacherFilters()</code> filters <code>teacherResultsCache</code></p>
            <p><b>Columns:</b> # | Class | Student | Subject | Score% | Correct/Total | Time Taken | Tab Switches (orange if >0) | Cam/Noise Flags (red if >0) | Date</p>
            <p><b>Export:</b> Click <b>Export CSV</b> → generates CSV with headers Class,Student,Subject,Score,Correct,Total,Time Taken,Tab Switches,Date → downloads <code>cleverment_teacher_results_YYYY-MM-DD.csv</code></p>
            <p><b>Clear:</b> Delete all your results from both Supabase and localStorage.</p>`
        },
        {
            category: "Results Dashboard",
            q: "What do Tab Switches and Proctor Violations mean in results?",
            a: `<ul>
                <li><b>Tab Switches:</b> Counted when student leaves tab/window (visibilitychange or blur). Not blocked, just counted via <code>studentTabSwitchCount++</code> and reported. Orange badge if >0.</li>
                <li><b>Proctor Violations (Cam/Noise Flags):</b> Counted as <code>studentProctorStrikes</code>. Camera: face not visible 2 consecutive checks (3 sec interval). Noise: RMS >0.12 for 3 seconds. 2 warnings shown via <code>proctorViolationOverlay</code>, 3rd strike = auto-submit via <code>endQuizForProctorViolation()</code>. Nothing is recorded or uploaded, only count is saved.</li>
            </ul>
            <p>Teacher should use judgment - don't auto-fail based on these, investigate.</p>`
        },
        {
            category: "CSV History",
            q: "What is CSV History?",
            a: `<p>Every time you publish, we save CSV to <code>cleverment_csv_history</code> with teacher_email, filename, question_count, subject, class_name, file_content (JSON), created_at.</p>
            <p>Dashboard → <b>CSV History</b> scrollable panel shows recent uploads. Each has <b>Use Again</b> and <b>Delete</b> buttons.</p>
            <p><b>Use Again:</b> Loads file_content into teacherQuestions, pre-fills Subject/Class dropdowns if found, shows message to publish.</p>
            <p>Functions: <code>saveCSVHistory()</code>, <code>getCSVHistory()</code>, <code>renderCSVHistory()</code>, <code>reuseCSV()</code></p>`
        }
    ],
    student: [
        {
            category: "Getting Started",
            q: "How do I access my assessment?",
            a: `<p><b>You need an Assessment Code from your teacher</b> e.g., <code>MAT-PRI-865</code></p>
            <ol>
                <li>Go to CleverMent landing page → Click <b>I'm a Student</b></li>
                <li>Enter code (auto uppercase, 11 chars max, e.g., MAT-PRI-865)</li>
                <li>Click <b>Access Assessment</b></li>
                <li>System checks code via <code>getAssessmentByCodeFromDatabase(code)</code> from Supabase <code>cleverment_assessments</code>, falls back to localStorage <code>cleverment_published</code></li>
                <li>If valid and within availability window, you go to info form. If invalid, "Invalid assessment code"</li>
            </ol>`
        },
        {
            category: "Getting Started",
            q: "What if my code says Invalid, Expired, Upcoming, or Already Taken?",
            a: `<ul>
                <li><b>Invalid:</b> Code doesn't exist - check spelling with teacher, uppercase matters</li>
                <li><b>Expired / Not yet available:</b> Teacher set Available From/Until. Message from <code>getAssessmentWindowBlockMessage()</code> shows exact window. Example: "This assessment is not available until 20 May 2026, 9:00 AM"</li>
                <li><b>Already taken:</b> You can only take a given assessment once per browser (checked via localStorage and database student_name + code). Message: "You have already taken this assessment. If this is a mistake, contact teacher."</li>
            </ul>`
        },
        {
            category: "Before Starting",
            q: "What do I fill in the Student Info form?",
            a: `<p>After valid code, you see:</p>
            <ul>
                <li><b>Assessment Title & Subject:</b> e.g., "Mathematics - Primary 2 | 10 questions"</li>
                <li><b>Student Name:</b> Full name - used for certificate & results. Must not be empty.</li>
                <li><b>Class:</b> Dropdown: Primary 1-6, JSS1-3, SSS1-3, University 100-400, Other. If Other → custom input appears.</li>
                <li>Click <b>Start Assessment</b></li>
            </ul>
            <p>If monitoring is enabled, you'll see Warning Screen next. If not, quiz starts directly via <code>proceedToStartQuiz()</code>.</p>`
        },
        {
            category: "Before Starting",
            q: "What is the Monitoring Notice screen?",
            a: `<p>If teacher enabled Camera and/or Noise monitoring, you see red-bordered notice before quiz:</p>
            <p id="proctorWarningRules"><strong>This assessment requires camera and microphone access. You will get 2 warnings. On 3rd violation, assessment auto-submits. Your face must stay visible and background noise low.</strong></p>
            <ul>
                <li>Shows exact rules based on what's enabled</li>
                <li>Click <b>I UNDERSTAND, START ASSESSMENT</b></li>
                <li>Browser asks: "Allow camera/microphone?" → Must click Allow</li>
                <li>If you block, error shown: "Camera/microphone access is required..."</li>
                <li>On success, stream stored in <code>proctorMediaStream</code> and quiz starts</li>
            </ul>
            <p>Nothing is recorded - only live checks. See <code>startProctorMonitoring()</code></p>`
        },
        {
            category: "During Quiz",
            q: "How do I navigate the quiz?",
            a: `<p><b>Quiz Header:</b> Title, Timer (e.g., 19:45), Progress Q3 of 10</p>
            <p><b>Question Boxes:</b> Top row of boxes 1-10 - colors:</p>
            <ul>
                <li>Blue border = current question</li>
                <li>Green background = answered</li>
                <li>White = unanswered</li>
            </ul>
            <p>Click any box to jump via <code>studentGoToQuestion(index)</code></p>
            <p><b>Question Area:</b> Question text (with KaTeX math rendering), optional image (preloaded), 4 options A-D (shuffled if teacher enabled shuffle)</p>
            <p><b>Select:</b> Click option → adds selected class, saves to <code>studentAnswers[index]</code>, updates boxes, auto-advances to next after 300ms if not last</p>
            <p><b>Buttons:</b> Previous / Next / Submit (Submit only on last question or anytime)</p>
            <p>State saved continuously via <code>saveQuizState()</code> to localStorage <code>cleverment_quiz_state</code> so refresh doesn't lose progress.</p>`
        },
        {
            category: "During Quiz",
            q: "How does the timer work?",
            a: `<p>Timer comes from teacher's setting <code>timeLimit</code> in seconds (e.g., 1200 = 20 mins)</p>
            <ul>
                <li>Displayed as MM:SS e.g., 14:32 via <code>studentTimerDisplay</code></li>
                <li>If timeLimit = 0, shows ∞ (no limit)</li>
                <li>When <=20% time left, adds <code>warning</code> class → red pulsing via <code>@keyframes pulse</code></li>
                <li>When time reaches 0, calls <code>studentTimeUp()</code> → shows "Time's Up!" overlay + auto submits via <code>studentSubmitQuiz()</code></li>
                <li>Timer interval saved via <code>studentStartTimer()</code> setInterval 1s, decrements <code>studentTimeRemaining--</code></li>
            </ul>`
        },
        {
            category: "During Quiz",
            q: "Why do images and math take time to load?",
            a: `<p>Fixed! We preload all question images at start via <code>studentPreloadImages()</code>:</p>
            <ul>
                <li>Loops through <code>studentQuestions</code> and creates Image objects cached in <code>preloadedImageCache</code></li>
                <li>When displaying question, if cached, shows instantly, else shows loading spinner <code>studentQuestionImageLoading</code></li>
                <li>Math rendered via KaTeX <code>renderMathIn()</code> - wraps $...$ → calls <code>katex.render()</code></li>
            </ul>
            <p>If image still slow, check internet. Teacher should use compressed images (<500KB) and direct links.</p>`
        },
        {
            category: "Monitoring Rules",
            q: "What is Tab Switch detection?",
            a: `<p>If you switch tab, minimize, or open another app during quiz:</p>
            <ul>
                <li>Event listeners: <code>visibilitychange</code> + <code>blur</code> → <code>studentTabSwitchCount++</code></li>
                <li>Does NOT block you or pause quiz - just counts</li>
                <li>Shows warning banner <code>studentTabSwitchWarning</code> briefly</li>
                <li>Count saved in result and shown to teacher as orange badge</li>
                <li>Teacher uses judgment - not auto-fail</li>
            </ul>
            <p>Stay on quiz tab to avoid flags.</p>`
        },
        {
            category: "Monitoring Rules",
            q: "How does Camera and Noise monitoring work?",
            a: `<p>Only if teacher enabled them:</p>
            <p><b>Camera:</b></p>
            <ul>
                <li>Preview shown bottom-right <code>proctorCameraPreviewBox</code></li>
                <li>Every 3 seconds, <code>runFaceCheck()</code> via face-api TinyFaceDetector</li>
                <li>If no face detected 2 times consecutively → 1 strike → shows <code>proctorViolationOverlay</code> with reason "Your face was not visible"</li>
            </ul>
            <p><b>Noise:</b></p>
            <ul>
                <li>Audio indicator shown</li>
                <li>AudioContext analyser, FFT 512, calculates RMS volume every 1 sec</li>
                <li>If RMS >0.12 for 3 consecutive seconds → 1 strike → "Excessive background noise detected"</li>
            </ul>
            <p><b>Strikes:</b> 1st & 2nd = warning modal, you click OK. 3rd = <code>endQuizForProctorViolation()</code> → alert + auto-submit. Count saved as <code>proctorViolations</code></p>
            <p>No video/audio is ever recorded, stored, or uploaded.</p>`
        },
        {
            category: "Monitoring Rules",
            q: "What if I refresh the page during quiz?",
            a: `<p>Quiz state is saved in localStorage <code>cleverment_quiz_state</code> with currentAssessment, questions, currentIndex, answers, timeRemaining, tabSwitches, proctorStrikes, teacher name/signature.</p>
            <p>On refresh, <code>restoreQuizState()</code> tries to restore:</p>
            <ul>
                <li>Rebuilds questions, current index, answers, timer</li>
                <li>If camera/mic was enabled, shows <code>proctorResumeOverlay</code> "Monitoring Paused" → Click <b>Resume Monitoring & Continue</b> → requests getUserMedia again</li>
                <li>If you don't resume, monitoring stays off but quiz continues</li>
            </ul>
            <p>So you don't lose progress, but you must re-allow camera/mic.</p>`
        },
        {
            category: "Submission",
            q: "How do I submit and how is score calculated?",
            a: `<p><b>Submit:</b> On last question, click <b>Submit</b> or <b>Submit Anyway</b> if unanswered. Confirm dialog if unanswered: "You have X unanswered question(s). Submit anyway?"</p>
            <p><b>Scoring in <code>studentSubmitQuiz()</code>:</b></p>
            <ul>
                <li>Loops through studentQuestions, compares <code>userAns</code> vs <code>q.correctAnswer</code> (letter A-D)</li>
                <li>Correct count → <code>studentScore = Math.round((correct/total)*100)</code></li>
                <li>Builds corrections array with question, userAnswer, correctAnswer, isCorrect</li>
                <li>Creates result object: teacherEmail, studentName, className, subject, score, correctAnswers, totalQuestions, timeTaken, assessmentCode, tabSwitches, proctorViolations, answers (corrections)</li>
                <li>Saves to Supabase <code>cleverment_results</code> via <code>saveResultToDatabase()</code> and localStorage <code>cleverment_all_results</code></li>
                <li>Shows Results Section with score, grade, details, corrections</li>
            </ul>`
        },
        {
            category: "Results",
            q: "What do I see after submitting?",
            a: `<p><b>Results Section:</b></p>
            <ul>
                <li>Big score display: e.g., 80% (8/10) with grade PASSED/NOT PASSED based on passMark</li>
                <li>Details: Class | Student | Subject | Time Taken</li>
                <li>Corrections: Each question with Your answer (green if correct, red if wrong) vs Correct answer, with explanation</li>
                <li>Math rendered again via KaTeX</li>
                <li>Buttons: <b>View Certificate</b>, <b>Download Certificate PDF/Image</b>, <b>Back to Home</b> (clears quiz state)</li>
            </ul>
            <p>URL updates to <code>?page=results</code></p>`
        },
        {
            category: "Certificate",
            q: "How does the certificate work?",
            a: `<p>Certificate is built via <code>buildCertificateElement(data)</code>:</p>
            <ul>
                <li>Contains: CleverMent logo, Student Name (big), Subject, Score%, Teacher Name + Signature image, Date, Certificate ID, Assessment Code</li>
                <li>Landscape A4 size, designed for printing</li>
                <li>Two download options:</li>
                <li><b>Download PDF:</b> Uses html2canvas to screenshot certificate → jsPDF to save as PDF (One Click Clean). Function <code>studentDownloadCertificatePDF()</code></li>
                <li><b>Download Image:</b> html2canvas → PNG via <code>studentDownloadCertificateImage()</code></li>
                <li><b>Print:</b> Print styles in CSS force landscape</li>
            </ul>
            <p>Certificate data uses window.assessmentTeacherName/Signature from assessment.</p>`
        },
        {
            category: "Troubleshooting Student",
            q: "Camera or microphone blocked - what to do?",
            a: `<p>If you denied permission:</p>
            <ol>
                <li>Click lock icon in browser address bar → Site settings → Allow Camera & Microphone</li>
                <li>Refresh page</li>
                <li>On proctor warning screen, click "I UNDERSTAND" again</li>
                <li>If still fails, try different browser (Chrome recommended) or device</li>
                <li>Contact teacher - they can disable monitoring for your assessment and republish</li>
            </ol>
            <p>On iOS, camera works only in Safari, not in PWA standalone mode if blocked previously - go to Settings → Safari → Clear history.</p>`
        },
        {
            category: "Troubleshooting Student",
            q: "I lost internet during quiz - will I lose my work?",
            a: `<p>No, because of localStorage persistence:</p>
            <ul>
                <li>Answers and timer saved every action via <code>saveQuizState()</code></li>
                <li>If offline, you can continue - submission will try Supabase first, then fallback to localStorage</li>
                <li>When back online, refresh → restoreQuizState() rebuilds quiz</li>
                <li>Timer continues even offline (based on local decrement)</li>
            </ul>
            <p>Try to keep internet for final submission so result reaches teacher's dashboard.</p>`
        }
    ],
    general: [
        {
            category: "General",
            q: "Is CleverMent free? What about payments?",
            a: `<p>CleverMent itself is free for students. Teachers sign up free.</p>
            <p>Payments only apply if Admin pauses teacher account for reactivation fee (via Flutterwave). Fee amount set by Admin in <code>cleverment_settings</code> table key <code>reactivation_fee</code>.</p>
            <p>Backend handles payment verification at <code>/api/auth/teacher/*</code> endpoints.</p>`
        },
        {
            category: "General",
            q: "Is CleverMent a PWA? Can I install it?",
            a: `<p>Yes! It's a Progressive Web App:</p>
            <ul>
                <li>Manifest: <code>manifest.json</code> with name CleverMent, theme #2d6cdf, display standalone</li>
                <li>Service Worker: <code>sw.js</code> v9, Network-First strategy - tries network first, falls back to cache if offline. Caches core files: index.html, style.css, script.js, fonts, KaTeX, Supabase, etc.</li>
                <li>On mobile, browser shows "Add to Home Screen" banner</li>
                <li>On iOS: Share → Add to Home Screen</li>
                <li>Installed app opens standalone without browser URL bar</li>
            </ul>
            <p>Custom prompt modal replaces window.prompt() which doesn't display in iOS standalone PWA mode.</p>`
        },
        {
            category: "General",
            q: "What browsers and devices are supported?",
            a: `<ul>
                <li><b>Best:</b> Chrome (desktop & Android) - full camera/mic, html2pdf, etc.</li>
                <li><b>Good:</b> Edge, Firefox, Safari (desktop)</li>
                <li><b>Mobile:</b> Chrome Android, Safari iOS - works, but camera monitoring may be more sensitive</li>
                <li><b>Not recommended:</b> In-app browsers (Facebook, Instagram) - may block camera. Open in system browser.</li>
                <li>Responsive CSS: @media max-width 768px adjusts container padding, buttons full-width, tables scrollable</li>
            </ul>`
        },
        {
            category: "Troubleshooting",
            q: "Common issues and quick fixes",
            a: `<ul>
                <li><b>Code not working:</b> Check uppercase, no spaces, ask teacher if code expired or deleted</li>
                <li><b>Images not showing:</b> Teacher used invalid URL or private drive link - need public direct image link. Preloading helps but bad URL = broken</li>
                <li><b>Math not rendering:</b> Ensure $...$ syntax correct, no spaces inside $$. Example: $x^2$ not $ x^2$</li>
                <li><b>Timer stuck:</b> Refresh - restoreQuizState() rebuilds timer. Check studentTimeLimit >0</li>
                <li><b>Results not showing for teacher:</b> Teacher filtering by wrong class/subject, or results in localStorage not Supabase - check internet during student submission</li>
                <li><b>Certificate blank:</b> html2canvas needs time - wait 1 sec, try again, ensure signature image is base64 or CORS-enabled URL</li>
                <li><b>Admin can't login:</b> Admin password stored in localStorage <code>cleverment_admin_token</code> or env - default check localStorage <code>cleverment_admin_session</code></li>
            </ul>`
        },
        {
            category: "General",
            q: "How is data stored? Is it safe?",
            a: `<p><b>Supabase (primary):</b> 8 tables:</p>
            <ul>
                <li><code>cleverment_teachers</code>: email, name, paused, etc.</li>
                <li><code>cleverment_assessments</code>: teacher_email, code, questions (JSON), time_limit, shuffle, monitoring flags, pass_mark, availability</li>
                <li><code>cleverment_results</code>: teacher_email, student_name, class_name, score, answers JSON, tab_switches, proctor_violations, etc.</li>
                <li><code>cleverment_question_banks</code>: teacher_email, name, questions JSON</li>
                <li><code>cleverment_csv_history</code>: history of uploads</li>
                <li><code>cleverment_rosters</code>: class attendance lists</li>
                <li><code>cleverment_teacher_activity</code>: log of signup/login/publish</li>
                <li><code>cleverment_settings</code>: reactivation_fee etc.</li>
            </ul>
            <p><b>localStorage fallback:</b> <code>cleverment_published</code>, <code>cleverment_all_results</code>, <code>cleverment_teachers</code>, <code>cleverment_quiz_state</code>, <code>cleverment_teacher_session</code>, <code>cleverment_admin_session</code></p>
            <p>Anon key is public but RLS policies should restrict. No sensitive data like passwords stored in Supabase directly - handled by backend API with hashing.</p>`
        },
        {
            category: "General",
            q: "How can Admin edit FAQs?",
            a: `<p>Admin Dashboard now has <b>FAQ Management</b> section (added in this update):</p>
            <ol>
                <li>Login as Admin → Admin Dashboard</li>
                <li>Scroll to <b>FAQ Management</b> - shows all FAQs from <code>cleverment_faqs</code> table + local defaults</li>
                <li><b>Add:</b> Select category (teacher/student/general), enter question & answer (HTML allowed), click Add FAQ → saves to Supabase <code>cleverment_faqs</code> and localStorage <code>cleverment_faqs_custom</code></li>
                <li><b>Edit:</b> Click Edit → modify → Save</li>
                <li><b>Delete:</b> Click Delete → Confirm</li>
                <li>Changes appear instantly on faq.html because faq.html loads custom FAQs from both Supabase and localStorage and merges with defaults</li>
            </ol>
            <p>If <code>cleverment_faqs</code> table doesn't exist yet, system uses localStorage only - Admin should create table in Supabase with columns: id (int8 pk), category (text), question (text), answer (text), created_at (timestamptz)</p>`
        }
    ]
};

// Merge with custom FAQs from localStorage and Supabase
var customFAQs = { teacher: [], student: [], general: [] };

function loadCustomFromLocal() {
    try {
        var stored = localStorage.getItem('cleverment_faqs_custom');
        if (stored) {
            var parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                // New format: array with category field
                parsed.forEach(function(item){
                    if (item.category && customFAQs[item.category]) {
                        customFAQs[item.category].push(item);
                    }
                });
            } else {
                // Old format object
                customFAQs = parsed;
            }
        }
    } catch(e){}
}

async function loadCustomFromSupabase() {
    if (!supabaseFAQ) return;
    try {
        var { data, error } = await supabaseFAQ.from('cleverment_faqs').select('*').order('created_at', {ascending: false});
        if (!error && data) {
            data.forEach(function(row){
                var cat = (row.category || 'general').toLowerCase();
                if (cat.includes('teacher')) cat = 'teacher';
                else if (cat.includes('student')) cat = 'student';
                else cat = 'general';
                customFAQs[cat].push({
                    q: row.question,
                    a: row.answer,
                    category: row.category,
                    id: row.id,
                    fromDB: true
                });
            });
        }
    } catch(e){ console.log('FAQ table not found or error, using local only', e); }
}

function getAllFAQsForTab(tab) {
    var defaults = defaultFAQs[tab] || [];
    var customs = customFAQs[tab] || [];
    return customs.concat(defaults); // customs first
}

function switchFaqTab(tab) {
    currentFaqTab = tab;
    document.querySelectorAll('.faq-tab-btn').forEach(function(btn){ btn.classList.remove('active'); });
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    document.querySelectorAll('.faq-section').forEach(function(sec){ sec.style.display = 'none'; });
    var target = document.getElementById('faq' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Section');
    if (target) target.style.display = 'block';
    renderFAQs();
    // Update URL
    try { history.replaceState(null, '', 'faq.html?tab=' + tab); } catch(e){}
}

function renderFAQs() {
    var searchTerm = (document.getElementById('faqSearchInput')?.value || '').toLowerCase().trim();
    var tabs = ['teacher', 'student', 'general'];
    
    tabs.forEach(function(tab){
        var container = document.getElementById('faq' + tab.charAt(0).toUpperCase() + tab.slice(1) + 'Section');
        if (!container) return;
        var all = getAllFAQsForTab(tab);
        
        // Filter by search if current tab matches or search is active
        var filtered = all.filter(function(item){
            if (!searchTerm) return true;
            return (item.q.toLowerCase().includes(searchTerm) || 
                    item.a.toLowerCase().includes(searchTerm) || 
                    (item.category && item.category.toLowerCase().includes(searchTerm)));
        });

        // Group by category
        var grouped = {};
        filtered.forEach(function(item, idx){
            var cat = item.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ ...item, _idx: idx });
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p class="helper-text" style="text-align:center; padding:40px;">No FAQs found for "' + searchTerm + '". Try different keywords.</p>';
            return;
        }

        var html = '';
        Object.keys(grouped).forEach(function(cat){
            html += '<div class="faq-category-block"><h3 class="faq-category-title">' + cat + ' (' + grouped[cat].length + ')</h3>';
            grouped[cat].forEach(function(item){
                var uid = tab + '-' + item._idx + '-' + Math.random().toString(36).substr(2,5);
                html += '<div class="faq-item" data-q="' + escapeHtml(item.q).toLowerCase() + '">' +
                    '<button class="faq-question" onclick="toggleFaq(\'' + uid + '\')">' +
                        '<span>' + item.q + '</span>' +
                        '<span class="faq-icon" id="icon-' + uid + '">+</span>' +
                    '</button>' +
                    '<div class="faq-answer" id="answer-' + uid + '" style="display:none;">' + item.a + '</div>' +
                '</div>';
            });
            html += '</div>';
        });
        container.innerHTML = html;
        // Render KaTeX math in answers
        try {
            if (typeof renderMathInElement !== 'undefined') {
                renderMathInElement(container, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ]
                });
            }
        } catch(e){}
    });
}

function toggleFaq(uid) {
    var ans = document.getElementById('answer-' + uid);
    var icon = document.getElementById('icon-' + uid);
    if (!ans) return;
    if (ans.style.display === 'none') {
        ans.style.display = 'block';
        ans.style.animation = 'slideDown 0.3s ease';
        if (icon) icon.textContent = '−';
    } else {
        ans.style.display = 'none';
        if (icon) icon.textContent = '+';
    }
}

function filterFAQs() {
    // If search term present, show all tabs content filtered
    var term = (document.getElementById('faqSearchInput')?.value || '').toLowerCase().trim();
    if (term.length > 0) {
        // Show all sections when searching
        document.querySelectorAll('.faq-section').forEach(function(sec){ sec.style.display = 'block'; });
        document.querySelectorAll('.faq-tab-btn').forEach(function(btn){ btn.classList.remove('active'); });
        // Keep current tab visually active but show all
        document.getElementById('tab' + currentFaqTab.charAt(0).toUpperCase() + currentFaqTab.slice(1))?.classList.add('active');
    } else {
        // Restore tab view
        switchFaqTab(currentFaqTab);
        return;
    }
    renderFAQs();
}

function escapeHtml(text) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m){ return map[m]; });
}

// Init
document.addEventListener('DOMContentLoaded', async function(){
    loadCustomFromLocal();
    await loadCustomFromSupabase();
    // Check URL tab param
    var params = new URLSearchParams(window.location.search);
    var tab = params.get('tab');
    if (tab && ['teacher','student','general'].includes(tab)) {
        currentFaqTab = tab;
    }
    switchFaqTab(currentFaqTab);
});
