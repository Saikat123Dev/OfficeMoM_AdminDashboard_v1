const ftp = require("basic-ftp");
const { Readable } = require("stream");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

/**
 * Upload a file to an FTP server with retry logic.
 * @param {Buffer|Stream} bufferOrStream - File data
 * @param {string} originalName - Original filename
 * @param {string} subDir - Subdirectory on the FTP server
 * @param {number} retries - Max retry attempts
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
async function uploadToFTP(bufferOrStream, originalName, subDir = "", retries = 3) {
    let attempt = 0;
    let lastError = null;

    while (attempt < retries) {
        attempt++;
        try {
            console.log(`📁 Upload attempt ${attempt}/${retries}: ${originalName}`);
            const result = await performFTPUpload(bufferOrStream, originalName, subDir);
            console.log(`✅ Upload successful on attempt ${attempt}`);
            return result;
        } catch (err) {
            lastError = err;
            console.error(`❌ Attempt ${attempt} failed: ${err.message}`);

            // Don't retry on auth / DNS errors
            if (
                err.message.includes("Authentication") ||
                err.message.includes("Permission denied") ||
                err.message.includes("ENOTFOUND")
            ) {
                throw err;
            }

            if (attempt < retries) {
                const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }
    }

    throw new Error(`Upload failed after ${retries} attempts: ${lastError.message}`);
}

async function performFTPUpload(bufferOrStream, originalName, subDir) {
    const client = new ftp.Client();
    client.ftp.timeout = 10 * 60 * 1000;
    client.ftp.socketTimeout = 2 * 60 * 60 * 1000;
    client.ftp.ipFamily = 4;

    const uniqueName = `${Date.now()}-${uuidv4()}-${originalName}`;
    let keepAliveInterval = null;
    let uploadStartTime = null;

    try {
        // Connect
        console.log(`🔌 Connecting to FTP: ${process.env.FTP_HOST}`);
        await Promise.race([
            client.access({
                host: process.env.FTP_HOST,
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS,
                secure: process.env.FTP_SECURE === "true",
                port: parseInt(process.env.FTP_PORT || 21),
                secureOptions: { rejectUnauthorized: false, keepAlive: true },
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Connection timeout (60s)")), 60000)
            ),
        ]);

        console.log(`✅ Connected to FTP`);

        // Navigate to target directory
        const targetDir = path.posix.join(process.env.FTP_REMOTE_DIR || "/", subDir || "");
        await client.ensureDir(targetDir);
        await client.cd(targetDir);
        await client.send("TYPE I");

        // Keep-alive before upload
        keepAliveInterval = setInterval(async () => {
            if (!client.closed) {
                try { await client.send("NOOP"); } catch { }
            }
        }, 30000);

        uploadStartTime = Date.now();

        // Prepare stream
        let stream;
        if (Buffer.isBuffer(bufferOrStream)) {
            stream = Readable.from(bufferOrStream);
        } else if (bufferOrStream && typeof bufferOrStream.pipe === "function") {
            stream = bufferOrStream;
        } else {
            throw new Error("Invalid input: must be Buffer or Stream");
        }

        // Stop keep-alive during upload
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;

        // Upload with timeout
        const uploadTimeout = 2 * 60 * 60 * 1000;
        await Promise.race([
            client.uploadFrom(stream, uniqueName),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Upload timeout")), uploadTimeout)
            ),
        ]);

        console.log(`✅ Upload completed`);

        // Verify file exists
        let uploadedFile = null;
        for (let i = 0; i < 3; i++) {
            try {
                const fileList = await client.list();
                uploadedFile = fileList.find((f) => f.name === uniqueName);
                if (uploadedFile) break;
                await new Promise((r) => setTimeout(r, 2000));
            } catch { }
        }

        if (!uploadedFile) {
            throw new Error("File not found on server after upload");
        }

        console.log(`✅ File verified: ${uploadedFile.size} bytes`);

        try { await client.send("QUIT"); } catch { }
        client.close();

        const fileUrl = `${process.env.FTP_BASE_URL}/${subDir ? subDir + "/" : ""}${uniqueName}`;
        return fileUrl;
    } catch (err) {
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        if (!client.closed) {
            try { client.close(); } catch { }
        }
        throw err;
    }
}

module.exports = uploadToFTP;
