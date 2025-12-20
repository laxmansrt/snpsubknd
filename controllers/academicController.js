const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');

// @desc    Get all departments
// @route   GET /api/academics/departments
// @access  Public
const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find({});
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a department
// @route   POST /api/academics/departments
// @access  Private/Admin
const createDepartment = async (req, res) => {
    try {
        const { name, code, duration, students, hod } = req.body;
        const department = await Department.create({ name, code, duration, students, hod });
        res.status(201).json(department);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a department
// @route   PUT /api/academics/departments/:id
// @access  Private/Admin
const updateDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (department) {
            department.name = req.body.name || department.name;
            department.code = req.body.code || department.code;
            department.duration = req.body.duration || department.duration;
            department.students = req.body.students || department.students;
            department.hod = req.body.hod || department.hod;

            const updatedDepartment = await department.save();
            res.json(updatedDepartment);
        } else {
            res.status(404).json({ message: 'Department not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a department
// @route   DELETE /api/academics/departments/:id
// @access  Private/Admin
const deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (department) {
            await department.deleteOne();
            res.json({ message: 'Department removed' });
        } else {
            res.status(404).json({ message: 'Department not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Subjects
const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({});
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createSubject = async (req, res) => {
    try {
        const { name, code, semester, credits, department } = req.body;
        const subject = await Subject.create({ name, code, semester, credits, department });
        res.status(201).json(subject);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (subject) {
            subject.name = req.body.name || subject.name;
            subject.code = req.body.code || subject.code;
            subject.semester = req.body.semester || subject.semester;
            subject.credits = req.body.credits || subject.credits;
            subject.department = req.body.department || subject.department;

            const updatedSubject = await subject.save();
            res.json(updatedSubject);
        } else {
            res.status(404).json({ message: 'Subject not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteSubject = async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id);
        if (subject) {
            await subject.deleteOne();
            res.json({ message: 'Subject removed' });
        } else {
            res.status(404).json({ message: 'Subject not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Timetables
const getTimetables = async (req, res) => {
    try {
        const timetables = await Timetable.find({});
        res.json(timetables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createTimetable = async (req, res) => {
    try {
        const { className, day, slots } = req.body;
        const timetable = await Timetable.create({ className, day, slots });
        res.status(201).json(timetable);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateTimetable = async (req, res) => {
    try {
        const timetable = await Timetable.findById(req.params.id);
        if (timetable) {
            timetable.className = req.body.className || timetable.className;
            timetable.day = req.body.day || timetable.day;
            timetable.slots = req.body.slots || timetable.slots;

            const updatedTimetable = await timetable.save();
            res.json(updatedTimetable);
        } else {
            res.status(404).json({ message: 'Timetable not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteTimetable = async (req, res) => {
    try {
        const timetable = await Timetable.findById(req.params.id);
        if (timetable) {
            await timetable.deleteOne();
            res.json({ message: 'Timetable removed' });
        } else {
            res.status(404).json({ message: 'Timetable not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    getTimetables,
    createTimetable,
    updateTimetable,
    deleteTimetable
};
