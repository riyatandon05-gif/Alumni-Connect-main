const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');
const batchController = require('../controllers/batchController');
const resourceController = require('../controllers/resourceController');
const platformController = require('../controllers/platformController');

const router = express.Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, file.originalname.toLowerCase().endsWith('.csv')) });

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/me', auth.authenticate, authController.me);
router.patch('/profile', auth.authenticate, authController.updateProfile);

router.get('/batches', auth.authenticate, auth.allowRoles('Institute'), batchController.list);
router.post('/batches', auth.authenticate, auth.allowRoles('Institute'), batchController.create);
router.delete('/batches/:id', auth.authenticate, auth.allowRoles('Institute'), batchController.remove);
router.post('/batches/:id/students', auth.authenticate, auth.allowRoles('Institute'), csvUpload.single('file'), batchController.importStudents);
router.get('/batches/:id/students', auth.authenticate, auth.allowRoles('Institute'), batchController.listStudents);

router.get('/jobs', resourceController.listJobs);
router.post('/jobs', auth.authenticate, auth.allowRoles('Recruiter'), resourceController.createJob);
router.get('/mentorship', auth.authenticate, resourceController.listMentorship);
router.post('/mentorship', auth.authenticate, auth.allowRoles('Student'), resourceController.createMentorship);
router.patch('/mentorship/:id/accept', auth.authenticate, auth.allowRoles('Alumni'), resourceController.acceptMentorship);

router.get('/directory', platformController.listDirectory);
router.get('/events', platformController.listEvents);
router.post('/events', auth.authenticate, platformController.createEvent);
router.get('/chat/messages', platformController.listMessages);
router.post('/chat/messages', platformController.createMessage);
router.get('/applications', auth.authenticate, auth.allowRoles('Student'), platformController.listApplications);
router.post('/applications', auth.authenticate, auth.allowRoles('Student'), platformController.applyToJob);
router.get('/saved-jobs', auth.authenticate, auth.allowRoles('Student'), platformController.listSavedJobs);
router.post('/saved-jobs/toggle', auth.authenticate, auth.allowRoles('Student'), platformController.toggleSavedJob);

router.use((req, res) => res.status(404).json({ error: 'API endpoint not found' }));
module.exports = router;
