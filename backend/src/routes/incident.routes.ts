import { Router } from 'express';
import { z } from 'zod';
import IncidentController from '../controllers/incident.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { uploadBuffer } from '../config/cloudinary';

const router = Router();

// Zod validation schema for incident submissions
const incidentIngestSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  imageUrl: z.string().min(1, 'A valid image URL is required.'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }, { required_error: 'Coordinates lat/lng are required.' })
});

// Image Upload API
router.post(
  '/upload',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const { image } = req.body;
      if (!image) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_IMAGE', message: 'No image provided. Base64 payload is required.' }
        });
        return;
      }
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const secureUrl = await uploadBuffer(buffer);
      
      res.status(200).json({
        success: true,
        url: secureUrl
      });
    } catch (err) {
      next(err);
    }
  }
);

// Bind routes
router.post(
  '/',
  authenticateJWT,
  validateBody(incidentIngestSchema),
  IncidentController.create
);

router.get(
  '/',
  authenticateJWT,
  IncidentController.getIncidents
);

export default router;
