const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/academicController');
const { protect, admin } = require('../middleware/authMiddleware');

// Departments
router.route('/departments')
    .get(getDepartments)
    .post(protect, admin, createDepartment);
router.route('/departments/:id')
    .put(protect, admin, updateDepartment)
    .delete(protect, admin, deleteDepartment);

// Subjects
router.route('/subjects')
    .get(getSubjects)
    .post(protect, admin, createSubject);
router.route('/subjects/:id')
    .put(protect, admin, updateSubject)
    .delete(protect, admin, deleteSubject);

// Timetables
router.route('/timetables')
    .get(getTimetables)
    .post(protect, admin, createTimetable);
router.route('/timetables/:id')
    .put(protect, admin, updateTimetable)
    .delete(protect, admin, deleteTimetable);

module.exports = router;
