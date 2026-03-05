const Feedback = require('../models/Feedback');
const FeedbackResponse = require('../models/FeedbackResponse');

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

        query.$or = [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: new Date() } },
        ];

        const feedbacks = await Feedback.find(query)
            .populate('createdBy', 'name email role')
            .populate('targetFaculty', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        if (feedbacks.length === 0) return res.json([]);

        const feedbackIds = feedbacks.map(f => f._id);

        // One aggregation: get response counts for ALL forms in a single DB round-trip
        const countAgg = await FeedbackResponse.aggregate([
            { $match: { feedbackId: { $in: feedbackIds } } },
            { $group: { _id: '$feedbackId', count: { $sum: 1 } } },
        ]);
        const countMap = {};
        countAgg.forEach(c => { countMap[c._id.toString()] = c.count; });

        // For students: check if THEY specifically responded (one query for all forms)
        let respondedSet = new Set();
        if (req.user.role === 'student') {
            const myResponses = await FeedbackResponse.find({
                feedbackId: { $in: feedbackIds },
                respondentId: req.user._id,
            }).select('feedbackId').lean();
            myResponses.forEach(r => respondedSet.add(r.feedbackId.toString()));
        }

        const result = feedbacks.map(f => ({
            ...f,
            totalResponses: countMap[f._id.toString()] || 0,
            hasResponded: respondedSet.has(f._id.toString()),
        }));

        res.json(result);
    } catch (error) {
        console.error('Get feedback forms error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single feedback form with analytics (aggregation pipeline)
// @route   GET /api/feedback/:id
// @access  Private (Admin/Faculty)
const getFeedbackById = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('targetFaculty', 'name email')
            .lean();

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback form not found' });
        }

        const totalResponses = await FeedbackResponse.countDocuments({ feedbackId: req.params.id });

        // Build analytics per question using a MongoDB aggregation pipeline
        // Much more efficient than loading all responses into memory
        const analyticsAgg = await FeedbackResponse.aggregate([
            { $match: { feedbackId: feedback._id } },
            { $unwind: '$answers' },
            {
                $group: {
                    _id: '$answers.questionIndex',
                    ratingValues: {
                        $push: {
                            $cond: [{ $gt: ['$answers.ratingValue', null] }, '$answers.ratingValue', '$$REMOVE']
                        }
                    },
                    textValues: {
                        $push: {
                            $cond: [{ $gt: ['$answers.textValue', null] }, '$answers.textValue', '$$REMOVE']
                        }
                    },
                    selectedOptions: {
                        $push: {
                            $cond: [{ $gt: ['$answers.selectedOption', null] }, '$answers.selectedOption', '$$REMOVE']
                        }
                    },
                    count: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } },
        ]);

        // Map aggregation results to question analytics
        const aggMap = {};
        analyticsAgg.forEach(a => { aggMap[a._id] = a; });

        const analytics = feedback.questions.map((question, index) => {
            const agg = aggMap[index] || { ratingValues: [], textValues: [], selectedOptions: [], count: 0 };

            if (question.type === 'rating') {
                const ratings = agg.ratingValues.filter(Boolean);
                const avgRating = ratings.length > 0
                    ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : 0;
                const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                ratings.forEach(r => { if (distribution[r] !== undefined) distribution[r]++; });
                return { question: question.question, type: 'rating', totalAnswers: ratings.length, averageRating: avgRating, distribution };
            }

            if (question.type === 'multiple_choice') {
                const choices = {};
                agg.selectedOptions.filter(Boolean).forEach(opt => {
                    choices[opt] = (choices[opt] || 0) + 1;
                });
                return { question: question.question, type: 'multiple_choice', totalAnswers: agg.count, distribution: choices };
            }

            return {
                question: question.question,
                type: 'text',
                totalAnswers: agg.textValues.filter(Boolean).length,
                sampleResponses: agg.textValues.filter(Boolean).slice(0, 10),
            };
        });

        res.json({ feedback, analytics, totalResponses });
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
        const feedback = await Feedback.findById(req.params.id).lean();

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback form not found' });
        }
        if (!feedback.isActive) {
            return res.status(400).json({ message: 'This feedback form is no longer active' });
        }
        if (feedback.expiresAt && new Date() > new Date(feedback.expiresAt)) {
            return res.status(400).json({ message: 'This feedback form has expired' });
        }

        const { answers, isAnonymous } = req.body;

        if (!answers || answers.length === 0) {
            return res.status(400).json({ message: 'Answers are required' });
        }

        // Duplicate check: query the separate FeedbackResponse collection
        const alreadyResponded = await FeedbackResponse.exists({
            feedbackId: req.params.id,
            respondentId: req.user._id,
        });

        if (alreadyResponded) {
            return res.status(400).json({ message: 'You have already submitted a response' });
        }

        await FeedbackResponse.create({
            feedbackId: req.params.id,
            respondentId: isAnonymous !== false ? null : req.user._id,
            isAnonymous: isAnonymous !== false,
            answers,
        });

        res.json({ message: 'Response submitted successfully' });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already submitted a response' });
        }
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
