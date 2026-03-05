const { z } = require('zod');

// Constants for allowed roles
const ROLES = ['admin', 'faculty', 'student', 'parent', 'staff', 'hrd'];

const loginSchema = z.object({
    email: z.string().min(1, 'Email or Phone is required'),
    password: z.string().min(1, 'Password is required'),
    role: z.enum(ROLES, {
        errorMap: () => ({ message: 'Invalid role provided' })
    }),
});

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').trim(),
    email: z.string().email('Invalid email address').trim().toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(ROLES),
    phone: z.string().optional(),

    // Role specific nested objects
    studentData: z.object({
        usn: z.string().optional(),
        class: z.string().optional(),
        semester: z.number().int().positive().optional(),
        department: z.string().optional(),
    }).optional(),

    facultyData: z.object({
        employeeId: z.string().optional(),
        department: z.string().optional(),
        designation: z.string().optional(),
    }).optional(),

    parentData: z.object({
        childUsn: z.string().optional(),
        childName: z.string().optional(),
    }).optional(),

    hrdData: z.object({
        employeeId: z.string().optional(),
        department: z.string().optional(),
    }).optional(),
});

const bulkRegisterSchema = z.array(z.object({
    name: z.string().min(2).trim(),
    email: z.string().email().trim().toLowerCase(),
    password: z.string().min(6).optional(), // Can fallback to default
    role: z.enum(ROLES),
    usn: z.string().optional(),
    class: z.string().optional(),
    semester: z.number().int().positive().optional(),
    department: z.string().optional(),
    employeeId: z.string().optional(),
    designation: z.string().optional(),
    childUsn: z.string().optional(),
    childName: z.string().optional(),
}));

const updateProfileSchema = z.object({
    name: z.string().min(2).trim().optional(),
    email: z.string().email().trim().toLowerCase().optional(),
});

const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const updateUserSchema = registerSchema.partial().extend({
    // Override nested objects to allow partial updates properly
    studentData: z.record(z.any()).optional(),
    facultyData: z.record(z.any()).optional(),
    hrdData: z.record(z.any()).optional(),
    parentData: z.record(z.any()).optional(),
});

module.exports = {
    loginSchema,
    registerSchema,
    bulkRegisterSchema,
    updateProfileSchema,
    updatePasswordSchema,
    updateUserSchema,
};
