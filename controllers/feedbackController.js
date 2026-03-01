const Feedback = require('../models/Feedback');

// @desc    Create a new feedback/survey form
// @route   POST /api/feedback
// @access  Private (Admin/Faculty)
const createFeedback = async (req, res) => {
    try {
        const { title, description, type, targetCourse, targetFaculty, department, semester, questions, expiresAt } = req.body;

        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({ message: 'Title and at least one question are required' });
        }

        const feedback = await Feedback.create({
            title,
            description,
            type,
            targetCourse,
            targetFaculty,
            department,
            semester,
            questions,
            expiresAt,
            createdBy: req.user._id,
        });

        const populated = await Feedback.findById(feedback._id)
            .populate('createdBy', 'name email role')
            .populate('targetFaculty', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Create feedback error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all feedback forms
// @route   GET /api/feedback
// @access  Private
const getFeedbackForms = async (req, res) => {
    try {
        const { type, department } = req.query;
        const query = { isActive: true };

        if (type) query.type = type;
        if (department) query.department = department;

        // Filter expired ones
        query.$or = [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } },
        ];

        const feedbacks = await Feedback.find(query)
            .populate('createdBy', 'name email role')
            .populate('targetFaculty', 'name email')
            .sort({ createdAt: -1 });

        // For students, don't send other people's responses and mark if they already responded
        if (req.user.role === 'student') {
            const result = feedbacks.map(f => {
                const obj = f.toObject();
                const hasResponded = obj.responses.some(
                    r => r.respondentId?.toString() === req.user._id.toString()
                );
                obj.hasResponded = hasResponded;
                obj.totalResponses = obj.responses.length;
                delete obj.responses; // Privacy - don't send other responses
                return obj;
            });
            return res.json(result);
        }

        // For faculty/admin, include response count but not individual responses in list
        const result = feedbacks.map(f => {
            const obj = f.toObject();
            obj.totalResponses = obj.responses.length;
            return obj;
        });

        res.json(result);
    } catch (error) {
        console.error('Get feedback forms error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single feedback form with analytics
// @route   GET /api/feedback/:id
// @access  Private (Admin/Faculty)
const getFeedbackById = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('targetFaculty', 'name email');

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback form not found' });
        }

        // Generate analytics for each question
        const analytics = feedback.questions.map((question, index) => {
            const answers = feedback.responses
                .map(r => r.answers.find(a => a.questionIndex === index))
                .filter(Boolean);

            if (question.type === 'rating') {
                const ratings = answers.map(a => a.ratingValue).filter(Boolean);
                const avgRating = ratings.length > 0
                    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
                    : 0;
                const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                ratings.forEach(r => { if (distribution[r] !== undefined) distribution[r]++; });

                return {
                    question: question.question,
                    type: 'rating',
                    totalAnswers: ratings.length,
                    averageRating: avgRating,
                    distribution,
                };
            } else if (question.type === 'multiple_choice') {
                const choices = {};
                answers.forEach(a => {
                    if (a.selectedOption) {
                        choices[a.selectedOption] = (choices[a.selectedOption] || 0) + 1;
                    }
                });
                return {
                    question: question.question,
                    type: 'multiple_choice',
                    totalAnswers: answers.length,
                    distribution: choices,
                };
            } else {
                return {
                    question: question.question,
                    type: 'text',
                    totalAnswers: answers.length,
                    sampleResponses: answers.slice(0, 10).map(a => a.textValue),
                };
            }
        });

        res.json({
            feedback: feedback.toObject(),
            analytics,
            totalResponses: feedback.responses.length,
        });
    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit a response to a feedback form
// @route   POST /api/feedback/:id/respond
// @access  Private (Student)
const submitResponse = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback form not found' });
        }

        if (!feedback.isActive) {
            return res.status(400).json({ message: 'This feedback form is no longer active' });
        }

        // Check expiry
        if (feedback.expiresAt && new Date() > new Date(feedback.expiresAt)) {
            return res.status(400).json({ message: 'This feedback form has expired' });
        }

        // Check if already responded
        const alreadyResponded = feedback.responses.some(
            r => r.respondentId?.toString() === req.user._id.toString()
        );

        if (alreadyResponded) {
            return res.status(400).json({ message: 'You have already submitted a response' });
        }

        const { answers, isAnonymous } = req.body;

        if (!answers || answers.length === 0) {
            return res.status(400).json({ message: 'Answers are required' });
        }

        feedback.responses.push({
            respondentId: req.user._id,
            isAnonymous: isAnonymous !== false, // Default anonymous
            answers,
        });

        await feedback.save();
        res.json({ message: 'Response submitted successfully' });
    } catch (error) {
        console.error('Submit response error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete/deactivate a feedback form
// @route   DELETE /api/feedback/:id
// @access  Private (Admin/Faculty)
const deleteFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback form not found' });
        }

        if (feedback.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        feedback.isActive = false;
        await feedback.save();
        res.json({ message: 'Feedback form deactivated successfully' });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createFeedback,
    getFeedbackForms,
    getFeedbackById,
    submitResponse,
    deleteFeedback,
};
