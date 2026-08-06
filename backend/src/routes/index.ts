import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import sectionRoutes from './section.routes';
import attendanceRoutes from './attendance.routes';
import academicRoutes from './academic.routes';
import caseRecordsRoutes from './caseRecords.routes';
import gradingRoutes from './grading.routes';
import oversightRoutes from './oversight.routes';
import notificationRoutes from './notification.routes';
import parentLinkRoutes from './parentLink.routes';
import uploadRoutes from './upload.routes';
import ocrRoutes from './ocr.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sections', sectionRoutes);
router.use('/parent-links', parentLinkRoutes);
router.use('/', attendanceRoutes);
router.use('/', academicRoutes);
router.use('/', caseRecordsRoutes);
router.use('/', gradingRoutes);
router.use('/', oversightRoutes);
router.use('/', notificationRoutes);
router.use('/', uploadRoutes);
router.use('/', ocrRoutes);
router.use('/', dashboardRoutes);

export default router;
