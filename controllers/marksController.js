const Marks = require('../models/Marks');
const User = require('../models/User');
const { notifyResults } = require('../utils/notificationService');

// @desc    Upload marks for students
// @route   POST /api/marks
// @access  Private (Faculty/Admin)
const uploadMarks = async (req, res) => {
    try {
        const { marksData } = req.body; // Array of { studentUsn, obtainedMarks }
        const { class: className, subject, examType, maxMarks } = req.body;

        if (!marksData || !className || !subject || !examType || !maxMarks) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const results = [];

        for (const record of marksData) {
            // Find student by USN
            const student = await User.findOne({ 'studentData.usn': record.studentUsn });

            if (!student) {
                console.log(`Student not found: ${record.studentUsn}`);
                continue;
            }

            // Check if marks already uploaded for this exam
            const existing = await Marks.findOne({
                studentUsn: record.studentUsn,
                subject,
                examType,
            });

            if (existing) {
                // Update existing record
                existing.obtainedMarks = record.obtainedMarks;
                existing.maxMarks = maxMarks;
                await existing.save();
                results.push(existing);
            } else {
                // Create new record
                const newRecord = await Marks.create({
                    studentId: student._id,
                    studentUsn: record.studentUsn,
                    studentName: student.name,
                    class: className,
                    subject,
                    examType,
                    maxMarks,
                    obtainedMarks: record.obtainedMarks,
                    uploadedBy: req.user._id,
                });
                results.push(newRecord);
            }
        }

        res.status(201).json({
            message: 'Marks uploaded successfully',
            count: results.length,
            records: results,
        });
    } catch (error) {
        console.error('Upload marks error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get marks for a student
// @route   GET /api/marks?studentUsn=1SI21CS045
// @access  Private
const getMarks = async (req, res) => {
    try {
        const { studentUsn, class: className, subject, examType } = req.query;
        const query = {};

        if (studentUsn) query.studentUsn = studentUsn;
        if (className) query.class = className;
        if (subject) query.subject = subject;
        if (examType) query.examType = examType;

        // If student, force their USN
        if (req.user.role === 'student' && req.user.studentData?.usn) {
            query.studentUsn = req.user.studentData.usn;
        }

        const marks = await Marks.find(query)
            .sort({ date: -1 })
            .populate('uploadedBy', 'name email');

        res.json(marks);
    } catch (error) {
        console.error('Get marks error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get global results stats for admin
// @route   GET /api/marks/stats
// @access  Private (Admin)
const getGlobalStats = async (req, res) => {
    try {
        const allMarks = await Marks.find();

        if (allMarks.length === 0) {
            return res.json({ averagePercentage: 0, totalResults: 0 });
        }

        const totalObtained = allMarks.reduce((sum, m) => sum + m.obtainedMarks, 0);
        const totalMax = allMarks.reduce((sum, m) => sum + m.maxMarks, 0);

        const averagePercentage = ((totalObtained / totalMax) * 100).toFixed(1);

        res.json({
            averagePercentage,
            totalResults: allMarks.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Publish results and notify students
// @route   POST /api/marks/publish
// @access  Private (Admin)
const publishResults = async (req, res) => {
    try {
        const { branch, semester } = req.body;

        // Find students in this branch/sem
        const students = await User.find({
            role: 'student',
            'studentData.department': branch,
            'studentData.semester': semester
        });

        if (students.length === 0) {
            return res.status(404).json({ message: 'No students found for this selection' });
        }

        let sentCount = 0;
        for (const student of students) {
            // Check if student has marks for this sem
            const studentMarks = await Marks.findOne({ studentId: student._id, class: new RegExp(`${branch}.*Sem ${semester}`, 'i') });

            if (studentMarks) {
                await notifyResults(student, { semester: `${branch} - Sem ${semester}` });
                sentCount++;
            }
        }

        res.json({ message: `Results published. Notifications sent to ${sentCount} students.` });
    } catch (error) {
        console.error('Publish results error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export marksheet as printable HTML
// @route   GET /api/marks/export/:studentUsn
// @access  Private
const exportMarksheet = async (req, res) => {
    try {
        const { studentUsn } = req.params;
        const student = await User.findOne({ 'studentData.usn': studentUsn });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const marks = await Marks.find({ studentUsn }).sort({ subject: 1, examType: 1 });

        if (marks.length === 0) {
            return res.status(404).json({ message: 'No marks found for this student' });
        }

        // Group marks by subject
        const subjects = {};
        marks.forEach(m => {
            if (!subjects[m.subject]) subjects[m.subject] = [];
            subjects[m.subject].push(m);
        });

        const totalObtained = marks.reduce((s, m) => s + m.obtainedMarks, 0);
        const totalMax = marks.reduce((s, m) => s + m.maxMarks, 0);
        const percentage = ((totalObtained / totalMax) * 100).toFixed(1);

        let tableRows = '';
        let slNo = 1;
        for (const [subject, exams] of Object.entries(subjects)) {
            exams.forEach(exam => {
                const pct = ((exam.obtainedMarks / exam.maxMarks) * 100).toFixed(1);
                const status = pct >= 40 ? 'PASS' : 'FAIL';
                const statusColor = pct >= 40 ? '#22c55e' : '#ef4444';
                tableRows += `
                    <tr>
                        <td>${slNo++}</td>
                        <td>${subject}</td>
                        <td>${exam.examType}</td>
                        <td>${exam.maxMarks}</td>
                        <td>${exam.obtainedMarks}</td>
                        <td>${pct}%</td>
                        <td style="color:${statusColor};font-weight:bold">${status}</td>
                    </tr>
                `;
            });
        }

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Marksheet - ${student.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; padding: 40px; }
                .container { max-width: 800px; margin: 0 auto; border: 2px solid #1a2942; padding: 40px; }
                .header { text-align: center; border-bottom: 3px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { color: #1a2942; font-size: 24px; margin-bottom: 4px; }
                .header h2 { color: #d4af37; font-size: 16px; font-weight: 400; }
                .header h3 { color: #64748b; font-size: 14px; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; }
                .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; }
                .student-info p { font-size: 14px; }
                .student-info strong { color: #1a2942; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background: #1a2942; color: #fff; padding: 12px 8px; text-align: left; font-size: 13px; }
                td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                tr:nth-child(even) { background: #f8fafc; }
                .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
                .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
                .summary-card .value { font-size: 24px; font-weight: 700; color: #1a2942; }
                .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
                .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                @media print { body { padding: 20px; } .container { border: none; } }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Sapthagiri NPS University</h1>
                    <h2>Bengaluru, Karnataka</h2>
                    <h3>Academic Marksheet</h3>
                </div>
                <div class="student-info">
                    <p><strong>Student Name:</strong> ${student.name}</p>
                    <p><strong>USN:</strong> ${student.studentData?.usn || 'N/A'}</p>
                    <p><strong>Department:</strong> ${student.studentData?.department || 'N/A'}</p>
                    <p><strong>Semester:</strong> ${student.studentData?.semester || 'N/A'}</p>
                    <p><strong>Class:</strong> ${student.studentData?.class || 'N/A'}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Sl.No</th>
                            <th>Subject</th>
                            <th>Exam Type</th>
                            <th>Max Marks</th>
                            <th>Obtained</th>
                            <th>Percentage</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div class="summary">
                    <div class="summary-card">
                        <div class="value">${totalObtained}/${totalMax}</div>
                        <div class="label">Total Marks</div>
                    </div>
                    <div class="summary-card">
                        <div class="value">${percentage}%</div>
                        <div class="label">Overall Percentage</div>
                    </div>
                    <div class="summary-card">
                        <div class="value">${student.studentData?.cgpa || 'N/A'}</div>
                        <div class="label">CGPA</div>
                    </div>
                </div>
                <div class="footer">
                    <p>This is a computer-generated marksheet from Sapthagiri NPS University portal.</p>
                    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
                </div>
            </div>
            <script>window.onload = () => window.print();</script>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Export marksheet error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { uploadMarks, getMarks, getGlobalStats, publishResults, exportMarksheet };
