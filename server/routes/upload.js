const express = require('express');
const Busboy = require('busboy');
const { authenticateToken } = require('../middleware/auth');
const uploadToFTP = require('../utils/ftpUpload');
const router = express.Router();

// All upload routes require authentication
router.use(authenticateToken);

/**
 * POST /api/upload/image
 * Upload an image via multipart form-data, stream to FTP
 */
router.post('/image', (req, res) => {
    try {
        const busboy = Busboy({
            headers: req.headers,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB max
                files: 1
            }
        });

        let fileProcessed = false;

        busboy.on('file', (fieldname, file, info) => {
            const { filename, mimeType } = info;

            // Validate file type
            const allowedTypes = [
                'image/jpeg',
                'image/jpg',
                'image/pjpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/svg+xml'
            ];
            if (!allowedTypes.includes(mimeType)) {
                file.resume(); // Drain the stream
                return res.status(400).json({
                    success: false,
                    error: `Invalid file type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}`
                });
            }

            fileProcessed = true;

            // Collect buffer from stream (for FTP upload)
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));

            file.on('end', async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const url = await uploadToFTP(buffer, cleanName, 'blog-images');

                    res.json({
                        success: true,
                        message: 'Image uploaded successfully',
                        url,
                        filename: cleanName,
                        size: buffer.length
                    });
                } catch (uploadError) {
                    console.error('FTP upload error:', uploadError);
                    res.status(500).json({
                        success: false,
                        error: 'Failed to upload image to storage'
                    });
                }
            });

            file.on('error', (err) => {
                console.error('File stream error:', err);
                res.status(500).json({
                    success: false,
                    error: 'File processing failed'
                });
            });
        });

        busboy.on('finish', () => {
            if (!fileProcessed) {
                res.status(400).json({
                    success: false,
                    error: 'No file provided'
                });
            }
        });

        busboy.on('error', (err) => {
            console.error('Busboy error:', err);
            res.status(500).json({
                success: false,
                error: 'File upload processing failed'
            });
        });

        req.pipe(busboy);
    } catch (error) {
        console.error('Upload route error:', error);
        res.status(500).json({
            success: false,
            error: 'Upload failed'
        });
    }
});

module.exports = router;
